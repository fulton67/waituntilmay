"""Measure a render's corners for burn-in. No screenshots, only numbers.

The piece used to carry a surveillance overlay: "CAM 03" top left, a running
timecode top right, "REC" bottom left, each white text on a part-transparent
black box. It is gone, and "it is gone" is a claim about pixels, so it is
measured on the pixels rather than asserted by the code that did not draw it.

What burn-in looks like, as a number
------------------------------------
Text burned into a corner is bright and it does not move. The footage
underneath does both: it is a camera on a person, and over a second it
changes. So for every pixel in a corner region, across evenly sampled frames:

    bright   mean luma > 170
    static   temporal standard deviation < 6

and a pixel that is both is burn-in. Calibrated on one render (seed 1, 640x360)
with the old overlay filter re-applied to it, against the render as it ships:

    region          overlay on    overlay off
    top-left                90              0
    top-right               37              0
    bottom-left             51              0

The timecode's digits change, which is why the top right counts fewer pixels
than the label that never moves - the colons, the leading zeros and the box's
own edge are what is left of it. The clean render stays at 0 in all three
regions even at sd < 10, so the margin is one-sided: there is nothing static
and bright in those corners to find. Zero in all three is the gate.

    .venv/Scripts/python.exe scripts/overlay_check.py renders_arc/v_1.mp4
    .venv/Scripts/python.exe scripts/overlay_check.py --dir renders_arc
"""
import argparse
import glob
import json
import os
import subprocess
import sys

import numpy as np

BRIGHT = 170.0
STATIC = 6.0
SAMPLES = 48               # frames sampled across the render
# Fractions of the frame, so the same boxes apply at 640x360 and at 1280x720.
# Each is generous around where the overlay sat: text at x=22,y=18 with a
# 6px border, at the top left, the top right and the bottom left.
REGIONS = {
    "top-left": (0.00, 0.00, 0.34, 0.20),
    "top-right": (0.66, 0.00, 1.00, 0.20),
    "bottom-left": (0.00, 0.80, 0.34, 1.00),
}


def luma_frames(path, n=SAMPLES, w=None, h=None):
    """n evenly spaced frames as grayscale arrays, decoded once."""
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,nb_frames", "-of", "json",
         path], check=True, capture_output=True).stdout
    st = json.loads(probe)["streams"][0]
    W, H = int(st["width"]), int(st["height"])
    total = st.get("nb_frames")
    if not str(total).isdigit():
        total = subprocess.run(
            ["ffprobe", "-v", "error", "-count_frames", "-select_streams",
             "v:0", "-show_entries", "stream=nb_read_frames", "-of",
             "default=nw=1:nk=1", path],
            check=True, capture_output=True).stdout.strip()
    total = int(total)
    step = max(1, total // n)
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vf",
         f"select='not(mod(n\\,{step}))'", "-vsync", "0",
         "-pix_fmt", "gray", "-f", "rawvideo", "-"],
        check=True, capture_output=True).stdout
    k = len(raw) // (W * H)
    return np.frombuffer(raw[:k * W * H], dtype=np.uint8).reshape(k, H, W), W, H


def burnin(path, bright=BRIGHT, static=STATIC):
    """Pixels per corner region that are both bright and unchanging."""
    fr, W, H = luma_frames(path)
    x = fr.astype(np.float32)
    out = {}
    for name, (x0, y0, x1, y1) in REGIONS.items():
        a, b = int(x0 * W), int(x1 * W)
        c, d = int(y0 * H), int(y1 * H)
        box = x[:, c:d, a:b]
        mean = box.mean(axis=0)
        sd = box.std(axis=0)
        out[name] = int(np.count_nonzero((mean > bright) & (sd < static)))
    out["_frames_sampled"] = int(fr.shape[0])
    out["_resolution"] = f"{W}x{H}"
    return out


def clean(rep):
    return all(v == 0 for k, v in rep.items() if not k.startswith("_"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="*")
    ap.add_argument("--dir")
    ap.add_argument("--bright", type=float, default=BRIGHT)
    ap.add_argument("--static", type=float, default=STATIC)
    args = ap.parse_args()

    paths = list(args.paths)
    if args.dir:
        paths += sorted(glob.glob(os.path.join(args.dir, "v_*.mp4")))
    paths = [p for p in paths if not p.endswith("_clean.mp4")]
    if not paths:
        print("nothing to check")
        return 1

    names = [k for k in REGIONS]
    print(f"{'render':<28} " + " ".join(f"{n:>12}" for n in names) + "  result")
    print("-" * (30 + 13 * len(names) + 8))
    bad = 0
    for p in paths:
        rep = burnin(p, args.bright, args.static)
        ok = clean(rep)
        bad += 0 if ok else 1
        print(f"{os.path.basename(p):<28} "
              + " ".join(f"{rep[n]:>12}" for n in names)
              + f"  {'CLEAN' if ok else 'BURN-IN'}")
    print("-" * (30 + 13 * len(names) + 8))
    print(f"{len(paths) - bad}/{len(paths)} renders have no overlay pixels in "
          f"any corner region (bright > {args.bright:.0f}, sd < "
          f"{args.static:.0f}, {SAMPLES} frames sampled)")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
