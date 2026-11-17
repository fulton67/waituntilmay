"""Under-eye filler reel v2: refine and check the measured entry points (undereye_sketch.py) against a second, independent mark in
the footage: the puncture itself (a small red dot left on the cheek after the cannula is withdrawn).

1. Prior from the shaft: the median of the registered shaft-end points of every sampled frame (the detector in undereye_sketch.py).
   (A densest-cluster version was tried first and rejected: on her right side it locked onto glove edges on the wrong cheek.)
2. Entry = the puncture itself: in frames after each side is done and her face is uncovered, the reddest compact blob (CIE a*,
   20-400 px) within 0.6 IOD of the prior, registered to the reference; the entry is the median of those; its error is their median
   distance to it (the mark is a footage fact; the shaft end is only a proxy).
3. Path: the shaft axes of the frames whose shaft end lies within 40 px of the entry, followed to the trough line; strokes = the
   10th / 50th / 90th percentile of where they reach it; path error = each axis's distance at the trough to the nearest stroke end.
Updates brand/edits/undereye-filler/sketch.json (entry, strokes re-anchored) and research/ostad/style/undereye/sketch_measure.json.
Run: C:/Users/naimj/tools/style-venv/Scripts/python.exe -I brand/scripts/undereye_entry_check.py
"""
import json, sys
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "brand/scripts"))
import undereye_sketch as S  # noqa: E402

PUNCTURE = {"R_patient": (136.0, 170.0), "L_patient": (244.0, 262.0)}  # her face uncovered after each side


def mode(P, bw=12.0):
    c = np.median(P, axis=0)
    best = None
    for start in P:
        m = start.copy()
        for _ in range(30):
            near = P[np.linalg.norm(P - m, axis=1) < bw]
            if len(near) == 0:
                break
            nm = near.mean(axis=0)
            if np.linalg.norm(nm - m) < 0.1:
                break
            m = nm
        n = int((np.linalg.norm(P - m, axis=1) < bw).sum())
        if best is None or n > best[0]:
            best = (n, m)
    return best[1], best[0], c


def main():
    cap = cv2.VideoCapture(str(S.PUB / "6815.mp4"))
    cap.set(cv2.CAP_PROP_POS_MSEC, 1000)
    _, ref = cap.read()
    R = S.lms(ref)
    iodR = float(np.linalg.norm(R[468] - R[473]))
    sk = json.loads((S.EDIT / "sketch.json").read_text(encoding="utf-8"))
    meas = json.loads(S.OUTM.read_text(encoding="utf-8"))
    v = cv2.VideoCapture(str(S.PUB / "6817.mp4"))
    fps = v.get(cv2.CAP_PROP_FPS)
    for key, (side, t0, t1) in S.SPANS.items():
        E, D = [], []
        for t in np.arange(t0, t1, 0.25):
            v.set(cv2.CAP_PROP_POS_FRAMES, int(t * fps))
            ok, img = v.read()
            if not ok:
                continue
            L = S.lms(img)
            if L is None:
                continue
            s = S.shaft(img, L, side)
            if s is None:
                continue
            M = S.sim(L[S.STABLE], R[S.STABLE])
            E.append(S.ap(M, s["entry"]))
            d = M[:, :2] @ s["dir"]
            D.append(d / np.linalg.norm(d))
        E, D = np.array(E), np.array(D)
        prior = np.median(E, axis=0)
        ent = prior
        hits = []
        for t in np.arange(*PUNCTURE[key], 0.5):
            v.set(cv2.CAP_PROP_POS_FRAMES, int(t * fps))
            ok, img = v.read()
            if not ok:
                continue
            L = S.lms(img)
            if L is None:
                continue
            M = S.sim(L[S.STABLE], R[S.STABLE])
            ce = S.ap(cv2.invertAffineTransform(M), prior)
            r = int(0.6 * np.linalg.norm(L[468] - L[473]))
            x0, y0 = int(max(0, ce[0] - r)), int(max(0, ce[1] - r))
            crop = img[y0:int(ce[1] + r), x0:int(ce[0] + r)]
            if crop.size == 0:
                continue
            a = cv2.cvtColor(crop, cv2.COLOR_BGR2LAB)[..., 1].astype(float)
            n_, lab, st, cen = cv2.connectedComponentsWithStats((a >= np.percentile(a, 99.3)).astype(np.uint8))
            cand = [(a[lab == i].mean(), cen[i]) for i in range(1, n_) if 20 <= st[i, cv2.CC_STAT_AREA] <= 400]
            if cand:
                _, c = max(cand, key=lambda z: z[0])
                hits.append(S.ap(M, np.array([c[0] + x0, c[1] + y0])))
        H = np.array(hits)
        if len(H) >= 5:
            ent = np.median(H, axis=0)
            err = np.linalg.norm(H - ent, axis=1)
            method = "the puncture mark (median of the registered red-dot detections)"
        else:
            err = np.linalg.norm(E - ent, axis=1)
            method = "median of the registered shaft ends (puncture not found in enough frames)"
        agree = np.linalg.norm(E - ent, axis=1) < 40
        tr = S.trough(R, side, iodR)
        ends = [S.ray_poly(ent, d, tr) for d, k in zip(D, agree) if k]
        ends = np.array([q for q in ends if q is not None])
        sd = sk["sides"][key]
        sd["entry"] = ent.round(1).tolist()
        if len(ends) >= 3:
            o = np.argsort(ends[:, 0])
            pick = [ends[o[int(q * (len(o) - 1))]] for q in (0.1, 0.5, 0.9)]
            perr = [min(np.linalg.norm(q - pk) for pk in pick) for q in ends]
            sd["strokes"] = [[ent.round(1).tolist(), pk.round(1).tolist()] for pk in pick]
        else:
            perr = []
            sd["strokes"] = [[ent.round(1).tolist(), st_[1]] for st_ in sd["strokes"]]
        m = meas["sides"][key]
        m.update({"entry_px": ent.round(1).tolist(), "entry_method": method, "puncture_frames": int(len(H)),
                  "entry_error_px_median": round(float(np.median(err)), 1), "entry_error_px_p90": round(float(np.percentile(err, 90)), 1),
                  "shaft_end_prior_vs_entry_px": round(float(np.linalg.norm(prior - ent)), 1), "shaft_frames_agreeing_40px": int(agree.sum()),
                  "shaft_frames_total": int(len(E)), "axes_reaching_trough": int(len(ends)),
                  "path_error_px_median": round(float(np.median(perr)), 1) if perr else None, "path_error_px_p90": round(float(np.percentile(perr, 90)), 1) if perr else None})
        print(key, {k: m[k] for k in ("entry_px", "entry_method", "puncture_frames", "entry_error_px_median", "entry_error_px_p90", "shaft_end_prior_vs_entry_px", "shaft_frames_agreeing_40px", "axes_reaching_trough", "path_error_px_median", "path_error_px_p90")})
    (S.EDIT / "sketch.json").write_text(json.dumps(sk), encoding="utf-8")
    S.OUTM.write_text(json.dumps(meas, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
