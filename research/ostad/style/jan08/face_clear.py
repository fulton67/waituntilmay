"""Jan 08 reel: is any face covered by a graphic? (client 2026-11-19: "the text shouldn't go directly over the face ever")

Two renders of the same composition (Jan08ReelV3, brand/remotion):
  footage  --props='{"mode":"footage"}'  talk, keyed him (alpha-only key over the raw footage), b-roll, her photo, the cream room;
                                         no text, card, plate, label, caption, window, chip.
  graphics --props='{"mode":"check"}'    everything except the exempt marks (the pen marks on the patient's face in "His plan" / the result).
Faces: OpenCV YuNet (C:/Users/naimj/tools/models/face_detection_yunet_2023mar.onnx) on the FOOTAGE frame, so his face is found where it
really is (the keyed plates move and shrink him) and a covered face is still found. Each box is expanded 10 % per side.
Graphics mask: |graphics - footage| > 28 (max over RGB, 3x3 open to drop codec noise). A frame FAILS when > MIN_PX mask pixels fall
inside an expanded face box. Exempt by construction: titles behind him (his key is over them: no diff on his face), the marks on her
face (absent from the check render), faces inside the journal photos (not in the footage render, so never a face box).
"before": the delivered v2 file against the footage render of V3 with {"mode":"footage","layoutV2":true} (v2's layout and assets).

  $PY -I research/ostad/style/jan08/face_clear.py <footage.mp4> <graphics.mp4> <out.json> [--step 2] [--label v3]
"""
import json
import subprocess
import sys

import cv2
import numpy as np

MODEL = "C:/Users/naimj/tools/models/face_detection_yunet_2023mar.onnx"
W, H = 540, 960  # analysed at half size
THR, MIN_PX, EXPAND, SCORE = 28, 12, 0.10, 0.75  # 0.75: his hand scored 0.67 once (f846); real faces score 0.85-0.95


def reader(path):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={W}:{H}:flags=area", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
                         stdout=subprocess.PIPE)
    n = W * H * 3
    while True:
        b = p.stdout.read(n)
        if len(b) < n:
            return
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3)


def main():
    a = sys.argv[1:]
    foot, gfx, out = a[0], a[1], a[2]
    step = int(a[a.index("--step") + 1]) if "--step" in a else 2
    label = a[a.index("--label") + 1] if "--label" in a else ""
    det = cv2.FaceDetectorYN.create(MODEL, "", (W, H), SCORE, 0.3, 50)
    k3 = np.ones((3, 3), np.uint8)
    fails, checked, with_face, faces_total = [], 0, 0, 0
    for i, (fa, ga) in enumerate(zip(reader(foot), reader(gfx))):
        if i % step:
            continue
        checked += 1
        _, fs = det.detect(fa)
        if fs is None or not len(fs):
            continue
        with_face += 1
        d = (np.abs(fa.astype(np.int16) - ga.astype(np.int16)).max(2) > THR).astype(np.uint8)
        d = cv2.morphologyEx(d, cv2.MORPH_OPEN, k3)
        for f in fs:
            faces_total += 1
            x, y, w, h = f[:4]
            ex, ey = w * EXPAND, h * EXPAND
            x0, y0, x1, y1 = int(max(0, x - ex)), int(max(0, y - ey)), int(min(W, x + w + ex)), int(min(H, y + h + ey))
            n = int(d[y0:y1, x0:x1].sum())
            if n > MIN_PX:
                fails.append({"frame": i, "t": round(i / 24, 2), "box_full_px": [2 * x0, 2 * y0, 2 * x1, 2 * y1], "score": round(float(f[14]), 2),
                              "gfx_px_in_box_full": 4 * n, "frac": round(n / max(1, (x1 - x0) * (y1 - y0)), 4)})
    # group failing frames into runs
    runs = []
    for f in fails:
        if runs and f["frame"] - runs[-1]["to"] <= step:
            runs[-1]["to"] = f["frame"]; runs[-1]["max_px"] = max(runs[-1]["max_px"], f["gfx_px_in_box_full"])
        else:
            runs.append({"from": f["frame"], "to": f["frame"], "t": f["t"], "max_px": f["gfx_px_in_box_full"]})
    res = {"label": label, "footage": foot, "graphics": gfx, "step": step, "frames_checked": checked, "frames_with_face": with_face,
           "faces": faces_total, "failing_frames": len({f["frame"] for f in fails}), "runs": runs, "pass": not fails,
           "rule": f"graphics diff > {THR} (3x3 open) inside a YuNet face box (score >= {SCORE}) expanded {int(EXPAND * 100)} %/side; fail if > {MIN_PX} px at half size",
           "fails": fails[:400]}
    json.dump(res, open(out, "w"), indent=1)
    print(json.dumps({k: res[k] for k in ("label", "frames_checked", "frames_with_face", "faces", "failing_frames", "pass")}))
    for r in runs:
        print("  run", r)


if __name__ == "__main__":
    main()
