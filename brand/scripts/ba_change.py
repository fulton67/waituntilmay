"""Measure what changed on the registered before/after crops (output of ba_align.py). Grid 5.

Skin sets (acne, avi): inflamed-lesion pixels are a* (red-green) more than T above the local skin median (41 px median,
so lighting and overall flush between visits cancel out), blobs of 6-600 px, inside a landmark skin zone (eyes, brows,
lips and nose excluded). The zone comes from the BEFORE and is reused for every visit (the photos are registered), so
the same anatomy is counted each time. Reports lesion area as % of the zone and the blob count, plus the densest
lesion clusters in the before (circled at identical coordinates in every visit).

Profile (chin): profile outline of before and after on the registered crops, the most projecting chin point (pogonion)
of each, and the forward shift in % of the nasion-to-tip distance.

Writes public/brand/ostad/stills/ba/change.js and a check sheet (argv[1]) with the lesion masks drawn.
"""
import json, sys
import cv2, numpy as np
sys.path.insert(0, "brand/scripts")
import ba_align as A

D = "public/brand/ostad/stills/ba/src/aligned/"
T = 9.0
ZONES = {
  "avi": [[234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454, 1, 4],
          [54, 103, 67, 109, 10, 338, 297, 332, 284, 251, 301, 293, 334, 296, 336, 9, 107, 66, 105, 63, 70, 71, 21]],
  "acne": [[234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 199, 175, 18, 17, 84, 181, 91, 146, 61, 186, 92, 165, 203,
            206, 216, 207, 187, 147, 123, 116, 227, 137, 177]],
}
EXCL = [[33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
        [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
        [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185],
        [70, 63, 105, 66, 107, 55, 65, 52, 53, 46], [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],
        [1, 2, 98, 327, 4, 5, 195, 197, 6, 168, 129, 358, 49, 279, 48, 278, 64, 294]]


def zone_mask(img, L, name):
    h, w = img.shape[:2]
    m = np.zeros((h, w), np.uint8)
    for poly in ZONES[name]:
        cv2.fillPoly(m, [cv2.convexHull(L[poly].astype(np.int32))], 255)
    for poly in EXCL:
        cv2.fillPoly(m, [cv2.convexHull(L[poly].astype(np.int32))], 0)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    skin = (lab[..., 0] > 60) & (lab[..., 1] > 128) & (lab[..., 2] > 128)   # drop hair, headband, backdrop
    return (m > 0) & skin


def lesions(img, mask):
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    a = cv2.GaussianBlur(lab[..., 1], (3, 3), 0)
    a_med = cv2.medianBlur(np.clip(a, 0, 255).astype(np.uint8), 41).astype(np.float32)
    hit = (((a - a_med) > T) & mask).astype(np.uint8)
    hit = cv2.morphologyEx(hit, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab_, st, cen = cv2.connectedComponentsWithStats(hit)
    keep = [i for i in range(1, n) if 6 <= st[i, cv2.CC_STAT_AREA] <= 600]
    return np.isin(lab_, keep), [tuple(cen[i]) for i in keep]


def clusters(pts, w, h, r, k=3):
    if not pts:
        return []
    pts = np.array(pts); used = np.zeros(len(pts), bool); best = []
    d = np.linalg.norm(pts[:, None] - pts[None], axis=2)
    for _ in range(k):
        cnt = ((d < r) & ~used[None]).sum(1); cnt[used] = 0
        i = int(cnt.argmax())
        if cnt[i] < 3:
            break
        sel = (d[i] < r) & ~used
        c = pts[sel].mean(0); used |= sel
        best.append({"c": [round(float(c[0] / w), 4), round(float(c[1] / h), 4)], "n": int(sel.sum())})
    return best


def main():
    det = A.lm_detector(); res = {}; sheet = []
    for name, keys in (("acne", ["acne_0", "acne_1", "acne_2"]), ("avi", ["avi_0", "avi_1", "avi_2", "avi_3"])):
        imgs = [cv2.imread(D + k + ".jpg") for k in keys]
        L0 = det(imgs[0]); base = zone_mask(imgs[0], L0, name); recs = []
        for k, im in zip(keys, imgs):
            Lk = det(im)
            m = base & zone_mask(im, Lk if Lk is not None else L0, name)
            hit, pts = lesions(im, m)
            rec = {"key": k, "area_pct": round(float(hit.sum() / max(m.sum(), 1) * 100), 2), "count": len(pts)}
            if k.endswith("_0"):
                h, w = im.shape[:2]; rec["clusters"] = clusters(pts, w, h, r=w * 0.09)
            recs.append(rec)
            vis = im.copy(); vis[hit] = (255, 80, 0)
            cnts, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            cv2.drawContours(vis, cnts, -1, (255, 255, 255), 2)
            sheet.append(cv2.resize(vis, (360, 450)))
        res[name] = recs
        print(name, [(r["key"], r["area_pct"], r["count"]) for r in recs], "clusters", recs[0].get("clusters"))
    a, b = cv2.imread(D + "chin_0.jpg"), cv2.imread(D + "chin_1.jpg")
    pa, xa = A.profile_points(a); pb, xb = A.profile_points(b)
    h, w = a.shape[:2]
    def pogonion(xs):
        """lower lip (most projecting, 60-80 % height) -> labiomental fold (deepest below it) -> chin (most projecting below)."""
        a0, a1 = int(h * .60), int(h * .80)
        lip = a0 + int(np.nanargmin(xs[a0:a1]))
        fold = lip + int(np.nanargmax(xs[lip:lip + int(h * .12)]))
        return fold + int(np.nanargmin(xs[fold:int(h * .97)]))
    ya, yb = pogonion(xa), pogonion(xb)
    nose = float(np.linalg.norm(pa[1] - pa[0]))
    shift = (xa[ya] - xb[yb]) / nose * 100
    res["chin"] = {"before_outline": [None if np.isnan(v) else round(float(v / w), 4) for v in xa],
                   "after_outline": [None if np.isnan(v) else round(float(v / w), 4) for v in xb],
                   "pog_before": [round(float(xa[ya] / w), 4), round(ya / h, 4)],
                   "pog_after": [round(float(xb[yb] / w), 4), round(yb / h, 4)],
                   "shift_pct_nose": round(float(shift), 1), "h": h, "w": w}
    print("chin pogonion shift", round(float(shift), 1), "% of nasion-tip", res["chin"]["pog_before"], res["chin"]["pog_after"])
    vis = b.copy()
    for y in range(h):
        if not np.isnan(xa[y]):
            cv2.circle(vis, (int(xa[y]), y), 2, (255, 255, 255), -1)
    for (x, y) in ((xa[ya], ya), (xb[yb], yb)):
        cv2.circle(vis, (int(x), int(y)), 8, (0, 0, 255), 2)
    v = cv2.resize(vis, (360, int(360 * h / w)))
    sheet.append(v[:450] if v.shape[0] >= 450 else cv2.copyMakeBorder(v, 0, 450 - v.shape[0], 0, 0, cv2.BORDER_CONSTANT))
    with open("public/brand/ostad/stills/ba/change.js", "w") as f:
        f.write("// generated by brand/scripts/ba_change.py\nwindow.CHANGE = " + json.dumps(res) + ";\n")
    cv2.imwrite(sys.argv[1] if len(sys.argv) > 1 else "ba_change_check.jpg", np.hstack(sheet))


if __name__ == "__main__":
    main()
