"""Phase 3 step 2: identification of every crop in fonts/crops.json -> fonts/matches.json + fonts/clusters.json.
Identification is by eye from fonts/crops_sheet_*.jpg (the Adobe MCP font tools take text, not images; see DECISIONS 7).
Per board block: (class, closest face, weight, case, tracking, confidence). Text overrides catch the blocks that mix faces.
Favourites count double in the cluster tally."""
import json, pathlib
from collections import Counter

B = pathlib.Path(__file__).resolve().parents[1]
crops = json.load(open(B / "fonts" / "crops.json", encoding="utf-8"))

# class keys -> (adobe pick, free fallback)
CLASS = {
    "neo-grotesk":        ("Neue Haas Grotesk Display Pro", "Inter Tight"),
    "heavy-grotesk":      ("Neue Haas Grotesk Display Pro 75 Bold", "Inter Tight 800"),
    "condensed-grotesk":  ("Neue Haas Grotesk Text Pro (tight tracking)", "Inter Tight"),
    "geometric-display":  ("Neue Haas Grotesk Display Pro 25 Thin (stand-in)", "Inter Tight 200"),
    "contemporary-serif": ("FreightBig Pro / FreightText Pro", "Newsreader"),
    "didone-display":     ("FreightBig Pro Light", "Newsreader (opsz 72)"),
    "garalde":            ("FreightText Pro", "Newsreader"),
    "mono":               ("IBM Plex Mono", "IBM Plex Mono"),
}
# block -> (class, looks like, weight, case, tracking, confidence 0-1)
BLK = {
 24130326: ("neo-grotesk", "Neue Haas Grotesk Text / Helvetica Now", "regular", "sentence", "normal", 0.6),
 41432513: ("neo-grotesk", "PP Neue Montreal", "book", "sentence", "normal", 0.6),
 38944212: ("contemporary-serif", "Tiempos Headline / Canela", "light", "sentence", "normal", 0.55),
 52302251: ("neo-grotesk", "Neue Haas Grotesk Display", "medium", "sentence", "tight", 0.65),
 52020245: ("heavy-grotesk", "Akzidenz-Grotesk Bold / Neue Haas 75", "bold", "lower", "tight", 0.6),
 52340827: ("neo-grotesk", "Helvetica Neue", "regular", "mixed", "normal", 0.6),
 26381730: ("heavy-grotesk", "Neue Haas Grotesk Display Bold", "bold", "caps", "normal", 0.6),
 28246874: ("garalde", "Cormorant Garamond / Garamond Premier", "light", "title", "normal", 0.55),
 15688099: ("neo-grotesk", "Helvetica Neue", "medium", "caps", "wide", 0.4),
 2145281:  ("condensed-grotesk", "condensed neo-grotesk, stacked vertical caps", "regular", "caps", "wide", 0.4),
 13902728: ("neo-grotesk", "Suisse Int'l", "regular", "sentence", "normal", 0.5),
 27454113: ("neo-grotesk", "Söhne / Inter", "regular", "sentence", "normal", 0.55),
 27454118: ("neo-grotesk", "Söhne / Inter", "regular", "sentence", "normal", 0.55),
 27647159: ("neo-grotesk", "Inter Display / Söhne Leicht", "light", "mixed", "tight", 0.6),
 30248124: ("neo-grotesk", "Inter / Söhne", "medium", "title", "tight", 0.6),
 31223791: ("neo-grotesk", "Neue Haas Grotesk Display", "medium", "lower", "tight", 0.55),
 32197302: ("neo-grotesk", "Neue Haas Grotesk Display", "medium", "sentence", "tight", 0.6),
 47483045: ("contemporary-serif", "Canela Text", "regular", "caps", "wide", 0.45),
 47483050: ("didone-display", "high-contrast display serif (Canela / Ogg)", "regular", "caps", "normal", 0.5),
 13828406: ("mono", "tech mono caps (Space Mono / OCR-like)", "regular", "caps", "wide", 0.5),
 13607089: ("neo-grotesk", "Helvetica Neue", "medium", "title", "normal", 0.55),
 11460382: ("neo-grotesk", "PP Neue Montreal", "regular", "title", "normal", 0.55),
 7529470:  ("geometric-display", "thin geometric display, sheared L (custom wordmark)", "thin", "caps", "normal", 0.4),
 22772082: ("neo-grotesk", "Helvetica Neue", "regular", "title", "normal", 0.5),
 41911984: ("neo-grotesk", "PP Neue Montreal / Neue Haas Unica", "regular", "title", "normal", 0.55),
 33635746: ("heavy-grotesk", "Neue Haas Grotesk Display Bold", "bold", "title", "tight", 0.55),
 30880633: ("condensed-grotesk", "condensed grotesk caps", "regular", "caps", "normal", 0.5),
 21587531: ("neo-grotesk", "Helvetica Neue", "regular", "title", "normal", 0.35),
 32335068: ("neo-grotesk", "Neue Haas Grotesk Text", "regular", "title", "normal", 0.5),
 47311638: ("contemporary-serif", "Tiempos Headline + italic", "regular", "title", "normal", 0.55),
 16453124: ("contemporary-serif", "Freight / Tiempos Text", "regular", "mixed", "normal", 0.5),
 2527310:  ("contemporary-serif", "Freight Big italic", "regular", "lower", "normal", 0.45),
 34175362: ("neo-grotesk", "Helvetica Neue", "regular", "lower", "normal", 0.35),
 14664481: ("contemporary-serif", "Canela / Tiempos (serif title) + mono labels", "light", "sentence", "normal", 0.55),
 52313969: ("contemporary-serif", "serif italic (Tiempos / Freight)", "regular", "lower", "normal", 0.5),
 50510620: ("garalde", "magazine text serif (Freight Text / Lyon)", "regular", "sentence", "normal", 0.5),
 39832259: ("neo-grotesk", "Neue Haas Grotesk Text numerals", "regular", "numerals", "tabular", 0.5),
 40898406: ("contemporary-serif", "serif caps", "regular", "title", "normal", 0.3),
 36747221: ("neo-grotesk", "Helvetica Neue / Suisse", "regular", "title", "normal", 0.55),
}
OVR = {"COLLECTION": ("mono", "SIJO slash labels: monospaced caps", "regular", "caps", "wide", 0.5),
       "S1": ("mono", "SIJO corner letters: monospaced, spaced", "regular", "caps", "wide", 0.5),
       "SPOTLIGHT:": ("neo-grotesk", "grotesk caps label", "medium", "caps", "wide", 0.45)}

rows = []
for c in crops:
    cls, like, w, case, tr, conf = OVR.get(c["text"].strip(), BLK[c["block"]])
    adobe, free = CLASS[cls]
    rows.append({**{k: c[k] for k in ("crop", "block", "text", "favourite")}, "class": cls, "looks_like": like, "weight": w,
                 "case": case, "tracking": tr, "pick_adobe": adobe, "pick_free": free, "confidence": conf,
                 "method": "eye (crop sheets); Adobe catalog lookup by name for availability"})
json.dump(rows, open(B / "fonts" / "matches.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)

tally, blocks = Counter(), {}
for r in rows:
    tally[r["class"]] += 2 if r["favourite"] else 1
    blocks.setdefault(r["class"], set()).add(r["block"])
fam = Counter()
for k, v in tally.items():
    fam["grotesk" if "grotesk" in k or k == "geometric-display" else "serif" if k in ("contemporary-serif", "didone-display", "garalde") else "mono"] += v
out = {"weighted_by_class": dict(tally.most_common()), "blocks_by_class": {k: len(v) for k, v in blocks.items()},
       "weighted_by_family": dict(fam.most_common()), "crops": len(rows)}
json.dump(out, open(B / "fonts" / "clusters.json", "w", encoding="utf-8"), indent=1)
print(json.dumps(out, indent=1))
