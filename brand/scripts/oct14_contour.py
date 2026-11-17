"""Oct 14 before/after: the measured cheek line (critique v2: "draw the change, not a ring").

  $PY -I brand/scripts/oct14_contour.py

On the aligned pair (public/oct14/before.jpg, after_aligned.jpg; alignment residual 2.63 px, pair.json) the shadow under her
cheekbone is found column by column in the cheek window around the cheekL landmark: the luminance profile down each column is
smoothed and the cheek's shadow edge is the steepest light -> dark step below the cheekbone highlight. The before and after edges
are drawn on the window (before dashed, after solid, both white). The shift is reported in source px and as a share of the face
width; it is drawn only if the median shift is larger than the column-to-column noise (else the card says it is not measurable).
Writes research/ostad/style/oct14/contour_measure.json and merges `contour` into public/oct14/props.json via oct14_prep props.
"""
import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "brand/remotion/public/oct14"
EDIT = ROOT / "brand/edits/oct14-injection"


def edge(img, x0, x1, y0, y1, step=2, jump=1.5):
    """the shadow edge as one smooth path: a min-cost path through the column gradient (Viterbi), at most `step` px per column"""
    g = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 2.5)
    xs = list(range(x0, x1 + 1, 2))
    D = np.stack([np.diff(g[y0:y1, x - 1:x + 2].mean(axis=1)) for x in xs])  # light -> dark going down = negative
    n, m = D.shape
    cost = D[0].copy(); back = np.zeros((n, m), int)
    for i in range(1, n):
        best = np.full(m, np.inf); arg = np.zeros(m, int)
        for dy in range(-step, step + 1):
            sh = np.roll(cost, dy) + jump * abs(dy)
            if dy > 0: sh[:dy] = np.inf
            if dy < 0: sh[dy:] = np.inf
            better = sh < best; best[better] = sh[better]; arg[better] = (np.arange(m) - dy)[better]
        cost = best + D[i]; back[i] = arg
    k = int(np.argmin(cost)); path = [k]
    for i in range(n - 1, 0, -1):
        k = back[i, k]; path.append(k)
    path = path[::-1]
    return np.array([[x, y0 + k + 0.5, float(-D[i, k])] for i, (x, k) in enumerate(zip(xs, path))])


def main():
    pair = json.loads((EDIT / "pair.json").read_text())
    b = cv2.imread(str(PUB / "before.jpg")); a = cv2.imread(str(PUB / "after_aligned.jpg"))
    cx, cy = pair["pts_before"]["cheekL"]; my = pair["pts_before"]["malarL"][1]
    x0, x1 = int(cx - 40), int(cx + 34)
    y0, y1 = int(my + 4), int(cy + 70)
    eb, ea = edge(b, x0, x1, y0, y1), edge(a, x0, x1, y0, y1)
    shift = ea[:, 1] - eb[:, 1]
    # noise: the step-to-step jitter of each line (a real shift is a coherent offset, noise is jitter)
    # noise: the same edge found on two before frames 0.5 s apart would be ideal; here the residual of the shift around its median
    noise = float(np.median(np.abs(shift - np.median(shift))))
    med = float(np.median(shift))
    fw = pair["face_width_px"]
    ok = abs(med) > max(2.0, noise) and float(np.mean(np.sign(shift) == np.sign(med))) >= 0.7
    res = {"window": [x0, y0, x1, y1], "landmark": "cheekL", "before": eb[:, :2].round(1).tolist(), "after": ea[:, :2].round(1).tolist(),
           "median_shift_px": round(med, 2), "shift_pct_face_width": round(100 * med / fw, 2), "noise_px": round(noise, 2),
           "same_sign_share": round(float(np.mean(np.sign(shift) == np.sign(med))), 2), "drawn": bool(ok),
           "reading": ("the shadow edge under the cheekbone sits lower after: more cheek projection" if med > 0 else "the shadow edge sits higher after") if ok else "not measurable"}
    (ROOT / "research/ostad/style/oct14/contour_measure.json").write_text(json.dumps(res, indent=1))
    over = b.copy()
    over[:, :] = (b * 0.5 + a * 0.5).astype(np.uint8)
    cv2.polylines(over, [eb[:, :2].astype(np.int32)], False, (0, 0, 255), 1)
    cv2.polylines(over, [ea[:, :2].astype(np.int32)], False, (0, 255, 0), 1)
    crop = over[y0 - 60:y1 + 60, x0 - 60:x1 + 60]
    cv2.imwrite(str(EDIT / "contour_check.jpg"), cv2.resize(crop, None, fx=4, fy=4, interpolation=cv2.INTER_NEAREST))
    print(json.dumps({k: v for k, v in res.items() if k not in ("before", "after")}))


if __name__ == "__main__":
    main()
