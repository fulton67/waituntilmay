"""P0010 AviClear slider video: find every acne region to ring, one at a time (user note 2026-11-19: "one circle shouldn't be up for
that long. One should draw, then disappear, then another in another place where there is acne").

Same detection and thresholds as ba_v2_measure.py (MediaPipe landmarks, the after aligned on eyes + nose, spots = Lab a* blobs over
the 31 px median by >= 3.5). Each landmark region is measured on the before and on the aligned after. A region is ringed only when:
  - it clears the v2 noise floor: red area >= 0.5 % before and down >= 40 %, or >= 4 spots before and down >= 40 %;
  - its spots lie inside the Story crop (ba_story_p0010.py), and
  - the ring starts below the lower eyelids (no ring from above the eye).
The ring is sized tight to the region's before-spot cluster, not the whole region. Results are added to public/ba-story/p0010.json
("rings", window px) and printed; --debug DIR writes the before/after crops with the detected spots for a visual check.
usage: style-venv python -I brand/scripts/ba_story_regions.py [--debug DIR] [--allow-above-eye]
  --allow-above-eye  also ring regions above the lower eyelids (the forehead). The v2 rule only says a mark for an UNDER-eye change
                     must not start above the eye; forehead acne may be marked. P0010 is rendered with this flag.
"""
import json
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ba_v2_measure as V  # noqa: E402

ROOT = V.ROOT
GEO = os.path.join(ROOT, "brand/remotion/public/ba-story/p0010.json")
DBG = sys.argv[sys.argv.index("--debug") + 1] if "--debug" in sys.argv else None
# landmark regions (MediaPipe ids; r = the patient's right = image left). Cheeks are the v2 polygons (below the lower lid).
REGIONS = {
    "forehead": [10, 109, 67, 103, 54, 21, 71, 70, 63, 105, 66, 107, 9, 336, 296, 334, 293, 300, 301, 251, 284, 332, 297, 338],
    "cheek_r": V.CHEEK["r"], "cheek_l": V.CHEEK["l"],
    "nose": [168, 6, 197, 195, 5, 4, 1, 19, 94, 2, 98, 327, 64, 294, 48, 278, 129, 358, 115, 344, 217, 437],
    "chin": [91, 181, 84, 17, 314, 405, 321, 377, 400, 152, 148, 176],
    "jaw_r": [61, 91, 176, 149, 150, 136, 172, 58, 214, 212],
    "jaw_l": [291, 321, 400, 378, 379, 365, 397, 288, 434, 432],
}
# regions that clear the floor but failed the visual check on the before crop (2026-11-19), so they are never ringed
REJECT = {"nose": "the one spot that went away sits on the nose-tip highlight and the other two are the nostril shadows (still there "
                  "on the after): not acne"}
NAMES = {"forehead": "Forehead", "cheek_r": "Right cheek", "cheek_l": "Left cheek", "nose": "Nose", "chin": "Chin", "jaw_r": "Right jaw", "jaw_l": "Left jaw"}


def redmask(img, mask):
    """the spots() red-excess pixels (Lab a* over its 31 px median by >= 3.5), before the blob size filter"""
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    a = lab[..., 1]
    k = max(31, int(min(img.shape[:2]) / 40) | 1)
    ex = a - cv2.medianBlur(np.clip(a, 0, 255).astype(np.uint8), min(k, 255)).astype(np.float32)
    r = ((ex >= 3.5) & (lab[..., 0] < 235) & (mask > 0)).astype(np.uint8)
    return cv2.morphologyEx(r, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(bool)


def main():
    P = V.PAIRS["p0010"]
    B, A = V.load(P["b"]), V.load(P["a"])
    LB, LA = V.lm(B), V.lm(A)
    M, _ = cv2.estimateAffinePartial2D(LA[V.STABLE], LB[V.STABLE], method=cv2.LMEDS)
    Aw = cv2.warpAffine(A, M, (B.shape[1], B.shape[0]), flags=cv2.INTER_LINEAR)
    valid = cv2.warpAffine(np.full(A.shape[:2], 255, np.uint8), M, (B.shape[1], B.shape[0]))
    geo = json.load(open(GEO))
    cx0, cy0, cx1, cy1 = geo["crop_before_px"]
    s = geo["scale"]
    lid = float(max(LB[145][1], LB[374][1]))  # lower eyelids: nothing is ringed from above this line
    if "--allow-above-eye" in sys.argv:
        lid = -1.0
    out, rings = {}, []
    for rn, ids in REGIONS.items():
        m = np.zeros(B.shape[:2], np.uint8)
        cv2.fillConvexPoly(m, cv2.convexHull(LB[ids].astype(np.int32)), 255)
        m = cv2.bitwise_and(m, valid)
        pb, rb = V.spots(B, m)
        pa, ra = V.spots(Aw, m)
        drop = (len(pb) - len(pa)) / len(pb) if len(pb) else 0.0
        rdrop = (rb - ra) / rb if rb else 0.0
        floor = (rb >= 0.5 and rdrop >= 0.40) or (len(pb) >= 4 and drop >= 0.40)
        # the ring hugs what went away: before spots with no after spot within 6 px; a region with no spots (diffuse redness) uses
        # the before red pixels that are not red on the after
        gone = [p for p in pb if not len(pa) or np.hypot(*(pa - p).T).min() > 6]
        if gone:
            pts = np.array(gone, np.float64)
        else:
            mb, ma = redmask(B, m), redmask(Aw, m)
            ys, xs = np.nonzero(mb & ~cv2.dilate(ma.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool))
            pts = np.c_[xs, ys].astype(np.float64) if len(xs) else np.zeros((0, 2))
        pts = pts[(pts[:, 0] >= cx0 + 8) & (pts[:, 0] <= cx1 - 8) & (pts[:, 1] >= cy0 + 8) & (pts[:, 1] <= cy1 - 8)] if len(pts) else pts
        rec = {"spots_before": len(pb), "spots_after": len(pa), "spots_gone": len(gone), "red_area_pct_before": round(rb, 2), "red_area_pct_after": round(ra, 2),
               "spot_drop_pct": round(drop * 100, 1), "red_drop_pct": round(rdrop * 100, 1), "clears_floor": bool(floor)}
        ring = None
        rec["clusters"] = []
        # one ring per cluster of what went away (single linkage, 30 source px), each sized tight to its cluster
        groups = []
        for q in pts:
            hit = [g for g in groups if min(np.hypot(*(np.array(g) - q).T)) <= 30]
            merged = [q] + [p for g in hit for p in g]
            groups = [g for g in groups if not any(g is h for h in hit)] + [merged]
        for g in sorted(groups, key=len, reverse=True):
            g = np.array(g, np.float64)
            if not floor or len(g) < (1 if gone else 12):  # red-pixel clusters need >= 12 px to count
                continue
            lo, hi = np.percentile(g, 3, axis=0), np.percentile(g, 97, axis=0)
            c = (lo + hi) / 2
            rx, ry = max(9.0, (hi[0] - lo[0]) / 2 + 7), max(9.0, (hi[1] - lo[1]) / 2 + 7)
            ok = bool(c[1] - ry > lid)
            rec["clusters"].append({"src_px": [round(float(c[0]), 1), round(float(c[1]), 1), round(rx, 1), round(ry, 1)], "n": len(g), "below_lid": ok})
            if ok and ring is None and rn not in REJECT:
                ring = {"id": rn, "label": NAMES[rn], "cx": (c[0] - cx0) * s, "cy": (c[1] - cy0) * s, "rx": rx * s, "ry": ry * s,
                        "spots_before": len(pb), "spots_after": len(pa), "red_before": round(rb, 1), "red_after": round(ra, 1)}
                rings.append(ring)
        rec["ringed"] = ring is not None
        if rn in REJECT:
            rec["rejected"] = REJECT[rn]
        out[rn] = rec
        if DBG:
            os.makedirs(DBG, exist_ok=True)
            for tag, im, pts in (("b", B, pb), ("a", Aw, pa)):
                v = im.copy()
                v[m == 0] = (v[m == 0] * .55).astype(np.uint8)
                for x, y in pts:
                    cv2.circle(v, (int(x), int(y)), 5, (0, 255, 255), 1)
                for cl in rec["clusters"]:
                    q = cl["src_px"]
                    cv2.ellipse(v, (int(q[0]), int(q[1])), (int(q[2]), int(q[3])), 0, 0, 360, (255, 255, 255) if cl["below_lid"] else (0, 0, 255), 1)
                cv2.line(v, (0, int(lid)), (v.shape[1], int(lid)), (255, 0, 255), 1)
                v = v[cy0:cy1, cx0:cx1]
                cv2.imwrite(os.path.join(DBG, f"{rn}_{tag}.png"), cv2.resize(v, None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST))
    # play order: the treated cheek first, then the rest top to bottom
    ORDER = ["cheek_r", "forehead", "cheek_l", "nose", "chin", "jaw_r", "jaw_l"]
    geo["rings"] = sorted(rings, key=lambda r: ORDER.index(r["id"]))
    geo["regions"] = out
    geo["lid_y_window"] = (lid - cy0) * s
    json.dump(geo, open(GEO, "w"), indent=1)
    print(json.dumps({"regions": out, "rings": rings}, indent=1))


if __name__ == "__main__":
    main()
