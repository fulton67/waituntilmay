"""P0010 AviClear split-slider Story: cut the aligned before/after pair for the Remotion composition (src/bastory).

Same pair and alignment as ba_v2_measure.py (measure.json p0010.align.M: after crop px -> before crop px). The after is warped into
the before's frame; then ONE crop rectangle is chosen that lies inside the clean area of BOTH photos: no sheet caption text, no
white sheet margin, no panel seam, and no rotated panel edge of the warped after, at any slider position. Both photos get the same
rectangle, so the face stays aligned. Crop, scale and align only: no grading or retouching.

Writes (gitignored, never committed): brand/remotion/public/ba-story/p0010_before.png, p0010_after.png, p0010.json
(window size, ring ellipse in window px, red-area numbers). Run: python brand/scripts/ba_story_p0010.py
"""
import json
import os

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "public/brand/ostad/stills/ba/src/v2/p0010_grid.jpg")
MEAS = os.path.join(ROOT, "research/ostad/style/beforeafter_v2/measure.json")
OUT = os.path.join(ROOT, "brand/remotion/public/ba-story")
WIN = (940, 1010)  # photo window in the Story, px (w, h)
VB = (154, 0, 540, 496)    # before crop (visit 1), source px, as measured
VA = (540, 540, 926, 1053)  # after crop (visit 4), source px, as measured
# clean areas in source px, measured on the sheet: white margin ends x 157 / starts x 923; panel seam x ~537; the visit-1 caption
# starts y ~515; the visit-2 caption + seam end y ~548 (kept 24 px clear, the README asked y0 ~575); the visit-4 caption starts y ~1045
CLEAN_B = (162, 2, 532, 505)
CLEAN_A = (548, 574, 916, 1032)
ERODE = 6  # px of safety inside the clean area, after warping


def main():
    g = cv2.imread(SRC)
    m = json.load(open(MEAS))["p0010"]
    M = np.array(m["align"]["M"], np.float64)
    B = g[VB[1]:VB[3], VB[0]:VB[2]]
    A = g[VA[1]:VA[3], VA[0]:VA[2]]
    hB, wB = B.shape[:2]
    Aw = cv2.warpAffine(A, M, (wB, hB), flags=cv2.INTER_LANCZOS4)
    mb = np.zeros((hB, wB), np.uint8)
    mb[CLEAN_B[1] - VB[1]:CLEAN_B[3] - VB[1], CLEAN_B[0] - VB[0]:CLEAN_B[2] - VB[0]] = 255
    ma = np.zeros(A.shape[:2], np.uint8)
    ma[CLEAN_A[1] - VA[1]:CLEAN_A[3] - VA[1], CLEAN_A[0] - VA[0]:CLEAN_A[2] - VA[0]] = 255
    ma = cv2.warpAffine(ma, M, (wB, hB), flags=cv2.INTER_NEAREST)
    ok = cv2.erode(((mb > 0) & (ma > 0)).astype(np.uint8), np.ones((2 * ERODE + 1,) * 2, np.uint8))
    bad = np.pad((1 - ok).astype(np.int64).cumsum(0).cumsum(1), ((1, 0), (1, 0)))

    def clean(x, y, w, h):
        return bad[y + h, x + w] - bad[y, x + w] - bad[y + h, x] + bad[y, x] == 0

    # the ring (measured right-cheek ellipse, drawn at 0.80 like the still) must sit well inside the crop
    e = m["regions"]["cheek_r"]["ellipse_b"]
    cx, cy, rx, ry = e[0] * wB, e[1] * hB, e[2] * wB / 2 * 0.8, e[3] * hB / 2 * 0.8
    asp = WIN[0] / WIN[1]
    best = None
    for h in range(hB, 100, -1):
        w = int(round(h * asp))
        if w > wB:
            continue
        cands = [(x, y) for y in range(0, hB - h + 1) for x in range(0, wB - w + 1) if clean(x, y, w, h)
                 and x + 20 < cx - rx and cx + rx < x + w - 20 and y + 20 < cy - ry and cy + ry < y + h - 20]
        if cands:
            # most centred on the face (nose x ~0.5, keep the chin: prefer lower)
            fx = 0.5 * wB
            best = (min(cands, key=lambda p: abs(p[0] + w / 2 - fx) - 0.3 * p[1]), w, h)
            break
    (x, y), w, h = best
    s = WIN[0] / w
    print(f"crop in before-panel px: x {x}..{x + w}, y {y}..{y + h} ({w}x{h}), scale {s:.3f}")
    os.makedirs(OUT, exist_ok=True)
    for name, im in (("before", B), ("after", Aw)):
        c = im[y:y + h, x:x + w]
        cv2.imwrite(os.path.join(OUT, f"p0010_{name}.png"), cv2.resize(c, WIN, interpolation=cv2.INTER_LANCZOS4))
    r = m["regions"]["cheek_r"]
    geo = {"win": WIN, "crop_before_px": [x, y, x + w, y + h], "scale": s,
           "ring": {"cx": (cx - x) * s, "cy": (cy - y) * s, "rx": rx * s, "ry": ry * s, "rot": e[4] - 180},
           "red_before": r["red_area_pct_before"], "red_after": r["red_area_pct_after"], "rot_deg": m["align"]["rot_deg"]}
    json.dump(geo, open(os.path.join(OUT, "p0010.json"), "w"), indent=1)
    print(json.dumps(geo))


if __name__ == "__main__":
    main()
