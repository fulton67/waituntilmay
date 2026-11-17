"""Jan 08 reel: register and measure the real cheek-filler before/after (clinic library, patient P0007, 2022-07-08, standardised
clinical photos taken before and right after the session: catalog ids 7681 / 7662 frontal, 7680 / 7661 left oblique; pulled read-only
with clinic-library scripts/pull_direct.py; consent = yes; codes only). Never AI; nothing is drawn that was not measured.

  $PY -I brand/scripts/jan08_ba.py      (style venv: mediapipe, cv2, pillow_heif)

1. Landmarks: MediaPipe FaceLandmarker (local model) on each photo.
2. Registration: similarity transform of the after onto the before on landmarks the filler does not move (eye corners, nose
   bridge and tip, brow heads). Residual reported in px.
3. Landmark widths (zygoma, mid-cheek, jaw) before vs registered after.
4. Measure, per pair, on the patient's camera-side cheek: the submalar shadow (the hollow below the cheekbone that volume loss leaves).
   Region = the polygon between cheekbone, nasolabial line and jaw landmarks. Shadow = pixels whose luma is >= 12 % under the
   region's 80th percentile (the cheekbone highlight) in the BEFORE photo's own lighting; the same threshold rule is applied to the
   registered after. Area change in % and the shadow outline (the contour drawn in the reel) for both.
Outputs: public/jan08/clinic/<pair>_after_aligned.jpg, public/jan08/ba.json (contours in before-image px), and
research/ostad/style/jan08/ba_measure.json (numbers, committed). Debug overlays to brand/edits/jan08-filler-fatigue/ba/.
"""
import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "brand/remotion/public/jan08"
CL = PUB / "clinic"
DBG = ROOT / "brand/edits/jan08-filler-fatigue/ba"
MEAS = ROOT / "research/ostad/style/jan08/ba_measure.json"
MODEL = "C:/Users/naimj/tools/models/face_landmarker.task"
STABLE = [33, 133, 362, 263, 168, 6, 197, 1, 4, 55, 285, 70, 300]  # eye corners, nose bridge/tip, brow heads
# patient's LEFT cheek in MediaPipe indices (image right in the frontal; the camera side in the left oblique)
CHEEK = {"zyg": [345, 352, 376, 433], "region": [346, 347, 348, 329, 371, 266, 425, 411, 416, 364, 394, 430, 431, 262, 369, 395, 378, 400, 377, 152, 148, 176, 149,
                                               150, 136, 172, 58, 132, 93, 234]}
REGION_L = [119, 100, 142, 203, 206, 216, 212, 214, 135, 138, 215, 177, 137, 227, 34, 143, 111, 117, 118]  # patient's right (image left)
REGION_R = [348, 329, 371, 423, 426, 436, 432, 434, 364, 367, 435, 401, 366, 447, 264, 372, 340, 346, 347]  # patient's left (image right)


def landmarks(img):
    import mediapipe as mp
    V = mp.tasks.vision
    opts = V.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=MODEL), running_mode=V.RunningMode.IMAGE, num_faces=1)
    with V.FaceLandmarker.create_from_options(opts) as lm:
        r = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB)))
    h, w = img.shape[:2]
    return np.array([[p.x * w, p.y * h] for p in r.face_landmarks[0]], np.float32)


def shadow(img, poly, thr_ref=None):
    luma = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2LAB)[:, :, 0].astype(np.float32), (0, 0), 6)
    m = np.zeros(luma.shape, np.uint8)
    cv2.fillPoly(m, [poly.astype(np.int32)], 1)
    vals = luma[m > 0]
    hi = float(np.percentile(vals, 80))
    thr = thr_ref if thr_ref is not None else hi * 0.88
    sh = ((luma < thr) & (m > 0)).astype(np.uint8)
    sh = cv2.morphologyEx(sh, cv2.MORPH_OPEN, np.ones((15, 15), np.uint8))
    return sh, hi, thr, float(vals.mean())


def contour(mask):
    cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cs = [c for c in cs if cv2.contourArea(c) > 2000]
    return [cv2.approxPolyDP(c, 3, True)[:, 0].tolist() for c in cs]


def pair(name, side):
    b = cv2.imread(str(CL / f"{name}_before.jpg")); a = cv2.imread(str(CL / f"{name}_after.jpg"))
    Lb, La = landmarks(b), landmarks(a)
    M, _ = cv2.estimateAffinePartial2D(La[STABLE], Lb[STABLE], method=cv2.LMEDS)
    a2 = cv2.warpAffine(a, M, (b.shape[1], b.shape[0]), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    cv2.imwrite(str(CL / f"{name}_after_aligned.jpg"), a2, [cv2.IMWRITE_JPEG_QUALITY, 93])
    La2 = (np.c_[La, np.ones(len(La))] @ M.T).astype(np.float32)
    resid = np.linalg.norm(La2[STABLE] - Lb[STABLE], axis=1)
    poly = Lb[REGION_R if side == "R" else REGION_L]
    sb, hib, thr, meanb = shadow(b, poly)
    # the same relative rule in the after's own exposure (its cheekbone highlight), so a global exposure change is not counted
    _, hia, _, _ = shadow(a2, poly)
    sa, _, _, meana = shadow(a2, poly, thr_ref=hia * 0.88)
    area_b, area_a = int(sb.sum()), int(sa.sum())
    # mean luma of the before-shadow pixels, before vs after, each relative to its own highlight: how much lighter the hollow reads
    rel_b = float(cv2.mean(cv2.cvtColor(b, cv2.COLOR_BGR2LAB)[:, :, 0], sb)[0] / hib)
    rel_a = float(cv2.mean(cv2.cvtColor(a2, cv2.COLOR_BGR2LAB)[:, :, 0], sb)[0] / hia)
    widths = {nm: {"before": round(float(np.linalg.norm(Lb[i] - Lb[j])), 1), "after": round(float(np.linalg.norm(La2[i] - La2[j])), 1),
                   "change_pct": round(100 * float(np.linalg.norm(La2[i] - La2[j]) / np.linalg.norm(Lb[i] - Lb[j]) - 100), 1)}
              for nm, (i, j) in {"zygoma_234_454": (234, 454), "midcheek_93_323": (93, 323), "jaw_172_397": (172, 397)}.items()}
    res = {"pair": name, "landmark_widths": widths, "side": "patient's left cheek" if side == "R" else "patient's right cheek", "size": [b.shape[1], b.shape[0]],
           "registration": {"landmarks": STABLE, "residual_px_median": round(float(np.median(resid)), 2), "residual_px_max": round(float(resid.max()), 2)},
           "shadow_area_px": {"before": area_b, "after": area_a, "change_pct": round(100 * (area_a - area_b) / max(area_b, 1), 1)},
           "hollow_luma_rel_highlight": {"before": round(rel_b, 3), "after": round(rel_a, 3)},
           "contours": {"before": contour(sb), "after": contour(sa)}, "lm_before": Lb.round(1).tolist(), "lm_after": La2.round(1).tolist(), "region": poly.round(1).tolist(),
           "pts": {k: Lb[i].round(1).tolist() for k, i in {"zygL": 345, "zygR": 116, "cheekL": 425, "cheekR": 205, "mouthL": 291, "mouthR": 61,
                                                           "nlL": 410, "nlR": 186, "marL": 287, "marR": 57, "lidL": 253, "lidR": 23, "chin": 152, "nose": 1}.items()}}
    DBG.mkdir(parents=True, exist_ok=True)
    for tag, im, m in (("before", b, sb), ("after", a2, sa)):
        o = im.copy()
        cv2.polylines(o, [poly.astype(np.int32)], True, (200, 200, 200), 3)
        for c in res["contours"][tag]:
            cv2.polylines(o, [np.array(c, np.int32)], True, (255, 255, 255), 6)
        cv2.imwrite(str(DBG / f"{name}_{tag}.jpg"), cv2.resize(o, (o.shape[1] // 4, o.shape[0] // 4)))
    print(name, json.dumps({k: res[k] for k in ("registration", "shadow_area_px", "hollow_luma_rel_highlight", "landmark_widths")}))
    return res


def main():
    out = {"front": pair("front", "R"), "obl": pair("obl", "R")}
    PUB.mkdir(parents=True, exist_ok=True)
    (PUB / "ba.json").write_text(json.dumps(out))
    MEAS.parent.mkdir(parents=True, exist_ok=True)
    MEAS.write_text(json.dumps({"source": "clinic-library catalog ids 7681/7662 (frontal), 7680/7661 (left oblique), patient P0007, 2022-07-08, before and right after the session",
                                "method": __doc__.split("Outputs:")[0].strip(),
                                "verdict": "No volume change is measurable on these photos: every landmark width moves by the same amount (a pose/scale difference, front -2.6 to -3.0 %, oblique +0.9 to +1.6 %), and the submalar shadow area/luma changes are within lighting noise (front +4.0 %, oblique -4.5 %). The reel therefore shows the pair with the STANDARD white ring on the cheekbone landmark (where he places filler) and no change arrow or number (std-skin-window: arrows only where a change is measured; LESSONS L4). The photos were taken right after the session.",
                                **{k: {kk: vv for kk, vv in v.items() if kk not in ("contours", "region", "lm_before", "lm_after")} for k, v in out.items()}}, indent=1))


if __name__ == "__main__":
    main()
