"""Phase 4 motion: what moves in the board reel (43001699). Farneback flow at 270x480 on every frame:
  - per horizontal band (24 bands): median dx -> do rows slide, and in alternating directions?
  - radial component vs centre -> zoom in (+) / out (-) over time; scale per frame from a similarity fit (estimateAffinePartial2D on tracked corners)
-> brand/motion/board_flow.json (merged into board_detail.json under 'flow'). Thresholds are judgment calls. brand-venv python -I."""
import json, pathlib, statistics as st
import numpy as np, cv2
B = pathlib.Path(__file__).resolve().parents[1]
cap = cv2.VideoCapture(str(B / "board" / "media" / "43001699.mp4")); fps = cap.get(cv2.CAP_PROP_FPS); G = []
while True:
    ok, f = cap.read()
    if not ok: break
    G.append(cv2.cvtColor(cv2.resize(f, (270, 480)), cv2.COLOR_BGR2GRAY))
h, w = G[0].shape; NB = 24; yy, xx = np.mgrid[0:h, 0:w]; rx, ry = xx - w / 2, yy - h / 2; rn = np.hypot(rx, ry) + 1e-6
rows = []
for i in range(1, len(G)):
    fl = cv2.calcOpticalFlowFarneback(G[i - 1], G[i], None, 0.5, 4, 21, 3, 5, 1.2, 0)
    mag = np.hypot(fl[..., 0], fl[..., 1]); mov = mag > 0.3
    bands = []
    for b in range(NB):
        sl = slice(b * h // NB, (b + 1) * h // NB); m = mov[sl]
        bands.append(round(float(np.median(fl[sl][..., 0][m])), 2) if m.sum() > 30 else None)
    p0 = cv2.goodFeaturesToTrack(G[i - 1], 300, 0.01, 6); scale = None
    if p0 is not None and len(p0) > 10:
        p1, stt, _ = cv2.calcOpticalFlowPyrLK(G[i - 1], G[i], p0, None)
        ok = stt.flatten() == 1
        if ok.sum() > 10:
            M, inl = cv2.estimateAffinePartial2D(p0[ok], p1[ok], method=cv2.RANSAC, ransacReprojThreshold=2.0)
            if M is not None: scale = float(np.hypot(M[0, 0], M[1, 0]))
    rad = float(((fl[..., 0] * rx + fl[..., 1] * ry) / rn)[mov].mean()) if mov.sum() > 30 else 0.0
    rows.append({"t": round(i / fps, 3), "bands_dx": bands, "radial": round(rad, 3), "scale": round(scale, 4) if scale else None,
                 "speed_px": round(float(np.median(mag[mov])), 2) if mov.sum() > 30 else 0.0})
# alternation: share of adjacent moving-band pairs with opposite sign (|dx| > 0.5)
alt, tot = 0, 0
for r in rows:
    v = [x for x in r["bands_dx"] if x is not None and abs(x) > 0.5]
    for a, b in zip(v, v[1:]):
        tot += 1; alt += (a > 0) != (b > 0)
cum = np.cumprod([r["scale"] or 1.0 for r in rows])
ZOOM = 1.004  # per-frame scale above this (or below 1/ZOOM) counts as zooming: judgment call
zi = [r["t"] for r in rows if (r["scale"] or 1) > ZOOM]; zo = [r["t"] for r in rows if (r["scale"] or 1) < 1 / ZOOM]
def spans(ts):
    out = []
    for t in ts:
        if out and t - out[-1][1] <= 0.25: out[-1][1] = t
        else: out.append([t, t])
    return [[round(a, 2), round(b, 2)] for a, b in out if b - a >= 0.2]
res = {"alternating_adjacent_band_share": round(alt / tot, 3) if tot else None, "band_pairs": tot,
       "zoom_threshold_per_frame": ZOOM, "zoom_in_spans_s": spans(zi), "zoom_out_spans_s": spans(zo),
       "cum_scale_max": round(float(cum.max()), 2), "cum_scale_at_max_t": rows[int(cum.argmax())]["t"], "cum_scale_end": round(float(cum[-1]), 2),
       "speed_px_per_frame_median": st.median([r["speed_px"] for r in rows]),
       "speed_by_second": {s: round(st.median([r["speed_px"] for r in rows if s <= r["t"] < s + 1]), 2) for s in range(int(len(G) / fps) + 1) if any(s <= r["t"] < s + 1 for r in rows)},
       "per_frame": rows}
json.dump(res, open(B / "motion" / "board_flow.json", "w"), indent=1)
print(json.dumps({k: v for k, v in res.items() if k != "per_frame"}, indent=1))
for r in rows[10:13] + rows[110:112]: print(r["t"], r["bands_dx"])

# easing of each zoom: log-scale velocity curve inside the span; where the peak falls (0 = start, 1 = end) and the
# share of the scale change done in the first half. Peak < 0.4 = ease-out, > 0.6 = ease-in, between = ease-in-out (judgment call).
def easing(a, b):
    seg = [r for r in rows if a - 0.1 <= r["t"] <= b + 0.1]
    v = np.array([np.log(r["scale"] or 1.0) for r in seg]); k = np.convolve(v, np.ones(5) / 5, mode="same")
    peak = float(np.argmax(np.abs(k)) / max(1, len(k) - 1)); c = np.cumsum(v); half = float(c[len(c) // 2] / c[-1]) if c[-1] else None
    kind = "ease-out" if peak < 0.4 else ("ease-in" if peak > 0.6 else "ease-in-out")
    return {"span_s": [a, b], "duration_s": round(b - a, 2), "peak_at": round(peak, 2), "first_half_share": round(half, 2), "shape": kind}
res["zoom_easing"] = [easing(*s) for s in res["zoom_in_spans_s"] + res["zoom_out_spans_s"]]
json.dump(res, open(B / "motion" / "board_flow.json", "w"), indent=1)
print(res["zoom_easing"])
