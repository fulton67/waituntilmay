"""Tracking error of the v5 face marks, on RENDERED pixels (client 2026-11-19: "the drawings on the face move over").

  $PY -I research/ostad/style/oct14/track_measure_v5.py <probe.mp4> <out.json>

<probe.mp4> = Oct14ReelV5 rendered with layer="probe": the footage exactly as in the reel (cut, speed, punch-ins) plus, on every frame a
tracked mark is on screen, one dot (r 6 px) per anchor it uses, in that anchor's own hue (ReelV5.tsx probeColour; 13 hues).
Per frame: the dots are found (HSV S, V >= 200, hue within 5 of the anchor's, a filled 9-16 px disc), MediaPipe Face Landmarker (IMAGE
mode, no smoothing; the whole frame, then a crop round the dot upscaled to 640 px if needed) finds her face on the SAME rendered frame,
the named point is computed with oct14_track.named, and error = |dot centre - named point|.
Bounds (ostad-video skill, RULES "Head tracking"): median < 6, p95 < 15, max <= 15 px.
"""
import json, sys
from pathlib import Path
import numpy as np
import cv2
import mediapipe as mp

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "brand/scripts"))
from oct14_track import named  # noqa: E402

MODEL = "C:/Users/naimj/tools/models/face_landmarker.task"
PROBE = ["crowR", "marioR", "jawR", "chin", "malarR", "cheekR", "nasoL", "lipCL", "nasoR", "lipCR", "marioL", "glabella", "cheekL"]
HUE = {k: (i * 360 / len(PROBE)) / 2 for i, k in enumerate(PROBE)}  # OpenCV hue 0-180


def main():
    src, out = sys.argv[1], Path(sys.argv[2])
    V = mp.tasks.vision
    lm = V.FaceLandmarker.create_from_options(V.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=MODEL), running_mode=V.RunningMode.IMAGE, num_faces=3))

    def faces(img, x0=0, y0=0, k=1.0):
        r = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB)))
        h, w = img.shape[:2]
        return [named(np.array([[x0 + p.x * w / k, y0 + p.y * h / k] for p in f])) for f in r.face_landmarks]

    cap = cv2.VideoCapture(src)
    rows, i = [], -1
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        i += 1
        hsv = cv2.cvtColor(fr, cv2.COLOR_BGR2HSV)
        sat = (hsv[..., 1] >= 200) & (hsv[..., 2] >= 200)
        if sat.sum() < 40:
            continue
        dots = []
        for k, h in HUE.items():
            dh = np.abs(hsv[..., 0].astype(int) - h)
            m = (sat & (np.minimum(dh, 180 - dh) <= 5)).astype(np.uint8)
            n, lab, st, cen = cv2.connectedComponentsWithStats(m, 8)
            for j in range(1, n):
                # a probe dot is a filled disc of r 6: 70-160 px, a 9-16 px square box, >= 60 % fill (a syringe / glove edge is not)
                bw, bh, ar = st[j, 2], st[j, 3], st[j, 4]
                if 70 <= ar <= 160 and 9 <= bw <= 16 and 9 <= bh <= 16 and ar >= 0.6 * bw * bh:
                    dots.append((k, cen[j]))
        if not dots:
            continue
        F = faces(fr)
        for k, c in dots:
            best = min((np.linalg.norm(np.array(P[k]) - c) for P in F), default=1e9)
            if best > 40:  # try a crop round the dot (small faces in the wide shot)
                s = 520
                x0, y0 = int(max(0, c[0] - s / 2)), int(max(0, c[1] - s / 2))
                crop = fr[y0:y0 + s, x0:x0 + s]
                kk = 640 / max(crop.shape[:2])
                Fc = faces(cv2.resize(crop, None, fx=kk, fy=kk, interpolation=cv2.INTER_CUBIC), x0, y0, kk)
                best = min([best] + [np.linalg.norm(np.array(P[k]) - c) for P in Fc])
            rows.append({"f": i, "key": k, "dot": [round(float(c[0]), 1), round(float(c[1]), 1)], "err": round(float(best), 2) if best < 1e8 else None})
    errs = np.array([r["err"] for r in rows if r["err"] is not None])
    nf = sum(r["err"] is None for r in rows)
    res = {"probe": src, "samples": len(rows), "no_face_on_render": nf,
           "median_px": round(float(np.median(errs)), 2) if len(errs) else None, "p95_px": round(float(np.percentile(errs, 95)), 2) if len(errs) else None,
           "max_px": round(float(errs.max()), 2) if len(errs) else None, "bounds": {"median": 6, "p95": 15, "max": 15}}
    res["pass"] = bool(len(errs) and res["median_px"] < 6 and res["p95_px"] < 15 and res["max_px"] <= 15)
    by = {}
    for r in rows:
        if r["err"] is not None:
            by.setdefault(r["key"], []).append(r["err"])
    res["by_anchor"] = {k: {"n": len(v), "median": round(float(np.median(v)), 2), "max": round(float(max(v)), 2)} for k, v in by.items()}
    res["worst"] = sorted([r for r in rows if r["err"] is not None], key=lambda r: -r["err"])[:25]
    res["rows"] = rows
    out.write_text(json.dumps(res, indent=1))
    print(json.dumps({k: v for k, v in res.items() if k not in ("rows", "worst")}, indent=1))


if __name__ == "__main__":
    main()
