"""Render N new journey versions, verify each, and add the survivors to the pool.

Meant to run unattended. Every version that joins the rotation has passed the
same gates as the original batch - scripts/verify_arc.check_render is the
single source of truth for those, so this job cannot drift from the hand-run
verification. Anything that fails is deleted and logged, never uploaded.

It renders the seven-beat arc through assemble.py, which is what the live
pool is. It used to render the five-beat randomiser through randomize.py into
journey-multi/, and when the live pool moved this job would have gone on
filling a pool nobody reads.

No dev server is started any more either. The old mosh built one of its
layers with a WebGL shader, so the job had to stand up a browser and a GPU
every night; the arc's mosh is two I-frame removals in the encoded stream and
needs nothing but ffgac.

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

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "scripts"))

import assemble                                                      # noqa: E402
import verify_arc as VR                                              # noqa: E402
from pipeline import beats as B                                      # noqa: E402
from pipeline import media as M                                      # noqa: E402
from pipeline import sources as SRCS                                 # noqa: E402

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
    ap.add_argument("--prefix", default="journey-arc")
    ap.add_argument("--sources", default=None,
                    help="sources config; default config/sources.json")
    ap.add_argument("--beats", default=B.CONFIG,
                    help="beat pools; default config/beats.json")
    ap.add_argument("--workdir", default=".pool")
    ap.add_argument("--log", default="logs/pool.log")
    # these must match the settings the shipped pool was built with, or a
    # version that joins overnight arrives a different size from its
    # neighbours. The arc's mosh damages 24-48 frames of 720 and leaves the
    # rest clean, so it costs far fewer bits than the composite it replaced
    # and needs no bitrate cap to stay inside the budget: the shipped batch
    # came out 1.7-4.8 MB a version at crf 24.
    ap.add_argument("--crf", type=int, default=24)
    ap.add_argument("--height", type=int, default=720)
    ap.add_argument("--maxrate-kbps", type=int, default=0)
    ap.add_argument("--budget-mb", type=float, default=8.0)
    ap.add_argument("--keep-workdir", action="store_true")
    ap.add_argument("--no-upload", action="store_true")
    args = ap.parse_args()

    # the render pipeline reads config/ and transcript/ by relative path, and
    # a scheduled task does not start anywhere in particular
    os.chdir(ROOT)

    log = Log(args.log)
    log("=" * 70)
    log(f"grow_pool: asked for {args.count} new versions -> {args.prefix}/")
    log(f"sources: {args.sources or assemble.SOURCES}")
    log(f"beats:   {args.beats}")
    t0 = time.time()

    work = os.path.join(ROOT, args.workdir)
    shutil.rmtree(work, ignore_errors=True)
    os.makedirs(work, exist_ok=True)

    # the pools and each source's room tone are read once for the whole run
    cfg = B.load(args.beats)
    srcs = {x["id"]: x for x in SRCS.load(args.sources or assemble.SOURCES)}
    tones = {sid: M.quietest_window(srcs[sid]["video"], source=sid)
             for sid in sorted({c["source"] for b in cfg["beats"]
                                for c in b["pool"]})}
    log("pools: " + "  ".join(f"{n}:{name}={k}"
                              for n, name, k in B.pool_sizes(cfg)))

    accepted, rejected = [], []
    try:
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
                rec = assemble.render_one(seed, outdir=work, cfg=cfg,
                                          srcs=srcs, tones=tones, quiet=True)
            except Exception as e:
                log(f"[{i + 1}/{args.count}] seed {seed}: RENDER FAILED - {e}")
                rejected.append((seed, f"render error: {e}"))
                continue

            mp4 = os.path.join(work, rec["output"])
            checks, m, drift, _burn = VR.check_one(mp4, rec)
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

            cuts = rec["mosh"]["cuts"]
            log(f"[{i + 1}/{args.count}] seed {seed}: ok in {time.time() - t1:.0f}s  "
                f"{m['container']:.3f}s  {m['n']}f  "
                f"speech {rec['speech_pct']:.1f}%  "
                f"mosh {cuts[0]['cut']}+{cuts[0]['bloom']} "
                f"{cuts[1]['cut']}+{cuts[1]['bloom']}")
            accepted.append(rec)

        if not accepted:
            log("no renders passed; the pool is unchanged")
            return 0

        # ---- web encode only the survivors
        log(f"web-encoding {len(accepted)} renders at {args.height}p "
            f"crf {args.crf} capped at {args.maxrate_kbps}k")
        webdir = os.path.join(work, "web")
        wb = subprocess.run([PY, "scripts/build_web.py", "--src", work,
                             "--out", webdir, "--height", str(args.height),
                             "--crf", str(args.crf),
                             "--maxrate-kbps", str(args.maxrate_kbps),
                             "--budget-mb", str(args.budget_mb)],
                            cwd=ROOT, check=True, capture_output=True, text=True)
        for line in wb.stdout.strip().splitlines()[-4:]:
            log("  " + line)

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
        if not args.keep_workdir:
            shutil.rmtree(work, ignore_errors=True)
        log(f"accepted {len(accepted)}, rejected {len(rejected)}, "
            f"{time.time() - t0:.0f}s total")
        for seed, why in rejected:
            log(f"  rejected {seed}: {why}")


if __name__ == "__main__":
    sys.exit(main())
