"""Register before/after photos so they can be compared honestly (grid 5).

Every "after" (and every timeline visit) is warped onto the "before" with a similarity transform (scale, rotation,
shift; no shear, no stretch), then all are cropped with the SAME box. Marks drawn later sit at identical
coordinates in every panel.

  frontal / oblique: MediaPipe landmarks on rigid features only (eye corners, nose bridge, nose root, nose tip),
                     so a treated area (cheeks, lips, chin) never drives the fit.
  profile:           silhouette on the dark backdrop -> nasion (deepest point between brow and nose) and
                     nose tip (most projecting point). Chin filler changes neither.

Reports per panel: residual of the fit points after warping, in % of the reference distance (eye-to-eye, or
nasion-to-tip). < 2 % reads as registered.

  python brand/scripts/ba_align.py            -> public/brand/ostad/stills/ba/src/aligned/*.jpg + ba/align.js
"""
import json, os, sys
import cv2, numpy as np

LIB = "C:/Users/naimj/clinic-library/previews/"
OUT = "public/brand/ostad/stills/ba/src/aligned/"
MODEL = "C:/Users/naimj/tools/models/face_landmarker.task"
MANUAL = {"chin_0": [(70, 300), (26, 420)], "chin_1": [(64, 300), (8, 420)]}   # (nasion, nose tip) px in each raw half
RIGID = [33, 133, 362, 263, 168, 6, 197, 4]          # eye corners, nose bridge/root, nose tip

# set: (mode, [(key, file id, crop-in-file x0,y0,x1,y1 or None)], output crop as fractions of the ref image, out size)
SETS = {
  # P0005 acne, left oblique, standardised series: 2022-01-12 -> 02-25 -> 06-01 (closest-pose shot of each visit)
  "acne": ("lm", [("acne_0", 9763, None), ("acne_1", 9285, None), ("acne_2", 8271, None)], (0.16, 0.16, 0.80, 0.76), (720, 900)),
  # P0010 AviClear: the clinic's 4-panel composite (2965), each visit registered to the first
  "avi": ("lm", [("avi_0", 2965, (156, 0, 512, 458)), ("avi_1", 2965, (512, 0, 878, 470)),
                 ("avi_2", 2965, (146, 512, 512, 982)), ("avi_3", 2965, (512, 540, 868, 998))], (0.07, 0.07, 0.93, 0.97), (720, 900)),
  # P0010 AviClear, the clinic's side-by-side (2975, 1080 px original): the larger halves, kept at NATIVE size (upscale 1.0)
  "avi2": ("lm", [("avi2_0", 2975, (0, 0, 500, 698)), ("avi2_1", 2975, (528, 0, 1024, 698))], (0.0, 0.0, 1.0, 1.0), (500, 698)),
  # the two middle visits (2965 panels, smaller) warped onto the 2975 before, so one loupe circle sits on the same skin at every visit
  "avit": ("lm", [("avit_0", 2975, (0, 0, 500, 698)), ("avit_1", 2965, (512, 0, 878, 470)), ("avit_2", 2965, (146, 512, 512, 982)),
                  ("avit_3", 2975, (528, 0, 1024, 698))], (0.0, 0.0, 1.0, 1.0), (500, 698)),
  # P0013 chin: the clinic's left-profile composite (6069), after registered on nasion + nose tip
  "chin": ("prof", [("chin_0", 6069, (0, 0, 512, 696)), ("chin_1", 6069, (512, 0, 1024, 696))], (0.0, 0.16, 1.0, 1.0), (720, 1132)),
}


def lm_detector():
    import mediapipe as mp
    from mediapipe.tasks import python as mpp
    from mediapipe.tasks.python import vision
    fl = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
        base_options=mpp.BaseOptions(model_asset_path=MODEL), num_faces=1,
        min_face_detection_confidence=0.2, min_face_presence_confidence=0.2))

    def run(img):
        r = fl.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(img[:, :, ::-1])))
        if not r.face_landmarks:
            return None
        h, w = img.shape[:2]
        return np.array([[p.x * w, p.y * h] for p in r.face_landmarks[0]], np.float32)
    return run


def profile_points(img):
    """Left-facing profile on a dark backdrop -> (nasion, nose tip) in px."""
    g = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (5, 5), 0).astype(np.float32)
    bg = np.median(g[:, 6:30], axis=1, keepdims=True)
    sat = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)[..., 1]
    fg = (np.abs(g - bg) > 24) & (sat > 45)          # skin only: his white guide line has no colour
    fg = cv2.morphologyEx(fg.astype(np.uint8), cv2.MORPH_OPEN, np.ones((7, 7), np.uint8)) > 0
    h, w = g.shape
    xs = np.full(h, np.nan)
    for y in range(h):
        c = np.nonzero(fg[y, 34:])[0]
        if len(c):
            xs[y] = c[0] + 34
    # nose tip: most-left (most projecting) point in the 30-70 % band of the height
    a, b = int(h * .30), int(h * .70)
    tip_y = a + int(np.nanargmin(xs[a:b]))
    # nasion: most-right (deepest) point between 12 % height and the tip
    a2 = int(h * .12)
    seg = xs[a2:tip_y - 10]
    nas_y = a2 + int(np.nanargmax(seg))
    return np.array([[xs[nas_y], nas_y], [xs[tip_y], tip_y]], np.float32), xs


def sim_from_2(src, dst):
    """Similarity transform mapping 2 src points to 2 dst points exactly."""
    s0, s1 = src; d0, d1 = dst
    vs, vd = s1 - s0, d1 - d0
    sc = np.linalg.norm(vd) / np.linalg.norm(vs)
    ang = np.arctan2(vd[1], vd[0]) - np.arctan2(vs[1], vs[0])
    c, s = sc * np.cos(ang), sc * np.sin(ang)
    M = np.array([[c, -s, 0], [s, c, 0]], np.float32)
    M[:, 2] = d0 - M[:, :2] @ s0
    return M


def main():
    os.makedirs(OUT, exist_ok=True)
    det = None
    report = {}
    only = sys.argv[1:]
    old = {}
    if only and os.path.exists("public/brand/ostad/stills/ba/align.js"):
        old = json.loads(open("public/brand/ostad/stills/ba/align.js").read().split("=", 1)[1].rstrip().rstrip(";"))
    report.update(old)
    for name, (mode, items, box, size) in SETS.items():
        if only and name not in only:
            continue
        imgs, pts = [], []
        for key, fid, crop in items:
            im = cv2.imread(f"{LIB}{fid:05d}.jpg")
            if crop:
                x0, y0, x1, y1 = crop; im = im[y0:y1, x0:x1]
            imgs.append(im)
        ref = imgs[0]; H, W = ref.shape[:2]
        if mode == "lm":
            det = det or lm_detector()
            L = [det(im) for im in imgs]
            if any(l is None for l in L):
                sys.exit(f"{name}: landmarks missing on {[i for i, l in enumerate(L) if l is None]}")
            refd = np.linalg.norm(L[0][33] - L[0][263])
            fit = [l[RIGID] for l in L]
        else:
            # hand-placed nasion + nose tip (10 px grid on the raw halves; the after's nose tip touches the panel edge, so
            # the automatic silhouette is unreliable here). For Ostad to check.
            P = [np.array(MANUAL[key], np.float32) for key, _, _ in items]
            refd = np.linalg.norm(P[0][1] - P[0][0])
            fit = P
        bx0, by0, bx1, by1 = int(box[0] * W), int(box[1] * H), int(box[2] * W), int(box[3] * H)
        recs = []
        for k, ((key, fid, _), im) in enumerate(zip(items, imgs)):
            if k == 0:
                M = np.array([[1, 0, 0], [0, 1, 0]], np.float32)
            elif mode == "lm":
                M, _ = cv2.estimateAffinePartial2D(fit[k], fit[0], method=cv2.LMEDS)
            else:
                M = sim_from_2(fit[k], fit[0])
            warped = cv2.warpAffine(im, M, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
            moved = (fit[k] @ M[:, :2].T) + M[:, 2]
            resid = float(np.sqrt(np.mean(np.sum((moved - fit[0]) ** 2, axis=1)))) / refd * 100
            scale = float(np.hypot(M[0, 0], M[1, 0]))
            crop = warped[by0:by1, bx0:bx1]
            # output size: keep aspect of the box, report effective upscale vs the preview pixels
            ow = size[0]; oh = int(round(ow * crop.shape[0] / crop.shape[1]))
            up = ow / crop.shape[1]
            cv2.imwrite(f"{OUT}{key}.jpg", cv2.resize(crop, (ow, oh), interpolation=cv2.INTER_LANCZOS4), [cv2.IMWRITE_JPEG_QUALITY, 94])
            rec = {"key": key, "id": fid, "scale": round(float(scale), 3), "resid_pct": round(float(resid), 2), "upscale": round(up, 2), "w": ow, "h": oh}
            # landmark positions in the output crop (fractions), so marks sit on the same anatomy in every panel
            if mode == "lm":
                lm = (L[k] @ M[:, :2].T) + M[:, 2]
                rec["lm"] = {str(i): [round(float((lm[i][0] - bx0) / (bx1 - bx0)), 4), round(float((lm[i][1] - by0) / (by1 - by0)), 4)]
                             for i in (1, 4, 10, 50, 101, 117, 123, 132, 136, 147, 152, 172, 187, 205, 207, 212, 213, 280, 330, 346, 352, 361, 397, 411, 425, 427, 432, 433, 234, 454, 58, 288)}
            else:
                pp = moved
                rec["nasion"] = [round(float((pp[0][0] - bx0) / (bx1 - bx0)), 4), round(float((pp[0][1] - by0) / (by1 - by0)), 4)]
                rec["tip"] = [round(float((pp[1][0] - bx0) / (bx1 - bx0)), 4), round(float((pp[1][1] - by0) / (by1 - by0)), 4)]
            recs.append(rec)
            print(f"{name:5s} {key:7s} id {fid:5d} scale {scale:.3f} resid {resid:.2f} % of ref  upscale {up:.2f}x")
        report[name] = recs
    with open("public/brand/ostad/stills/ba/align.js", "w") as f:
        f.write("// generated by brand/scripts/ba_align.py\nwindow.ALIGN = " + json.dumps(report) + ";\n")


if __name__ == "__main__":
    main()
