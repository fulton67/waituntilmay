"""BUILDER Phase A: catalogue the board's visual devices -> look/catalog.json, look/CATALOG.md, look/fig_catalog.png.
Presence tags for the drawn devices are a judgment call made from the contact sheets (look/_board_sheet_*.jpg) and each block's
own description in board/blocks.json. Rules, grain and the photo treatment are not tagged by eye: they come from
shapes/catalogue.json (per_image counts) and colour/treatment.json (photographic subset). Weight = images, favourites x3
(the same weight shapes.py uses). Keep rule: weighted count >= 4 and at least 2 distinct images (>= 3 kept 16, over the spec's 10-15 cap). brand-venv python -I."""
import json, pathlib, sys
from PIL import Image, ImageDraw, ImageFont
sys.stdout.reconfigure(encoding="utf-8")
B = pathlib.Path(__file__).resolve().parents[1]; L = B / "look"
blocks = {str(b["id"]): b for b in json.load(open(B / "board" / "blocks.json", encoding="utf-8")) if b["file"]}
sh = json.load(open(B / "shapes" / "catalogue.json", encoding="utf-8"))["per_image"]
tr = json.load(open(B / "colour" / "treatment.json", encoding="utf-8"))["per_image"]
ms = json.load(open(L / "measure.json", encoding="utf-8"))["devices"]

TAGS = {  # judgment call: which board images show the device (contact sheets + blocks.json 'what')
    "glass_panel": ["41911984", "41432513", "2145281"],
    "pill_chip": ["41911984", "41432513", "11460382", "27647159", "52313969"],
    "photo_card": ["41911984", "41432513", "24130326", "15688099", "34771058"],
    "leader_line": ["21587531", "23958815", "30940781", "12400773", "34126462", "16463981", "52386109", "33635746"],
    "outline_box": ["30940781", "21587531", "23958815", "47161957"],
    "step_marks": ["34175362", "27454113", "27454118", "31815447", "16463981", "11460382", "14664481"],
    "screen_frame": ["14664481", "16453124", "34771058", "13828406", "15688099", "7529470", "12087163", "13607089", "11460382"],
    "meta_label": ["14664481", "16463981", "13828406", "23958815", "28246874", "24130326", "7529470", "34126462", "30248124", "22772082", "2145281"],
    "dark_card": ["27454118", "27454113", "11460382", "13902728", "24130326", "12087163", "47311638", "2527310"],
    "ring_button": ["13607089", "34175362", "38155009"],
    "dotted_path": ["34126462", "33635746", "47161957", "34175362"],
    "vertical_type": ["40898406", "50510620", "2145281", "30940781"],
    "glow_line": ["38155009"],
    "icon_outline": ["11460382", "13607089", "14664481", "24130326"],
}
WHAT = {
    "glass_panel": "Frosted glass: a translucent card or band over a photo, backdrop blurred, no rim light, no drop shadow.",
    "pill_chip": "Pill: a fully rounded label (radius = half the height), filled white or grey, or outlined on dark.",
    "photo_card": "Photo card: an image with small rounded corners set inside a glass card at a fixed inset.",
    "leader_line": "Leader line: a hairline from a point on the subject to a label, ending in a small dot.",
    "outline_box": "Outline box: a hairline rectangle around a caps title or a product callout.",
    "step_marks": "Step marks: numbered rings on a dotted line, story progress bars, page count '1 / 9'.",
    "screen_frame": "Screen frame: a tall rounded rectangle (phone screen) holding a story.",
    "meta_label": "Meta label: small caps or mono data text in the corners ('/ Outside /', codes, dates).",
    "dark_card": "Dark card: black or deep brown slide with small light text.",
    "ring_button": "Ring button: a large hairline circle with a centred label (PLAY / REEL), or flat pale circles.",
    "dotted_path": "Dotted path: dotted connector or perforated edge.",
    "vertical_type": "Vertical type: a caps line rotated 90 degrees along an edge.",
    "glow_line": "Glow line: a hot light streak with a warm halo across the face.",
    "icon_outline": "Icons: white monoline outlines (close, menu, send, play), round ends, no fill.",
    "hairline_rule": "Hairline rule: a thin horizontal divider (measured by shapes.py).",
    "grain": "Grain: visible film noise in flat areas (measured by shapes.py).",
    "photo_treatment": "Photo treatment: desaturated, warm, low-contrast photography (measured by treatment.py).",
}
fav = {k for k, b in blocks.items() if b["favourite"]}
board_sh = {k.split(":")[1]: v for k, v in sh.items() if v["source"] == "board"}
MEAS = {
    "hairline_rule": [i for i, v in board_sh.items() if v["counts"].get("rule_h", 0) > 0],
    "grain": [i for i, v in board_sh.items() if v["counts"].get("grain", 0) > 0],
    "photo_treatment": [r["image"] for r in tr if r["source"] == "board" and r["photo"]],
}
rows = []
for dev, ids in {**TAGS, **MEAS}.items():
    ids = sorted(set(ids)); w = sum(3 if i in fav else 1 for i in ids)
    rows.append({"device": dev, "images": len(ids), "favourites": sorted(set(ids) & fav), "weighted": w, "blocks": ids,
                 "tagged_by": "measured" if dev in MEAS else "judgment (contact sheets + blocks.json)", "what": WHAT[dev],
                 "kept": w >= 4 and len(ids) >= 2, "measured_in": "look/measure.json" if dev in ms else ("shapes/catalogue.json" if dev in ("hairline_rule", "grain") else ("colour/treatment.json" if dev == "photo_treatment" else None))})
rows.sort(key=lambda r: -r["weighted"])
kept = [r for r in rows if r["kept"]]
json.dump({"rule": __doc__.strip(), "devices": rows, "kept": [r["device"] for r in kept], "n_board_images": len(blocks)}, open(L / "catalog.json", "w", encoding="utf-8"), indent=1)

# figure: one bar per device, weighted count, kept in ink, dropped in rule grey
W, H = 1400, 60 + 34 * len(rows)
im = Image.new("RGB", (W, H), "#f2efed"); d = ImageDraw.Draw(im)
try: f = ImageFont.truetype("arial.ttf", 18); fb = ImageFont.truetype("arialbd.ttf", 20)
except OSError: f = fb = ImageFont.load_default()
d.text((20, 16), f"{len(kept)} OF {len(rows)} DEVICES RECUR (weighted count >= 4, favourites x3)", font=fb, fill="#211b15")
mx = max(r["weighted"] for r in rows)
for i, r in enumerate(rows):
    y = 60 + i * 34; d.text((20, y + 4), r["device"], font=f, fill="#211b15" if r["kept"] else "#7d8075")
    bw = int(900 * r["weighted"] / mx); d.rectangle([260, y + 4, 260 + bw, y + 26], fill="#211b15" if r["kept"] else "#d7d5d0")
    d.text((268 + bw, y + 4), f"{r['weighted']}  ({r['images']} img)", font=f, fill="#7d8075")
im.save(L / "fig_catalog.png")

crops = sorted(p.name for p in (L / "crops").glob("*.png"))
Lmd = ["# Visual devices on the board", "", f"`scripts/look_catalog.py`. {len(blocks)} board images. {__doc__.split('Weight =')[1].strip()}", "",
       f"**{len(kept)} kept:** " + ", ".join(r["device"] for r in kept) + ".", "",
       "![catalogue](fig_catalog.png)", "", "| Device | Images | Weighted | Kept | Tagged by | Blocks |", "|---|---|---|---|---|---|"]
for r in rows:
    Lmd.append(f"| {r['device']} | {r['images']} | {r['weighted']} | {'yes' if r['kept'] else 'no'} | {r['tagged_by']} | {', '.join(r['blocks'][:12])}{' …' if len(r['blocks']) > 12 else ''} |")
Lmd += ["", "## What each one is, with its crop", ""]
for r in rows:
    if not r["kept"]: continue
    Lmd.append(f"### {r['device']}"); Lmd.append(""); Lmd.append(r["what"]); Lmd.append("")
    for c in crops:
        if c.startswith(r["device"]): Lmd.append(f"![{c}](crops/{c})")
    for pr in sorted((L / "proof").glob(f"{r['device']}*.png")):
        Lmd.append(f"Proof (source / rebuilt / kit): ![{pr.name}](proof/{pr.name})")
    Lmd.append("")
Lmd += ["## Dropped", ""] + [f"- **{r['device']}** ({r['images']} image{'s' if r['images'] != 1 else ''}): {r['what']}" for r in rows if not r["kept"]]
Lmd += ["", "Proof numbers (each rebuild re-measured with the source's estimator): `look/proof_check.json`.", "", "Measured parameters: `look/measure.json` (script `scripts/look_measure.py`); rebuilt components: `kit/components/`; final numbers: `kit/look.json`."]
(L / "CATALOG.md").write_text("\n".join(Lmd) + "\n", encoding="utf-8")
for r in rows: print(f"{r['device']:16} {r['images']:3} w{r['weighted']:3} {'KEEP' if r['kept'] else '-'}")
