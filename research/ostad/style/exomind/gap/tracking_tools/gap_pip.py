"""B12 pip on the rendered pixels: circle by Hough + radial edge profile, face centre by MediaPipe on a 3x upscale, him outside the circle."""
import json, sys
import numpy as np, cv2, mediapipe as mp
RENDER, OUT = sys.argv[1], sys.argv[2]
MODEL = "C:/Users/naimj/tools/models/face_landmarker.task"
V = mp.tasks.vision
det = V.FaceLandmarker.create_from_options(V.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=MODEL), running_mode=V.RunningMode.IMAGE, num_faces=1))
cap = cv2.VideoCapture(RENDER); cap.set(cv2.CAP_PROP_POS_FRAMES, 1176)
rows = []
for f in range(1176, 1246):
    ok, bgr = cap.read()
    if not ok: break
    reg = bgr[440:940, 0:460]; g = cv2.GaussianBlur(cv2.cvtColor(reg, cv2.COLOR_BGR2GRAY), (5, 5), 1.2)
    c = cv2.HoughCircles(g, cv2.HOUGH_GRADIENT, dp=1, minDist=400, param1=60, param2=20, minRadius=100, maxRadius=150)
    row = {"f": f}
    if c is None: rows.append(row); continue
    cx, cy, r = c[0][0]; cy += 440
    # radial edge: from the centre outwards, first radius where grey jumps > 60 into the light ring (dark inside -> white ring)
    G = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(int)
    radii = []
    for a in np.linspace(0, 2 * np.pi, 180, endpoint=False):
        prof = [G[int(round(cy + rr * np.sin(a))), int(round(cx + rr * np.cos(a)))] for rr in range(int(r) - 25, int(r) + 25)]
        dif = np.diff(prof)
        k = int(np.argmax(dif)); radii.append(r - 25 + k + 0.5)
    radii = np.array(radii)
    # face
    x0, y0 = int(cx - r), int(cy - r); s = int(2 * r)
    crop = bgr[y0:y0 + s, x0:x0 + s]; big = cv2.resize(crop, (s * 3, s * 3), interpolation=cv2.INTER_CUBIC)
    res = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(big[:, :, ::-1])))
    if res.face_landmarks:
        xy = np.array([[p.x * s * 3, p.y * s * 3] for p in res.face_landmarks[0]]) / 3 + [x0, y0]
        fx = (xy[:, 0].min() + xy[:, 0].max()) / 2; fy = (xy[:, 1].min() + xy[:, 1].max()) / 2
        fT, ch = xy[10], xy[152]; hT = fT + 0.3328 * (fT - ch)
        row.update(face_c=[round(fx, 1), round(fy, 1)], off_px=round(float(np.hypot(fx - cx, fy - cy)), 1),
                   off_dx=round(float(fx - cx), 1), off_dy=round(float(fy - cy), 1), face_h=round(float(xy[:, 1].max() - xy[:, 1].min()), 1),
                   head_c_y=round(float((hT[1] + xy[:, 1].max()) / 2), 1), headTop_y=round(float(hT[1]), 1))
    # outside: annulus r_edge+14 .. r_edge+60, excluding the name tag (y > cy + 0.75 r) and x >= 360; darker than the cream by > 40 / > 20
    re = float(np.median(radii))
    yy, xx = np.mgrid[0:1080, 0:470]; d = np.hypot(xx - cx, yy - cy)
    ann = (d > re + 14) & (d < re + 60) & (xx < 360) & ~(yy > cy + 0.75 * r)
    cream = np.median(G[:, :470][(d > re + 70) & (d < re + 110) & (xx < 360)])
    gv = G[:, :470]
    row.update(circle=[round(float(cx), 1), round(float(cy), 1), round(float(r), 1)], edge_r_med=round(re, 1), edge_r_std=round(float(radii.std()), 2),
               edge_r_rng=round(float(np.percentile(radii, 95) - np.percentile(radii, 5)), 1),
               out40=int(((cream - gv) > 40)[ann].sum()), out20=int(((cream - gv) > 20)[ann].sum()), cream=float(cream))
    rows.append(row)
json.dump(rows, open(OUT, "w"), indent=0)
print(len(rows))
