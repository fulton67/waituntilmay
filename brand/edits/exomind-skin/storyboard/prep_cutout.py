"""Cut the licensed BTL unit photo (Exomind_PIC_Unit_0090_ENUS100.jpeg, white seamless) out of its background for the storyboard's
floating product shots: GrabCut seeded by LAB distance from the backdrop, small islands dropped, holes filled, 1 px feather.
Writes brand/remotion/public/exomind-skin/btl/unit_cut.png (2400 px wide, gitignored). Checked on a red-matte preview.
Run: python -I brand/edits/exomind-skin/storyboard/prep_cutout.py   (from the repo root)"""
import os
import cv2, numpy as np
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "remotion", "public", "exomind-skin", "btl")
im = cv2.imread(os.path.join(D, "Exomind_PIC_Unit_0090_ENUS100.jpeg")); h, w = im.shape[:2]
sm = cv2.resize(im, (2400, int(h * 2400 / w)), interpolation=cv2.INTER_AREA); H, W = sm.shape[:2]
lab = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB).astype(np.float32)
bg = np.median(np.concatenate([lab[:20].reshape(-1, 3), lab[:, :20].reshape(-1, 3), lab[:, -20:].reshape(-1, 3)]), axis=0)
d = np.linalg.norm(lab - bg, axis=2)
mask = np.full((H, W), cv2.GC_PR_BGD, np.uint8); mask[d > 14] = cv2.GC_PR_FGD; mask[d > 40] = cv2.GC_FGD
mask[:10] = cv2.GC_BGD; mask[:, :10] = cv2.GC_BGD; mask[:, -10:] = cv2.GC_BGD
cv2.grabCut(sm, mask, None, np.zeros((1, 65)), np.zeros((1, 65)), 4, cv2.GC_INIT_WITH_MASK)
fg = np.where((mask == 1) | (mask == 3), 255, 0).astype(np.uint8)
k, lb, st, _ = cv2.connectedComponentsWithStats(fg, 8)
keep = np.zeros_like(fg)
for i in range(1, k):
    if st[i, 4] > H * W * 0.002: keep[lb == i] = 255
keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
ff = keep.copy(); cv2.floodFill(ff, np.zeros((H + 2, W + 2), np.uint8), (0, 0), 255); keep = keep | cv2.bitwise_not(ff)
cv2.imwrite(os.path.join(D, "unit_cut.png"), np.dstack([sm, cv2.GaussianBlur(keep, (0, 0), 1.0)]))
print("unit_cut.png", W, H)
