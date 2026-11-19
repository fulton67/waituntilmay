"""Oct 14 reel v5: every face (his and hers) per composition frame, from the source clips through the cut's own mapping, so each
card / plate / title can be placed where no face is (client 2026-11-19: "the text shouldn't go directly over the face ever").

  $PY -I brand/scripts/oct14_faces.py          # -> brand/edits/oct14-injection/faces_src.json (gitignored folder)
  $PY -I brand/scripts/oct14_faces.py --render <allowed.mp4>   # -> faces_render.json: faces on the rendered allowed layer (preferred)
Mapping (the same as Reel.tsx Picture): clip frame = round(pictureFrom * 24) + (f - at) * speed; a punch-in scales about punchO.
Detector: OpenCV YuNet (face_detection_yunet_2023mar.onnx, score >= 0.55) united with MediaPipe Face Landmarker boxes (3 faces), so a
turned head that one model misses the other catches. Boxes are composition px [x, y, w, h], every 2nd frame. This is the planning
input; the pass/fail check runs on the rendered pixels (research/ostad/style/oct14/face_clear.py).
"""
import json, sys
from pathlib import Path
import numpy as np
import cv2
import mediapipe as mp

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "brand/remotion/public/oct14"
EDIT = ROOT / "brand/edits/oct14-injection"
YUNET = "C:/Users/naimj/tools/models/face_detection_yunet_2023mar.onnx"
MODEL = "C:/Users/naimj/tools/models/face_landmarker.task"
W, H = 1080, 1920


class Faces:
    def __init__(self):
        self.yn = cv2.FaceDetectorYN.create(YUNET, "", (W // 2, H // 2), 0.55, 0.3, 50)
        V = mp.tasks.vision
        self.lm = V.FaceLandmarker.create_from_options(V.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=MODEL),
                                                                               running_mode=V.RunningMode.IMAGE, num_faces=3))

    def __call__(self, img):
        h, w = img.shape[:2]
        small = cv2.resize(img, (w // 2, h // 2))
        self.yn.setInputSize((w // 2, h // 2))
        _, d = self.yn.detect(small)
        boxes = [[float(v) * 2 for v in r[:4]] for r in (d if d is not None else [])]
        r = self.lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB)))
        for f in r.face_landmarks:
            xs, ys = [p.x * w for p in f], [p.y * h for p in f]
            b = [min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)]
            if not any(iou(b, c) > 0.3 for c in boxes):
                boxes.append(b)
        return boxes


def iou(a, b):
    x0, y0 = max(a[0], b[0]), max(a[1], b[1])
    x1, y1 = min(a[0] + a[2], b[0] + b[2]), min(a[1] + a[3], b[1] + b[3])
    i = max(0, x1 - x0) * max(0, y1 - y0)
    return i / (a[2] * a[3] + b[2] * b[3] - i + 1e-6)


def from_render(mp4):
    """Faces on a RENDERED layer="allowed" pass: the very frames face_clear.py reads (no seek, no source->comp mapping to get wrong).
    face_clear 2026-11-19 test 1: faces_src.json (seeked source frames) missed her in the wide shot, so the solver put O1 and the
    CompareClips card on her. -> faces_render.json, which oct14_layout_v5.py prefers."""
    F = Faces()
    cap = cv2.VideoCapture(str(mp4))
    out, i = {}, -1
    while True:
        ok, img = cap.read()
        if not ok:
            break
        i += 1
        if i % 2:
            continue
        out[i] = [[int(v) for v in b] for b in F(img)]
    (EDIT / "faces_render.json").write_text(json.dumps(out))
    print("faces_render.json", len(out), "frames")


def main():
    if len(sys.argv) > 2 and sys.argv[1] == "--render":
        return from_render(sys.argv[2])
    P = json.loads((PUB / "props.json").read_text())
    F = Faces()
    out = {}
    caps = {}
    sp = P["speed"]
    segs = [(x["at"], x["dur"], x["pictureRole"], x["pictureFrom"], x.get("punch") or 1, x.get("punchO") or [0.4, 0.42]) for x in P["pieces"]]
    last = P["pieces"][-1]
    segs.append((P["durationInFrames"], P["tail"], last["pictureRole"], last["to"], 1, [0.4, 0.42]))
    for at, dur, role, pf, s, o in segs:
        cap = caps.setdefault(role, cv2.VideoCapture(str(PUB / f"{role}.mp4")))
        for f in range(at + (at % 2), at + dur, 2):
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(pf * 24 + (f - at) * sp)))
            ok, img = cap.read()
            if not ok:
                continue
            ox, oy = o[0] * W, o[1] * H
            boxes = []
            for b in F(img):
                x0, y0 = ox + (b[0] - ox) * s, oy + (b[1] - oy) * s
                boxes.append([round(x0), round(y0), round(b[2] * s), round(b[3] * s)])
            out[f] = boxes
        print(role, at, dur)
    (EDIT / "faces_src.json").write_text(json.dumps(out))


if __name__ == "__main__":
    main()
