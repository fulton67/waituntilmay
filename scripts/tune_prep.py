"""Prepare everything /mosh-lab/tune needs to composite A x B live.

The tuning lab computes the mask, the reveals, the bloom and the flashes in
WebGL every frame, so it needs the three layers as video and the parts that
cannot be derived in a shader as data:

  A, B, C          the three layers, as mp4 the page can play in sync
  raw intensity    the per-frame word/phrase track BEFORE the follower, so
                   attack, release and gain stay live controls
  loudness         separately, so its weight stays a live control too
  words            with clip-relative frames, for the timeline
  concept hits     the markers, and what the flash pass fires on
  motion field     B's own per-block motion, for the bloom feedback, as raw
                   Float32 rather than JSON - 300 frames of 40x23x2 is 2.2 MB
                   as binary and about 12 MB as text

Everything is clip-relative: frame indices, not source seconds, because that
is what both the page and the offline renderer address frames by.

  python scripts/tune_prep.py
  python scripts/tune_prep.py --reuse        # keep A/B/C, rebuild the data
"""
import argparse
import json
import os
import shutil
import struct
import subprocess
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from pipeline import composite as CP          # noqa: E402
from pipeline import intensity as I           # noqa: E402
from pipeline import units as U               # noqa: E402

JC_SRC = os.environ.get("JC_SRC", r"C:\Users\naimj\Downloads\videoplayback.mp4")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", default="blum-internet")
    ap.add_argument("--outdir", default="public/mosh-lab")
    ap.add_argument("--clip-start", type=float, default=385.649)
    ap.add_argument("--triggers", default="101,150")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--reuse", action="store_true")
    args = ap.parse_args()
    os.chdir(ROOT)

    src_dir = ".decay-test"
    od = args.outdir
    nm = args.name
    triggers = [int(x) for x in args.triggers.split(",") if x.strip()]

    # ---- the three layers: A and B already exist from the decay pass, C is
    # the clean encode that only lived in the scratch directory
    layers = {
        "a": (os.path.join(od, f"{nm}-decay-A.mp4"), os.path.join(od, f"{nm}-tune-A.mp4")),
        "b": (os.path.join(od, f"{nm}-decay-B.mp4"), os.path.join(od, f"{nm}-tune-B.mp4")),
        "c": (os.path.join(src_dir, f"{nm}-C.mp4"), os.path.join(od, f"{nm}-tune-C.mp4")),
    }
    for key, (s, d) in layers.items():
        if not os.path.exists(s):
            raise SystemExit(f"missing layer {key}: {s}\n"
                             f"run scripts/mosh_decay.py first")
        if not (args.reuse and os.path.exists(d)):
            shutil.copyfile(s, d)
        print(f"  layer {key.upper()}: {d}  "
              f"{os.path.getsize(d) / 1e6:.2f} MB")

    pr = CP.probe(layers["a"][1])
    n, fps, w, h = pr["frames"], pr["fps"], pr["w"], pr["h"]
    print(f"\n{n} frames @ {fps:g}  {w}x{h}")

    # ---- the intensity inputs, unfollowed so the page owns the follower
    cfg = I.load_cfg()
    words = I.load_words()
    units = U.build_units()
    tl = I.Timeline.clip(args.clip_start, n, fps)
    loud = I.loudness_through(tl, JC_SRC)

    # the raw track with the loudness term REMOVED, so the page can re-add it
    # at whatever weight the slider says
    ic = dict(cfg.get("intensity") or {})
    bare = dict(cfg)
    bare["intensity"] = {**ic, "loudness_weight": 0.0}
    r = I.build(tl, words, units, bare, audio=None,
                trigger_frames=triggers, seed=args.seed)

    cw = [h for h in r["concept_hits"]]
    print(f"  concept hits: {[(x['stem'], x['frame']) for x in cw]}")

    # ---- words on the clip's own timeline
    wout = []
    for x in words:
        t0, t1 = x["start"], x.get("end", x["start"])
        if t1 < args.clip_start or t0 > args.clip_start + n / fps:
            continue
        wout.append({
            "w": x["word"],
            "f0": int(round((t0 - args.clip_start) * fps)),
            "f1": int(round((t1 - args.clip_start) * fps)),
            "stem": I.stem(x["word"]),
        })

    data = {
        "name": nm,
        "frames": n, "fps": fps, "width": w, "height": h,
        "clipStart": args.clip_start,
        "mb": 16,
        "triggers": triggers,
        "conceptWords": r["concept_words"],
        "conceptHits": [{"stem": x["stem"], "frame": x["frame"]} for x in cw],
        "words": wout,
        "rawNoLoudness": [round(float(v), 5) for v in r["raw"]],
        "loudness": [round(float(v), 5) for v in loud],
        "drift": [round(float(v), 5) for v in r["drift"]],
        "layers": {k: "/" + os.path.relpath(d, "public").replace("\\", "/")
                   for k, (s, d) in layers.items()},
        "mvBin": f"/mosh-lab/{nm}-tune-mv.bin",
        "intensityParams": r["params"],
    }
    dp = os.path.join(od, f"{nm}-tune.json")
    json.dump(data, open(dp, "w", encoding="utf-8"), indent=1)
    print(f"\ndata -> {dp}")

    # ---- B's motion field as Float32: [frames][rows][cols][2], in PIXELS
    mvsrc = os.path.join(src_dir, f"{nm}-mv.mv.json")
    if not os.path.exists(mvsrc):
        raise SystemExit(f"missing motion field {mvsrc}; run mosh_decay.py")
    mv = json.load(open(mvsrc, encoding="utf-8"))
    rows, cols = mv["rows"], mv["cols"]
    frames = mv["frames"]
    buf = bytearray()
    buf += struct.pack("<4i", len(frames), rows, cols, 2)
    arr = np.zeros((len(frames), rows, cols, 2), np.float32)
    for i, f in enumerate(frames):
        for rr in range(min(rows, len(f))):
            row = f[rr]
            for cc in range(min(cols, len(row))):
                v = row[cc]
                if v:
                    arr[i, rr, cc, 0] = v[0]
                    arr[i, rr, cc, 1] = v[1]
    buf += arr.tobytes()
    bp = os.path.join(od, f"{nm}-tune-mv.bin")
    open(bp, "wb").write(bytes(buf))
    mag = np.hypot(arr[..., 0], arr[..., 1])
    print(f"motion -> {bp}  {len(buf) / 1e6:.2f} MB  "
          f"{len(frames)} frames {cols}x{rows}  mean |mv| {mag.mean():.2f} px")
    print("  header: 4 little-endian int32 (frames, rows, cols, 2), "
          "then float32 x,y per block")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
