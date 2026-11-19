"""Before/after VIDEO reel for P0005 (lip filler, 2022-09-20): face-tracked, aligned crops of the clinic's own standardised clips.

  python -I brand/scripts/ba_video_p0005.py track  <src_dir>            landmarks + yaw per frame -> <src_dir>/track.json
  python -I brand/scripts/ba_video_p0005.py build  <src_dir> <pub_dir>  aligned 30 fps clips + bavideo.json for src/bavideo

Sources (read-only originals pulled with clinic-library/scripts/pull_direct.py, never committed): the dark-backdrop clips
IMG_5603/5604/5605 (before) and IMG_3818/3819/3822 (after), same session, same backdrop, same oblique -> front -> oblique sweep.
Picture: a plain ffmpeg decode (rgb24, no tone map, no grade, no retouch). Only crop, scale, rotate and translate, per frame, from
MediaPipe landmarks: forehead (10) to nose tip (1) sets scale and roll (yaw-robust and away from the lips, the treated area), the
nose bridge (168) is pinned to one point, so both faces share one scale and one eye line. Landmarks are smoothed over time.
The comparison pairs every before frame with the after frame of nearest head yaw (monotonic), so the two faces turn together.
Outputs go to <pub_dir> (outside the repo); render with --public-dir=<pub_dir>.
"""
import json, os, subprocess, sys
import cv2, numpy as np

MODEL = "C:/Users/naimj/tools/models/face_landmarker.task"
FPS = 30
WIN = (1000, 1250)                      # aligned window (4:5), the Remotion window scales it
ANCHOR = (0.5, 0.40)                    # nose bridge position in the window
FACE = 0.46                             # forehead -> nose-tip length as a share of the window height
CLIPS = ["IMG_5603", "IMG_5604", "IMG_5605", "IMG_3818", "IMG_3819", "IMG_3822"]


def frames(path):
    """every frame at 30 fps, plain decode, rotation applied (portrait 1080x1920)"""
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-vf", f"fps={FPS}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         stdout=subprocess.PIPE)
    n = 1080 * 1920 * 3
    while True:
        b = p.stdout.read(n)
        if len(b) < n: break
        yield np.frombuffer(b, np.uint8).reshape(1920, 1080, 3)
    p.stdout.close(); p.wait()


def detector():
    import mediapipe as mp
    from mediapipe.tasks import python as mpp
    from mediapipe.tasks.python import vision
    fl = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
        base_options=mpp.BaseOptions(model_asset_path=MODEL), num_faces=1,
        min_face_detection_confidence=0.2, min_face_presence_confidence=0.2))

    def run(rgb):
        r = fl.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)))
        if not r.face_landmarks: return None
        return np.array([[p.x * 1080, p.y * 1920] for p in r.face_landmarks[0]], np.float32)
    return run


def track(src):
    det, out = detector(), {}
    for c in CLIPS:
        f = os.path.join(src, c + ".MOV")
        if not os.path.exists(f): continue
        pts = []
        for img in frames(f):
            L = det(img)
            pts.append(None if L is None else {k: L[i].tolist() for k, i in (("fh", 10), ("nt", 1), ("nb", 168), ("le", 33), ("re", 263), ("ul", 0), ("ll", 17))})
        # yaw proxy: nose tip offset from the eye-corner midpoint, in eye distances (+ = facing her left)
        yaw = [None if p is None else (p["nt"][0] - (p["le"][0] + p["re"][0]) / 2) / max(1, abs(p["re"][0] - p["le"][0])) for p in pts]
        out[c] = {"n": len(pts), "pts": pts, "yaw": yaw}
        print(c, len(pts), "frames, missing", sum(p is None for p in pts), "yaw", np.round([y for y in yaw if y is not None][::10], 2).tolist())
    json.dump(out, open(os.path.join(src, "track.json"), "w"))


def smooth(a, k=7):
    a = np.asarray(a, np.float64); pad = np.pad(a, ((k // 2, k // 2), (0, 0)), mode="edge")
    return np.stack([np.convolve(pad[:, j], np.ones(k) / k, mode="valid") for j in range(a.shape[1])], 1)


def transforms(clip):
    """per-frame 2x3 affine: forehead->nose-tip vector to a fixed length, upright; nose bridge to ANCHOR"""
    P = clip["pts"]; idx = [i for i, p in enumerate(P) if p]
    def ser(k):
        v = np.array([P[i][k] for i in idx]); full = np.array([np.interp(range(len(P)), idx, v[:, j]) for j in range(2)]).T
        return smooth(full)
    fh, nt, nb = ser("fh"), ser("nt"), ser("nb")
    W, H = WIN; M = []
    for i in range(len(P)):
        d = nt[i] - fh[i]; L = np.hypot(*d); s = FACE * H / L
        ang = np.arctan2(d[0], d[1])     # roll: angle from vertical
        c, si = np.cos(ang) * s, np.sin(ang) * s
        R = np.array([[c, -si], [si, c]])
        t = np.array([ANCHOR[0] * W, ANCHOR[1] * H]) - R @ nb[i]
        M.append(np.hstack([R, t[:, None]]))
    return M, nt, fh, nb


def write(path, imgs):
    W, H = WIN
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-crf", "10", "-preset", "slow", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709",
                          "-color_trc", "bt709", path], stdin=subprocess.PIPE)
    for im in imgs: p.stdin.write(np.ascontiguousarray(im).tobytes())
    p.stdin.close(); p.wait()


def build(src, pub, plan):
    T = json.load(open(os.path.join(src, "track.json")))
    os.makedirs(pub, exist_ok=True)
    W, H = WIN
    cache = {}
    def warped(c):
        if c not in cache:
            M, *_ = transforms(T[c])
            out = []
            for i, img in enumerate(frames(os.path.join(src, c + ".MOV"))):
                if i >= len(M): break
                # where the aligned window runs past the source frame, fill with the clip's own backdrop (median of the top corners),
                # never a smeared edge; this is the dark studio backdrop the clinic shoots against
                wi = cv2.warpAffine(img, M[i], (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
                m = cv2.warpAffine(np.ones(img.shape[:2], np.float32), M[i], (W, H), flags=cv2.INTER_LINEAR, borderValue=0)
                if m.min() < 0.999:
                    lum = img.mean(2); dark = img[lum < np.percentile(lum, 30)]     # the dark backdrop's own colour
                    bg = np.median(dark, 0) if len(dark) else np.zeros(3)
                    m = cv2.GaussianBlur(cv2.erode(m, np.ones((9, 9), np.uint8)), (0, 0), 14)[..., None]
                    wi = (wi * m + bg * (1 - m)).clip(0, 255).astype(np.uint8)
                out.append(wi)
            cache[c] = out
        return cache[c]
    meta = {"win": list(WIN), "fps": FPS, "segments": {}}
    for name, seg in plan.items():
        if seg["kind"] == "solo":
            fr = warped(seg["clip"])[seg["f0"]:seg["f0"] + seg["n"]]
            write(os.path.join(pub, f"{name}.mp4"), fr)
            meta["segments"][name] = {"clip": seg["clip"], "f0": seg["f0"], "n": len(fr)}
        else:  # synced pair: before frames f0..f0+n, after frame of nearest yaw, monotonic
            b, a = seg["before"], seg["after"]
            yb = np.array([np.nan if v is None else v for v in T[b]["yaw"]]); ya = np.array([np.nan if v is None else v for v in T[a]["yaw"]])
            yb = np.interp(range(len(yb)), np.flatnonzero(~np.isnan(yb)), yb[~np.isnan(yb)]); ya = np.interp(range(len(ya)), np.flatnonzero(~np.isnan(ya)), ya[~np.isnan(ya)])
            yb, ya = smooth(yb[:, None], 9)[:, 0], smooth(ya[:, None], 9)[:, 0]
            j, m, err = 0, [], []
            for i in range(seg["f0"], seg["f0"] + seg["n"]):
                lo = j; cand = range(lo, min(len(ya), lo + 6))      # at most 5 after-frames per before-frame, never backwards
                j = min(cand, key=lambda k: abs(ya[k] - yb[i])); m.append(j); err.append(float(abs(ya[j] - yb[i])))
            # the after side holds a frame at most 2 frames in a row unless the yaw demands it: report repeats
            rep = max((sum(1 for _ in g) for _, g in __import__("itertools").groupby(m)), default=0)
            Bw, Aw = warped(b), warped(a)
            write(os.path.join(pub, f"{name}_before.mp4"), [Bw[i] for i in range(seg["f0"], seg["f0"] + seg["n"])])
            write(os.path.join(pub, f"{name}_after.mp4"), [Aw[k] for k in m])
            meta["segments"][name] = {"before": b, "after": a, "f0": seg["f0"], "n": seg["n"], "after_frames": m,
                                      "yaw_err_median": float(np.median(err)), "yaw_err_max": float(np.max(err)), "max_repeat": rep}
            print(name, "yaw err median", round(float(np.median(err)), 3), "max", round(float(np.max(err)), 3), "max repeat", rep, "after range", m[0], m[-1])
    json.dump(meta, open(os.path.join(pub, "bavideo.json"), "w"), indent=1)
    # poster stills for the face check
    for c in cache: cv2.imwrite(os.path.join(pub, f"_{c}_mid.jpg"), cache[c][len(cache[c]) // 2][:, :, ::-1])


if __name__ == "__main__":
    if sys.argv[1] == "track": track(sys.argv[2])
    else: build(sys.argv[2], sys.argv[3], json.loads(open(sys.argv[4]).read()))
