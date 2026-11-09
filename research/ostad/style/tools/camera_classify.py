"""M6: combine M4 (per-frame shift) and M5 (1 s affine) into a per-frame class:
static / drift / push / pull / pan / tilt / handheld, plus cumulative scale per shot (between hard cuts) and % of frames moving.

Thresholds (relative to frame width W, per second, so they hold at any fps / resolution); calibrated in calibrate.py:
  push / pull : per-frame zoom rate >= 0.5 %/s, recovered from M5's overlapping 1 s windows (ECC; LK if ECC failed)
  pan / tilt  : translation >= 2 % of W per second (M4 shift, centred ~0.07 s mean, cut at half its local peak), x- (pan) or y-dominant (tilt)
  drift       : sustained translation 0.4-2 % of W per second
  handheld    : not the above, but the frame-to-frame shift jitters: std over 0.5 s of the M4 shift >= 0.15 % of W
  static      : none of the above
"""
import numpy as np

from common import cuts_frames, load_json, out_path, run

PUSH, PAN, DRIFT, JIT = 0.005, 0.02, 0.004, 0.0015


def window_est(r):
    if isinstance(r, dict) and not r.get("cut"):
        est = r.get("ecc") or ((r.get("lk") or [None])[:4] if r.get("lk") else None)
        if est and est[0] is not None:
            return est
    return None


def cum_scale(rows, a, z, W):
    """Cumulative zoom over frames a..z-1 from 1 s windows (row i = affine from i-W to i): chain windows a->a+W->..., then the
    remainder from the last window ending at z-1, raised to the share of it not already covered (constant rate assumed)."""
    cum, e = 1.0, a
    while e + W <= z - 1:
        est = window_est(rows[e + W]) if e + W < len(rows) else None
        if est:
            cum *= est[0]
        e += W
    rem = (z - 1) - e
    if rem > 0 and z - 1 < len(rows) and z - 1 - W >= a:
        est = window_est(rows[z - 1])
        if est:
            cum *= est[0] ** (rem / W)
    return cum


def half_peak(v, reach):
    """Box-filtered motion is a trapezoid whose 50% points sit on the true start/stop: keep frames >= half the local peak."""
    v = np.abs(np.asarray(v, float))
    n = len(v)
    peak = np.array([v[max(0, i - reach):min(n, i + reach + 1)].max() for i in range(n)]) if n else v
    return v >= 0.5 * peak


def zoom_rates(ecc_rows, a, z, W, lam=0.02):
    """Per-frame log-zoom l[k] (frame k-1 -> k) for frames a+1..z-1, recovered from every 1 s window of M5: each window ending at
    j gives sum(l[j-W+1..j]) = log scale_j. Solved by least squares with a small second-difference penalty (lam), which fixes the
    W-periodic null space and keeps edges sharp. Returns an array of length z-a (l[a] = 0)."""
    from scipy.sparse import lil_matrix, vstack
    from scipy.sparse.linalg import lsqr
    m = z - a
    out = np.zeros(m)
    if m < W + 2:
        return out
    eqs, rhs = [], []
    for j in range(a + W, z):
        est = window_est(ecc_rows[j]) if j < len(ecc_rows) else None
        if est and est[0] > 0:
            eqs.append(j); rhs.append(np.log(est[0]))
    if not eqs:
        return out
    A = lil_matrix((len(eqs), m))
    for r, j in enumerate(eqs):
        A[r, j - W + 1 - a:j + 1 - a] = 1.0
    D = lil_matrix((max(0, m - 3), m))
    for r in range(m - 3):
        D[r, r + 1], D[r, r + 2], D[r, r + 3] = lam, -2 * lam, lam
    M = vstack([A.tocsr(), D.tocsr()])
    y = np.concatenate([rhs, np.zeros(D.shape[0])])
    sol = lsqr(M, y, atol=1e-12, btol=1e-12, iter_lim=20000)[0]
    sol[0] = 0.0
    return sol


def classify(pc_rows, ecc_rows, W, fps, cuts, n):
    """Translation (pan / tilt / drift) from M4's per-frame shift averaged over a centred ~0.07 s window (fps/15 each side), cut at half its local
    peak; zoom (push / pull) from the per-frame zoom rate recovered from M5's overlapping 1 s windows (zoom_rates), per shot;
    handheld from the jitter of M4's shift."""
    dx = np.array([r[0] for r in pc_rows], float)[:n]
    dy = np.array([r[1] for r in pc_rows], float)[:n]
    for c in cuts:
        if c < n:
            dx[c] = dy[c] = 0.0
    win = max(2, int(round(fps)))
    h = max(1, int(round(fps / 15)))
    hj = max(1, int(round(fps / 4)))
    zr = np.zeros(n)
    bounds = [0] + [c for c in cuts if 0 < c < n] + [n]
    for a, z in zip(bounds[:-1], bounds[1:]):
        if z > a:
            zr[a:z] = zoom_rates(ecc_rows, a, z, win)
    hz = max(1, int(round(fps / 10)))
    zs = np.array([zr[max(0, i - hz):min(n, i + hz + 1)].mean() for i in range(n)]) * fps  # log-zoom per second
    mxs, mys, trs, jits = [], [], [], []
    for i in range(n):
        lo, hi = max(0, i - h), min(n, i + h + 1)
        mx, my = float(dx[lo:hi].mean()), float(dy[lo:hi].mean())
        mxs.append(mx); mys.append(my); trs.append(np.hypot(mx, my) * fps / W)
        lo2, hi2 = max(0, i - hj), min(n, i + hj + 1)
        jits.append(float(np.std(np.hypot(dx[lo2:hi2] - dx[lo2:hi2].mean(), dy[lo2:hi2] - dy[lo2:hi2].mean()))) / W)
    tr_core = half_peak(trs, 2 * h + 1)
    cls, scale_rate, trans_rate = [], [], []
    for i in range(n):
        s, tr, mx, my = float(zs[i]), trs[i], mxs[i], mys[i]
        if abs(s) >= PUSH:
            c = "push" if s > 0 else "pull"
        elif tr >= PAN and tr_core[i]:
            c = "pan" if abs(mx) >= abs(my) else "tilt"
        elif tr >= DRIFT and tr_core[i]:
            c = "drift"
        elif jits[i] >= JIT:
            c = "handheld"
        else:
            c = "static"
        cls.append(c)
        scale_rate.append(round(s, 5))
        trans_rate.append(round(float(tr), 5))
    return cls, scale_rate, trans_rate


def m6(ref, vid, path, P):
    pc = load_json(out_path(ref, vid, "camera_pc.json"))
    ecc = load_json(out_path(ref, vid, "camera_ecc.json"))
    if not pc or not ecc:
        raise RuntimeError("needs camera_pc.json and camera_ecc.json")
    n, W, fps = P["frame_count"], P["width"], P["fps"]
    cuts = cuts_frames(ref, vid)
    cls, sr, tr = classify(pc["rows"], ecc["rows"], W, fps, cuts, min(n, len(pc["rows"])))
    shots, b = [], [0] + [c for c in cuts if 0 < c < len(cls)] + [len(cls)]
    for a, z in zip(b[:-1], b[1:]):
        if z <= a:
            continue
        # cumulative scale over the shot: product of per-window scale, one window per second, sampled every W frames
        cum = cum_scale(ecc["rows"], a, z, ecc["window_frames"])
        seg = cls[a:z]
        shots.append({"from": a, "to": z - 1, "cum_scale": round(cum, 4), "dominant": max(set(seg), key=seg.count),
                      "moving_share": round(sum(c != "static" for c in seg) / len(seg), 3)})
    share = {c: round(cls.count(c) / len(cls), 4) for c in sorted(set(cls))}
    return {"thresholds": {"push_per_s": PUSH, "pan_per_s": PAN, "drift_per_s": DRIFT, "jitter": JIT}, "summary": share,
            "moving_share": round(1 - share.get("static", 0), 4), "shots": shots, "cols": ["class", "scale_rate_per_s", "trans_rate_per_s"],
            "rows": [[c, s, t] for c, s, t in zip(cls, sr, tr)]}


if __name__ == "__main__":
    run("camera.json", m6)
