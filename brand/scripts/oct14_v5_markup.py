"""Oct 14 reel v5: the surgeon's technical markup on the before/after (client 2026-11-19: "it doesn't really show the injections
clearly, it kind of just seems like circles on the face"; "every drawing should be technical ... the mark should show how it improved
the skin. He's a plastic surgeon.").

  $PY -I brand/scripts/oct14_v5_markup.py      # -> brand/remotion/public/oct14/markup_v5.json + research/ostad/style/oct14/markup_v5.json
                                               #    + brand/edits/oct14-injection/markup_v5_check.jpg (her face: gitignored folder)
What is drawn (all on the aligned before frame, source px; every point from a measurement, nothing decorative):
- ENTRY POINTS: the 8 mapped needle / cannula entry points of marks.json (read off inj1 / inj3 / inj7 / neuro, carried onto the before
  frame by a local landmark affine; error <= 12.0 px, target 15).
- BONE LINE (Evolysse Form, needle, deep on the bone): the cheekbone on each side, ear to mid cheek, as a pen line on MediaPipe landmarks
  234-227-123-50 / 454-447-352-280 of THIS face: it runs through the measured Form entry points (within 8-15 px), where the Jan 08
  "His plan" set (118-117-116-123) ran under the eye, above them.
- CANNULA PASSES (Evolysse Smooth): from each mapped cannula entry along the route the clip shows (marks.json paths: lowerR -> the
  laugh line, lowerR -> the marionette line, jawL -> the other marionette line), ending on the fold landmark, with an end stop.
- TREATED FOLDS: the nasolabial and marionette folds as dotted lines on landmarks 129-203-206-216 / 358-423-426-436 and 61-202-210 /
  291-422-430 (Jan 08's sets), so the passes visibly run into the fold they treat.
- MEASURED CHANGE 1 (contour_measure.json): the shadow edge under the cheekbone, before (dashed) and after (solid), 9 px lower.
- MEASURED CHANGE 2 (new here): the nasolabial fold's shadow depth. Across the fold, at each of 9 stations along its landmark line, the
  luminance profile perpendicular to the fold (+-14 px) is read; depth = 1 - min(centre band) / mean(both sides). Before vs after,
  per side, with the share of stations that agree in sign. Reported only if >= 70 % agree.
"""
import json
from pathlib import Path
import numpy as np
import cv2
import mediapipe as mp

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "brand/remotion/public/oct14"
EDIT = ROOT / "brand/edits/oct14-injection"
RES = ROOT / "research/ostad/style/oct14"
MODEL = "C:/Users/naimj/tools/models/face_landmarker.task"

BONE = {"R": [234, 227, 123, 50], "L": [454, 447, 352, 280]}            # R/L = HER side (image left = her right)
FOLD = {"naso_R": [129, 203, 206, 216], "naso_L": [358, 423, 426, 436], "mario_R": [61, 202, 210], "mario_L": [291, 422, 430]}


def landmarks(img):
    V = mp.tasks.vision
    lm = V.FaceLandmarker.create_from_options(V.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=MODEL), running_mode=V.RunningMode.IMAGE, num_faces=1))
    r = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB)))
    h, w = img.shape[:2]
    return np.array([[p.x * w, p.y * h] for p in r.face_landmarks[0]])


def resample(pts, n):
    pts = np.asarray(pts, float)
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
    t = np.linspace(0, d[-1], n)
    return np.c_[np.interp(t, d, pts[:, 0]), np.interp(t, d, pts[:, 1])]


def fold_depth(gray, line, half=14, band=3):
    st = resample(line, 11)[1:-1]
    out = []
    for i, c in enumerate(st):
        tng = st[min(i + 1, len(st) - 1)] - st[max(i - 1, 0)]
        nrm = np.array([-tng[1], tng[0]]) / (np.linalg.norm(tng) + 1e-6)
        prof = []
        for s in range(-half, half + 1):
            x, y = c + nrm * s
            prof.append(cv2.getRectSubPix(gray, (3, 3), (float(x), float(y))).mean())
        prof = np.array(prof)
        centre = prof[half - band - 4:half + band + 5].min()
        sides = (prof[:4].mean() + prof[-4:].mean()) / 2
        out.append(1 - centre / sides)
    return np.array(out)


def main():
    b = cv2.imread(str(PUB / "before.jpg")); a = cv2.imread(str(PUB / "after_aligned.jpg"))
    Lb, La = landmarks(b), landmarks(a)
    reg = float(np.median(np.linalg.norm(Lb - La, axis=1)))
    marks = json.loads((RES / "marks.json").read_text())
    pair = json.loads((EDIT / "pair.json").read_text())
    contour = json.loads((RES / "contour_measure.json").read_text())
    P = lambda i: [round(float(Lb[i][0]), 1), round(float(Lb[i][1]), 1)]
    entries = [{"id": m["id"], "xy": m["before_xy"], "product": m["product"], "order": m["order"], "error_px": m["error_px"]} for m in marks["marks"]]
    E = {e["id"]: e["xy"] for e in entries}
    folds = {k: [P(i) for i in v] for k, v in FOLD.items()}
    bones = {k: [P(i) for i in v] for k, v in BONE.items()}

    def toward(e, line, end):
        """a cannula pass: from the entry to the fold line's end point `end` (0 = first landmark, -1 = last)"""
        return [E[e], line[end]]
    passes = [{"id": "lowerR-naso", "from": "lowerR", "pts": toward("lowerR", folds["naso_R"], 0), "note": marks["paths"][0]["note"]},
              {"id": "lowerR-mario", "from": "lowerR", "pts": toward("lowerR", folds["mario_R"], -1), "note": marks["paths"][1]["note"]},
              {"id": "chin-mario", "from": "chin", "pts": toward("chin", folds["mario_R"], 1), "note": "IMG_3654 0:60-0:70: the pass from below the mouth"},
              {"id": "jawL-mario", "from": "jawL", "pts": toward("jawL", folds["mario_L"], 1), "note": marks["paths"][2]["note"]}]
    gb, ga = cv2.cvtColor(b, cv2.COLOR_BGR2GRAY).astype(np.float32), cv2.cvtColor(a, cv2.COLOR_BGR2GRAY).astype(np.float32)
    depth = {}
    for side in ("naso_R", "naso_L"):
        db, da = fold_depth(gb, folds[side]), fold_depth(ga, folds[side])
        ch = da - db
        med = float(np.median(ch))
        share = float(np.mean(np.sign(ch) == np.sign(med)))
        depth[side] = {"before": round(float(np.median(db)) * 100, 1), "after": round(float(np.median(da)) * 100, 1), "change_pct_points": round(med * 100, 1),
                       "relative_change_pct": round(100 * med / max(1e-6, float(np.median(db))), 0), "same_sign_share": round(share, 2),
                       "reported": share >= 0.7 and abs(med) > 0.005}
    fw = pair["face_width_px"]
    out = {"source": "before.jpg (pre1 16.83 s, 4:42 PM) / after_aligned.jpg (after 12.17 s, 4:55 PM), pair.json", "landmark_registration_px": round(reg, 2),
           "entries": entries, "bones": bones, "folds": folds, "passes": passes,
           "contour": {"before": contour["before"], "after": contour["after"], "shift_px": contour["median_shift_px"], "shift_pct_face_width": contour["shift_pct_face_width"],
                       "same_sign_share": contour["same_sign_share"]},
           "fold_depth": depth, "face_width_px": fw}
    (PUB / "markup_v5.json").write_text(json.dumps(out))
    (RES / "markup_v5.json").write_text(json.dumps({k: v for k, v in out.items()}, indent=1))
    # check image (her face; gitignored folder)
    s = 4
    crop = cv2.resize(b[680:1060, 40:360], None, fx=s, fy=s)
    T = lambda q: (int((q[0] - 40) * s), int((q[1] - 680) * s))
    for k, v in bones.items():
        cv2.polylines(crop, [np.array([T(q) for q in v])], False, (255, 255, 255), 3)
    for k, v in folds.items():
        cv2.polylines(crop, [np.array([T(q) for q in v])], False, (200, 200, 200), 1)
    for q in passes:
        cv2.polylines(crop, [np.array([T(x) for x in q["pts"]])], False, (0, 255, 255), 2)
    for e in entries:
        x, y = T(e["xy"]); cv2.drawMarker(crop, (x, y), (0, 0, 255), cv2.MARKER_TILTED_CROSS, 22, 3)
    cv2.polylines(crop, [np.array([T(q) for q in contour["before"]])], False, (255, 0, 0), 2)
    cv2.polylines(crop, [np.array([T(q) for q in contour["after"]])], False, (0, 255, 0), 2)
    cv2.imwrite(str(EDIT / "markup_v5_check.jpg"), crop)
    print(json.dumps({"registration_px": reg, "fold_depth": depth}, indent=1))


if __name__ == "__main__":
    main()
