"""Render N new journey versions, verify each, and add the survivors to the pool.

Meant to run unattended. Every version that joins the rotation has passed the
same gates as the original batch - scripts/verify_arc.check_render is the
single source of truth for those, so this job cannot drift from the hand-run
verification. Anything that fails is deleted and logged, never uploaded.

It renders through assemble_bank.py, which is what the live pool is: the
seven-beat arc stitched out of the shaded clip bank, one or two phrases a
beat. It does not shade anything - the bank is already wearing whatever
journey/look.json last published, and re-shading is scripts/relayer.mjs's
job, not a nightly one's.

Where the new versions go is therefore two places and not one. A look owns a
prefix of its own, journey-arc-<hash>/, and the manifest the player reads
stays at journey-arc/manifest.json, so a version added overnight is uploaded
to the live look's prefix and appended to the live manifest. Getting that
wrong is quiet rather than loud - the pool would grow somewhere nobody reads
- so the prefix is derived from journey/look.json rather than passed in.

No dev server is started. The old mosh built one of its layers with a WebGL
shader, so the job had to stand up a browser and a GPU every night; this one
reads shaded frames off disk and runs two I-frame removals in an ffgac
stream.

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

import assemble_bank                                                 # noqa: E402
import verify_arc as VR                                              # noqa: E402
from pipeline import bank as BK                                      # noqa: E402
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
    ap.add_argument("--prefix", default="journey-arc",
                    help="the manifest the player reads, which new versions "
                         "are appended to")
    ap.add_argument("--upload-prefix", default=None,
                    help="where the videos go; default is the live look's "
                         "own prefix, <prefix>-<hash of journey/look.json>")
    ap.add_argument("--sources", default=None,
                    help="sources config; default config/sources.json")
    ap.add_argument("--beats", default=B.CONFIG,
                    help="beat pools; default config/beats.json")
    ap.add_argument("--workdir", default=".pool")
    ap.add_argument("--log", default="logs/pool.log")
    # these must match the settings the shipped pool was built with, or a
    # version that joins overnight arrives a different size from its
    # neighbours - and the settings moved when the look did. The look is
    # grain and grain is expensive: measured on the heaviest version of the
    # batch at 720p, crf 27 costs 8.6 MB and 29 costs 6.8, where the
    # look-less batch before it came out at 1.7-4.8 MB at crf 24. 29 is
    # what holds every file inside the 8 MB budget without a bitrate cap.
    ap.add_argument("--crf", type=int, default=29)
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
    look = BK.look_hash()
    up = args.upload_prefix or f"{args.prefix}-{look}"
    lookdir = BK.look_dir(look)
    log("=" * 70)
    log(f"grow_pool: asked for {args.count} new versions -> {up}/, "
        f"listed in {args.prefix}/manifest.json")
    log(f"sources: {args.sources or assemble_bank.SOURCES}")
    log(f"beats:   {args.beats}")
    log(f"look:    {look}  ({lookdir})")
    if not os.path.isdir(lookdir):
        log(f"FAILED: the bank is not shaded with {look}; "
            f"run scripts/relayer.mjs")
        return 1
    t0 = time.time()

    work = os.path.join(ROOT, args.workdir)
    shutil.rmtree(work, ignore_errors=True)
    os.makedirs(work, exist_ok=True)

    # the pools and each source's room tone are read once for the whole run
    cfg = B.load(args.beats)
    bank = BK.load()
    srcs = {x["id"]: x for x in SRCS.load(args.sources
                                          or assemble_bank.SOURCES)}
    tones = {sid: M.quietest_window(srcs[sid]["video"], source=sid)
             for sid in sorted({c["source"] for c in bank["clips"]})}
    log("pools: " + "  ".join(f"{n}:{name}={k}"
                              for n, name, k in B.pool_sizes(cfg)))
    log(f"bank:  {len(bank['clips'])} clips")

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
                rec = assemble_bank.render_one(
                    seed, outdir=work, cfg=cfg, bank=bank, srcs=srcs,
                    tones=tones, lookdir=lookdir, look=look, quiet=True)
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
                            "--src", webdir, "--prefix", args.prefix,
                            "--upload-prefix", up],
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
