"""Under-eye filler reel v2: the patient's face points per composition frame on the picture segments that carry markup.

Same detector and smoothing as undereye_track.py (MediaPipe Face Landmarker, VIDEO mode, One Euro 0.1 / 0.03), on props_v2 picture
segments. Points are mapped through the same display transform the composition uses: portrait clips fill the frame (identity),
landscape clips (IMG_6813/6814, 1920x1080) are contained at 1080 wide and centred, and a punch-in scales about (ox, oy).
Output: brand/edits/undereye-filler/tracks_v2.json {"<piece>:<clip>": {f0, pts: {name: [[x, y] per comp frame]}}} (gitignored).
Run: C:/Users/naimj/tools/style-venv/Scripts/python.exe -I brand/scripts/undereye_track_v2.py
"""
import json, sys
from pathlib import Path
import numpy as np
import cv2
import mediapipe as mp

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "brand/scripts"))
sys.path.insert(0, str(ROOT / "research/ostad/style/tools"))
from undereye_track import points, MODEL  # noqa: E402
from face_track import OneEuro  # noqa: E402

PUB = ROOT / "brand/remotion/public/undereye-filler"
EDIT = ROOT / "brand/edits/undereye-filler"
WANT = {("P03", "6814"), ("P03y", "6814"), ("P09", "6817"), ("P10", "6817"), ("P15", "6817"), ("P17", "6821")}


def display(clip_w, clip_h, q):
    """Composition px of a source point under the Footage component's layout."""
    if clip_w > clip_h:  # landscape, contained
        s = 1080 / clip_w
        x, y = q[0] * s, q[1] * s + (1920 - clip_h * s) / 2
    else:
        x, y = q[0] * 1080 / clip_w, q[1] * 1920 / clip_h
    return x, y


def sketch_ref():
    """The surgeon's sketch (reference-face px) and the reference landmarks, to map the read entry and cannula paths onto any frame."""
    import undereye_sketch as SK
    cap = cv2.VideoCapture(str(PUB / "6815.mp4"))
    cap.set(cv2.CAP_PROP_POS_MSEC, 1000)
    _, ref = cap.read()
    return json.loads((EDIT / "sketch.json").read_text(encoding="utf-8")), SK.lms(ref), SK


def main():
    P = json.loads((PUB / "props_v2.json").read_text(encoding="utf-8"))
    SKD, RL, SK = sketch_ref()
    out, stats = {}, {}
    for pc in P["pieces"]:
        for seg in pc["pics"]:
            if (pc["id"], seg.get("clip")) not in WANT:
                continue
            clip = seg["clip"]
            cap = cv2.VideoCapture(str(PUB / f"{clip}.mp4"))
            fps = cap.get(cv2.CAP_PROP_FPS)
            W, H = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            n = seg["f1"] - seg["f0"]
            s0 = int(round(seg["src"] * fps))
            s1 = int(round((seg["src"] + n / 24 * P["speed"]) * fps)) + 1
            cap.set(cv2.CAP_PROP_POS_FRAMES, s0)
            opts = mp.tasks.vision.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=MODEL),
                                                         running_mode=mp.tasks.vision.RunningMode.VIDEO, num_faces=1)
            raw = {}
            with mp.tasks.vision.FaceLandmarker.create_from_options(opts) as lm:
                for fs in range(s0, s1):
                    ok, img = cap.read()
                    if not ok:
                        break
                    r = lm.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB)), int(fs * 1000 / fps))
                    if r.face_landmarks:
                        raw[fs] = np.array([[q.x * W, q.y * H] for q in r.face_landmarks[0]])
            cap.release()
            key = f"{pc['id']}:{clip}:{seg['f0']}"
            if not raw:
                stats[key] = {"comp_frames": n, "detected": 0}
                print(key, "no face detected")
                continue
            keys = np.array(sorted(raw))
            series, flt = {}, {}
            sc, ox, oy = seg.get("scale", 1.0), seg.get("ox", 540), seg.get("oy", 960)
            for k in range(n):
                fs = seg["src"] * fps + k / 24 * P["speed"] * fps
                j = keys[np.argmin(np.abs(keys - fs))]
                pts_ = points(raw[j])
                # the read entry points and cannula path ends of the sketch, mapped from the reference face onto this frame
                Mf = SK.sim(RL[SK.STABLE], raw[j][SK.STABLE])
                for side, sd in SKD["sides"].items():
                    tag = "R" if side == "R_patient" else "L"
                    pts_[f"entry{tag}"] = SK.ap(Mf, sd["entry"])
                    for si_, st in enumerate(sd["strokes"]):
                        pts_[f"path{tag}{si_}"] = SK.ap(Mf, st[1])
                for nm, v in pts_.items():
                    x, y = display(W, H, v)
                    x, y = ox + (x - ox) * sc, oy + (y - oy) * sc
                    if nm not in flt:
                        flt[nm] = OneEuro(0.1, 0.03)
                        series[nm] = []
                    q = flt[nm](np.array([x, y]), k / 24)
                    series[nm].append([round(float(q[0]), 1), round(float(q[1]), 1)])
            out[key] = {"f0": seg["f0"], "pts": series}
            stats[key] = {"comp_frames": n, "src_frames": s1 - s0, "detected": len(raw)}
            print(key, stats[key])
    (EDIT / "tracks_v2.json").write_text(json.dumps(out), encoding="utf-8")
    (EDIT / "tracks_v2_stats.json").write_text(json.dumps(stats, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
