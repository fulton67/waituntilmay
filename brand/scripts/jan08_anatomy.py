"""Jan 08 filler-fatigue reel anatomy drawings (same method as oct14_anatomy.py): trace the model masks (jan08_anatomy_blender.py) into line paths and measure them.

  $PY -I brand/scripts/jan08_anatomy.py

Every drawn outline is traced from a silhouette render of research/ostad/3d/base/face.glb at the same view. The check
re-rasterises each drawn path and compares it with the model render: IoU and the outline distance (mean / max px, at the
1024 px render). Bone and muscle get the strict tolerance (mean <= 1.0 px, max <= 3 px); the fat compartments, which the
model itself approximates (face.layers.json), get mean <= 1.5 px, max <= 4 px. A structure that fails is not drawn; the
reel would fall back to a line render of the model. Outputs:
  brand/remotion/public/jan08/anatomy.json   (gitignored public dir; paths in render px)
  research/ostad/style/jan08/anatomy_measure.json   (committed: the numbers)
  brand/edits/jan08-filler-fatigue/anatomy/overlay_<view>.jpg   (drawn path over the model render, for the eye)
"""
import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "brand/edits/jan08-filler-fatigue/anatomy"
STRICT = {"mean": 1.0, "max": 3.0}
LOOSE = {"mean": 1.5, "max": 4.0}
# what each structure is, for the label and the tolerance (bone / muscle strict; fat approximated in the model)
KIND = {"skin": "context", "frontalis": "muscle", "corrugator": "muscle", "procerus": "muscle", "orbicularis": "muscle", "oris": "muscle",
        "zygomatic_bone": "bone", "maxilla": "bone", "fat_": "fat"}
LABEL = {"frontalis_muscle": "Frontalis", "corrugator_supercilii": "Corrugator", "procerus_muscle": "Procerus",
         "orbital_part_of_orbicularis_oculi": "Orbicularis oculi", "zygomatic_bone": "Cheekbone", "maxilla": "Maxilla",
         "fat_deep_soof": "Deep fat (SOOF)", "fat_deep_medial_cheek": "Deep medial cheek fat", "fat_sup_medial_cheek": "Medial cheek fat",
         "fat_sup_middle_cheek": "Middle cheek fat", "fat_sup_nasolabial": "Nasolabial fat", "fat_sup_jowl": "Jowl fat", "skin_epidermis": "Skin"}


# what is drawn per view: a structure on its own, or a union of model compartments (the model's superficial cheek pads are
# skin regions pushed inward, so they read as one "cheek fat" shape; the deep pads overlap them and are left out of the drawing)
DRAW_OCT14_UPPER = {"upper": {"frontalis_muscle_l": ["frontalis_muscle_l"], "frontalis_muscle_r": ["frontalis_muscle_r"],
                  "corrugator_supercilii_l": ["corrugator_supercilii_l"], "corrugator_supercilii_r": ["corrugator_supercilii_r"],
                  "procerus_muscle": ["procerus_muscle_l", "procerus_muscle_r"],
                  "orbital_part_of_orbicularis_oculi_l": ["orbital_part_of_orbicularis_oculi_l"], "orbital_part_of_orbicularis_oculi_r": ["orbital_part_of_orbicularis_oculi_r"]},
        "midface": {"skin_epidermis": ["skin_epidermis"], "zygomatic_bone_r": ["zygomatic_bone_r"], "maxilla_r": ["maxilla_r"], "mandible": ["mandible"],
                    "fat_cheek_r": ["fat_sup_medial_cheek_r", "fat_sup_middle_cheek_r", "fat_sup_nasolabial_r"], "fat_sup_jowl_r": ["fat_sup_jowl_r"]}}
DRAW = {"midface": {"skin_epidermis": ["skin_epidermis"], "zygomatic_bone_r": ["zygomatic_bone_r"], "maxilla_r": ["maxilla_r"], "mandible": ["mandible"],
                    "fat_cheek_r": ["fat_sup_medial_cheek_r", "fat_sup_middle_cheek_r", "fat_sup_nasolabial_r"], "fat_sup_jowl_r": ["fat_sup_jowl_r"],
                    "orbicularis_oris_muscle_r": ["orbicularis_oris_muscle_r"]}}
DRAW["profile"] = {"skin_epidermis": ["skin_epidermis"], "zygomatic_bone_r": ["zygomatic_bone_r"], "maxilla_r": ["maxilla_r"], "mandible": ["mandible"],
                   "fat_cheek_r": ["fat_sup_medial_cheek_r", "fat_sup_middle_cheek_r", "fat_sup_nasolabial_r", "fat_deep_soof_r", "fat_deep_medial_cheek_r"],
                   "fat_sup_jowl_r": ["fat_sup_jowl_r"]}
DRAW["section"] = {"epidermis": ["epidermis", "papillary_dermis"], "dermis": ["reticular_dermis"], "hypodermis": ["hypodermis"],
                   "artery": ["artery"], "vein": ["vein"], "fat_lobules": ["fat_lobule_27", "fat_lobule_28", "fat_lobule_29", "fat_lobule_30", "fat_lobule_31", "fat_lobule_32"]}
# outlines drawn open: the parts of the contour on the render's frame edge are the camera's crop, not anatomy
OPEN = {"skin_epidermis", "epidermis", "dermis", "hypodermis"}
LABEL.update({"orbicularis_oris_muscle": "Lip muscle", "procerus_muscle": "Procerus", "fat_cheek": "Cheek fat", "mandible": "Jaw bone", "epidermis": "Skin", "dermis": "Dermis",
              "hypodermis": "Fat layer", "artery": "Vessel", "vein": "Vessel", "fat_lobules": "Fat"})
KIND.update({"epidermis": "context", "dermis": "context", "hypodermis": "fat", "artery": "vessel", "vein": "vessel", "fat_lobules": "fat"})


def kind(s):
    return next((v for k, v in KIND.items() if k in s), "context")


def label(s):
    base = s[:-2] if s.endswith(("_l", "_r")) else s
    return LABEL.get(base, base)


def outline_dist(a, b):
    """mean / max distance from the outline of a to the outline of b, both ways (px)"""
    ea = cv2.Canny(a, 50, 150) > 0
    eb = cv2.Canny(b, 50, 150) > 0
    if not ea.any() or not eb.any():
        return None, None
    da = cv2.distanceTransform((~eb).astype(np.uint8), cv2.DIST_L2, 5)
    db = cv2.distanceTransform((~ea).astype(np.uint8), cv2.DIST_L2, 5)
    d = np.concatenate([da[ea], db[eb]])
    return float(d.mean()), float(d.max())


def main():
    man = json.loads((SRC / "manifest.json").read_text())
    out = {"source": man["source"], "size": man["size"], "views": {}}
    meas = {"source": man["source"], "method": "silhouette render per structure (Blender, ortho, same view) -> traced paths -> re-rasterised -> IoU and outline distance vs the render",
            "tolerance": {"bone_muscle": STRICT, "fat_approximated": LOOSE, "context": LOOSE}, "views": {}}
    for vname, v in man["views"].items():
        paths, rows = [], []
        over = np.full((man["size"], man["size"], 3), 245, np.uint8)
        for s, members in DRAW[vname].items():
            m = np.zeros((man["size"], man["size"]), np.uint8)
            for fn in members:
                im = cv2.imread(str(SRC / v["files"][fn]), cv2.IMREAD_UNCHANGED)
                m |= (im[:, :, 3] > 127).astype(np.uint8) * 255
            m[:2, :] = m[-2:, :] = 0; m[:, :2] = m[:, -2:] = 0  # a structure running off the frame gets a closed edge
            if m.sum() == 0:
                rows.append({"structure": s, "visible": False}); continue
            # outer outlines and holes (the orbicularis oculi is a ring): even-odd fill of every traced loop
            cs, _ = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
            cs = [c for c in cs if len(c) >= 3]  # keep every loop: a dropped fragment is an outline error
            simp = [cv2.approxPolyDP(c, 0.5, True) for c in cs]
            drawn = np.zeros_like(m)
            for c in simp:
                one = np.zeros_like(m); cv2.fillPoly(one, [c], 255); drawn ^= one
            inter = np.logical_and(drawn > 0, m > 0).sum(); uni = np.logical_or(drawn > 0, m > 0).sum()
            mean, mx = outline_dist(drawn, m)
            k = kind(s)
            tol = STRICT if k in ("bone", "muscle", "vessel") else LOOSE
            ok = mean is not None and mean <= tol["mean"] and mx <= tol["max"]
            rows.append({"structure": s, "members": members, "kind": k, "iou": round(inter / uni, 4), "outline_mean_px": round(mean, 3), "outline_max_px": round(mx, 2),
                         "tolerance": tol, "pass": ok, "points": int(sum(len(c) for c in simp)),
                         "ostad_check": "pending" if k != "context" else None})
            if ok:
                if s in OPEN:  # split each loop where it runs along the frame edge
                    segs = []
                    for c in simp:
                        cur = []
                        for q in c[:, 0]:
                            on_edge = q[0] <= 3 or q[1] <= 3 or q[0] >= man["size"] - 4 or q[1] >= man["size"] - 4
                            if on_edge:
                                if len(cur) > 1: segs.append(cur)
                                cur = []
                            else:
                                cur.append(q)
                        if len(cur) > 1: segs.append(cur)
                    d = " ".join("M" + " L".join(f"{q[0]},{q[1]}" for q in sg) for sg in segs)
                else:
                    d = " ".join("M" + " L".join(f"{p[0][0]},{p[0][1]}" for p in c) + " Z" for c in simp)
                M = cv2.moments(max(cs, key=cv2.contourArea))
                paths.append({"id": s, "kind": k, "label": label(s), "d": d, "c": [M["m10"] / M["m00"], M["m01"] / M["m00"]],
                              "bbox": list(map(int, cv2.boundingRect(np.vstack(cs)))), "ostad_check": "pending" if k != "context" else None})
            col = {"bone": (120, 120, 120), "muscle": (60, 60, 160), "fat": (60, 150, 200), "context": (180, 180, 180), "vessel": (40, 40, 200)}[k]
            over[m > 0] = (over[m > 0] * 0.7 + np.array(col) * 0.3).astype(np.uint8)
            cv2.polylines(over, simp, True, (20, 20, 20), 1)
        cv2.imwrite(str(SRC / f"overlay_{vname}.jpg"), over)
        out["views"][vname] = {"yaw_deg": v["yaw_deg"], "source": man.get("sources", {}).get(vname, man["source"]), "paths": paths}
        meas["views"][vname] = {"yaw_deg": v["yaw_deg"], "source": man.get("sources", {}).get(vname, man["source"]), "structures": rows,
                                "all_pass": all(r.get("pass", True) for r in rows if r.get("visible", True))}
    (ROOT / "brand/remotion/public/jan08/anatomy.json").write_text(json.dumps(out))
    (ROOT / "research/ostad/style/jan08/anatomy_measure.json").write_text(json.dumps(meas, indent=1))
    for vn, v in meas["views"].items():
        print(vn, "all_pass", v["all_pass"])
        for r in v["structures"]:
            print("  ", r["structure"], r.get("kind"), r.get("iou"), r.get("outline_mean_px"), r.get("outline_max_px"), r.get("pass"))


if __name__ == "__main__":
    main()
