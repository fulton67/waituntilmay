"""Calibration (brief step 1): run M4-M6 on three synthetic clips with known motion and M12 on a synthetic element with a known
cubic-bezier; record measured vs known in measure/_calibration/calibration.json (and MEASURE_COVERAGE.md via verify_measure.py).
A tool that misses the known value by more than 10% must be fixed before it touches the corpus.

Clips are 1080x1920 @ 30 fps, 3 s, built from a real textured frame (the GLP-1 reference, centre crop) so the trackers see natural
texture:  static (no motion) | push (scale 1.00 -> 1.02 linearly over frames 15-75 = 2 s, then hold) | pan (30 px right over frames
15-45 = 1 s, then hold). The element: a 300x120 card rising 400 px over 12 frames on cubic-bezier(0.22, 1, 0.36, 1).
"""
import json
import os
import subprocess
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from common import MEASURE, MEDIA, save_json  # noqa: E402
import camera_phasecorr, camera_ecc, camera_classify, easing_fit  # noqa: E402,F401

W, H, FPS, N = 1080, 1920, 30, 90
D = os.path.join(MEASURE, "_calibration")


def base_texture():
    src = os.path.join(MEDIA, "yt", "glp1.mp4")
    cap = cv2.VideoCapture(src); cap.set(cv2.CAP_PROP_POS_FRAMES, 200); ok, f = cap.read(); cap.release()
    if not ok:
        rng = np.random.default_rng(1); f = (rng.random((1080, 1920, 3)) * 255).astype(np.uint8); f = cv2.GaussianBlur(f, (0, 0), 3)
    f = cv2.cvtColor(f, cv2.COLOR_BGR2RGB)
    h, w = f.shape[:2]
    # crop a 9:16 band and upscale with margin so warps never show edges
    cw = int(h * 9 / 16); x0 = (w - cw) // 2
    crop = f[:, x0:x0 + cw]
    return cv2.resize(crop, (int(W * 1.1), int(H * 1.1)), interpolation=cv2.INTER_CUBIC)


def write_clip(name, warp_for):
    tex = base_texture(); th, tw = tex.shape[:2]
    p = os.path.join(D, f"{name}.mp4"); os.makedirs(D, exist_ok=True)
    pr = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-c:v", "libx264", "-crf", "12", "-pix_fmt", "yuv420p", p], stdin=subprocess.PIPE)
    for i in range(N):
        s, tx = warp_for(i)
        # scale about the frame centre, then shift; output window is the centre W x H of the texture
        M = np.array([[s, 0, (1 - s) * tw / 2 + tx - (tw - W) / 2], [0, s, (1 - s) * th / 2 - (th - H) / 2]], np.float32)
        pr.stdin.write(cv2.warpAffine(tex, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT).tobytes())
    pr.stdin.close(); pr.wait()
    return p


def lerp(i, a, b, v0, v1):
    return v0 if i <= a else v1 if i >= b else v0 + (v1 - v0) * (i - a) / (b - a)


def run_camera(name, path):
    P = {"width": W, "height": H, "fps": FPS, "frame_count": N}
    pc = camera_phasecorr.m4("_cal", name, path, P)
    import common
    common_cuts = common.cuts_frames
    common.cuts_frames = lambda r, v: []
    camera_ecc.cuts_frames = lambda r, v: []
    ecc = camera_ecc.m5("_cal", name, path, P)
    common.cuts_frames = common_cuts
    cls, sr, tr = camera_classify.classify(pc["rows"], ecc["rows"], W, FPS, [], N)
    # recovered totals
    pan_px = float(sum(r[0] for r in pc["rows"][1:]))
    win = ecc["window_frames"]
    cum = camera_classify.cum_scale(ecc["rows"], 0, N, win)
    lk_rows = [({"lk": r["lk"]} if (r and r.get("lk")) else r) for r in ecc["rows"]]
    lkcum = camera_classify.cum_scale(lk_rows, 0, N, win)
    share = {c: round(cls.count(c) / N, 3) for c in sorted(set(cls))}
    return {"pc_total_dx_px": round(pan_px, 2), "ecc_cum_scale": round(cum, 5), "lk_cum_scale": round(lkcum, 5), "classes": share}


def bezier_y(t, x1, y1, x2, y2):
    # solve x(u)=t, return y(u)
    lo, hi = 0.0, 1.0
    for _ in range(60):
        u = (lo + hi) / 2
        x = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u ** 2 * x2 + u ** 3
        lo, hi = (u, hi) if x < t else (lo, u)
    u = (lo + hi) / 2
    return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u ** 2 * y2 + u ** 3


def element_calibration():
    known = (0.22, 1.0, 0.36, 1.0)
    frames_n, rise = 12, 400.0
    ys = []
    for i in range(frames_n + 8):
        t = min(1.0, i / frames_n)
        ys.append(1400 - rise * bezier_y(t, *known))
    # render + detect by threshold so the fitter sees a measured (integer-pixel) trajectory
    meas = []
    for y in ys:
        img = np.full((H, W), 90, np.uint8)
        cv2.rectangle(img, (390, int(round(y))), (690, int(round(y)) + 120), 245, -1)
        rows = np.where((img > 200).any(1))[0]
        meas.append(float(rows[0]))
    fit = easing_fit.fit_track(np.array(meas, float))
    # ground truth under the SAME definitions, from the analytic (float) trajectory
    p_true = easing_fit.progress(np.array(ys, float))
    known_settle = easing_fit.settle_index(p_true)
    tt = np.linspace(0, 1, 101)
    # compare curves in absolute frame time: fitted bezier spans fit["frames_to_settle"]; the true curve spans 12 frames
    fr = tt * frames_n
    true_curve = easing_fit.bez_y_of_t(tt, *known)
    fit_curve = easing_fit.bez_y_of_t(np.clip(fr / max(1, fit["frames_to_settle"]), 0, 1), *fit["bezier"])
    fit["curve_max_err"] = round(float(np.max(np.abs(fit_curve - true_curve))), 4)
    return {"known_bezier": known, "known_frames_to_settle": known_settle, "known_overshoot_pct": 0.0, "fit": fit}


def main():
    clips = {
        "static": lambda i: (1.0, 0.0),
        "push": lambda i: (lerp(i, 15, 75, 1.0, 1.02), 0.0),
        "pan": lambda i: (1.0, lerp(i, 15, 45, 0.0, 30.0)),
    }
    res = {}
    for name, fn in clips.items():
        res[name] = run_camera(name, write_clip(name, fn))
    res["element"] = element_calibration()
    known = {"static": {"scale": 1.0, "pan_px": 0.0}, "push": {"scale": 1.02, "pan_px": 0.0}, "pan": {"scale": 1.0, "pan_px": 30.0}}
    checks = []
    def chk(label, measured, truth, tol_abs=None):
        if tol_abs is not None:
            ok = abs(measured - truth) <= tol_abs; err = abs(measured - truth)
        else:
            ok = abs(measured - truth) <= 0.1 * abs(truth); err = abs(measured - truth) / abs(truth)
        checks.append({"check": label, "measured": measured, "known": truth, "err": round(err, 4), "ok": bool(ok)})
    chk("push: ECC cumulative zoom (%)", round((res["push"]["ecc_cum_scale"] - 1) * 100, 3), 2.0)
    chk("push: LK cumulative zoom (%)", round((res["push"]["lk_cum_scale"] - 1) * 100, 3), 2.0)
    chk("push: frames classed push (share of the 60 moving frames)", round(res["push"]["classes"].get("push", 0) * N / 60, 3), 1.0)
    chk("pan: phase-correlation total dx (px)", res["pan"]["pc_total_dx_px"], 30.0)
    chk("pan: frames classed pan or drift (share of the 30 moving frames)", round((res["pan"]["classes"].get("pan", 0) + res["pan"]["classes"].get("drift", 0)) * N / 30, 3), 1.0)
    chk("static: share classed static", res["static"]["classes"].get("static", 0), 1.0)
    chk("static: |ECC zoom| (%)", round(abs(res["static"]["ecc_cum_scale"] - 1) * 100, 3), 0.0, tol_abs=0.1)
    f = res["element"]["fit"]
    ks = res["element"]["known_frames_to_settle"]
    chk("element: frames to settle (1% band)", f["frames_to_settle"], ks, tol_abs=max(1.0, 0.1 * ks))
    chk("element: overshoot (%)", f["overshoot_pct"], 0.0, tol_abs=1.0)
    # control points of a cubic-bezier are not unique for a sampled curve; the curve itself is what must match (10% of travel)
    chk("element: fitted curve vs known curve, max error (share of travel)", f["curve_max_err"], 0.0, tol_abs=0.1)
    res["checks"] = checks; res["all_ok"] = all(c["ok"] for c in checks)
    save_json(os.path.join(D, "calibration.json"), res)
    for c in checks:
        print(("OK  " if c["ok"] else "FAIL"), c["check"], "measured", c["measured"], "known", c["known"])
    print("ALL_OK" if res["all_ok"] else "CALIBRATION FAILED")


if __name__ == "__main__":
    main()
