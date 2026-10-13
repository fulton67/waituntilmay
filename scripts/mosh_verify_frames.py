"""Prove that rendered frame n is source frame n.

The render is done at intensity 0, where the composite is just the source
frame, so the output should reproduce the input exactly - including the
burned-in frame number. Rather than OCR the number, the whole frame and the
number's own region are compared pixel-wise against the source.

A comparison on its own proves nothing unless it can fail, so the off-by-one
control compares rendered frame n against source frame n+1 as well. If the
alignment were wrong the two columns would be the other way round.

  python scripts/mosh_verify_frames.py --render public/mosh-lab/_align-check.mp4
"""
import argparse
import json
import subprocess
import sys

import numpy as np

TEXT_BOX = (0, 0, 330, 52)   # x0, y0, x1, y1 - where drawtext burns the number


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_frames",
         "-show_entries", "stream=width,height,nb_read_frames,r_frame_rate",
         "-show_entries", "format=duration", "-of", "json", path],
        capture_output=True, text=True, check=True).stdout
    d = json.loads(out)
    s = d["streams"][0]
    return {"w": s["width"], "h": s["height"],
            "frames": int(s["nb_read_frames"]),
            "fps": s["r_frame_rate"],
            "duration": float(d["format"]["duration"])}


def frames(path, w, h):
    """Decode to raw RGB and yield each frame as an array."""
    p = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", path, "-f", "rawvideo",
         "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    n = w * h * 3
    while True:
        buf = p.stdout.read(n)
        if len(buf) < n:
            break
        yield np.frombuffer(buf, np.uint8).reshape(h, w, 3).astype(np.int16)
    p.stdout.close()
    p.wait()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default="public/mosh-lab/test-clip.mp4")
    ap.add_argument("--render", default="public/mosh-lab/_align-check.mp4")
    ap.add_argument("--tol", type=float, default=6.0,
                    help="mean abs diff above this counts as a mismatch")
    args = ap.parse_args()

    ps, pr = probe(args.src), probe(args.render)
    print(f"source : {ps['w']}x{ps['h']} {ps['frames']} frames "
          f"{ps['fps']} {ps['duration']:.3f}s")
    print(f"render : {pr['w']}x{pr['h']} {pr['frames']} frames "
          f"{pr['fps']} {pr['duration']:.3f}s")
    if (ps["w"], ps["h"]) != (pr["w"], pr["h"]):
        print("resolution differs - cannot compare")
        return 1

    src = list(frames(args.src, ps["w"], ps["h"]))
    ren = list(frames(args.render, pr["w"], pr["h"]))
    n = min(len(src), len(ren))
    print(f"comparing {n} frames\n")

    x0, y0, x1, y1 = TEXT_BOX
    aligned, offbyone, text_d = [], [], []
    mismatches = []
    for i in range(n):
        d = float(np.abs(ren[i] - src[i]).mean())
        aligned.append(d)
        t = float(np.abs(ren[i][y0:y1, x0:x1] - src[i][y0:y1, x0:x1]).mean())
        text_d.append(t)
        if i + 1 < len(src):
            offbyone.append(float(np.abs(ren[i] - src[i + 1]).mean()))
        if d > args.tol:
            mismatches.append((i, round(d, 2), round(t, 2)))

    a = np.array(aligned); o = np.array(offbyone); t = np.array(text_d)
    print(f"{'':28}{'mean':>9}{'median':>9}{'max':>9}")
    print(f"{'rendered[n] vs source[n]':28}{a.mean():9.3f}{np.median(a):9.3f}{a.max():9.3f}")
    print(f"{'  frame-number region':28}{t.mean():9.3f}{np.median(t):9.3f}{t.max():9.3f}")
    print(f"{'rendered[n] vs source[n+1]':28}{o.mean():9.3f}{np.median(o):9.3f}{o.max():9.3f}")
    print(f"\ncontrol: off-by-one is {o.mean() / max(a.mean(), 1e-9):.1f}x worse than aligned")
    print(f"         (if the mapping were wrong these would swap)")
    print(f"\nmismatches (mean abs diff > {args.tol}): {len(mismatches)} of {n}")
    for m in mismatches[:10]:
        print(f"  frame {m[0]}: whole {m[1]}, number region {m[2]}")
    return 0 if not mismatches else 1


if __name__ == "__main__":
    sys.exit(main())
