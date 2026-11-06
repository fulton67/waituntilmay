"""BUILDER Phase A: measure the board's visual devices from their pixels -> look/measure.json, look/crops/*.png, look/fit/*.png.
Exemplar boxes (original-pixel coordinates) were read off gridded views of each board image: they are the judgment part
(where the device is); every parameter inside a box is measured here. Run with brand-venv python -I."""
import json, pathlib, sys, glob
import numpy as np, cv2
sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from look_lib import *  # img, lab, hexc, crop, edge_1d, refine_rect, corner_radius, glass

M = {"method": __doc__.strip(), "devices": {}}

def kasa(pts):
    x, y = pts[:, 0].astype(float), pts[:, 1].astype(float); A = np.c_[2 * x, 2 * y, np.ones_like(x)]; bb = x * x + y * y
    cx, cy, c = np.linalg.lstsq(A, bb, rcond=None)[0]; return cx, cy, float(np.sqrt(c + cx * cx + cy * cy))

def inner_radius(bid, est, name, S=60):
    """photo inside a card: pixels classed photo vs card by Lab distance to each side's median (sampled 6-24 px either side of
    the left edge), then a circle fitted (Kasa) to the mask boundary points of the corner arc, iterated 5 times."""
    a = img(bid); A = lab(a); x0, y0 = est
    cd = np.median(A[y0 + 60:y0 + 160, x0 - 24:x0 - 8].reshape(-1, 3), 0); ph = np.median(A[y0 + 60:y0 + 160, x0 + 6:x0 + 20].reshape(-1, 3), 0)
    W = A[y0 - 12:y0 + S, x0 - 12:x0 + S]; m = (np.linalg.norm(W - ph, axis=2) < np.linalg.norm(W - cd, axis=2)).astype(np.uint8)
    cnt = max(cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea)[:, 0, :]
    left = int(np.median([np.argmax(m[y]) for y in range(S - 10, S + 10)])); top = int(np.median([np.argmax(m[:, x]) for x in range(S - 10, S + 10)]))
    r = 20.0
    for _ in range(5):
        sel = cnt[(cnt[:, 0] < left + r * 0.9) & (cnt[:, 1] < top + r * 0.9) & (cnt[:, 0] > left) & (cnt[:, 1] > top)]
        if len(sel) < 6: break
        cx, cy, r = kasa(sel)
    return {"block": bid, "corner_px": [x0 - 12 + left, y0 - 12 + top], "radius_px": round(r, 1), "n_arc_points": int(len(sel)), "method": "colour mask, circle fit on the corner arc"}

M["devices"]["glass_panel"] = {"exemplars": [
    glass(41911984, (576, 230, 1120, 1408), "glass_panel_41911984", content_free=(260, 500)),
    glass(41432513, (307, 297, 831, 1825), "glass_panel_41432513", content_free=(1300, 1650))]}
g0, g1 = M["devices"]["glass_panel"]["exemplars"]
M["devices"]["photo_card"] = {"exemplars": [inner_radius(41911984, (610, 516), "photo_card_41911984"), inner_radius(41432513, (342, 333), "photo_card_41432513")]}
for e, g in zip(M["devices"]["photo_card"]["exemplars"], (g0, g1)):
    e["radius_pct_parent_w"] = round(100 * e["radius_px"] / g["card_w_px"], 2); e["inset_px"] = e["corner_px"][0] - g["box_px"][0]; e["inset_pct_parent_w"] = round(100 * e["inset_px"] / g["card_w_px"], 2)
    e["radius_ratio_to_parent"] = round(e["radius_px"] / g["radius_px"], 3); e["radius_pct_own_w"] = None
crop(41911984, (610, 516, 1090, 1120), "photo_card_41911984")

# ---------- frosted band (2145281): a full-height glass strip, no radius ----------
def band(bid, x_est, name):
    a = img(bid); Lc = lab(a)[..., 0]; S = cv2.GaussianBlur(Lc, (0, 0), 2); H, W = Lc.shape
    ys = np.linspace(H * 0.1, H * 0.9, 40).astype(int)
    xe = int(np.median([edge_1d(S[y], x_est, 30) for y in ys]))
    mask = np.zeros((H, W), np.float32); mask[:, xe:] = 1; af = a.astype(np.float32); yy = np.arange(0, H, 2); fit = []
    for sgm in [1, 2, 4, 6, 8, 12, 16, 24, 32, 48, 64]:
        bl = cv2.GaussianBlur(af * mask[..., None], (0, 0), sgm) / (cv2.GaussianBlur(mask, (0, 0), sgm)[..., None] + 1e-6)
        ins, outs = af[yy, xe - 10], bl[yy, xe + 4]; fit.append((sgm, float(np.corrcoef(outs.mean(1), ins.mean(1))[0, 1] ** 2), ins, outs))
    s_best, r2b, ins, outs = max(fit, key=lambda t: t[1]); al = []
    for ch in range(3):
        k, c = np.polyfit(outs[:, ch], ins[:, ch], 1); al.append(float(np.clip(1 - k, 0.01, 0.99)))
    alp = float(np.median(al)); T = np.array([np.median(ins[:, ch] - (1 - alp) * outs[:, ch]) / alp for ch in range(3)])
    crop(bid, (0, 0, min(W, xe + 260), H), name)
    return {"block": bid, "edge_x_px": xe, "band_w_pct_w": round(100 * xe / W, 2), "tint_alpha": round(alp, 3), "tint_hex": hexc(np.clip(T, 0, 255)), "backdrop_blur_sigma_px": float(s_best), "blur_r2_by_sigma": {str(t[0]): round(t[1], 3) for t in fit}, "radius_px": 0}
M["devices"]["glass_band"] = {"exemplars": [band(2145281, 470, "glass_band_2145281")]}

# ---------- pills: bbox, height, radius/height, fill, text ----------
def pill(bid, box, name, outlined=False, thr=3.5):
    a = img(bid); x0, y0, x1, y1 = box; c = a[y0:y1, x0:x1]
    if name: cv2.imwrite(str(L / "crops" / f"{name}.png"), c)
    A = lab(c); Lc = A[..., 0]; bg = np.median(np.concatenate([Lc[0], Lc[-1], Lc[:, 0], Lc[:, -1]]))
    mask = (np.abs(cv2.GaussianBlur(Lc, (0, 0), 1) - bg) > thr).astype(np.uint8)
    n, lab_, st, _ = cv2.connectedComponentsWithStats(mask, 8)
    i = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])); px, py, pw, ph, area = st[i]
    shape = (lab_ == i)
    if outlined:  # stroke width = median run across the left edge at mid-height band
        # stroke = FWHM of the raw lightness profile across the left edge (median over the middle third of the height);
        # the smoothed mask used for the bbox widens a hairline, so it is not used for the width
        prof = np.median(Lc[py + ph // 3:py + 2 * ph // 3, max(0, px - 4):px + ph // 3], axis=0); pk = prof.max(); hm = bg + (pk - bg) / 2
        stroke = float(np.sum(prof > hm))
        fill = None
    else:
        stroke = None; fill = hexc(np.median(c[shape & (np.abs(Lc - np.median(Lc[shape])) < 6)], axis=0))
    # corner: fraction of the bounding box's corner squares not covered -> r = sqrt(missing / (4 (1 - pi/4)))
    filled = shape.copy()
    if True:
        filled = np.zeros_like(shape); cnts, _ = cv2.findContours(shape.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(filled.view(np.uint8), cnts, -1, 1, -1); filled = filled.astype(bool)
    missing = pw * ph - filled[py:py + ph, px:px + pw].sum(); r = float(np.sqrt(max(missing, 0) / (4 * (1 - np.pi / 4))))
    # text inside: pixels far from the fill, inside the pill
    inner = filled[py:py + ph, px:px + pw] & ~shape[py:py + ph, px:px + pw] if outlined else None
    sub = Lc[py:py + ph, px:px + pw]; ref = float(np.percentile(sub[filled[py:py + ph, px:px + pw]], 75 if bg < 50 else 50)) if not outlined else bg
    ek = max(7, int(ph * 0.16) | 1); core_m = cv2.erode(filled[py:py + ph, px:px + pw].astype(np.uint8), np.ones((ek, ek), np.uint8)).astype(bool)
    tmask = (np.abs(sub - ref) > 25) & core_m
    if outlined: tmask &= ~shape[py:py + ph, px:px + pw]
    tmask[:, :max(2, int(stroke or 0) + 2)] = False; tmask[:, -max(2, int(stroke or 0) + 2):] = False
    ty, tx = np.nonzero(tmask)
    mid = tmask.copy(); mid[:, :int(pw * 0.2)] = False; mid[:, int(pw * 0.8):] = False  # text height from the middle 60% only
    tyc = np.nonzero(mid)[0]
    if len(tyc): ty = tyc
    t = {}
    if len(ty):
        rows = np.bincount(ty, minlength=ph); core = np.nonzero(rows > rows.max() * 0.15)[0]
        t = {"text_h_px": int(core[-1] - core[0] + 1), "text_h_pct_pill_h": round(100 * (core[-1] - core[0] + 1) / ph, 1),
             "pad_x_px": int(tx.min()), "pad_x_pct_pill_h": round(100 * tx.min() / ph, 1),
             "text_hex": hexc(np.median(c[py:py + ph, px:px + pw][tmask], axis=0))}
    return {"block": bid, "w_px": int(pw), "h_px": int(ph), "radius_px": round(r, 1), "radius_over_h": round(r / ph, 3), "fill_hex": fill,
            "stroke_px": stroke, "ground_L": round(float(bg), 1), **t}
M["devices"]["pill_chip"] = {"exemplars": [
    pill(41432513, (330, 1665, 530, 1745), "pill_chip_41432513", thr=18),
    pill(27647159, (35, 35, 310, 120), "pill_chip_27647159"),
    pill(11460382, (55, 335, 240, 460), "pill_chip_11460382_filled"),
    pill(11460382, (228, 335, 470, 460), "pill_chip_11460382_outline", outlined=True),
    pill(41911984, (935, 1150, 1075, 1205), "pill_chip_41911984_button")]}

# ---------- hairlines: leader lines, rules, outline boxes ----------
def line_profile(bid, p0, p1, half=8, name=None):
    """median perpendicular profile along a straight segment -> stroke FWHM, colour, contrast over ground"""
    a = img(bid).astype(np.float32); Lc = lab(a.astype(np.uint8))[..., 0]
    p0, p1 = np.array(p0, float), np.array(p1, float); d = (p1 - p0) / np.linalg.norm(p1 - p0); nrm = np.array([-d[1], d[0]])
    profs, cols = [], []
    for t in np.linspace(0.15, 0.85, 40):
        c = p0 + t * (p1 - p0); pts = [c + k * nrm for k in np.arange(-half, half + 0.01, 0.25)]
        prof = [cv2.getRectSubPix(Lc, (1, 1), (float(p[0]), float(p[1])))[0, 0] for p in pts]; profs.append(prof)
        cols.append(a[int(round(c[1])), int(round(c[0]))])
    P = np.median(np.array(profs), axis=0); base = float(np.median(np.concatenate([P[:8], P[-8:]]))); peak = float(P.max() if P.max() - base > base - P.min() else P.min())
    hm = base + (peak - base) / 2; above = np.nonzero((P - hm) * np.sign(peak - base) > 0)[0]
    fwhm = (above[-1] - above[0] + 1) * 0.25 if len(above) else None
    return {"block": bid, "from": [int(v) for v in p0], "to": [int(v) for v in p1], "stroke_fwhm_px": fwhm, "peak_L": round(peak, 1), "ground_L": round(base, 1),
            "colour_hex": hexc(np.median(np.array(cols), axis=0))}
W30, W12, W21 = 564, 1080, 1600
M["devices"]["leader_line"] = {"exemplars": [
    line_profile(30940781, (96, 58), (468, 58)),          # top bus bar
    line_profile(30940781, (219, 70), (219, 235)),        # vertical drop to 'double cleanse'
    line_profile(12400773, (757, 232), (757, 398)),       # vertical to BIOAVAILABLE
    line_profile(12400773, (465, 525), (683, 525))],      # horizontal to FUNCTIONAL BOTANICALS
    "canvas_w_px": {"30940781": W30, "12400773": W12}}
for e in M["devices"]["leader_line"]["exemplars"]:
    e["stroke_pct_w"] = round(100 * e["stroke_fwhm_px"] / {30940781: W30, 12400773: W12}[e["block"]], 3)
crop(30940781, (60, 30, 520, 420), "leader_line_30940781"); crop(12400773, (330, 160, 900, 900), "leader_line_12400773")

def end_dot(bid, centre, name, r_search=14):
    a = img(bid); Lc = lab(a)[..., 0]; cx, cy = centre; c = Lc[cy - r_search:cy + r_search + 1, cx - r_search:cx + r_search + 1]
    bg = np.median(np.concatenate([c[0], c[-1]])); m = (c - bg) > 20; n, lb, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8))
    i = 1 + int(np.argmax(st[1:, 4])); return {"block": bid, "dot_d_px": round(float(np.sqrt(4 * st[i, 4] / np.pi)), 1)}
M["devices"]["leader_line"]["end_dots"] = [end_dot(30940781, (96, 145), "d1"), end_dot(30940781, (219, 245), "d2"), end_dot(12400773, (757, 232), "d3")]

def outline_box(bid, box, name, W):
    a = img(bid); x0, y0, x1, y1 = box; c = a[y0:y1, x0:x1]
    if name: cv2.imwrite(str(L / "crops" / f"{name}.png"), c)
    Lc = lab(c)[..., 0]; bg = float(np.median(Lc)); m = (Lc - bg) > 18
    colsum, rowsum = m.sum(0), m.sum(1)
    xs = np.nonzero(colsum > 0.6 * m.shape[0] * 0.8)[0]; ys = np.nonzero(rowsum > 0.6 * m.shape[1] * 0.8)[0]
    ys = np.nonzero(rowsum > 0.5 * rowsum.max())[0]; xs = np.nonzero(colsum > 0.5 * colsum.max())[0]
    top_rows = ys[ys < m.shape[0] / 2]; left_cols = xs[xs < m.shape[1] / 2]
    stroke = float(np.median([len(top_rows), len(left_cols)]))
    bl, bt, br, bb = xs.min(), ys.min(), xs.max(), ys.max()
    inner = m[bt + 4:bb - 3, bl + 4:br - 3]; ty, tx = np.nonzero(inner)
    out = {"block": bid, "box_w_px": int(br - bl), "box_h_px": int(bb - bt), "stroke_px": stroke, "stroke_pct_w": round(100 * stroke / W, 3), "colour_hex": hexc(np.median(c[m], axis=0)), "ground_L": round(bg, 1)}
    if len(tx):
        out.update({"text_h_px": int(ty.max() - ty.min() + 1), "pad_x_px": int(tx.min() + 4), "pad_y_px": int(ty.min() + 4),
                    "pad_x_over_text_h": round((tx.min() + 4) / (ty.max() - ty.min() + 1), 2), "pad_y_over_text_h": round((ty.min() + 4) / (ty.max() - ty.min() + 1), 2)})
    return out
M["devices"]["outline_box"] = {"exemplars": [outline_box(30940781, (110, 655, 455, 732), "outline_box_30940781", W30)]}

# ---------- step dots (34175362) ----------
def step_dots(bid, box, name, W):
    a = img(bid); x0, y0, x1, y1 = box; c = a[y0:y1, x0:x1]
    if name: cv2.imwrite(str(L / "crops" / f"{name}.png"), c)
    g = cv2.cvtColor(c, cv2.COLOR_BGR2GRAY)
    circ = cv2.HoughCircles(cv2.GaussianBlur(g, (0, 0), 1.2), cv2.HOUGH_GRADIENT, 1, 60, param1=80, param2=18, minRadius=10, maxRadius=28)
    cs = sorted(circ[0].tolist(), key=lambda v: v[0]) if circ is not None else []
    xs = [v[0] for v in cs]; rs = [v[2] for v in cs]
    # dotted connector between circle 1 and 2: dash/gap runs along the circle row
    row = g[int(np.median([v[1] for v in cs])), int(xs[0] + rs[0] + 6):int(xs[1] - rs[1] - 6)].astype(float) if len(cs) > 1 else np.array([])
    on = row > (np.median(row) + 25); runs = np.diff(np.flatnonzero(np.diff(np.r_[0, on.astype(int), 0])))
    # ring stroke on circle 1: radial profile
    cx, cy, r = cs[0]; prof = [g[int(cy), int(cx - r - 4 + k)] for k in range(10)]; base = np.median(g[int(cy) - 3:int(cy) + 3, int(cx - r - 12):int(cx - r - 6)])
    stroke = int(np.sum(np.array(prof, float) > base + 30))
    return {"block": bid, "n": len(cs), "d_px": round(2 * float(np.median(rs)), 1), "d_pct_w": round(200 * float(np.median(rs)) / W, 2),
            "pitch_px": round(float(np.median(np.diff(xs))), 1) if len(xs) > 1 else None, "ring_stroke_px": stroke,
            "dash_runs_px": runs.tolist()[:12]}
M["devices"]["step_marks"] = {"exemplars": [step_dots(34175362, (40, 85, 1010, 165), "step_marks_34175362", 1080)]}

# ---------- phone / screen frame: big radius rounded rect ----------
M["devices"]["screen_frame"] = {"exemplars": []}
for bid, box, name in ((14664481, (112, 165, 608, 1245), "screen_frame_14664481"), (14664481, (1232, 165, 1728, 1245), "screen_frame_14664481_3")):
    a = img(bid); Lc = lab(a)[..., 0]; left, top, right, bot = refine_rect(Lc, box, win=30); r, e = corner_radius(Lc, left, top, 90, bottom=bot)
    M["devices"]["screen_frame"]["exemplars"].append({"block": bid, "box_px": [left, top, right, bot], "w_px": right - left, "aspect_w_h": round((right - left) / (bot - top), 3),
                                                       "radius_px": r, "radius_pct_w": round(100 * r / (right - left), 2), "fit_err_px": e})
    crop(bid, (left - 20, top - 20, right + 20, bot + 20), name)

# ---------- glow line (38155009) ----------
def glow(bid, x, y_est, name, W):
    a = img(bid).astype(np.float32); Lc = lab(a.astype(np.uint8))[..., 0]
    col = Lc[y_est - 40:y_est + 40, x]; pk = int(np.argmax(col)); y = y_est - 40 + pk
    prof = Lc[y - 40:y + 41, x - 3:x + 4].mean(1); base = float(np.median(np.r_[prof[:10], prof[-10:]])); peak = float(prof.max())
    def width(level): return int(np.sum(prof > base + (peak - base) * level))
    core = a[y - 1:y + 2, x - 3:x + 4].reshape(-1, 3).mean(0); halo = a[y - 8:y - 5, x - 3:x + 4].reshape(-1, 3).mean(0)
    crop(bid.__int__(), (0, max(0, y - 100), 600, y + 100), name)
    return {"block": bid, "at": [x, y], "core_w_px_90pct": width(0.9), "fwhm_px": width(0.5), "halo_w_px_10pct": width(0.1), "core_hex": hexc(core), "halo_hex": hexc(halo),
            "core_dL": round(peak - base, 1), "fwhm_pct_w": round(100 * width(0.5) / W, 2), "halo_pct_w": round(100 * width(0.1) / W, 2)}
M["devices"]["glow_line"] = {"exemplars": [glow(38155009, 150, 255, "glow_line_38155009", 600)]}

# ---------- dark slide footer (27454113): dot + meta + page count; ground colours ----------
def dark(bid, W, H):
    a = img(bid); ground = hexc(np.median(a[50:300, 1300:1420].reshape(-1, 3), axis=0)); return {"block": bid, "ground_hex": ground}
foot = img(27454113)[1600:1680, 100:1340]; cv2.imwrite(str(L / "crops" / "meta_footer_27454113.png"), foot)
gF = cv2.cvtColor(foot, cv2.COLOR_BGR2GRAY); m = gF > 128; n, lb, st, cen = cv2.connectedComponentsWithStats(m.astype(np.uint8))
dot = max(range(1, n), key=lambda i: st[i, 4] if st[i, 0] < 120 else 0)
ys = np.nonzero(m[:, 200:900].any(1))[0]
M["devices"]["meta_footer"] = {"exemplars": [{"block": 27454113, "canvas": [1440, 1800], "dot_d_px": int(st[dot, 2]), "dot_d_pct_w": round(100 * st[dot, 2] / 1440, 2),
    "text_h_px": int(ys.max() - ys.min() + 1), "text_h_pct_w": round(100 * (ys.max() - ys.min() + 1) / 1440, 2),
    "baseline_from_bottom_px": int(1800 - (1600 + ys.max())), "baseline_from_bottom_pct_h": round(100 * (1800 - (1600 + ys.max())) / 1800, 2),
    "left_x_px": int(100 + st[dot, 0]), "left_x_pct_w": round(100 * (100 + st[dot, 0]) / 1440, 2)}]}
M["devices"]["dark_card"] = {"exemplars": [dark(27454113, 1440, 1800), dark(27454118, 1440, 1795)]}

# ---------- play / ring button (13607089) ----------
a = img(13607089); g = cv2.cvtColor(a[1150:1450, 440:740], cv2.COLOR_BGR2GRAY); cv2.imwrite(str(L / "crops" / "ring_button_13607089.png"), a[1150:1450, 440:740])
circ = cv2.HoughCircles(cv2.GaussianBlur(g, (0, 0), 1.5), cv2.HOUGH_GRADIENT, 1, 200, param1=60, param2=25, minRadius=90, maxRadius=140)
cx, cy, rr = circ[0][0]; row = g[int(cy), :].astype(float); base = np.median(row[int(cx - rr + 8):int(cx - rr + 30)])
M["devices"]["ring_button"] = {"exemplars": [{"block": 13607089, "canvas_w": 750, "d_px": round(2 * float(rr), 1), "d_pct_w": round(200 * float(rr) / 750, 2),
    "stroke_px": int(np.sum(row[int(cx - rr - 6):int(cx - rr + 6)] > base + 40))}]}

# ---------- grain + treatment are measured elsewhere; cite ----------
tr = json.load(open(B / "colour" / "treatment.json", encoding="utf-8")); sh = json.load(open(B / "shapes" / "catalogue.json", encoding="utf-8"))
M["devices"]["grain"] = {"cite": "colour/treatment.json board.grain (sigma, 0..1) and shapes/catalogue.json vocabulary grain", "sigma": tr["board"]["grain"],
                         "shapes_entry": next((v for v in sh["vocabulary"] if (v.get("class") if isinstance(v, dict) else v) == "grain"), None)}
M["devices"]["image_treatment"] = {"cite": "colour/treatment.json lut (feed -> board)", "lut": tr["lut"]}
json.dump(M, open(L / "measure.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False, default=float)
print(json.dumps({k: v.get("exemplars", v) for k, v in M["devices"].items() if k not in ("image_treatment",)}, indent=1, default=float)[:9000])
