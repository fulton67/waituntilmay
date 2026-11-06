"""BRANDKIT Phase 4 composition -> the post grid. Every number from metrics/pixels.json (or fonts/specimen/spec.json),
else marked judgment call. -> composition/grid.json, composition/GRID.md, fig/composition_*.png. brand-venv python -I."""
import json, pathlib, statistics as st, sys
from collections import Counter
import numpy as np
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

sys.stdout.reconfigure(encoding="utf-8")
B = pathlib.Path(__file__).resolve().parents[1]; O = B / "composition"; O.mkdir(exist_ok=True); FIG = B / "fig"
px = json.load(open(B / "metrics" / "pixels.json", encoding="utf-8")); spec = json.load(open(B / "fonts" / "specimen" / "spec.json", encoding="utf-8"))
R, IM = px["regions"], list(px["images"].values())
INK, MUTE, RULE, PAPER = "#211b15", "#7d8075", "#d7d5d0", "#f6f6f5"
plt.rcParams.update({"font.family": "Arial", "font.size": 9, "axes.edgecolor": MUTE, "axes.labelcolor": INK, "xtick.color": MUTE, "ytick.color": MUTE})

def med(vals): vals = [v for v in vals if v is not None]; return round(st.median(vals), 2) if vals else None
g = {"cite": {}}
# margins: instagram image-level median left margin; edge-touching text (0) is excluded for the safe area (it is full-bleed type / UI, not a margin habit)
ig_im = [i for i in IM if i["source"] == "instagram"]
margins = [i["text_margin_left_pct"] for i in ig_im if i.get("text_margin_left_pct")]
edges = [i["text_edge_min_pct"] for i in ig_im if i.get("text_edge_min_pct")]
g["margin_pct_w"] = med(margins); g["cite"]["margin_pct_w"] = f"pixels.json images source=instagram median text_margin_left_pct (n={len(margins)}, zeros excluded)"
g["safe_edge_pct_w"] = med(edges); g["cite"]["safe_edge_pct_w"] = f"pixels.json images source=instagram median text_edge_min_pct (n={len(edges)}, zeros excluded)"
touching = sum(1 for i in ig_im if i.get("text_edge_min_pct") == 0)
g["edge_touching_posts"] = touching
# columns: k-means on instagram text left edges (not touching the edge); k by silhouette
lefts = np.array([[r["left_pct"]] for r in R if r["source"] == "instagram" and r["left_pct"] > 1])
best = max(range(2, 7), key=lambda k: silhouette_score(lefts, KMeans(k, n_init=10, random_state=0).fit_predict(lefts)))
km = KMeans(best, n_init=10, random_state=0).fit(lefts)
cols = sorted(round(float(c), 1) for c in km.cluster_centers_.ravel())
g["column_starts_pct_w"] = cols; g["columns"] = best
g["cite"]["columns"] = f"k-means on pixels.json regions source=instagram left_pct > 1 (n={len(lefts)}), k={best} by silhouette over 2..6"
# subject placement
cells = {s: Counter(i["subject_thirds_cell"] for i in IM if i["source"] == s and i.get("subject_thirds_cell")) for s in ("board", "instagram")}
g["subject_cells"] = {s: dict(c) for s, c in cells.items()}; g["cite"]["subject_cells"] = "pixels.json images subject_thirds_cell"
g["text_area_pct"] = {s: med([i["text_area_pct"] for i in IM if i["source"] == s]) for s in ("board", "instagram")}
g["cite"]["text_area_pct"] = "pixels.json images median text_area_pct"
g["headline_block_w_pct"] = spec["roles"]["headline"]["block_w_pct"]; g["caption_block_w_pct"] = spec["roles"]["caption"]["block_w_pct"]
g["cite"]["block_w"] = "fonts/specimen/spec.json roles (pixels.json instagram medians)"
# type scale from the spec (1080x1350)
s = spec["canvases"]["1080x1350"]["sizes"]
g["type_scale_px_1350"] = {k: v["font_size_px"] for k, v in s.items()}
g["type_scale_ratio"] = round(s["headline"]["font_size_px"] / s["caption"]["font_size_px"], 3)
# safe areas per canvas; 9:16 platform UI bands are a judgment call (Instagram story chrome: profile row top, reply bar bottom)
m = g["margin_pct_w"] / 100
g["canvases"] = {}
for name, (w, h) in {"4:5": (1080, 1350), "1:1": (1080, 1080), "9:16": (1080, 1920)}.items():
    top = bot = round(m * w)
    if name == "9:16":
        top, bot = 250, 340
    g["canvases"][name] = {"w": w, "h": h, "margin_x_px": round(m * w), "safe_top_px": top, "safe_bottom_px": bot,
                           "columns_x_px": [round(c / 100 * w) for c in cols]}
g["cite"]["9:16 bands"] = "judgment call: 250 px top / 340 px bottom kept clear of Instagram story chrome"
json.dump(g, open(O / "grid.json", "w", encoding="utf-8"), indent=1)

# plates (one claim each)
fig, ax = plt.subplots(figsize=(6, 2.6))
ax.hist([r["left_pct"] for r in R if r["source"] == "instagram"], bins=50, range=(0, 100), color=RULE, edgecolor=MUTE, lw=.4)
for c in cols: ax.axvline(c, color=INK, lw=1)
ax.set_xlabel("text left edge, % of width (Instagram)"); ax.set_ylabel("regions")
ax.set_title(f"TEXT LINES UP ON {best} COLUMN STARTS: " + " / ".join(f"{c}%" for c in cols), loc="left", fontsize=9, color=INK)
fig.tight_layout(); fig.savefig(FIG / "composition_columns.png", dpi=200); plt.close(fig)

fig, axs = plt.subplots(1, 2, figsize=(5.6, 2.8))
names = [["top-left", "top-centre", "top-right"], ["middle-left", "middle-centre", "middle-right"], ["bottom-left", "bottom-centre", "bottom-right"]]
for ax, src in zip(axs, ("board", "instagram")):
    M = np.array([[cells[src].get(n, 0) for n in row] for row in names]); ax.imshow(M, cmap="Greys", vmin=0)
    for (y, x), v in np.ndenumerate(M): ax.text(x, y, v, ha="center", va="center", color=PAPER if v > M.max() / 2 else INK)
    ax.set_xticks([]); ax.set_yticks([]); ax.set_title(f"{src} (n={M.sum()})", fontsize=9)
fig.suptitle("THE SUBJECT SITS IN THE MIDDLE CELL", x=0.02, ha="left", fontsize=9, color=INK)
fig.tight_layout(); fig.savefig(FIG / "composition_subject.png", dpi=200); plt.close(fig)

fig, axs = plt.subplots(1, 3, figsize=(7, 4.2), gridspec_kw={"width_ratios": [1080 / 1350, 1, 1080 / 1920]})
for ax, (name, c) in zip(axs, g["canvases"].items()):
    ax.add_patch(Rectangle((0, 0), c["w"], c["h"], fc=PAPER, ec=MUTE, lw=.6))
    ax.add_patch(Rectangle((c["margin_x_px"], c["safe_bottom_px"]), c["w"] - 2 * c["margin_x_px"], c["h"] - c["safe_top_px"] - c["safe_bottom_px"], fc="none", ec=INK, lw=.8, ls="--"))
    for x in c["columns_x_px"]: ax.axvline(x, color=RULE, lw=.6)
    ax.set_xlim(0, c["w"]); ax.set_ylim(0, c["h"]); ax.set_aspect("equal"); ax.axis("off")
    ax.set_title(f"{name}  {c['w']}×{c['h']}\nmargin {c['margin_x_px']} px", fontsize=8)
fig.suptitle(f"SAFE AREA = {g['margin_pct_w']}% MARGIN; COLUMNS FROM MEASURED LEFT EDGES", x=0.02, ha="left", fontsize=9, color=INK)
fig.tight_layout(); fig.savefig(FIG / "composition_safe_areas.png", dpi=200); plt.close(fig)

L = ["# Post grid", "", "Derived from `metrics/pixels.json` (`scripts/composition.py`). Every number cites its row or is a judgment call.", "",
     f"- **Margin:** {g['margin_pct_w']}% of width ({g['cite']['margin_pct_w']}). {touching} of {len(ig_im)} posts run text to the edge; that is full-bleed type or UI, not the margin habit.",
     f"- **Columns:** {best} starts at {', '.join(str(c) + '%' for c in cols)} of width ({g['cite']['columns']}).",
     f"- **Subject:** middle-centre in {cells['board'].get('middle-centre', 0)}/{sum(cells['board'].values())} board images and {cells['instagram'].get('middle-centre', 0)}/{sum(cells['instagram'].values())} posts ({g['cite']['subject_cells']}).",
     f"- **Text area:** {g['text_area_pct']['board']}% of the board frame, {g['text_area_pct']['instagram']}% of a post ({g['cite']['text_area_pct']}).",
     f"- **Measure:** headline {g['headline_block_w_pct']}% wide, caption {g['caption_block_w_pct']}% ({g['cite']['block_w']}).",
     f"- **Type scale (1080×1350):** headline {g['type_scale_px_1350']['headline']} px, caption {g['type_scale_px_1350']['caption']} px, label {g['type_scale_px_1350']['label']} px; ratio {g['type_scale_ratio']}.", "",
     "| Canvas | Margin x | Safe top | Safe bottom | Column x (px) |", "|---|---|---|---|---|"]
for n, c in g["canvases"].items():
    L.append(f"| {n} {c['w']}×{c['h']} | {c['margin_x_px']} | {c['safe_top_px']} | {c['safe_bottom_px']} | {', '.join(map(str, c['columns_x_px']))} |")
L += ["", f"9:16 top/bottom bands: {g['cite']['9:16 bands']}.", "", "Plates: `fig/composition_columns.png`, `fig/composition_subject.png`, `fig/composition_safe_areas.png`."]
(O / "GRID.md").write_text("\n".join(L) + "\n", encoding="utf-8")
print("\n".join(L))
