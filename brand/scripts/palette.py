"""BRANDKIT Phase 4 (colour): the final palette, decided by rules in code from the FIX Phase 2 measurements.
Inputs: colour/existing.json (60 Instagram thumbnails) and colour/board.json (53 board images, favourites x2), each k=6 per
image re-clustered to 12 weighted aggregate clusters; fonts/specimen/spec.json (post type sizes).
k check: the spec says k=5 per image. The aggregate is re-clustered to 12 anyway, so k=5 is re-run here on the same pixels
and each k=5 aggregate cluster is matched to its nearest k=6 cluster (CIEDE2000); the result is recorded in palette.json.

Rules (dE = CIEDE2000 between aggregate clusters):
  KEEP    an Instagram (existing) cluster whose nearest board cluster is within dE < 10: it recurs on the board, keep its hex.
  ADD     a board cluster whose nearest kept/existing cluster is dE >= 10 and whose share is >= 5%: the board brings it.
  RETIRE  an existing cluster whose nearest board cluster is dE >= 20: it clashes with the board.
  (10 <= dE < 20 and not added: 'unresolved', listed but not used.)
Roles, from the kept + added set:
  background = the highest-share cluster with L* > 90 (paper);
  surface    = the highest-share cluster with 75 < L* <= 90 that is dE >= 5 from background;
  text       = the highest-share cluster with L* < 20;
  accent-1   = the highest-share chromatic cluster (C* >= 12) that is not background/surface/text;
  accent-2   = the next chromatic cluster that is dE >= 15 from accent-1;
  signal     = the highest-chroma cluster in either source that is not retired (C* max), dE >= 20 from both accents, so it
               reads as a signal. A retired colour cannot come back as the signal.
Contrast: WCAG 2.x; post captions/labels (37.6 / 35.6 px on a 1080 canvas, about 13.6 px on a 390 px phone) need 4.5;
headlines (82 px, about 30 px on screen) need 3.0. -> colour/palette.json, fig/colour_*.png. Run with brand-venv python -I."""
import json, pathlib, sys
import numpy as np
from PIL import Image, ImageSequence
from sklearn.cluster import KMeans
from skimage.color import rgb2lab, deltaE_ciede2000
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt

sys.stdout.reconfigure(encoding="utf-8")
B = pathlib.Path(__file__).resolve().parents[1]; C = B / "colour"; FIG = B / "fig"
ex = json.load(open(C / "existing.json", encoding="utf-8")); bd = json.load(open(C / "board.json", encoding="utf-8"))
spec = json.load(open(B / "fonts" / "specimen" / "spec.json", encoding="utf-8"))
rgb = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)
lab = lambda h: rgb2lab((rgb(h) / 255)[None, None, :])[0, 0]
dE = lambda a, b: float(deltaE_ciede2000(lab(a)[None], lab(b)[None])[0])
chroma = lambda h: float(np.hypot(*lab(h)[1:]))
def lum(h):
    c = rgb(h) / 255; c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4); return float(c @ [0.2126, 0.7152, 0.0722])
def ratio(a, b):
    x, y = sorted([lum(a), lum(b)], reverse=True); return round((x + 0.05) / (y + 0.05), 2)

E = [dict(c, src="instagram", i=i) for i, c in enumerate(ex["aggregate"])]
D = [dict(c, src="board", i=i) for i, c in enumerate(bd["aggregate"])]
cid = lambda c: f"{c['src']}.aggregate[{c['i']}] {c['hex']} ({c['share'] * 100:.1f}%)"
near = lambda c, pool: min(((dE(c["hex"], p["hex"]), p) for p in pool), key=lambda t: t[0])

decisions, keep, retire, unresolved = [], [], [], []
for c in E:
    d, p = near(c, D); c["nearest_board"] = {"dE": round(d, 1), "cluster": cid(p)}
    (keep if d < 10 else retire if d >= 20 else unresolved).append(c)
add = []
for c in D:
    d, p = near(c, E); c["nearest_existing"] = {"dE": round(d, 1), "cluster": cid(p)}
    if d >= 10 and c["share"] >= 0.05:
        add.append(c)
pool = sorted(keep + add, key=lambda c: -c["share"])
L = lambda c: float(lab(c["hex"])[0])
def first(cands, why):
    if not cands: raise SystemExit("no cluster for " + why)
    return cands[0]
bg = first([c for c in pool if L(c) > 90], "background")
sf = first([c for c in pool if 75 < L(c) <= 90 and dE(c["hex"], bg["hex"]) >= 5], "surface")
tx = first([c for c in pool if L(c) < 20], "text")
chrom = [c for c in pool if chroma(c["hex"]) >= 12 and c not in (bg, sf, tx)]
a1 = first(chrom, "accent-1")
a2 = first([c for c in chrom if c is not a1 and dE(c["hex"], a1["hex"]) >= 15], "accent-2")
sig = first(sorted([c for c in E + D if c not in retire and dE(c["hex"], a1["hex"]) >= 20 and dE(c["hex"], a2["hex"]) >= 20], key=lambda c: -chroma(c["hex"])), "signal")
roles = {"background": bg, "surface": sf, "text": tx, "accent-1": a1, "accent-2": a2, "signal": sig}

# contrast: every role on every role used as a ground
NEED = {"caption/label (4.5)": 4.5, "headline (3.0)": 3.0}
pairs = []
for fg, f in roles.items():
    for gr, g in roles.items():
        if fg == gr: continue
        r = ratio(f["hex"], g["hex"])
        pairs.append({"text": fg, "on": gr, "fg": f["hex"], "bg": g["hex"], "ratio": r, "caption_label_AA": r >= 4.5, "headline_AA": r >= 3.0})
aa = [p for p in pairs if p["headline_AA"]]

# k=5 check on the same pixels (same thumbnailing as colour_measure.py)
def px(path):
    im = Image.open(path)
    if getattr(im, "is_animated", False): im = next(ImageSequence.Iterator(im))
    im = im.convert("RGB"); im.thumbnail((160, 160)); return np.asarray(im).reshape(-1, 3).astype(np.float32)
def k5(items):
    cs, ws = [], []
    for path, w in items:
        p = px(path); km = KMeans(5, n_init=4, random_state=0).fit(p)
        sh = np.bincount(km.labels_, minlength=5) / len(p)
        cs += list(km.cluster_centers_); ws += list(sh * w)
    km = KMeans(12, n_init=8, random_state=0).fit(np.array(cs), sample_weight=np.array(ws))
    sh = np.bincount(km.labels_, weights=ws, minlength=12); sh /= sh.sum()
    return [{"hex": "#%02x%02x%02x" % tuple(int(round(v)) for v in c), "share": float(s)} for c, s in zip(km.cluster_centers_, sh)]
blocks = {b["id"]: b for b in json.load(open(B / "board" / "blocks.json", encoding="utf-8"))}
FAV = {7529470, 14664481, 41911984, 2145281}
bitems = [(B / "board" / blocks[r["id"]]["file"], 2 if r["id"] in FAV else 1) for r in bd["per_image"] if blocks.get(r["id"], {}).get("file")]
iitems = [(p, 1) for p in sorted((B / "existing" / "thumbs").glob("*.jpg"))]
kcheck = {}
for name, items, agg in (("board", bitems, D), ("instagram", iitems, E)):
    k5agg = k5(items)
    ds = [round(near(c, agg)[0], 1) for c in k5agg]
    role_ds = {r: round(min(dE(c["hex"], x["hex"]) for x in k5agg), 1) for r, c in roles.items() if c["src"] == name}
    kcheck[name] = {"k5_aggregate": k5agg, "k5_to_nearest_k6_dE_median": float(np.median(ds)), "k5_to_nearest_k6_dE_max": float(max(ds)),
                    "chosen_roles_nearest_k5_dE": role_ds}

out = {"rules": __doc__.split("Rules")[1].split("-> colour")[0].strip(),
       "palette": {r: {"hex": c["hex"], "source": cid(c), "L": round(L(c), 1), "C": round(chroma(c["hex"]), 1), "role_guess": c["role_guess"]} for r, c in roles.items()},
       "kept_existing": [{"hex": c["hex"], "source": cid(c), **c["nearest_board"]} for c in keep],
       "added_from_board": [{"hex": c["hex"], "source": cid(c), **c["nearest_existing"]} for c in add],
       "retired_existing": [{"hex": c["hex"], "source": cid(c), **c["nearest_board"]} for c in retire],
       "unresolved_existing": [{"hex": c["hex"], "source": cid(c), **c["nearest_board"]} for c in unresolved],
       "contrast_pairs_all": pairs, "aa_pairs": aa, "contrast_basis": {"caption_px": spec["canvases"]["1080x1350"]["sizes"]["caption"]["font_size_px"],
       "label_px": spec["canvases"]["1080x1350"]["sizes"]["label"]["font_size_px"], "headline_px": spec["canvases"]["1080x1350"]["sizes"]["headline"]["font_size_px"],
       "screen_scale": "390/1080 (judgment call: an iPhone-width feed)", "thresholds": NEED},
       "k_check": kcheck, "k_used": "k=6 (FIX Phase 2 measurement); k=5 re-run as a check, see k_check"}
json.dump(out, open(C / "palette.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)

# plates (one claim each)
def swatch(ax, x, y, w, h, hx, label, sub="", ink=None):
    ax.add_patch(plt.Rectangle((x, y), w, h, color=hx, ec="#999", lw=0.5))
    ink = ink or ("#111" if lum(hx) > 0.3 else "#fff")
    ax.text(x + 0.03 * w, y + h - 0.12 * h, label, color=ink, fontsize=9, va="top", family="monospace")
    if sub: ax.text(x + 0.03 * w, y + 0.08 * h, sub, color=ink, fontsize=6.5, va="bottom", family="monospace")
fig, ax = plt.subplots(figsize=(12, 4.2)); ax.set_xlim(0, 6); ax.set_ylim(0, 1.25); ax.axis("off")
for k, (r, c) in enumerate(roles.items()):
    swatch(ax, k, 0, 0.96, 1, c["hex"], f"{r}\n{c['hex']}", f"{c['src']} [{c['i']}]\n{c['share'] * 100:.1f}% · L{L(c):.0f} C{chroma(c['hex']):.0f}")
ax.text(0, 1.12, "FINAL PALETTE — six roles, each a measured aggregate cluster (colour/palette.json)", fontsize=11, family="monospace")
fig.savefig(FIG / "colour_final_palette.png", dpi=160, bbox_inches="tight"); plt.close(fig)

fig, ax = plt.subplots(figsize=(12, 5.2)); ax.axis("off"); ax.set_xlim(0, 12); ax.set_ylim(0, len(roles) + 1.2)
grounds = list(roles)
for j, g in enumerate(grounds):
    for i, f in enumerate(grounds):
        x, y = 2 + i * 1.65, len(roles) - 1 - j
        if f == g: continue
        r = ratio(roles[f]["hex"], roles[g]["hex"])
        ax.add_patch(plt.Rectangle((x, y), 1.55, 0.9, color=roles[g]["hex"], ec="#999", lw=0.5))
        mark = "AA" if r >= 4.5 else "AA large" if r >= 3 else "fail"
        ax.text(x + 0.08, y + 0.45, f"Aa {r}", color=roles[f]["hex"], fontsize=11, va="center", family="monospace", weight="bold")
        ax.text(x + 0.08, y + 0.12, mark, color=roles[f]["hex"] if r >= 3 else "#c00", fontsize=6.5, family="monospace")
    ax.text(1.9, len(roles) - 1 - j + 0.45, f"on {g}", ha="right", va="center", fontsize=8, family="monospace")
for i, f in enumerate(grounds): ax.text(2 + i * 1.65, len(roles) + 0.05, f, fontsize=8, family="monospace")
ax.text(0, len(roles) + 0.6, "CONTRAST — captions/labels need 4.5 (AA), headlines need 3.0 (AA large) at post sizes", fontsize=11, family="monospace")
fig.savefig(FIG / "colour_contrast_pairs.png", dpi=160, bbox_inches="tight"); plt.close(fig)

fig, ax = plt.subplots(figsize=(12, 4.6)); ax.axis("off")
cols = [("KEPT (existing, dE<10 to board)", keep), ("ADDED (board, dE>=10, share>=5%)", add), ("RETIRED (existing, dE>=20)", retire), ("UNRESOLVED (10-20)", unresolved)]
ax.set_xlim(0, 4); ax.set_ylim(-0.2, max(len(c[1]) for c in cols) * 0.42 + 0.6)
for k, (t, cs) in enumerate(cols):
    ax.text(k, max(len(c[1]) for c in cols) * 0.42 + 0.3, t, fontsize=8, family="monospace")
    for n, c in enumerate(cs):
        dd = c.get("nearest_board", c.get("nearest_existing"))["dE"]
        swatch(ax, k, max(len(c[1]) for c in cols) * 0.42 - (n + 1) * 0.42 + 0.2, 0.9, 0.36, c["hex"], f"{c['hex']}  dE {dd}", f"{c['share'] * 100:.1f}% {c['role_guess']}")
fig.suptitle("RECONCILIATION — Instagram clusters against board clusters (CIEDE2000)", family="monospace", fontsize=11, x=0.02, ha="left")
fig.savefig(FIG / "colour_reconcile.png", dpi=160, bbox_inches="tight"); plt.close(fig)

print("palette:", {r: v["hex"] + " <- " + v["source"] for r, v in out["palette"].items()})
print("keep", [c["hex"] for c in keep], "add", [c["hex"] for c in add], "retire", [c["hex"] for c in retire], "unresolved", [c["hex"] for c in unresolved])
print("AA caption:", [(p["text"], p["on"], p["ratio"]) for p in pairs if p["caption_label_AA"]])
print("AA headline only:", [(p["text"], p["on"], p["ratio"]) for p in pairs if p["headline_AA"] and not p["caption_label_AA"]])
print("k check:", {k: (v["k5_to_nearest_k6_dE_median"], v["k5_to_nearest_k6_dE_max"], v["chosen_roles_nearest_k5_dE"]) for k, v in kcheck.items()})
