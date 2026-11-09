"""M12: easing of every element from M10 (text_elements.json) and M11 (graphic_elements.json).
For each element's entry (and exit, time-reversed) and each channel that actually changes (centre x, centre y, width = scale,
opacity), normalise to progress p (0 at the first frame, 1 at the settled value), then:
  frames_to_settle : first frame from which |p - 1| <= 1% for good
  overshoot_pct    : max(p) - 1, in % (0 if it never passes the target)
  bezier           : least-squares cubic-bezier (x1, y1, x2, y2) on t = frame / frames_to_settle, with RMSE
  spring           : damped spring p(t) = 1 - e^(-z w t) (cos(wd t) + z w / wd sin(wd t)), z (damping ratio), w (rad/frame), RMSE
  best             : the lower-RMSE model
"""
import numpy as np
from scipy.optimize import least_squares

from common import load_json, out_path, run

TOL = 0.01


def bez_y_of_t(t, x1, y1, x2, y2):
    t = np.clip(np.asarray(t, float), 0, 1)
    u = t.copy()
    for _ in range(40):  # Newton on x(u) = t
        x = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u ** 2 * x2 + u ** 3 - t
        dx = 3 * (1 - u) ** 2 * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u ** 2 * (1 - x2)
        u = np.clip(u - x / np.where(np.abs(dx) < 1e-6, 1e-6, dx), 0, 1)
    return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u ** 2 * y2 + u ** 3


def spring(t, z, w):
    z = max(z, 1e-3)
    if z < 1:
        wd = w * np.sqrt(1 - z * z)
        return 1 - np.exp(-z * w * t) * (np.cos(wd * t) + z * w / wd * np.sin(wd * t))
    return 1 - np.exp(-w * t) * (1 + w * t)


def progress(v):
    v = np.asarray(v, float)
    tail = v[-3:] if len(v) >= 3 else v
    v0, vf = v[0], float(np.median(tail))
    if abs(vf - v0) < 1e-9:
        return None
    return (v - v0) / (vf - v0)


def settle_index(p):
    bad = np.where(np.abs(p - 1) > TOL)[0]
    return int(bad[-1] + 1) if len(bad) else 0


def fit_track(v):
    p = progress(v)
    if p is None:
        return None
    T = max(1, settle_index(p))
    over = float(max(0.0, p.max() - 1) * 100)
    n = min(len(p), T + 1)
    t = np.arange(n) / T
    y = p[:n]
    best_b = None
    for x0 in ([0.25, 0.1, 0.25, 1.0], [0.22, 1, 0.36, 1], [0.4, 0, 0.2, 1], [0.34, 1.56, 0.64, 1]):
        r = least_squares(lambda q: bez_y_of_t(t, *q) - y, x0, bounds=([0, -1, 0, -1], [1, 2.5, 1, 2.5]))
        if best_b is None or r.cost < best_b.cost:
            best_b = r
    b = best_b.x
    b_rmse = float(np.sqrt(np.mean((bez_y_of_t(t, *b) - y) ** 2)))
    fr = np.arange(len(p), dtype=float)
    best_s = None
    for z0, w0 in ((0.5, 0.5), (0.8, 0.3), (1.0, 0.6), (0.3, 1.0)):
        r = least_squares(lambda q: spring(fr, *q) - p, [z0, w0], bounds=([0.05, 0.01], [3, 6]))
        if best_s is None or r.cost < best_s.cost:
            best_s = r
    s_rmse = float(np.sqrt(np.mean((spring(fr, *best_s.x) - p) ** 2)))
    return {"frames_to_settle": T, "overshoot_pct": round(over, 2), "bezier": [round(float(q), 4) for q in b], "bezier_rmse": round(b_rmse, 4),
            "spring": {"damping_ratio": round(float(best_s.x[0]), 4), "omega_rad_per_frame": round(float(best_s.x[1]), 4)},
            "spring_rmse": round(s_rmse, 4), "best": "bezier" if b_rmse <= s_rmse else "spring", "n": int(len(p))}


def channels(track):
    """track: list of {frame, bbox:[x0,y0,x1,y1], opacity?} -> dict of channel -> values."""
    bx = np.array([r["bbox"] for r in track], float)
    ch = {"cx": (bx[:, 0] + bx[:, 2]) / 2, "cy": (bx[:, 1] + bx[:, 3]) / 2, "w": bx[:, 2] - bx[:, 0]}
    if all(r.get("opacity") is not None for r in track):
        ch["opacity"] = np.array([r["opacity"] for r in track], float)
    return ch


def element_fits(el, W, H, fps):
    tr = el.get("track") or []
    if len(tr) < 3:
        return None
    k = max(3, int(round(fps * 0.8)))
    out = {}
    for phase, seg in (("entry", tr[:k]), ("exit", tr[::-1][:k])):
        ch = channels(seg)
        res = {}
        for name, v in ch.items():
            rng = np.ptp(v)
            scale = {"cx": W, "cy": H, "w": max(1.0, float(np.median(v))), "opacity": 1.0}[name]
            if rng / scale < (0.01 if name != "opacity" else 0.1):
                continue
            f = fit_track(v)
            if f:
                res[name] = f
        if res:
            out[phase] = res
    return out or None


def m12(ref, vid, path, P):
    res = {"text": [], "graphic": []}
    for key, fname in (("text", "text_elements.json"), ("graphic", "graphic_elements.json")):
        d = load_json(out_path(ref, vid, fname))
        if d is None:
            raise RuntimeError(f"needs {fname}")
        for el in d.get("elements", []):
            fits = element_fits(el, P["width"], P["height"], P["fps"])
            res[key].append({"id": el["id"], "entry_frame": el["entry"], "exit_frame": el["exit"], "fits": fits})
    return res


if __name__ == "__main__":
    run("easing.json", m12)
