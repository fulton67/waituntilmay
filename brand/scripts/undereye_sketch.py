"""Under-eye filler reel v2: the surgeon's sketch, measured from the procedure footage (user note: "show almost exactly what was done").

What was done (IMG_6817, 4 fps over the two injection spans):
  - every sampled frame: MediaPipe face landmarks; the syringe + cannula as the dominant straight line in the lower face (Canny ->
    probabilistic Hough; kept when it is long (>= 0.45 x the inter-ocular distance, IOD), not near-horizontal, and its extension passes
    within 0.6 IOD of that side's under-eye); its end nearest the eye is where the metal leaves the skin: the entry point;
  - each frame is registered to the reference face by a similarity transform on stable landmarks (eye corners, nasion, nose tip,
    mouth corners: least squares), so every measurement lands on one face: the reference is the 2021-09-20 standardised front shot
    (IMG_6815 at 1.0 s, 1080x1920);
  - entry point per side = the median of the registered entries; its error = the median distance of the frames' entries to it;
  - path: the cannula is under the skin past the entry, so its course is the shaft's axis through the entry; per frame the axis is
    followed to the tear-trough line (the lower-lid landmarks moved down 0.12 IOD); the drawn strokes are the 10th / 50th / 90th
    percentile of where those axes reach the trough (the fan he swept); path error = the median distance, at the trough, between a
    frame's measured axis and the nearest drawn stroke.
What changed (IMG_1215 halves, 09/20 vs 10/04, the same photo setup), registered on the same landmarks: an L* profile along each trough
line (9 points, 0.07 IOD windows) minus the cheek below it, after - before; the noise floor is the same difference on a control line on
the mid-cheek (0.42 IOD below the lid); a point is "changed" only above 2 x the control's median absolute deviation + its |median|.
Outputs: brand/edits/undereye-filler/sketch.json (local), research/ostad/style/undereye/sketch_measure.json (numbers, committed),
public/undereye-filler/ba_before_ref.jpg (6815 frame), ba_wipe_before.jpg / ba_wipe_after.jpg (1215 halves registered to the reference)
and a check sheet sketch_check.jpg (local).
Run: C:/Users/naimj/tools/style-venv/Scripts/python.exe -I brand/scripts/undereye_sketch.py
"""
import json, math
from pathlib import Path
import numpy as np
import cv2
import mediapipe as mp

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "brand/remotion/public/undereye-filler"
EDIT = ROOT / "brand/edits/undereye-filler"
OUTM = ROOT / "research/ostad/style/undereye/sketch_measure.json"
MODEL = "C:/Users/naimj/tools/models/face_landmarker.task"
STABLE = [33, 133, 362, 263, 168, 1, 61, 291]
LID = {"L": [33, 7, 163, 144, 145, 153, 154, 155, 133], "R": [263, 249, 390, 373, 374, 380, 381, 382, 362]}  # image side
SPANS = {"R_patient": ("L", 30.0, 110.0), "L_patient": ("R", 180.0, 235.0)}  # her right = image left, treated first
_lm = None


def lms(img):
    global _lm
    if _lm is None:
        _lm = mp.tasks.vision.FaceLandmarker.create_from_options(mp.tasks.vision.FaceLandmarkerOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=MODEL), running_mode=mp.tasks.vision.RunningMode.IMAGE, num_faces=1))
    r = _lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB)))
    if not r.face_landmarks:
        return None
    h, w = img.shape[:2]
    return np.array([[q.x * w, q.y * h] for q in r.face_landmarks[0]])


def sim(src, dst):
    M, _ = cv2.estimateAffinePartial2D(np.float32(src), np.float32(dst), method=cv2.LMEDS)
    return M


def ap(M, p):
    return M[:, :2] @ np.asarray(p, float) + M[:, 2]


def trough(L, side, iod):
    pts = L[LID[side]].copy()
    pts[:, 1] += 0.12 * iod
    return pts


def ray_poly(p, d, poly):
    """First intersection of the ray p + t d (t > 0) with the polyline, or None."""
    best = None
    for a, b in zip(poly[:-1], poly[1:]):
        e = b - a
        den = d[0] * e[1] - d[1] * e[0]
        if abs(den) < 1e-9:
            continue
        w = a - p
        t = (w[0] * e[1] - w[1] * e[0]) / den
        s = (w[0] * d[1] - w[1] * d[0]) / den
        if t > 0 and -0.05 <= s <= 1.05 and (best is None or t < best[0]):
            best = (t, p + t * d)
    return best[1] if best else None


def shaft(img, L, side):
    iod = np.linalg.norm(L[468] - L[473])
    under = L[145] if side == "L" else L[374]
    x0, x1 = int(max(0, L[:, 0].min() - 0.8 * iod)), int(min(img.shape[1], L[:, 0].max() + 0.8 * iod))
    y0, y1 = int(max(0, under[1] - 0.1 * iod)), int(min(img.shape[0], L[152][1] + 1.2 * iod))
    roi = cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(roi, (3, 3), 0), 40, 120)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 360, 60, minLineLength=int(0.45 * iod), maxLineGap=int(0.08 * iod))
    if lines is None:
        return None
    best = None
    for x1_, y1_, x2_, y2_ in lines.reshape(-1, 4):
        a, b = np.array([x1_ + x0, y1_ + y0], float), np.array([x2_ + x0, y2_ + y0], float)
        d = b - a
        ln = np.linalg.norm(d)
        if abs(d[1]) < 0.25 * ln:  # near-horizontal: lips, glove edges
            continue
        # the end nearer the under-eye is where the shaft meets the skin
        if np.linalg.norm(a - under) < np.linalg.norm(b - under):
            a, b = b, a
        u = (b - a) / ln
        dist = abs((under - a)[0] * u[1] - (under - a)[1] * u[0])  # distance from the under-eye to the shaft's axis
        if dist > 0.6 * iod or np.dot(under - b, u) < 0:  # must point toward the eye
            continue
        score = ln - 2 * dist
        if best is None or score > best[0]:
            best = (score, b, u, ln)
    return None if best is None else {"entry": best[1], "dir": best[2], "len": best[3], "iod": iod}


def main():
    cap = cv2.VideoCapture(str(PUB / "6815.mp4"))
    cap.set(cv2.CAP_PROP_POS_MSEC, 1000)
    _, ref = cap.read()
    cap.release()
    cv2.imwrite(str(PUB / "ba_before_ref.jpg"), ref, [cv2.IMWRITE_JPEG_QUALITY, 93])
    R = lms(ref)
    iodR = float(np.linalg.norm(R[468] - R[473]))
    res = {"reference": "IMG_6815 @ 1.0 s", "reference_iod_px": round(iodR, 1), "sides": {}}
    sketch = {"sides": {}, "order": ["R_patient", "L_patient"]}
    v = cv2.VideoCapture(str(PUB / "6817.mp4"))
    fps = v.get(cv2.CAP_PROP_FPS)
    for key, (side, t0, t1) in SPANS.items():
        entries, dirs, used = [], [], []
        for t in np.arange(t0, t1, 0.25):
            v.set(cv2.CAP_PROP_POS_FRAMES, int(t * fps))
            ok, img = v.read()
            if not ok:
                continue
            L = lms(img)
            if L is None:
                continue
            s = shaft(img, L, side)
            if s is None:
                continue
            M = sim(L[STABLE], R[STABLE])
            e = ap(M, s["entry"])
            d = M[:, :2] @ s["dir"]
            d /= np.linalg.norm(d)
            entries.append(e)
            dirs.append(d)
            used.append(round(float(t), 2))
        E = np.array(entries)
        ent = np.median(E, axis=0)
        err = np.linalg.norm(E - ent, axis=1) * 1080 / ref.shape[1]
        # keep frames whose entry agrees with the median (others are a glove edge or the syringe out of the skin)
        keep = err < 40
        tr = trough(R, side, iodR)
        ends = [ray_poly(ent, d, tr) for d, k in zip(dirs, keep) if k]
        ends = np.array([q for q in ends if q is not None])
        if len(ends) == 0:
            res["sides"][key] = {"frames": len(E), "error": "no axis reaches the trough"}
            continue
        # strokes: the fan, as percentiles of the end position along the trough (by x)
        order = np.argsort(ends[:, 0])
        pick = [ends[order[int(q * (len(order) - 1))]] for q in (0.1, 0.5, 0.9)]
        # path error: for each frame's axis, its distance at the trough to the nearest drawn stroke end
        perr = [min(np.linalg.norm(q - pk) for pk in pick) for q in ends]
        hollow = np.vstack([R[LID[side]], tr[::-1]])
        res["sides"][key] = {
            "image_side": side, "span_s": [t0, t1], "frames_with_shaft": int(len(E)), "frames_agreeing": int(keep.sum()),
            "entry_px": [round(float(x), 1) for x in ent], "entry_error_px_median": round(float(np.median(err[keep])), 1),
            "entry_error_px_p90": round(float(np.percentile(err[keep], 90)), 1),
            "path_error_px_median": round(float(np.median(perr)) * 1080 / ref.shape[1], 1), "path_error_px_p90": round(float(np.percentile(perr, 90)) * 1080 / ref.shape[1], 1),
            "axes_reaching_trough": int(len(ends))}
        sketch["sides"][key] = {"entry": ent.round(1).tolist(), "strokes": [[ent.round(1).tolist(), p.round(1).tolist()] for p in pick],
                                "hollow": hollow.round(1).tolist(), "trough": tr.round(1).tolist()}
        print(key, res["sides"][key])
    v.release()

    # what changed: the 1215 photos registered to the reference
    im = cv2.imread("C:/Users/naimj/clinic-library/tmp/undereye_extra/IMG_1215.jpg")
    w = im.shape[1]
    halves = {"before": im[:, : w // 2].copy(), "after": im[:, w // 2:].copy()}
    reg = {}
    for k, x in halves.items():
        hh = x.shape[0]
        ramp = np.clip((np.arange(hh) - 0.86 * hh) / (0.04 * hh), 0, 1)[:, None, None]
        x = (x * (1 - ramp)).astype(np.uint8)  # the burned-in service date strip faded to the black backdrop
        Lx = lms(x)
        M = sim(Lx[STABLE], R[STABLE])
        reg[k] = cv2.warpAffine(x, M, (ref.shape[1], ref.shape[0]), flags=cv2.INTER_LANCZOS4, borderValue=(0, 0, 0))
        cv2.imwrite(str(PUB / f"ba_wipe_{k}.jpg"), reg[k], [cv2.IMWRITE_JPEG_QUALITY, 93])
    regerr = {}
    Lb, La = lms(reg["before"]), lms(reg["after"])
    for k, Lx in (("before", Lb), ("after", La)):
        regerr[k] = round(float(np.linalg.norm(Lx[STABLE] - R[STABLE], axis=1).mean()), 2)
    res["registration_error_px_mean"] = regerr
    lab = {k: cv2.cvtColor(v_, cv2.COLOR_BGR2LAB)[..., 0].astype(float) * 100 / 255 for k, v_ in reg.items()}
    win = max(3, int(0.035 * iodR))

    def prof(img, poly, below):
        out = []
        for p in poly:
            x, y = int(p[0]), int(p[1])
            a = img[y - win:y + win, x - win:x + win].mean()
            c = img[int(y + below) - win:int(y + below) + win, x - win:x + win].mean()
            out.append(a - c)
        return np.array(out)

    res["change"] = {}
    sketch["arrows"] = []
    for key, sd in sketch["sides"].items():
        tr = np.array(sd["trough"])
        ctrl = tr.copy()
        ctrl[:, 1] += 0.30 * iodR
        d = prof(lab["after"], tr, 0.25 * iodR) - prof(lab["before"], tr, 0.25 * iodR)
        dc = prof(lab["after"], ctrl, 0.15 * iodR) - prof(lab["before"], ctrl, 0.15 * iodR)
        floor = float(abs(np.median(dc)) + 2 * np.median(np.abs(dc - np.median(dc))))
        changed = [i for i, x in enumerate(d) if x > floor]
        res["change"][key] = {"trough_profile_change_Lstar": d.round(2).tolist(), "control_change_Lstar": dc.round(2).tolist(),
                              "noise_floor_Lstar": round(floor, 2), "points_changed": changed, "mean_change": round(float(d.mean()), 2)}
        for i in changed[::2]:
            sketch["arrows"].append({"side": key, "at": tr[i].round(1).tolist(), "change": round(float(d[i]), 2)})
    OUTM.write_text(json.dumps(res, indent=1), encoding="utf-8")
    (EDIT / "sketch.json").write_text(json.dumps(sketch), encoding="utf-8")
    # check sheet
    chk = ref.copy()
    for key, sd in sketch["sides"].items():
        e = tuple(int(x) for x in sd["entry"])
        cv2.drawMarker(chk, e, (0, 0, 255), cv2.MARKER_TILTED_CROSS, 30, 3)
        for a, b in sd["strokes"]:
            cv2.line(chk, tuple(int(x) for x in a), tuple(int(x) for x in b), (255, 255, 255), 2)
        cv2.polylines(chk, [np.int32(sd["hollow"])], True, (255, 200, 0), 1)
    for a in sketch["arrows"]:
        cv2.circle(chk, tuple(int(x) for x in a["at"]), 6, (0, 255, 0), 2)
    cv2.imwrite(str(EDIT / "sketch_check.jpg"), chk)
    print(json.dumps({k: v for k, v in res.items() if k != "sides"}, indent=1))


if __name__ == "__main__":
    main()
