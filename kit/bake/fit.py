# Step 1b: fit each painted part onto its rendered silhouette with a similarity transform (scale + translation,
# rotation within +-3 degrees), maximising the IoU of the two masks. Start: the scale that matches the areas and
# the translation that matches the centroids; then a grid over rotation and scale (translation re-centred at each)
# and a Nelder-Mead refinement at half resolution; the IoU reported is at full resolution. Under 0.92 is flagged
# and that part/view is not projected (bake.py leaves it out). Writes kit/work/fit.json and an overlay per pair,
# kit/work/fit-<view>-<label>.png (red: render only, green: paint only, yellow: both).
import json
import os
import sys

import cv2
import numpy as np
from scipy import ndimage, optimize

sys.path.insert(0, os.path.dirname(__file__))
from common import KIT_CELL, PARTS, VIEWS, WORK, iou, part_meshes, scene, silhouette

PASS = 0.92
MAX_ROT = 3.0
# parts that are round about the vertical: their silhouette hardly depends on the camera's azimuth, only on its
# elevation, and the image model drew the base from a steeper angle than the sheet camera. For these the fit also
# searches the elevation (the sheet's azimuth kept), and the bake projects along the direction found.
ROUND = {"B"}
ELEVATIONS = range(-8, 13)  # degrees from the sheet's own elevation


def matrix(s, th, tx, ty, c):
    """painted px -> cell px: rotate by th degrees and scale by s about the painted centroid c, then put c at (tx, ty)"""
    a = np.deg2rad(th)
    R = s * np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]])
    return np.hstack([R, (np.array([tx, ty]) - R @ c)[:, None]])


def warp(p, M, size):
    return cv2.warpAffine(p, M, (size, size), flags=cv2.INTER_LINEAR, borderValue=0)


def fit(sil, paint):
    S = sil > 0.5
    pm = (paint > 0.5).astype(np.float32)
    c = np.array(ndimage.center_of_mass(pm))[::-1]
    cs = np.array(ndimage.center_of_mass(S.astype(np.float32)))[::-1]
    s0 = np.sqrt(S.sum() / pm.sum())
    half = KIT_CELL // 2
    Sh = cv2.resize(S.astype(np.float32), (half, half), interpolation=cv2.INTER_AREA)

    def score(v, full=False):
        s, th, tx, ty = v
        if abs(th) > MAX_ROT or s <= 0:
            return 0.0
        if full:
            return iou(warp(pm, matrix(s, th, tx, ty, c), KIT_CELL), S.astype(np.float32))
        M = matrix(s / 2, th, tx / 2, ty / 2, c)
        return iou(warp(pm, M, half), Sh)

    best = (0, None)
    for th in np.arange(-MAX_ROT, MAX_ROT + 0.01, 1.0):
        for k in np.arange(0.8, 1.21, 0.025):
            s = s0 * k
            # centroid of the warped mask onto the silhouette's: rotation and scale move the centroid only by the
            # mask's own shape, which re-centring absorbs
            v = (s, th, cs[0], cs[1])
            sc = score(v)
            if sc > best[0]:
                best = (sc, v)
    res = optimize.minimize(lambda v: -score(v), best[1], method="Nelder-Mead",
                            options={"xatol": 0.05, "fatol": 1e-4, "maxiter": 600, "initial_simplex": None})
    v = res.x if -res.fun >= best[0] else np.array(best[1])
    v[1] = float(np.clip(v[1], -MAX_ROT, MAX_ROT))
    return v, score(v, full=True), c


if __name__ == "__main__":
    sc = scene()
    out = {}
    for view in ("front", "back"):
        for label in PARTS:
            rgba = cv2.imread(os.path.join(WORK, f"paint-{view}-{label}.png"), cv2.IMREAD_UNCHANGED)
            alpha = rgba[..., 3].astype(np.float32) / 255
            d0 = VIEWS[view]
            dirs = [d0]
            if label in ROUND:
                h = np.hypot(d0[0], d0[2]); el0 = np.degrees(np.arctan2(d0[1], h))
                dirs = [np.array([d0[0], h * np.tan(np.radians(el0 + k)), d0[2]]) for k in ELEVATIONS]
            tries = []
            for d in dirs:
                sil = silhouette(part_meshes(sc, label), d)
                v, u, c = fit(sil, alpha)
                tries.append((u, d, v, c, sil))
            u, d, v, c, sil = max(tries, key=lambda t: t[0])
            sheet_iou = next(t[0] for t in tries if np.allclose(t[1], d0))
            el = float(np.degrees(np.arctan2(d[1], np.hypot(d[0], d[2]))))
            M = matrix(*v, c)
            out[f"{view}/{label}"] = {"part": PARTS[label][1], "view": view, "label": label, "cell": f"{label} ({'row %d, column %d' % ('ABCDEFGH'.index(label) // 2 + 1, 'ABCDEFGH'.index(label) % 2 + 1)})",
                                     "dir": [round(float(x), 5) for x in d], "elevationDeg": round(el, 2), "iouAtSheetCamera": round(sheet_iou, 4),
                                     "scale": round(float(v[0]), 5), "rotationDeg": round(float(v[1]), 3),
                                     "tx": round(float(v[2]), 2), "ty": round(float(v[3]), 2), "centroid": [round(float(x), 2) for x in c],
                                     "matrix": M.round(6).tolist(), "iou": round(u, 4), "pass": u >= PASS}
            w = warp(alpha, M, KIT_CELL) > 0.5
            vis = np.dstack([np.zeros_like(sil), w * 255, (sil > 0.5) * 255]).astype(np.uint8)
            cv2.imwrite(os.path.join(WORK, f"fit-{view}-{label}.png"), vis)
            print(view, label, PARTS[label][1].ljust(12), "IoU", round(u, 4), f"(sheet camera {sheet_iou:.4f}, elevation {el:.1f})", "PASS" if u >= PASS else "FLAG (< 0.92, not projected)", f"s={v[0]:.3f} rot={v[1]:.2f}")
    json.dump(out, open(os.path.join(WORK, "fit.json"), "w"), indent=2)
