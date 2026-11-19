"""Under-eye reel v4 props: props_v2.json (the delivered cut: audio, words, cues untouched) with picture-only changes for the client's
2026-11-19 notes. Writes brand/remotion/public/undereye-filler/props_v4.json.
  - hook: the registered wipe ends on a hard cut at f40 (no opacity ramp on any picture; client: raw footage only)
  - P04: the injection b-roll (6817) 10 f longer into his line (lip sync kept: the 6816 segment starts 10 f later in its own time)
  - P08: 1.3x about the left edge; the Oct 4 portrait at 0.85 (so the plate and the label have face-free room)
  - IMG_6815 b-roll (her face, f223-275 and f356-384): a 1.5x punch-in about the bottom centre, so her face sits above the two cards
    (face_clear: the cards would otherwise cover her chin)
  - from "deep" (c.deep) to the end of P10: the surgeon's plan board, her registered Sept 20 face (ba_wipe_before.jpg) at 1.35x about
    (386, 1989) with the technical markup locked to it (it replaces the FanMap and the side boxes drawn on moving footage, which drifted)
  - the RVM keys for the titles behind the people (brand/scripts/undereye_key.py): name, clip, start second
usage: python brand/scripts/undereye_prep_v4.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "brand/remotion/public/undereye-filler"
P = json.load(open(PUB / "props_v2.json"))
c = P["cues"]
PLAN = {"still": "plan", "scale": 1.35, "ox": 386, "oy": 1989}

for pc in P["pieces"]:
    pics = []
    for q in pc["pics"]:
        if q.get("clip") == "6815":
            q = {**q, "scale": 1.5, "ox": 540, "oy": 1920}
        if q.get("still") == "after":  # the Oct 4 portrait smaller (0.85 about 540, 1100): "Afterwards" sits above her face
            q = {**q, "scale": 0.85, "ox": 540, "oy": 1100}
        if pc["id"] == "P08":  # 1.3x about the left edge: her face moves right, the syringe plate gets the face-free left column
            q = {**q, "scale": 1.3, "ox": 0, "oy": 1300}  # oy 1300: her chin stays above the caption band (face_clear 824-830)
        if pc["id"] == "P04" and q.get("clip") == "6817":  # the injection b-roll runs 10 f longer, so title 02 never meets his face
            q = {**q, "f1": q["f1"] + 10}
        if pc["id"] == "P04" and q.get("clip") == "6816":
            q = {**q, "f0": q["f0"] + 10, "src": round(q["src"] + 10 * P["speed"] / 24, 4)}
        if pc["id"] == "P09":
            pics += [{**q, "f1": c["deep"]}, {"f0": c["deep"], "f1": q["f1"], **PLAN}]
            continue
        if pc["id"] == "P10":
            pics.append({"f0": q["f0"], "f1": q["f1"], **PLAN})
            continue
        pics.append(q)
    pc["pics"] = pics

P["hook"] = 40
P["keys"] = {"title": {"clip": "7044", "a": 8}, "c01": {"clip": "6816", "a": 11}, "c02": {"clip": "6817", "a": 31}, "c02b": {"clip": "6816", "a": 31},
             "c03": {"clip": "6818", "a": 1}, "c04": {"clip": "6821", "a": 0}}
json.dump(P, open(PUB / "props_v4.json", "w"))
print("props_v4.json:", sum(len(x["pics"]) for x in P["pieces"]), "picture segments; plan from", c["deep"])
