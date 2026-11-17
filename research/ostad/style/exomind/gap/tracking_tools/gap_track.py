"""Independent tracking-accuracy gap measurement on the RENDERED v6 pixels.
Pass over every frame: MediaPipe Face Landmarker (IMAGE mode, no temporal smoothing) on the left 960 px;
blue-stroke tail detection on B03/B16; per-pixel diff of the render against the keyed webm (alpha source) placed at LAYER6
inside the measured face box / head box (overlay-over-face test). Writes raw.json next to this script.
"""
import json, subprocess, sys, os
import numpy as np, cv2, mediapipe as mp

RENDER = sys.argv[1]; WEBM = sys.argv[2]; TRACK = sys.argv[3]; BEATS = sys.argv[4]; OUT = sys.argv[5]
MODEL = "C:/Users/naimj/tools/models/face_landmarker.task"
L = dict(s=0.7, x=-30, y=-150)
track = json.load(open(TRACK)); K = track["head_top_k"]
beats = json.load(open(BEATS))["beats"]
def beat_of(f):
    for b in beats:
        if b["start_f"] <= f <= b["end_f"]: return b["id"]
    return "card"
OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109]

V = mp.tasks.vision
det = V.FaceLandmarker.create_from_options(V.FaceLandmarkerOptions(
    base_options=mp.tasks.BaseOptions(model_asset_path=MODEL), running_mode=V.RunningMode.IMAGE, num_faces=3))

def track_pt(f, name):
    sf = f / 24 * 1.15 * 30
    i0 = int(np.floor(sf)); a = sf - i0
    r = track["row"]; ix, iy = r.index(name + ".x"), r.index(name + ".y")
    A = track["frames"][min(i0, len(track["frames"]) - 1)]; B = track["frames"][min(i0 + 1, len(track["frames"]) - 1)]
    if A is None or B is None: return None
    px = A[ix] * (1 - a) + B[ix] * a; py = A[iy] * (1 - a) + B[iy] * a
    return (L["x"] + L["s"] * px, L["y"] + L["s"] * py)

def blue_mask(bgr):
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    return cv2.inRange(hsv, (92, 70, 110), (108, 255, 255))

def tail_point(bgr, region):
    x0, y0, x1, y1 = region
    m = blue_mask(bgr[y0:y1, x0:x1])
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    if n <= 1: return None
    k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    if st[k, cv2.CC_STAT_AREA] < 60: return None
    ys, xs = np.nonzero(lab == k)
    o = np.argsort(xs)[:4]
    return (float(xs[o].mean() + x0), float(ys[o].mean() + y0), int(st[k, cv2.CC_STAT_AREA]))

# webm reader (rgba 756x1344, 30 fps), streamed
WW, WH = 756, 1344
wp = subprocess.Popen(["ffmpeg", "-v", "error", "-c:v", "libvpx-vp9", "-i", WEBM, "-f", "rawvideo", "-pix_fmt", "rgba", "-"], stdout=subprocess.PIPE, bufsize=WW*WH*4*4)
wbuf = {}; wnext = 0
def webm(i):
    global wnext
    while wnext <= i:
        b = wp.stdout.read(WW * WH * 4)
        if len(b) < WW * WH * 4: return wbuf.get(i)
        wbuf[wnext] = np.frombuffer(b, np.uint8).reshape(WH, WW, 4); wnext += 1
        for k in [k for k in wbuf if k < wnext - 6]: del wbuf[k]
    return wbuf.get(i)

def overlay_px(bgr, rect, wi):
    """pixels inside rect where the keyed layer is opaque and the render differs from it by > 40 (max channel)."""
    best = None
    for d in (-1, 0, 1):
        w = webm(wi + d) if wi + d >= 0 else None
        if w is None: continue
        x0, y0, x1, y1 = [int(round(v)) for v in rect]
        x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, 1920), min(y1, 1080)
        # comp px -> webm px: (cx - L.x, cy - L.y) since webm is already at 0.7x
        wx0, wy0 = x0 - L["x"], y0 - L["y"]
        wx1, wy1 = x1 - L["x"], y1 - L["y"]
        if wx0 < 0: x0 -= wx0; wx0 = 0
        if wy0 < 0: y0 -= wy0; wy0 = 0
        wx1 = min(wx1, WW); wy1 = min(wy1, WH); x1 = x0 + (wx1 - wx0); y1 = y0 + (wy1 - wy0)
        if x1 <= x0 or y1 <= y0: return None
        W = w[wy0:wy1, wx0:wx1]; R = bgr[y0:y1, x0:x1][:, :, ::-1].astype(np.int16)
        op = W[:, :, 3] > 250
        diff = np.abs(R - W[:, :, :3].astype(np.int16)).max(2)
        cnt = int(((diff > 40) & op).sum()); med = float(np.median(diff[op])) if op.any() else -1
        if best is None or cnt < best[0]: best = (cnt, med, d, int(op.sum()))
    return best

cap = cv2.VideoCapture(RENDER)
rows = []; f = 0
B03 = (160, 262); B16 = (1600, 1709)
while True:
    ok, bgr = cap.read()
    if not ok: break
    row = {"f": f, "beat": beat_of(f)}
    crop = np.ascontiguousarray(bgr[:, :960, ::-1])
    r = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=crop))
    pred = track_pt(f, "noseTip")
    best = None
    for lm in r.face_landmarks:
        xy = np.array([[p.x * 960, p.y * 1080] for p in lm])
        w = xy[:, 0].max() - xy[:, 0].min()
        d = np.hypot(*(xy[1] - pred)) if pred else 0
        if w < 60: continue  # pip / tiny faces handled separately
        if best is None or d < best[0]: best = (d, xy)
    if best is not None:
        xy = best[1]
        fT, ch = xy[10], xy[152]; hT = fT + K * (fT - ch)
        row.update(nose=xy[1].round(2).tolist(), fT=fT.round(2).tolist(), chin=ch.round(2).tolist(), headTop=hT.round(2).tolist(),
                   templeR=xy[389].round(2).tolist(), eyeOL=xy[33].round(2).tolist(), eyeOR=xy[263].round(2).tolist(),
                   box=[float(xy[:, 0].min()), float(xy[:, 1].min()), float(xy[:, 0].max()), float(xy[:, 1].max())])
        row["track"] = {n: (lambda p: [round(p[0], 2), round(p[1], 2)] if p else None)(track_pt(f, n)) for n in ("noseTip", "headTop", "templeR", "eyeOuterL", "eyeOuterR")}
        wi = int(round(f / 24 * 1.15 * 30))
        bx = row["box"]
        row["ov_face"] = overlay_px(bgr, bx, wi)
        row["ov_head"] = overlay_px(bgr, [bx[0], min(bx[1], hT[1]), bx[2], bx[3]], wi)
    if B03[0] <= f <= B03[1]:
        row["tail"] = tail_point(bgr, (0, 0, 820, 420))
    if B16[0] <= f <= B16[1]:
        row["tail"] = tail_point(bgr, (0, 250, 1030, 620))
    rows.append(row); f += 1
    if f % 200 == 0: print(f, flush=True)
json.dump(rows, open(OUT, "w"))
print("done", f)
