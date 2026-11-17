"""Under-eye filler reel v2: is each follow-up candidate the same patient? insightface (buffalo_l, ArcFace) cosine similarity of every
face in a candidate image against the patient's face in three 2021-09-20 reference frames (IMG_6816, IMG_6817, IMG_6821).

Run with the clinic library's venv (insightface lives there), isolated:
  C:/Users/naimj/clinic-library/.venv/Scripts/python.exe -I brand/scripts/undereye_facematch.py
Inputs: brand/edits/undereye-filler/extra/*.jpg (frames grabbed from the candidates; gitignored: patient faces).
Calibration in the same run: Dr. Ostad's face (in the references) against the patient's references is the "different person" floor.
Writes research/ostad/style/undereye/facematch.json (scores only, no images, no names).
Decision rule: same person if the best face's median similarity to the references >= 0.45 (ArcFace buffalo_l is commonly thresholded
at 0.3-0.4 for verification; 0.45 is stricter) AND it beats the Ostad-vs-patient floor by >= 0.25.
"""
import json
from pathlib import Path
import numpy as np
import cv2
from insightface.app import FaceAnalysis

ROOT = Path(__file__).resolve().parents[2]
EX = ROOT / "brand/edits/undereye-filler/extra"
OUT = ROOT / "research/ostad/style/undereye/facematch.json"

app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
app.prepare(ctx_id=-1, det_size=(640, 640))


def faces(p):
    im = cv2.imread(str(p))
    fs = app.get(im)
    return [(f, f.normed_embedding) for f in fs if f.det_score > 0.6]


def patient_in(p):
    """In the 9-20 references, the patient is the face whose box is narrower than his and not the leftmost in the two-shots;
    simpler and checked by eye on the frames: IMG_6816 she is the right face, IMG_6817/6821 close-ups she is the largest face."""
    fs = faces(p)
    if "6816" in p.name:
        return max(fs, key=lambda x: x[0].bbox[0])[1], min(fs, key=lambda x: x[0].bbox[0])[1]  # (patient, ostad)
    return max(fs, key=lambda x: (x[0].bbox[2] - x[0].bbox[0]))[1], None


refs, ostad = [], []
for r in sorted(EX.glob("ref_*.jpg")):
    pe, oe = patient_in(r)
    refs.append(pe)
    if oe is not None:
        ostad.append(oe)
R = np.array(refs)
ref_self = [float(R[i] @ R[j]) for i in range(len(R)) for j in range(i + 1, len(R))]
floor = [float(o @ r) for o in ostad for r in R]

res = {"references": [r.name for r in sorted(EX.glob("ref_*.jpg"))], "patient_ref_vs_ref": [round(x, 3) for x in ref_self],
       "ostad_vs_patient_floor": [round(x, 3) for x in floor], "candidates": {}}
FLOOR = max(floor) if floor else 0.2
for c in sorted(list(EX.glob("v*.jpg")) + list(EX.glob("p*.jpg"))):
    fs = faces(c)
    rows = []
    for f, e in fs:
        s = R @ e
        rows.append({"box": [int(v) for v in f.bbox], "median_sim": round(float(np.median(s)), 3), "max_sim": round(float(s.max()), 3)})
    best = max(rows, key=lambda r: r["median_sim"]) if rows else None
    same = bool(best and best["median_sim"] >= 0.45 and best["median_sim"] - FLOOR >= 0.25)
    res["candidates"][c.name] = {"faces": rows, "best_median_sim": best["median_sim"] if best else None, "same_patient": same}
    print(c.name, len(rows), "faces; best", best["median_sim"] if best else None, "->", "SAME" if same else "not matched")
print("ref vs ref", res["patient_ref_vs_ref"], "| ostad floor", res["ostad_vs_patient_floor"])
OUT.write_text(json.dumps(res, indent=1), encoding="utf-8")
