"""track_verify.py: measure head tracking and face overlap on the YouTube v6 render (OstadYT6).

1. Tip-to-landmark error. The composition pins B03 callout #1's tracked end to follow(track, "headTop") + (0, -24) and B16's callout tail to
   follow(track, "templeR") + (40, -6) (brand/remotion/src/OstadYT6.tsx), both through the keyed layer LAYER6 (0.7x at (-30, -150)) and the time map
   srcFrame = compFrame / 24 * 1.15 * 30. Here the same points are computed twice:
     - "drawn": from research/ostad/style/exomind/track.json exactly as the composition does (what the arrow was drawn at);
     - "measured": from a fresh MediaPipe Face Landmarker pass on the RENDERED frames (his keyed layer as it appears in the output),
       on the left 960 px only (his; the BTL model on B16's card is also a face),
       with headTop = foreheadTop + k (foreheadTop - chin), k = track.head_top_k, the head box = mesh extent up to headTop.
   Error = |drawn - measured| in output px. It contains the track's smoothing lag, the time map, the layer transform, the keyed
   source's alignment and the detector's own frame-to-frame noise on the render, i.e. everything between the track and his pixels.
   Also measured over every frame he is on screen (headTop, the registration of the whole edit), not only the two beats.
2. Face overlap. A second render of the same composition with `plain` (room + presenter only, same encoder settings) is subtracted
   from the delivered render inside his face box (mesh extent, from the track, per frame). A frame overlaps when > 0.5 % of the box's
   pixels differ by > 24 grey levels (encode-noise calibration: identical content re-encoded at crf 16 differs by <= 6 levels at p99.9).
   The same is reported for the head box (to the top of the head); head-box overlaps on B01 (the wordmark passes BEHIND him), B03
   (the callout's anchor on the crown) and B16 (the callout leaving his temple) are intended and listed.
Output: research/ostad/style/exomind/track_verify.json.
Run: C:/Users/naimj/tools/style-venv/Scripts/python.exe -I research/ostad/style/tools/track_verify.py RENDER.mp4 PLAIN.mp4
"""
import json
import os
import sys

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
STYLE = os.path.dirname(HERE)
MODEL = "C:/Users/naimj/tools/models/face_landmarker.task"
L6 = (0.7, -30.0, -150.0)
SPEED, CFPS = 1.15, 24
BEATS = json.load(open(os.path.join(STYLE, "exomind", "beats.json"), encoding="utf8"))
B = {b["id"]: b for b in BEATS["beats"]}
TR = json.load(open(os.path.join(STYLE, "exomind", "track.json"), encoding="utf8"))
NAMES = TR["names"]
PTS = 11


def row(cf):
    n = len(TR["frames"])
    f = min(max(cf / CFPS * SPEED * TR["fps"], 0), n - 1)
    i = int(f)
    a, b = TR["frames"][i], TR["frames"][min(i + 1, n - 1)]
    u = f - i
    if a and b:
        return np.array(a) + (np.array(b) - np.array(a)) * u
    return np.array(a or b)


def comp(p):
    s, x, y = L6
    return np.array([x + s * p[0], y + s * p[1]])


def lm(r, name):
    j = NAMES.index(name)
    return comp(r[PTS + 2 * j: PTS + 2 * j + 2])


def headbox(r):
    s, x, y = L6
    return np.array([x + s * r[7], y + s * r[8], s * r[9], s * r[10]])


def facebox(r):
    s, x, y = L6
    return np.array([x + s * r[3], y + s * r[4], s * r[5], s * r[6]])


def presenter_on(f):
    # B04: he stays on through the consult window since Naim's notes 7-9 (DECISIONS 14n)
    if B["B12"]["start_f"] + 1 <= f <= B["B12"]["end_f"] or B["B17"]["start_f"] + 44 <= f <= B["B18"]["end_f"]:
        return False
    return True


def detect(video, frames):
    import mediapipe as mp
    V = mp.tasks.vision
    opts = V.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=MODEL), running_mode=V.RunningMode.VIDEO, num_faces=1)
    want = set(frames)
    cap = cv2.VideoCapture(video)
    out = {}
    with V.FaceLandmarker.create_from_options(opts) as det:
        i = 0
        while True:
            ok, bgr = cap.read()
            if not ok:
                break
            if i in want:
                # only the left 960 px (his layer never crosses x 700): other faces share the frame (the BTL model on B16's card,
                # patients in B03's windows) and a single-face detector would lock onto them; the crop starts at x 0, so px are output px
                bgr = np.ascontiguousarray(bgr[:, :960])
                H, W = bgr.shape[:2]
                img = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
                r = det.detect_for_video(img, int(i * 1000 / CFPS))
                if r.face_landmarks:
                    out[i] = np.array([[q.x * W, q.y * H] for q in r.face_landmarks[0]])
            i += 1
    cap.release()
    return out


def measured(P):
    k = TR["head_top_k"]
    fh, chin = P[10], P[152]
    top = fh + k * (fh - chin)
    x0, x1 = P[:, 0].min(), P[:, 0].max()
    y1 = P[:, 1].max()
    return top, fh, np.array([x0, top[1], x1 - x0, y1 - top[1]])


def stats(e):
    e = np.array(e)
    return {"n": int(len(e)), "median_px": round(float(np.median(e)), 2), "p95_px": round(float(np.percentile(e, 95)), 2), "max_px": round(float(e.max()), 2)} if len(e) else {"n": 0}


def main():
    render, plain = sys.argv[1], sys.argv[2]
    nfr = int(cv2.VideoCapture(render).get(cv2.CAP_PROP_FRAME_COUNT))
    on = [f for f in range(nfr) if presenter_on(f)]
    b3 = list(range(188, 263))  # callout #1 drawn (start 28 local) to its exit (exitAt 95 + 7)
    b16 = list(range(B["B16"]["start_f"] + 55, B["B16"]["end_f"] + 1))  # callout drawn from local 55 to the exit
    det = detect(render, sorted(set(on)))
    e3, e16, eall, missing = [], [], [], 0
    for f in on:
        if f not in det:
            missing += 1
            continue
        top_m, fh_m, hb_m = measured(det[f])
        r = row(f)
        top_d = lm(r, "headTop")
        eall.append(float(np.linalg.norm(top_d - top_m)))
        if f in b3:
            e3.append(float(np.linalg.norm((top_d + [0, -24]) - (top_m + [0, -24]))))
        if f in b16:
            # B16 (after Naim's review, DECISIONS 14m): the callout tail = follow("templeR") + (40, -6); measured = mesh index 389
            e16.append(float(np.linalg.norm(lm(r, "templeR") - det[f][389])))

    # face overlap: delivered vs plain, inside the face box / head box
    ca, cb = cv2.VideoCapture(render), cv2.VideoCapture(plain)
    face_ov, head_ov = [], []
    i = 0
    while True:
        oa, A = ca.read()
        ob, Bf = cb.read()
        if not (oa and ob):
            break
        if presenter_on(i):
            r = row(i)
            for box, acc in ((facebox(r), face_ov), (headbox(r), head_ov)):
                x, y, w, h = [int(round(v)) for v in box]
                x0, y0, x1, y1 = max(0, x), max(0, y), min(1920, x + w), min(1080, y + h)
                if x1 > x0 and y1 > y0:
                    d = np.abs(cv2.cvtColor(A[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY).astype(int) - cv2.cvtColor(Bf[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY).astype(int))
                    if (d > 24).mean() > 0.005:
                        acc.append(i)
        i += 1

    def beat_of(f):
        for b in BEATS["beats"]:
            if b["start_f"] <= f <= b["end_f"]:
                return b["id"]
        return "end" if f >= 2092 else "?"

    def spans(fr):
        out = []
        for f in fr:
            if out and f == out[-1][1] + 1:
                out[-1][1] = f
            else:
                out.append([f, f])
        return [{"from": a, "to": b, "beat": beat_of(a)} for a, b in out]

    intended = {"B17": "full-bleed step-out: the room crossfades into the full-bleed glass skull (f1741-1753)",
                "B01": "title wordmark passes behind him (depth sandwich): behind the keyed layer, never over his pixels",
                "B03": "callout #1's anchor sits on his crown (track headTop - 24 px), above the hairline",
                "B16": "the callout tail sits 40 px outside his temple (track templeR); its stroke crosses his hair/ear on the way out, never the face mesh"}
    head_spans = spans(head_ov)
    res = {
        "method": __doc__.strip(),
        "render": os.path.basename(render), "frames": nfr, "presenter_frames": len(on), "detected": len(det), "missed_detections": missing,
        "tip_error": {
            "B03_callout1_anchor_headTop": stats(e3),
            "B16_callout_tail_templeR": stats(e16),
            "all_presenter_frames_headTop": stats(eall),
            "spec": "median < 6 px, p95 < 15 px (EXOMIND_REDO head tracking; 1080 short side)",
        },
        "face_overlap": {
            "face_box_frames": len(face_ov), "face_box_spans": spans(face_ov),
            "head_box_frames": len(head_ov), "head_box_spans": head_spans,
            "head_box_unintended_frames": sum(s["to"] - s["from"] + 1 for s in head_spans if s["beat"] not in intended),
            "intended": intended,
            "face_box_spans_explained": "expected only on B17 f1741-1753 (the room crossfades into the full-bleed glass skull while he steps out); B04 no longer goes full bleed (DECISIONS 14n). No overlay covers his face while he is on the canvas",
        },
    }
    out = os.path.join(STYLE, "exomind", "track_verify.json")
    json.dump(res, open(out, "w", encoding="utf8"), indent=1)
    print(json.dumps({k: v for k, v in res.items() if k != "method"}, indent=1)[:3000])


if __name__ == "__main__":
    main()
