"""bands.py IMG...: figure bbox on the #eeeeee ground, then tee (red), shorts (white below the tee) and glasses (brown) bands
as fractions of figure height H; W/H. Same colour logic as tools/construction.py (CIELAB thresholds)."""
import sys
import cv2, numpy as np
for f in sys.argv[1:]:
    bgr = cv2.imread(f); rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    if f.lower().endswith(".png"):
        a = cv2.imread(f, cv2.IMREAD_UNCHANGED)
        alpha = a[..., 3] > 8 if a.ndim == 3 and a.shape[2] == 4 else None
    else: alpha = None
    L = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32); L[..., 0] *= 100 / 255; L[..., 1:] -= 128
    fig = alpha if alpha is not None else (np.abs(rgb.astype(int) - 0xee).max(2) > 22)
    n, lbl, st, _ = cv2.connectedComponentsWithStats(fig.astype(np.uint8), 8)
    fig = lbl == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    ys, xs = np.nonzero(fig); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max(); H = y1 - y0 + 1
    def band(m, minfrac=0.15):
        rows = np.nonzero(m.sum(1) > max(3, minfrac * m.sum(1).max()))[0]
        return (round((rows.min() - y0) / H, 3), round((rows.max() - y0) / H, 3)) if len(rows) else None
    red = fig & (L[..., 1] > 40) & (L[..., 0] > 25)
    tee = band(red)
    white = fig & (L[..., 0] > 90) & (np.abs(L[..., 1]) < 5) & (np.abs(L[..., 2]) < 8)
    if tee: white[: y0 + int(tee[1] * H) - int(0.03 * H)] = False
    brown = fig & (L[..., 0] > 10) & (L[..., 0] < 45) & (L[..., 1] > 8) & (L[..., 2] > 8)
    bb = band(brown, 0.05)
    gw = None
    if bb:
        cols = np.nonzero(brown.sum(0) > 2)[0]; gw = round((cols.max() - cols.min()) / H, 3)
    print(f"{f}: W/H {round((x1 - x0 + 1) / H, 3)}  tee {tee}  shorts {band(white)}  glasses {bb} span {gw}")
