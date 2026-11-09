"""M8 per frame: mean hue (circular, degrees) and mean saturation of the darkest 10% and the brightest 10% of pixels by luminance."""
import cv2
import numpy as np

from common import circ_mean_deg, frames, run
from luma_contrast_sat import y709


def tone(f):
    Y = y709(f).ravel()
    hsv = cv2.cvtColor(f, cv2.COLOR_RGB2HSV_FULL).reshape(-1, 3).astype(np.float32)
    lo, hi = np.percentile(Y, [10, 90])
    out = []
    for m in (Y <= lo, Y >= hi):
        h, s = hsv[m, 0] * 360 / 256, hsv[m, 1] / 255
        out += [round(circ_mean_deg(h, w=s + 1e-3), 1), round(float(s.mean()), 4)] if m.any() else [None, None]
    return out


def m8(ref, vid, path, P):
    return {"cols": ["shadow_hue", "shadow_sat", "highlight_hue", "highlight_sat"], "rows": [tone(f) for _, f in frames(path)]}


if __name__ == "__main__":
    run("tone_hue.json", m8)
