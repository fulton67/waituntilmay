"""Oct 14 reel v5: the jowl mark goes on a STILL frame (client 2026-11-19, tracking rule: "if a mark cannot be tracked to that bound,
put it on a still frame instead of moving footage").

Why: the jowl contour sits on the 2x punch-in "intro-midface~2/b" (comp 781-811). Its points are jaw-line landmarks, which MediaPipe
places 6-14 px apart between two detections of the same face (source px), so on the 2x picture the error on the render was 12-28 px
(track_measure_v5.json, first pass). On a still, the mark and the measurement read the same pixels.

  $PY -I brand/scripts/oct14_still_v5.py
-> brand/remotion/public/oct14/still_jowl.jpg  (the source frame the piece starts on, with the piece's 2x punch-in applied: exactly the
   picture Remotion showed on its first frame, 1080x1920)
-> brand/remotion/public/oct14/stills_v5.json  {jowl: {piece, src_frame, pts: {name: [x, y]}, line}}: her named points and the jaw-line
   contour (face-oval landmarks 152-377-400-378-379-365-397) detected on THAT image
"""
import json, sys
from pathlib import Path
import numpy as np
import cv2
import mediapipe as mp

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "brand/remotion/public/oct14"
MODEL = "C:/Users/naimj/tools/models/face_landmarker.task"
sys.path.insert(0, str(ROOT / "brand/scripts"))
from oct14_track import named  # noqa: E402

PIECE = "intro-midface~2/b"


def main():
    P = json.loads((PUB / "props.json").read_text())
    pc = next(x for x in P["pieces"] if x["id"] == PIECE)
    sf = int(round(pc["pictureFrom"] * 24))
    cap = cv2.VideoCapture(str(PUB / f"{pc['pictureRole']}.mp4"))
    for _ in range(sf):
        cap.grab()
    ok, fr = cap.read()
    s = pc.get("punch") or 1
    o = pc.get("punchO") or [0.4, 0.42]
    ox, oy = o[0] * 1080, o[1] * 1920
    M = np.float32([[s, 0, ox * (1 - s)], [0, s, oy * (1 - s)]])
    img = cv2.warpAffine(fr, M, (1080, 1920), flags=cv2.INTER_LINEAR)
    cv2.imwrite(str(PUB / "still_jowl.jpg"), img, [cv2.IMWRITE_JPEG_QUALITY, 95])
    V = mp.tasks.vision
    lm = V.FaceLandmarker.create_from_options(V.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=MODEL), running_mode=V.RunningMode.IMAGE, num_faces=2))
    r = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB)))
    faces = [np.array([[p.x * 1080, p.y * 1920] for p in f]) for f in r.face_landmarks]
    L = max(faces, key=lambda c: np.ptp(c[:, 0]))
    pts = {k: [round(float(v[0]), 1), round(float(v[1]), 1)] for k, v in named(L).items()}
    # the jowl contour itself: the face-oval landmarks along her lower jaw on the side he points at (chin 152 -> jaw angle 397)
    jowl = [[round(float(L[i][0]), 1), round(float(L[i][1]), 1)] for i in (152, 377, 400, 378, 379, 365, 397)]
    (PUB / "stills_v5.json").write_text(json.dumps({"jowl": {"piece": PIECE, "src_frame": sf, "pts": pts, "line": jowl}}))
    print(sf, {k: pts[k] for k in ("marioR", "jawR", "chin")})


if __name__ == "__main__":
    main()
