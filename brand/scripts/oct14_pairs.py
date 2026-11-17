"""Oct 14 injection reel: the before/after pair, aligned, and a measured change for each treated region. No improvement is invented.

  $PY -I brand/scripts/oct14_pairs.py pick [--before a,b] [--after a,b]   # choose the best-matching frames (seconds ranges)
  $PY -I brand/scripts/oct14_pairs.py measure naso,mario,...              # measure the candidate regions (his named targets)

BEFORE comes from the intro (4:44 PM) and AFTER from the 4:55 PM clip. Every step below is logged to pair.json / regions.json
(brand/edits/oct14-injection/, gitignored: her face). The committed summary goes to research/ostad/style/oct14/ARROWS.md.

pick
- Samples every 4th frame of each clip and runs MediaPipe Face Landmarker (IMAGE mode, with the facial transformation matrix) on each.
- Scores each before/after pairing on: pose difference (yaw, pitch, roll in degrees), sharpness (Laplacian variance, both frames),
  how frontal the pose is, and the similarity-alignment residual on the STABLE points (eye corners, nose bridge, nose tip, forehead).
  The lower face is left out of the fit, because the lower face is what treatment changes.
- The after frame is warped onto the before frame by that similarity transform (rotation, uniform scale, shift; never a stretch), so
  one ellipse fits both cards. Display frames keep their own colour. A gain-matched copy is used only for measuring.
measure
- For each region (an ellipse round the named point, sized to the face width): line depth is the mean black-top-hat response (a fold
  reads as a narrow dark ridge), and shadow is the mean luminance relative to the cheek, both on gain-matched grey.
- Noise floor: the same measures between two BEFORE frames 1-3 s apart (aligned the same way), on all regions.
- A region gets an arrow only if all three hold:
  (1) he names it as a target;
  (2) its line depth or shadow improves by more than 3 x the noise floor, in the improving direction;
  (3) the side-by-side crop (regions_sheet.jpg) shows it, checked by eye and logged.
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
BROLE, BFACE = "pre1", "left"  # before = IMG_3637 (16:42, before any injection): the intro has her turned ~30 deg toward him (DECISIONS 16)
STABLE = [33, 133, 362, 263, 168, 6, 197, 1, 10, 151, 9, 70, 300]
sys.path.insert(0, str(ROOT / "brand/scripts"))
from oct14_track import named  # noqa: E402

_lm = None


def lm():
    global _lm
    if _lm is None:
        o = mp.tasks.vision.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=MODEL), running_mode=mp.tasks.vision.RunningMode.IMAGE,
                                                  num_faces=2, output_facial_transformation_matrixes=True)
        _lm = mp.tasks.vision.FaceLandmarker.create_from_options(o)
    return _lm


def pose(M):
    R = np.array(M)[:3, :3]
    yaw = np.degrees(np.arctan2(-R[2, 0], np.hypot(R[0, 0], R[1, 0])))
    pitch = np.degrees(np.arctan2(R[2, 1], R[2, 2]))
    roll = np.degrees(np.arctan2(R[1, 0], R[0, 0]))
    return np.array([yaw, pitch, roll])


def detect(img, face="largest"):
    h, w = img.shape[:2]
    r = lm().detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB)))
    if not r.face_landmarks:
        return None
    c = [(np.array([[p.x * w, p.y * h] for p in f]), pose(r.facial_transformation_matrixes[i].data if hasattr(r.facial_transformation_matrixes[i], "data") else r.facial_transformation_matrixes[i]))
         for i, f in enumerate(r.face_landmarks)]
    # left / right = the patient's half of the frame: a face whose nose tip is on the other half is never taken (in a one-face
    # frame that face is the doctor's: the first pick took his face at intro 46 s)
    if face == "left":
        c = [q for q in c if q[0][1, 0] < w / 2]
        return min(c, key=lambda q: q[0][1, 0]) if c else None
    if face == "right":
        c = [q for q in c if q[0][1, 0] > w / 2]
        return max(c, key=lambda q: q[0][1, 0]) if c else None
    return max(c, key=lambda q: np.ptp(q[0][:, 0]) * np.ptp(q[0][:, 1]))


def frames(role, step=4, rng=None):
    cap = cv2.VideoCapture(str(PUB / f"{role}.mp4"))
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    a, b = (0, n) if rng is None else (int(rng[0] * 24), min(n, int(rng[1] * 24)))
    out = []
    for f in range(a, b, step):
        cap.set(cv2.CAP_PROP_POS_FRAMES, f)
        ok, img = cap.read()
        if ok:
            out.append((f, img))
    return out


def sharp(img, L):
    x0, y0 = L.min(0).astype(int)
    x1, y1 = L.max(0).astype(int)
    g = cv2.cvtColor(img[max(0, y0):y1, max(0, x0):x1], cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(g, cv2.CV_64F).var()) if g.size else 0.0


def sim(src, dst):
    M, _ = cv2.estimateAffinePartial2D(src[STABLE].astype(np.float32), dst[STABLE].astype(np.float32), method=cv2.LMEDS)
    pr = (np.c_[src[STABLE], np.ones(len(STABLE))] @ M.T)
    return M, float(np.sqrt(((pr - dst[STABLE]) ** 2).sum(1)).mean())


def pick(brng=None, arng=None, bface="largest", aface="largest"):
    B = [(f, i, detect(i, bface)) for f, i in frames(BROLE, 4, brng)]
    A = [(f, i, detect(i, aface)) for f, i in frames("after", 4, arng)]
    B = [(f, i, d, sharp(i, d[0])) for f, i, d in B if d is not None]
    A = [(f, i, d, sharp(i, d[0])) for f, i, d in A if d is not None]
    sb, sa = np.median([x[3] for x in B]), np.median([x[3] for x in A])
    best = None
    for fb, ib, db, shb in B:
        if shb < 0.8 * sb:
            continue
        for fa, ia, da, sha in A:
            if sha < 0.8 * sa:
                continue
            M, res = sim(da[0], db[0])
            dp = np.abs(db[1] - da[1])
            score = dp[0] + dp[1] + 0.5 * dp[2] + 0.5 * res + 0.3 * abs(db[1][0])
            if best is None or score < best[0]:
                best = (score, fb, fa, M, res, dp, ib, ia, db, da)
    if best is None:
        raise SystemExit("no usable frame pair (no frontal, sharp face in both clips)")
    score, fb, fa, M, res, dp, ib, ia, db, da = best
    h, w = ib.shape[:2]
    warped = cv2.warpAffine(ia, M, (w, h), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
    PUB.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(PUB / "before.jpg"), ib, [cv2.IMWRITE_JPEG_QUALITY, 95])
    cv2.imwrite(str(PUB / "after_aligned.jpg"), warped, [cv2.IMWRITE_JPEG_QUALITY, 95])
    La = np.c_[da[0], np.ones(len(da[0]))] @ M.T
    pts_b = {k: [round(float(v[0]), 1), round(float(v[1]), 1)] for k, v in named(db[0]).items()}
    pts_a = {k: [round(float(v[0]), 1), round(float(v[1]), 1)] for k, v in named(La).items()}
    face_w = float(np.ptp(db[0][:, 0]))
    out = {"before_role": BROLE, "before_frame": fb, "after_frame": fa, "before_s": round(fb / 24, 2), "after_s": round(fa / 24, 2), "score": round(float(score), 2),
           "pose_before": [round(float(x), 1) for x in db[1]], "pose_after": [round(float(x), 1) for x in da[1]], "pose_diff_deg": [round(float(x), 1) for x in dp],
           "align_residual_px": round(res, 2), "transform": M.tolist(), "face_width_px": round(face_w, 1), "w": w, "h": h, "pts_before": pts_b, "pts_after_aligned": pts_a,
           "face_box": [float(db[0][:, 0].min()), float(db[0][:, 1].min()), float(db[0][:, 0].max()), float(db[0][:, 1].max())]}
    (EDIT / "pair.json").write_text(json.dumps(out, indent=1))
    print({k: out[k] for k in ("before_s", "after_s", "pose_diff_deg", "align_residual_px", "face_width_px")})
    return out


def gain_match(a, b, mask):
    ga, gb = [cv2.cvtColor(x, cv2.COLOR_BGR2GRAY).astype(np.float32) for x in (a, b)]
    ma, sa, mb, sb = ga[mask].mean(), ga[mask].std(), gb[mask].mean(), gb[mask].std()
    return ga, (gb - mb) / max(sb, 1e-3) * sa + ma


def ridge(g, k):
    se = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    return cv2.morphologyEx(g, cv2.MORPH_BLACKHAT, se)


SIZE = {"naso": (0.07, 0.12), "mario": (0.07, 0.10), "lipU": (0.12, 0.05), "lipL": (0.12, 0.05), "lipCL": (0.05, 0.05), "lipCR": (0.05, 0.05), "chin": (0.12, 0.08),
        "jaw": (0.08, 0.08), "cheek": (0.10, 0.09), "malar": (0.09, 0.07), "under": (0.09, 0.05), "temple": (0.07, 0.10), "forehead": (0.22, 0.07),
        "glabella": (0.07, 0.06), "crow": (0.06, 0.07)}


def region_masks(pts, face_w, shape, keys):
    out = {}
    for k in keys:
        base = k[:-1] if k[-1] in "LR" and k[:-1] in SIZE else k
        rx, ry = SIZE[base]
        m = np.zeros(shape, np.uint8)
        x, y = pts[k]
        cv2.ellipse(m, (int(x), int(y)), (int(rx * face_w), int(ry * face_w)), 0, 0, 360, 1, -1)
        out[k] = (m.astype(bool), (rx * face_w, ry * face_w))
    return out


def metrics(gb, ga, masks, ref_mask, k):
    rb, ra = ridge(gb, k), ridge(ga, k)
    res = {}
    for name, (m, _) in masks.items():
        res[name] = {"ridge_before": float(rb[m].mean()), "ridge_after": float(ra[m].mean()),
                     "shadow_before": float(gb[m].mean() - gb[ref_mask].mean()), "shadow_after": float(ga[m].mean() - ga[ref_mask].mean())}
    return res


def measure(keys):
    P = json.loads((EDIT / "pair.json").read_text())
    b, a = cv2.imread(str(PUB / "before.jpg")), cv2.imread(str(PUB / "after_aligned.jpg"))
    fw = P["face_width_px"]
    allk = [k for k in P["pts_before"] if k in keys or k[:-1] in keys]
    masks = region_masks(P["pts_before"], fw, b.shape[:2], allk)
    face = np.zeros(b.shape[:2], bool)
    x0, y0, x1, y1 = map(int, P["face_box"])
    face[y0:y1, x0:x1] = True
    ref = region_masks(P["pts_before"], fw, b.shape[:2], ["forehead"])["forehead"][0]
    k = max(5, int(fw * 0.035) | 1)  # the ridge kernel: about a fold's width
    gb, ga = gain_match(b, a, face)
    m = metrics(gb, ga, masks, ref, k)
    # noise floor: two BEFORE frames 1-3 s apart, aligned the same way
    cap = cv2.VideoCapture(str(PUB / f"{BROLE}.mp4"))
    Lb = detect(b, BFACE)[0]
    noise = {n: [] for n in m}
    for off in (24, 48, 72, -24, -48):
        f2 = P["before_frame"] + off
        if f2 < 0:
            continue
        cap.set(cv2.CAP_PROP_POS_FRAMES, f2)
        ok, im2 = cap.read()
        d2 = detect(im2, BFACE) if ok else None
        if d2 is None:
            continue
        M, _ = sim(d2[0], Lb)
        w2 = cv2.warpAffine(im2, M, (b.shape[1], b.shape[0]), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
        g1, g2 = gain_match(b, w2, face)
        mm = metrics(g1, g2, masks, ref, k)
        for n in m:
            noise[n].append((abs(mm[n]["ridge_after"] - mm[n]["ridge_before"]), abs(mm[n]["shadow_after"] - mm[n]["shadow_before"])))
    out = {}
    for n, v in m.items():
        nz = np.array(noise[n]) if noise[n] else np.array([[0.0, 0.0]])
        nr, ns = float(nz[:, 0].max()), float(nz[:, 1].max())
        dr, ds = v["ridge_after"] - v["ridge_before"], v["shadow_after"] - v["shadow_before"]
        out[n] = {**{kk: round(x, 3) for kk, x in v.items()}, "ridge_change": round(dr, 3), "shadow_change": round(ds, 3), "noise_ridge": round(nr, 3), "noise_shadow": round(ns, 3),
                  "ridge_improves": bool(dr < -3 * max(nr, 0.05)), "shadow_improves": bool(ds > 3 * max(ns, 0.2)), "ellipse_px": [round(x, 1) for x in masks[n][1]]}
    (EDIT / "regions.json").write_text(json.dumps(out, indent=1))
    # side-by-side crops, one row per region, for the eye check
    rows = []
    for n, (mk, (rx, ry)) in masks.items():
        x, y = P["pts_before"][n]
        s = int(max(rx, ry) * 2.2)
        cb = b[max(0, int(y) - s):int(y) + s, max(0, int(x) - s):int(x) + s]
        ca = a[max(0, int(y) - s):int(y) + s, max(0, int(x) - s):int(x) + s]
        if cb.size == 0:
            continue
        cb, ca = cv2.resize(cb, (360, 360)), cv2.resize(ca, (360, 360))
        lab = np.full((360, 300, 3), 255, np.uint8)
        o = out[n]
        for i, t in enumerate([n, f"ridge {o['ridge_change']:+.2f} (noise {o['noise_ridge']:.2f})", f"shadow {o['shadow_change']:+.2f} (noise {o['noise_shadow']:.2f})",
                               "IMPROVES" if (o["ridge_improves"] or o["shadow_improves"]) else "no measured change"]):
            cv2.putText(lab, t, (10, 40 + 40 * i), 0, 0.6, (0, 0, 0), 2)
        rows.append(np.hstack([cb, ca, lab]))
    if rows:
        cv2.imwrite(str(EDIT / "regions_sheet.jpg"), np.vstack(rows))
    for n, o in out.items():
        print(f"{n:10s} ridge {o['ridge_change']:+.3f} (noise {o['noise_ridge']:.3f})  shadow {o['shadow_change']:+.3f} (noise {o['noise_shadow']:.3f})  -> {'IMPROVES' if o['ridge_improves'] or o['shadow_improves'] else '-'}")
    return out


if __name__ == "__main__":
    cmd = sys.argv[1]
    arg = lambda k: [float(x) for x in sys.argv[sys.argv.index(k) + 1].split(",")] if k in sys.argv else None
    if cmd == "pick":
        opt = lambda k: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else "largest"
        pick(arg("--before"), arg("--after"), opt("--bface"), opt("--aface"))
    else:
        measure(sys.argv[2].split(","))
