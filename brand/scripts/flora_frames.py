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


def white_to_alpha(src: Path, dst: Path):
    """GIMP-style colour-to-alpha against white: the paper becomes transparent, ink and washes keep their colour, so the drawing
    sits on the glass plate like ink (a CSS multiply did not survive the card's backdrop-filter stacking context)."""
    c = np.asarray(Image.open(src).convert("RGB")).astype(np.float32) / 255
    a = np.clip((1 - c.min(axis=2)) / 0.94, 0, 1)  # paper at ~0.94+ -> 0
    a = np.where(a < 0.035, 0, a)
    rgb = np.where(a[..., None] > 0, 1 - (1 - c) / np.maximum(a[..., None], 1e-3), 1)
    out = np.dstack([np.clip(rgb, 0, 1), a])
    Image.fromarray((out * 255).astype(np.uint8), "RGBA").save(dst, optimize=False, compress_level=3)

ROOT = Path(__file__).resolve().parents[2]
CLIPS = ROOT / "brand/edits/flora-anatomy/clips"
OUT = ROOT / "brand/remotion/public/flora"
# Kling blinks the drawn faces even when told not to (QA.md). The eyes are otherwise still, so each blink run [a, b] (clip frames, 0-based,
# measured as a spike of |f - f-3| in the eye band) is patched from the last open-eyed frame a-1, inside a feathered box around the
# eyelids (where peak-vs-ref differs by > 40 levels, padded 24 px); the rest of the frame (cannula, gel) keeps moving.
BLINKS = {"J3": [(51, 63), (121, 137)], "O2b": [(91, 105)]}


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


PLATES = {"J1": ["J1"], "J2": ["J2"], "J3": ["J3"], "J4": ["J4"], "J5": ["J5"], "O1": ["O1"], "O2": ["O2a", "O2b"], "O3": ["O3"], "O4": ["O4"]}


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
        w, h = map(int, subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(d / "0001.png")],
                                       capture_output=True, text=True).stdout.strip().split(","))
        meta[pid] = {"n": k, "w": w, "h": h, "aspect": round(w / h, 4)}
        print(pid, meta[pid])
    (OUT / "frames.json").write_text(json.dumps(meta, indent=1))


if __name__ == "__main__":
    main()
