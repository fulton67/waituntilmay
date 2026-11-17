"""Storyboard stills (YouTube v6 proposal): pull the source frames the Remotion `Storyboard` composition needs into
brand/remotion/public/exomind-skin/sb/ (gitignored: practice, BTL and patient pictures).

- him_<T>.png: Dr. Ostad keyed (RGBA) at OUTPUT time T of the 1.15x cut. Same matte and the same --refine pass as
  scripts/video_matte.py --pack (largest body + 24 px kept, edge pulled in 1 px, feathered 0.8 px, edge colour from the core).
- oct30_<s>.png: the Oct 30 office recording (him, the patient under the coil, the Exomind console), rotated upright.
- nov05_<s>.png: the Nov 05 office recording (him and the patient talking, the coil behind them).
- moa_<s>.png: BTL "Mechanism of Action" film (licensed, 1920x1080; burnt-in subtitles and logos are cropped in the composition).
- btl_<s>.png: BTL "What is EXOMIND?" film frames at native 1280x720 (logos are cropped in the composition, never upscaled past 1x).

Run: python -I brand/edits/exomind-skin/storyboard/prep_stills.py   (from the repo root)
"""
import os, subprocess, sys
import numpy as np
import cv2

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
ED = os.path.join(ROOT, "brand", "edits", "exomind-skin")
OUT = os.path.join(ROOT, "brand", "remotion", "public", "exomind-skin", "sb")
SPEED = 1.15
HIM = [1.0, 5.6, 8.4, 14.0, 20.0, 24.0, 30.0, 34.0, 40.5, 44.0, 48.5, 50.5, 54.5, 58.5, 62.5, 66.5, 71.8, 84.5, 86.0, 87.0]
OCT = "C:/Users/naimj/Downloads/Video Oct 30 2026, 4 18 49 PM.mov"
NOV = "C:/Users/naimj/Downloads/Video Nov 05 2026, 10 50 41 AM.mov"
BTL = os.path.join(ROOT, "research", "ostad", "refs", "motion", "exomind", "k4lEDTVCb0U.mp4")
MOA = os.path.join(ROOT, "brand", "remotion", "public", "exomind-skin", "btl", "video", "Exomind_VIDEO_Mechanism-of-Action_ENNA101.mp4")  # BTL licensed


def grab(src, t, fmt, w, h):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", src, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", fmt, "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(h, w, -1 if fmt != "gray" else 1)[..., :3 if fmt == "rgb24" else 1].squeeze()


def keyed(T):
    t = T * SPEED
    rgb = grab(os.path.join(ED, "exomind-skin_cut.mp4"), t, "rgb24", 1080, 1920).copy()
    al = grab(os.path.join(ED, "matte_pha_cut.mp4"), t, "gray", 1080, 1920).copy()
    k, lab, st, _ = cv2.connectedComponentsWithStats((al > 64).astype(np.uint8), 8)
    if k > 2:
        main = 1 + int(np.argmax(st[1:, 4]))
        keep = cv2.dilate((lab == main).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (49, 49)))
        al[keep == 0] = 0
    a = cv2.GaussianBlur(cv2.erode(al, np.ones((3, 3), np.uint8)).astype(np.float32) / 255, (0, 0), 0.8)
    core = (a > 0.97).astype(np.float32)
    f32 = rgb.astype(np.float32)
    inner = cv2.GaussianBlur(f32 * core[..., None], (0, 0), 4) / np.maximum(cv2.GaussianBlur(core, (0, 0), 4), 1e-3)[..., None]
    has = cv2.GaussianBlur(core, (0, 0), 4) > 0.02
    m = np.where(has & (a < 0.97), 1 - a, 0)[..., None]
    rgb = (f32 * (1 - m) + inner * m).clip(0, 255).astype(np.uint8)
    rgba = np.dstack([rgb, (a * 255).round().astype(np.uint8)])
    cv2.imwrite(os.path.join(OUT, f"him_{T:05.1f}.png"), cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA))


def still(src, t, name):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", src, "-frames:v", "1", os.path.join(OUT, name)], check=True)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for T in HIM:
        keyed(T)
    for s in (8, 40, 62, 88):  # ffmpeg applies the -90 rotation tag: 1080x1920 upright
        still(OCT, s, f"oct30_{s}.png")
    for s in (3, 12, 30.3, 45, 54, 78):
        still(NOV, s, f"nov05_{s}.png")
    for s in (36, 57, 60, 74, 77, 85, 104, 113.5, 117.0, 119.5, 124.8):
        still(BTL, s, f"btl_{s}.png")
    for s in (52, 67.5, 76.5, 85, 97, 104):
        still(MOA, s, f"moa_{s}.png")
    print("ok", len(os.listdir(OUT)), "files in", OUT)
