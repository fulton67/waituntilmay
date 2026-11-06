"""BUILDER Phase C: "PNG text matches the preview", measured. For each template x size, scripts/make_check.cjs saved the builder
preview (rendered 1:1 in the iframe) and the server PNG of the same draft. Here: mean absolute difference over the canvas, and the
share of pixels differing by more than 16/255 on any channel, overall and inside text (ink pixels in either image, found by
local contrast). Writes the result into kit/templates/make_check.json under "match". brand-venv python -I."""
import json, pathlib
import numpy as np
from PIL import Image, ImageFilter
TP = pathlib.Path(__file__).resolve().parents[1] / "kit" / "templates"
res = json.load(open(TP / "make_check.json", encoding="utf-8"))
rows = []
for m in res["match"]:
    a = Image.open(TP / m["preview"]).convert("RGB"); b = Image.open(TP / m["server"]).convert("RGB")
    # the preview element can sit at a fractional y inside the iframe, so its screenshot may be 1 px taller: crop to the canvas
    if abs(a.size[1] - b.size[1]) <= 1 and a.size[0] == b.size[0]: a = a.crop((0, 0) + b.size)
    if a.size != b.size: rows.append({**m, "size_mismatch": [a.size, b.size]}); continue
    A = np.asarray(a, np.int16); Bb = np.asarray(b, np.int16); d = np.abs(A - Bb).max(axis=2)
    def textmask(im):  # high local contrast = glyph edges
        g = np.asarray(im.convert("L"), np.int16); bl = np.asarray(im.convert("L").filter(ImageFilter.BoxBlur(3)), np.int16); return np.abs(g - bl) > 24
    tm = textmask(a) | textmask(b)
    # glyph shapes: binarise each image at half-way between its paper and ink (Otsu) inside the text mask, then IoU
    def ink(im):
        g = np.asarray(im.convert("L"), np.int16)[tm]
        if g.size == 0: return g.astype(bool)
        h = np.bincount(g.ravel().clip(0, 255), minlength=256).astype(float); w = np.cumsum(h); mu = np.cumsum(h * np.arange(256))
        bt = (mu[-1] * w - mu * w[-1]) ** 2 / np.maximum(w * (w[-1] - w), 1); t = int(np.argmax(bt)); return g > t
    ia, ib = ink(a), ink(b); iou = float((ia & ib).sum() / max((ia | ib).sum(), 1))
    rows.append({"id": m["id"], "size": m["size"], "mad": round(float(np.abs(A - Bb).mean()), 3), "diff_px_pct": round(float((d > 16).mean() * 100), 3),
                 "text_px": int(tm.sum()), "text_diff_pct": round(float((d[tm] > 16).mean() * 100), 3) if tm.any() else 0.0, "glyph_iou": round(iou, 4)})
res["match_measured"] = rows
ok = [r for r in rows if "mad" in r]
res["summary"]["match"] = {"pairs": len(rows), "max_mad": max(r["mad"] for r in ok), "max_text_diff_pct": max(r["text_diff_pct"] for r in ok),
                           "median_text_diff_pct": float(np.median([r["text_diff_pct"] for r in ok])), "min_glyph_iou": min(r["glyph_iou"] for r in ok),
                           "note": "text_diff counts antialiasing; glyph_iou compares binarised glyph shapes (1.0 = same lines, same positions)", "size_mismatches": len(rows) - len(ok)}
json.dump(res, open(TP / "make_check.json", "w", encoding="utf-8"), indent=1)
print(json.dumps(res["summary"], indent=1)); print(sorted(ok, key=lambda r: r["glyph_iou"])[:4])
