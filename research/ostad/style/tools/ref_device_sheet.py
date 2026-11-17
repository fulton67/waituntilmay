"""Frame-by-frame reference sheets for DEVICE_LIBRARY.md (arrows, type entries, any device).

Spec (JSON): {"title": str, "tile_h": 220, "rows": [
  {"label": str, "video": "media/yt/evident/GMu3uTEDzn0.mp4",   # relative to research/ostad/style
   "frames": [383, 386, 389, ...]  or  "start": 383, "n": 6, "step": 3,
   "crop": [x0, y0, x1, y1] | null,                                # source px
   "note": str}]}
Each row is one device: its frames left to right, the source frame number burned on every tile, the label and
note on the left. The output is a JPEG of reference footage, so it stays out of git (see .gitignore).

Run: C:/Users/naimj/tools/style-venv/Scripts/python.exe -I tools/ref_device_sheet.py <spec.json> <out.jpg>
"""
import json
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def grab(path, frames):
    if path.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        im = cv2.imread(path, cv2.IMREAD_COLOR)
        return {f: im for f in frames} if im is not None else {}
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise SystemExit(f"cannot open {path}")
    want = sorted(set(frames))
    out = {}
    start = max(0, want[0] - 1)
    cap.set(cv2.CAP_PROP_POS_FRAMES, start)
    i = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
    while i <= want[-1]:
        ok, im = cap.read()
        if not ok:
            break
        if i in want:
            out[i] = im
        i += 1
    cap.release()
    return out


def put(img, text, org, scale=0.5, color=(255, 255, 255), bg=(0, 0, 0), th=1):
    (w, h), b = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, scale, th)
    x, y = org
    cv2.rectangle(img, (x - 2, y - h - 4), (x + w + 2, y + b), bg, -1)
    cv2.putText(img, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, scale, color, th, cv2.LINE_AA)


def wrap(text, n):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > n:
            lines.append(cur)
            cur = w
        else:
            cur = (cur + " " + w).strip()
    if cur:
        lines.append(cur)
    return lines


def main(spec_path, out_path):
    spec = json.load(open(spec_path, encoding="utf-8"))
    th = int(spec.get("tile_h", 220))
    label_w = 300
    rows_img = []
    max_w = 0
    for r in spec["rows"]:
        frames = r.get("frames") or [r["start"] + k * r.get("step", 1) for k in range(r.get("n", 6))]
        got = grab(os.path.join(ROOT, r["video"]), frames)
        tiles = []
        for f in frames:
            im = got.get(f)
            if im is None:
                continue
            if im.ndim == 2:
                im = cv2.cvtColor(im, cv2.COLOR_GRAY2BGR)
            elif im.shape[2] == 4:
                im = cv2.cvtColor(im, cv2.COLOR_BGRA2BGR)
            if r.get("crop"):
                x0, y0, x1, y1 = r["crop"]
                im = im[y0:y1, x0:x1]
            s = th / im.shape[0]
            im = cv2.resize(im, (max(1, int(im.shape[1] * s)), th), interpolation=cv2.INTER_AREA)
            put(im, f"f{f}", (6, 18))
            tiles.append(im)
            tiles.append(np.full((th, 4, 3), 255, np.uint8))
        lab = np.full((th, label_w, 3), 245, np.uint8)
        y = 24
        for ln in wrap(r["label"], 30)[:3]:
            cv2.putText(lab, ln, (8, y), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (20, 20, 20), 1, cv2.LINE_AA)
            y += 22
        for ln in wrap(r.get("note", ""), 40)[:7]:
            cv2.putText(lab, ln, (8, y), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (70, 70, 70), 1, cv2.LINE_AA)
            y += 18
        row = np.hstack([lab] + tiles) if tiles else lab
        rows_img.append(row)
        max_w = max(max_w, row.shape[1])
    pad = [np.hstack([r, np.full((r.shape[0], max_w - r.shape[1], 3), 255, np.uint8)]) for r in rows_img]
    sep = np.full((6, max_w, 3), 255, np.uint8)
    head = np.full((40, max_w, 3), 255, np.uint8)
    cv2.putText(head, spec.get("title", ""), (8, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2, cv2.LINE_AA)
    parts = [head]
    for p in pad:
        parts += [p, sep]
    sheet = np.vstack(parts)
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    cv2.imwrite(out_path, sheet, [cv2.IMWRITE_JPEG_QUALITY, 85])
    print(out_path, sheet.shape)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
