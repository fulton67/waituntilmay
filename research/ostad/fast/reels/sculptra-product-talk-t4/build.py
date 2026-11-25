"""Sculptra product-talk, round 2 (t4): the t3 cut with a technical visual on every argument beat (tech.tsx) and sound only on 3 heroes.

  python -I research/ostad/fast/reels/sculptra-product-talk-t4/build.py

Changes from t3 (Naim 2026-11-25: "no animations, images ... sfx are tacky ... doesn't feel technical"):
  - cut "because they are what collagen is naturally made of" (wrong: HA is not what collagen is made of; flagged by the t3 comprehension
    check and PHYSICIAN_CHECK D2). Out 144.785 s (a -70 dB dip after "injectables"), in 148.30 s (the -53 dB dip before "I have").
  - 7 technical slots replace the 10 text cards; 3 sounds (title, mechanism, end card) replace 12.
Tissue renders: brand/edits/flora-anatomy/sculptra (generic AI tissue, QA.md PASS; paid on 2026-11-19, $0 today).
"""
import json, shutil, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
PUB = ROOT / "brand/remotion/public/fast"
SRC = ROOT / "brand/edits/flora-anatomy/sculptra"
A = PUB / "assets/sculptra"
T3 = json.loads((PUB / "sculptra-product-talk-t3/timeline.json").read_text(encoding="utf-8"))
REEL = "sculptra-product-talk-t4"
FPS = 24
FIRST_REACH = {"settle": 14, "snap": 7, "float": 48, "heavy": 23}  # tools/springs.py at 24 fps (PLAYBOOK section 2)

# ---------------------------------------------------------------- assets (stills downscaled to 1600 px; the clip as is)
A.mkdir(parents=True, exist_ok=True)
for name, src in {"splla_a.png": "stills/SPLLA_A_cephra_s6101_r1.png", "splla_b.png": "stills/SPLLA_B_cephra_s6111_r1.png",
                  "sha.png": "stills/SHA_clear_s7111_r2.png", "sha_swell.png": "stills/SHA_clear_swell_s7121_r1.png"}.items():
    if not (A / name).exists():
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(SRC / src), "-vf", "scale=1600:-1:flags=lanczos", str(A / name)], check=True)
if not (A / "splla.mp4").exists():
    shutil.copy2(SRC / "clips/SPLLA_cephra_draft480_5s_t1.mp4", A / "splla.mp4")
S = "fast/assets/sculptra/"

# ---------------------------------------------------------------- the cut
OUT_T, IN_T = 144.785, 148.30
p0, p1, p2, tail = T3["pieces"]
p2a = {"id": "p2a", "in": p2["in"], "out": OUT_T, "at": p2["at"], "sentences": [17], "reason": "sentence 17 to 'injectables' (the wrong 'because' clause cut)"}
at_b = p2["at"] + round((OUT_T - p2["in"]) * FPS)
p2b = {"id": "p2b", "in": IN_T, "out": p2["out"], "at": at_b, "sentences": [18, 19, 20], "reason": "sentences 18-20 whole"}
at_tail = at_b + round((p2["out"] - IN_T) * FPS)
tail = {**tail, "at": at_tail}
pieces = [p0, p1, p2a, p2b, tail]
DUR = at_tail + round((tail["out"] - tail["in"]) * FPS)


def new_frame(old):
    """t3 comp frame -> t4 comp frame (None inside the removed clause)"""
    cut0 = p2["at"] + (OUT_T - p2["in"]) * FPS
    cut1 = p2["at"] + (IN_T - p2["in"]) * FPS
    if old < cut0 - 0.5:
        return old
    if old < cut1 - 0.5:
        return None
    return round(old - (cut1 - at_b))


caps = []
for c in T3["captions"]:
    a = new_frame(c["from"])
    if a is None:
        continue
    b = new_frame(c["to"]) or at_b
    caps.append({**c, "from": a, "to": min(b, DUR)})


def hero(name, start, spring, gain):
    return {"name": name, "frame": start + FIRST_REACH[spring], "gain": gain}


# ---------------------------------------------------------------- slots (frames in t4; the word each lands on in the comment)
slots = [
    {"id": "title0", "kind": "title", "start": 6, "end": 89, "spring": "heavy", "top": 1249, "hold": True,
     "text": {"caps": "Dr. Ariel Ostad on", "title": "Sculptra vs hyaluronic acid"}, "sfx": hero("exo_chapter", 6, "heavy", 0.32)},
    # "which is powdered suture" (93) / "Unlike a traditional hyaluronic acid filler" (156): the two materials, one scale
    {"id": "compare1", "kind": "tech", "view": "compare", "start": 93, "end": 200, "spring": "settle",
     "props": {"a": {"src": S + "splla_a.png", "label": "Sculptra: PLLA particles", "at": 93},
               "b": {"src": S + "sha.png", "src2": S + "sha_swell.png", "label": "HA filler: a gel", "at": 156}}},
    # "it works by creating a tissue response that stimulates your body to produce collagen" (193-322): the mechanism, full frame
    {"id": "mechanism", "kind": "tech", "view": "mechanism", "start": 200, "end": 340, "spring": "heavy", "sfx": hero("swish", 200, "heavy", 0.24),
     "props": {"caps": "How Sculptra works", "title": "A tissue response that makes collagen",
               "rows": [{"text": "PLLA particles, deep in the skin", "at": 204}, {"text": "A tissue response around them", "at": 235},
                        {"text": "Your body makes new collagen", "at": 298}],
               "still": S + "splla_a.png", "clip": {"src": S + "splla.mp4", "from": 238, "len": 121},
               "months": [[0, 0], [238, 0], [262, 1], [286, 2], [310, 3]], "monthsNote": "Builds gradually"}},
    # "a type of collagen that leads to scarring" (341-400)
    {"id": "fibers", "kind": "tech", "view": "fibers", "start": 341, "end": 450, "spring": "settle",
     "props": {"left": {"caps": "Organised collagen", "title": "Woven, flexible", "at": 345},
               "right": {"caps": "Scar-type collagen", "title": "Dense, parallel", "at": 368}}},
    # 450-514 "I personally take a very conservative approach": his opinion on his clean face
    # "inflammatory reactions (530), nodules (576), scarring (603) ... but not with hyaluronic acid (724)"
    {"id": "risks", "kind": "tech", "view": "risks", "start": 514, "end": 752, "spring": "settle",
     "props": {"still": S + "splla_b.png", "caps": "With biostimulators like Sculptra", "nodule": 576,
               "rows": [{"text": "Inflammatory reactions", "at": 530}, {"text": "Nodules", "at": 576}, {"text": "Scarring", "at": 603},
                        {"text": "Not with hyaluronic acid", "at": 724}]}},
    # 752-852 "aesthetic medicine is about thinking long term": clean face
    # "I don't have this issue with hyaluronic acid injectables" (854-972)
    {"id": "compare2", "kind": "tech", "view": "compare", "start": 858, "end": 978, "spring": "settle",
     "props": {"a": {"src": S + "splla_b.png", "label": "Biostimulator: new collagen", "at": 858},
               "b": {"src": S + "sha.png", "src2": S + "sha_swell.png", "label": "Hyaluronic acid: no such issue", "at": 896}}},
    # "I have an issue with bio-stimulators ... powdered suture material (1085) ... underneath (1132) your skin repeatedly (1149),
    #  it can lead to scarring underneath (1277) ... nodules (1340) and inflammatory reactions (1375) later (1412)"
    {"id": "sessions", "kind": "tech", "view": "sessions", "start": 1000, "end": 1447, "spring": "settle",
     "props": {"caps": "Repeated treatments", "sessions": [1085, 1132, 1160], "scar": 1277, "nodule": 1340, "halo": 1375, "later": 1412}},
    # "it also just rounds out your face (1483) as opposed to using hyaluronic acid (1530) strategically ... properly sculpt (1619) the face"
    {"id": "contour", "kind": "tech", "view": "contour", "start": 1475, "end": 1652, "spring": "settle",
     "props": {"left": {"caps": "Biostimulator", "title": "Rounds out the face", "at": 1479},
               "right": {"caps": "Hyaluronic acid, placed", "title": "Sculpts the face", "at": 1528, "points": 1615}}},
    {"id": "end", "kind": "end", "start": at_tail, "end": DUR, "spring": "settle", "hold": True, "sfx": hero("card", at_tail, "settle", 0.16),
     "box": {"left": 119, "top": 691, "w": 842}},
]

tl = {**{k: v for k, v in T3.items() if k not in ("pieces", "captions", "slots", "warnings")},
      "reel": REEL, "durationInFrames": DUR, "pieces": pieces, "captions": caps, "slots": slots,
      "notes": ["round 2: technical visual per beat; 3 sounds", "clean face (his opinion) 450-514 and 752-852"]}
d = PUB / REEL
d.mkdir(parents=True, exist_ok=True)
(d / "timeline.json").write_text(json.dumps(tl, indent=1), encoding="utf-8")
(PUB / "current.json").write_text(json.dumps({"reel": REEL}), encoding="utf-8")
rec = ROOT / "research/ostad/fast/reels" / REEL
(rec / "timeline.json").write_text(json.dumps(tl, indent=1), encoding="utf-8")
print(f"{REEL}: {DUR} f ({DUR / FPS:.1f} s), {len(pieces)} pieces, {len(caps)} captions, {len(slots)} slots, {sum(1 for s in slots if s.get('sfx'))} sounds")
