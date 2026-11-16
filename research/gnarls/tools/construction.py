"""G10: construction table of the official primary mark (style guide 2021 p.1, vector, rendered at 400 dpi by pdftoppm).
Segments the figure by the as-drawn colours and measures every part as a ratio of the figure's total height (tusk tip to tail
bottom, outline included), so the numbers transfer to any scale and to a 3D model's proportions.

Parts (masks by colour, then by position):
  outline  = near-black (L* < 12) inside the figure      tee     = red (a* > 45)           shorts = white inside the figure, below the tee
  glasses  = brown (L* 15-40, a* 10-35, b* 12-40)        greys   = everything else (body, fins, tail, tusk, spots)
Outline weight is measured per side: on each row (left/right) and column (top/bottom), the run of outline pixels from the
figure's outer edge inward; median over the rows/columns where the run touches a non-outline pixel.
Outputs measure/construction.json and crops/guide/construction_annotated.png."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cv2
import numpy as np

from common import MEASURE, ROOT, dumps

PAGE = os.path.join(ROOT, "crops", "guide", "p-1.png")


def lab(img):
    l = cv2.cvtColor(img, cv2.COLOR_RGB2LAB).astype(np.float32)
    l[..., 0] *= 100 / 255; l[..., 1:] -= 128
    return l


def runs(mask_line, fig, axis, from_end):
    """Outline thickness along one axis: for each line, count outline px from the first figure px (from start or end)."""
    out = []
    m = mask_line if axis == 1 else mask_line.T
    f = fig if axis == 1 else fig.T
    for r in range(m.shape[0]):
        row_f = f[r]; row_m = m[r]
        idx = np.nonzero(row_f)[0]
        if len(idx) < 10: continue
        seq = range(idx[-1], idx[0] - 1, -1) if from_end else range(idx[0], idx[-1] + 1)
        n = 0
        for c in seq:
            if row_m[c]: n += 1
            else: break
        if 0 < n < len(idx) // 3: out.append(n)
    return float(np.median(out)) if out else None, len(out)


def main():
    rgb = cv2.cvtColor(cv2.imread(PAGE), cv2.COLOR_BGR2RGB)
    H, W = rgb.shape[:2]
    reg = np.zeros((H, W), bool)
    reg[:, int(W * 0.36):int(W * 0.82)] = True
    reg[int(H * 0.53):int(H * 0.74), int(W * 0.70):] = False  # "Primary Mark" caption
    nonwhite = (rgb.astype(int).sum(2) < 735) & reg
    # figure = filled outer contour of the largest non-white blob
    n, lbl, st, _ = cv2.connectedComponentsWithStats(nonwhite.astype(np.uint8), 8)
    k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    blob = (lbl == k).astype(np.uint8)
    cnts, _ = cv2.findContours(blob, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    fig = np.zeros_like(blob); cv2.drawContours(fig, cnts, -1, 1, -1); fig = fig.astype(bool)
    ys, xs = np.nonzero(fig)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    FH, FW = y1 - y0 + 1, x1 - x0 + 1
    L = lab(rgb)
    outline = fig & (L[..., 0] < 12)
    tee = fig & (L[..., 1] > 45) & (L[..., 0] > 30)
    glasses = fig & (L[..., 0] > 15) & (L[..., 0] < 40) & (L[..., 1] > 10) & (L[..., 1] < 35) & (L[..., 2] > 12) & (L[..., 2] < 40)
    white = fig & (L[..., 0] > 95) & (np.abs(L[..., 1]) < 4) & (np.abs(L[..., 2]) < 6)

    def box(m, name):
        yy, xx = np.nonzero(m)
        if not len(xx): return None
        b = [int(xx.min()), int(yy.min()), int(xx.max()), int(yy.max())]
        return {"bbox_px": b, "w_rel_H": round((b[2] - b[0] + 1) / FH, 4), "h_rel_H": round((b[3] - b[1] + 1) / FH, 4),
                "top_rel_H": round((b[1] - y0) / FH, 4), "bottom_rel_H": round((b[3] - y0) / FH, 4),
                "left_rel_H": round((b[0] - x0) / FH, 4), "area_rel_fig": round(m.sum() / fig.sum(), 4)}
    tee_b = box(tee, "tee")
    # shorts = white below the tee's lowest red row, excluding the N logo (which sits inside the tee bbox)
    ty1 = tee_b["bbox_px"][3]
    # shorts = the largest white component (the N and its bars are smaller, separate components enclosed by red)
    wn, wl, wst, _ = cv2.connectedComponentsWithStats(white.astype(np.uint8), 8)
    order = np.argsort(-wst[1:, cv2.CC_STAT_AREA]) + 1
    shorts = wl == order[0]
    logo = white & ~shorts
    logo[:tee_b["bbox_px"][1]] = False; logo[ty1:] = False
    # glasses lenses: fill the brown rings' holes; the two biggest holes are the lenses
    g8 = glasses.astype(np.uint8)
    cn, hier = cv2.findContours(g8, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    holes = [c for c, h in zip(cn, hier[0]) if h[3] >= 0] if hier is not None else []
    holes = sorted(holes, key=cv2.contourArea, reverse=True)[:2]
    lenses = []
    for c in sorted(holes, key=lambda c: cv2.boundingRect(c)[0]):
        (cx, cy), r = cv2.minEnclosingCircle(c)
        x, y, w, h = cv2.boundingRect(c)
        lenses.append({"center_rel": [round((cx - x0) / FH, 4), round((cy - y0) / FH, 4)], "w_rel_H": round(w / FH, 4),
                       "h_rel_H": round(h / FH, 4), "aspect_wh": round(w / h, 3)})
    # glasses ring thickness: distance transform of the brown mask, median of ridge values x2
    dt = cv2.distanceTransform(g8, cv2.DIST_L2, 5)
    ridge = dt[(dt > 0) & (dt >= cv2.dilate(dt, np.ones((3, 3))) - 1e-3)]
    ring = float(np.median(ridge) * 2) if ridge.size else None
    # glasses: keep the largest brown component (stray brown-ish pixels in the tee's shading inflate the bbox otherwise)
    gn, gl, gst, _ = cv2.connectedComponentsWithStats(g8, 8)
    glasses = gl == (1 + int(np.argmax(gst[1:, cv2.CC_STAT_AREA])))
    gtop = box(glasses, "g")["bbox_px"][1]
    # tusk: its three spiral-band colours are used nowhere else above the glasses (sampled from the 400 dpi render):
    # #d5dce5 light band, #9db5c1 blue-grey band, #6b8795 shadow. Exact match (+-6 per channel), above the glasses' top.
    TUSK_RGB = [(0xd5, 0xdc, 0xe5), (0x9d, 0xb5, 0xc1), (0x6b, 0x87, 0x95)]
    tusk = np.zeros((H, W), bool)
    for c in TUSK_RGB:
        tusk |= (np.abs(rgb.astype(int) - c).max(2) <= 6)
    tusk &= fig
    tusk[gtop:] = False
    # close the 1-2 px gaps between bands, then keep the largest component
    tusk = cv2.morphologyEx(tusk.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    tn, tl, tst, _ = cv2.connectedComponentsWithStats(tusk, 8)
    tusk = tl == (1 + int(np.argmax(tst[1:, cv2.CC_STAT_AREA])))
    tyy, txx = np.nonzero(tusk)
    ang = None
    if len(txx) > 50:
        c = np.cov(np.vstack([txx, -tyy]))
        ev, evec = np.linalg.eigh(c)
        v = evec[:, -1]
        ang = round(float(np.degrees(np.arctan2(v[1], v[0])) % 180), 1)  # degrees above the +x axis
    # tail: figure below the shorts
    sh_b = box(shorts, "s")
    tail = fig.copy(); tail[:sh_b["bbox_px"][3] + 1] = False
    oth = {"left": runs(outline, fig, 1, False), "right": runs(outline, fig, 1, True),
           "top": runs(outline, fig, 0, False), "bottom": runs(outline, fig, 0, True)}
    res = {
        "source": "media/key/gnarls_style_guide_2021.pdf p.1, primary mark (vector) rendered at 400 dpi",
        "figure_px": {"bbox": [int(x0), int(y0), int(x1), int(y1)], "H": int(FH), "W": int(FW), "aspect_wh": round(FW / FH, 4)},
        "outline_px_by_side": {k: {"median_px": v[0], "rel_H": round(v[0] / FH, 4) if v[0] else None, "lines": v[1]} for k, v in oth.items()},
        "outline_area_rel_fig": round(outline.sum() / fig.sum(), 4),
        "glasses": {**box(glasses, "g"), "ring_thickness_rel_H": round(ring / FH, 4) if ring else None, "lenses": lenses},
        "tee": tee_b, "n_logo": box(logo, "logo"), "shorts": sh_b, "tail": box(tail, "tail"),
        "tusk": {**(box(tusk, "tusk") or {}), "axis_deg_above_horizontal": ang},
    }
    os.makedirs(MEASURE, exist_ok=True)
    open(os.path.join(MEASURE, "construction.json"), "w", encoding="utf8").write(json.dumps(json.loads(dumps(res)), indent=1))
    ann = rgb.copy()
    for m, col in ((tee, (0, 255, 0)), (glasses, (255, 0, 255)), (shorts, (0, 128, 255)), (tusk, (255, 255, 0)), (tail, (0, 255, 255))):
        cn, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(ann, cn, -1, col, 6)
    cv2.rectangle(ann, (int(x0), int(y0)), (int(x1), int(y1)), (255, 0, 0), 4)
    crop = ann[max(0, y0 - 40):y1 + 40, max(0, x0 - 40):x1 + 40]
    cv2.imwrite(os.path.join(ROOT, "crops", "guide", "construction_annotated.png"),
                cv2.cvtColor(cv2.resize(crop, (crop.shape[1] // 3, crop.shape[0] // 3), interpolation=cv2.INTER_AREA), cv2.COLOR_RGB2BGR))
    print(json.dumps(json.loads(dumps(res)), indent=1))


if __name__ == "__main__":
    main()
