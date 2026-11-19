"""Flora anatomy clips -> PNG (alpha) sequences for FloraPlate (brand/remotion/src/flora/FloraPlate.tsx).
Clips: brand/edits/flora-anatomy/clips/<name>.mp4 (Kling v4 first/last-frame, 24 fps; gitignored). A plate can chain clips
(O2 = O2a deflation + O2b restore). Output: brand/remotion/public/flora/<id>/0001.png ... (public/ is gitignored) + frames.json
{id: {n, w, h, aspect}}.
  python -I brand/scripts/flora_frames.py [plate ids...]
"""
import json, shutil, subprocess, sys
from pathlib import Path

import numpy as np
from PIL import Image


def _hex(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255
# brand palette (brand/colour.json: the board is 79 % neutral, warm skin accents; reel tokens jan08/look.ts). Naim 2026-11-19: the
# Flora renders' pastel washes (rose muscle, yellow fat, blue gel) "don't fit the brand identity".
INK, WARM, SAND, DEEP = _hex("#1d2230"), _hex("#a2978d"), _hex("#bf8662"), _hex("#8b5b3d")


def _sm(x, a, b): return np.clip((x - a) / (b - a), 0, 1)


def white_to_alpha(src: Path, dst: Path):
    """Paper -> transparent, and the drawing re-inked in the brand palette: line work INK, light washes warm grey (WARM), the filler gel
    (the renders' pale blue) the one SAND accent, blood / bruise DEEP brown. Soft masks, so the gel keeps its shading. The drawing sits
    on the glass plate like ink (a CSS multiply did not survive the card's backdrop-filter stacking context)."""
    c = np.asarray(Image.open(src).convert("RGB")).astype(np.float32) / 255
    # paper to white first: some renders sit on cream / watercolour paper; divide each channel by its paper level (97th percentile)
    c = np.clip(c / np.maximum(np.percentile(c.reshape(-1, 3), 97, axis=0), 0.5), 0, 1)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    lum = c @ np.array([.299, .587, .114], np.float32)
    d = np.clip((1 - lum) / 0.9, 0, 1)
    a = np.clip((1 - c.min(axis=2)) / 0.94, 0, 1)
    a = np.where(a < 0.035, 0, a)
    t = np.clip((d - 0.16) / 0.36, 0, 1)[..., None]; t = t * t * (3 - 2 * t)
    col = WARM * (1 - t) + INK * t
    gel = (_sm(b - r, 0.03, 0.12) * _sm(b - g, -0.06, 0.0) * _sm(lum, 0.5, 0.62))[..., None]
    blood = (_sm(r - g, 0.08, 0.22) * _sm(r - b, 0.02, 0.1) * _sm(0.65 - lum, 0, 0.1))[..., None]
    col = col * (1 - gel) + SAND * gel
    col = col * (1 - blood) + DEEP * blood
    a = np.maximum(a, gel[..., 0] * 0.55)
    out = np.dstack([np.clip(col, 0, 1), a])
    Image.fromarray((out * 255).astype(np.uint8), "RGBA").save(dst, optimize=False, compress_level=3)


ROOT = Path(__file__).resolve().parents[2]
CLIPS = ROOT / "brand/edits/flora-anatomy/clips"
OUT = ROOT / "brand/remotion/public/flora"
# Kling blinks the drawn faces even when told not to (QA.md). The eyes are otherwise still, so each blink run [a, b] (clip frames, 0-based,
# measured as a spike of |f - f-3| in the eye band) is patched from the last open-eyed frame a-1, inside a feathered box around the
# eyelids (where peak-vs-ref differs by > 40 levels, padded 24 px); the rest of the frame (cannula, gel) keeps moving.
BLINKS: dict = {}  # Kling-era runs (J3 (51,63),(121,137); O2b (91,105)); the Omni clips (2026-11-19) do not blink, QA re-checks


def deblink(files: list, runs):
    import cv2
    for a, b in runs:
        ref = np.asarray(Image.open(files[a - 1]).convert("RGB")).astype(np.float32)
        seq = [np.asarray(Image.open(files[i]).convert("RGB")).astype(np.float32) for i in range(a, b + 1)]
        diff = max(seq, key=lambda x: np.abs(x - ref).mean())
        m = (np.abs(diff - ref).max(axis=2) > 40).astype(np.uint8)
        m = cv2.dilate(m, np.ones((49, 49), np.uint8))
        n, lab, st, _ = cv2.connectedComponentsWithStats(m)
        box = np.zeros(m.shape, np.float32)
        for k in range(1, n):
            x, y, w, h, area = st[k]
            if area < 400: continue
            box[max(0, y - 24):y + h + 24, max(0, x - 24):x + w + 24] = 1
        box = cv2.GaussianBlur(box, (0, 0), 10)[..., None]
        for i, f in zip(range(a, b + 1), seq):
            Image.fromarray(np.clip(ref * box + f * (1 - box), 0, 255).astype(np.uint8)).save(files[i], quality=95)
        print(f"  deblink {a}-{b}: box px {int((box > 0.5).sum())}")


IX = 4
# O2 = one Omni clip through 3 keyframes (deflate -> restore); it was O2a + O2b chained, with a hard jump at the join (QA_omni.md)
PLATES = {"J1": ["J1"], "J2": ["J2"], "J3": ["J3"], "J4": ["J4"], "J5": ["J5"], "O1": ["O1"], "O2": ["O2"], "O3": ["O3"], "O4": ["O4"],
          "U1": ["U1"], "U3": ["U3"], "U4": ["U4"], "U5": ["U5"], "U6": ["U6"], "U7": ["U7"], "U8": ["U8"], "U9": ["U9"]}


def main():
    meta = json.loads((OUT / "frames.json").read_text()) if (OUT / "frames.json").exists() else {}
    only = sys.argv[1:]
    for pid, names in PLATES.items():
        if only and pid not in only: continue
        if not all((CLIPS / f"{n}.mp4").exists() for n in names):
            print("skip", pid); continue
        d = OUT / pid
        shutil.rmtree(d, ignore_errors=True); d.mkdir(parents=True)
        k = 0
        for n in names:
            tmp = d / f"_{n}"; tmp.mkdir()
            subprocess.run(["ffmpeg", "-v", "error", "-i", str(CLIPS / f"{n}.mp4"), "-vf", "scale='min(1200,iw)':-2", "-q:v", "2", str(tmp / "%04d.jpg")], check=True)
            if n in BLINKS:
                deblink(sorted(tmp.glob("*.jpg")), BLINKS[n])
            for f in sorted(tmp.glob("*.jpg")):
                k += 1; white_to_alpha(f, d / f"{k:04d}.png"); f.unlink()
            tmp.rmdir()
        # trim empty paper: crop every frame to the union of the drawing's alpha (> 0.08) over the whole clip, + 2 % margin, so the
        # drawing fills its plate (Omni fills a fixed 16:9 / 9:16 frame with painted paper around the drawing)
        files = [d / f"{j:04d}.png" for j in range(1, k + 1)]
        acc = None
        for fp in files[:: max(1, k // 24)] + [files[-1]]:
            al = np.asarray(Image.open(fp))[..., 3] > 20
            acc = al if acc is None else (acc | al)
        ys, xs = np.nonzero(acc)
        if len(xs):
            H0, W0 = acc.shape; m = int(0.02 * max(H0, W0))
            box = (max(0, xs.min() - m), max(0, ys.min() - m), min(W0, xs.max() + m + 1), min(H0, ys.max() + m + 1))
            if box != (0, 0, W0, H0):
                for fp in files: Image.open(fp).crop(box).save(fp, compress_level=3)
        # in-betweens (FloraPlate IX = 4): NNNN_1..3.png blend frame NNNN toward NNNN+1, so a clip slowed onto his words glides instead
        # of stepping. Linear blends of adjacent frames (motion-compensated minterpolate warped the thin ink lines and took 5+ min a clip).
        prev = None
        for j in range(1, k + 1):
            cur = np.asarray(Image.open(d / f"{j:04d}.png")).astype(np.float32)
            if prev is not None:
                for q in range(1, IX):
                    t = q / IX
                    Image.fromarray((prev * (1 - t) + cur * t).round().astype(np.uint8), "RGBA").save(d / f"{j - 1:04d}_{q}.png", compress_level=3)
            prev = cur
        w, h = map(int, subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(d / "0001.png")],
                                       capture_output=True, text=True).stdout.strip().split(","))
        meta[pid] = {"n": k, "w": w, "h": h, "aspect": round(w / h, 4)}
        print(pid, meta[pid])
    (OUT / "frames.json").write_text(json.dumps(meta, indent=1))


if __name__ == "__main__":
    main()
