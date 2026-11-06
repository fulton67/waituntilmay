"""Shared helpers for look_measure.py and look_proof_check.py (BUILDER Phase A)."""
import pathlib, glob
import numpy as np, cv2
B = pathlib.Path(__file__).resolve().parents[1]; L = B / "look"; (L / "crops").mkdir(parents=True, exist_ok=True); (L / "fit").mkdir(exist_ok=True)

def img(bid):
    if isinstance(bid, np.ndarray): return bid
    f = bid if isinstance(bid, str) else glob.glob(str(B / "board" / "img" / f"{bid}_*"))[0]
    a = cv2.imread(f, cv2.IMREAD_COLOR)
    return a
def lab(a): return cv2.cvtColor(a.astype(np.float32) / 255, cv2.COLOR_BGR2Lab)
def hexc(bgr): b, g, r = [int(round(float(v))) for v in bgr]; return f"#{r:02x}{g:02x}{b:02x}"
def crop(bid, box, name):
    a = img(bid); x0, y0, x1, y1 = box; c = a[y0:y1, x0:x1]
    if name: cv2.imwrite(str(L / "crops" / f"{name}.png"), c)
    return c

# ---------- edge refinement + corner arc fit on a smoothed lightness image ----------
def edge_1d(prof, est, win):
    g = np.abs(np.gradient(prof)); lo, hi = max(1, est - win), min(len(prof) - 1, est + win)
    return lo + int(np.argmax(g[lo:hi]))

def refine_rect(Lc, box, win=25):
    x0, y0, x1, y1 = box; S = cv2.GaussianBlur(Lc, (0, 0), 2)
    ys = np.linspace(y0 + (y1 - y0) * 0.35, y0 + (y1 - y0) * 0.65, 15).astype(int)
    xs = np.linspace(x0 + (x1 - x0) * 0.3, x0 + (x1 - x0) * 0.7, 15).astype(int)
    left = int(np.median([edge_1d(S[y], x0, win) for y in ys])); right = int(np.median([edge_1d(S[y], x1, win) for y in ys]))
    top = int(np.median([edge_1d(S[:, x], y0, win) for x in xs])); bot = int(np.median([edge_1d(S[:, x], y1, win) for x in xs]))
    return left, top, right, bot

def corner_radius(Lc, left, top, rmax, bottom=None):
    """top-left corner (or bottom-left when bottom is given): for each row dy in from the horizontal edge, the first strong
    vertical edge from the outside; fit x_off(dy) = r - sqrt(r^2 - (r - dy)^2). Edge strength threshold = 40% of the
    straight-edge strength measured further along the side."""
    S = cv2.GaussianBlur(Lc, (0, 0), 1.5); gx = np.abs(cv2.Sobel(S, cv2.CV_32F, 1, 0, ksize=3))
    rowat = (lambda dy: top + dy) if bottom is None else (lambda dy: bottom - dy)
    ref = np.median([gx[rowat(rmax + k), left - 3:left + 4].max() for k in range(5, 40, 3)]); thr = 0.4 * ref
    # two edge pickers (first strong edge from outside; strongest edge in the window); keep the fit with the lower error
    results = []
    for pick in ("first", "max"):
        dys, offs = [], []
        for dy in range(2, rmax):
            row = gx[rowat(dy), left - 4:left + rmax]; hit = np.flatnonzero(row > thr)
            if pick == "max": dys.append(dy); offs.append(int(np.argmax(row)) - 4)
            elif len(hit): dys.append(dy); offs.append(int(hit[0]) - 4)
        dys, offs = np.array(dys), np.array(offs); best, err = None, 1e9
        for r in range(6, rmax):
            pred = np.where(dys < r, r - np.sqrt(np.maximum(r * r - (r - dys) ** 2, 0)), 0)
            e = np.median(np.abs(pred - offs))
            if e < err: best, err = r, e
        results.append((err, best))
    err, best = min(results)
    return best, round(float(err), 2)

def glass(bid, box, name, margin_in=12, margin_out=14, rmax=90, content_free=None):
    a = img(bid); A = lab(a); Lc = A[..., 0]
    left, top, right, bot = refine_rect(Lc, box)
    r, rerr = corner_radius(Lc, left, top, rmax)
    w = right - left
    # alpha, tint, blur jointly: in = a*T + (1-a)*blur_sigma(backdrop). The backdrop is known only outside the card, so it is
    # blurred by normalized convolution over outside pixels (card masked out); sigma is the one whose blurred backdrop best
    # predicts the inside margin (max R^2), then alpha = 1 - slope and T = intercept / alpha.
    ys = np.arange(top + r + 10, bot - r - 10, 3) if content_free is None else np.arange(*content_free, 3)
    H, W = Lc.shape; mask = np.ones((H, W), np.float32); mask[top:bot, left:right] = 0
    af = a.astype(np.float32); fit = []
    for sgm in [1, 2, 4, 6, 8, 12, 16, 24, 32, 48, 64]:
        num = cv2.GaussianBlur(af * mask[..., None], (0, 0), sgm); den = cv2.GaussianBlur(mask, (0, 0), sgm)[..., None] + 1e-6; bl = num / den
        ins, outs = [], []
        for y in ys:
            for xe, sgn in ((left, 1), (right, -1)):
                ins.append(af[y, xe + sgn * margin_in]); outs.append(bl[y, xe - sgn * 4])
        ins, outs = np.array(ins), np.array(outs)
        X = outs.mean(1); Y = ins.mean(1); r2 = float(np.corrcoef(X, Y)[0, 1] ** 2) if X.std() > 0 else 0
        fit.append((sgm, r2, ins, outs))
    sig_best, r2_best, ins, outs = max(fit, key=lambda t: t[1])
    alpha = []
    for ch in range(3):
        k, c = np.polyfit(outs[:, ch], ins[:, ch], 1); alpha.append(float(np.clip(1 - k, 0.01, 0.99)))
    al = float(np.median(alpha)); T = np.array([(np.median(ins[:, ch] - (1 - al) * outs[:, ch])) / al for ch in range(3)])
    r2_curve = {str(t[0]): round(t[1], 3) for t in fit}
    # rim + shadow: lightness profile across the left edge, -40..+40 px, averaged over the content-free rows
    prof = np.median(np.array([Lc[y, left - 40:left + 41] for y in ys]), axis=0)
    inside_plateau = float(np.median(prof[52:72])); outside_plateau = float(np.median(prof[0:20]))
    rim = float(prof[38:46].max() - inside_plateau)
    shadow = float(outside_plateau - np.median(prof[30:38]))
    # vertical highlight: inside-minus-predicted lightness down the full left margin (top, middle, bottom thirds)
    yy = np.arange(top + r + 4, bot - r - 4, 4); num = cv2.GaussianBlur(af * mask[..., None], (0, 0), sig_best); den = cv2.GaussianBlur(mask, (0, 0), sig_best)[..., None] + 1e-6
    blf = num / den; pred = al * T + (1 - al) * blf[yy, left - 4]; resid = (af[yy, left + margin_in] - pred).mean(1)
    a_third = [round(float(np.median(t)), 2) for t in np.array_split(resid, 3)]
    out = {"block": bid, "box_px": [left, top, right, bot], "card_w_px": w, "radius_px": r, "radius_pct_w": round(100 * r / w, 2), "radius_fit_err_px": rerr,
           "tint_alpha": round(al, 3), "tint_alpha_per_channel_rgb": [round(v, 3) for v in alpha[::-1]], "tint_hex": hexc(np.clip(T, 0, 255)),
           "backdrop_blur_sigma_px": sig_best, "backdrop_blur_sigma_pct_w": round(100 * sig_best / w, 2), "blur_r2_by_sigma": r2_curve,
           "rim_dL": round(rim, 2), "edge_shadow_dL": round(shadow, 2), "highlight_residual_rgb_top_mid_bottom": a_third, "n_pairs": len(ins)}
    if name:
        pad = 40; c = a[max(0, top - pad):bot + pad, max(0, left - pad):right + pad].copy(); cv2.imwrite(str(L / "crops" / f"{name}.png"), c)
        f = c.copy(); cv2.rectangle(f, (pad, pad), (pad + w, pad + bot - top), (255, 0, 255), 1)
        cv2.circle(f, (pad + r, pad + r), r, (0, 255, 255), 1); cv2.imwrite(str(L / "fit" / f"{name}.png"), f)
    return out

