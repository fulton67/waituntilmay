"""P0010 AviClear slider video, round 5: lesion outlines from the user's own markup (2026-11-19).

The user drew 8 regions on a screenshot of the Story (BEFORE side): "the circles should be this many, skinny-ish lines, and better
circles than these". Their regions are the ground truth for WHERE to mark (they override the measurement filter of
ba_story_regions.py). This script:
  1. registers the screenshot to a rendered Story frame (SIFT on the photo, similarity fit, RANSAC) and maps it into the photo
     window's own pixels (the k = 1 window of public/ba-story/p0010_before.png, 940x1010);
  2. pulls the user's white strokes out of the photo window (pills, handle and rim excluded), one region per stroke group, and fills
     each into a region mask;
  3. inside each region thresholds the v2 red map of the before (Lab a* over its local median by >= 3.5, measured on the source panel
     and mapped into the window), merges nearby blobs, takes the lesion contour, dilates it a few px and smooths it (Chaikin); with no
     clear blob it uses the smoothed user outline. Outlines stay >= 8 px inside the window.
Writes "outlines" (window px at k = 1, closed, starting at the top, clockwise) into the gitignored public/ba-story/p0010.json and an
overlay PNG for a visual check.
usage: python -I brand/scripts/ba_story_outlines.py <markup.png> <story_frame.png> <overlay_out.png>
"""
import json
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PUB = os.path.join(ROOT, "brand/remotion/public/ba-story")
SRC = os.path.join(ROOT, "public/brand/ostad/stills/ba/src/v2/p0010_grid.jpg")
VB = (154, 0, 540, 496)                      # before panel in the sheet (as measured)
K, X0, Y0 = 0.85, (1080 - 940 * 0.85) / 2, 376  # Story layout (Story.tsx LAYOUTS.story)
GROUPS = [("forehead", "Forehead"), ("middle", "Nose and cheeks"), ("chin", "Chin")]


def redmask(img):
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    a = lab[..., 1]
    k = max(31, int(min(img.shape[:2]) / 40) | 1)
    ex = a - cv2.medianBlur(np.clip(a, 0, 255).astype(np.uint8), min(k, 255)).astype(np.float32)
    r = ((ex >= 3.5) & (lab[..., 0] < 235)).astype(np.uint8)
    return cv2.morphologyEx(r, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))


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


def main():
    mk, fr, ov = sys.argv[1], sys.argv[2], sys.argv[3]
    geo = json.load(open(os.path.join(PUB, "p0010.json")))
    W1, H1 = geo["win"]
    S = cv2.imread(mk)
    F = cv2.imread(fr)
    # 1. register: screenshot -> story frame, on the photo only (white strokes masked out of the features)
    g1, g2 = cv2.cvtColor(S, cv2.COLOR_BGR2GRAY), cv2.cvtColor(F, cv2.COLOR_BGR2GRAY)
    white = ((S.min(2) > 225) & (S.max(2).astype(int) - S.min(2) < 30)).astype(np.uint8)
    m1 = (1 - cv2.dilate(white, np.ones((9, 9), np.uint8))) * 255
    m2 = np.zeros_like(g2); m2[int(Y0):int(Y0 + H1 * K), int(X0):int(X0 + W1 * K)] = 255
    sift = cv2.SIFT_create(4000)
    k1, d1 = sift.detectAndCompute(g1, m1)
    k2, d2 = sift.detectAndCompute(g2, m2)
    mt = [m for m, n in cv2.BFMatcher().knnMatch(d1, d2, k=2) if m.distance < 0.75 * n.distance]
    A, inl = cv2.estimateAffinePartial2D(np.float32([k1[m.queryIdx].pt for m in mt]), np.float32([k2[m.trainIdx].pt for m in mt]),
                                         method=cv2.RANSAC, ransacReprojThreshold=2.0)
    res = np.linalg.norm((np.c_[np.float32([k1[m.queryIdx].pt for m in mt]), np.ones(len(mt))] @ A.T) - np.float32([k2[m.trainIdx].pt for m in mt]), axis=1)[inl.ravel() > 0]
    reg = {"matches": len(mt), "inliers": int(inl.sum()), "scale": round(float(np.hypot(A[0, 0], A[1, 0])), 4), "resid_px_median": round(float(np.median(res)), 2)}
    # screenshot -> window px at k = 1
    T = np.array([[1 / K, 0, -X0 / K], [0, 1 / K, -Y0 / K]]) @ np.vstack([A, [0, 0, 1]])
    # 2. the user's strokes, inside the photo (rim, pills and handle masked), in window px
    sw = cv2.warpAffine(white * 255, T, (W1, H1), flags=cv2.INTER_NEAREST)
    keep = np.zeros((H1, W1), np.uint8); keep[10:H1 - 10, 10:W1 - 10] = 255
    for (x0, y0, x1, y1) in ((0, H1 - 140, 230, H1), (W1 - 230, H1 - 140, W1, H1), (0, int(H1 * .3) - 60, 90, int(H1 * .3) + 60)):
        keep[y0:y1, x0:x1] = 0   # AFTER / BEFORE pills, the handle at the left edge
    sw = cv2.bitwise_and(sw, keep)
    grp = cv2.dilate(sw, np.ones((7, 7), np.uint8))
    n, lab, st, cen = cv2.connectedComponentsWithStats(grp)
    regs = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > 1500]
    # 3. the before's red map, on the source panel, mapped into the window
    B = cv2.imread(SRC)[VB[1]:VB[3], VB[0]:VB[2]]
    cx0, cy0 = geo["crop_before_px"][:2]
    s = geo["scale"]
    Mw = np.array([[s, 0, -cx0 * s], [0, s, -cy0 * s]], np.float64)
    red = cv2.warpAffine(redmask(B) * 255, Mw, (W1, H1), flags=cv2.INTER_LINEAR)
    red = (red > 127).astype(np.uint8)
    out = []
    for i in regs:
        stroke = ((lab == i) & (sw > 0)).astype(np.uint8) * 255
        # fill the hand outline: close small gaps, then fill the outer contour (hull if it stays open)
        cl = cv2.morphologyEx(stroke, cv2.MORPH_CLOSE, np.ones((31, 31), np.uint8))
        cs, _ = cv2.findContours(cl, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        region = np.zeros_like(stroke)
        cv2.drawContours(region, cs, -1, 255, cv2.FILLED)
        if region.sum() / 255 < 2.5 * (stroke.sum() / 255):
            region = np.zeros_like(stroke); cv2.fillConvexPoly(region, cv2.convexHull(np.vstack(cs)), 255)
        inner = cv2.erode(region, np.ones((9, 9), np.uint8))
        blob = cv2.morphologyEx(red & (inner > 0), cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
        bc, _ = cv2.findContours(blob, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        bc = [c for c in bc if cv2.contourArea(c) >= 40]
        ra = region.sum() / 255
        src = "lesion"
        if bc:
            # every lesion blob in the region, joined: their hull, dilated by a few px
            m = np.zeros_like(region); cv2.fillConvexPoly(m, cv2.convexHull(np.vstack(bc)), 255)
            m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17)))
            # a lesion far smaller than a large drawn region (a cheek, the chin) means the user marked the whole area: trace the region
            if m.sum() / 255 < (0.08 if ra < 6000 else 0.25) * ra:
                m, src = cv2.erode(region, np.ones((5, 5), np.uint8)), "user"
        else:
            m, src = cv2.erode(region, np.ones((5, 5), np.uint8)), "user"
        # keep 16 px off the window edges before tracing, so an outline that meets the edge is rounded by the smoothing, not cut flat
        m[:16], m[-16:], m[:, :16], m[:, -16:] = 0, 0, 0, 0
        c = max(cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea)[:, 0, :].astype(np.float64)
        p = resample(chaikin(resample(c, 48), 4), 96)
        p[:, 0] = np.clip(p[:, 0], 8, W1 - 8); p[:, 1] = np.clip(p[:, 1], 8, H1 - 8)
        # start at the top, clockwise on screen (positive signed area in y-down coordinates)
        if (np.roll(p[:, 0], -1) * p[:, 1] - p[:, 0] * np.roll(p[:, 1], -1)).sum() > 0:
            p = p[::-1]
        p = np.roll(p, -int(np.argmin(p[:, 1])), axis=0)
        x, y = p.mean(0)
        out.append({"pts": [[round(float(a), 1), round(float(b), 1)] for a, b in p], "cx": round(float(x), 1), "cy": round(float(y), 1), "src": src,
                    "bbox": [round(float(p[:, 0].min()), 1), round(float(p[:, 1].min()), 1), round(float(p[:, 0].max()), 1), round(float(p[:, 1].max()), 1)]})
    # name and group by position: eye line from the measured landmarks (measure.json lm_b)
    eye_y = (0.513 * VB[3] - cy0) * s  # eye line from measure.json p0010.lm_b (eyes at 0.510 / 0.517 of the panel height)
    for o in out:
        x, y = o["cx"], o["cy"]
        if y < eye_y - 90:
            o["region"], o["group"] = "forehead", 0
        elif y < eye_y + 60:
            o["region"], o["group"] = "nose bridge", 1
        elif y > H1 * 0.8:
            o["region"], o["group"] = "chin", 2
        else:
            o["region"], o["group"] = ("right cheek" if x < W1 / 2 else "left cheek"), 1
    out.sort(key=lambda o: (o["group"], o["cx"]))
    geo["outlines"] = out
    geo["outline_registration"] = reg
    json.dump(geo, open(os.path.join(PUB, "p0010.json"), "w"), indent=1)
    # overlay for the visual check: user strokes (yellow) and the new outlines (white) on the before, window px
    v = cv2.imread(os.path.join(PUB, "p0010_before.png"))
    v[sw > 0] = (0, 220, 255)
    for o in out:
        cv2.polylines(v, [np.int32(o["pts"])], True, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.putText(v, o["region"], (int(o["cx"]) - 40, int(o["bbox"][1]) - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
    cv2.imwrite(ov, v)
    print(json.dumps({"registration": reg, "regions": [{k: o[k] for k in ("region", "group", "src", "bbox")} for o in out]}, indent=1))


if __name__ == "__main__":
    main()
