"""M7 (+ M8 + M9 in one decode when run as image_pass.py; each still writes its own file):
M7 per frame: mean luminance (Rec.709 Y, 0-255), RMS contrast (std of Y / 255), mean HSV saturation (0-1),
black point (1st percentile of Y), white point (99th percentile of Y)."""
import numpy as np

from common import frames, run


def y709(f):
    f = f.astype(np.float32)
    return 0.2126 * f[..., 0] + 0.7152 * f[..., 1] + 0.0722 * f[..., 2]


def sat(f):
    f = f.astype(np.float32) / 255
    mx, mn = f.max(-1), f.min(-1)
    return np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)


def stats(f):
    Y = y709(f)
    p1, p99 = np.percentile(Y, [1, 99])
    return [round(float(Y.mean()), 2), round(float(Y.std() / 255), 4), round(float(sat(f).mean()), 4), round(float(p1), 1), round(float(p99), 1)]


def m7(ref, vid, path, P):
    rows = [stats(f) for _, f in frames(path)]
    return {"cols": ["luma", "rms_contrast", "saturation", "black_point", "white_point"], "rows": rows}


if __name__ == "__main__":
    run("image_stats.json", m7)
