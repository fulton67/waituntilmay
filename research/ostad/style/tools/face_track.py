"""Head tracking for a talking-head clip: MediaPipe Face Landmarker (478 landmarks + facial transformation matrix) on
every frame, One Euro smoothing (tuned on the clip itself), compact + full exports, measurements, contact sheet.

Run with the style venv, isolated:
  C:/Users/naimj/tools/style-venv/Scripts/python.exe -I research/ostad/style/tools/face_track.py \
      --video brand/edits/exomind-skin/exomind-skin_cut.mp4 --out research/ostad/style/exomind \
      --matte brand/edits/exomind-skin/matte_pha_cut.mp4

Outputs (in --out):
  track.json         compact, committed: per source frame pose + face box + head box + named landmarks (smoothed, 0.1 px)
  track_full.json.gz every landmark, raw and smoothed (gitignored: large)
  track_stats.json   the tuning grid and the measurements (committed)
  track_check.jpg    landmarks drawn on 12 frames (gitignored: his face)

Coordinates are source pixels (x right, y down) of the video. L/R in names = the viewer's left/right (image side).
"""
import argparse, gzip, json, math, os, sys, time
import numpy as np
import cv2

MODEL = "C:/Users/naimj/tools/models/face_landmarker.task"

# MediaPipe Face Mesh indices. L/R = image side (viewer's left/right), not the subject's.
NAMED = {
    "foreheadTop": 10,   # top of the mesh (upper forehead, below the hairline)
    "forehead": 151,     # forehead centre
    "glabella": 9,       # between the brows
    "nasion": 168,       # bridge of the nose between the eyes
    "templeL": 162, "templeR": 389,
    "cheekL": 50, "cheekR": 280,
    "noseTip": 1,
    "chin": 152,
    "eyeL": 468, "eyeR": 473,            # iris centres
    "eyeOuterL": 33, "eyeOuterR": 263,
    "browL": 105, "browR": 334,
    "mouthL": 61, "mouthR": 291,
    "lipTop": 13, "lipBottom": 14,
    "jawL": 172, "jawR": 397,
    "earL": 234, "earR": 454,            # face-oval edge at ear level
}


class OneEuro:
    """Casiez et al. 2012, vectorised. x in px, t in s."""

    def __init__(self, min_cutoff, beta, d_cutoff=1.0):
        self.mc, self.beta, self.dc = min_cutoff, beta, d_cutoff
        self.x = self.dx = self.t = None

    @staticmethod
    def _a(cutoff, te):
        tau = 1.0 / (2 * math.pi * cutoff)
        return 1.0 / (1.0 + tau / te)

    def reset(self):
        self.x = self.dx = self.t = None

    def __call__(self, x, t):
        if self.x is None:
            self.x, self.dx, self.t = x.copy(), np.zeros_like(x), t
            return self.x.copy()
        te = t - self.t
        self.t = t
        dx = (x - self.x) / te
        ad = self._a(self.dc, te)
        self.dx = ad * dx + (1 - ad) * self.dx
        cutoff = self.mc + self.beta * np.abs(self.dx)
        a = 1.0 / (1.0 + (1.0 / (2 * math.pi * cutoff)) / te)
        self.x = a * x + (1 - a) * self.x
        return self.x.copy()


def euler_from_matrix(m):
    """degrees; raw MediaPipe canonical-face convention, signs fixed later against image geometry"""
    R = np.asarray(m)[:3, :3]
    pitch = math.degrees(math.atan2(R[2, 1], R[2, 2]))
    yaw = math.degrees(math.asin(max(-1.0, min(1.0, -R[2, 0]))))
    roll = math.degrees(math.atan2(R[1, 0], R[0, 0]))
    return yaw, pitch, roll


def detect(video):
    import mediapipe as mp
    BaseOptions = mp.tasks.BaseOptions
    V = mp.tasks.vision
    opts = V.FaceLandmarkerOptions(base_options=BaseOptions(model_asset_path=MODEL), running_mode=V.RunningMode.VIDEO,
                                   num_faces=1, output_facial_transformation_matrixes=True,
                                   min_face_detection_confidence=0.5, min_face_presence_confidence=0.5, min_tracking_confidence=0.5)
    cap = cv2.VideoCapture(video)
    fps = cap.get(cv2.CAP_PROP_FPS)
    W, H = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    lms, poses = [], []
    t0 = time.time()
    with V.FaceLandmarker.create_from_options(opts) as lm:
        i = 0
        while True:
            ok, bgr = cap.read()
            if not ok:
                break
            img = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
            r = lm.detect_for_video(img, int(round(i * 1000 / fps)))
            if r.face_landmarks:
                p = np.array([[q.x * W, q.y * H, q.z * W] for q in r.face_landmarks[0]], dtype=np.float64)
                lms.append(p)
                poses.append(euler_from_matrix(r.facial_transformation_matrixes[0]) if r.facial_transformation_matrixes else (np.nan,) * 3)
            else:
                lms.append(None)
                poses.append((np.nan,) * 3)
            i += 1
            if i % 500 == 0:
                print(f"  {i} frames, {time.time() - t0:.0f} s", flush=True)
    cap.release()
    return fps, W, H, lms, np.array(poses)


def smooth(raw, fps, mc, beta, resets):
    """raw: (N, K) with NaN rows for misses; resets the filter after a miss and at the given frames"""
    f = OneEuro(mc, beta)
    out = np.full_like(raw, np.nan)
    for i in range(len(raw)):
        if np.isnan(raw[i, 0]) or i in resets:
            f.reset()
        if np.isnan(raw[i, 0]):
            continue
        out[i] = f(raw[i], i / fps)
    return out


def centred_ref(raw, sigma=1.5):
    """zero-lag offline reference: gaussian over time (sigma in frames), per contiguous run"""
    out = np.full_like(raw, np.nan)
    k = np.arange(-4, 5)
    w = np.exp(-0.5 * (k / sigma) ** 2)
    N = len(raw)
    for i in range(N):
        if np.isnan(raw[i, 0]):
            continue
        acc = np.zeros(raw.shape[1]); ws = 0.0
        for kk, ww in zip(k, w):
            j = i + kk
            if 0 <= j < N and not np.isnan(raw[j, 0]):
                acc += ww * raw[j]; ws += ww
        out[i] = acc / ws
    return out


def pt_err(a, b):
    """per frame, per point euclidean distance; a, b: (N, 2K)"""
    d = (a - b).reshape(len(a), -1, 2)
    return np.sqrt((d ** 2).sum(-1))


def metrics(raw, sm, ref, static, fast, fps):
    ok = ~np.isnan(sm[:, 0])
    e_raw = pt_err(sm[ok], raw[ok])
    e_ref = pt_err(sm[ok], ref[ok])
    # jitter: frame-to-frame motion on the static stretch (px/frame), per point
    s = np.array(static)
    jit_s = pt_err(sm[s[1:]], sm[s[:-1]]); jit_r = pt_err(raw[s[1:]], raw[s[:-1]])
    # high-frequency jitter: second difference (px/frame^2), blind to the slow real motion left in a "static" stretch
    acc_s = pt_err(sm[s[2:]] - sm[s[1:-1]], sm[s[1:-1]] - sm[s[:-2]]); acc_r = pt_err(raw[s[2:]] - raw[s[1:-1]], raw[s[1:-1]] - raw[s[:-2]])
    # lag on fast moves: shift (frames) that best aligns smoothed to raw on the fast windows; and error there
    best = None
    for lag in np.arange(0, 6.01, 0.25):
        errs = []
        for i in fast:
            j = i - lag
            j0 = int(math.floor(j)); fr = j - j0
            if j0 < 0 or j0 + 1 >= len(raw) or np.isnan(raw[j0, 0]) or np.isnan(raw[j0 + 1, 0]) or np.isnan(sm[i, 0]):
                continue
            rr = raw[j0] * (1 - fr) + raw[j0 + 1] * fr
            errs.append(np.median(pt_err(sm[i:i + 1], rr[None])))
        m = float(np.mean(errs)) if errs else np.inf
        if best is None or m < best[1]:
            best = (lag, m)
    e_fast = pt_err(sm[fast], raw[fast])
    e_fast_ref = pt_err(sm[fast], ref[fast])
    return {
        "err_vs_raw_px": {"median": float(np.median(e_raw)), "p95": float(np.percentile(e_raw, 95))},
        "err_vs_zero_lag_ref_px": {"median": float(np.median(e_ref)), "p95": float(np.percentile(e_ref, 95))},
        "static_jitter_px_per_frame": {"smoothed_median": float(np.median(jit_s)), "smoothed_p95": float(np.percentile(jit_s, 95)),
                                        "raw_median": float(np.median(jit_r)), "raw_p95": float(np.percentile(jit_r, 95))},
        "static_accel_jitter_px_per_frame2": {"smoothed_median": float(np.median(acc_s)), "smoothed_p95": float(np.percentile(acc_s, 95)),
                                              "raw_median": float(np.median(acc_r)), "raw_p95": float(np.percentile(acc_r, 95))},
        "fast_moves": {"lag_frames": float(best[0]), "lag_ms": float(best[0] * 1000 / fps),
                        "err_vs_raw_px_median": float(np.median(e_fast)), "err_vs_raw_px_p95": float(np.percentile(e_fast, 95)),
                        "err_vs_zero_lag_ref_px_median": float(np.median(e_fast_ref)), "err_vs_zero_lag_ref_px_p95": float(np.percentile(e_fast_ref, 95))},
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--matte", default=None, help="alpha matte of the same clip, to calibrate the top-of-head estimate")
    ap.add_argument("--cache", default=None, help="npz cache of the raw detection")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    cache = a.cache or os.path.join(a.out, "_raw_cache.npz")
    if os.path.exists(cache):
        z = np.load(cache, allow_pickle=True)
        fps, W, H = float(z["fps"]), int(z["W"]), int(z["H"])
        L = z["L"]; poses = z["poses"]
        print("raw detection from cache", cache)
    else:
        print("detecting", a.video)
        fps, W, H, lms, poses = detect(a.video)
        L = np.full((len(lms), 478, 3), np.nan)
        for i, p in enumerate(lms):
            if p is not None:
                L[i] = p
        np.savez_compressed(cache, fps=fps, W=W, H=H, L=L, poses=poses)
    N = len(L)
    det = ~np.isnan(L[:, 0, 0])
    print(f"{N} frames, {W}x{H} @ {fps} fps, face in {det.sum()} ({100 * det.mean():.2f} %)")

    # pose sign convention against image geometry: yaw + = face turned to image right, pitch + = chin up, roll + = clockwise on screen
    xy = L[:, :, :2]
    nose, eL, eR, chin = xy[:, 1], xy[:, NAMED["earL"]], xy[:, NAMED["earR"]], xy[:, 152]
    yaw_geo = (nose[:, 0] - (eL[:, 0] + eR[:, 0]) / 2) / np.abs(eR[:, 0] - eL[:, 0])
    ir_l, ir_r = xy[:, 468], xy[:, 473]
    roll_geo = np.degrees(np.arctan2(ir_r[:, 1] - ir_l[:, 1], ir_r[:, 0] - ir_l[:, 0]))
    mideye = (ir_l + ir_r) / 2
    pitch_geo = -((nose[:, 1] - mideye[:, 1]) / (chin[:, 1] - mideye[:, 1]))  # nose higher in the face = chin up
    sign = {}
    for k, geo, col in (("yaw", yaw_geo, 0), ("pitch", pitch_geo, 1), ("roll", roll_geo, 2)):
        m = det & ~np.isnan(poses[:, col])
        c = np.corrcoef(geo[m], poses[m, col])[0, 1]
        sign[k] = 1.0 if c >= 0 else -1.0
        print(f"  {k}: corr with image geometry {c:+.2f} -> sign {sign[k]:+.0f}")
    P = poses * np.array([sign["yaw"], sign["pitch"], sign["roll"]])

    # top of head: k such that headTop = foreheadTop + k * (foreheadTop - chin), calibrated on the matte's top edge
    k_head = 0.42
    calib = None
    if a.matte and os.path.exists(a.matte):
        cap = cv2.VideoCapture(a.matte)
        ks = []
        idx = [i for i in range(0, N, 25) if det[i]]
        for i in idx:
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ok, fr = cap.read()
            if not ok:
                continue
            al = fr[:, :, 1] > 128
            ft, ch = xy[i, 10], xy[i, 152]
            x0, x1 = int(max(0, ft[0] - 40)), int(min(W, ft[0] + 40))
            col = al[:, x0:x1].any(axis=1)
            rows = np.where(col[: int(ft[1])])[0]
            if len(rows) == 0:
                continue
            top = rows[0]
            # the top of the alpha above the forehead, along the face's up axis (approximated as vertical + roll ignored)
            ks.append((ft[1] - top) / (ch[1] - ft[1]))
        cap.release()
        if ks:
            ks = np.array(ks)
            k_head = float(np.median(ks))
            calib = {"frames": len(ks), "k_median": k_head, "k_p10": float(np.percentile(ks, 10)), "k_p90": float(np.percentile(ks, 90))}
            print(f"  head-top k from matte: median {k_head:.3f} (p10 {calib['k_p10']:.3f}, p90 {calib['k_p90']:.3f}, n {len(ks)})")

    # raw signal for smoothing: all 478 x,y + pose
    raw_xy = xy.reshape(N, -1).copy()
    raw_xy[~det] = np.nan

    # cut points: frames where the face jumps (the cut's one cross-dissolve) -> filter reset
    jump = np.zeros(N, bool)
    nz = np.where(det)[0]
    for i0, i1 in zip(nz[:-1], nz[1:]):
        if i1 == i0 + 1 and np.linalg.norm(xy[i1, 1] - xy[i0, 1]) > 40:
            jump[i1] = True
    resets = set(np.where(jump)[0].tolist())
    print("  filter resets at jumps:", sorted(resets))

    # static stretch (lowest 1 s motion of the face) and fast moves (top 3 % speed of the zero-lag nose)
    named_idx = list(NAMED.values())
    sel = np.array([[2 * j, 2 * j + 1] for j in named_idx]).ravel()
    raw_n = raw_xy[:, sel]
    ref_n = centred_ref(raw_n)
    ref_nose = ref_n[:, 2 * named_idx.index(1):2 * named_idx.index(1) + 2]
    spd = np.full(N, np.nan)
    spd[1:] = np.linalg.norm(ref_nose[1:] - ref_nose[:-1], axis=1)
    win = int(round(fps))
    best = None
    for s in range(0, N - win):
        seg = spd[s + 1:s + win]
        if np.isnan(seg).any() or any(r in resets for r in range(s, s + win)):
            continue
        v = seg.sum()
        if best is None or v < best[1]:
            best = (s, v)
    static = list(range(best[0], best[0] + win))
    thr = np.nanpercentile(spd, 97)
    fast = [i for i in range(N) if not np.isnan(spd[i]) and spd[i] >= thr and i not in resets and not any(r in resets for r in range(i - 6, i + 1))]
    print(f"  static stretch frames {static[0]}-{static[-1]} ({static[0] / fps:.2f}-{static[-1] / fps:.2f} s), fast frames {len(fast)} (nose >= {thr:.1f} px/frame)")

    # tuning grid on the named landmarks
    grid = []
    for mc in (0.1, 0.2, 0.3, 0.5, 0.8, 1.0, 1.5, 2.0, 3.0):
        for beta in (0.0005, 0.001, 0.002, 0.004, 0.007, 0.01, 0.02, 0.03, 0.05, 0.1):
            sm = smooth(raw_n, fps, mc, beta, resets)
            m = metrics(raw_n, sm, ref_n, static, fast, fps)
            grid.append({"min_cutoff": mc, "beta": beta, **m})
    # pick: the lowest static jitter whose error vs the zero-lag reference has median < 3 px and p95 < 7.5 px on the whole clip
    # and p95 < 10 px on fast moves (half the overlay budget: tip-to-landmark median < 6 px, p95 < 15 px, leaves room for the
    # layer transform and rounding)
    def ok(g):
        return g["err_vs_zero_lag_ref_px"]["median"] < 3 and g["err_vs_zero_lag_ref_px"]["p95"] < 7.5 and g["fast_moves"]["err_vs_zero_lag_ref_px_p95"] < 10
    cands = [g for g in grid if ok(g)] or grid
    pick = min(cands, key=lambda g: (round(g["static_accel_jitter_px_per_frame2"]["smoothed_median"], 3), g["fast_moves"]["lag_frames"]))
    MC, BETA = pick["min_cutoff"], pick["beta"]
    print(f"  pick min_cutoff {MC}, beta {BETA}: {json.dumps({k: pick[k] for k in pick if k not in ('min_cutoff', 'beta')})}")

    sm_xy = smooth(raw_xy, fps, MC, BETA, resets)
    P_sm = smooth(np.where(det[:, None], P, np.nan), fps, MC, BETA, resets)  # pose: same filter, units deg

    # compact export
    names = list(NAMED.keys()) + ["headTop"]
    frames = []
    for i in range(N):
        if not det[i]:
            frames.append(None)
            continue
        q = sm_xy[i].reshape(478, 2)
        ft, ch = q[10], q[152]
        ht = ft + k_head * (ft - ch)
        x0, y0 = q[:, 0].min(), q[:, 1].min()
        x1, y1 = q[:, 0].max(), q[:, 1].max()
        hx0, hy0, hx1, hy1 = min(x0, ht[0]), min(y0, ht[1]), max(x1, ht[0]), max(y1, ht[1])
        pts = [q[j] for j in NAMED.values()] + [ht]
        row = [round(float(v), 2) for v in P_sm[i]] + [round(float(v), 1) for v in (x0, y0, x1 - x0, y1 - y0)] + \
              [round(float(v), 1) for v in (hx0, hy0, hx1 - hx0, hy1 - hy0)] + [round(float(c), 1) for p in pts for c in p]
        frames.append(row)
    compact = {
        "_about": "Head track of Ostad's ExoMind cut (research/ostad/style/tools/face_track.py). MediaPipe Face Landmarker (478 landmarks, "
                  "facial transformation matrix), One Euro smoothed. Coordinates: source pixels of the video, x right, y down. "
                  "L/R = viewer's (image) left/right. Pose in degrees: yaw + = face turned toward image right, pitch + = chin up, "
                  "roll + = clockwise on screen. headTop = foreheadTop + k * (foreheadTop - chin), k calibrated on the alpha matte.",
        "video": a.video.replace("\\", "/"),
        "fps": fps, "width": W, "height": H, "frames_total": N,
        "coverage": round(float(det.mean()), 5),
        "one_euro": {"min_cutoff": MC, "beta": BETA, "d_cutoff": 1.0, "units": "px and s; pose deg", "resets_at": sorted(int(r) for r in resets)},
        "head_top_k": round(k_head, 4),
        "row": ["yaw", "pitch", "roll", "faceX", "faceY", "faceW", "faceH", "headX", "headY", "headW", "headH"] + [f"{n}.{c}" for n in names for c in "xy"],
        "names": names,
        "landmark_index": {**NAMED, "headTop": None},
        "frames": frames,
    }
    with open(os.path.join(a.out, "track.json"), "w") as fh:
        json.dump(compact, fh, separators=(",", ":"))
    full = {"fps": fps, "width": W, "height": H, "one_euro": compact["one_euro"],
            "raw": [None if not det[i] else np.round(L[i], 2).tolist() for i in range(N)],
            "smoothed_xy": [None if not det[i] else np.round(sm_xy[i].reshape(478, 2), 2).tolist() for i in range(N)],
            "pose_raw": [None if not det[i] else np.round(P[i], 3).tolist() for i in range(N)]}
    with gzip.open(os.path.join(a.out, "track_full.json.gz"), "wt") as fh:
        json.dump(full, fh, separators=(",", ":"))

    # measurements on the final filter (named points), short side = 1080 so px are already at the 1080 short side
    fin = metrics(raw_n, sm_xy[:, sel], ref_n, static, fast, fps)
    # per landmark name, error vs raw
    per = {}
    e = pt_err(sm_xy[det][:, sel], raw_n[det])
    for j, n in enumerate(NAMED):
        per[n] = {"median": round(float(np.median(e[:, j])), 2), "p95": round(float(np.percentile(e[:, j], 95)), 2)}
    stats = {"video": compact["video"], "fps": fps, "width": W, "height": H, "frames": N, "detected": int(det.sum()),
             "coverage_pct": round(100 * float(det.mean()), 3), "short_side_px": min(W, H),
             "pose_sign_corr": sign, "head_top_calibration": calib, "resets": sorted(int(r) for r in resets),
             "static_stretch": {"frames": [static[0], static[-1]], "s": [round(static[0] / fps, 3), round(static[-1] / fps, 3)]},
             "fast_moves": {"frames": len(fast), "nose_speed_threshold_px_per_frame": round(float(thr), 2)},
             "pick_rule": "lowest static second-difference jitter with error vs zero-lag (centred gaussian sigma 1.5 f) reference median < 3 px, p95 < 7.5 px, fast-move p95 < 10 px",
             "one_euro": {"min_cutoff": MC, "beta": BETA, "d_cutoff": 1.0},
             "final": fin, "per_landmark_err_vs_raw_px": per,
             "grid": [{k: g[k] for k in ("min_cutoff", "beta")} | {"jit": round(g["static_jitter_px_per_frame"]["smoothed_median"], 3), "acc": round(g["static_accel_jitter_px_per_frame2"]["smoothed_median"], 3),
                      "lag_f": g["fast_moves"]["lag_frames"], "raw_med": round(g["err_vs_raw_px"]["median"], 2), "raw_p95": round(g["err_vs_raw_px"]["p95"], 2),
                      "ref_med": round(g["err_vs_zero_lag_ref_px"]["median"], 2), "ref_p95": round(g["err_vs_zero_lag_ref_px"]["p95"], 2),
                      "fast_ref_p95": round(g["fast_moves"]["err_vs_zero_lag_ref_px_p95"], 2)} for g in grid]}
    with open(os.path.join(a.out, "track_stats.json"), "w") as fh:
        json.dump(stats, fh, indent=1)
    print(json.dumps(fin, indent=1))

    # contact sheet: 12 frames, raw mesh (grey dots), smoothed named points (blue), face box (green), head box (orange)
    cap = cv2.VideoCapture(a.video)
    picks = np.linspace(5, N - 6, 12).astype(int).tolist()
    picks[3] = fast[len(fast) // 2] if fast else picks[3]
    picks[7] = static[win // 2]
    tiles = []
    for i in sorted(picks):
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ok_, fr = cap.read()
        if not ok_:
            continue
        if det[i]:
            for p in L[i, :, :2]:
                cv2.circle(fr, (int(p[0]), int(p[1])), 1, (200, 200, 200), -1)
            row = frames[i]
            fx, fy, fw, fh = row[3:7]; hx, hy, hw, hh = row[7:11]
            cv2.rectangle(fr, (int(fx), int(fy)), (int(fx + fw), int(fy + fh)), (80, 200, 80), 2)
            cv2.rectangle(fr, (int(hx), int(hy)), (int(hx + hw), int(hy + hh)), (0, 150, 255), 2)
            pts = row[11:]
            for j in range(len(names)):
                x, y = pts[2 * j], pts[2 * j + 1]
                cv2.circle(fr, (int(x), int(y)), 6, (255, 120, 30), -1)
                cv2.circle(fr, (int(x), int(y)), 6, (255, 255, 255), 1)
            yaw, pitch, roll = row[:3]
            label = f"f{i} {i / fps:.2f}s yaw {yaw:+.0f} pitch {pitch:+.0f} roll {roll:+.0f}"
        else:
            label = f"f{i} {i / fps:.2f}s NO FACE"
        crop = fr[200:1400, :]
        crop = cv2.resize(crop, (540, 600))
        cv2.putText(crop, label, (8, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 3)
        cv2.putText(crop, label, (8, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)
        tiles.append(crop)
    cap.release()
    while len(tiles) % 4:
        tiles.append(np.zeros_like(tiles[0]))
    sheet = np.vstack([np.hstack(tiles[r * 4:(r + 1) * 4]) for r in range(len(tiles) // 4)])
    cv2.imwrite(os.path.join(a.out, "track_check.jpg"), sheet, [cv2.IMWRITE_JPEG_QUALITY, 85])
    print("wrote", a.out)


if __name__ == "__main__":
    main()
