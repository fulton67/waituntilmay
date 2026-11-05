"""Phase 3 step 1: text regions on every board image (EasyOCR), cropped at full resolution with 10% padding.
Skips crops whose x-height is under 24 px (taken as 0.55 of the detected box height). Keeps the 4 largest per image
(the identity lives in the headline; body copy repeats the same face). Run with ~/tools/brand-venv/Scripts/python -I.
Writes fonts/crops/{block_id}_{n}.png and fonts/crops.json."""
import json, pathlib, sys
import cv2, numpy as np, easyocr
from PIL import Image, ImageSequence

B = pathlib.Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parents[1]
OUT = B / "fonts" / "crops"
OUT.mkdir(parents=True, exist_ok=True)
blocks = json.load(open(B / "board" / "blocks.json", encoding="utf-8"))
reader = easyocr.Reader(["en", "de", "fr", "es"], gpu=False, verbose=False)
rows = []
for b in blocks:
    im = Image.open(B / "board" / b["file"])
    if getattr(im, "is_animated", False):
        im = next(ImageSequence.Iterator(im))
    rgb = np.asarray(im.convert("RGB"))
    scale = 1.0
    if max(rgb.shape[:2]) > 2400:  # OCR on a 2400 px copy, crop from the original
        scale = 2400 / max(rgb.shape[:2])
    small = cv2.resize(rgb, None, fx=scale, fy=scale) if scale < 1 else rgb
    res = reader.readtext(small, paragraph=False, width_ths=0.9, min_size=12)
    cands = []
    for box, text, conf in res:
        pts = np.array(box) / scale
        x0, y0 = pts.min(0); x1, y1 = pts.max(0)
        h, w = y1 - y0, x1 - x0
        if conf < 0.35 or len(text.strip()) < 2 or 0.55 * min(h, w) < 24:
            continue
        cands.append((w * h, x0, y0, x1, y1, text, conf, h > 1.6 * w))
    cands.sort(reverse=True)
    for n, (area, x0, y0, x1, y1, text, conf, vertical) in enumerate(cands[:4]):
        px, py = 0.1 * (x1 - x0), 0.1 * (y1 - y0)
        X0, Y0 = int(max(0, x0 - px)), int(max(0, y0 - py))
        X1, Y1 = int(min(rgb.shape[1], x1 + px)), int(min(rgb.shape[0], y1 + py))
        crop = rgb[Y0:Y1, X0:X1]
        if vertical:
            crop = np.rot90(crop, 3)
        f = OUT / f"{b['id']}_{n}.png"
        Image.fromarray(crop).save(f)
        rows.append({"crop": f"fonts/crops/{f.name}", "block": b["id"], "text": text, "ocr_conf": round(float(conf), 2),
                     "box": [X0, Y0, X1, Y1], "x_height_px": round(0.55 * (min(y1 - y0, x1 - x0)), 1), "vertical": bool(vertical),
                     "favourite": b["favourite"]})
    print(b["id"], len(cands), "regions")
json.dump(rows, open(B / "fonts" / "crops.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(len(rows), "crops from", len({r["block"] for r in rows}), "images")
