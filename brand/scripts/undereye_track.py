"""Under-eye filler reel: face points of the PATIENT on the shots that carry markup, per composition frame.

MediaPipe Face Landmarker (VIDEO mode, up to 2 faces) on the transcoded clips, the patient's face picked by continuity from a side
hint (she sits right of him in IMG_6816/6821 and left in IMG_6818; alone in the close-ups), One Euro smoothed (min_cutoff 0.1 Hz,
beta 0.03: the values tuned in style DECISIONS 14g). Markup goes on her treated area only (condition footage), never on his face.

Points (image side L/R = the viewer's left/right):
  underL / underR  the tear-trough hollow: 1/3 of the way from the lower-lid midpoint (145 / 374) to the cheek point (50 / 280)
  entry            the cannula entry point on the image-left cheek: the cheek point 50 moved toward 205 by ENTRY_T (calibrated on
                   the stills, see ENTRY_T); route1 / route2: the hollow under the eye's outer and inner thirds (the cannula path)
Output: brand/edits/undereye-filler/tracks.json {pieceId: {f0, pts: {name: [[x, y] per comp frame]}}} (gitignored: her face).
Run: C:/Users/naimj/tools/style-venv/Scripts/python.exe -I brand/scripts/undereye_track.py [--stills]
--stills: the proxy build. Landmarks on the catalog stills (432x768, one every 3 s; IMAGE mode), scaled to 1080x1920 and held for
          the frames each still is on screen (the same rule as the Footage component), no smoothing (the picture is a still).
"""
import json, math, sys
from pathlib import Path
import numpy as np
import cv2
import mediapipe as mp

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "brand/remotion/public/undereye-filler"
EDIT = ROOT / "brand/edits/undereye-filler"
MODEL = "C:/Users/naimj/tools/models/face_landmarker.task"
TRACK = {"P03": "right", "P07": None, "P09": None, "P10": None, "P15": None, "P16": None, "P17": None}  # side hint per piece
ENTRY_T = 0.45  # from the stills: the puncture mark sits below the cheek point 50, toward 205 (IMG_6817 f0013-f0019)
sys.path.insert(0, str(ROOT / "research/ostad/style/tools"))
from face_track import OneEuro  # noqa: E402


def lerp(a, b, t):
    return a + (b - a) * t


def points(L):
    """L: (478, 2) px. Returns the named points."""
    uL, uR = lerp(L[145], L[50], 1 / 3), lerp(L[374], L[280], 1 / 3)
    return {
        "underL": uL, "underR": uR,
        "entry": lerp(L[50], L[205], ENTRY_T),
        "route1": lerp(L[33], L[50], 0.42) * 0.5 + lerp(L[145], L[50], 0.36) * 0.5,
        "route2": lerp(L[153], L[50], 0.30) * 0.6 + lerp(L[133], L[205], 0.25) * 0.4,
        "lidL": L[145], "lidR": L[374], "eyeL": L[468], "eyeR": L[473],
    }


STILLS = {"6816": 17, "6817": 93, "6818": 16, "6821": 12}


def main_stills():
    props = json.loads((PUB / "props.json").read_text(encoding="utf-8"))
    pcs = {p["id"]: p for p in props["pieces"]}
    BaseOptions, FL, FLO = mp.tasks.BaseOptions, mp.tasks.vision.FaceLandmarker, mp.tasks.vision.FaceLandmarkerOptions
    opts = FLO(base_options=BaseOptions(model_asset_path=MODEL), running_mode=mp.tasks.vision.RunningMode.IMAGE, num_faces=2)
    out, stats, cache = {}, {}, {}
    with FL.create_from_options(opts) as lm:
        def face(clip, n, side):
            if (clip, n) not in cache:
                im = cv2.imread(str(PUB / f"frames/{clip}/f{n:04d}.jpg"))
                h, w = im.shape[:2]
                res = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(im, cv2.COLOR_BGR2RGB)))
                fs = [np.array([[q.x * w * 1080 / w, q.y * h * 1920 / h] for q in f]) for f in res.face_landmarks]
                if not fs:
                    cache[(clip, n)] = None
                else:
                    key = (lambda F: -F[1, 0]) if side == "right" else (lambda F: F[1, 0]) if side == "left" else (lambda F: -np.ptp(F[:, 0]))
                    cache[(clip, n)] = min(fs, key=key)
            return cache[(clip, n)]
        for pid, side in TRACK.items():
            pc = pcs[pid]
            series, found, last = {}, 0, None
            for k in range(pc["dur"]):
                t = pc["pictureFrom"] + k / 24 * props["speed"]
                n = min(STILLS[pc["picture"]], max(1, int(t // 3) + 1))
                F = face(pc["picture"], n, side)
                if F is not None:
                    last, found = F, found + 1
                if last is None:
                    continue
                for nm, v in points(last).items():
                    series.setdefault(nm, []).append([round(float(v[0]), 1), round(float(v[1]), 1)])
            # frames before the first detection take the first found value
            pad = pc["dur"] - len(next(iter(series.values()), []))
            series = {nm: [a[0]] * pad + a for nm, a in series.items()}
            out[pid] = {"f0": pc["at"], "pts": series}
            stats[pid] = {"comp_frames": pc["dur"], "frames_on_a_detected_still": found}
            print(pid, stats[pid])
    EDIT.mkdir(parents=True, exist_ok=True)
    (EDIT / "tracks.json").write_text(json.dumps(out), encoding="utf-8")
    (EDIT / "tracks_stats.json").write_text(json.dumps({"mode": "stills", **stats}, indent=1), encoding="utf-8")


def main():
    props = json.loads((PUB / "props.json").read_text(encoding="utf-8"))
    pcs = {p["id"]: p for p in props["pieces"]}
    BaseOptions, FL, FLO = mp.tasks.BaseOptions, mp.tasks.vision.FaceLandmarker, mp.tasks.vision.FaceLandmarkerOptions
    out, stats = {}, {}
    for pid, side in TRACK.items():
        pc = pcs[pid]
        cap = cv2.VideoCapture(str(PUB / f"{pc['picture']}.mp4"))
        fps = cap.get(cv2.CAP_PROP_FPS)
        W, H = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        f0s = int(round(pc["pictureFrom"] * fps))
        f1s = int(round((pc["pictureFrom"] + pc["dur"] / 24 * props["speed"]) * fps)) + 1
        cap.set(cv2.CAP_PROP_POS_FRAMES, f0s)
        opts = FLO(base_options=BaseOptions(model_asset_path=MODEL), running_mode=mp.tasks.vision.RunningMode.VIDEO, num_faces=2)
        raw, prev = {}, None
        with FL.create_from_options(opts) as lm:
            for fs in range(f0s, f1s):
                ok, img = cap.read()
                if not ok:
                    break
                res = lm.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB)), int(fs * 1000 / fps))
                faces = [np.array([[q.x * W, q.y * H] for q in f]) for f in res.face_landmarks]
                if not faces:
                    continue
                if prev is None:
                    key = (lambda F: -F[1, 0]) if side == "right" else (lambda F: F[1, 0]) if side == "left" else (lambda F: -np.ptp(F[:, 0]))
                    face = min(faces, key=key)
                else:
                    face = min(faces, key=lambda F: np.linalg.norm(F[1] - prev[1]))
                if prev is not None and np.linalg.norm(face[1] - prev[1]) > 0.25 * W:
                    continue  # a jump to the other face: skip the frame
                prev = face
                raw[fs] = face
        cap.release()
        # comp frames -> nearest detected source frame, One Euro smoothed in comp time
        names = list(points(next(iter(raw.values()))).keys()) if raw else []
        flt = {n: OneEuro(0.1, 0.03) for n in names}
        series = {n: [] for n in names}
        keys = np.array(sorted(raw))
        miss = 0
        for k in range(pc["dur"]):
            fs = pc["pictureFrom"] * fps + k / 24 * props["speed"] * fps
            j = keys[np.argmin(np.abs(keys - fs))]
            miss += abs(j - fs) > 2
            P = points(raw[j])
            for n in names:
                v = flt[n](np.array(P[n], dtype=float), k / 24)
                series[n].append([round(float(v[0]), 1), round(float(v[1]), 1)])
        out[pid] = {"f0": pc["at"], "pts": series}
        stats[pid] = {"comp_frames": pc["dur"], "detected_src_frames": len(raw), "src_frames": f1s - f0s, "comp_frames_without_detection_within_2f": int(miss)}
        print(pid, stats[pid])
    EDIT.mkdir(parents=True, exist_ok=True)
    (EDIT / "tracks.json").write_text(json.dumps(out), encoding="utf-8")
    (EDIT / "tracks_stats.json").write_text(json.dumps(stats, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main_stills() if "--stills" in sys.argv else main()
