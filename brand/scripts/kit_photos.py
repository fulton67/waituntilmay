"""Sample photos for the builder, the server renderer and the proofs. Picks Dr. Ostad's own photographic Instagram posts with
text_area_pct < 2.5 (colour/treatment.json; judgment threshold, DECISIONS 45), cleanest first, resized to a 1350 px long side.
-> kit/templates/photos/{image}.jpg + photos.json (copied to public/brand/ostad/kit/ by templates_build.mjs). brand-venv python -I."""
import json, pathlib
from PIL import Image, ImageOps
import numpy as np
# Most feed photos are legacy before/after composites with a printed caption band at the bottom (treatment name in a serif,
# "ARIEL OSTAD MD"), which OCR scores near 0. The band is measured and cropped: scanning up from the bottom, rows where >= 60% of
# pixels sit within 8 L-levels of the row median belong to the band; the band ends after 30 rows that fail (DECISIONS 52).
def caption_band(im, thr=0.6, gap=30):
    a = np.asarray(im.convert("L"), float); h = a.shape[0]; med = np.median(a, 1); frac = (np.abs(a - med[:, None]) < 8).mean(1)
    top, miss = h, 0
    for k in range(h - 1, 0, -1):
        if frac[k] >= thr: top, miss = k, 0
        else:
            miss += 1
            if miss > gap: break
    return h - top
B = pathlib.Path(__file__).resolve().parents[1]; OUT = B / "kit" / "templates" / "photos"; OUT.mkdir(parents=True, exist_ok=True)
PHOTO_TEXT_MAX = 2.5
# seen in the builder: Dbq8JiioCjD is a text card (paragraphs on a light ground) that OCR scored 0 -- excluded (judgment, DECISIONS 45)
EXCLUDE = {"Dbq8JiioCjD"}
tr = json.load(open(B / "colour" / "treatment.json", encoding="utf-8"))["per_image"]
pick = sorted([r for r in tr if r["source"] == "instagram" and r["photo"] and r["text_area_pct"] < PHOTO_TEXT_MAX and r["image"] not in EXCLUDE], key=lambda r: r["text_area_pct"])
rows = []
for r in pick:
    im = ImageOps.exif_transpose(Image.open(B / "existing" / "thumbs" / f"{r['image']}.jpg")).convert("RGB"); im.thumbnail((1350, 1350), Image.LANCZOS)
    band = caption_band(im); im = im.crop((0, 0, im.width, im.height - band)) if band else im
    im.save(OUT / f"{r['image']}.jpg", quality=86, optimize=True); rows.append({"image": r["image"], "src": f"/brand/ostad/kit/templates/photos/{r['image']}.jpg", "w": im.width, "h": im.height, "text_area_pct": r["text_area_pct"], "caption_band_px": band, "kind": "composite" if band else "photo"})
json.dump(rows, open(OUT / "photos.json", "w", encoding="utf-8"), indent=1)
print(len(rows), "photos", [x["image"] for x in rows])
