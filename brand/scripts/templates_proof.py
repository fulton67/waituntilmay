"""BUILDER Phase B proof: every template x 3 sizes through the server renderer (scripts/render_posts.cjs), with Dr. Ostad's own
Instagram photos (scripts/kit_photos.py, served from public/brand/ostad/kit). Overflow tests: an over-long statement must
truncate with a warning; a long caption must paginate; a 7-slide carousel must number 1/7..7/7.
-> kit/templates/{id}/thumb_{size}.png, fig/templates_sheet.png, kit/templates/templates_check.json. brand-venv python -I."""
import json, pathlib, subprocess, sys, os
from PIL import Image, ImageDraw, ImageFont
sys.stdout.reconfigure(encoding="utf-8")
B = pathlib.Path(__file__).resolve().parents[1]; ROOT = B.parent; TP = B / "kit" / "templates"; W = TP / "_proof"; W.mkdir(exist_ok=True)
idx = json.load(open(TP / "index.json", encoding="utf-8"))
# clean pool: scripts/kit_photos.py (Ostad's own photographic posts, text_area_pct < 2.5; DECISIONS 45), served from public/
photos = [r["src"] for r in json.load(open(TP / "photos" / "photos.json", encoding="utf-8"))]
SIZES = ["4x5", "1x1", "9x16"]
def slots_for(tid, k):
    s = {}
    sch = json.load(open(TP / tid / "slots.json", encoding="utf-8"))
    imgs = [x["key"] for x in sch["slots"] if x["type"] == "image"]
    for j, key in enumerate(imgs): s[key] = photos[(k * 3 + j) % len(photos)]
    if any(x["key"] == "ground" for x in sch["slots"]) and tid in ("carousel-cover",): s["ground"] = "image"
    if tid == "carousel-body": s["image"] = photos[(k + 5) % len(photos)]
    return s
jobs = []
for k, t in enumerate(idx):
    for size in SIZES:
        jobs.append({"spec": {"size": size, "accent": "accent-1", "slides": [{"template": t["id"], "slots": slots_for(t["id"], k)}]}, "out": str(W / f"{t['id']}_{size}")})
LONG = "Dermal fillers are made of hyaluronic acid, a sugar the skin already makes. " * 40
jobs += [
    {"spec": {"size": "4x5", "accent": "signal", "slides": [{"template": "single-statement", "slots": {"statement": "Natural results come from restraint, careful anatomy, a plan that respects how a face moves, and the patience to build volume over two or three visits rather than one " * 5}}]}, "out": str(W / "test_truncate")},
    {"spec": {"size": "4x5", "accent": "accent-1", "slides": [{"template": "caption-card", "slots": {"text": LONG}}]}, "out": str(W / "test_paginate")},
    {"spec": {"size": "4x5", "accent": "accent-2", "slides": [{"template": "carousel-cover", "slots": {"ground": "image", "image": photos[1]}}] +
              [{"template": "carousel-body", "slots": {"heading": f"Step {i}", "image": photos[(i + 2) % len(photos)]}} for i in range(1, 6)] + [{"template": "carousel-end", "slots": {"image": photos[9 % len(photos)]}}]}, "out": str(W / "test_carousel")},
]
jf = W / "jobs.json"; json.dump(jobs, open(jf, "w"), indent=1)
r = subprocess.run(["node", str(B / "scripts" / "render_posts.cjs"), str(jf)], cwd=ROOT, env={**os.environ, "NODE_PATH": str(ROOT / "node_modules")}, capture_output=True, text=True)
print(r.stdout.strip(), r.stderr[-3000:])
rec = json.load(open(W / "jobs.receipts.json"))
check = {"renders": len(rec), "pages": sum(x["pages"] for x in rec), "adobe_fonts": sum(x["fonts"] == "adobe" for x in rec), "errors": sum(len(x["errors"]) for x in rec),
         "warnings": {pathlib.Path(x["out"]).name: x["warnings"] for x in rec if x["warnings"]}}
t_ = {pathlib.Path(x["out"]).name: x for x in rec}
check["test_truncate"] = {"warned": bool(t_["test_truncate"]["warnings"]), "pages": t_["test_truncate"]["pages"]}
check["test_paginate"] = {"pages": t_["test_paginate"]["pages"], "ok": t_["test_paginate"]["pages"] > 1}
check["test_carousel"] = {"pages": t_["test_carousel"]["pages"], "ok": t_["test_carousel"]["pages"] == 7}
# size check: every PNG has its canvas size
bad = []
for x in rec:
    for f in x["files"]:
        im = Image.open(f); exp = {"4x5": (1080, 1350), "1x1": (1080, 1080), "9x16": (1080, 1920)}
        sz = next((v for k2, v in exp.items() if f"_{k2}" in f), (1080, 1350))
        if im.size != sz: bad.append((f, im.size))
check["size_mismatches"] = bad
json.dump(check, open(TP / "templates_check.json", "w", encoding="utf-8"), indent=1)
# thumbnails + sheet
try: F = ImageFont.truetype("arial.ttf", 18); FB = ImageFont.truetype("arialbd.ttf", 20)
except OSError: F = FB = ImageFont.load_default()
TH = 300; cols = []
for t in idx:
    for size in SIZES:
        im = Image.open(W / f"{t['id']}_{size}.png").convert("RGB"); th = im.copy(); th.thumbnail((432, 768)); th.save(TP / t["id"] / f"thumb_{size}.png")
rowh = TH + 50; sheet = Image.new("RGB", (60 + 3 * 200 + 3 * 20 + 40, 30 + len(idx) * rowh), "#f2efed"); d = ImageDraw.Draw(sheet)
for i, t in enumerate(idx):
    y = 20 + i * rowh; d.text((20, y), f"{t['id']}  ({t['cluster']}; board {', '.join(t['board_blocks'])})", font=FB, fill="#211b15"); x = 20
    for size in SIZES:
        im = Image.open(W / f"{t['id']}_{size}.png").convert("RGB"); im.thumbnail((400, TH)); sheet.paste(im, (x, y + 30)); x += im.width + 20
sheet.save(B / "fig" / "templates_sheet.png")
print(json.dumps(check, indent=1)[:3000])
