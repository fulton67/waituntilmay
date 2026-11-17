"""pip_verify.py: measure B12's portrait circle (OstadYT6) on the rendered video, every frame of the beat.

Naim's review of v6 (DECISIONS 14m, note 9): the circle must be a true circular mask, his face-box centre (the track's mesh box) at the
circle's centre, head + top of shoulders filling about 75-80 % of the diameter, nothing of him outside the circle.
Per frame of B12 (after the 5 f pop):
  - circle (the mask edge): found on the render by a Hough circle fit on the pip's region (so the +-3 px float and the pop are measured, not assumed);
  - face: MediaPipe Face Landmarker on the region upscaled 3x; face-box centre = mesh extent centre (what track.json's face box is);
    offset = |face centre - circle centre| / diameter (spec < 4 %);
  - fill: (circle bottom - head top) / diameter, head top = forehead + k (forehead - chin), k = track.head_top_k (spec ~75-80 %);
  - outside: pixels in a 30 px annulus just outside the frosted ring (r + 24 .. r + 54, past the 10 px frosted ring), the tag and the timeline labels (x >= 360) excluded, that are darker than the cream
    canvas by > 40 grey levels (his scrubs/hair would be; spec 0).
Run: C:/Users/naimj/tools/style-venv/Scripts/python.exe -I research/ostad/style/tools/pip_verify.py RENDER.mp4 [FIRST_FRAME]
Output: research/ostad/style/exomind/pip_verify.json
"""
import json
import os
import sys

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
STYLE = os.path.dirname(HERE)
MODEL = "C:/Users/naimj/tools/models/face_landmarker.task"
B = {b["id"]: b for b in json.load(open(os.path.join(STYLE, "exomind", "beats.json"), encoding="utf8"))["beats"]}
K = json.load(open(os.path.join(STYLE, "exomind", "track.json"), encoding="utf8"))["head_top_k"]
X0, Y0, W = 40, 500, 360  # search region (pip at x 90, y 560, d 260)
UP = 3


def main():
    import mediapipe as mp
    V = mp.tasks.vision
    det = V.FaceLandmarker.create_from_options(V.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=MODEL), running_mode=V.RunningMode.IMAGE, num_faces=1))
    s, e = B["B12"]["start_f"] + 7, B["B12"]["end_f"]
    cap = cv2.VideoCapture(sys.argv[1])
    first = int(sys.argv[2]) if len(sys.argv) > 2 else 0  # a range render (--frames) starts at this comp frame
    cap.set(cv2.CAP_PROP_POS_FRAMES, s - first)
    rows = []
    for f in range(s, e + 1):
        ok, bgr = cap.read()
        if not ok:
            break
        reg = bgr[Y0:Y0 + W, X0:X0 + W]
        g = cv2.GaussianBlur(cv2.cvtColor(reg, cv2.COLOR_BGR2GRAY), (5, 5), 1.5)
        c = cv2.HoughCircles(g, cv2.HOUGH_GRADIENT, dp=1, minDist=400, param1=60, param2=20, minRadius=122, maxRadius=136)
        if c is None:
            rows.append({"f": f, "error": "no circle"})
            continue
        cx, cy, ro = [float(v) for v in c[0][0]]
        r = ro  # the fit is held to 122-136 px: the mask edge (dark backdrop against the white rim), not the frosted ring 10 px outside it
        big = cv2.resize(reg, (W * UP, W * UP), interpolation=cv2.INTER_CUBIC)
        res = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(big, cv2.COLOR_BGR2RGB)))
        if not res.face_landmarks:
            rows.append({"f": f, "error": "no face", "circle": [cx + X0, cy + Y0, r]})
            continue
        P = np.array([[q.x * W, q.y * W] for q in res.face_landmarks[0]])  # region px
        fc = (P.min(0) + P.max(0)) / 2
        top = P[10] + K * (P[10] - P[152])
        d = 2 * r
        yy, xx = np.mgrid[0:W, 0:W]
        rr = np.hypot(xx - cx, yy - cy)
        ann = (rr > r + 24) & (rr < r + 54) & ~((yy > cy + r - 40) & (np.abs(xx - cx) < 110)) & (xx + X0 < 360)  # tag below and the timeline's labels (x >= 360) excluded
        cream = np.median(cv2.cvtColor(bgr[60:200, 1000:1100], cv2.COLOR_BGR2GRAY))
        dark = int(((cv2.cvtColor(reg, cv2.COLOR_BGR2GRAY).astype(int) < cream - 40) & ann).sum())
        rows.append({"f": f, "circle": [round(cx + X0, 1), round(cy + Y0, 1), round(r, 1)],
                     "offset_pct": round(100 * float(np.hypot(*(fc - [cx, cy]))) / d, 2),
                     "fill_pct": round(100 * float(cy + r - top[1]) / d, 1), "outside_dark_px": dark})
    good = [x for x in rows if "offset_pct" in x]
    off = np.array([x["offset_pct"] for x in good]); fill = np.array([x["fill_pct"] for x in good])
    out = {"method": __doc__.strip(), "frames": len(rows), "measured": len(good),
           "offset_pct": {"median": round(float(np.median(off)), 2), "max": round(float(off.max()), 2), "spec": "< 4 % of the diameter on every frame"},
           "fill_pct": {"median": round(float(np.median(fill)), 1), "min": round(float(fill.min()), 1), "max": round(float(fill.max()), 1), "spec": "about 75-80 %"},
           "outside_dark_px_max": max(x["outside_dark_px"] for x in good), "rows": rows}
    json.dump(out, open(os.path.join(STYLE, "exomind", "pip_verify.json"), "w", encoding="utf8"), indent=1)
    print(json.dumps({k: v for k, v in out.items() if k not in ("rows", "method")}, indent=1))
    print([x for x in rows if "error" in x][:5])


if __name__ == "__main__":
    main()
