"""Phase 4 motion: frame-by-frame reading of the board reel (block 43001699), which motion.py classed as one 'handheld/subject motion'
shot. The contact sheet shows an overhead flat-lay on white, so this checks what moves: camera or objects.
  - per-frame mean abs diff (grey, 270 px wide) -> timeline, held frames (diff < HOLD), step events (diff > STEP)
  - background drift: phase correlation on the frame border (outer 8%), where a camera move would show and objects rarely sit
  - moving area: share of pixels changing > 25 grey levels per frame
  - held-frame run lengths -> animation cadence (on ones / twos / threes)
Thresholds are judgment calls. -> brand/motion/board_detail.json, brand/fig/motion_board_timeline.png. brand-venv python -I."""
import json, pathlib, statistics as st
from collections import Counter
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
B = pathlib.Path(__file__).resolve().parents[1]
SRC = B / "board" / "media" / "43001699.mp4"
HOLD, STEP, PIX = 0.6, 6.0, 25   # mean abs diff below HOLD = held frame; above STEP = step change; pixel change threshold

cap = cv2.VideoCapture(str(SRC)); fps = cap.get(cv2.CAP_PROP_FPS); G = []
while True:
    ok, f = cap.read()
    if not ok: break
    G.append(cv2.cvtColor(cv2.resize(f, (270, 480)), cv2.COLOR_BGR2GRAY).astype(np.float32))
n = len(G); h, w = G[0].shape; bw, bh = int(w * .08), int(h * .08)
diff, area, drift = [0.0], [0.0], [0.0]
win = cv2.createHanningWindow((w, h), cv2.CV_32F)
for i in range(1, n):
    d = np.abs(G[i] - G[i - 1]); diff.append(float(d.mean())); area.append(float((d > PIX).mean()))
    (dx, dy), _ = cv2.phaseCorrelate(G[i - 1] * win, G[i] * win); drift.append(float(np.hypot(dx, dy)))
held = [i for i in range(1, n) if diff[i] < HOLD]
runs, r = [], 1
for i in range(1, n):
    if diff[i] < HOLD: r += 1
    else: runs.append(r); r = 1
runs.append(r)
steps = [i for i in range(1, n) if diff[i] > STEP]
# group consecutive step frames into events
ev = []
for i in steps:
    if ev and i - ev[-1][-1] <= 2: ev[-1].append(i)
    else: ev.append([i])
events = [{"start_s": round(e[0] / fps, 2), "end_s": round(e[-1] / fps, 2), "frames": len(e), "peak_diff": round(max(diff[j] for j in e), 1),
           "moving_area_pct": round(100 * max(area[j] for j in e), 1)} for e in ev]
gaps = [round(events[k + 1]["start_s"] - events[k]["end_s"], 2) for k in range(len(events) - 1)]
cad = Counter(runs)
out = {"source": "board/media/43001699.mp4", "fps": fps, "frames": n, "duration_s": round(n / fps, 2),
       "thresholds": {"hold_mean_abs_diff": HOLD, "step_mean_abs_diff": STEP, "pixel_change": PIX, "border_pct": 8},
       "held_frame_share": round(len(held) / (n - 1), 3), "hold_run_lengths": dict(sorted(cad.items())),
       "median_run_frames": st.median(runs), "effective_fps": round(fps / st.median(runs), 1),
       "global_drift_px_median": round(st.median(drift[1:]), 3), "global_drift_px_p95": round(float(np.percentile(drift[1:], 95)), 3),
       "moving_area_pct_median": round(100 * st.median(area[1:]), 2), "diff_median": round(st.median(diff[1:]), 2),
       "step_events": events, "gaps_between_steps_s": gaps, "median_gap_s": st.median(gaps) if gaps else None,
       "per_frame": [{"t": round(i / fps, 3), "diff": round(diff[i], 2), "area": round(area[i], 4), "drift": round(drift[i], 3)} for i in range(n)]}
json.dump(out, open(B / "motion" / "board_detail.json", "w"), indent=1)

# plate: diff timeline with step events and held frames
W, H = 1400, 420; im = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(im)
try: F, FB = ImageFont.truetype("arial.ttf", 14), ImageFont.truetype("arialbd.ttf", 24)
except OSError: F = FB = ImageFont.load_default()
d.text((20, 15), "BOARD REEL, FRAME BY FRAME", fill="black", font=FB)
d.text((20, 50), f"{len(events)} step changes, a median {out['median_gap_s']} s apart; camera drift {out['global_drift_px_median']} px/frame (median); {int(100*out['held_frame_share'])}% of frames held.", fill="black", font=F)
x0, y0, x1, y1 = 60, 90, W - 30, H - 50; mx = max(diff) or 1
for e in events:
    d.rectangle([x0 + e["start_s"] * fps / n * (x1 - x0) - 1, y0, x0 + (e["end_s"] * fps + 1) / n * (x1 - x0), y1], fill=(234, 222, 212))
pts = [(x0 + i / n * (x1 - x0), y1 - diff[i] / mx * (y1 - y0)) for i in range(n)]
d.line(pts, fill=(33, 27, 21), width=2)
d.line([(x0, y1 - STEP / mx * (y1 - y0)), (x1, y1 - STEP / mx * (y1 - y0))], fill=(166, 121, 88), width=1)
d.text((x1 - 170, y1 - STEP / mx * (y1 - y0) - 18), f"step threshold {STEP}", fill=(166, 121, 88), font=F)
for t in range(0, int(n / fps) + 1):
    d.text((x0 + t * fps / n * (x1 - x0) - 4, y1 + 8), f"{t}s", fill=(120, 120, 120), font=F)
d.text((10, y0), "diff", fill=(120, 120, 120), font=F)
im.save(B / "fig" / "motion_board_timeline.png")
print(json.dumps({k: v for k, v in out.items() if k != "per_frame"}, indent=1))
