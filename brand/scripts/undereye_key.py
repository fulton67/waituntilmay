"""Under-eye reel v4: the people's key over a title on the wall behind them (Jan 08 method, DECISIONS 16e; client 2026-11-19).

For one title span of one raw clip (public/undereye-filler/<clip>.mp4, the raw iPhone file: never graded, tone-mapped or re-coloured):
  1. cut [a, b) s of the raw clip (a = whole seconds, so the key's frame grid is the clip's frame grid) to a lossless sub-clip;
  2. Robust Video Matting on it (brand/scripts/video_matte.py, mobilenetv3, downsample 0.25: recurrent, so a 2 s pre-roll settles it);
  3. pack one VP9 + alpha webm whose COLOUR PLANES ARE THE RAW CLIP'S OWN Y/U/V (no RGB round trip, the same colour tags), with RVM's
     alpha: every body kept (both people in the two-shots, unlike video_matte --pack which keeps the largest), edge pulled in 1 px and
     feathered 0.8 px. Over the footage the key is the footage, so the only visible effect is that the type behind them is hidden.
Output: brand/remotion/public/undereye-filler/key_<name>.webm (starts at a s of the raw clip; the composition trims by the same a).
usage: ~/tools/brand-venv/Scripts/python -I brand/scripts/undereye_key.py <name> <clip> <a_s> <b_s>
"""
import subprocess, sys
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "brand/remotion/public/undereye-filler"
WORK = ROOT / "brand/edits/undereye-filler/v4/keys"
PY = str(Path.home() / "tools/brand-venv/Scripts/python.exe")

name, clip, a, b = sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4])
WORK.mkdir(parents=True, exist_ok=True)
src = PUB / f"{clip}.mp4"
sub = WORK / f"{name}_sub.mkv"
tags = ["-color_primaries", "bt2020", "-color_trc", "arib-std-b67", "-colorspace", "bt2020nc", "-color_range", "tv"]
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(a), "-i", str(src), "-t", f"{b - a:.3f}", "-an", "-c:v", "ffv1", "-pix_fmt", "yuv420p", *tags, str(sub)], check=True)
pre = str(WORK / name)
subprocess.run([PY, "-I", str(ROOT / "brand/scripts/video_matte.py"), str(sub), pre, "mobilenetv3", "0.25"], check=True)

w, h = 1080, 1920
rd = lambda p, fmt: subprocess.Popen(["ffmpeg", "-v", "error", "-i", p, "-f", "rawvideo", "-pix_fmt", fmt, "-"], stdout=subprocess.PIPE)
dy, da = rd(str(sub), "yuv420p"), rd(pre + "_pha.mp4", "gray")
out = PUB / f"key_{name}.webm"
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "yuva420p", "-s", f"{w}x{h}", "-r", "30", "-i", "-",
                        "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "12", "-deadline", "good", "-cpu-used", "4",
                        "-row-mt", "1", "-auto-alt-ref", "0", *tags, str(out)], stdin=subprocess.PIPE)
ny, nc = w * h, (w // 2) * (h // 2)
n = 0
while True:
    yuv = dy.stdout.read(ny + 2 * nc); al = da.stdout.read(ny)
    if len(yuv) < ny + 2 * nc or len(al) < ny: break
    A = np.frombuffer(al, np.uint8).reshape(h, w)
    A = cv2.GaussianBlur(cv2.erode(A, np.ones((3, 3), np.uint8)), (0, 0), 0.8)
    A[A < 8] = 0
    enc.stdin.write(yuv + A.tobytes()); n += 1
enc.stdin.close(); enc.wait()
print(f"{n} frames -> {out}")
