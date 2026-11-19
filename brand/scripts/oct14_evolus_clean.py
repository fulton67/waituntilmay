"""Remove Evolus' baked-in white shadow swoosh: keep the plunger (thumb pad rows, the rod's column, the flange rows: by colour), the clear
barrel / hub / needle (a measured column band); inside the band, near-white unsaturated pixels (the swoosh seen through the glass) at 50 % alpha."""
from PIL import Image; import numpy as np, cv2, sys
def clean(f, dx, fl, out):
    a = np.array(Image.open(f).convert('RGBA')).astype(np.float32); H, W = a.shape[:2]
    al = a[..., 3]; sat = a[..., :3].max(2) - a[..., :3].min(2); lum = a[..., :3].mean(2)
    yy, xx = np.mgrid[0:H, 0:W]; band = np.zeros((H, W), bool)
    for y0, y1, x0, x1 in [(372, 772, 318, 373), (772, 806, 319, 375), (806, 862, 329, 366), (862, 940, 343, 356)]:
        band |= (yy >= y0) & (yy < y1) & (xx >= x0 + dx) & (xx < x1 + dx)
    top = (yy < 372) & (sat > 35) & ((yy < 54) | (yy >= fl) | ((xx >= 329 + dx) & (xx < 361 + dx)))
    keep = cv2.GaussianBlur((band | top).astype(np.float32), (0, 0), 1.0)
    k = np.where(band & (sat < 28) & (lum > 212), 0.5, 1.0)
    o = a.copy(); o[..., 3] = al * keep * k
    ys, xs = np.nonzero(o[..., 3] > 8); o = o[max(0, ys.min() - 4):ys.max() + 5, max(0, xs.min() - 4):xs.max() + 5]
    im = Image.fromarray(o.clip(0, 255).astype(np.uint8), 'RGBA'); im.save(out + '_v.png'); im.transpose(Image.Transpose.ROTATE_270).save(out + '_h.png')
    print(out, im.size); return o
if __name__ == '__main__':
    clean('evolysse-form.png', 0, 322, 'form_clean'); clean('evolysse-smooth.png', 224, 328, 'smooth_clean')
