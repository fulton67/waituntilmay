"""Under-eye reel v4: are the surgeon's marks locked to her face? Measured on the RENDERED pixels (skill tracking bounds: median < 6,
p95 < 15, max <= 15 px).

v4 draws every face mark on a registered still (the plan board, the before/after window), never on moving footage. For each rendered frame
in the given spans, independently of the composition:
  1. her face in the render is found with MediaPipe Face Landmarker (IMAGE mode, no smoothing); 8 stable landmarks (eye corners, nose
     bridge and tip, mouth corners) are matched to the same landmarks on ba_wipe_before.jpg, and a similarity transform (least squares)
     places the reference photo in the frame (with a window over footage, the face that fits the reference best is the photo's);
  2. each read entry point of sketch.json is projected through it;
  3. the rendered x is found by a matched filter (a 27 px x of 5 px strokes, the size the composition draws it on screen) on the
     near-white pixels within 40 px of the projection.
error = |filter peak - projected entry| in rendered px.
usage (style venv): python -I brand/scripts/undereye_lock_check.py <render.mp4> <out.json> <f0-f1>[,<f0-f1>...] [frame offset of the file]
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np
import cv2
import mediapipe as mp

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "brand/remotion/public/undereye-filler"
MODEL = "C:/Users/naimj/tools/models/face_landmarker.task"
SK = json.load(open(ROOT / "brand/edits/undereye-filler/sketch.json"))
ENTRIES = {k: np.array(v["entry"], float) for k, v in SK["sides"].items()}
LM = [33, 133, 362, 263, 168, 1, 61, 291]
W, H = 1080, 1920

V = mp.tasks.vision
det = V.FaceLandmarker.create_from_options(V.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=MODEL),
                                                                   running_mode=V.RunningMode.IMAGE, num_faces=3))


def landmarks(bgr):
    r = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))))
    h, w = bgr.shape[:2]
    return [np.array([[f[i].x * w, f[i].y * h] for i in LM]) for f in r.face_landmarks]


ref = landmarks(cv2.imread(str(PUB / "ba_wipe_before.jpg")))[0]


def similarity(a, b):
    """least-squares similarity a -> b (2x3)"""
    ma, mb = a.mean(0), b.mean(0); A, B = a - ma, b - mb
    s = np.sum(A * A)
    p = np.sum(A[:, 0] * B[:, 0] + A[:, 1] * B[:, 1]) / s; q = np.sum(A[:, 0] * B[:, 1] - A[:, 1] * B[:, 0]) / s
    M = np.array([[p, -q], [q, p]])
    return np.hstack([M, (mb - M @ ma)[:, None]])


K = np.zeros((27, 27), np.float32)
cv2.line(K, (0, 0), (26, 26), 1, 5); cv2.line(K, (26, 0), (0, 26), 1, 5)
K -= K.mean()

render, out = sys.argv[1], sys.argv[2]
spans = [tuple(int(v) for v in s.split("-")) for s in sys.argv[3].split(",")]
off = int(sys.argv[4]) if len(sys.argv) > 4 else 0
want = sorted({f for a, b in spans for f in range(a, b + 1)})
pr = subprocess.Popen(["ffmpeg", "-v", "error", "-i", render, "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE)
rows, f = [], 0
while True:
    b = pr.stdout.read(W * H * 3)
    if len(b) < W * H * 3 or f > want[-1]: break
    if f in want:
        im = np.frombuffer(b, np.uint8).reshape(H, W, 3)
        best = None
        for L in landmarks(im):
            T = similarity(ref, L); r = np.abs((ref @ T[:, :2].T + T[:, 2]) - L).mean()
            if best is None or r < best[0]: best = (r, T)
        if best is None:
            rows.append({"f": f + off, "found": False, "why": "no face"}); f += 1; continue
        T = best[1]
        white = (im.min(axis=2) > 215).astype(np.float32)
        resp = cv2.filter2D(white, -1, K)
        for k, e in ENTRIES.items():
            pe = T[:, :2] @ e + T[:, 2]
            x0, y0 = int(pe[0] - 40), int(pe[1] - 40)
            sub = resp[max(0, y0):y0 + 81, max(0, x0):x0 + 81]
            if sub.size == 0 or sub.max() < 20:
                rows.append({"f": f + off, "side": k, "found": False, "why": "no x"}); continue
            yy, xx = np.unravel_index(np.argmax(sub), sub.shape)
            c = np.array([xx + max(0, x0), yy + max(0, y0)], float)
            rows.append({"f": f + off, "side": k, "found": True, "err": round(float(np.linalg.norm(c - pe)), 2), "x": c.tolist(),
                         "proj": pe.round(1).tolist(), "fit_px": round(float(best[0]), 2)})
    f += 1

errs = [r["err"] for r in rows if r.get("found")]
res = {"render": render, "spans": spans, "offset": off, "frames": len(want), "measured": len(errs), "missing": sum(1 for r in rows if not r.get("found")),
       "median_px": float(np.median(errs)) if errs else None, "p95_px": float(np.percentile(errs, 95)) if errs else None, "max_px": float(max(errs)) if errs else None}
res["pass"] = bool(errs) and res["median_px"] < 6 and res["p95_px"] < 15 and res["max_px"] <= 15
res["rows"] = rows
json.dump(res, open(out, "w"), indent=1)
print({k: v for k, v in res.items() if k != "rows"})
