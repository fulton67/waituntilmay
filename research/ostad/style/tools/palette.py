"""M9: dominant palette every 15 frames: k-means k=5 in CIELAB (cv2.kmeans on the 270-wide frame), hex + share, largest first.
Rows are keyed by frame index (0, 15, 30, ...); coverage = every frame lies in exactly one 15-frame bucket."""
import cv2
import numpy as np

from common import frames, run

STEP, K = 15, 5


def pal(f):
    lab = cv2.cvtColor(f, cv2.COLOR_RGB2LAB).reshape(-1, 3).astype(np.float32)
    crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5)
    _, lab_lbl, C = cv2.kmeans(lab, K, None, crit, 2, cv2.KMEANS_PP_CENTERS)
    cnt = np.bincount(lab_lbl.ravel(), minlength=K) / len(lab_lbl)
    rgb = cv2.cvtColor(C.reshape(1, K, 3).astype(np.uint8), cv2.COLOR_LAB2RGB)[0]
    order = np.argsort(-cnt)
    return [["#%02x%02x%02x" % tuple(int(v) for v in rgb[j]), round(float(cnt[j]), 4)] for j in order]


def m9(ref, vid, path, P):
    rows = [[i, pal(f)] for i, f in frames(path) if i % STEP == 0]
    return {"step": STEP, "k": K, "space": "CIELAB", "rows": rows}


if __name__ == "__main__":
    run("palette.json", m9)
