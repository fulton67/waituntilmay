"""Feed post P0053 rosacea (catalog 10678, clinic tablet 2-up): measure redness on the aligned halves and trace the red zones.

  style-venv python -I brand/scripts/ba_post_p0053.py <IMG_0502.PNG> [--debug DIR]

Panels and alignment are ba_video_p0053.py's (MediaPipe eye corners + nose bridge + tip, similarity, after -> before frame).
Face mask = MediaPipe face oval minus eyes, brows, lips and nostrils, intersected over both faces (before landmarks and the after's
landmarks carried through the same transform). Red = Lab a* above that face's own median + 8 (the shortlist rule). Zones
(forehead, nose, cheeks, chin) are landmark hulls. Evenness = spread (SD) of the five zone mean a* values, and the SD of a* over the
whole mask. Outlines = the before's red map, smoothed (blur + close + open), each blob >= 0.4 % of the face, Chaikin-smoothed.
Crop, scale, rotate, translate only: no grade, no retouch.
Outputs: public/brand/ostad/stills/ba/src/p0053/{before,after}.jpg (gitignored, her face) and ba/p0053.js (numbers + outlines).
"""
import json, os, sys
import cv2, numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ba_video_p0053 as P  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BA = os.path.join(ROOT, "public/brand/ostad/stills/ba")
OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
        172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
HOLES = {
    "eye_r": [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7],
    "eye_l": [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249],
    "brow_r": [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
    "brow_l": [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],
    "lips": [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146],
    "nostrils": [98, 97, 2, 326, 327, 294, 278, 48, 64],
}
ZONES = {
    "forehead": [109, 67, 103, 10, 338, 297, 332, 70, 63, 105, 66, 107, 336, 296, 334, 293, 300, 151, 9],
    "nose": [168, 193, 417, 122, 351, 196, 419, 198, 420, 129, 358, 98, 327, 2, 94],
    "cheek_r": [116, 117, 118, 119, 100, 142, 203, 206, 216, 192, 213, 147, 123, 50, 36, 205, 187, 207],
    "cheek_l": [345, 346, 347, 348, 329, 371, 423, 426, 436, 416, 433, 376, 352, 280, 266, 425, 411, 427],
    "chin": [202, 210, 169, 170, 140, 171, 175, 396, 369, 395, 394, 430, 422, 18, 200, 199, 32, 262],
}
NAMES = {"forehead": "Forehead", "nose": "Nose", "cheek_r": "Right cheek", "cheek_l": "Left cheek", "chin": "Chin"}


def poly(shape, lm, idx, hull=False):
    m = np.zeros(shape, np.uint8)
    p = lm[idx].astype(np.int32)
    cv2.fillPoly(m, [cv2.convexHull(p) if hull else p], 1)
    return m


def facemask(shape, lm):
    m = poly(shape, lm, OVAL)
    for k, idx in HOLES.items():
        h = poly(shape, lm, idx, hull=True)
        m[cv2.dilate(h, np.ones((15, 15), np.uint8)) > 0] = 0
    return m


def chaikin(p, n=4):
    for _ in range(n):
        q = np.roll(p, -1, axis=0)
        p = np.stack([0.75 * p + 0.25 * q, 0.25 * p + 0.75 * q], 1).reshape(-1, 2)
    return p


def resample(p, n=72):
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(np.vstack([p, p[:1]]), axis=0).T))]
    t = np.linspace(0, d[-1], n, endpoint=False)
    c = np.vstack([p, p[:1]])
    return np.c_[np.interp(t, d, c[:, 0]), np.interp(t, d, c[:, 1])]


def main(src, debug=None):
    im = cv2.imread(src)
    pan = {k: im[y0:y1, x0:x1] for k, (x0, y0, x1, y1) in P.PANELS.items()}
    B, A = pan["before"], pan["after"]
    lb, la = P.landmarks(B), P.landmarks(A)
    M, _ = cv2.estimateAffinePartial2D(la[P.KEY], lb[P.KEY], method=cv2.LMEDS)
    h, w = B.shape[:2]
    Aw = cv2.warpAffine(A, M, (w, h), flags=cv2.INTER_LANCZOS4, borderValue=(0, 0, 0))
    valid = cv2.warpAffine(np.full(A.shape[:2], 1, np.uint8), M, (w, h), flags=cv2.INTER_NEAREST)
    law = la @ M[:, :2].T + M[:, 2]
    res = np.linalg.norm(law[P.KEY] - lb[P.KEY], axis=1)
    eye = float(np.linalg.norm(lb[33] - lb[263]))
    fm = facemask((h, w), lb) & facemask((h, w), law) & cv2.erode(valid, np.ones((9, 9), np.uint8))
    out = {"source": {"catalog_id": 10678, "panel_wh": [w, h]},
           "align": {"scale": round(float(np.hypot(*M[0, :2])), 4), "rot_deg": round(float(np.degrees(np.arctan2(M[1, 0], M[0, 0]))), 2),
                     "resid_px_median": round(float(np.median(res)), 2), "resid_pct_eye": round(float(np.median(res) / eye * 100), 2)},
           "face_px": int(fm.sum()), "rule": "Lab a* > face median + 8, landmark face mask (oval minus eyes, brows, lips, nostrils)"}
    zm = {k: poly((h, w), lb, idx, hull=True) & poly((h, w), law, idx, hull=True) & fm for k, idx in ZONES.items()}
    reds = {}
    for k, img in (("before", B), ("after", Aw)):
        a = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)[..., 1].astype(np.float32) - 128
        med = float(np.median(a[fm > 0]))
        red = ((a > med + 8) & (fm > 0)).astype(np.uint8)
        reds[k] = red
        z = {n: {"red_pct": round(float(red[m > 0].mean() * 100), 2), "a_mean": round(float(a[m > 0].mean()), 2), "px": int(m.sum())}
             for n, m in zm.items()}
        zmeans = [v["a_mean"] for v in z.values()]
        out[k] = {"a_median": round(med, 2), "red_pct": round(float(red[fm > 0].mean() * 100), 2),
                  "a_sd_face": round(float(a[fm > 0].std()), 2), "zone_sd": round(float(np.std(zmeans)), 2),
                  "zone_range": round(float(max(zmeans) - min(zmeans)), 2), "zones": z}
        # same absolute threshold as the before (so a whole-face shift can't hide in the per-face median)
        if k == "after":
            out["after"]["red_pct_at_before_threshold"] = round(float(((a > out["before"]["a_median"] + 8) & (fm > 0))[fm > 0].mean() * 100), 2)
    # outlines: the before's red map, smoothed into soft zones
    r = cv2.GaussianBlur(reds["before"].astype(np.float32), (0, 0), 9)
    blob = ((r > 0.35) & (fm > 0)).astype(np.uint8)
    blob = cv2.morphologyEx(blob, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
    blob = cv2.morphologyEx(blob, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    cs, _ = cv2.findContours(blob, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    outl = []
    for c in sorted(cs, key=cv2.contourArea, reverse=True):
        if cv2.contourArea(c) < 0.004 * fm.sum():
            continue
        m = np.zeros((h, w), np.uint8); cv2.drawContours(m, [c], -1, 1, cv2.FILLED)
        m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
        cc = max(cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea)[:, 0, :].astype(np.float64)
        p = resample(chaikin(resample(cc, 40), 4), 96)
        zone = max(zm, key=lambda n: int((zm[n] & m).sum()))
        ra = float(reds["after"][m > 0].mean() * 100); rb = float(reds["before"][m > 0].mean() * 100)
        outl.append({"pts": [[round(float(x), 1), round(float(y), 1)] for x, y in p], "zone": zone, "area_px": int(m.sum()),
                     "red_pct_before": round(rb, 1), "red_pct_after": round(ra, 1)})
    out["outlines"] = outl
    ys, xs = np.where(fm > 0)
    out["face_box"] = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
    out["lm"] = {"eye_r": [round(float(v), 1) for v in lb[33]], "eye_l": [round(float(v), 1) for v in lb[263]],
                 "chin": [round(float(v), 1) for v in lb[152]], "top": [round(float(v), 1) for v in lb[10]], "nose": [round(float(v), 1) for v in lb[1]]}
    out["zone_polys"] = {n: [[round(float(x), 1), round(float(y), 1)] for x, y in cv2.convexHull(lb[idx].astype(np.float32))[:, 0, :]] for n, idx in ZONES.items()}
    out["names"] = NAMES
    sd = os.path.join(BA, "src/p0053"); os.makedirs(sd, exist_ok=True)
    cv2.imwrite(os.path.join(sd, "before.jpg"), B, [cv2.IMWRITE_JPEG_QUALITY, 96])
    cv2.imwrite(os.path.join(sd, "after.jpg"), Aw, [cv2.IMWRITE_JPEG_QUALITY, 96])
    open(os.path.join(BA, "p0053.js"), "w").write("// generated by brand/scripts/ba_post_p0053.py\nwindow.P53=" + json.dumps(out) + ";\n")
    if debug:
        os.makedirs(debug, exist_ok=True)
        sheet = []
        for k, img in (("before", B), ("after", Aw)):
            d = img.copy()
            d[reds[k] > 0] = (d[reds[k] > 0] * 0.4 + np.array([255, 255, 0]) * 0.6).astype(np.uint8)
            cv2.drawContours(d, cv2.findContours(fm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], -1, (0, 255, 0), 2)
            for n, m in zm.items():
                cv2.drawContours(d, cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], -1, (0, 200, 255), 2)
            for o in outl:
                cv2.polylines(d, [np.int32(o["pts"])], True, (255, 255, 255), 3)
            sheet.append(d)
        cv2.imwrite(os.path.join(debug, "p0053_measure.jpg"), cv2.resize(np.hstack(sheet), None, fx=0.6, fy=0.6))
    print(json.dumps({k: v for k, v in out.items() if k not in ("outlines", "zone_polys", "lm")}, indent=1))
    print("outlines:", [(o["zone"], o["area_px"], o["red_pct_before"], o["red_pct_after"]) for o in outl])


if __name__ == "__main__":
    dbg = sys.argv[sys.argv.index("--debug") + 1] if "--debug" in sys.argv else None
    main(sys.argv[1], dbg)
