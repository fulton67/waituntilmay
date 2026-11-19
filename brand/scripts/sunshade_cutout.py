"""Sun Shade Clear + Tint product photo -> transparent cut-out for the floating product post (src/promo).
rembg birefnet-general, local ONNX on CPU; no image leaves this PC. Keeps the two largest bodies (the bottles)."""
import sys, numpy as np, cv2
from PIL import Image
from rembg import new_session, remove
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
cut = remove(im, session=new_session("birefnet-general"))
a = np.array(cut)
al = a[..., 3]
n, lab, st, _ = cv2.connectedComponentsWithStats((al > 64).astype(np.uint8))
keep = 1 + np.argsort(st[1:, cv2.CC_STAT_AREA])[::-1][:2]
mask = np.isin(lab, keep).astype(np.uint8)
mask = cv2.dilate(mask, np.ones((25, 25), np.uint8))
a[..., 3] = al * mask
ys, xs = np.where(a[..., 3] > 8)
a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
Image.fromarray(a).save(out)
print(out, a.shape, "kept areas", st[keep, cv2.CC_STAT_AREA])
