"""Find the red areas on a skin image so markup rings can circle them (style DECISIONS 9).

Redness = CIELAB a* (green-red axis) above its local surroundings: a* minus a* blurred at 12% of the image width, smoothed at
1.2%, on skin only (L* > 25 and a* > 8, so a black background or hair never scores). The top 3% of that map is thresholded,
cleaned (open/close), and connected regions are ranked by summed excess redness. Each kept region gets an ellipse (cv2.fitEllipse
on its contour, inflated 1.35x, at least 7% of the width across) in 0..1 image coordinates.
On a --pair the before rings come from what CLEARED between the photos (cleared(): before minus the ECC-aligned after).
Optional: --pair splits a side-by-side before/after at its divider (darkest column in the middle 20%) and writes both halves.

Usage: python -I tools/redness_spots.py IMAGE OUTDIR [--pair] [--n 3] [--name NAME]
Writes OUTDIR/NAME.jpg (or NAME_before.jpg / NAME_after.jpg) and OUTDIR/NAME.json:
  {"before": {"file", "w", "h", "spots": [{"cx","cy","rx","ry","angle","score"}...]}, "after": {...}}   (one key "image" without --pair)
"""
import argparse
import json
import os

import cv2
import numpy as np


def spots(bgr, n=3):
    h, w = bgr.shape[:2]
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    L, a = lab[..., 0] * 100 / 255, lab[..., 1] - 128
    skin = (L > 25) & (a > 8)
    big = max(3, int(w * 0.12) | 1)
    # local mean of a* over skin only
    num = cv2.GaussianBlur(np.where(skin, a, 0), (0, 0), big / 3)
    den = cv2.GaussianBlur(skin.astype(np.float32), (0, 0), big / 3) + 1e-6
    excess = np.where(skin, a - num / den, 0)
    excess = cv2.GaussianBlur(excess, (0, 0), max(1.0, w * 0.02))
    vals = excess[skin]
    if vals.size < 100:
        return []
    thr = max(2.0, float(np.percentile(vals, 93)))
    m = ((excess > thr) & skin).astype(np.uint8)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (max(3, w // 120), max(3, w // 120)))
    m = cv2.morphologyEx(cv2.morphologyEx(m, cv2.MORPH_OPEN, k), cv2.MORPH_CLOSE, k, iterations=2)
    cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cnts:
        if len(c) < 5 or cv2.contourArea(c) < (w * 0.015) ** 2:
            continue
        mask = np.zeros_like(m)
        cv2.drawContours(mask, [c], -1, 1, -1)
        score = float((excess * mask).sum())
        (cx, cy), (ax1, ax2), ang = cv2.fitEllipse(c)
        rx, ry = max(ax1 / 2 * 1.25, w * 0.05), max(ax2 / 2 * 1.25, w * 0.05)
        out.append({"cx": round(cx / w, 4), "cy": round(cy / h, 4), "rx": round(rx / w, 4), "ry": round(ry / h, 4), "angle": round(float(ang), 1), "score": round(score, 1)})
    out.sort(key=lambda s: -s["score"])
    # drop a spot whose centre lies inside a stronger one
    keep = []
    for s in out:
        if all(((s["cx"] - k["cx"]) / k["rx"]) ** 2 + ((s["cy"] - k["cy"]) / k["ry"]) ** 2 > 1 for k in keep):
            keep.append(s)
    return keep[:n]


def blobs(score, valid, w, h, n, pct, min_r=0.05, inflate=1.35):
    """Threshold `score` at its pct percentile over `valid`, clean, rank regions by summed score, ellipse each (0..1 coords)."""
    vals = score[valid]
    if vals.size < 100:
        return []
    thr = max(1e-3, float(np.percentile(vals, pct)))
    m = ((score > thr) & valid).astype(np.uint8)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (max(3, w // 60), max(3, w // 60)))
    m = cv2.morphologyEx(cv2.morphologyEx(m, cv2.MORPH_OPEN, k), cv2.MORPH_CLOSE, k, iterations=3)
    cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cnts:
        if len(c) < 5 or cv2.contourArea(c) < (w * 0.02) ** 2:
            continue
        mask = np.zeros_like(m); cv2.drawContours(mask, [c], -1, 1, -1)
        (cx, cy), (a1, a2), ang = cv2.fitEllipse(c)
        out.append({"cx": round(cx / w, 4), "cy": round(cy / h, 4), "rx": round(max(a1 / 2 * inflate, w * min_r) / w, 4),
                    "ry": round(max(a2 / 2 * inflate, w * min_r) / h, 4), "angle": round(float(ang), 1), "score": round(float((score * mask).sum()), 1)})
    out.sort(key=lambda s: -s["score"])
    keep = []
    for s in out:
        if all(((s["cx"] - k["cx"]) / k["rx"]) ** 2 + ((s["cy"] - k["cy"]) / k["ry"]) ** 2 > 1 for k in keep):
            keep.append(s)
    return keep[:n]


def lesion_map(bgr, skin, parts=False):
    """Fine-scale 'stands out from the skin around it' score: redder (a* up), bluer/purple (b* down, a vessel) or darker (L* down)
    than the skin within ~4% of the width; smoothed at 0.8%."""
    w = bgr.shape[1]
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    L, a, b = lab[..., 0] * 100 / 255, lab[..., 1] - 128, lab[..., 2] - 128
    sf = skin.astype(np.float32); den = cv2.GaussianBlur(sf, (0, 0), w * 0.04) + 1e-6
    loc = lambda x: cv2.GaussianBlur(x * sf, (0, 0), w * 0.04) / den
    comps = [np.maximum(0, a - loc(a)), np.maximum(0, loc(b) - b), 0.5 * np.maximum(0, loc(L) - L)]  # red, purple, dark
    sm = lambda x: cv2.GaussianBlur(np.where(skin, x, 0), (0, 0), max(1.0, w * 0.008))
    return [sm(c) for c in comps] if parts else sm(sum(comps))


def cleared(before, after, n=3):
    """Spots on `before` that the after photo no longer has. lesion_map() on the before (fine-scale redness / purple vessels);
    the after is aligned onto the before (ECC affine on grey at 400 px) and colour-matched on skin (L*a*b* mean/spread), its
    lesion_map taken too; a before region is kept if one of its signals (red / purple / dark, carrying >= 25% of it) drops under half in the after (lips, a nose
    tip red in both drop out). Returns (spots on `before`, ECC correlation)."""
    h, w = before.shape[:2]
    aft = cv2.resize(after, (w, h)) if after.shape[:2] != (h, w) else after
    s = 400 / w
    g0 = cv2.cvtColor(cv2.resize(before, None, fx=s, fy=s), cv2.COLOR_BGR2GRAY).astype(np.float32)
    g1 = cv2.cvtColor(cv2.resize(aft, None, fx=s, fy=s), cv2.COLOR_BGR2GRAY).astype(np.float32)
    M = np.eye(2, 3, dtype=np.float32)
    try:
        cc, M = cv2.findTransformECC(g0, g1, M, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-5), None, 5)
    except cv2.error:
        cc = 0.0
    M[:, 2] /= s
    al = cv2.warpAffine(aft, M, (w, h), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
    l0 = cv2.cvtColor(before, cv2.COLOR_BGR2LAB).astype(np.float32); l1 = cv2.cvtColor(al, cv2.COLOR_BGR2LAB).astype(np.float32)
    skin = (l0[..., 0] * 100 / 255 > 25) & (l0[..., 1] - 128 > 6)
    for c in range(3):
        x0, x1 = l0[..., c][skin], l1[..., c][skin]
        l1[..., c] = (l1[..., c] - x1.mean()) * (x0.std() / (x1.std() + 1e-6)) + x0.mean()
    al = cv2.cvtColor(np.clip(l1, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)
    m0 = lesion_map(before, skin)
    p0 = lesion_map(before, skin, True)
    p1 = [cv2.GaussianBlur(x, (0, 0), w * 0.01) for x in lesion_map(al, skin, True)]  # a little slack for residual misalignment
    edge = np.zeros_like(skin); bd = int(w * 0.04); edge[bd:-bd, bd:-bd] = True
    cand = blobs(m0, skin & edge, w, h, 12, 98, min_r=0.06, inflate=1.5)
    keep = []
    for sp in cand:
        mk = np.zeros((h, w), np.uint8)
        cv2.ellipse(mk, ((sp["cx"] * w, sp["cy"] * h), (2 * sp["rx"] * w / 1.5, 2 * sp["ry"] * h / 1.5), sp["angle"]), 1, -1)
        # per signal (red / purple / dark): how much of the before's amount the after still has there; kept if any signal that
        # carries at least 25% of the spot's score is mostly gone (< 0.5)
        b0 = [float((x * mk).sum()) for x in p0]; b1 = [float((x * mk).sum()) for x in p1]
        tot = sum(b0) + 1e-6
        ratios = [round(y / (x + 1e-6), 2) for x, y in zip(b0, b1)]
        sp["after_ratio"] = dict(zip(["red", "purple", "dark"], ratios))
        if any(x / tot >= 0.25 and r < 0.5 for x, r in zip(b0, ratios)):
            keep.append(sp)
    return keep[:n], float(cc)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image"); ap.add_argument("outdir")
    ap.add_argument("--pair", action="store_true"); ap.add_argument("--n", type=int, default=3); ap.add_argument("--name")
    A = ap.parse_args()
    os.makedirs(A.outdir, exist_ok=True)
    name = A.name or os.path.splitext(os.path.basename(A.image))[0]
    img = cv2.imdecode(np.fromfile(A.image, np.uint8), cv2.IMREAD_COLOR)
    res = {}
    if A.pair:
        g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).mean(0)
        w = img.shape[1]; lo, hi = int(w * 0.4), int(w * 0.6)
        d = lo + int(np.argmin(g[lo:hi]))
        e0 = d; e1 = d
        while e0 > lo and g[e0 - 1] < 40: e0 -= 1
        while e1 < hi and g[e1 + 1] < 40: e1 += 1
        halves = {"before": img[:, :e0], "after": img[:, e1 + 1:]}
        res["divider"] = [e0, e1]
    else:
        halves = {"image": img}
    for k, im in halves.items():
        f = f"{name}_{k}.jpg" if A.pair else f"{name}.jpg"
        cv2.imwrite(os.path.join(A.outdir, f), im, [cv2.IMWRITE_JPEG_QUALITY, 92])
        res[k] = {"file": f, "w": im.shape[1], "h": im.shape[0], "spots": spots(im, A.n)}
    if A.pair:  # on a pair, the rings on "before" are where the after photo shows the redness gone; the after half gets none
        res["before"]["spots"], res["ecc"] = cleared(halves["before"], halves["after"], A.n)
        res["before"]["method"] = "cleared (before - aligned after)"
        res["after"]["spots"] = []
    json.dump(res, open(os.path.join(A.outdir, f"{name}.json"), "w"), indent=1)
    print(json.dumps(res))


if __name__ == "__main__":
    main()
