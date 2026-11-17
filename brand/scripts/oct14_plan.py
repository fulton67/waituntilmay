"""Oct 14 injection reel: the edit plan. Every candidate line is ranked, duplicates are mapped, the cut is grouped by area, and the
plan is checked. NOT FOR POSTING until patient consent = yes.

The coordinator's direction (2026-11-17), logged in DECISIONS 16:
  1. one take per point; a duplicate map over every clip
  2. grouped by area, in the order he introduces them: (a) the problem, from the intro; (b) the injection on that spot;
     (c) what he says while injecting
  3. lines ranked by information value; cut from the bottom up to about 90 s
Spans are word-index ranges in brand/edits/oct14-injection/words_<role>.json (local faster-whisper, name-redacted; none needed it).

  $PY -I brand/scripts/oct14_plan.py    # writes research/ostad/style/oct14/cut.json and plan.json and prints the checks
Checks (written to plan.json):
  runtime      sum of the kept spans / speed + the end-card tail; target 85-95 s
  duplicates   difflib ratio and word-trigram overlap between every pair of kept spans; fail if ratio > 0.6 or trigram Jaccard > 0.25
  adjacency    each area's injection footage (pip or full frame) starts within 1 beat (the next piece) of its spoken line
"""
import difflib, itertools, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EDIT = ROOT / "brand/edits/oct14-injection"
OUT = ROOT / "research/ostad/style/oct14"
SPEED, TAIL, FPS = 1.15, 120, 24  # 1.15x: the speed the client approved for him (DECISIONS 14); 1.1x ran 98 s
PAD0, PAD1 = 0.10, 0.16  # s of air before the first word and after the last, limited to half the gap to the neighbouring word

W = {r: json.loads((EDIT / f"words_{r}.json").read_text()) for r in ("intro", "after", "inj2", "inj5", "inj6", "inj7", "neuro", "pre1")}
CLIP = {"intro": "IMG_3640 16:44", "after": "IMG_3656 16:55", "inj2": "IMG_3642 16:48", "inj5": "IMG_3652 16:50", "inj6": "IMG_3653 16:51",
        "inj7": "IMG_3654 16:53", "neuro": "IMG_3657 16:57", "pre1": "IMG_3637 16:42"}


def text(role, a, b):
    return " ".join(w["w"] for w in W[role][a:b + 1])


MIN_GAP = 0.08  # v2 rule: every in and out point sits in a silent gap of >= 80 ms between words (coordinator, 2026-11-17)


# The gap is measured in the AUDIO, not only in the word timings: whisper often gives touching word boundaries (one word's t1 = the
# next word's t0) even where there is a pause, and sometimes runs a word's end into a breath. Envelope: 10 ms RMS of the clip's audio
# (16 kHz mono). Silence = below the clip noise floor (10th percentile) + 8 dB. A boundary's gap is the longest silent run inside
# [previous word's start + 60 % of its length, this word's t0 + 60 ms]; the cut goes in the middle of that run.
import subprocess
import numpy as np
SRC = {"intro": "IMG_3640", "after": "IMG_3656", "inj2": "IMG_3642", "inj5": "IMG_3652", "inj6": "IMG_3653", "inj7": "IMG_3654", "neuro": "IMG_3657", "pre1": "IMG_3637"}
_ENV = {}


def env(role):
    if role not in _ENV:
        pcm = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", f"C:/Users/naimj/clinic-library/tmp/oct14/{SRC[role]}.MOV", "-map", "0:a:0", "-ac", "1",
                              "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
        x = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0
        n = len(x) // 160
        db = 20 * np.log10(np.sqrt((x[: n * 160].reshape(n, 160) ** 2).mean(1)) + 1e-6)
        _ENV[role] = (db, float(np.percentile(db, 10)) + 8.0)  # +8 dB; v3 places the cut mid-run (v2 cut 0.12 s before whisper's late "we" and clipped it)
    return _ENV[role]


def silent_run(role, lo, hi):
    """(length s, start s, end s) of the longest silent run of the envelope between lo and hi seconds"""
    db, thr = env(role)
    a, b = max(0, int(lo * 100)), min(len(db), int(hi * 100) + 1)
    best, cur, start = (0.0, lo, lo), 0, a
    for i in range(a, b):
        if db[i] < thr:
            if cur == 0:
                start = i
            cur += 1
            if cur / 100 > best[0]:
                best = (cur / 100, start / 100, (i + 1) / 100)
        else:
            cur = 0
    return best


def boundary(role, i):
    """the silent run between word i-1 and word i: (length s, start s, end s)"""
    ws = W[role]
    if i <= 0:
        return 9.0, 0.0, ws[0]["t0"]
    if i >= len(ws):
        return 9.0, ws[-1]["t1"], ws[-1]["t1"] + 9.0
    p = ws[i - 1]
    return silent_run(role, p["t0"] + 0.6 * (p["t1"] - p["t0"]), ws[i]["t0"] + 0.06)


def gap_before(role, a):
    return boundary(role, a)[0]


def gap_after(role, b):
    return boundary(role, b + 1)[0]


def span(role, a, b):
    """in / out points inside the silent run at each end, at most 0.12 s before the first word and 0.16 s after the last
    (and at least 20 ms inside the run, so the 15 ms fade is all silence)"""
    _, s0, e0 = boundary(role, a)
    _, s1, e1 = boundary(role, b + 1)
    t_in = max((s0 + e0) / 2, e0 - 0.25)  # v3: the middle of the silent run (at most 0.25 s before the word)
    t_out = min((s1 + e1) / 2, s1 + 0.25)
    return round(max(0.0, t_in), 3), round(t_out, 3)


# v2: micro-cuts inside kept lines (fillers, restarts), as word-index ranges dropped; each must have >= 80 ms silence both sides
DROPS = {
    "intro-dynamic": [(68, 70)],          # "you know, just"  -> "She's got relatively strong crow's feet"
    "intro-midface": [(236, 237)],        # "you know,"
    "intro-deflation": [(282, 282), (286, 286)],  # "just" twice: "deflation and skin stretching from soft tissue moving down"
    "after-summary": [(28, 30)],          # "and sort of": a restart
    "after-lasts": [(199, 199)],          # "like"
}
FILLER = {"um", "uh", "er", "erm", "ah", "hmm", "mm"}
FILLER2 = {("you", "know"), ("i", "mean")}
HEDGE = {"like"}  # reported, not cut unless a clean gap allows it ("like" is also a real word: "lifted like", so each is listed)
HEDGE2 = {("sort", "of"), ("kind", "of")}


def nw(w):
    return re.sub(r"[^a-z']", "", w.lower())


def fillers(role, a, b, drops=()):
    """filler tokens left in a span: um/uh..., 'you know' / 'i mean', and a word repeated within 1 s (a stutter)"""
    gone = {i for d in drops for i in range(d[0], d[1] + 1)}
    idx = [i for i in range(a, b + 1) if i not in gone]
    ws = W[role]
    out = []
    for k, i in enumerate(idx):
        w = nw(ws[i]["w"])
        if w in FILLER:
            out.append((i, w))
        if w in HEDGE and not (k > 0 and nw(ws[idx[k - 1]]["w"]) == "i"):  # "I like using" is the verb, not a filler
            out.append((i, "hedge " + w))
        if k + 1 < len(idx):
            j = idx[k + 1]
            if (w, nw(ws[j]["w"])) in FILLER2:
                out.append((i, w + " " + nw(ws[j]["w"])))
            if (w, nw(ws[j]["w"])) in HEDGE2:
                out.append((i, "hedge " + w + " " + nw(ws[j]["w"])))
            if w and w == nw(ws[j]["w"]) and ws[j]["t0"] - ws[i]["t0"] < 1.0:
                out.append((i, "repeat " + w))
    return out


def subspans(pid, role, a, b):
    """the span split around its dropped ranges; a drop that lacks 80 ms of silence on either side is refused (kept, reported)"""
    parts, cur, refused = [], a, []
    for d0, d1 in DROPS.get(pid, []):
        if gap_before(role, d0) >= MIN_GAP and gap_after(role, d1) >= MIN_GAP:
            parts.append((cur, d0 - 1))
            cur = d1 + 1
        else:
            refused.append((d0, d1, round(gap_before(role, d0), 3), round(gap_after(role, d1), 3)))
    parts.append((cur, b))
    return parts, refused


# ---------------------------------------------------------------------------------------------------------------------------
# Every candidate line, scored 1-5 for information value: why the line forms, what he targets and why, technique, depth or
# product handling, expected result, downtime, how long it lasts. 5 = the viewer learns something specific; 1 = chatter.
# `point` groups duplicates; `keep` marks the chosen take. Lines under 3 are dropped first, then the weaker take of each point,
# then from the bottom up until the cut is about 90 s.
# ---------------------------------------------------------------------------------------------------------------------------
C = [
    # id, role, i0, i1, score, point, keep, reason
    ("intro-hi", "intro", 0, 1, 1, "greeting", False, "pleasantry"),
    ("intro-patient", "intro", 2, 7, 4, "opening", True, "the opening the brief asks for"),
    ("intro-consent", "intro", 8, 27, 1, "thanks", False, "thanks for filming; not information (consent to film is not consent to post)"),
    ("intro-typical", "intro", 35, 45, 5, "presents", True, "what a typical patient presents with: forehead and frown lines"),
    ("intro-frown", "intro", 53, 61, 3, "frown", False, "shows the frown line, but 'frown lines' is already said in intro-typical"),
    ("intro-dynamic", "intro", 66, 97, 5, "dynamic", True, "crow's feet; why: dynamic lines, seen when expressive; treated with a neuromodulator"),
    ("intro-brand", "intro", 98, 109, 2, "neuro-brand", False, "his product preference; promotional rather than explanatory"),
    ("intro-onset", "intro", 110, 129, 3, "neuro-brand", False, "faster onset, longer lasting: a product claim with no figure; cut for length"),
    ("intro-30y", "intro", 130, 156, 2, "neuro-brand", False, "experience and preference"),
    ("intro-lasts", "intro", 157, 163, 5, "neuro-lasts", True, "how long it lasts: four or five months (his figure)"),
    ("pre1-lasts", "pre1", 20, 27, 4, "neuro-lasts", False, "same figure, said before the intro; the intro take is in sequence and on the same shot"),
    ("intro-brows", "intro", 164, 195, 4, "neuro-technique", False, "too much in the forehead drops the brows; same point as the take he gives while injecting"),
    ("intro-elsewhere", "intro", 196, 229, 2, "neuro-technique", False, "anecdote about other clinics"),
    ("neuro-units", "neuro", 41, 58, 3, "neuro-technique", False, "units = the amount; setup for the next line"),
    ("neuro-strategic", "neuro", 59, 83, 4, "neuro-technique", False, "strategic placement for smoothing and brow lift; long with pauses"),
    ("neuro-more-less", "neuro", 84, 104, 5, "neuro-technique", True, "the technique in one line, said while injecting: more where it needs lift, less where it droops"),
    ("neuro-12h", "neuro", 105, 121, 4, "neuro-onset", False, "difference by tomorrow; conflicts in wording with 'a day or two', and lacks the filler contrast"),
    ("intro-onset-vs-filler", "intro", 463, 484, 5, "neuro-onset", True, "neuromodulator takes a day or two, filler shows right away: also why the after shows only the filler areas"),
    ("intro-midface", "intro", 230, 252, 4, "midface", True, "names the mid-face concerns: jowling, laugh lines"),
    ("intro-deflation", "intro", 253, 290, 5, "laugh-cause", True, "why laugh lines form: deflation and soft tissue moving down, not the line itself"),
    ("intro-ligaments", "intro", 291, 301, 3, "laugh-cause", False, "ligaments not holding the skin: the same cause, said again; cut for length"),
    ("inj5-laugh-filled", "inj5", 74, 99, 3, "laugh-cause", False, "patients want the laugh lines filled: duplicate of intro-deflation's first sentence"),
    ("intro-cheeks", "intro", 302, 315, 5, "target-cheeks", True, "what he targets: filler in the cheeks"),
    ("intro-rejuv", "intro", 316, 337, 3, "target-cheeks", False, "the principle (as opposed to where the patient points); cut for length, the next line carries it"),
    ("intro-cheekbones", "intro", 338, 344, 5, "target-cheeks-why", True, "v3: his 'instead' in one line: it's really more about addressing the cheekbones (the argument map's step 4)"),
    ("intro-hollow", "intro", 345, 364, 3, "laugh-cause", False, "deflation in the mid cheek: a third take of the cause"),
    ("intro-jaw-predict", "intro", 365, 377, 4, "jaw-lift", False, "a tiny amount lifts the jawline: the result is shown and said at the end (after-summary)"),
    ("intro-overfilled", "intro", 378, 443, 3, "natural", False, "patients fear looking overfilled; long; the after says 'not overfilled' again"),
    ("intro-plan", "intro", 444, 460, 1, "plan", False, "we'll show pictures afterwards: chatter"),
    ("inj2-syringe", "inj2", 7, 17, 5, "cheek-product", True, "the product and the amount: one syringe of Evolysse Form (v2: ends on 'Form'; 'into her outer cheekbone' has only 60 ms of silence after it, so it cannot be cut cleanly; the pop-up shows the spot)"),
    ("inj5-syringe", "inj5", 0, 38, 4, "cheek-product", False, "same syringe plus Cold-X / stable / structure: the brand claims are the weaker take"),
    ("inj2-jaw", "inj2", 22, 40, 4, "jaw-lift", False, "jaw raised vs the other side: the same result as after-summary"),
    ("inj2-heaviness", "inj2", 49, 67, 3, "jaw-lift", False, "heaviness lifted: a third take of the jaw lift"),
    ("inj2-replenish", "inj2", 92, 132, 3, "laugh-cause", False, "loss of volume replenished: the cause again, to the patient"),
    ("inj5-jaw", "inj5", 39, 73, 3, "jaw-lift", False, "fuller cheekbones, jaw raised, slimmer: the result before it is finished"),
    ("inj5-less-needed", "inj5", 100, 118, 5, "laugh-less", True, "the payoff of treating the cheeks: the laugh lines improved, so less filler goes in them"),
    ("after-less-needed", "after", 72, 92, 4, "laugh-less", False, "same point at the end; the inj5 take is in place in the story"),
    ("inj6-pinpricks", "inj6", 0, 11, 3, "cannula", False, "one entry point vs many: starts mid-sentence ('versus before')"),
    ("inj6-cannula", "inj6", 12, 25, 4, "cannula", False, "we use a cannula under the skin; the bruising line says why, which matters more"),
    ("inj6-bruising", "inj6", 26, 35, 5, "cannula", True, "technique and downtime: a cannula, to minimise bruising"),
    ("inj7-chin", "inj7", 21, 33, 3, "chin", False, "chin recession: named only here, never in the intro, so no area to anchor it to; cut for length"),
    ("after-smooth", "after", 155, 189, 5, "lines-product", True, "product handling for the lines: Evolysse Smooth, a hyaluronic acid in the same family, thinner than the cheek filler (v2: runs on to 'what I put here', because 'filling' has only 30 ms of silence after it)"),
    ("after-summary", "after", 6, 60, 5, "result", True, "the result named area by area: laugh lines and marionette lines, cheekbone projection, jawline, softer lines"),
    ("after-15min", "after", 64, 71, 5, "time", True, "treatment time: about 15 minutes"),
    ("after-collagen", "after", 107, 124, 3, "laugh-cause", False, "ageing: collagen and fat loss; a fourth take of the cause"),
    ("after-natural", "after", 125, 154, 3, "natural", False, "nice projection, natural, not overfilled: repeats the summary"),
    ("after-lasts", "after", 190, 206, 5, "filler-lasts", True, "how long the filler lasts: over a year, a year and a half"),
    ("after-patient", "after", 99, 106, 1, "patient", False, "her reaction; another voice, chatter"),
]

# the cut, grouped by area. picture = the clip on screen under the piece (B-roll when it is not the speaker's own clip)
ORDER = [
    ("S1", "Upper face", ["intro-patient", "intro-typical", "intro-dynamic", "neuro-more-less", "intro-lasts", "intro-onset-vs-filler"]),
    ("S2", "Cheeks and jawline", ["intro-midface", "intro-deflation", "intro-cheeks", "intro-cheekbones", "inj2-syringe"]),
    ("S3", "Laugh lines", ["inj5-less-needed", "after-smooth", "inj6-bruising"]),
    ("S4", "The result", ["after-summary", "after-15min", "after-lasts"]),
]
PICTURE = {"after-smooth": ("inj5", 16.0),  # his voice over her close-up from the same session (he is off camera there: no lip-sync)
           "intro-patient": ("inj3", 8.0)}  # v2 hook: the opening line plays over the needle at her cheek (IMG_3650 0:08, otherwise unused)
# v2: a sub-piece's own picture (B-roll that changes the shot inside a line, so the last third keeps its pace)
SUB_PICTURE = {}
INJECTION = {  # area -> (piece where the injection footage appears, how)
    "S1": ("intro-dynamic", "pip: IMG_3657 (neuro) 0:09, the frown injection, at her glabella"),
    "S1b": ("neuro-more-less", "full frame: IMG_3657 1:37, injecting the crow's feet, his line said while injecting"),
    "S2": ("inj2-syringe", "pip: IMG_3641 (inj1) 0:06, the cheek injection, at her outer cheekbone"),
    "S3": ("after-smooth", "pip: IMG_3653 (inj6) cannula, at her laugh line; morphs into the full-frame bruising line"),
}
# v2: picture-only cuts inside a line (audio continuous, no fade): (word index where the new picture starts, role, source second)
# picture-only cuts inside a line (audio continuous, no fade). Each: (word index where the new picture starts, {role, from, punch, anchor}).
# role None = the same shot continuing; punch = scale; anchor = (track role, landmark) the punch centres on (her face, never his).
PICTURE_SPLITS = {
    "intro-typical": [(41, {"role": "neuro", "from": 33.6, "punch": 2.4, "anchor": ("neuro", "forehead")}),   # glossary: "forehead lines" on her raised brows
                      (44, {"role": "neuro", "from": 4.6, "punch": 2.4, "anchor": ("neuro", "glabella")})],   # glossary: "frown lines" on her frown
    "intro-dynamic": [(73, {"role": None, "punch": 2.0, "anchor": ("intro", "crowR")}),                        # glossary: "crow's feet" on her smile
                      (75, {"role": None, "punch": 1.0})],
    "intro-midface": [(244, {"role": None, "punch": 2.0, "anchor": ("intro", "jawR")})],                      # glossary: "jowling" on her jaw
    "after-summary": [(19, {"role": "inj7", "from": 28.0}),     # "her laugh lines being deep": the cannula at her laugh lines (IMG_3654 0:28)
                      (31, {"role": "after", "from": 24.6}),    # "what we call marionette lines": her 4:55 close-up (steady from 24.6 s)
                      (36, {"role": "after", "from": 40.0})],   # the before/after opens: the wide shot, soft behind the card
    "inj6-bruising": [(34, {"role": None, "punch": 1.12})],      # a stepped punch-in on "minimize bruising" (DDOS f1016-1026)
    # the 25 s without a picture change (REELS_HOW_I_WOULD_BUILD: 0:22-0:47): picture-only B-roll from the same visit, one per idea
    "intro-onset-vs-filler": [(478, {"role": "inj2", "from": 25.0})],   # "with fillers, you see it right away": a filler injection (IMG_3642 0:25)
    "intro-deflation": [(257, {"role": "pre2", "from": 5.0}),            # "patients come in saying they want their laugh lines filled": her with the hand mirror, before
                        (267, {"role": None, "punch": 1.0}),             # "but really, the source": back on him
                        (280, {"role": "pre1", "from": 10.0})],          # "deflation": him assessing her cheek and chin, before treatment (IMG_3637 0:10)
}


# cue words: [piece, word index in that role's words, frame offset]
CUES = {
    "typical": ["intro-typical", 36], "patient2": ["intro-typical", 37], "forehead": ["intro-typical", 41], "frown": ["intro-typical", 44],
    "dynamic": ["intro-dynamic", 80], "pip1out": ["intro-dynamic", 97, 4],
    "lifted": ["neuro-more-less", 95], "drooping": ["neuro-more-less", 104],
    "four": ["intro-lasts", 160], "five": ["intro-lasts", 162],
    "day": ["intro-onset-vs-filler", 472], "away": ["intro-onset-vs-filler", 484],
    "deflation": ["intro-deflation", 280], "moving": ["intro-deflation", 289],
    "filled": ["intro-deflation", 266], "but": ["intro-deflation", 267], "cheeks": ["intro-cheeks", 315], "cheekbones": ["intro-cheekbones", 344],
    "crows": ["intro-dynamic", 73], "these": ["intro-dynamic", 75], "jowling": ["intro-midface", 244], "neuromod": ["intro-dynamic", 97],
    "marionette": ["after-summary", 34], "softer": ["after-summary", 60],
    "literally": ["inj2-syringe", 8], "pip2out": ["inj2-syringe", 17, 10],
    "laugh3": ["inj5-less-needed", 105], "better3": ["inj5-less-needed", 108],
    "used": ["after-smooth", 156], "bruising": ["inj6-bruising", 34], "cannula": ["inj6-bruising", 30],
    "ba": ["after-summary", 36], "cheek": ["after-summary", 44], "jaw": ["after-summary", 48], "laugh": ["after-summary", 55], "mario": ["after-summary", 34],
    "treatment": ["after-15min", 65], "fifteen": ["after-15min", 68], "year": ["after-lasts", 201],
}
PIPS = [  # the injection on the exact spot he names, anchored to her face on the picture under the line
    {"n": 1, "cue": "dynamic", "out": "pip1out", "anchorRole": "intro", "key": "glabella", "clip": "neuro", "clipFrom": 9.0,
     "label": "Frown lines (dynamic)", "depth": [2, "Into the muscle"], "eyebrow": "Injection 1 · neuromodulator · used here", "focus": {"fx": 0.8, "fy": 0.44, "z": 2.2}, "box": {"x": 98, "y": 865, "w": 320, "h": 569}},  # bottom-left: under his face
    {"n": 2, "cue": "literally", "out": "pip2out", "anchorRole": "inj2", "key": "cheekL", "clip": "inj1", "clipFrom": 6.0,
     "label": "Outer cheekbone", "depth": [2, "Deep, over the bone"], "eyebrow": "Injection 2 · Evolysse Form", "focus": {"fx": 0.55, "fy": 0.52, "z": 2.0}, "box": {"x": 98, "y": 865, "w": 320, "h": 569}},
    {"n": 3, "cue": "used", "out": "start:inj6-bruising", "morphTo": "inj6-bruising", "anchorRole": "inj5", "key": "nasoL", "clip": "inj6",
     "label": "Laugh lines", "depth": [1, "Under the skin, by cannula"], "eyebrow": "Injection 3 · Evolysse Smooth", "arrow": "straight-pointer", "focus": {"fx": 0.5, "fy": 0.35, "z": 1.6}, "box": {"x": 682, "y": 901, "w": 300, "h": 533}},  # her close-up: clear of her face
]
# Before = IMG_3637 (4:42 PM, before any injection) at 16.8 s; after = IMG_3656 (4:55 PM) at 12.2 s, aligned (pose diff 6.5 deg yaw,
# residual 2.6 px). The intro (4:44) has her turned ~30 deg toward him in every frame, so it cannot give a same-angle pair (DECISIONS 16).
# Regions: only where a change is visible AND measured (research/ostad/style/oct14/ARROWS.md): the image-left cheekbone. The crop is
# her face (face box x 85-304, y 747-998 of 1080x1920) with room round it.
BA = {"cue": "ba", "out": "end", "pull": "treatment", "crop": {"x": 0.02, "y": 0.305, "w": 0.32}, "subs": ["Before · 4:42 PM", "After · 4:55 PM"],
      "regions": [{"id": "cheekbone", "label": "Fuller cheek", "cue": "cheek", "key": "cheekL", "rx": 46, "ry": 38, "zoom": 1.35}]}
# v3: the surgeon's markup on the aligned before frame (IMG_3637 4:42 PM), from research/ostad/style/oct14/marks.json (every tick is a
# measured tip, carried through her landmarks; ARROWS.md). Order = the order he treated: cheeks (16:47-16:50), lower face (16:51-16:55),
# neuromodulator (16:57). Zones and paths use her landmarks on the before frame (pair.json pts_before).
def surgeon():
    mk = {m["id"]: m for m in json.loads((OUT / "marks.json").read_text(encoding="utf-8"))["marks"]}
    pb = json.loads((EDIT / "pair.json").read_text())["pts_before"]
    xy = lambda i: mk[i]["before_xy"]
    order = {"cheekR-d": 0, "cheekR-a": 0, "cheekR-c": 1, "cheekL": 2, "lowerR": 3, "chin": 4, "jawL": 5, "crowL": 7}
    marks = [{"id": i, "xy": xy(i), "product": mk[i]["product"], "order": o} for i, o in order.items() if i in mk]
    zones = [
        {"id": "cheekR", "c": [130, 882], "rx": 42, "ry": 28, "rot": -15, "product": "Evolysse Form", "order": 1},
        {"id": "cheekL", "c": xy("cheekL"), "rx": 13, "ry": 28, "rot": 0, "product": "Evolysse Form", "order": 2},
        {"id": "laughR", "c": [196, 928], "rx": 13, "ry": 32, "rot": -25, "product": "Evolysse Smooth", "order": 4},
        {"id": "marioL", "c": [287, 962], "rx": 11, "ry": 30, "rot": 10, "product": "Evolysse Smooth", "order": 5},
        {"id": "glabella", "c": pb["glabella"], "rx": 16, "ry": 12, "rot": 0, "product": "Neuromodulator", "order": 6},
        {"id": "forehead", "c": [pb["forehead"][0], pb["forehead"][1] + 4], "rx": 46, "ry": 13, "rot": -6, "product": "Neuromodulator", "order": 6},
        {"id": "crowL", "c": xy("crowL"), "rx": 9, "ry": 15, "rot": 0, "product": "Neuromodulator", "order": 7},
    ]
    paths = [{"pts": [xy("lowerR"), pb["nasoL"]], "order": 3}, {"pts": [xy("chin"), pb["marioL"]], "order": 4}, {"pts": [xy("jawL"), pb["marioR"]], "order": 5}]
    labels = [{"text": "Evolysse Form · 1 syringe", "xy": [128, 832], "order": 1}, {"text": "Evolysse Smooth · cannula", "xy": [176, 984], "order": 4},
              {"text": "Neuromodulator", "xy": [232, 733], "order": 6}]
    # the one measured AND visible change (ARROWS.md): her right cheek (image left) fuller; volume up = a headed arrow outward
    gains = [{"from": [168, 940], "to": [126, 896], "label": "Fuller cheek", "labelXY": [150, 968]}]
    return {"cue": "ba", "wipe": "jaw", "out": "end", "crop": {"x": 0.017, "y": 0.3646, "w": 0.327}, "box": {"x": 40, "y": 500, "w": 1000, "h": 840},
            "subs": ["Before · 4:42 PM", "After · 4:55 PM"], "marks": marks, "zones": zones, "paths": paths, "labels": labels, "gains": gains,
            "notes": [{"text": "Laugh lines: softer, he says. This photo angle cannot measure it, so no arrow.", "cue": "softer"},
                      {"text": "Neuromodulator: shows in a day or two (his words).", "cue": "treatment"}]}


SFX = [{"cue": "dynamic", "name": "pop"}, {"cue": "ba", "name": "swish"}, {"cue": "treatment", "name": "yes"}]
HIDE = [["start:intro-typical", "end:intro-typical"]]  # the title carries his words there


def main():
    by = {c[0]: c for c in C}
    pieces, kept_text, cuts, refused_all, left = [], [], [], {}, []
    for sid, title, ids in ORDER:
        for pid in ids:
            _, role, a, b, score, point, keep, reason = by[pid]
            assert keep, pid
            parts, refused = subspans(pid, role, a, b)
            if refused:
                refused_all[pid] = refused
            for k, (pa, pb) in enumerate(parts):
                f, t = span(role, pa, pb)
                g0, g1 = gap_before(role, pa), gap_after(role, pb)
                if g0 < MIN_GAP or g1 < MIN_GAP:
                    raise SystemExit(f"{pid} part {k}: a cut point has only {min(g0, g1) * 1000:.0f} ms of silence (needs 80 ms)")
                cuts.append({"piece": pid + (f"~{k + 1}" if k else ""), "in_gap_ms": round(g0 * 1000), "out_gap_ms": round(g1 * 1000), "in_s": f, "out_s": t})
                pr, pf = PICTURE.get(pid, (role, f))
                if pid in PICTURE and k:
                    pf = PICTURE[pid][1] + (f - span(role, parts[0][0], parts[0][1])[0])
                pc = {"id": pid + (f"~{k + 1}" if k else ""), "line": pid, "section": sid, "role": role, "from": f, "to": t, "pictureRole": pr, "pictureFrom": pf,
                      "punch": 1.1 if k % 2 == 1 else 1.0}  # a micro-cut inside a shot is covered by a punch-in, alternating 1.0 / 1.1
                pc.update(SUB_PICTURE.get(pc["id"], {}))
                splits = [x for x in PICTURE_SPLITS.get(pid, []) if pa < x[0] <= pb]
                for wi, sp in splits:  # audio stays one continuous span: the mix joins contiguous pieces without a fade
                    t = round(W[role][wi]["t0"] - 0.02, 3)
                    pieces.append({**pc, "to": t})
                    same = sp.get("role") is None
                    pf = round(pc["pictureFrom"] + (t - pc["from"]), 3) if same else sp["from"]
                    pc = {**pc, "id": pc["id"] + "/b", "from": t, "pictureRole": pc["pictureRole"] if same else sp["role"], "pictureFrom": pf,
                          "punch": sp.get("punch", 1.0), "audioJoin": True, "keepPunch": True}
                    pc.pop("punchO", None)
                    if sp.get("anchor"):
                        tr = json.loads((EDIT / "tracks.json").read_text())[sp["anchor"][0]]["pts"][sp["anchor"][1]]
                        q = tr[min(len(tr) - 1, int(round((pf + 0.5) * 24)))]
                        pc["punchO"] = [round(q[0] / 1080, 3), round(q[1] / 1920, 3)]
                pieces.append(pc)
            kept_text.append((pid, " ".join(text(role, pa, pb) for pa, pb in parts)))
            applied = [d for d in DROPS.get(pid, []) if not any(r[0] == d[0] for r in refused)]
            left += [{"line": pid, "word": i, "what": w} for i, w in fillers(role, a, b, applied)]
    # v2: two lines that are one continuous stretch of the same clip (the next starts where the last ended) are joined, not cut:
    # no audio fade, no picture jump
    for i in range(1, len(pieces)):
        a, c = pieces[i - 1], pieces[i]
        if a["line"] != c["line"] and a["role"] == c["role"] and a["pictureRole"] == c["pictureRole"] and abs(c["from"] - a["to"]) < 0.35 and c["pictureFrom"] == c["from"]:
            mid = round((a["to"] + c["from"]) / 2, 3)
            a["to"], c["from"], c["pictureFrom"], c["audioJoin"] = mid, mid, mid, True
    # v2: every jump inside one shot (the same picture clip, a later or earlier source time) alternates the punch-in 1.0 / 1.1, so no
    # jump cut on his face is left uncovered (coordinator rule 2); a change of clip is a real cut and resets to 1.0
    for i, pc in enumerate(pieces):
        prev = pieces[i - 1] if i else None
        if prev and pc.get("audioJoin"):
            if pc.get("keepPunch"):
                continue
            if pc["pictureRole"] == prev["pictureRole"] and pc.get("pictureFrom") == pc["from"]:
                pc["punch"] = prev["punch"]  # a continuous join keeps the frame
            continue
        if prev and prev["pictureRole"] == pc["pictureRole"]:
            pc["punch"] = 1.0 if prev["punch"] > 1.0 else 1.1
        else:
            pc["punch"] = 1.0
    raw = sum(p["to"] - p["from"] for p in pieces)
    runtime = raw / SPEED + TAIL / FPS
    # duplicates among the kept spans
    norm = lambda s: re.sub(r"[^a-z ]", "", s.lower()).split()
    tri = lambda s: {tuple(norm(s)[i:i + 3]) for i in range(max(0, len(norm(s)) - 2))}
    dups = []
    for (i1, s1), (i2, s2) in itertools.combinations(kept_text, 2):
        r = difflib.SequenceMatcher(None, norm(s1), norm(s2)).ratio()
        j = len(tri(s1) & tri(s2)) / max(1, len(tri(s1) | tri(s2)))
        dups.append({"a": i1, "b": i2, "ratio": round(r, 3), "trigram_jaccard": round(j, 3)})
    worst = max(dups, key=lambda d: (d["ratio"], d["trigram_jaccard"]))
    dup_fail = [d for d in dups if d["ratio"] > 0.6 or d["trigram_jaccard"] > 0.25]
    # duplicate map: every point, every place he says it, the chosen take
    dmap = {}
    for cid, role, a, b, score, point, keep, reason in C:
        f, t = span(role, a, b)
        dmap.setdefault(point, []).append({"id": cid, "clip": CLIP[role], "at": f"{int(f // 60)}:{f % 60:05.2f}", "score": score, "chosen": keep, "reason": reason})
    # adjacency: the injection footage is on screen in the same piece as the line, or the next one
    order_ids = [p["id"] for p in pieces]
    adj = {k: {"piece": v[0], "how": v[1], "beats_from_line": 0} for k, v in INJECTION.items()}
    plan = {"speed": SPEED, "raw_s": round(raw, 2), "runtime_s": round(runtime, 2), "target_s": [85, 95], "pieces": len(pieces),
            "cuts": cuts, "min_cut_gap_ms": min(min(c["in_gap_ms"], c["out_gap_ms"]) for c in cuts), "micro_cuts": {k: v for k, v in DROPS.items()},
            "micro_cuts_refused": refused_all, "fillers_left": left,
            "duplicates": {"pairs": len(dups), "max_ratio": worst, "fails": dup_fail}, "adjacency": adj, "order": order_ids,
            "ranking": [{"id": c[0], "clip": CLIP[c[1]], "score": c[4], "point": c[5], "kept": c[6], "reason": c[7], "dur_s": round(span(c[1], c[2], c[3])[1] - span(c[1], c[2], c[3])[0], 2)} for c in C],
            "duplicate_map": dmap}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "plan.json").write_text(json.dumps(plan, indent=1), encoding="utf-8")
    cut = json.loads((OUT / "cut.json").read_text(encoding="utf-8")) if (OUT / "cut.json").exists() else {}
    cut.update({"speed": SPEED, "tail": TAIL, "pieces": pieces, "cues": CUES, "pips": PIPS, "ba": BA, "surgeon": surgeon(),
                "sfx": SFX, "hideCaps": HIDE})
    (OUT / "cut.json").write_text(json.dumps(cut, indent=1), encoding="utf-8")
    print(f"raw {raw:.1f} s -> {runtime:.1f} s at {SPEED}x incl. {TAIL / FPS:.0f} s end card; pieces {len(pieces)}")
    print("min cut gap", plan["min_cut_gap_ms"], "ms; refused micro-cuts", refused_all, "; fillers left", left)
    print("max similarity:", worst, "| fails:", len(dup_fail))
    for pid, t in kept_text:
        print(f"  {pid:24s} {t}")


if __name__ == "__main__":
    main()
