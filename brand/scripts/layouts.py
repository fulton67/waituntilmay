"""BUILDER Phase B: the board's and feed's recurring compositions -> composition/layouts.json, composition/LAYOUTS.md, fig/layouts_*.png.
Per image (metrics/pixels.json): text block (union of OCR regions) top/bottom/left/right %, text area %, number of text lines,
largest cap height % h, centring (|left margin - right margin|), subject box centre and area, ground lightness (median L* of the
image), aspect. Standardised, then k-means with k chosen by silhouette over 8..10 (the spec's range). Favourites x3 as sample weight.
Each cluster lists its members; the cluster -> template mapping is a judgment call stated in TEMPLATE_OF. brand-venv python -I."""
import json, pathlib, sys, glob
import numpy as np, cv2
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler
from PIL import Image, ImageDraw, ImageFont
sys.stdout.reconfigure(encoding="utf-8")
B = pathlib.Path(__file__).resolve().parents[1]; O = B / "composition"; FIG = B / "fig"
px = json.load(open(B / "metrics" / "pixels.json", encoding="utf-8"))
regs = {}
for r in px["regions"]: regs.setdefault((r["source"], r["image"]), []).append(r)
def path_of(src, iid):
    if src == "board": g = glob.glob(str(B / "board" / "img" / f"{iid}_*")); return g[0] if g else None
    p = B / "existing" / "thumbs" / f"{iid}.jpg"; return str(p) if p.exists() else None
rows, feats, weights = [], [], []
for im in px["images"].values():
    k = (im["source"], im["image"]); rr = [r for r in regs.get(k, []) if not r.get("vertical")]
    f = path_of(*k)
    if not f: continue
    a = cv2.imread(f); a = cv2.resize(a, (270, int(270 * a.shape[0] / a.shape[1]))); Lg = float(np.median(cv2.cvtColor(a.astype(np.float32) / 255, cv2.COLOR_BGR2Lab)[..., 0]))
    W, H = im["w"], im["h"]
    if rr:
        x0 = min(r["box"][0] for r in rr) / W * 100; y0 = min(r["box"][1] for r in rr) / H * 100; x1 = max(r["box"][2] for r in rr) / W * 100; y1 = max(r["box"][3] for r in rr) / H * 100
        cap = max(r["cap_pct_h"] for r in rr); centred = abs(x0 - (100 - x1)); n = len(rr)
    else:
        x0, y0, x1, y1, cap, centred, n = 50, 50, 50, 50, 0, 0, 0
    sb = im.get("subject_box") or [0, 0, W, H]; scx = (sb[0] + sb[2]) / 2 / W * 100; scy = (sb[1] + sb[3]) / 2 / H * 100; sa = (sb[2] - sb[0]) * (sb[3] - sb[1]) / (W * H) * 100
    v = [y0, y1, x0, x1, im["text_area_pct"], min(n, 12), cap, centred, scx, scy, sa, Lg, im["aspect"]]
    rows.append({"source": k[0], "image": k[1], "favourite": im.get("favourite", False), "features": dict(zip(
        ["text_top", "text_bottom", "text_left", "text_right", "text_area_pct", "text_lines", "cap_max_pct_h", "centring_gap", "subject_cx", "subject_cy", "subject_area_pct", "ground_L", "aspect"], [round(float(x), 2) for x in v]))})
    feats.append(v); weights.append(3 if im.get("favourite") else 1)
X = StandardScaler().fit_transform(np.array(feats)); w = np.array(weights)
scores = {k: float(silhouette_score(X, KMeans(k, n_init=20, random_state=0).fit_predict(X, sample_weight=w))) for k in range(8, 11)}
k = max(scores, key=scores.get); km = KMeans(k, n_init=20, random_state=0).fit(X, sample_weight=w); lab = km.labels_
clusters = []
for c in range(k):
    m = [rows[i] for i in range(len(rows)) if lab[i] == c]
    med = {f: round(float(np.median([r["features"][f] for r in m])), 1) for f in m[0]["features"]}
    clusters.append({"cluster": c, "n": len(m), "board": sum(r["source"] == "board" for r in m), "instagram": sum(r["source"] == "instagram" for r in m),
                     "favourites": [r["image"] for r in m if r["favourite"]], "median": med, "members": [f"{r['source']}:{r['image']}" for r in m]})
# describe each cluster in words, from its medians (no judgment in the words: thresholds stated here)
def describe(md):
    t = []
    t.append("dark ground" if md["ground_L"] < 35 else ("light ground" if md["ground_L"] > 70 else "photo ground"))
    if md["text_lines"] == 0: t.append("no text")
    else:
        t.append("big type" if md["cap_max_pct_h"] >= 4 else ("small type" if md["cap_max_pct_h"] < 2.2 else "mid type"))
        t.append("centred" if md["centring_gap"] < 8 else "left-aligned")
        t.append("text top" if md["text_bottom"] < 55 else ("text bottom" if md["text_top"] > 45 else "text spans"))
        t.append(f"{int(md['text_lines'])} lines"); t.append(f"text {md['text_area_pct']}% of frame")
    t.append("9:16" if md["aspect"] < 0.65 else ("square" if md["aspect"] > 0.9 else "4:5"))
    return ", ".join(t)
for c in clusters: c["reads_as"] = describe(c["median"])
# cluster -> template (judgment, DECISIONS 42): each template's cited board blocks sit in its cluster (kit/templates/engine.js)
TEMPLATE_OF = {9: ["single-statement", "quote"], 0: ["caption-card"], 1: ["list"], 2: ["story"], 3: ["before-after"], 4: ["announcement"],
               5: ["procedure-card"], 6: ["carousel-cover"], 7: ["carousel-body"], 8: ["carousel-end"]}
for c in clusters: c["templates"] = TEMPLATE_OF.get(c["cluster"], [])
json.dump({"method": __doc__.strip(), "k_silhouette": scores, "k": k, "template_of": {f"C{a}": b for a, b in TEMPLATE_OF.items()}, "clusters": clusters, "images": [{**r, "cluster": int(l)} for r, l in zip(rows, lab)]}, open(O / "layouts.json", "w", encoding="utf-8"), indent=1)

# contact sheet per cluster (first 8 members)
TW, TH = 120, 150; im = Image.new("RGB", (40 + 8 * (TW + 6) + 520, 30 + k * (TH + 30)), "#f2efed"); d = ImageDraw.Draw(im)
try: F = ImageFont.truetype("arial.ttf", 14); FB = ImageFont.truetype("arialbd.ttf", 15)
except OSError: F = FB = ImageFont.load_default()
for i, c in enumerate(clusters):
    y = 20 + i * (TH + 30); d.text((10, y), f"C{c['cluster']}  n={c['n']} (board {c['board']}, feed {c['instagram']})", font=FB, fill="#211b15")
    for j, mm in enumerate(c["members"][:8]):
        s, iid = mm.split(":"); t = Image.open(path_of(s, iid)).convert("RGB"); t.thumbnail((TW, TH)); im.paste(t, (10 + j * (TW + 6), y + 20))
    d.text((10 + 8 * (TW + 6) + 10, y + 24), c["reads_as"], font=F, fill="#211b15")
im.save(FIG / "layouts_clusters.png")
md = ["# Layouts", "", "Generated by `scripts/layouts.py`. Features per image come from `metrics/pixels.json`. k-means picks k by silhouette over 8–10, with favourites weighted 3×.", "",
      f"k = {k}. Silhouette: " + ", ".join(f"{a}: {b:.3f}" for a, b in scores.items()) + ". All three scores are under 0.2, so the clusters are weak: the board's layouts form a continuum, not distinct types (DECISIONS 41).", "",
      "Which template a cluster maps to is a judgment call (DECISIONS 42). Each template cites board blocks from its own cluster; see `kit/templates/*/slots.json` → `board_blocks`.", "",
      "| cluster | n (board/feed) | reads as | board members | templates |", "|---|---|---|---|---|"]
for c in clusters:
    md.append(f"| C{c['cluster']} | {c['n']} ({c['board']}/{c['instagram']}) | {c['reads_as']} | {', '.join(x.split(':')[1] for x in c['members'] if x.startswith('board'))} | {', '.join(c['templates'])} |")
md += ["", "![clusters](../fig/layouts_clusters.png)", ""]
open(O / "LAYOUTS.md", "w", encoding="utf-8").write(chr(10).join(md))
for c in clusters: print(c["cluster"], c["n"], c["board"], c["instagram"], c["reads_as"], c["favourites"])
print("k", k, scores)
