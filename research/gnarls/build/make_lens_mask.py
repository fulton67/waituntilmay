"""Glasses masks on the flat front skin (proj_front UV space) for blender/fix_glasses.py.
gen/lens_mask.png: R = lens interior (holes enclosed by the brown frame), G = frame (dilated), B = lens interior
blurred (a smooth 0..1 weight for flattening the lens surface).
Run: python -I make_lens_mask.py"""
import os
import cv2, numpy as np

R = os.path.dirname(os.path.abspath(__file__))
im = cv2.imread(os.path.join(R, "gen", "flat_muse_front.png")); h, w = im.shape[:2]
L = cv2.cvtColor(im, cv2.COLOR_BGR2LAB).astype(np.float32); L[..., 0] *= 100 / 255; L[..., 1:] -= 128
fr = (L[..., 0] > 15) & (L[..., 0] < 40) & (L[..., 1] > 12) & (L[..., 2] > 12)
n, lb, st, _ = cv2.connectedComponentsWithStats(fr.astype(np.uint8), 8)
frame = (lb == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
frame = cv2.morphologyEx(frame, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
# lens interiors = non-frame components fully enclosed by the frame (they don't reach the frame bbox edge)
ys, xs = np.nonzero(frame); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
n, lb, st, _ = cv2.connectedComponentsWithStats(1 - frame, 4)
lens = np.zeros((h, w), np.uint8)
for i in range(1, n):
    X, Y, W, H, A = st[i]
    if X > x0 and Y > y0 and X + W < x1 and Y + H < y1 and A > 0.01 * (x1 - x0) * (y1 - y0):
        lens[lb == i] = 1
print("frame bbox", (x0, y0, x1, y1), "lens px", int(lens.sum()), "lens comps", cv2.connectedComponents(lens)[0] - 1)
inner = cv2.erode(lens, np.ones((3, 3), np.uint8))
wgt = cv2.GaussianBlur(cv2.distanceTransform(inner, cv2.DIST_L2, 5), (0, 0), 3)
wgt = np.clip(wgt / 18.0, 0, 1)  # full flattening ~18 px inside the ring
out = np.dstack([wgt * 255, cv2.dilate(frame, np.ones((7, 7), np.uint8)) * 255, lens * 255]).astype(np.uint8)  # BGR
cv2.imwrite(os.path.join(R, "gen", "lens_mask.png"), out)
