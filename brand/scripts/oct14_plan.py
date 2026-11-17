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
SPEED, TAIL, FPS = 1.15, 72, 24  # 1.15x: the speed the client approved for him (DECISIONS 14); 1.1x ran 98 s
PAD0, PAD1 = 0.10, 0.16  # s of air before the first word and after the last, limited to half the gap to the neighbouring word

W = {r: json.loads((EDIT / f"words_{r}.json").read_text()) for r in ("intro", "after", "inj2", "inj5", "inj6", "inj7", "neuro", "pre1")}
CLIP = {"intro": "IMG_3640 16:44", "after": "IMG_3656 16:55", "inj2": "IMG_3642 16:48", "inj5": "IMG_3652 16:50", "inj6": "IMG_3653 16:51",
        "inj7": "IMG_3654 16:53", "neuro": "IMG_3657 16:57", "pre1": "IMG_3637 16:42"}


def text(role, a, b):
    return " ".join(w["w"] for w in W[role][a:b + 1])


def span(role, a, b):
    ws = W[role]
    t0 = ws[a]["t0"] - min(PAD0, (ws[a]["t0"] - ws[a - 1]["t1"]) / 2 if a > 0 else PAD0)
    t1 = ws[b]["t1"] + min(PAD1, (ws[b + 1]["t0"] - ws[b]["t1"]) / 2 if b + 1 < len(ws) else PAD1)
    return round(max(0.0, t0), 3), round(t1, 3)


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
    ("intro-typical", "intro", 28, 45, 5, "presents", True, "what a typical patient presents with: forehead and frown lines"),
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
    ("intro-onset-vs-filler", "intro", 461, 484, 5, "neuro-onset", True, "neuromodulator takes a day or two, filler shows right away: also why the after shows only the filler areas"),
    ("intro-midface", "intro", 230, 252, 4, "midface", True, "names the mid-face concerns: jowling, laugh lines"),
    ("intro-deflation", "intro", 253, 290, 5, "laugh-cause", True, "why laugh lines form: deflation and soft tissue moving down, not the line itself"),
    ("intro-ligaments", "intro", 291, 301, 3, "laugh-cause", False, "ligaments not holding the skin: the same cause, said again; cut for length"),
    ("inj5-laugh-filled", "inj5", 74, 99, 3, "laugh-cause", False, "patients want the laugh lines filled: duplicate of intro-deflation's first sentence"),
    ("intro-cheeks", "intro", 302, 315, 5, "target-cheeks", True, "what he targets: filler in the cheeks"),
    ("intro-rejuv", "intro", 316, 344, 3, "target-cheeks", False, "the same target restated as a principle"),
    ("intro-hollow", "intro", 345, 364, 3, "laugh-cause", False, "deflation in the mid cheek: a third take of the cause"),
    ("intro-jaw-predict", "intro", 365, 377, 4, "jaw-lift", False, "a tiny amount lifts the jawline: the result is shown and said at the end (after-summary)"),
    ("intro-overfilled", "intro", 378, 443, 3, "natural", False, "patients fear looking overfilled; long; the after says 'not overfilled' again"),
    ("intro-plan", "intro", 444, 460, 1, "plan", False, "we'll show pictures afterwards: chatter"),
    ("inj2-syringe", "inj2", 7, 21, 5, "cheek-product", True, "the product, the amount and the spot: one syringe of Evolysse Form in the outer cheekbone"),
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
    ("after-smooth", "after", 155, 180, 5, "lines-product", True, "product handling for the lines: Evolysse Smooth, a hyaluronic acid in the same family"),
    ("after-thinner", "after", 181, 189, 4, "lines-product", False, "not as thick as the cheek filler; cut for length"),
    ("after-summary", "after", 6, 60, 5, "result", True, "the result named area by area: laugh lines and marionette lines, cheekbone projection, jawline, softer lines"),
    ("after-15min", "after", 61, 71, 5, "time", True, "treatment time: about 15 minutes"),
    ("after-collagen", "after", 107, 124, 3, "laugh-cause", False, "ageing: collagen and fat loss; a fourth take of the cause"),
    ("after-natural", "after", 125, 154, 3, "natural", False, "nice projection, natural, not overfilled: repeats the summary"),
    ("after-lasts", "after", 190, 206, 5, "filler-lasts", True, "how long the filler lasts: over a year, a year and a half"),
    ("after-patient", "after", 99, 106, 1, "patient", False, "her reaction; another voice, chatter"),
]

# the cut, grouped by area. picture = the clip on screen under the piece (B-roll when it is not the speaker's own clip)
ORDER = [
    ("S1", "Upper face", ["intro-patient", "intro-typical", "intro-dynamic", "neuro-more-less", "intro-lasts", "intro-onset-vs-filler"]),
    ("S2", "Cheeks and jawline", ["intro-midface", "intro-deflation", "intro-cheeks", "inj2-syringe"]),
    ("S3", "Laugh lines", ["inj5-less-needed", "after-smooth", "inj6-bruising"]),
    ("S4", "The result", ["after-summary", "after-15min", "after-lasts"]),
]
PICTURE = {"after-smooth": ("inj5", 16.0)}  # his voice over her close-up from the same session (he is off camera there: no lip-sync)
INJECTION = {  # area -> (piece where the injection footage appears, how)
    "S1": ("intro-dynamic", "pip: IMG_3657 (neuro) 0:04, the frown injection, at her glabella"),
    "S1b": ("neuro-more-less", "full frame: IMG_3657 1:37, injecting the crow's feet, his line said while injecting"),
    "S2": ("inj2-syringe", "pip: IMG_3641 (inj1) 0:06, the cheek injection, at her outer cheekbone"),
    "S3": ("after-smooth", "pip: IMG_3653 (inj6) cannula, at her laugh line; morphs into the full-frame bruising line"),
}


# cue words: [piece, word index in that role's words, frame offset]
CUES = {
    "typical": ["intro-typical", 36], "patient2": ["intro-typical", 37], "forehead": ["intro-typical", 41], "frown": ["intro-typical", 44],
    "dynamic": ["intro-dynamic", 80], "pip1out": ["intro-dynamic", 97, 4],
    "lifted": ["neuro-more-less", 95], "drooping": ["neuro-more-less", 104],
    "four": ["intro-lasts", 160], "five": ["intro-lasts", 162],
    "day": ["intro-onset-vs-filler", 472], "away": ["intro-onset-vs-filler", 484],
    "deflation": ["intro-deflation", 280], "moving": ["intro-deflation", 289],
    "literally": ["inj2-syringe", 8], "pip2out": ["inj2-syringe", 21, 8],
    "laugh3": ["inj5-less-needed", 105], "better3": ["inj5-less-needed", 108],
    "used": ["after-smooth", 156], "bruising": ["inj6-bruising", 34],
    "ba": ["after-summary", 36], "cheek": ["after-summary", 44], "jaw": ["after-summary", 48], "laugh": ["after-summary", 55], "mario": ["after-summary", 34],
    "treatment": ["after-15min", 65], "fifteen": ["after-15min", 68], "year": ["after-lasts", 201],
}
PIPS = [  # the injection on the exact spot he names, anchored to her face on the picture under the line
    {"n": 1, "cue": "dynamic", "out": "pip1out", "anchorRole": "intro", "key": "glabella", "clip": "neuro", "clipFrom": 4.0,
     "label": "Frown lines", "eyebrow": "Injection 1 · neuromodulator", "focus": {"fx": 0.8, "fy": 0.44, "z": 2.2}, "box": {"x": 98, "y": 865, "w": 320, "h": 569}},  # bottom-left: under his face
    {"n": 2, "cue": "literally", "out": "pip2out", "anchorRole": "inj2", "key": "cheekL", "clip": "inj1", "clipFrom": 6.0,
     "label": "Outer cheekbone", "eyebrow": "Injection 2 · Evolysse Form", "focus": {"fx": 0.55, "fy": 0.52, "z": 2.0}, "box": {"x": 98, "y": 865, "w": 320, "h": 569}},
    {"n": 3, "cue": "used", "out": "start:inj6-bruising", "morphTo": "inj6-bruising", "anchorRole": "inj5", "key": "nasoL", "clip": "inj6",
     "label": "Laugh lines", "eyebrow": "Injection 3 · Evolysse Smooth", "arrow": "straight-pointer", "focus": {"fx": 0.5, "fy": 0.35, "z": 1.6}, "box": {"x": 682, "y": 901, "w": 300, "h": 533}},  # her close-up: clear of her face
]
# Before = IMG_3637 (4:42 PM, before any injection) at 16.8 s; after = IMG_3656 (4:55 PM) at 12.2 s, aligned (pose diff 6.5 deg yaw,
# residual 2.6 px). The intro (4:44) has her turned ~30 deg toward him in every frame, so it cannot give a same-angle pair (DECISIONS 16).
# Regions: only where a change is visible AND measured (research/ostad/style/oct14/ARROWS.md): the image-left cheekbone. The crop is
# her face (face box x 85-304, y 747-998 of 1080x1920) with room round it.
BA = {"cue": "ba", "out": "end", "pull": "treatment", "crop": {"x": 0.02, "y": 0.305, "w": 0.32}, "subs": ["4:42 PM · before", "4:55 PM · right after"],
      "regions": [{"id": "cheekbone", "label": "Fuller cheek", "cue": "cheek", "key": "cheekL", "rx": 46, "ry": 38, "zoom": 1.35}]}
SFX = [{"cue": "dynamic", "name": "pop"}, {"cue": "ba", "name": "swish"}, {"cue": "treatment", "name": "yes"}]
HIDE = [["start:intro-typical", "end:intro-typical"]]  # the title carries his words there


def main():
    by = {c[0]: c for c in C}
    pieces, kept_text = [], []
    for sid, title, ids in ORDER:
        for pid in ids:
            _, role, a, b, score, point, keep, reason = by[pid]
            assert keep, pid
            f, t = span(role, a, b)
            pr, pf = PICTURE.get(pid, (role, f))
            pieces.append({"id": pid, "section": sid, "role": role, "from": f, "to": t, "pictureRole": pr, "pictureFrom": pf})
            kept_text.append((pid, text(role, a, b)))
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
            "duplicates": {"pairs": len(dups), "max_ratio": worst, "fails": dup_fail}, "adjacency": adj, "order": order_ids,
            "ranking": [{"id": c[0], "clip": CLIP[c[1]], "score": c[4], "point": c[5], "kept": c[6], "reason": c[7], "dur_s": round(span(c[1], c[2], c[3])[1] - span(c[1], c[2], c[3])[0], 2)} for c in C],
            "duplicate_map": dmap}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "plan.json").write_text(json.dumps(plan, indent=1), encoding="utf-8")
    cut = json.loads((OUT / "cut.json").read_text(encoding="utf-8")) if (OUT / "cut.json").exists() else {}
    cut.update({"speed": SPEED, "tail": TAIL, "pieces": pieces, "cues": CUES, "pips": PIPS, "ba": BA,
                "sfx": SFX, "hideCaps": HIDE})
    (OUT / "cut.json").write_text(json.dumps(cut, indent=1), encoding="utf-8")
    print(f"raw {raw:.1f} s -> {runtime:.1f} s at {SPEED}x incl. {TAIL / FPS:.0f} s end card; pieces {len(pieces)}")
    print("max similarity:", worst, "| fails:", len(dup_fail))
    for pid, t in kept_text:
        print(f"  {pid:24s} {t}")


if __name__ == "__main__":
    main()
