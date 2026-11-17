"""Under-eye filler reel v2/v3: check the traced orbital rim against the model render, then place it on her face (LESSONS P5).

Input: brand/edits/undereye-filler/anatomy/bone_front.{png,json} from undereye_anatomy_render.py (Blender, face.glb bone layer,
orthographic front view; rim traced on the mesh by ray casting).
1. Outline difference: Canny edges of the same-angle render; for every rim point the distance to the nearest edge pixel (render px,
   and mm via the ortho scale). Bone is held to the strictest tolerance: median <= 3 px and p90 <= 6 px (about 0.9 / 1.7 mm). A rim that
   fails is not drawn; a line-style render of the model is used instead (not needed if it passes).
2. Placement: a similarity transform from the model's two eyeball centres (render px) to her two iris centres on the reference face
   (IMG_6815 @ 1.0 s, MediaPipe 468 / 473), so the bone is drawn at her scale and angle; the inferior arc (the rim under the hollow,
   angles 200-340 deg) goes into sketch.json "rim". Marked ostad_check: pending (a clinical drawing).
Writes brand/edits/undereye-filler/sketch.json (rim) and research/ostad/style/undereye/anatomy_check.json.
"""
import json, sys
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "brand/scripts"))
import undereye_sketch as S  # noqa: E402

A = S.EDIT / "anatomy"
OUT = ROOT / "research/ostad/style/undereye/anatomy_check.json"


def main():
    d = json.loads((A / "bone_front.json").read_text(encoding="utf-8"))
    img = cv2.imread(str(A / "bone_front.png"), cv2.IMREAD_GRAYSCALE)
    edges = cv2.Canny(cv2.GaussianBlur(img, (3, 3), 0), 20, 60)
    dist = cv2.distanceTransform((edges == 0).astype(np.uint8), cv2.DIST_L2, 5)
    mm_per_px = float(d["camera"].split("ortho_scale ")[1]) * 1000 / 1080
    res = {"model": "research/ostad/3d/base/face.glb (Z-Anatomy, CC BY-SA 4.0), bone layer", "render": "orthographic front, 1080x1350, Blender Workbench",
           "trace": "ray cast on the bone mesh: first point >= 8 mm forward of the orbit's interior depth, 144 directions per orbit",
           "tolerance_bone": {"median_px": 3, "p90_px": 6}, "mm_per_render_px": round(mm_per_px, 3), "orbits": {}, "ostad_check": "pending"}
    cap = cv2.VideoCapture(str(S.PUB / "6815.mp4"))
    cap.set(cv2.CAP_PROP_POS_MSEC, 1000)
    _, ref = cap.read()
    R = S.lms(ref)
    # model eyeball_r sits on the image left in the front render (x 410), like her right eye (iris 468)
    src = np.float32([d["eyes"]["eyeball_r"], d["eyes"]["eyeball_l"]])
    dst = np.float32([R[468], R[473]])
    M, _ = cv2.estimateAffinePartial2D(src, dst)
    sk = json.loads((S.EDIT / "sketch.json").read_text(encoding="utf-8"))
    sk["rim"] = {}
    ok_all = True
    for name, key in (("eyeball_r", "R_patient"), ("eyeball_l", "L_patient")):
        pts = np.array([[p[0], p[1]] for p in d["rim"][name]])
        ang = np.array([p[2] for p in d["rim"][name]])
        h, w = dist.shape
        dd = np.array([dist[int(min(h - 1, max(0, y))), int(min(w - 1, max(0, x)))] for x, y in pts])
        med, p90 = float(np.median(dd)), float(np.percentile(dd, 90))
        ok = med <= 3 and p90 <= 6
        ok_all &= ok
        inf = pts[(ang >= 200) & (ang <= 340)]
        inf = inf[np.argsort(inf[:, 0])]
        mapped = (M[:, :2] @ inf.T).T + M[:, 2]
        res["orbits"][key] = {"points": int(len(pts)), "outline_diff_px_median": round(med, 2), "outline_diff_px_p90": round(p90, 2),
                              "outline_diff_mm_median": round(med * mm_per_px, 2), "pass": ok, "inferior_arc_points": int(len(inf))}
        if ok:
            sk["rim"][key] = mapped.round(1).tolist()
    res["placement"] = {"method": "similarity, model eyeball centres -> her iris centres (MediaPipe 468 / 473) on IMG_6815 @ 1.0 s",
                        "scale": round(float(np.hypot(M[0, 0], M[0, 1])), 4)}
    res["pass"] = ok_all
    (S.EDIT / "sketch.json").write_text(json.dumps(sk), encoding="utf-8")
    OUT.write_text(json.dumps(res, indent=1), encoding="utf-8")
    chk = ref.copy()
    for key, arc in sk["rim"].items():
        cv2.polylines(chk, [np.int32(arc)], False, (0, 0, 255), 2)
    cv2.imwrite(str(A / "rim_on_face.jpg"), chk[700:1300, 150:950])
    print(json.dumps(res, indent=1))


if __name__ == "__main__":
    main()
