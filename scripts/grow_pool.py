"""Render N new journey versions, verify each, and add the survivors to the pool.

Meant to run unattended. Every version that joins the rotation has passed the
same gates as the original batch - scripts/verify_renders.check_render is the
single source of truth for those, so this job cannot drift from the hand-run
verification. Anything that fails is deleted and logged, never uploaded.

The mosh needs the WebGL shader, which needs a page to host it, so a dev
server is started if one is not already up and stopped again afterwards.

  python scripts/grow_pool.py --count 10
  python scripts/grow_pool.py --count 2 --log logs/pool.log
"""
import argparse
import datetime as dt
import json
import os
import random
import shutil
import subprocess
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "scripts"))

import randomize                                                     # noqa: E402
import verify_renders as VR                                          # noqa: E402

DEV_URL = "http://localhost:3000/mosh-lab"
PY = sys.executable


class Log:
    """stdout and a file, both with timestamps - the task's only witness."""

    def __init__(self, path=None):
        self.fh = None
        if path:
            os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
            self.fh = open(path, "a", encoding="utf-8")

    def __call__(self, *parts):
        line = f"{dt.datetime.now():%Y-%m-%d %H:%M:%S}  " + " ".join(str(p) for p in parts)
        print(line, flush=True)
        if self.fh:
            self.fh.write(line + "\n")
            self.fh.flush()


def server_up(url=DEV_URL, timeout=5):
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            return r.status == 200
    except Exception:
        return False


def start_server(log, wait_s=120):
    """Start a dev server only if one is not already up. Returns the process."""
    if server_up():
        log("dev server already up, reusing it")
        return None
    npx = shutil.which("npx") or shutil.which("npx.cmd")
    if not npx:
        raise RuntimeError("npx not found on PATH")
    log("starting a dev server ...")
    p = subprocess.Popen([npx, "next", "dev", "-p", "3000"], cwd=ROOT,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    t0 = time.time()
    while time.time() - t0 < wait_s:
        if server_up():
            log(f"dev server up after {time.time() - t0:.1f}s")
            return p
        if p.poll() is not None:
            raise RuntimeError("the dev server exited before it was reachable")
        time.sleep(2)
    p.terminate()
    raise RuntimeError(f"the dev server was not reachable within {wait_s}s")


def existing_seeds(prefix, log):
    """Seeds already in the live manifest, so a new one never overwrites one."""
    try:
        r = subprocess.run(["node", "--env-file=.env.local",
                            "scripts/pool-blob.mjs", "--list", "--prefix", prefix],
                           cwd=ROOT, check=True, capture_output=True, text=True)
        return set(json.loads(r.stdout.strip().splitlines()[-1])["seeds"])
    except Exception as e:
        log(f"could not read the live manifest ({e}); "
            f"falling back to local seeds only")
        return set()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=10)
    ap.add_argument("--prefix", default="journey-v2")
    ap.add_argument("--workdir", default=".pool")
    ap.add_argument("--log", default="logs/pool.log")
    ap.add_argument("--crf", type=int, default=20)
    ap.add_argument("--height", type=int, default=720)
    ap.add_argument("--keep-workdir", action="store_true")
    ap.add_argument("--no-upload", action="store_true")
    args = ap.parse_args()

    # the render pipeline reads config/ and transcript/ by relative path, and
    # a scheduled task does not start anywhere in particular
    os.chdir(ROOT)

    log = Log(args.log)
    log("=" * 70)
    log(f"grow_pool: asked for {args.count} new versions -> {args.prefix}/")
    t0 = time.time()

    work = os.path.join(ROOT, args.workdir)
    shutil.rmtree(work, ignore_errors=True)
    os.makedirs(work, exist_ok=True)

    server = None
    accepted, rejected = [], []
    try:
        server = start_server(log)
        taken = existing_seeds(args.prefix, log)
        log(f"{len(taken)} versions already in the pool")

        for i in range(args.count):
            seed = random.randrange(1, 10 ** 9)
            while seed in taken:
                seed = random.randrange(1, 10 ** 9)
            taken.add(seed)
            log(f"[{i + 1}/{args.count}] seed {seed}: rendering ...")
            t1 = time.time()
            try:
                rec = randomize.render_one(seed, outdir=work, quiet=True)
            except Exception as e:
                log(f"[{i + 1}/{args.count}] seed {seed}: RENDER FAILED - {e}")
                rejected.append((seed, f"render error: {e}"))
                continue

            mp4 = os.path.join(work, rec["output"])
            checks, m, drift = VR.check_one(mp4, rec)
            bad = [k for k, ok in checks.items() if not ok]
            if bad:
                log(f"[{i + 1}/{args.count}] seed {seed}: REJECTED - {','.join(bad)}")
                rejected.append((seed, ",".join(bad)))
                for f in (mp4, os.path.join(work, f"v_{seed}.json")):
                    try:
                        os.remove(f)
                    except OSError:
                        pass
                continue

            log(f"[{i + 1}/{args.count}] seed {seed}: ok in {time.time() - t1:.0f}s  "
                f"ph{rec['phase']}  {m['container']:.3f}s  {m['n']}f  "
                f"trig {rec['internet_triggers']}  "
                f"B {rec['b_coverage_final_pct']:.1f}%")
            accepted.append(rec)

        if not accepted:
            log("no renders passed; the pool is unchanged")
            return 0

        # ---- web encode only the survivors
        log(f"web-encoding {len(accepted)} renders at {args.height}p crf {args.crf}")
        webdir = os.path.join(work, "web")
        subprocess.run([PY, "scripts/build_web.py", "--src", work,
                        "--out", webdir, "--height", str(args.height),
                        "--crf", str(args.crf)],
                       cwd=ROOT, check=True, capture_output=True, text=True)

        if args.no_upload:
            log(f"--no-upload: {len(accepted)} renders left in {webdir}")
            return 0

        # ---- upload and append to the live manifest
        r = subprocess.run(["node", "--env-file=.env.local",
                            "scripts/pool-blob.mjs", "--append",
                            "--src", webdir, "--prefix", args.prefix],
                           cwd=ROOT, check=True, capture_output=True, text=True)
        for line in r.stdout.strip().splitlines():
            log("  " + line)
        counts = json.loads(r.stdout.strip().splitlines()[-1])
        log(f"pool {counts['before']} -> {counts['after']} (+{counts['added']})")
        return 0
    except Exception as e:
        log(f"FAILED: {e}")
        return 1
    finally:
        if server is not None:
            log("stopping the dev server we started")
            server.terminate()
            try:
                server.wait(timeout=20)
            except Exception:
                server.kill()
        if not args.keep_workdir:
            shutil.rmtree(work, ignore_errors=True)
        log(f"accepted {len(accepted)}, rejected {len(rejected)}, "
            f"{time.time() - t0:.0f}s total")
        for seed, why in rejected:
            log(f"  rejected {seed}: {why}")


if __name__ == "__main__":
    sys.exit(main())
