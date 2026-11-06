"""BRANDKIT_RUN Phase 4 — shape & motif. Detects recurring shapes on every board image and every Instagram thumbnail.
Each image is scaled so its short side is 720 px; every size below is a % of the frame, so all images are comparable.

Classes (OpenCV 5):
  rule_h / rule_v  long straight lines (HoughLinesP on Canny), >= 25% of the short side, not on the image border
  stroke           thickness of a rule = gap to its paired parallel edge (a drawn rule gives two edges); else <= 1 px
  frame            a rectangle inset from the image edges (4 vertices, covers >= 45% of the area, inset 1–20% of width)
  rect             closed 4-sided contour that fills its min-area rectangle (fill >= 0.985)
  rounded_rect     convex contour with fill 0.86–0.985; corner radius from the area deficit: wh - A = (4 - pi) r^2
  pill             rounded_rect whose radius >= 0.42 x its short side and aspect >= 1.6
  circle           circularity 4piA/P^2 >= 0.85, aspect < 1.2
  blob             smooth closed contour (>= 2% of the frame, solidity 0.75–0.97, circularity 0.45–0.85, >= 8 vertices at 1% epsilon)
  grid             >= 4 parallel rules of one orientation with regular spacing (CV of gaps < 0.15)
  grain            high-pass (gray - GaussianBlur sigma 1.5) std in flat areas; 'grain' = std >= 2.5 levels (judgment call threshold)
Contours are de-duplicated by bounding-box IoU > 0.8 (inner and outer edges of one stroke).
-> shapes/catalogue.json, shapes/CATALOGUE.md, kit/shapes/*.svg, fig/shapes_counts.png, fig/shapes_vocabulary.png
Run with brand-venv python -I."""
import json, math, pathlib, statistics as st, sys
from collections import defaultdict
import numpy as np, cv2
from PIL import Image, ImageSequence

sys.stdout.reconfigure(encoding="utf-8")
B = pathlib.Path(__file__).resolve().parents[1]
OUT = B / "shapes"; OUT.mkdir(exist_ok=True)
SVG = B / "kit" / "shapes"; SVG.mkdir(parents=True, exist_ok=True)
FIG = B / "fig"; FIG.mkdir(exist_ok=True)
FAV = {"7529470", "14664481", "41911984", "2145281"}
S = 720
CLASSES = ["rule_h", "rule_v", "frame", "rect", "rounded_rect", "pill", "circle", "blob", "grid", "grain"]

def load(p):
    im = Image.open(p)
    if getattr(im, "is_animated", False):
        im = next(ImageSequence.Iterator(im))
    a = np.asarray(im.convert("RGB"))
    h, w = a.shape[:2]; k = S / min(h, w)
    return cv2.resize(a, (round(w * k), round(h * k)), interpolation=cv2.INTER_AREA)

def iou(a, b):
    ax, ay, aw, ah = a; bx, by, bw, bh = b
    ix = max(0, min(ax + aw, bx + bw) - max(ax, bx)); iy = max(0, min(ay + ah, by + bh) - max(ay, by))
    i = ix * iy; return i / (aw * ah + bw * bh - i + 1e-9)

def lines(gray, edges):
    H, W = gray.shape
    L = cv2.HoughLinesP(edges, 1, np.pi / 180, 80, minLineLength=int(0.25 * S), maxLineGap=4)
    L = np.asarray(L).reshape(-1, 4) if L is not None else np.zeros((0, 4), int)
    hs, vs = [], []
    for x1, y1, x2, y2 in L:
        ang = abs(math.degrees(math.atan2(y2 - y1, x2 - x1))) % 180
        if min(ang, 180 - ang) <= 2:  # horizontal
            y = (y1 + y2) / 2
            if 3 < y < H - 3: hs.append((min(x1, x2), max(x1, x2), y))
        elif abs(ang - 90) <= 2:
            x = (x1 + x2) / 2
            if 3 < x < W - 3: vs.append((min(y1, y2), max(y1, y2), x))
    return hs, vs

def merge(ls, tol=1.5):
    """merge collinear segments; returns rules as (a0, a1, pos, stroke_px)"""
    ls = sorted(ls, key=lambda l: l[2]); out = []
    for a0, a1, p in ls:
        for o in out:
            if abs(o["p"] - p) <= tol and not (a1 < o["a0"] - 10 or a0 > o["a1"] + 10):
                o["a0"] = min(o["a0"], a0); o["a1"] = max(o["a1"], a1); o["ps"].append(p); break
        else:
            out.append({"a0": a0, "a1": a1, "p": p, "ps": [p]})
    rules, used = [], set()
    for i, o in enumerate(out):  # a drawn rule = two edges a few px apart with overlap
        if i in used: continue
        stroke = 1.0
        for j in range(i + 1, len(out)):
            q = out[j]
            if j in used or q["p"] - o["p"] > 0.02 * S: continue
            ov = min(o["a1"], q["a1"]) - max(o["a0"], q["a0"])
            if ov > 0.7 * min(o["a1"] - o["a0"], q["a1"] - q["a0"]):
                stroke = q["p"] - o["p"]; used.add(j); break
        rules.append((o["a0"], o["a1"], o["p"] + stroke / 2, stroke))
    return rules

def grid_of(rules):
    """>= 4 parallel rules with regular spacing -> (count, spacing_px)"""
    ps = sorted(r[2] for r in rules)
    best = None
    for i in range(len(ps)):
        for j in range(i + 3, len(ps)):
            sub = ps[i:j + 1]; g = np.diff(sub)
            if g.min() > 0.03 * S and g.std() / g.mean() < 0.15:
                if not best or len(sub) > best[0]: best = (len(sub), float(g.mean()))
    return best

def analyse(rgb):
    H, W = rgb.shape[:2]; A = H * W
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (3, 3), 0), 50, 150)
    hs, vs = lines(gray, edges)
    rh, rv = merge(hs), merge(vs)
    d = {c: [] for c in CLASSES}
    for a0, a1, p, s in rh: d["rule_h"].append({"len_pct": round(100 * (a1 - a0) / W, 1), "y_pct": round(100 * p / H, 1), "stroke_pct_w": round(100 * s / W, 3)})
    for a0, a1, p, s in rv: d["rule_v"].append({"len_pct": round(100 * (a1 - a0) / H, 1), "x_pct": round(100 * p / W, 1), "stroke_pct_w": round(100 * s / W, 3)})
    for rules, o in ((rh, "h"), (rv, "v")):
        g = grid_of(rules)
        if g: d["grid"].append({"orientation": o, "lines": g[0], "spacing_pct": round(100 * g[1] / (H if o == "h" else W), 1)})
    closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    cs, _ = cv2.findContours(closed, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    seen = []
    for c in sorted(cs, key=cv2.contourArea, reverse=True):
        a = cv2.contourArea(c)
        if a < 0.01 * A or a > 0.97 * A: continue
        bb = cv2.boundingRect(c)
        if any(iou(bb, s) > 0.8 for s in seen): continue
        peri = cv2.arcLength(c, True); circ = 4 * math.pi * a / (peri * peri + 1e-9)
        (cx, cy), (rw, rh_), ang = cv2.minAreaRect(c)
        if min(rw, rh_) < 8: continue
        fill = a / (rw * rh_ + 1e-9); aspect = max(rw, rh_) / min(rw, rh_)
        hull = cv2.convexHull(c); sol = a / (cv2.contourArea(hull) + 1e-9)
        ap = cv2.approxPolyDP(c, 0.02 * peri, True); short = min(rw, rh_)
        x, y, w, h = bb; inset = min(x, y, W - x - w, H - y - h)
        rec = {"w_pct": round(100 * rw / W, 1), "h_pct": round(100 * rh_ / H, 1), "aspect": round(aspect, 2), "x_pct": round(100 * cx / W, 1), "y_pct": round(100 * cy / H, 1)}
        cls = None
        if len(ap) == 4 and a >= 0.45 * A and 0.01 * W <= inset <= 0.2 * W and fill >= 0.95:
            cls = "frame"; rec["inset_pct_w"] = round(100 * inset / W, 1)
        elif circ >= 0.85 and aspect < 1.2:
            cls = "circle"; rec["d_pct_short"] = round(100 * short / S, 1)
        elif sol >= 0.97 and fill >= 0.985 and len(ap) == 4:
            cls = "rect"
        elif sol >= 0.97 and 0.86 <= fill < 0.985:
            r = math.sqrt(max(0.0, rw * rh_ - a) / (4 - math.pi))
            if r < 0.5 * short:
                rec["radius_pct_short"] = round(100 * r / short, 1)  # of the shape's own short side
                rec["radius_pct_frame"] = round(100 * r / S, 2)       # of the frame's short side
                cls = "pill" if r >= 0.42 * short and aspect >= 1.6 else "rounded_rect"
        if cls is None and a >= 0.02 * A and 0.75 <= sol < 0.97 and 0.45 <= circ < 0.85 and len(cv2.approxPolyDP(c, 0.01 * peri, True)) >= 8:
            cls = "blob"; rec["circularity"] = round(circ, 2)
        if cls:
            seen.append(bb); d[cls].append(rec)
    # grain: high-pass energy in flat areas
    g = gray.astype(np.float32); hp = g - cv2.GaussianBlur(g, (0, 0), 1.5)
    grad = cv2.magnitude(cv2.Sobel(g, cv2.CV_32F, 1, 0), cv2.Sobel(g, cv2.CV_32F, 0, 1))
    flat = grad < np.percentile(grad, 40)
    gs = float(hp[flat].std()) if flat.sum() > 500 else float(hp.std())
    if gs >= 2.5: d["grain"].append({"hp_std": round(gs, 2)})
    return d, round(gs, 2)

blocks = json.load(open(B / "board" / "blocks.json", encoding="utf-8"))
items = [("board", str(b["id"]), B / "board" / b["file"]) for b in blocks if b.get("file") and (B / "board" / b["file"]).exists()]
items += [("instagram", p.stem, p) for p in sorted((B / "existing" / "thumbs").glob("*.jpg"))]
per = {}
for src, iid, p in items:
    try:
        d, gs = analyse(load(p))
    except Exception as e:
        print("skip", iid, e); continue
    per[f"{src}:{iid}"] = {"source": src, "id": iid, "favourite": iid in FAV, "grain_hp_std": gs, "counts": {c: len(v) for c, v in d.items()}, "shapes": d}
    print(src, iid, {c: len(v) for c, v in d.items() if v})

def med(cls, key, src=None):
    v = [s[key] for r in per.values() if src in (None, r["source"]) for s in r["shapes"][cls] if s.get(key) is not None]
    return (round(st.median(v), 3), len(v)) if v else (None, 0)

tot = {}
for c in CLASSES:
    t = {"instances": 0, "images": 0, "images_board": 0, "images_instagram": 0, "favourite_images": 0}
    for r in per.values():
        n = r["counts"][c]; t["instances"] += n
        if n:
            t["images"] += 1; t["images_" + r["source"]] += 1; t["favourite_images"] += r["favourite"]
    # vocabulary score: images showing the class (presence, robust to one busy photo), favourites x3 like the type scoring
    t["score"] = t["images"] + 2 * t["favourite_images"]
    tot[c] = t
props = {"rule_stroke_pct_w": med("rule_h", "stroke_pct_w"), "rule_h_len_pct": med("rule_h", "len_pct"), "rule_v_len_pct": med("rule_v", "len_pct"),
         "frame_inset_pct_w": med("frame", "inset_pct_w"), "rounded_radius_pct_short": med("rounded_rect", "radius_pct_short"),
         "rounded_radius_pct_frame": med("rounded_rect", "radius_pct_frame"), "rounded_aspect": med("rounded_rect", "aspect"),
         "rect_aspect": med("rect", "aspect"), "pill_aspect": med("pill", "aspect"), "circle_d_pct_short": med("circle", "d_pct_short"),
         "blob_circularity": med("blob", "circularity"), "grid_spacing_pct": med("grid", "spacing_pct"), "grain_hp_std": (round(st.median([r["grain_hp_std"] for r in per.values()]), 2), len(per))}
# rule: rank by score; keep every class present on >= 5% of images (score-weighted), at least 6 and at most 10
n_img = len(per)
rank = sorted(CLASSES, key=lambda c: -tot[c]["score"])
vocab = [c for c in rank if tot[c]["images"] >= 0.05 * n_img][:10]
if len(vocab) < 6: vocab = [c for c in rank if tot[c]["images"] > 0][:6]
cat = {"images": n_img, "board_images": sum(r["source"] == "board" for r in per.values()), "instagram_images": sum(r["source"] == "instagram" for r in per.values()),
       "method": __doc__, "vocabulary_rule": "score = images showing the class + 2 x favourite images showing it; keep classes on >= 5% of images, 6..10",
       "totals": tot, "proportions_median_n": props, "vocabulary": vocab, "per_image": per}
json.dump(cat, open(OUT / "catalogue.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)

# ---- SVGs (100 x 125 viewBox = 4:5 post; proportions from the medians above; ink #211b15 from colour/board.json aggregate #2)
INK = "#211b15"
def v(k, default):  # measured median or a stated default
    x = props[k][0]; return (x, "measured") if x is not None else (default, "judgment call (class not measured)")
sw = max(0.15, v("rule_stroke_pct_w", 0.14)[0])  # % of width -> viewBox units (width 100)
svgs = {}
def svg(name, body, note):
    s = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 125" width="400" height="500"><title>{name}</title><desc>{note}</desc>{body}</svg>\n'
    (SVG / f"{name}.svg").write_text(s, encoding="utf-8"); svgs[name] = note
L = v("rule_h_len_pct", 60)[0]
svg("rule_h", f'<line x1="{(100 - L) / 2:.2f}" y1="62.5" x2="{(100 + L) / 2:.2f}" y2="62.5" stroke="{INK}" stroke-width="{sw:.3f}"/>',
    f"horizontal hairline; length {L}% of width, stroke {sw:.3f}% of width (catalogue medians)")
Lv = v("rule_v_len_pct", 60)[0]
svg("rule_v", f'<line x1="50" y1="{(125 - 1.25 * Lv) / 2:.2f}" x2="50" y2="{(125 + 1.25 * Lv) / 2:.2f}" stroke="{INK}" stroke-width="{sw:.3f}"/>',
    f"vertical hairline; length {Lv}% of height, stroke {sw:.3f}% of width")
ins = v("frame_inset_pct_w", 5.4)
svg("frame", f'<rect x="{ins[0]:.2f}" y="{ins[0]:.2f}" width="{100 - 2 * ins[0]:.2f}" height="{125 - 2 * ins[0]:.2f}" fill="none" stroke="{INK}" stroke-width="{sw:.3f}"/>',
    f"inset frame; inset {ins[0]}% of width ({ins[1]})")
ra, asp = v("rounded_radius_pct_short", 12), v("rounded_aspect", 1.6)
h_ = 100; w_ = h_ / asp[0]; r_ = ra[0] / 100 * min(w_, h_)
svg("rounded_rect", f'<rect x="{(100 - w_) / 2:.2f}" y="{(125 - h_) / 2:.2f}" width="{w_}" height="{h_:.2f}" rx="{r_:.2f}" fill="none" stroke="{INK}" stroke-width="{sw:.3f}"/>',
    f"rounded card; corner radius {ra[0]}% of its short side ({ra[1]}), aspect {asp[0]} ({asp[1]})")
ra2 = v("rect_aspect", 1.4)[0]; h2 = 80 / ra2
svg("rect", f'<rect x="10" y="{(125 - h2) / 2:.2f}" width="80" height="{h2:.2f}" fill="none" stroke="{INK}" stroke-width="{sw:.3f}"/>', f"sharp rectangle (bar); aspect {ra2}")
pa = v("pill_aspect", 3)[0]; pw = 70; ph = pw / pa
svg("pill", f'<rect x="15" y="{(125 - ph) / 2:.2f}" width="{pw}" height="{ph:.2f}" rx="{ph / 2:.2f}" fill="none" stroke="{INK}" stroke-width="{sw:.3f}"/>', f"pill; aspect {pa}")
cd = v("circle_d_pct_short", 20)[0]
svg("circle", f'<circle cx="50" cy="62.5" r="{cd / 2:.2f}" fill="none" stroke="{INK}" stroke-width="{sw:.3f}"/>', f"circle; diameter {cd}% of the frame's short side")
bc = v("blob_circularity", 0.7)[0]
# blob: a smooth closed curve whose circularity matches the median (radial wobble amplitude solved numerically)
def blob_path(target):
    best = None
    for amp in np.linspace(0, 1.6, 321):
        t = np.linspace(0, 2 * np.pi, 400, endpoint=False); r = np.exp(amp * (0.6 * np.sin(3 * t) + 0.4 * np.cos(2 * t + 0.7)))
        x, y = r * np.cos(t), r * np.sin(t); a = 0.5 * abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1)))
        p = np.sum(np.hypot(np.diff(np.r_[x, x[0]]), np.diff(np.r_[y, y[0]]))); c = 4 * np.pi * a / p ** 2
        if best is None or abs(c - target) < abs(best[0] - target): best = (c, x, y)
    _, x, y = best; k = 30 / max(np.abs(x).max(), np.abs(y).max())
    pts = [(50 + k * a, 62.5 + k * b) for a, b in zip(x[::8], y[::8])]
    return "M" + " L".join(f"{a:.2f},{b:.2f}" for a, b in pts) + " Z", best[0]
bp, bcirc = blob_path(bc)
svg("blob", f'<path d="{bp}" fill="none" stroke="{INK}" stroke-width="{sw:.3f}" stroke-linejoin="round"/>', f"blob; circularity {bcirc:.2f} matching the median {bc}")
gsp = v("grid_spacing_pct", 10)[0]; n = int(100 // gsp)
gl = "".join(f'<line x1="0" y1="{i * gsp * 1.25:.2f}" x2="100" y2="{i * gsp * 1.25:.2f}"/>' for i in range(1, int(125 // (gsp * 1.25)) + 1)) + \
     "".join(f'<line x1="{i * gsp:.2f}" y1="0" x2="{i * gsp:.2f}" y2="125"/>' for i in range(1, n + 1))
svg("grid", f'<g stroke="{INK}" stroke-width="{sw:.3f}">{gl}</g>', f"grid; spacing {gsp}% of the frame side")
gstd = props["grain_hp_std"][0]
svg("grain", f'<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feColorMatrix type="saturate" values="0"/>'
             f'<feComponentTransfer><feFuncA type="linear" slope="{min(1, gstd / 255 * 6):.3f}"/></feComponentTransfer></filter>'
             f'<rect width="100" height="125" fill="#f6f6f5"/><rect width="100" height="125" filter="url(#g)"/>',
    f"grain overlay; median high-pass std {gstd} grey levels (alpha scaled from it: judgment call); frequency judgment call")
for c in CLASSES:
    if c not in vocab and (SVG / f"{c}.svg").exists(): (SVG / f"{c}.svg").unlink()

# ---- plates
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, Polygon
plt.rcParams.update({"font.family": "Arial", "font.size": 10})
fig, ax = plt.subplots(figsize=(10, 5.6), dpi=150)
ys = np.arange(len(rank))
b_ = [tot[c]["images_board"] for c in rank]; i_ = [tot[c]["images_instagram"] for c in rank]
ax.barh(ys, b_, color="#211b15", label=f"board images (of {cat['board_images']})")
ax.barh(ys, i_, left=b_, color="#9c968f", label=f"Instagram images (of {cat['instagram_images']})")
for y, c in zip(ys, rank):
    f = tot[c]["favourite_images"]
    ax.text(tot[c]["images"] + 0.8, y, f"{tot[c]['images']} img · {tot[c]['instances']} shapes" + (f" · fav {f}" if f else "") + ("  ← vocabulary" if c in vocab else ""), va="center", fontsize=9)
ax.set_yticks(ys, rank); ax.invert_yaxis(); ax.set_xlabel("images showing the shape")
ax.set_title("SHAPES ON THE BOARD AND THE FEED — images showing each class (fav = Naim's 4 favourites)", loc="left", fontsize=11, fontweight="bold")
ax.spines[["top", "right"]].set_visible(False); ax.legend(frameon=False, loc="lower right"); ax.set_xlim(0, max(t["images"] for t in tot.values()) * 1.45)
fig.tight_layout(); fig.savefig(FIG / "shapes_counts.png"); plt.close(fig)

cols = 5; rows = math.ceil(len(vocab) / cols)
fig, axs = plt.subplots(rows, cols, figsize=(2.4 * cols, 4.4 * rows), dpi=150); axs = np.atleast_1d(axs).ravel()
for a in axs: a.axis("off")
for a, c in zip(axs, vocab):
    a.set_xlim(0, 100); a.set_ylim(125, 0); a.set_aspect("equal"); a.add_patch(Rectangle((0, 0), 100, 125, fill=False, ec="#d7d5d0", lw=0.6))
    k = dict(fill=False, ec=INK, lw=1.4)
    if c == "rule_h": a.plot([(100 - L) / 2, (100 + L) / 2], [62.5, 62.5], color=INK, lw=1.4)
    elif c == "rule_v": a.plot([50, 50], [(125 - 1.25 * Lv) / 2, (125 + 1.25 * Lv) / 2], color=INK, lw=1.4)
    elif c == "frame": a.add_patch(Rectangle((ins[0], ins[0]), 100 - 2 * ins[0], 125 - 2 * ins[0], **k))
    elif c == "rounded_rect": a.add_patch(FancyBboxPatch(((100 - w_) / 2 + r_, (125 - h_) / 2 + r_), w_ - 2 * r_, h_ - 2 * r_, boxstyle=f"round,pad={r_}", **k))
    elif c == "rect": a.add_patch(Rectangle((10, (125 - h2) / 2), 80, h2, **k))
    elif c == "pill": a.add_patch(FancyBboxPatch((15 + ph / 2, (125 - ph) / 2 + ph / 2), pw - ph, 0.01, boxstyle=f"round,pad={ph / 2}", **k))
    elif c == "circle": a.add_patch(Circle((50, 62.5), cd / 2, **k))
    elif c == "blob":
        pts = [tuple(map(float, p.split(","))) for p in bp[1:-2].split(" L")]; a.add_patch(Polygon(pts, closed=True, **k))
    elif c == "grid":
        for i in range(1, int(125 // (gsp * 1.25)) + 1): a.plot([0, 100], [i * gsp * 1.25] * 2, color=INK, lw=0.6)
        for i in range(1, n + 1): a.plot([i * gsp] * 2, [0, 125], color=INK, lw=0.6)
    elif c == "grain":
        rng = np.random.default_rng(7); a.imshow(rng.normal(0, gstd, (125, 100)), cmap="gray", extent=(0, 100, 125, 0), alpha=0.6)
    t = tot[c]; a.set_title(f"{c}\n{t['images']} images · fav {t['favourite_images']} · score {t['score']}", fontsize=9, loc="left")
    import textwrap; a.text(0, 133, textwrap.fill(svgs.get(c, ""), 38), fontsize=6.5, va="top")
fig.subplots_adjust(hspace=0.9); fig.suptitle(f"SHAPE VOCABULARY — {len(vocab)} shapes, proportions from the catalogue medians", x=0.01, ha="left", fontsize=11, fontweight="bold")
fig.tight_layout(rect=(0, 0.03, 1, 0.95), h_pad=4); fig.savefig(FIG / "shapes_vocabulary.png"); plt.close(fig)

# ---- CATALOGUE.md
md = ["# Shape catalogue", "", f"{n_img} images: {cat['board_images']} board, {cat['instagram_images']} Instagram (`catalogue.json`, `scripts/shapes.py`). Sizes are % of the frame after scaling the short side to 720 px.", "",
      "| Class | Images | Board | Instagram | Favourites | Shapes | Score | Vocabulary |", "|---|---|---|---|---|---|---|---|"]
for c in rank:
    t = tot[c]; md.append(f"| {c} | {t['images']} | {t['images_board']} | {t['images_instagram']} | {t['favourite_images']} | {t['instances']} | {t['score']} | {'yes' if c in vocab else ''} |")
md += ["", f"Rule: {cat['vocabulary_rule']}.", "", "## Measured proportions (median, n)", "", "| Measure | Median | n |", "|---|---|---|"]
for k, (m, nn) in props.items(): md.append(f"| {k} | {m if m is not None else '—'} | {nn} |")
md += ["", "## Vocabulary SVGs (`kit/shapes/`)", ""] + [f"- `{c}.svg` — {svgs[c]}" for c in vocab if c in svgs]
md += ["", "## Limits", "", "- Contours on photographs catch edges of bodies and products; presence counts (images showing a class) are used for the vocabulary rather than raw instance counts for that reason.",
       "- Board images include phone mockups: their screen edges count as rounded rectangles, which is part of how the board presents work.",
       "- The grain threshold (2.5 grey levels of high-pass std in flat areas) and the blob/circle cut-offs are judgment calls, stated in the script header."]
(OUT / "CATALOGUE.md").write_text("\n".join(md) + "\n", encoding="utf-8")
print("vocab", vocab); print(json.dumps({c: tot[c] for c in rank})); print(json.dumps(props))
