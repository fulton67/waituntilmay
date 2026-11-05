"""FIX Phase 3b (pixels): exact type and layout metrics from every board image and Instagram thumbnail.
Per text region (OCR box from fonts/crops.json, refined by connected components on an Otsu-binarised crop):
cap height, x-height, baseline y, glyph gap (letter-spacing) / cap height, word gap, tracking as % of em (em ~ cap/0.7),
block width and left edge, distance to nearest edge; leading from vertically stacked regions of similar size;
alignment per stack. Per image: subject box (YuNet face, else gradient mass outside text) on a thirds grid, text margins,
text/image area ratio, dominant line angles (Hough).
-> metrics/pixels.json, metrics/PIXELS.md, fig/metrics_type.png, fig/metrics_layout.png. Run with brand-venv python -I."""
import json, pathlib, statistics as st
from collections import defaultdict, Counter
import numpy as np, cv2
from PIL import Image, ImageSequence, ImageDraw, ImageFont

B = pathlib.Path(__file__).resolve().parents[1]
M = B / "metrics"; M.mkdir(exist_ok=True)
crops = json.load(open(B / "fonts" / "crops.json", encoding="utf-8"))
blocks = {str(b["id"]): b for b in json.load(open(B / "board" / "blocks.json", encoding="utf-8"))}
FAV = {"7529470", "14664481", "41911984", "2145281"}
YUNET = str(pathlib.Path.home() / "tools" / "models" / "face_detection_yunet_2023mar.onnx")  # opencv YuNet (HF mirror); OpenCV 5 has no Haar cascades

def load(src, iid):
    p = B / "board" / blocks[iid]["file"] if src == "board" else B / "existing" / "thumbs" / f"{iid}.jpg"
    im = Image.open(p)
    if getattr(im, "is_animated", False):
        im = next(ImageSequence.Iterator(im))
    return np.asarray(im.convert("RGB"))

def glyphs(gray):
    """connected components of the text polarity in a crop; returns boxes (x, y, w, h)"""
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    if (bw > 0).mean() > 0.5:  # text is the minority polarity
        bw = 255 - bw
    n, lab, stats, _ = cv2.connectedComponentsWithStats(bw, 8)
    H, W = gray.shape
    out = []
    for i in range(1, n):
        x, y, w, h, a = stats[i]
        if a < 6 or h < 0.2 * H or h > 0.98 * H or w > 0.6 * W:
            continue
        out.append((int(x), int(y), int(w), int(h)))
    return sorted(out)

def region_metrics(rgb, box, vertical):
    X0, Y0, X1, Y1 = box
    c = rgb[Y0:Y1, X0:X1]
    if vertical:
        c = np.rot90(c, 3)
    g = cv2.cvtColor(np.ascontiguousarray(c), cv2.COLOR_RGB2GRAY)
    gl = glyphs(g)
    if len(gl) < 2:
        return None
    hs = np.array([h for _, _, _, h in gl]); bots = np.array([y + h for _, y, _, h in gl])
    cap = float(np.percentile(hs, 85))
    small = hs[hs < 0.8 * cap]
    xh = float(np.median(small)) if len(small) >= 2 else None
    base = float(np.median(bots))
    gaps = [gl[i + 1][0] - (gl[i][0] + gl[i][2]) for i in range(len(gl) - 1)]
    gaps = [x for x in gaps if x > -0.2 * cap]
    if not gaps:
        return None
    med = float(np.median(gaps))
    letter = [x for x in gaps if x <= max(2 * med, 0.25 * cap)]
    word = [x for x in gaps if x > max(2 * med, 0.25 * cap)]
    em = cap / 0.7
    return {"cap_px": round(cap, 1), "x_px": round(xh, 1) if xh else None, "x_over_cap": round(xh / cap, 3) if xh else None,
            "baseline_y": round(Y0 + base, 1) if not vertical else None, "glyphs": len(gl),
            "letter_gap_over_cap": round(float(np.mean(letter)) / cap, 3) if letter else None,
            "word_gap_over_cap": round(float(np.median(word)) / cap, 3) if word else None,
            "tracking_pct_em": round(100 * float(np.median(letter)) / em, 1) if letter else None,
            "caps_only": bool(xh is None or (len(small) / len(hs) < 0.25))}

rows, images = [], {}
by_img = defaultdict(list)
for c in crops:
    by_img[(c["source"], str(c["block"]))].append(c)
for (src, iid), cs in by_img.items():
    rgb = load(src, iid); H, W = rgb.shape[:2]
    regs = []
    for c in cs:
        m = region_metrics(rgb, c["box"], c["vertical"])
        if not m:
            continue
        X0, Y0, X1, Y1 = c["box"]
        # crops.json boxes carry 10% padding per side (clipped at the canvas); undo it for layout numbers
        pw, ph = (X1 - X0) / 12, (Y1 - Y0) / 12
        X0, X1 = (X0 + pw if X0 > 0 else X0), (X1 - pw if X1 < W else X1)
        Y0, Y1 = (Y0 + ph if Y0 > 0 else Y0), (Y1 - ph if Y1 < H else Y1)
        r = {"source": src, "image": iid, "crop": c["crop"], "text": c["text"], "favourite": iid in FAV, **m,
             "cap_pct_h": round(100 * m["cap_px"] / H, 2), "block_w_pct": round(100 * (X1 - X0) / W, 1), "left_pct": round(100 * X0 / W, 1),
             "right_pct": round(100 * (W - X1) / W, 1), "top_pct": round(100 * Y0 / H, 1), "edge_pct": round(100 * min(X0 / W, (W - X1) / W, Y0 / H, (H - Y1) / H), 1),
             "box": c["box"], "vertical": c["vertical"]}
        regs.append(r)
    # roles inside the image: biggest cap height = headline, all-caps small = label, else caption
    if regs:
        top = max(r["cap_px"] for r in regs)
        for r in regs:
            r["role"] = "headline" if r["cap_px"] >= 0.7 * top and r["cap_pct_h"] >= 2.5 else "label" if r["caps_only"] else "caption"
    # leading + alignment: stacks of regions with similar cap height and overlapping x
    regs.sort(key=lambda r: r["box"][1])
    for a, b in zip(regs, regs[1:]):
        if a["vertical"] or b["vertical"] or a["baseline_y"] is None or b["baseline_y"] is None:
            continue
        if abs(a["cap_px"] - b["cap_px"]) / a["cap_px"] < 0.2 and min(a["box"][2], b["box"][2]) > max(a["box"][0], b["box"][0]):
            d = b["baseline_y"] - a["baseline_y"]
            em = a["cap_px"] / 0.7
            if 0.6 * em < d < 2.5 * em:
                b["leading_em"] = round(d / em, 3)
                dl, dc, dr = abs(a["box"][0] - b["box"][0]), abs((a["box"][0] + a["box"][2]) - (b["box"][0] + b["box"][2])) / 2, abs(a["box"][2] - b["box"][2])
                b["align"] = ["left", "centre", "right"][int(np.argmin([dl, dc, dr]))]
    # image-level
    g = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    s = 600 / max(H, W); gs = cv2.resize(g, None, fx=s, fy=s) if s < 1 else g; s = min(s, 1)
    det = cv2.FaceDetectorYN.create(YUNET, "", (gs.shape[1], gs.shape[0]), 0.7)
    _, faces = det.detect(cv2.cvtColor(gs, cv2.COLOR_GRAY2BGR))
    faces = [] if faces is None else [f[:4] for f in faces if f[2] * f[3] > (0.04 * min(gs.shape)) ** 2]
    if len(faces):
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3]); subj = [x / s, y / s, (x + w) / s, (y + h) / s]; how = "face"
    else:
        mag = cv2.magnitude(cv2.Sobel(gs, cv2.CV_32F, 1, 0), cv2.Sobel(gs, cv2.CV_32F, 0, 1))
        for r in regs:
            X0, Y0, X1, Y1 = [int(v * s) for v in r["box"]]; mag[Y0:Y1, X0:X1] = 0
        ys, xs = np.where(mag > np.percentile(mag, 90))
        subj = [np.percentile(xs, 10) / s, np.percentile(ys, 10) / s, np.percentile(xs, 90) / s, np.percentile(ys, 90) / s] if len(xs) else None; how = "gradient mass"
    cell = None
    if subj:
        cx, cy = (subj[0] + subj[2]) / 2 / W, (subj[1] + subj[3]) / 2 / H
        cell = ["top", "middle", "bottom"][min(2, int(cy * 3))] + "-" + ["left", "centre", "right"][min(2, int(cx * 3))]
    edges = cv2.Canny(gs, 80, 200)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, 80, minLineLength=int(0.15 * min(gs.shape)), maxLineGap=6)
    ang = Counter()
    if lines is not None:
        for x1, y1, x2, y2 in np.asarray(lines).reshape(-1, 4):
            a = int(round(np.degrees(np.arctan2(y2 - y1, x2 - x1)) / 15) * 15) % 180
            ang[a] += float(np.hypot(x2 - x1, y2 - y1))
    ta = sum((r["box"][2] - r["box"][0]) * (r["box"][3] - r["box"][1]) for r in regs)
    images[f"{src}:{iid}"] = {"source": src, "image": iid, "w": W, "h": H, "aspect": round(W / H, 3), "favourite": iid in FAV,
        "subject_box": [round(float(v)) for v in subj] if subj else None, "subject_by": how, "subject_thirds_cell": cell,
        "text_area_pct": round(100 * ta / (W * H), 2), "text_margin_left_pct": min((r["left_pct"] for r in regs), default=None),
        "text_margin_top_pct": min((r["top_pct"] for r in regs), default=None), "text_edge_min_pct": min((r["edge_pct"] for r in regs), default=None),
        "line_angles": [a for a, _ in ang.most_common(3)]}
    rows += regs

json.dump({"regions": rows, "images": images}, open(M / "pixels.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)

def stat(vals):
    v = [x for x in vals if x is not None]
    if not v:
        return "—"
    q1, q3 = np.percentile(v, [25, 75])
    return f"{st.median(v):.3g} [{q1:.3g}–{q3:.3g}] n={len(v)}"
KEYS = [("cap_pct_h", "cap height, % of canvas height"), ("x_over_cap", "x-height / cap height"), ("tracking_pct_em", "tracking, % of em"),
        ("letter_gap_over_cap", "glyph gap / cap"), ("word_gap_over_cap", "word gap / cap"), ("leading_em", "leading, em"),
        ("block_w_pct", "block width, % of canvas width"), ("left_pct", "left edge, % of width"), ("edge_pct", "distance to nearest edge, %")]
L = ["# Pixel metrics", "", f"{len(rows)} text regions from {len(images)} images (`pixels.json`). Medians with interquartile range and n. "
     "em is estimated as cap height / 0.7. Leading counts only vertically stacked regions of similar cap height (±20%) that overlap in x.", ""]
def table(title, sel):
    out = [f"## {title}", "", "| Metric | " + " | ".join(n for n, _ in sel) + " |", "|---|" + "---|" * len(sel)]
    for k, lab in KEYS:
        out.append(f"| {lab} | " + " | ".join(stat([r.get(k) for r in rs]) for _, rs in sel) + " |")
    return out + [""]
L += table("By role (all sources)", [(role, [r for r in rows if r["role"] == role]) for role in ("headline", "caption", "label")])
L += table("By source", [(s_, [r for r in rows if r["source"] == s_]) for s_ in ("board", "instagram")])
L += table("Headlines by source", [(s_, [r for r in rows if r["source"] == s_ and r["role"] == "headline"]) for s_ in ("board", "instagram")])
L += table("Naim's four favourites", [(f, [r for r in rows if r["image"] == f]) for f in ("7529470", "14664481", "41911984", "2145281")])
L += ["## Layout per image", "", "| Metric | board | instagram |", "|---|---|---|"]
for k, lab in (("text_area_pct", "text area, % of canvas"), ("text_margin_left_pct", "leftmost text, % of width"), ("text_margin_top_pct", "topmost text, % of height"), ("text_edge_min_pct", "text nearest an edge, %")):
    L.append(f"| {lab} | " + " | ".join(stat([i[k] for i in images.values() if i["source"] == s_]) for s_ in ("board", "instagram")) + " |")
for s_ in ("board", "instagram"):
    cells = Counter(i["subject_thirds_cell"] for i in images.values() if i["source"] == s_ and i["subject_thirds_cell"])
    angs = Counter(a for i in images.values() if i["source"] == s_ for a in i["line_angles"][:1])
    al = Counter(r.get("align") for r in rows if r["source"] == s_ and r.get("align"))
    L += ["", f"**{s_}:** subject centre on the thirds grid {dict(cells.most_common())}. Dominant line angle {dict(angs.most_common(4))}. Stack alignment {dict(al)}."]
(M / "PIXELS.md").write_text("\n".join(L) + "\n", encoding="utf-8")

# plates: one per table
MONO = ImageFont.truetype(str(B / "fonts" / "files" / "IBMPlexMono-Regular.ttf"), 15)
def plate(name, title, groups, key, lab, lo, hi):
    im = Image.new("RGB", (1400, 140 + 70 * len(groups)), "#f5f2eb"); d = ImageDraw.Draw(im)
    d.text((40, 30), f"{title}  //  {lab}  //  box = IQR, tick = median", font=MONO, fill="#152235")
    X = lambda v: 300 + (v - lo) / (hi - lo) * 1040
    for i, (gname, rs) in enumerate(groups):
        v = [r.get(key) for r in rs if r.get(key) is not None]; y = 90 + i * 70
        d.text((40, y + 8), f"{gname} (n={len(v)})", font=MONO, fill="#152235")
        if not v:
            continue
        q1, md, q3 = np.percentile(v, [25, 50, 75])
        for x in v:
            d.ellipse([X(min(max(x, lo), hi)) - 2, y + 28, X(min(max(x, lo), hi)) + 2, y + 32], fill="#9fb3a1")
        d.rectangle([X(q1), y + 4, X(q3), y + 24], outline="#152235"); d.line([X(md), y, X(md), y + 28], fill="#152235", width=3)
        d.text((X(q3) + 8, y + 6), f"{md:.3g}", font=MONO, fill="#152235")
    for t in np.linspace(lo, hi, 6):
        d.text((X(t) - 10, 100 + 70 * len(groups) - 20), f"{t:.2g}", font=MONO, fill="#152235")
    im.save(B / "fig" / name)
roles = [(r_, [x for x in rows if x["role"] == r_]) for r_ in ("headline", "caption", "label")]
srcs = [(s_, [x for x in rows if x["source"] == s_]) for s_ in ("board", "instagram")]
favs = [(f, [x for x in rows if x["image"] == f]) for f in ("7529470", "14664481", "41911984", "2145281")]
plate("metrics_cap_by_role.png", "CAP HEIGHT BY ROLE", roles, "cap_pct_h", "% of canvas height", 0, 12)
plate("metrics_tracking_by_source.png", "TRACKING BY SOURCE", srcs + roles, "tracking_pct_em", "% of em", -5, 40)
plate("metrics_leading.png", "LEADING", srcs + roles, "leading_em", "em", 0.6, 2.0)
plate("metrics_favourites.png", "NAIM'S FAVOURITES, CAP HEIGHT", favs, "cap_pct_h", "% of canvas height", 0, 12)
plate("metrics_margins.png", "TEXT LEFT EDGE", srcs, "left_pct", "% of width", 0, 60)
print(len(rows), "regions", len(images), "images")
print((M / "PIXELS.md").read_text(encoding="utf-8")[:3500])
