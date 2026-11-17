"""Oct 14 injection reel: the PATIENT's facial points per frame, so each injection pop-up is anchored at the exact point he names.

MediaPipe Face Landmarker (VIDEO mode, up to 2 faces) on the transcoded clip (brand/remotion/public/oct14/<role>.mp4, 24 fps). The
patient's face is picked by continuity from a hint: --face largest|left|right (largest is right when he films her alone; left/right
when both are in frame). Smoothing: One Euro, min_cutoff 0.1 Hz, beta 0.03 (style DECISIONS 14g). Markup goes on her treated area,
never on his face (MOTION §1.7).

Named points (image side L/R = the viewer's left/right). They are built from Face Mesh indices and drawn on track_check.jpg (gitignored) for checking:
  naso*    nasolabial fold: the midpoint of the nose-ala base (98/327) and the mouth corner (61/291), moved 15 % toward the cheek (50/280)
  mario*   marionette line: 45 % of the way from the mouth corner (61/291) toward the jaw (136/365)
  lipU / lipL / lipC*  upper lip (0), lower lip (17), lip corners (61/291)
  chin (152 to 199 midpoint), jaw* (172/397), cheek* (50/280), malar* (117/346)
  under*   tear trough: 1/3 from the lower lid (145/374) to the cheek point (50/280)
  temple* (162/389), forehead (151), glabella (9), crow* (lateral canthus 33/263 moved 25 % outward), brow* (lateral brow 70/300)
Output: brand/edits/oct14-injection/tracks.json {role: {n, pts: {name: [[x, y] per clip frame at 24 fps]}}} in 1080-wide frame px.
  $PY -I brand/scripts/oct14_track.py intro [--face largest]
"""
import json, sys
from pathlib import Path
import numpy as np
import cv2
import mediapipe as mp

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "brand/remotion/public/oct14"
EDIT = ROOT / "brand/edits/oct14-injection"
MODEL = "C:/Users/naimj/tools/models/face_landmarker.task"
sys.path.insert(0, str(ROOT / "research/ostad/style/tools"))
from face_track import OneEuro  # noqa: E402


def mix(L, a, b, t):
    return L[a] + (L[b] - L[a]) * t


def named(L):
    P = {}
    for side, (ala, mc, ck, jw, jw2, lid, mal, tmp, can) in {"L": (98, 61, 50, 136, 172, 145, 117, 162, 33), "R": (327, 291, 280, 365, 397, 374, 346, 389, 263)}.items():
        mid = (L[ala] + L[mc]) / 2
        P["naso" + side] = mid + (L[ck] - mid) * 0.15
        P["mario" + side] = mix(L, mc, jw, 0.45)
        P["lipC" + side] = L[mc]
        P["jaw" + side] = L[jw2]
        P["cheek" + side] = L[ck]
        P["malar" + side] = L[mal]
        P["under" + side] = mix(L, lid, ck, 1 / 3)
        P["temple" + side] = L[tmp]
        P["crow" + side] = L[can] + (L[can] - L[168]) * 0.25
    P["browL"], P["browR"] = L[70], L[300]  # brow tails (lateral brow)
    P["lipU"], P["lipL"] = L[0], L[17]
    P["chin"] = (L[152] + L[199]) / 2
    P["forehead"], P["glabella"] = L[151], L[9]
    return P


def run(role, face="largest"):
    cap = cv2.VideoCapture(str(PUB / f"{role}.mp4"))
    W, H = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    opts = mp.tasks.vision.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=MODEL), running_mode=mp.tasks.vision.RunningMode.VIDEO, num_faces=2)
    lm = mp.tasks.vision.FaceLandmarker.create_from_options(opts)
    euro = OneEuro(0.1, 0.03)
    out, prev, i, found = {}, None, 0, 0
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        res = lm.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(fr, cv2.COLOR_BGR2RGB)), int(i * 1000 / 24))
        cands = [np.array([[p.x * W, p.y * H] for p in f]) for f in res.face_landmarks]
        pick = None
        if cands:
            if prev is not None:
                pick = min(cands, key=lambda c: np.linalg.norm(c[1] - prev[1]))
            elif face == "left":
                pick = min(cands, key=lambda c: c[1, 0])
            elif face == "right":
                pick = max(cands, key=lambda c: c[1, 0])
            else:
                pick = max(cands, key=lambda c: np.ptp(c[:, 0]) * np.ptp(c[:, 1]))
        if pick is None and prev is not None:
            pick = prev  # hold the last face through a missed frame (counted below)
        if pick is not None:
            found += pick is not prev
            prev = pick
            P = named(pick)
            keys = sorted(P)
            sm = euro(np.array([P[k] for k in keys]), i / 24)
            for k, v in zip(keys, sm):
                out.setdefault(k, []).append([round(float(v[0]), 1), round(float(v[1]), 1)])
        else:
            for k in out:
                out[k].append(out[k][-1])
        i += 1
    tr = json.loads((EDIT / "tracks.json").read_text()) if (EDIT / "tracks.json").exists() else {}
    tr[role] = {"n": i, "w": W, "h": H, "found": found, "pts": out}
    (EDIT / "tracks.json").write_text(json.dumps(tr))
    print(role, f"{found}/{i} frames with a face")


def check(role, frames):
    tr = json.loads((EDIT / "tracks.json").read_text())[role]
    cap = cv2.VideoCapture(str(PUB / f"{role}.mp4"))
    tiles = []
    for f in frames:
        cap.set(cv2.CAP_PROP_POS_FRAMES, f)
        ok, fr = cap.read()
        if not ok:
            continue
        for k, a in tr["pts"].items():
            x, y = a[min(f, len(a) - 1)]
            cv2.circle(fr, (int(x), int(y)), 6, (0, 255, 255), -1)
            cv2.putText(fr, k, (int(x) + 8, int(y)), 0, 0.7, (0, 255, 255), 2)
        cv2.putText(fr, str(f), (20, 60), 0, 2, (0, 0, 255), 4)
        tiles.append(cv2.resize(fr, (540, 960)))
    cv2.imwrite(str(EDIT / f"track_check_{role}.jpg"), np.hstack(tiles))


if __name__ == "__main__":
    role = sys.argv[1]
    face = sys.argv[sys.argv.index("--face") + 1] if "--face" in sys.argv else "largest"
    if "--check" in sys.argv:
        check(role, [int(x) for x in sys.argv[sys.argv.index("--check") + 1].split(",")])
    else:
        run(role, face)
