"""Compare captured live canvas frames against the rendered file."""
import argparse, json, os, subprocess
import numpy as np


def nth_frame(path, n, w, h):
    out = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vf", f"select=eq(n\,{n})",
         "-vsync", "0", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        capture_output=True, check=True).stdout
    return np.frombuffer(out[:w * h * 3], np.uint8).reshape(h, w, 3).astype(np.int16)


def png(path, w, h):
    out = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        capture_output=True, check=True).stdout
    return np.frombuffer(out[:w * h * 3], np.uint8).reshape(h, w, 3).astype(np.int16)


ap = argparse.ArgumentParser()
ap.add_argument("--render", required=True)
ap.add_argument("--dir", required=True)
ap.add_argument("--w", type=int, default=640)
ap.add_argument("--h", type=int, default=360)
a = ap.parse_args()

caps = json.load(open(os.path.join(a.dir, "captures.json")))
print(f"\n{'frame':>7}{'mean |diff|':>13}{'median':>10}{'p95':>9}  (0-255 per channel)")
print("-" * 44)
ds = []
for c in caps:
    live = png(os.path.join(a.dir, f"live_{c['target']}.png"), a.w, a.h)
    ren = nth_frame(a.render, c["frame"], a.w, a.h)
    d = np.abs(live - ren)
    ds.append(d.mean())
    print(f"{c['frame']:>7}{d.mean():>13.3f}{np.median(d):>10.3f}{np.percentile(d,95):>9.3f}")
print("-" * 44)
print(f"{'mean':>7}{np.mean(ds):>13.3f}")
