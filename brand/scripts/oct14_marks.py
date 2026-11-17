"""Oct 14 injection reel: the surgeon's markup. Where each injection actually went, read from the injection clips and carried onto
the aligned before frame through her face landmarks. NOT FOR POSTING until patient consent = yes.

  $PY -I brand/scripts/oct14_marks.py sheets     # candidate frames per clip, cropped on her face with a source-pixel grid (gitignored)
  $PY -I brand/scripts/oct14_marks.py map        # tips.json (the annotated tips) -> marks.json (points on the before frame) + accuracy
Inputs:
- research/ostad/style/oct14/tips.json: per entry point, one or more frames where the needle or cannula tip is at the skin, as
  (clip, second, x, y) in that clip's 1080-wide pixels. They are read off the grid sheets by eye.
- brand/edits/oct14-injection/pair.json: the before frame and the aligned after frame.
Mapping: in the clip frame and in the before frame, MediaPipe Face Landmarker finds her 478 landmarks. A local affine is fitted on the
16 landmarks nearest the tip (in the clip frame), and the tip is carried to the before frame. Accuracy, in px at 1080 width on the
before frame:
- fit residual: RMS of those 16 landmarks under the affine;
- spread: when one entry is annotated in several frames, the distance of each mapped tip from their mean;
- error = sqrt(residual^2 + spread^2). Target < 15 px.
Outputs: research/ostad/style/oct14/marks.json (committed: landmark-relative positions and numbers only, no image),
brand/edits/oct14-injection/marks_check.jpg (gitignored: her face).
"""
import json, sys
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "brand/remotion/public/oct14"
EDIT = ROOT / "brand/edits/oct14-injection"
OUT = ROOT / "research/ostad/style/oct14"
sys.path.insert(0, str(ROOT / "brand/scripts"))
import oct14_pairs as pairs  # noqa: E402

CAND = {  # role -> seconds to look at (from the contact sheets)
    "inj1": [2, 8, 14, 20, 26, 32], "inj3": [4, 12, 20, 28, 36, 42], "inj4": [2, 5, 8],
    "inj6": [12, 20, 28, 36, 44, 56, 64, 72, 80], "inj7": [6, 10, 14, 34, 42, 50, 60, 70, 86, 92, 100],
    "neuro": [6, 10, 14, 20, 26, 36, 44, 50, 56, 88, 92, 96, 100],
}
FACE = {"inj1": "smallest", "inj3": "left", "inj4": "smallest", "inj6": "largest", "inj7": "largest", "neuro": "left"}


def grab(role, sec):
    cap = cv2.VideoCapture(str(PUB / f"{role}.mp4"))
    cap.set(cv2.CAP_PROP_POS_MSEC, sec * 1000)
    ok, img = cap.read()
    return img if ok else None


def sheets():
    d = EDIT / "marks"
    d.mkdir(exist_ok=True)
    for role, secs in CAND.items():
        tiles = []
        for s in secs:
            img = grab(role, s)
            if img is None:
                continue
            det = pairs.detect(img, FACE[role])
            if det is not None:
                L = det[0]
                cx, cy, fw = L[:, 0].mean(), L[:, 1].mean(), np.ptp(L[:, 0])
            else:
                cx, cy, fw = img.shape[1] / 2, img.shape[0] * 0.4, 400
            half = int(max(110, fw * 0.8))
            x0, y0 = int(max(0, cx - half)), int(max(0, cy - half))
            crop = img[y0:y0 + 2 * half, x0:x0 + 2 * half].copy()
            k = 640 / crop.shape[1]
            crop = cv2.resize(crop, (640, int(crop.shape[0] * k)))
            step = 10 if half < 200 else 20
            for gx in range((x0 // step + 1) * step, x0 + 2 * half, step):
                X = int((gx - x0) * k)
                cv2.line(crop, (X, 0), (X, crop.shape[0]), (0, 255, 255) if gx % (step * 5) == 0 else (0, 110, 110), 1)
                if gx % (step * 5) == 0:
                    cv2.putText(crop, str(gx), (X + 2, 14), 0, 0.45, (0, 255, 255), 1)
            for gy in range((y0 // step + 1) * step, y0 + 2 * half, step):
                Y = int((gy - y0) * k)
                cv2.line(crop, (0, Y), (crop.shape[1], Y), (0, 255, 255) if gy % (step * 5) == 0 else (0, 110, 110), 1)
                if gy % (step * 5) == 0:
                    cv2.putText(crop, str(gy), (2, Y - 2), 0, 0.45, (0, 255, 255), 1)
            cv2.putText(crop, f"{role} {s}s", (8, crop.shape[0] - 10), 0, 0.8, (0, 0, 255), 2)
            tiles.append(crop[:640])
        rows = [np.hstack(tiles[i:i + 3] + [np.zeros_like(tiles[0])] * (3 - len(tiles[i:i + 3]))) for i in range(0, len(tiles), 3)]
        cv2.imwrite(str(d / f"{role}.jpg"), np.vstack(rows))
        print(role, len(tiles))


_LM = None


def her_faces(img):
    """every face MediaPipe finds in the frame (up to 3), as 478 x 2 landmark arrays"""
    global _LM
    import mediapipe as mp
    if _LM is None:
        o = mp.tasks.vision.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=pairs.MODEL), running_mode=mp.tasks.vision.RunningMode.IMAGE,
                                                  num_faces=3, min_face_detection_confidence=0.3, min_face_presence_confidence=0.3)
        _LM = mp.tasks.vision.FaceLandmarker.create_from_options(o)
    h, w = img.shape[:2]
    r = _LM.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB)))
    return [np.array([[p.x * w, p.y * h] for p in f]) for f in r.face_landmarks]


def local_affine(src, dst, p, k=16):
    i = np.argsort(np.linalg.norm(src - p, axis=1))[:k]
    M, _ = cv2.estimateAffine2D(src[i].astype(np.float32), dst[i].astype(np.float32), method=cv2.LMEDS)
    pr = np.c_[src[i], np.ones(k)] @ M.T
    res = float(np.sqrt(((pr - dst[i]) ** 2).sum(1).mean()))
    return (np.array([p[0], p[1], 1.0]) @ M.T), res


def mapping():
    P = json.loads((EDIT / "pair.json").read_text())
    before = cv2.imread(str(PUB / "before.jpg"))
    Lb = pairs.detect(before, "left")[0]
    tips = json.loads((OUT / "tips.json").read_text(encoding="utf-8"))
    out, unmapped = [], []
    for m in tips["marks"]:
        pts, res = [], []
        skip = False
        for t in m["frames"]:
            tip = np.array([t["x"], t["y"]], float)
            L, used = None, None
            for ds in (0, 0.25, -0.25, 0.5, -0.5, 1.0, -1.0):  # her landmarks at that second, or the nearest second with a face
                img = grab(t["clip"], t["s"] + ds)
                if img is None:
                    continue
                faces = her_faces(img)
                if faces:
                    L = min(faces, key=lambda F: np.linalg.norm(F - tip, axis=1).min())  # hers = the face the tip is on
                    used = ds
                    break
            if L is None:  # her landmarks cannot be found near that frame: the tip cannot be carried over, so it is not drawn
                continue
            t["landmarks_offset_s"] = used
            q, r = local_affine(L, Lb, tip)
            pts.append(q)
            res.append(r)
        if not pts:
            unmapped.append({"id": m["id"], "why": "no face landmarks within 1 s of any annotated frame (her face is behind his hand)", "frames": m["frames"]})
            continue
        pts = np.array(pts)
        mean = pts.mean(0)
        spread = float(np.linalg.norm(pts - mean, axis=1).max()) if len(pts) > 1 else 0.0
        resid = float(np.mean(res))
        err = float(np.hypot(resid, spread))
        # landmark-relative position: barycentric-free, as an offset from the nearest landmark, so the drawing can follow the track
        near = int(np.argmin(np.linalg.norm(Lb - mean, axis=1)))
        out.append({**{k: v for k, v in m.items() if k != "frames"}, "frames": m["frames"], "before_xy": [round(float(mean[0]), 1), round(float(mean[1]), 1)],
                    "fit_residual_px": round(resid, 2), "spread_px": round(spread, 2), "error_px": round(err, 2), "ok": err < 15,
                    "nearest_landmark": near, "offset_from_landmark": [round(float(mean[0] - Lb[near, 0]), 1), round(float(mean[1] - Lb[near, 1]), 1)]})
    # paths and zones are lists of mapped marks (by id), so they inherit the same mapping
    res = {"before_frame": {"clip": "IMG_3637", "s": P["before_s"]}, "after_frame": {"clip": "IMG_3656", "s": P["after_s"]}, "marks": out,
           "paths": tips.get("paths", []), "zones": tips.get("zones", []), "unmapped": unmapped, "max_error_px": max(o["error_px"] for o in out), "target_px": 15}
    (OUT / "marks.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
    img = before.copy()
    for o in out:
        x, y = map(int, o["before_xy"])
        cv2.drawMarker(img, (x, y), (0, 255, 255), cv2.MARKER_TILTED_CROSS, 14, 2)
        cv2.putText(img, o["id"], (x + 6, y - 6), 0, 0.4, (0, 255, 255), 1)
    x0, y0, x1, y1 = map(int, P["face_box"])
    cv2.imwrite(str(EDIT / "marks_check.jpg"), cv2.resize(img[max(0, y0 - 80):y1 + 80, max(0, x0 - 80):x1 + 80], None, fx=2.5, fy=2.5))
    for o in out:
        print(f"{o['id']:12s} {o['area']:12s} err {o['error_px']:5.1f} px (fit {o['fit_residual_px']}, spread {o['spread_px']}) -> {o['before_xy']}")


LOC = {  # role -> seconds where a tip is at her skin (from the sheets): native-resolution locator crops, 20 px grid, every line labelled
    "inj1": [2, 8, 20, 26], "inj3": [4, 12, 36, 42], "inj4": [2, 5, 8], "inj7": [10, 14, 34, 60, 70, 100], "neuro": [6, 10, 14, 44, 50, 92, 96],
}


def locators():
    d = EDIT / "marks"
    for role, secs in LOC.items():
        tiles = []
        for s in secs:
            img = grab(role, s)
            det = pairs.detect(img, FACE[role])
            L = det[0] if det is not None else None
            cx, cy = (L[:, 0].mean(), L[:, 1].mean()) if L is not None else (540, 900)
            x0, y0 = int(max(0, min(img.shape[1] - 400, cx - 200))), int(max(0, min(img.shape[0] - 400, cy - 200)))
            crop = img[y0:y0 + 400, x0:x0 + 400].copy()
            for gx in range(((x0 + 19) // 20) * 20, x0 + 400, 20):
                cv2.line(crop, (gx - x0, 0), (gx - x0, 399), (0, 200, 200) if gx % 100 else (0, 255, 255), 1)
                cv2.putText(crop, str(gx % 1000), (gx - x0 + 1, 10 + (gx // 20 % 2) * 10), 0, 0.3, (0, 255, 255), 1)
            for gy in range(((y0 + 19) // 20) * 20, y0 + 400, 20):
                cv2.line(crop, (0, gy - y0), (399, gy - y0), (0, 200, 200) if gy % 100 else (0, 255, 255), 1)
                cv2.putText(crop, str(gy), (1, gy - y0 - 1), 0, 0.3, (0, 255, 255), 1)
            cv2.putText(crop, f"{role} {s}s", (250, 392), 0, 0.5, (0, 0, 255), 2)
            print(role, s, "origin", x0, y0)
            tiles.append(crop)
        while len(tiles) % 3:
            tiles.append(np.zeros_like(tiles[0]))
        cv2.imwrite(str(d / f"loc_{role}.png"), np.vstack([np.hstack(tiles[i:i + 3]) for i in range(0, len(tiles), 3)]))
        print(role, len(secs))


if __name__ == "__main__":
    {"sheets": sheets, "map": mapping, "loc": locators}[sys.argv[1]]()
