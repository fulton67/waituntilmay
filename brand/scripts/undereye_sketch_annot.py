"""Under-eye filler reel v2: the surgeon's sketch from points read off the procedure footage (DECISIONS 15c).

Why read, not detected: the automatic detectors (undereye_sketch.py's Hough shaft, undereye_entry_check.py's red-dot search) were tried
and rejected on the evidence: the shaft end scattered 28 px (median) over glove edges, a densest-cluster fix jumped to the wrong cheek,
and the red-dot search locked onto the nostrils (123 px off). So the points are read from 2x crops of decoded frames with a 20 px grid
(brand/edits/undereye-filler/cann/c*.jpg, local), in source px of IMG_6817 (1080x1920):
  entry   the point where the cannula disappears into the skin (the puncture dimple), or the red puncture mark after withdrawal
  shaft   a point on the visible shaft outside the skin (gives the axis the cannula follows under the skin)
Each frame is registered to the reference face (IMG_6815 @ 1.0 s) by the similarity transform on stable landmarks (eye corners,
nasion, nose tip, mouth corners), the same as undereye_sketch.py. Entry = the mean of a side's registered readings; entry error = the
readings' distance to it (independent frames, so this is a real repeatability figure, read at the reference's 1080 width). Path = each
reading's axis from the entry to the tear-trough line (lower-lid landmarks + 0.12 IOD); the drawn fan is those axes; path error = the
spread of where the readings' axes reach the trough around each drawn stroke (0 for a single reading, reported as such).
Writes brand/edits/undereye-filler/sketch.json (sides) and updates research/ostad/style/undereye/sketch_measure.json.
"""
import json, sys
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "brand/scripts"))
import undereye_sketch as S  # noqa: E402

READ = {
    "R_patient": {"side": "L", "frames": [
        {"t": 66.0, "entry": [396, 962], "shaft": [365, 1070]},
        {"t": 72.0, "entry": [414, 962], "shaft": [427, 1100]}]},
    "L_patient": {"side": "R", "frames": [
        {"t": 214.0, "entry": [701, 937], "shaft": [814, 1110]},
        {"t": 244.0, "entry": [682, 917], "shaft": None}]},  # the red puncture mark after the cannula is out
}


def main():
    cap = cv2.VideoCapture(str(S.PUB / "6815.mp4"))
    cap.set(cv2.CAP_PROP_POS_MSEC, 1000)
    _, ref = cap.read()
    R = S.lms(ref)
    iodR = float(np.linalg.norm(R[468] - R[473]))
    v = cv2.VideoCapture(str(S.PUB / "6817.mp4"))
    sk = json.loads((S.EDIT / "sketch.json").read_text(encoding="utf-8"))
    meas = json.loads(S.OUTM.read_text(encoding="utf-8"))
    for key, rd in READ.items():
        ents, axes = [], []
        for fr in rd["frames"]:
            v.set(cv2.CAP_PROP_POS_MSEC, fr["t"] * 1000)
            _, img = v.read()
            L = S.lms(img)
            M = S.sim(L[S.STABLE], R[S.STABLE])
            e = S.ap(M, fr["entry"])
            ents.append(e)
            if fr["shaft"]:
                sh = S.ap(M, fr["shaft"])
                d = e - sh
                axes.append(d / np.linalg.norm(d))
        E = np.array(ents)
        ent = E.mean(axis=0)
        err = np.linalg.norm(E - ent, axis=1)
        tr = S.trough(R, rd["side"], iodR)
        ends = [S.ray_poly(ent, d, tr) for d in axes]
        ends = [q for q in ends if q is not None]
        strokes = [[ent.round(1).tolist(), q.round(1).tolist()] for q in ends]
        sd = sk["sides"][key]
        sd["entry"], sd["strokes"] = ent.round(1).tolist(), strokes or sd["strokes"]
        sd["hollow"] = np.vstack([R[S.LID[rd["side"]]], tr[::-1]]).round(1).tolist()
        sd["trough"] = tr.round(1).tolist()
        m = meas["sides"][key]
        m.clear()
        m.update({"image_side": rd["side"], "method": "points read on 2x gridded crops of decoded frames, registered to the reference",
                  "readings": [{"t": fr["t"], "entry_src": fr["entry"], "shaft_src": fr["shaft"]} for fr in rd["frames"]],
                  "entry_px": ent.round(1).tolist(), "entry_error_px": [round(float(x), 1) for x in err], "entry_error_px_max": round(float(err.max()), 1),
                  "axes": len(axes), "axes_reaching_trough": len(ends),
                  "path_error_px": "n/a: one axis per reading; each drawn stroke is a reading's own axis (0 px by construction)",
                  "detectors_rejected": "Hough shaft end: median scatter 28 px; densest cluster: wrong cheek; red-dot search: nostrils, 123 px off"})
        print(key, {k: m[k] for k in ("entry_px", "entry_error_px", "axes_reaching_trough")})
    (S.EDIT / "sketch.json").write_text(json.dumps(sk), encoding="utf-8")
    S.OUTM.write_text(json.dumps(meas, indent=1), encoding="utf-8")
    chk = ref.copy()
    for key, sd in sk["sides"].items():
        cv2.drawMarker(chk, tuple(int(x) for x in sd["entry"]), (0, 0, 255), cv2.MARKER_TILTED_CROSS, 30, 3)
        for a, b in sd["strokes"]:
            cv2.line(chk, tuple(int(x) for x in a), tuple(int(x) for x in b), (255, 255, 255), 3)
        cv2.polylines(chk, [np.int32(sd["hollow"])], True, (255, 200, 0), 1)
    cv2.imwrite(str(S.EDIT / "sketch_check2.jpg"), chk)


if __name__ == "__main__":
    main()
