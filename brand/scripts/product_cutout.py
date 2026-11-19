"""Product photo -> transparent cut-out for the floating product posts (src/promo). rembg birefnet-general, local ONNX on CPU;
no image leaves this PC. Keeps every body >= min_frac of the largest (1 = largest only), then trims to the alpha bbox.
usage: python -I product_cutout.py <src> <out.png> [min_frac=0.02]"""
import sys, numpy as np, cv2
from PIL import Image
from rembg import new_session, remove
src, out = sys.argv[1], sys.argv[2]
frac = float(sys.argv[3]) if len(sys.argv) > 3 else 0.02
cut = np.array(remove(Image.open(src).convert("RGB"), session=new_session("birefnet-general")))
al = cut[..., 3]
n, lab, st, _ = cv2.connectedComponentsWithStats((al > 64).astype(np.uint8))
areas = st[1:, cv2.CC_STAT_AREA]
keep = 1 + np.where(areas >= areas.max() * frac)[0]
mask = cv2.dilate(np.isin(lab, keep).astype(np.uint8), np.ones((25, 25), np.uint8))
cut[..., 3] = al * mask
ys, xs = np.where(cut[..., 3] > 8)
cut = cut[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
Image.fromarray(cut).save(out)
print(out, cut.shape[1], "x", cut.shape[0], "bodies", len(keep))
