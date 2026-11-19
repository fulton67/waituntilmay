"""Before/after v2 (research/ostad/style/beforeafter_v2/README.md): align each pair and measure what changed, so the white marks
on the v2 tiles land only where a measured difference exists.

For every pair:
  1. MediaPipe FaceLandmarker (local model) on before and after.
  2. Align the after to the before with a similarity transform (scale, rotation, shift) fitted on stable landmarks
     (eye corners 33/133/263/362, nose bridge 6/168, nose tip 1); the residual is reported in % of the inter-ocular distance.
  3. Regions from landmarks (cheeks, or the chin for a profile), measured on both photos in the before's frame:
       spots    inflamed spots = connected blobs where Lab a* exceeds its 31 px median by >= 3.5 (ba_measure.py rule, one level more sensitive),
                counted per region, with red-area %
     A region gets a mark only when the change clears the noise floor: red area >= 0.5 % before and down >= 40 %, or >= 4 spots
     down >= 40 %.
  4. The chin (P0013) is measured against his own drawn guide line (row profile of the white line vs the first skin column).
Writes public/brand/ostad/stills/ba/v2.js (window.V2, coordinates as fractions of each source image) and
research/ostad/style/beforeafter_v2/measure.json. Sources stay in the gitignored ba/src/v2 (patient photos are never committed).
usage: style-venv python -I brand/scripts/ba_v2_measure.py [--debug DIR]"""
import json, os, sys
import cv2
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "public", "brand", "ostad", "stills", "ba", "src", "v2")
MODEL = "C:/Users/naimj/tools/models/face_landmarker.task"
DBG = sys.argv[sys.argv.index("--debug") + 1] if "--debug" in sys.argv else None
STABLE = [33, 133, 263, 362, 6, 168, 1]
# cheek polygons (MediaPipe ids) below the eye: the region starts under the lower lid, never above it
CHEEK = {"r": [116, 117, 118, 119, 100, 142, 203, 206, 216, 192, 213, 147, 123],
         "l": [345, 346, 347, 348, 329, 371, 423, 426, 436, 416, 433, 376, 352]}
JAW = {"r": [132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 433, 416, 434, 430, 431, 262, 428, 199, 208, 32, 211, 210, 214, 192, 213]}

# pairs: name -> (file, crop box in source px) for before and after; composite sheets are cut on their measured seams
PAIRS = {
    "p0005": {"b": ("p0005_b.jpg", None), "a": ("p0005_a.jpg", None), "regions": ["cheek_near", "jaw_near"],
              "meta": {"patient": "P0005", "procedure": "acne", "angle": "right profile", "days": 137}},
    "p0028": {"b": ("p0028_ba.jpg", (0, 0, 1013, 1396)), "a": ("p0028_ba.jpg", (1015, 0, 2048, 1396)), "regions": ["cheek_r", "cheek_l"],
              "meta": {"patient": "P0028", "procedure": "acne scars", "angle": "frontal", "days": 15}},
    "p0010": {"b": ("p0010_grid.jpg", (154, 0, 540, 496)), "a": ("p0010_grid.jpg", (540, 540, 926, 1053)), "regions": ["cheek_r", "cheek_l"],
              "meta": {"patient": "P0010", "procedure": "AviClear (1726 nm laser)", "angle": "frontal", "days": None},
              "visits": [(154, 0, 540, 496), (540, 0, 926, 496), (154, 540, 540, 1036), (540, 540, 926, 1053)]},
}


def lm(img):
    f = min(1.0, 1600 / max(img.shape[:2]))  # detect on a <= 1600 px copy (large phone originals miss profiles), scale back
    if f < 1.0:
        L = _lm(cv2.resize(img, None, fx=f, fy=f, interpolation=cv2.INTER_AREA))
        return None if L is None else L / f
    return _lm(img)


def _lm(img):
    import mediapipe as mp
    V = mp.tasks.vision
    o = V.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=MODEL), running_mode=V.RunningMode.IMAGE, num_faces=1)
    with V.FaceLandmarker.create_from_options(o) as f:
        r = f.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))))
    if not r.face_landmarks:
        return None
    h, w = img.shape[:2]
    return np.array([[p.x * w, p.y * h] for p in r.face_landmarks[0]], np.float32)


def load(spec):
    f, box = spec
    im = cv2.imread(os.path.join(SRC, f))
    if box:
        x0, y0, x1, y1 = box; im = im[y0:y1, x0:x1]
    return im


def spots(img, mask):
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    a = lab[..., 1]
    k = max(31, int(min(img.shape[:2]) / 40) | 1)
    ex = a - cv2.medianBlur(np.clip(a, 0, 255).astype(np.uint8), min(k, 255)).astype(np.float32)
    s = ((ex >= 3.5) & (lab[..., 0] < 235) & (mask > 0)).astype(np.uint8)
    s = cv2.morphologyEx(s, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, _, st, cen = cv2.connectedComponentsWithStats(s)
    sc = (min(img.shape[:2]) / 900.0) ** 2  # area limits scale with the image
    keep = [i for i in range(1, n) if 5 * sc <= st[i, cv2.CC_STAT_AREA] <= 400 * sc]
    return cen[keep] if keep else np.zeros((0, 2)), float(s[mask > 0].mean() * 100) if (mask > 0).any() else 0.0


def region_poly(L, name):
    if name.startswith("cheek_") and name != "cheek_near":
        return L[CHEEK[name[-1]]]
    # profile: the side nearer the camera is the one whose cheek polygon is larger in the image
    side = max("rl", key=lambda s: cv2.contourArea(cv2.convexHull(L[CHEEK[s]])))
    if name == "cheek_near":
        return L[CHEEK[side]]
    ids = JAW["r"] if side == "r" else [i for i in JAW["r"]]
    return L[ids]


def measure_pair(name, P):
    B, A = load(P["b"]), load(P["a"])
    LB, LA = lm(B), lm(A)
    rec = {"meta": P["meta"], "b_size": [B.shape[1], B.shape[0]], "a_size": [A.shape[1], A.shape[0]], "face": [LB is not None, LA is not None]}
    if LB is None or LA is None:
        return rec
    M, _ = cv2.estimateAffinePartial2D(LA[STABLE], LB[STABLE], method=cv2.LMEDS)
    Aw = cv2.warpAffine(A, M, (B.shape[1], B.shape[0]), flags=cv2.INTER_LINEAR)
    LAw = (np.c_[LA, np.ones(len(LA))] @ M.T).astype(np.float32)
    iod = float(np.linalg.norm(LB[33] - LB[263])) or 1.0
    rec["align"] = {"scale": round(float(np.hypot(M[0, 0], M[1, 0])), 4), "rot_deg": round(float(np.degrees(np.arctan2(M[1, 0], M[0, 0]))), 2),
                    "resid_pct_iod": round(float(np.linalg.norm(LAw[STABLE] - LB[STABLE], axis=1).mean() / iod * 100), 2),
                    "M": [[round(float(v), 5) for v in r] for r in M]}
    Minv = cv2.invertAffineTransform(M)
    rec["regions"] = {}
    for rn in P["regions"]:
        poly = region_poly(LB, rn)
        m = np.zeros(B.shape[:2], np.uint8); cv2.fillConvexPoly(m, cv2.convexHull(poly.astype(np.int32)), 255)
        valid = cv2.warpAffine(np.full(A.shape[:2], 255, np.uint8), M, (B.shape[1], B.shape[0]))
        m = cv2.bitwise_and(m, valid)
        pb, rb = spots(B, m); pa, ra = spots(Aw, m)
        drop = (len(pb) - len(pa)) / len(pb) if len(pb) else 0.0
        rdrop = (rb - ra) / rb if rb else 0.0
        # mark only above the noise floor: red area >= 0.5 % of the region before and down >= 40 %, or >= 4 spots down >= 40 %
        marked = (rb >= 0.5 and rdrop >= 0.40) or (len(pb) >= 4 and drop >= 0.40)
        (cx, cy), (ew, eh), ang = cv2.fitEllipse(cv2.convexHull(poly.astype(np.float32))) if len(poly) >= 5 else ((0, 0), (0, 0), 0)
        # the same ellipse in the after's own (unwarped) pixels, for marks drawn on the untouched after photo
        ca = Minv @ np.array([cx, cy, 1.0]); s = 1 / rec["align"]["scale"]
        rec["regions"][rn] = {"spots_before": int(len(pb)), "spots_after": int(len(pa)), "red_area_pct_before": round(rb, 2),
                              "red_area_pct_after": round(ra, 2), "drop_pct": round(drop * 100, 1), "red_drop_pct": round(rdrop * 100, 1), "marked": bool(marked),
                              "ellipse_b": [round(cx / B.shape[1], 4), round(cy / B.shape[0], 4), round(ew / B.shape[1], 4), round(eh / B.shape[0], 4), round(ang, 1)],
                              "ellipse_a": [round(ca[0] / A.shape[1], 4), round(ca[1] / A.shape[0], 4), round(ew * s / A.shape[1], 4), round(eh * s / A.shape[0], 4), round(ang - rec["align"]["rot_deg"], 1)],
                              "spots_b": [[round(x / B.shape[1], 4), round(y / B.shape[0], 4)] for x, y in pb]}
        if DBG:
            os.makedirs(DBG, exist_ok=True)
            for tag, im, pts in (("b", B, pb), ("a", Aw, pa)):
                v = im.copy(); v[m == 0] = (v[m == 0] * .45).astype(np.uint8)
                for x, y in pts: cv2.circle(v, (int(x), int(y)), max(4, B.shape[1] // 200), (0, 255, 255), 2)
                cv2.imwrite(os.path.join(DBG, f"{name}_{rn}_{tag}.jpg"), v)
    # anchor points for the layout (fractions of each own image): eyes, nose tip, chin, lower-lid line
    for tag, L, im in (("b", LB, B), ("a", LA, A)):
        rec[f"lm_{tag}"] = {k: [round(float(L[i][0]) / im.shape[1], 4), round(float(L[i][1]) / im.shape[0], 4)]
                            for k, i in {"eye_r": 33, "eye_l": 263, "nose": 1, "chin": 152, "lid_r": 145, "lid_l": 374, "brow_mid": 9}.items()}
    return rec


def visits(P):
    im = cv2.imread(os.path.join(SRC, P["b"][0])); out = []
    for i, (x0, y0, x1, y1) in enumerate(P["visits"]):
        c = im[y0:y1, x0:x1]; L = lm(c)
        if L is None:
            out.append({"visit": i, "face": False}); continue
        n = 0; ra = 0.0
        for s in "rl":
            m = np.zeros(c.shape[:2], np.uint8); cv2.fillConvexPoly(m, cv2.convexHull(L[CHEEK[s]].astype(np.int32)), 255)
            p, r = spots(c, m); n += len(p); ra += r / 2
        out.append({"visit": i, "face": True, "cheek_spots": int(n), "red_area_pct": round(ra, 2)})
    return out


def chin():
    """P0013: his drawn white guide line vs the chin's leading edge, per panel (seams measured at x = 525)."""
    im = cv2.imread(os.path.join(SRC, "p0013_ba.jpg")); out = {}
    for tag, (x0, x1) in (("b", (0, 525)), ("a", (527, 1080))):
        c = im[:, x0:x1]; hsv = cv2.cvtColor(c, cv2.COLOR_BGR2HSV); g = cv2.cvtColor(c, cv2.COLOR_BGR2GRAY)
        white = (hsv[..., 1] < 40) & (hsv[..., 2] > 225)
        h, w = g.shape; rows = []
        for y in range(int(h * .35), int(h * .72)):
            xs = np.nonzero(white[y, : int(w * .6)])[0]
            if len(xs) == 0 or len(xs) > 12:
                continue
            lx = float(xs.mean())
            # first skin pixel right of the line: background is dark grey; skin brighter and warmer
            row = c[y].astype(int); skin = (row[:, 2] > 110) & (row[:, 2] - row[:, 0] > 18)
            sx = [x for x in range(int(lx) + 4, w) if skin[x] and skin[min(w - 1, x + 3)]]
            if sx:
                rows.append((y, lx, sx[0]))
        if not rows:
            out[tag] = None; continue
        ys = np.array([r[0] for r in rows]); line = np.array([r[1] for r in rows]); edge = np.array([r[2] for r in rows])
        # chin point: the most forward (smallest x) skin edge in the lower 40 % of the measured rows
        lo = ys >= np.percentile(ys, 60); k = np.argmin(np.where(lo, edge, 1e9))
        L = float(np.hypot(line[-1] - line[0], ys[-1] - ys[0]))
        out[tag] = {"chin_xy": [round((x0 + edge[k]) / 1080, 4), round(ys[k] / 1080, 4)], "line_xy": [round((x0 + line[k]) / 1080, 4), round(ys[k] / 1080, 4)],
                    "gap_px": round(float(edge[k] - line[k]), 1), "line_len_px": round(L, 1), "gap_pct_line": round(float(edge[k] - line[k]) / L * 100, 1),
                    "line_top": [round((x0 + line[0]) / 1080, 4), round(ys[0] / 1080, 4)], "line_bot": [round((x0 + line[-1]) / 1080, 4), round(ys[-1] / 1080, 4)], "rows": len(rows)}
    return out


def main():
    res = {k: measure_pair(k, P) for k, P in PAIRS.items()}
    res["p0010"]["visits"] = visits(PAIRS["p0010"])
    res["p0013"] = {"meta": {"patient": "P0013", "procedure": "chin filler", "angle": "right profile", "days": 0}, "chin": chin()}
    js = os.path.join(ROOT, "public", "brand", "ostad", "stills", "ba", "v2.js")
    open(js, "w").write("// generated by brand/scripts/ba_v2_measure.py\nwindow.V2=" + json.dumps(res) + ";\n")
    mj = os.path.join(ROOT, "research", "ostad", "style", "beforeafter_v2", "measure.json"); os.makedirs(os.path.dirname(mj), exist_ok=True)
    slim = json.loads(json.dumps(res))
    for r in slim.values():
        for g in (r.get("regions") or {}).values():
            g.pop("spots_b", None)
    json.dump(slim, open(mj, "w"), indent=1)
    for k, r in slim.items():
        print(k, json.dumps({kk: v for kk, v in r.items() if kk in ("face", "align", "regions", "visits", "chin")})[:900])


if __name__ == "__main__":
    main()
