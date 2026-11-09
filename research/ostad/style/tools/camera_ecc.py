"""M5: the slow-move detector. For every frame i, the affine from frame i-W to frame i (W = 1 s of frames), by
(a) ECC (cv2.findTransformECC, MOTION_AFFINE) and (b) feature tracking (goodFeaturesToTrack + Lucas-Kanade + estimateAffinePartial2D).
Each gives scale (>1 = the image grew = push in), rotation (deg), tx, ty (source px). Windows straddling a hard cut (cuts.json)
are marked cut. One row per frame; the first W frames have no window (null)."""
from collections import deque

import cv2
import numpy as np

from common import ANALYSIS_W, cuts_frames, frames, run


def decompose(M, k):
    a, b, tx, c, d, ty = M[0, 0], M[0, 1], M[0, 2], M[1, 0], M[1, 1], M[1, 2]
    s = float(np.sqrt(abs(a * d - b * c)))
    return [round(s, 5), round(float(np.degrees(np.arctan2(c, a))), 4), round(float(tx) * k, 2), round(float(ty) * k, 2)]


def affine(a, b, k):
    """Both estimates for the map from a to b (a point in a lands at M @ p in b)."""
    crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 60, 1e-5)
    ecc = None
    try:
        M = np.eye(2, 3, dtype=np.float32)
        # findTransformECC(template, input) finds W with input(W p) ~ template(p): W maps b-coords... -> invert for a->b
        _, M = cv2.findTransformECC(b.astype(np.float32), a.astype(np.float32), M, cv2.MOTION_AFFINE, crit, None, 5)
        ecc = decompose(cv2.invertAffineTransform(M), k)
    except cv2.error:
        pass
    lk = None
    p0 = cv2.goodFeaturesToTrack(a, 200, 0.01, 6)
    if p0 is not None and len(p0) >= 8:
        p1, st, _ = cv2.calcOpticalFlowPyrLK(a, b, p0, None, winSize=(21, 21), maxLevel=3)
        ok = st.ravel() == 1
        if ok.sum() >= 8:
            M2, inl = cv2.estimateAffinePartial2D(p0[ok], p1[ok], method=cv2.RANSAC, ransacReprojThreshold=2.0)
            if M2 is not None:
                lk = decompose(M2, k) + [int(inl.sum())]
    return ecc, lk


def m5(ref, vid, path, P):
    W = max(2, int(round(P["fps"])))
    k = P["width"] / ANALYSIS_W
    cuts = cuts_frames(ref, vid)
    buf, rows = deque(maxlen=W + 1), []
    for i, g in frames(path, gray=True):
        buf.append(g)
        if len(buf) <= W:
            rows.append(None)
            continue
        if any(i - W < c <= i for c in cuts):
            rows.append({"cut": 1})
            continue
        ecc, lk = affine(buf[0], buf[-1], k)
        rows.append({"ecc": ecc, "lk": lk})
    return {"window_frames": W, "cols": {"ecc": ["scale", "rot_deg", "tx", "ty"], "lk": ["scale", "rot_deg", "tx", "ty", "inliers"]},
            "rows": rows}


if __name__ == "__main__":
    run("camera_ecc.json", m5)
