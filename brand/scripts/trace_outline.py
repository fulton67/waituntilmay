"""Trace a glowing outline in a render, frame by frame, into SVG paths (v3 s11: the client asked for illustrated anatomy to be traced
from a real source "pixel by pixel, frame by frame", never freehand).

Per frame: V channel -> white top-hat (thin bright structures) -> close -> largest external contour; keep only the contour points that
sit on a real bright rim (top-hat above the threshold within a few px), so the closing edges the morphology invents are dropped; split
into runs, simplify (Douglas-Peucker, eps px), write one SVG path string per frame in source pixels.

  python -I trace_outline.py in.mp4 out.json --from 48 --frames 64 [--thr 18] [--eps 1.0]
"""
import argparse, json
import numpy as np, cv2

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("out")
ap.add_argument("--from", dest="start", type=int, default=0); ap.add_argument("--frames", type=int, default=48)
ap.add_argument("--thr", type=int, default=18); ap.add_argument("--eps", type=float, default=1.0); ap.add_argument("--minrun", type=int, default=24)
a = ap.parse_args()
cap = cv2.VideoCapture(a.src); cap.set(cv2.CAP_PROP_POS_FRAMES, a.start)
k21 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21)); k41 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41))
frames, W, H = [], int(cap.get(3)), int(cap.get(4))
for _ in range(a.frames):
    ok, f = cap.read()
    if not ok: break
    V = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)[:, :, 2]
    th = cv2.morphologyEx(V, cv2.MORPH_TOPHAT, k21)
    rim = cv2.dilate((th > a.thr).astype(np.uint8), np.ones((5, 5), np.uint8))
    m = cv2.morphologyEx((th > a.thr).astype(np.uint8) * 255, cv2.MORPH_CLOSE, k41)
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)[:, 0, :]
    on = np.array([rim[y, x] > 0 and 3 < y < H - 3 and 3 < x < W - 3 for x, y in c])
    # rotate so the walk starts on an off point, then split into runs of on points
    if on.all(): runs = [c]
    else:
        s = int(np.argmin(on)); c, on = np.roll(c, -s, 0), np.roll(on, -s)
        runs, cur = [], []
        for p, o in zip(c, on):
            if o: cur.append(p)
            elif cur: runs.append(np.array(cur)); cur = []
        if cur: runs.append(np.array(cur))
    d = ""
    for r in runs:
        if len(r) < a.minrun: continue
        q = cv2.approxPolyDP(r.reshape(-1, 1, 2).astype(np.int32), a.eps, False)[:, 0, :]
        d += "M" + " L".join(f"{x} {y}" for x, y in q) + " "
    frames.append(d.strip())
json.dump({"w": W, "h": H, "from": a.start, "frames": frames}, open(a.out, "w"))
print(len(frames), "frames,", sum(len(x) for x in frames) // max(1, len(frames)), "chars/frame")
