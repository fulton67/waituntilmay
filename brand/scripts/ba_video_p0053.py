"""Full-screen before/after stills for the "With me / Without me" reel, P0053 rosacea (catalog 10678, clinic tablet 2-up, 2021).

  python -I brand/scripts/ba_video_p0053.py <IMG_0502.PNG> <pub_dir>

Cuts the two panels out of the clinic's side-by-side (inside the photo area only: no status bar, no "Service Date" text, no (i)
icons), fits the AFTER onto the BEFORE with a similarity transform on MediaPipe eye corners + nose bridge + nose tip (residual
printed), and writes story (1080x1920) and feed (1080x1350) crops centred on the face, so a hard cut lands face-on-face.
Crop, scale, rotate, translate only: no grade, no retouch. Outputs go to <pub_dir> (outside the repo, never committed).
"""
import json, os, sys
import cv2, numpy as np

MODEL = "C:/Users/naimj/tools/models/face_landmarker.task"
PANELS = {"before": (12, 152, 1012, 1430), "after": (1037, 152, 2036, 1430)}  # x0, y0, x1, y1 inside each photo
KEY = [33, 263, 168, 1, 133, 362]                                            # eye corners, nose bridge, nose tip, inner corners


def landmarks(img):
    import mediapipe as mp
    from mediapipe.tasks import python as mpp
    from mediapipe.tasks.python import vision
    fl = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(base_options=mpp.BaseOptions(model_asset_path=MODEL), num_faces=1))
    r = fl.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(img[:, :, ::-1])))
    h, w = img.shape[:2]
    return np.array([[p.x * w, p.y * h] for p in r.face_landmarks[0]], np.float32)


def main(src, pub):
    os.makedirs(pub, exist_ok=True)
    im = cv2.imread(src)
    P = {k: im[y0:y1, x0:x1] for k, (x0, y0, x1, y1) in PANELS.items()}
    B, A = P["before"], P["after"]
    lb, la = landmarks(B), landmarks(A)
    M, _ = cv2.estimateAffinePartial2D(la[KEY], lb[KEY], method=cv2.LMEDS)
    res = np.linalg.norm((la[KEY] @ M[:, :2].T + M[:, 2]) - lb[KEY], axis=1)
    eye = np.linalg.norm(lb[33] - lb[263])
    h, w = B.shape[:2]
    # after warped into the before frame; its valid area limits the shared crop
    Aw = cv2.warpAffine(A, M, (w, h), flags=cv2.INTER_LANCZOS4, borderValue=(0, 0, 0))
    valid = cv2.warpAffine(np.full(A.shape[:2], 255, np.uint8), M, (w, h), flags=cv2.INTER_NEAREST)
    ys, xs = np.where(valid > 0)
    vx0, vx1, vy0, vy1 = xs.min() + 2, xs.max() - 2, ys.min() + 2, ys.max() - 2
    cx = float(lb[168][0])
    meta = {"scale": float(np.hypot(*M[0, :2])), "rot_deg": float(np.degrees(np.arctan2(M[1, 0], M[0, 0]))),
            "residual_px_median": float(np.median(res)), "residual_pct_eye": float(np.median(res) / eye * 100), "out": {}}
    for fmt, (OW, OH) in {"story": (1080, 1920), "feed": (1080, 1350)}.items():
        ch = vy1 - vy0; cw = ch * OW / OH
        if cw > vx1 - vx0: cw = vx1 - vx0; ch = cw * OH / OW
        x0 = int(round(min(max(cx - cw / 2, vx0), vx1 - cw))); y0 = int(round(vy0 + (vy1 - vy0 - ch) / 2))
        for k, img in (("before", B), ("after", Aw)):
            crop = img[y0:y0 + int(round(ch)), x0:x0 + int(round(cw))]
            cv2.imwrite(os.path.join(pub, f"{fmt}_{k}.png"), cv2.resize(crop, (OW, OH), interpolation=cv2.INTER_LANCZOS4))
        meta["out"][fmt] = {"crop": [x0, y0, int(round(cw)), int(round(ch))], "upscale": OH / ch}
    json.dump(meta, open(os.path.join(pub, "p0053.json"), "w"), indent=1)
    print(json.dumps(meta))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
