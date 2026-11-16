"""diecut.py IN.png OUT.png [frac=0.020]: the guide's sticker contour. Dilate the render's alpha by frac x figure height and
put #100f0d under it (outer contour only, like the primary mark: 2.0% H sides/top)."""
import sys
import cv2, numpy as np
a = cv2.imread(sys.argv[1], cv2.IMREAD_UNCHANGED)
frac = float(sys.argv[3]) if len(sys.argv) > 3 else 0.020
al = a[..., 3]
ys = np.nonzero((al > 8).any(1))[0]; H = ys.max() - ys.min() + 1
r = max(1, int(round(frac * H)))
pad = r + 4
a = cv2.copyMakeBorder(a, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=(0, 0, 0, 0)); al = a[..., 3]
k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
ring = cv2.dilate((al > 128).astype(np.uint8) * 255, k)
ring = cv2.GaussianBlur(ring, (3, 3), 0)
out = np.zeros_like(a); out[..., :3] = (0x0d, 0x0f, 0x10); out[..., 3] = ring
f = a[..., 3:4].astype(np.float32) / 255
out[..., :3] = (a[..., :3] * f + out[..., :3] * (1 - f)).astype(np.uint8)
out[..., 3] = np.maximum(ring, a[..., 3])
cv2.imwrite(sys.argv[2], out)
