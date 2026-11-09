"""M13: geometry of every image card (M11 kind "image_card" with a mid-shot entry or exit, or any card in a still via M21),
measured at native resolution on the element's settled frame (middle of its life).

  corner radius : the card mask = the region inside the card's strongest closed edge near the M11 box; for each corner, the gap g
                  from the bounding-box corner to the mask along the diagonal; a circular corner of radius r leaves g = r(sqrt2 - 1),
                  so r = g / (sqrt2 - 1). Reported per corner, median in px and as % of card width.
  border        : across each side's middle, a 1-8 px band at the edge whose colour differs from both the inside (8-16 px in)
                  and the outside (8-16 px out) by >= 12 levels: width px and contrast (alpha proxy = band difference / 255).
  shadow        : luminance profile outward from each side (0-80 px), relative to the far background (60-80 px out); darkening
                  depth (alpha proxy = max darkening / far luminance), blur = distance where darkening drops below 10% of its max,
                  offset = (bottom extent - top extent) / 2 and (right - left) / 2.
  padding       : gradient energy inward from each side; the first band (after 2 px) whose energy exceeds 3x the edge-free median
                  marks content (photo or text) - distance in px.
  grid          : bbox and centre in % of the frame; nearest column of a 12-column grid with the kit's 9.1% margins.
"""
import cv2
import numpy as np

from common import load_json, out_path, run

SQ2 = np.sqrt(2) - 1


def grab(path, idx):
    cap = cv2.VideoCapture(path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
    ok, f = cap.read()
    cap.release()
    return cv2.cvtColor(f, cv2.COLOR_BGR2RGB) if ok else None


def card_mask(crop, box_in_crop):
    g = cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY)
    e = cv2.Canny(g, 30, 100)
    e = cv2.dilate(e, np.ones((3, 3), np.uint8))
    cs, _ = cv2.findContours(e, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    x0, y0, x1, y1 = box_in_crop
    best, bs = None, -1
    for c in cs:
        x, y, w, h = cv2.boundingRect(c)
        ov = max(0, min(x + w, x1) - max(x, x0)) * max(0, min(y + h, y1) - max(y, y0))
        u = w * h + (x1 - x0) * (y1 - y0) - ov
        sc = ov / u if u else 0
        if sc > bs:
            best, bs = c, sc
    if best is None or bs < 0.6:
        return None
    m = np.zeros(g.shape, np.uint8)
    cv2.drawContours(m, [best], -1, 255, -1)
    return m


def corner_radii(mask):
    ys, xs = np.where(mask > 0)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    out = []
    for (cx, cy, sx, sy) in ((x0, y0, 1, 1), (x1, y0, -1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)):
        g = None
        for d in range(0, int(min(x1 - x0, y1 - y0) / 2)):
            x, y = int(cx + sx * d), int(cy + sy * d)
            if mask[y, x] > 0:
                g = d * np.sqrt(2)
                break
        out.append(None if g is None else g / SQ2)
    return out, [int(x0), int(y0), int(x1), int(y1)]


def side_profiles(f, b):
    H, W = f.shape[:2]
    Y = cv2.cvtColor(f, cv2.COLOR_RGB2GRAY).astype(np.float32)
    x0, y0, x1, y1 = b
    mx, my = (x0 + x1) // 2, (y0 + y1) // 2
    span = lambda a, z: slice(max(0, a), min(z, 10 ** 9))
    res = {}
    for side, (dx, dy) in {"top": (0, -1), "bottom": (0, 1), "left": (-1, 0), "right": (1, 0)}.items():
        prof_out, prof_in = [], []
        for d in range(0, 81):
            if dy:
                yy = (y0 - d) if dy < 0 else (y1 + d)
                yi = (y0 + d) if dy < 0 else (y1 - d)
                band = slice(max(0, mx - 40), min(W, mx + 40))
                prof_out.append(float(Y[yy, band].mean()) if 0 <= yy < H else np.nan)
                prof_in.append(float(Y[yi, band].mean()) if 0 <= yi < H else np.nan)
            else:
                xx = (x0 - d) if dx < 0 else (x1 + d)
                xi = (x0 + d) if dx < 0 else (x1 - d)
                band = slice(max(0, my - 40), min(H, my + 40))
                prof_out.append(float(Y[band, xx].mean()) if 0 <= xx < W else np.nan)
                prof_in.append(float(Y[band, xi].mean()) if 0 <= xi < W else np.nan)
        res[side] = (np.array(prof_out), np.array(prof_in))
    return res


def measure_card(f, box):
    H, W = f.shape[:2]
    x0, y0, x1, y1 = [int(round(v)) for v in box]
    pad = 90
    cx0, cy0, cx1, cy1 = max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)
    crop = f[cy0:cy1, cx0:cx1]
    m = card_mask(crop, [x0 - cx0, y0 - cy0, x1 - cx0, y1 - cy0])
    if m is None:
        return None
    radii, bb = corner_radii(m)
    b = [bb[0] + cx0, bb[1] + cy0, bb[2] + cx0, bb[3] + cy0]
    cw = b[2] - b[0]
    rv = [r for r in radii if r is not None]
    prof = side_profiles(f, b)
    border, shadow, padding = {}, {}, {}
    for side, (po, pi) in prof.items():
        far = np.nanmean(po[60:81]) if np.isfinite(po[60:81]).any() else np.nan
        inner = np.nanmean(pi[8:17])
        outer = np.nanmean(po[8:17])
        bw = 0
        for d in range(0, 9):
            v = pi[d]
            if np.isfinite(v) and abs(v - inner) >= 12 and abs(v - outer) >= 12:
                bw = d + 1
            else:
                break
        border[side] = {"width_px": bw, "alpha": round(float(abs(np.nanmean(pi[:bw]) - inner) / 255), 3) if bw else 0.0}
        dark = far - po if np.isfinite(far) else np.full_like(po, np.nan)
        dmax = float(np.nanmax(dark[2:60])) if np.isfinite(dark[2:60]).any() else 0.0
        if dmax > 2 and np.isfinite(far) and far > 0:
            below = np.where(dark[2:61] < 0.1 * dmax)[0]
            shadow[side] = {"depth": round(dmax, 1), "alpha": round(dmax / far, 3), "extent_px": int(below[0] + 2) if len(below) else 60}
        else:
            shadow[side] = {"depth": round(max(0.0, dmax), 1), "alpha": 0.0, "extent_px": 0}
        gi = np.abs(np.diff(pi))
        base = np.nanmedian(gi[2:]) + 1e-3
        hit = np.where(gi[2:] > 3 * base)[0]
        padding[side] = int(hit[0] + 2) if len(hit) else None
    ext = {s: shadow[s]["extent_px"] for s in shadow}
    alphas = [shadow[s]["alpha"] for s in shadow]
    cxp, cyp = (b[0] + b[2]) / 2 / W, (b[1] + b[3]) / 2 / H
    col_w = (1 - 2 * 0.091) / 12
    col = int(np.clip((cxp - 0.091) // col_w, 0, 11))
    return {"bbox_px": b, "width_px": cw, "height_px": b[3] - b[1],
            "corner_radius_px": [None if r is None else round(r, 1) for r in radii],
            "corner_radius_median_px": round(float(np.median(rv)), 1) if rv else None,
            "corner_radius_pct_width": round(float(np.median(rv)) / cw * 100, 2) if rv and cw else None,
            "border": border, "shadow": shadow,
            "shadow_summary": {"alpha_max": max(alphas), "offset_y_px": (ext["bottom"] - ext["top"]) / 2, "offset_x_px": (ext["right"] - ext["left"]) / 2,
                               "blur_px": float(np.median([v for v in ext.values()]))},
            "padding_px": padding,
            "grid": {"bbox_pct": [round(b[0] / W * 100, 2), round(b[1] / H * 100, 2), round(b[2] / W * 100, 2), round(b[3] / H * 100, 2)],
                     "centre_pct": [round(cxp * 100, 2), round(cyp * 100, 2)], "col12": col + 1}}


def m13(ref, vid, path, P):
    g = load_json(out_path(ref, vid, "graphic_elements.json"))
    if g is None:
        raise RuntimeError("needs graphic_elements.json")
    cards = []
    for e in g["elements"]:
        if e["kind"] != "image_card" or not (e.get("mid_shot_entry") or e.get("mid_shot_exit")):
            continue
        t = e["track"][len(e["track"]) // 2]
        f = grab(path, t["frame"])
        if f is None:
            continue
        r = measure_card(f, t["bbox"])
        if r:
            r.update({"element": e["id"], "frame": t["frame"]})
            cards.append(r)
    return {"cards": cards, "count": len(cards)}


if __name__ == "__main__":
    run("cards.json", m13)
