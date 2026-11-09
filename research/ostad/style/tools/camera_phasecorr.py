"""M4: phase correlation (cv2.phaseCorrelate, Hann window) between consecutive frames, on a NATIVE-resolution centre crop
(512x512, or the largest square that fits), every frame. One row per frame: dx, dy in source pixels (frame 0 = 0, 0), response.

Why native-resolution crop: calibration (calibrate.py) showed phase correlation on a 270 px downscale is biased (0.14 px/frame
read on still frames, 0.82 for a true 1.0 px/frame pan); a 512 px native crop reads -0.002 and 0.997 at 13 ms/frame."""
import subprocess

import cv2
import numpy as np

from common import run

CROP = 512


def m4(ref, vid, path, P):
    S = min(CROP, P["width"] - P["width"] % 2, P["height"] - P["height"] % 2)
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-map", "0:v:0", "-fps_mode", "passthrough", "-vf", f"crop={S}:{S}",
           "-f", "rawvideo", "-pix_fmt", "gray", "-"]
    pr = subprocess.Popen(cmd, stdout=subprocess.PIPE, bufsize=10 ** 7)
    win = cv2.createHanningWindow((S, S), cv2.CV_32F)
    rows, prev = [], None
    try:
        while True:
            b = pr.stdout.read(S * S)
            if len(b) < S * S:
                break
            g = np.frombuffer(b, np.uint8).reshape(S, S).astype(np.float32)
            if prev is None:
                rows.append([0.0, 0.0, 1.0])
            else:
                (dx, dy), r = cv2.phaseCorrelate(prev, g, win)
                rows.append([round(dx, 3), round(dy, 3), round(r, 4)])
            prev = g
    finally:
        pr.stdout.close(); pr.wait()
    return {"crop": S, "cols": ["dx", "dy", "response"], "rows": rows}


if __name__ == "__main__":
    run("camera_pc.json", m4)
