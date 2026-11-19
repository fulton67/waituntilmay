"""Jan 08 reel v3: do the surgeon's marks stay locked to her face? Measured on the rendered pixels (RULES tracking bounds:
median < 6 px, p95 < 15 px, max <= 15 px).

Inputs: the full render and the footage-only render (mode "footage", same frames), both 1080 x 1920, and the frame spans of the
photo beats ("His plan" 1649-1872, the result 1965-2097).
Per frame (fully faded in: span start + 9 .. end - 1):
  - the PHOTO's motion: ECC (affine) of the footage frame's photo panel (y < 1240) against the span's reference frame (its last
    fully-lit frame), on a 0.5x pyramid then refined at full size.
  - the MARKS: |full - footage| > 40 inside the photo panel (2x2 open), every mark pixel.
  - error = chamfer distance: each mark pixel of frame t mapped back through the photo's motion (ECC, footage only) onto the
    reference frame, and its distance to the nearest mark pixel of the reference (where every mark is drawn). Marks still drawing on
    are subsets of their final stroke, so a locked mark scores ~0 whatever its draw-on state. Per frame: the 99th percentile of its
    pixels (robust to single codec pixels); median / p95 / max are taken over those per-frame values.
So the error is how far the marks move relative to the skin under them, frame by frame.

  $PY -I research/ostad/style/jan08/track_v3.py <full.mp4> <footage.mp4> <out.json> --spans 1649:1872,1965:2097 [--off-full N] [--off-foot N]
  (--off-*: comp frame number of the file's first frame, when it is an excerpt rendered with --frames=N-M)
"""
import json
import subprocess
import sys

import cv2
import numpy as np

W, H, PH = 1080, 1920, 1240


def grab(path, a, b, off):
    vf = f"select=between(n\\,{a - off}\\,{b - off})"
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", vf, "-vsync", "0", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)


def markmask(full, foot):
    d = (np.abs(full.astype(np.int16) - foot.astype(np.int16)).max(2) > 40).astype(np.uint8)[:PH]
    return cv2.morphologyEx(d, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))


def ecc(ref, cur):
    g = lambda im: cv2.GaussianBlur(cv2.cvtColor(im[:PH], cv2.COLOR_BGR2GRAY), (0, 0), 1.2).astype(np.float32)
    A = np.eye(2, 3, dtype=np.float32)
    crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 80, 1e-5)
    r2, c2 = cv2.resize(g(ref), None, fx=0.5, fy=0.5), cv2.resize(g(cur), None, fx=0.5, fy=0.5)
    _, A = cv2.findTransformECC(r2, c2, A, cv2.MOTION_AFFINE, crit, None, 5)
    A[:, 2] *= 2
    _, A = cv2.findTransformECC(g(ref), g(cur), A, cv2.MOTION_AFFINE, crit, None, 5)
    return A  # maps ref coords -> cur coords


def main():
    a = sys.argv[1:]
    full, foot, out = a[0], a[1], a[2]
    spans = [tuple(int(x) for x in s.split(":")) for s in a[a.index("--spans") + 1].split(",")]
    ofu = int(a[a.index("--off-full") + 1]) if "--off-full" in a else 0
    ofo = int(a[a.index("--off-foot") + 1]) if "--off-foot" in a else 0
    res, allerr = {"spans": []}, []
    for s, e in spans:
        s0, e0 = s + 9, e - 1
        F, G = grab(full, s0, e0, ofu), grab(foot, s0, e0, ofo)
        ref_i = len(F) - 1
        ref_m = markmask(F[ref_i], G[ref_i])
        dref = cv2.distanceTransform((1 - ref_m).astype(np.uint8), cv2.DIST_L2, 5)
        errs, per = [], []
        for i in range(len(F)):
            m = markmask(F[i], G[i])
            ys, xs = np.nonzero(m)
            if len(xs) < 30:
                continue
            A = ecc(G[ref_i], G[i])
            Ai = cv2.invertAffineTransform(A)
            bx = Ai[0, 0] * xs + Ai[0, 1] * ys + Ai[0, 2]
            by = Ai[1, 0] * xs + Ai[1, 1] * ys + Ai[1, 2]
            ok = (bx >= 0) & (bx < W - 1) & (by >= 0) & (by < PH - 1)
            d = dref[by[ok].round().astype(int), bx[ok].round().astype(int)]
            v = float(np.percentile(d, 99))
            errs.append(v)
            per.append({"frame": s0 + i, "mark_px": int(len(xs)), "p99": round(v, 2), "photo_shift_px": round(float(np.hypot(*A[:, 2])), 2)})
        ref_c = ref_m
        e_ = np.array(errs) if errs else np.zeros(1)
        allerr += errs
        res["spans"].append({"span": [s, e], "ref_frame": s0 + ref_i, "mark_px_in_ref": int(ref_c.sum()), "samples": len(errs),
                             "median": round(float(np.median(e_)), 2), "p95": round(float(np.percentile(e_, 95)), 2), "max": round(float(e_.max()), 2),
                             "max_photo_motion_px": max([p["photo_shift_px"] for p in per] or [0]), "worst_frames": sorted(per, key=lambda p: -p["p99"])[:5]})
    e_ = np.array(allerr) if allerr else np.zeros(1)
    res.update({"median": round(float(np.median(e_)), 2), "p95": round(float(np.percentile(e_, 95)), 2), "max": round(float(e_.max()), 2),
                "pass": bool(np.median(e_) < 6 and np.percentile(e_, 95) < 15 and e_.max() <= 15), "full": full, "footage": foot})
    json.dump(res, open(out, "w"), indent=1)
    print(json.dumps({k: res[k] for k in ("median", "p95", "max", "pass")}), [(x["span"], x["samples"], x["median"], x["p95"], x["max"], x["max_photo_motion_px"]) for x in res["spans"]])


if __name__ == "__main__":
    main()
