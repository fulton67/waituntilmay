"""Measure what changed in each before/after so the tile's arrows land on the real change (no guessed positions).

For every panel (a crop of a catalog preview, in preview pixels):
  landmarks : MediaPipe FaceLandmarker (local model, this PC only), image mode
  skin      : face-oval hull from the landmarks, or a YCrCb skin mask when no face is found (profiles), minus eyes / brows / lips
  spots     : inflamed spots = connected blobs where Lab a* exceeds its 41 px median by >= 9 and luma is not specular,
              area 8-600 px; centroids + count; densest cluster centre = where the arrow should land
  profile   : for profile panels, the face silhouette's leading edge (first foreground column per row against the dark backdrop)
              between the nose tip and below the chin; before/after aligned on the nose tip
Writes public/brand/ostad/stills/ba/marks.js (window.MARKS, coordinates as % of each panel) and debug overlays to --debug.
usage: python -I brand/scripts/ba_measure.py [--debug DIR]"""
import json, os, sys
import cv2
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "public", "brand", "ostad", "stills", "ba", "src")
MODEL = "C:/Users/naimj/tools/models/face_landmarker.task"
DBG = sys.argv[sys.argv.index("--debug") + 1] if "--debug" in sys.argv else None

# panel crops in preview px: (file, x0, y0, x1, y1)
PANELS = {
    "avi_0": ("02965.jpg", 146, 0, 512, 470), "avi_1": ("02965.jpg", 512, 0, 878, 470),
    "avi_2": ("02965.jpg", 146, 512, 512, 982), "avi_3": ("02965.jpg", 512, 512, 878, 982),
    "acne_b": ("09736.jpg", 0, 0, 768, 1024), "acne_a": ("08278.jpg", 0, 0, 768, 1024),
    "chin_b": ("06069.jpg", 0, 0, 512, 696), "chin_a": ("06069.jpg", 512, 0, 1024, 696),
}
OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172,
        58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
HOLES = {"leye": [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
         "reye": [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466],
         "lips": [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185],
         "lbrow": [70, 63, 105, 66, 107, 55, 65, 52, 53, 46], "rbrow": [300, 293, 334, 296, 336, 285, 295, 282, 283, 276]}


def landmarks(img):
    import mediapipe as mp
    V = mp.tasks.vision
    opts = V.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=MODEL), running_mode=V.RunningMode.IMAGE, num_faces=1)
    with V.FaceLandmarker.create_from_options(opts) as lm:
        r = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB)))
    if not r.face_landmarks:
        return None
    h, w = img.shape[:2]
    return np.array([[p.x * w, p.y * h] for p in r.face_landmarks[0]], np.float32)


def skin_mask(img, L):
    h, w = img.shape[:2]
    m = np.zeros((h, w), np.uint8)
    if L is not None:
        cv2.fillConvexPoly(m, cv2.convexHull(L[OVAL].astype(np.int32)), 255)
        for idx in HOLES.values():
            hull = cv2.convexHull(L[idx].astype(np.int32))
            cv2.fillConvexPoly(m, hull, 0)
            cv2.drawContours(m, [hull], -1, 0, 14)
    else:
        ycc = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
        m = cv2.inRange(ycc, (60, 135, 85), (255, 180, 135))
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
        n, lab, st, _ = cv2.connectedComponentsWithStats(m)
        if n > 1:
            k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])); m = np.where(lab == k, 255, 0).astype(np.uint8)
        m = cv2.erode(m, np.ones((15, 15), np.uint8))
    return m


def spots(img, mask):
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    a = lab[..., 1]
    ex = a - cv2.medianBlur(np.clip(a, 0, 255).astype(np.uint8), 31).astype(np.float32)
    s = ((ex >= 4.5) & (lab[..., 0] < 235) & (mask > 0)).astype(np.uint8)
    s = cv2.morphologyEx(s, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, _, st, cen = cv2.connectedComponentsWithStats(s)
    keep = [i for i in range(1, n) if 5 <= st[i, cv2.CC_STAT_AREA] <= 400]
    pts = cen[keep] if keep else np.zeros((0, 2))
    return pts, float(s[mask > 0].mean()) if (mask > 0).any() else 0.0


def densest(pts, r=70):
    if len(pts) == 0:
        return None
    best = max(range(len(pts)), key=lambda i: int((np.hypot(*(pts - pts[i]).T) < r).sum()))
    near = pts[np.hypot(*(pts - pts[best]).T) < r]
    return near.mean(0), len(near)


def profile_edge(img, y0, y1):
    g = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (5, 5), 0)
    bg = np.median(g[:, 20:44], axis=1, keepdims=True).astype(np.float32)
    fg = (np.abs(g.astype(np.float32) - bg) > 24) & (g < 225)
    fg = cv2.morphologyEx(fg.astype(np.uint8), cv2.MORPH_OPEN, np.ones((7, 7), np.uint8)) > 0
    xs = []
    for y in range(int(y0), int(y1)):
        c = np.nonzero(fg[y, 44:])[0]
        xs.append((y, int(c[0]) + 44 if len(c) else None))
    return xs


def main():
    out, cache = {}, {}
    for key, (f, x0, y0, x1, y1) in PANELS.items():
        if f not in cache:
            cache[f] = cv2.imread(os.path.join(SRC, f))
        img = cache[f][y0:y1, x0:x1].copy()
        h, w = img.shape[:2]
        L = landmarks(img)
        m = skin_mask(img, L)
        pts, frac = spots(img, m)
        d = densest(pts)
        rec = {"w": w, "h": h, "face": L is not None, "spot_count": int(len(pts)), "red_area_pct": round(frac * 100, 2),
               "spots_pct": [[round(float(x) / w * 100, 2), round(float(y) / h * 100, 2)] for x, y in pts],
               "cluster_pct": [round(float(d[0][0]) / w * 100, 2), round(float(d[0][1]) / h * 100, 2)] if d else None,
               "cluster_n": d[1] if d else 0}
        if L is not None:
            for name, i in {"nose_tip": 4, "chin": 152, "l_cheek": 50, "r_cheek": 280, "forehead": 151, "jaw_l": 172, "jaw_r": 397}.items():
                rec[name] = [round(float(L[i][0]) / w * 100, 2), round(float(L[i][1]) / h * 100, 2)]
        out[key] = rec
        if DBG:
            os.makedirs(DBG, exist_ok=True)
            v = img.copy(); v[m == 0] = (v[m == 0] * 0.4).astype(np.uint8)
            for x, y in pts: cv2.circle(v, (int(x), int(y)), 6, (255, 200, 0), 1)
            if d: cv2.circle(v, tuple(int(c) for c in d[0]), 70, (0, 255, 0), 2)
            cv2.imwrite(os.path.join(DBG, f"{key}.jpg"), v)
    # chin: leading-edge profiles, aligned on the nose tip (row of max forward x above the lips)
    for k in ("chin_b", "chin_a"):
        f, x0, y0, x1, y1 = PANELS[k]; img = cache[f][y0:y1, x0:x1]
        e = profile_edge(img, img.shape[0] * 0.30, img.shape[0] * 0.98)
        ys = [y for y, x in e if x is not None]
        nose = min((t for t in e if t[1] is not None and t[0] < img.shape[0] * 0.70), key=lambda t: t[1])
        out[k]["edge"] = [[x, y] for y, x in e if x is not None][::4]
        out[k]["nose_edge"] = list(nose)
    b, a = out["chin_b"], out["chin_a"]
    dx = a["nose_edge"][0] - b["nose_edge"][0]; dy = a["nose_edge"][1] - b["nose_edge"][1]
    bmap = {y + dy: x + dx for x, y in b["edge"]}
    diffs = [(y, bmap[y] - x) for x, y in a["edge"] if y in bmap and y > a["nose_edge"][1] + 60]
    if diffs:
        y, d = max(diffs, key=lambda t: t[1])
        out["chin_shift"] = {"at_y_pct": round(y / a["h"] * 100, 2), "px": d, "pct_nose_to_chin": None}
        if "chin" in a and "nose_tip" in a:
            nc = (a["chin"][1] - a["nose_tip"][1]) / 100 * a["h"]
            out["chin_shift"]["pct_nose_to_chin"] = round(d / nc * 100, 1) if nc else None
        out["chin_b_edge_on_a"] = [[round((x + dx) / a["w"] * 100, 2), round((y + dy) / a["h"] * 100, 2)] for x, y in b["edge"]]
    open(os.path.join(ROOT, "public", "brand", "ostad", "stills", "ba", "marks.js"), "w").write("window.MARKS=" + json.dumps(out) + ";\n")
    print(json.dumps({k: {kk: v for kk, v in r.items() if kk in ("face", "spot_count", "red_area_pct", "cluster_pct", "cluster_n")} if isinstance(r, dict) and "w" in r else r
                      for k, r in out.items() if k != "chin_b_edge_on_a"}, indent=0)[:3000])


if __name__ == "__main__":
    main()
