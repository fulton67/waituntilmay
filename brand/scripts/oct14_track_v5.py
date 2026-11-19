"""Oct 14 reel v5: the patient's facial points per frame, with NO lag (client 2026-11-19: "when it tracks the faces, the drawings
on the face move over").

Why v4 drifted: oct14_track.py runs a causal One Euro filter at min_cutoff 0.1 Hz / beta 0.03 (tuned for a still camera, DEC 14g)
on handheld footage, so the points trail the face whenever the phone or her head moves, and a missed frame holds the last face.
v5: MediaPipe Face Landmarker in IMAGE mode on every source frame the cut uses (no temporal model), the patient picked by the
nearest glabella to the v4 track (identity only, never position), then a ZERO-PHASE smoothing (a centred Gaussian, sigma 1 frame,
run inside each contiguous detected run), so there is no lag. A frame with no face is null (the mark hides), never held.

  $PY -I brand/scripts/oct14_track_v5.py            # -> brand/remotion/public/oct14/tracks_v5.json
Output: {role: {n, pts: {name: [[x, y] | null per source frame]}}}, 1080x1920 frame px, the same names as oct14_track.py.
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
sys.path.insert(0, str(ROOT / "brand/scripts"))
from oct14_track import named  # noqa: E402

ROLES = ["intro", "inj2", "inj5", "after"]
PAD = 12


def ranges(props, role):
    """the source frames the cut shows for `role` (with a pad), from the pieces"""
    out = []
    for x in props["pieces"]:
        if x["pictureRole"] != role:
            continue
        a = int(round(x["pictureFrom"] * 24))
        b = int(np.ceil(a + x["dur"] * props["speed"])) + 2
        out.append((max(0, a - PAD), b + PAD))
    if props["pieces"][-1]["pictureRole"] == role:  # the tail keeps running from `to`
        a = int(round(props["pieces"][-1]["to"] * 24))
        out.append((a - PAD, a + int(props["tail"] * props["speed"]) + PAD))
    out.sort()
    merged = []
    for a, b in out:
        if merged and a <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(b, merged[-1][1]))
        else:
            merged.append((a, b))
    return merged


def smooth(arr, sigma=1.0):
    """zero-phase Gaussian inside each contiguous non-null run"""
    n = len(arr)
    out = [None] * n
    r = int(3 * sigma)
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    i = 0
    while i < n:
        if arr[i] is None:
            i += 1
            continue
        j = i
        while j < n and arr[j] is not None:
            j += 1
        seg = np.array(arr[i:j], float)
        for t in range(len(seg)):
            lo, hi = max(0, t - r), min(len(seg), t + r + 1)
            w = k[lo - t + r:hi - t + r]
            out[i + t] = [round(float(v), 1) for v in (seg[lo:hi] * w[:, None]).sum(0) / w.sum()]
        i = j
    return out


def crop_detect(lm, fr, old, i):
    """detect on a square crop around the old track's face (identity only), upscaled to 640 px: a small face in a wide shot is
    found far more often than on the whole 1080x1920 frame. Landmarks are mapped back to frame px."""
    H, W = fr.shape[:2]
    j = min(i, len(old["glabella"]) - 1)
    pts = np.array([old[k][j] for k in ("templeL", "templeR", "chin", "forehead")])
    c = pts.mean(0)
    side = max(220.0, 2.4 * max(np.ptp(pts[:, 0]), np.ptp(pts[:, 1])))
    x0, y0 = int(max(0, c[0] - side / 2)), int(max(0, c[1] - side / 2))
    x1, y1 = int(min(W, x0 + side)), int(min(H, y0 + side))
    crop = fr[y0:y1, x0:x1]
    k = 640 / max(crop.shape[:2])
    crop = cv2.resize(crop, None, fx=k, fy=k, interpolation=cv2.INTER_CUBIC)
    r = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)))
    h, w = crop.shape[:2]
    out = [np.array([[x0 + p.x * w / k, y0 + p.y * h / k] for p in f]) for f in r.face_landmarks]
    if not out:  # fall back to the whole frame
        r = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(fr, cv2.COLOR_BGR2RGB)))
        out = [np.array([[p.x * W, p.y * H] for p in f]) for f in r.face_landmarks]
    return out


def run():
    props = json.loads((PUB / "props.json").read_text())
    old = json.loads((EDIT / "tracks.json").read_text())
    V = mp.tasks.vision
    lm = V.FaceLandmarker.create_from_options(V.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=MODEL),
                                                                      running_mode=V.RunningMode.IMAGE, num_faces=3))
    res = {}
    for role in ROLES:
        cap = cv2.VideoCapture(str(PUB / f"{role}.mp4"))
        n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        W, H = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        raw = {}
        found = total = 0
        # read every frame in decode order from 0 (no seeking: an OpenCV seek in H.264 can land a frame early or late, which put
        # whole ranges one frame off the picture Remotion shows; measured -1 f on after-summary/b/b, 2026-11-19)
        want = set()
        for a, b in ranges(props, role):
            want.update(range(a, min(b, n)))
        last = max(want)
        for i in range(last + 1):
            if i not in want:
                if not cap.grab():
                    break
                continue
            ok, fr = cap.read()
            if not ok:
                break
            total += 1
            ref = np.array(old[role]["pts"]["glabella"][min(i, len(old[role]["pts"]["glabella"]) - 1)])
            cands = crop_detect(lm, fr, old[role]["pts"], i)
            pick = min(cands, key=lambda c: np.linalg.norm(c[9] - ref)) if cands else None
            if pick is not None and np.linalg.norm(pick[9] - ref) < 0.6 * np.ptp(pick[:, 0]) + 40:
                raw[i] = named(pick)
                found += 1
        keys = sorted(next(iter(raw.values())).keys())
        pts = {}
        for k in keys:
            arr = [([float(raw[i][k][0]), float(raw[i][k][1])] if i in raw else None) for i in range(n)]
            pts[k] = smooth(arr)
        res[role] = {"n": n, "found": found, "frames": total, "pts": pts}
        print(role, f"{found}/{total} used frames with her face")
    (PUB / "tracks_v5.json").write_text(json.dumps(res))


if __name__ == "__main__":
    run()
