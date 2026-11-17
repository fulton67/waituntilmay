"""Under-eye filler reel v2: the real before / after (user note 6), aligned on the eyes, with improvements measured, not assumed.

Sources (face-matched to the 2021-09-20 patient, research/ostad/style/undereye/facematch.json):
  before = IMG_1215.jpg left half (the clinic's standardised photo, service date 09/20/2021)
  after  = IMG_1215.jpg right half (service date 10/04/2021)
(IMG_FD04FA9FAD12-1.jpeg and IMG_7278.JPG are the same two photos in a tablet screenshot and a watermarked export: not used.)
Alignment: MediaPipe Face Landmarker iris centres (468, 473) on both; the after photo is mapped onto the before photo's eyes by a
similarity transform (scale, rotation, shift); both are cropped identically.
Measurement, per side (image L / R), in CIE L*: the under-eye band (from the lower-lid midpoint 145 / 374 to 40 % of the way to the
cheek point 50 / 280, the width of the eye) minus a cheek reference band below it (40-80 % of the way), before vs after. The change of
that contrast is the shadow change: > +2.0 L* (lighter under-eye relative to the cheek) is marked "less shadow"; anything else is not.
Outputs (gitignored, her face): public/undereye-filler/ba_split.jpg (1080x1920, before | after), ba_eyes.jpg (1080x1920, eye bands
before over after), ba_after.jpg (the aligned after, full frame); numbers to research/ostad/style/undereye/beforeafter.json.
Run: C:/Users/naimj/tools/style-venv/Scripts/python.exe -I brand/scripts/undereye_beforeafter.py
"""
import json
from pathlib import Path
import numpy as np
import cv2
import mediapipe as mp

ROOT = Path(__file__).resolve().parents[2]
SRC = Path("C:/Users/naimj/clinic-library/tmp/undereye_extra/IMG_1215.jpg")
PUB = ROOT / "brand/remotion/public/undereye-filler"
OUT = ROOT / "research/ostad/style/undereye/beforeafter.json"
MODEL = "C:/Users/naimj/tools/models/face_landmarker.task"


def landmarks(img):
    opts = mp.tasks.vision.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=MODEL), running_mode=mp.tasks.vision.RunningMode.IMAGE, num_faces=1)
    with mp.tasks.vision.FaceLandmarker.create_from_options(opts) as lm:
        r = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB)))
    h, w = img.shape[:2]
    return np.array([[q.x * w, q.y * h] for q in r.face_landmarks[0]])


def band(img_lab, L, lid, cheek, eo, ei, t0, t1):
    """Mean L* of the quadrilateral between t0..t1 of the way from the lid to the cheek, eye-wide."""
    a, b = L[lid] + (L[cheek] - L[lid]) * t0, L[lid] + (L[cheek] - L[lid]) * t1
    half = abs(L[eo][0] - L[ei][0]) / 2
    poly = np.array([[a[0] - half, a[1]], [a[0] + half, a[1]], [b[0] + half, b[1]], [b[0] - half, b[1]]], np.int32)
    m = np.zeros(img_lab.shape[:2], np.uint8)
    cv2.fillConvexPoly(m, poly, 1)
    return float(img_lab[..., 0][m > 0].mean()) * 100 / 255, poly.tolist()


def main():
    im = cv2.imread(str(SRC))
    h, w = im.shape[:2]
    before, after = im[:, : w // 2].copy(), im[:, w // 2:].copy()
    # the photo app burns a service date and an (i) icon into the bottom 8 %: fade that strip to the black backdrop
    for x in (before, after):
        hh = x.shape[0]
        ramp = np.clip((np.arange(hh) - 0.86 * hh) / (0.04 * hh), 0, 1)[:, None, None]
        x[:] = (x * (1 - ramp)).astype(np.uint8)
    Lb, La = landmarks(before), landmarks(after)
    eb, ea = np.float32([Lb[468], Lb[473]]), np.float32([La[468], La[473]])
    M, _ = cv2.estimateAffinePartial2D(ea, eb)
    after_al = cv2.warpAffine(after, M, (before.shape[1], before.shape[0]), flags=cv2.INTER_LANCZOS4, borderValue=(0, 0, 0))
    La2 = landmarks(after_al)
    err = float(np.linalg.norm(La2[[468, 473]] - Lb[[468, 473]], axis=1).mean())
    lab_b, lab_a = cv2.cvtColor(before, cv2.COLOR_BGR2LAB), cv2.cvtColor(after_al, cv2.COLOR_BGR2LAB)
    sides = {}
    for side, (lid, cheek, eo, ei) in {"L": (145, 50, 33, 133), "R": (374, 280, 263, 362)}.items():
        ub, pb = band(lab_b, Lb, lid, cheek, eo, ei, 0.05, 0.40)
        cb, _ = band(lab_b, Lb, lid, cheek, eo, ei, 0.45, 0.80)
        ua, _ = band(lab_a, La2, lid, cheek, eo, ei, 0.05, 0.40)
        ca, _ = band(lab_a, La2, lid, cheek, eo, ei, 0.45, 0.80)
        d = (ua - ca) - (ub - cb)
        sides[side] = {"under_minus_cheek_before": round(ub - cb, 2), "under_minus_cheek_after": round(ua - ca, 2), "change": round(d, 2),
                       "less_shadow": d > 2.0, "band_before_px": pb}
    # the eye centre and inter-ocular distance in the before photo (layout of the stills)
    cx, cy = (Lb[468] + Lb[473]) / 2
    iod = float(np.linalg.norm(Lb[468] - Lb[473]))
    # split: before | after, each half 540x1920 centred on the face
    def half(img):
        s = 540 / (iod * 2.6)
        r = cv2.resize(img, None, fx=s, fy=s, interpolation=cv2.INTER_LANCZOS4)
        x0, y0 = int(cx * s - 270), int(cy * s - 760)
        canvas = np.zeros((1920, 540, 3), np.uint8)
        sx0, sy0 = max(0, x0), max(0, y0)
        crop = r[sy0:y0 + 1920, sx0:x0 + 540]
        canvas[sy0 - y0:sy0 - y0 + crop.shape[0], sx0 - x0:sx0 - x0 + crop.shape[1]] = crop
        return canvas, s, x0, y0
    hb, s1, x0, y0 = half(before)
    ha, *_ = half(after_al)
    cv2.imwrite(str(PUB / "ba_split.jpg"), np.hstack([hb, ha]), [cv2.IMWRITE_JPEG_QUALITY, 93])
    # eyes: an eye band 2.2 x the inter-ocular distance wide, before above after
    def eyes(img):
        s = 1080 / (iod * 2.2)
        r = cv2.resize(img, None, fx=s, fy=s, interpolation=cv2.INTER_LANCZOS4)
        x0, y0 = int(cx * s - 540), int(cy * s - 300)
        return r[y0:y0 + 700, x0:x0 + 1080], s, x0, y0
    bb, s2, ex0, ey0 = eyes(before)
    ba, *_ = eyes(after_al)
    canvas = np.zeros((1920, 1080, 3), np.uint8)
    # 600-px bands (rows 50-650 of each 700-px crop): before at y 250 (the top safe line), after at y 960, both above the captions (1594)
    canvas[250:850], canvas[960:1560] = bb[50:650], ba[50:650]
    cv2.imwrite(str(PUB / "ba_eyes.jpg"), canvas, [cv2.IMWRITE_JPEG_QUALITY, 93])
    # full-frame after, the same framing as the split halves but 1080 wide
    s = 1080 / (iod * 3.4)
    r = cv2.resize(after_al, None, fx=s, fy=s, interpolation=cv2.INTER_LANCZOS4)
    fx0, fy0 = int(cx * s - 540), int(cy * s - 820)
    full = np.zeros((1920, 1080, 3), np.uint8)
    sx0, sy0 = max(0, fx0), max(0, fy0)
    crop = r[sy0:fy0 + 1920, sx0:fx0 + 1080]
    full[sy0 - fy0:sy0 - fy0 + crop.shape[0], sx0 - fx0:sx0 - fx0 + crop.shape[1]] = crop
    cv2.imwrite(str(PUB / "ba_after.jpg"), full, [cv2.IMWRITE_JPEG_QUALITY, 93])
    # under-eye band boxes in the eyes still's coordinates (top band = before at y 250, bottom = after at y 960; each band is the crop's rows 50-650)
    def to_eyes(poly, top):
        return [[round(px * s2 - ex0, 1), round(py * s2 - ey0 + top, 1)] for px, py in poly]
    res = {"source": SRC.name, "eye_alignment_error_px": round(err, 2), "inter_ocular_px": round(iod, 1), "sides": sides,
           "eyes_still_bands": {k: {"before": to_eyes(v["band_before_px"], 250 - 50), "after": to_eyes(v["band_before_px"], 960 - 50)} for k, v in sides.items()}}
    OUT.write_text(json.dumps(res, indent=1), encoding="utf-8")
    print(json.dumps({k: v for k, v in res.items() if k != "eyes_still_bands"}, indent=1))


if __name__ == "__main__":
    main()
