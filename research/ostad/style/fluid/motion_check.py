"""Motion check for a clip: per-step mean abs diff + Farneback optical-flow magnitude inside a crop; flags pops
(a step > 2.5x the median) and the loop seam (last -> first frame vs the median step)."""
import sys, cv2, numpy as np
path = sys.argv[1]; x, y, w, h = map(int, sys.argv[2].split(",")) if len(sys.argv) > 2 else (0, 0, 0, 0)
cap = cv2.VideoCapture(path); fr = []
while True:
    ok, f = cap.read()
    if not ok: break
    g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
    if w: g = g[y:y + h, x:x + w]
    fr.append(cv2.resize(g, (g.shape[1] // 2, g.shape[0] // 2)))
d, fl = [], []
for a, b in zip(fr, fr[1:]):
    d.append(float(np.abs(a.astype(np.float32) - b).mean()))
    flow = cv2.calcOpticalFlowFarneback(a, b, None, .5, 3, 15, 3, 5, 1.2, 0)
    fl.append(float(np.linalg.norm(flow, axis=2).mean()))
d, fl = np.array(d), np.array(fl); md = np.median(d)
seam = float(np.abs(fr[-1].astype(np.float32) - fr[0]).mean())
print(f"{path.split(chr(92))[-1]} frames={len(fr)} diff med={md:.3f} max={d.max():.3f} (at {d.argmax()}) pops={int((d > 2.5 * md).sum())}"
      f" | flow px/frame med={np.median(fl) * 2:.2f} min={fl.min() * 2:.2f} max={fl.max() * 2:.2f} | seam(last->first)={seam:.3f} ratio={seam / md:.2f}")
