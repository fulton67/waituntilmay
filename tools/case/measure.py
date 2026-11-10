"""Shared measurements: haze metric, luminance ratio, delta-E."""
import numpy as np, cv2

def srgb2lin(u8):
    c = u8.astype(np.float64) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def lum(bgr_u8):
    l = srgb2lin(bgr_u8)
    return 0.0722 * l[..., 0] + 0.7152 * l[..., 1] + 0.2126 * l[..., 2]

def warp_region(img, quad, n=1024):
    """quad: 4 screen points TL,TR,BR,BL (device px) -> n x n"""
    M = cv2.getPerspectiveTransform(np.float32(quad), np.float32([[0, 0], [n, 0], [n, n], [0, n]]))
    return cv2.warpPerspective(img, M, (n, n), flags=cv2.INTER_AREA)

def compare(render_n, source_bgr):
    n = render_n.shape[0]
    src = cv2.resize(source_bgr, (n, n), interpolation=cv2.INTER_AREA)
    hazy = (render_n.min(axis=2) >= 235) & (src.max(axis=2) < 200)
    m = int(n * 0.1); r, s = render_n[m:n - m, m:n - m], src[m:n - m, m:n - m]
    lr, ls = lum(r).mean(), lum(s).mean()
    labr = cv2.cvtColor(r.astype(np.float32) / 255, cv2.COLOR_BGR2Lab)
    labs = cv2.cvtColor(s.astype(np.float32) / 255, cv2.COLOR_BGR2Lab)
    # blur both a little so sub-pixel misregistration does not read as colour error
    labr = cv2.GaussianBlur(labr, (0, 0), 6); labs = cv2.GaussianBlur(labs, (0, 0), 6)
    dE = np.sqrt(((labr - labs) ** 2).sum(axis=2)).mean()
    return {'haze_pct': round(100.0 * hazy.mean(), 4),
            'lum_render': round(float(lr), 5), 'lum_source': round(float(ls), 5),
            'lum_ratio': round(float(lr / ls), 4),
            'lum_delta_full': round(float(lum(render_n).mean() - lum(src).mean()), 5),
            'mean_srgb_render': [round(float(v), 1) for v in r.reshape(-1, 3).mean(0)[::-1]],
            'mean_srgb_source': [round(float(v), 1) for v in s.reshape(-1, 3).mean(0)[::-1]],
            'dE76': round(float(dE), 2)}
