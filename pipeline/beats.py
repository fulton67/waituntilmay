"""The seven-beat arc: an authored assemblage, not a randomiser.

The piece used to draw phrases at random inside a five-beat shape, which
meant the same beat could be about anything that matched a regex and the
order of the argument was whatever the draw happened to say. This replaces
that with seven fixed beats, in one order, every version:

    1  claim     the internet is a real place                     blum
    2  place     a building, a landing station, a ship, a cable    blum
    3  control   many-to-many, points of control, centralising     swartz
    4  break     the Red Sea cables, cut                           Red Sea clips
    5  who       not proxies, their own history, Yemen             lackner
    6  doubt     not a series of tubes / no internet to know       blum
    7  return     beat 1 again, in another take                     blum

Which source speaks in which beat is part of the arc rather than a weighted
draw, because the argument only works if it is those voices in that order:
Blum asserting a place, Swartz naming who controls it, the news reporting it
severed, Lackner saying who did it and why that framing is wrong, Blum
doubting his own claim, and then the claim again - differently - after the
doubt.

A version is therefore one pick per beat. The pool each beat picks from is
`config/beats.json`, written by scripts/build_beats.py and meant to be read
and edited by hand: every entry is one source, one contiguous `in`/`out`, and
the words that come out of it. Nothing in the render re-derives the pool, so
editing that file edits the piece.
"""
import json
import os
import re

FPS = 24
TARGET_SECONDS = 30.0
OUT_FRAMES = int(round(TARGET_SECONDS * FPS))        # 720

# Seven slots over 720 frames. 720/7 = 102.857, so they cannot all be equal;
# six get 103 frames and the last gets 102. The pool band is capped at 4.25s
# (102 frames) rather than 4.3s so that every pick in every pool fits every
# slot, and no slot ever needs to clip a word to make room.
SLOT_FRAMES = [103, 103, 103, 103, 103, 103, 102]
assert sum(SLOT_FRAMES) == OUT_FRAMES

# Where each beat starts, in output frames: 0 103 206 309 412 515 618
SLOT_START = [sum(SLOT_FRAMES[:i]) for i in range(len(SLOT_FRAMES))]

# The duration band a candidate has to sit in. The floor is what a viewer
# needs to place a voice and a face; the ceiling is one slot.
BAND = (2.0, 4.25)

# The two cuts that mosh, named by the beat they land on. Everything else is
# a clean cut. See pipeline/mosh_cuts.py.
MOSH_BEATS = (4, 5)

CONFIG = "config/beats.json"

# The Red Sea pool: beat 4 may come from any of them, and the pool builder
# caps how many entries any single clip contributes so one channel cannot own
# the beat.
RED_SEA = ["houthi-01", "houthi-02", "houthi-03", "houthi-05", "houthi-06",
           "houthi-07", "houthi-10", "houthi-11", "houthi-13", "houthi-14",
           "houthi-15", "houthi-16", "houthi-17", "houthi-18", "houthi-19"]


# --------------------------------------------------------------- the arc
# `strong` is the thing itself and `weak` is the vocabulary around it; a
# candidate needs one of either to be in the pool, and a strong match scores
# above a weak one so the pool's top is the real line rather than the merely
# adjacent one. `never` removes a match that belongs to a different beat:
# "it's not something you can dump something on. It's a series of tubes" says
# tubes, but it is Stevens being quoted to be laughed at, which is beat 6.
ARC = [
    dict(
        n=1, name="claim",
        says="the internet is a real place / tubes / cables under the water",
        sources=["blum"],
        strong=[r"real place", r"absolutely real", r"series of tubes",
                r"\bcopper tube", r"made of places", r"physical reality",
                r"cables? under (the )?(water|sea|ocean)",
                r"under the (water|ocean|sea)", r"\bphysical internet"],
        weak=[r"physical connection", r"physical process", r"it'?s physical",
              r"\btangible", r"\bphysical\b", r"\bmade of\b",
              r"\ba place\b", r"places like this"],
        never=[r"not a series of tubes", r"not a big truck",
               r"not something you can", r"less physical", r"\babsurd",
               r"not as a place", r"I focus on", r"I use that term"],
    ),
    dict(
        n=2, name="place",
        says="physical: building, landing station, ship, sea, cable",
        sources=["blum"],
        strong=[r"landing station", r"\bcables?\b", r"fiber optic",
                r"fibre optic", r"\bmanhole", r"\bconduit", r"cable ship",
                r"\bbeach\b", r"\bshore\b", r"transatlantic"],
        weak=[r"\bbuilding", r"\bship\b", r"\bsea\b", r"\bocean",
              r"data cent", r"\bwarehouse", r"\bvault\b", r"\bduct\b",
              r"\bwire\b", r"\bfiber\b", r"\bfibre\b", r"\bisland",
              r"\bcoast", r"\bport\b"],
        never=[],
    ),
    dict(
        n=3, name="control",
        says="many-to-many, points of control, search, centralizing",
        sources=["swartz"],
        strong=[r"many.to.many", r"points? of control", r"\bcontrol\b",
                r"centrali[sz]", r"\bgatekeep", r"license to speak",
                r"who gets (heard|control)", r"power away", r"distribute it"],
        weak=[r"\bbroadcast", r"\bserver\b", r"distributed network",
              r"\bairwaves", r"every computer", r"collaborative filtering",
              r"no distinction", r"\bsearch\b", r"\bconglomerate",
              r"architecture of", r"who gets", r"\bmonopol", r"\bcensor"],
        never=[],
    ),
    dict(
        n=4, name="break",
        says="Red Sea cables cut, outage, attack, strike",
        sources=RED_SEA,
        strong=[r"cables? (were |have been |was |should be )?(cut|damaged|severed)",
                r"cut (the |those |undersea |internet )?cables?",
                r"\bsever(ed|ing)?\b", r"\boutage", r"cable cut",
                r"cable cutting", r"cut undersea", r"attack the cables?"],
        weak=[r"\battack", r"\bstrike\b", r"\bdisrupt", r"\bdamag",
              r"\bsabotage", r"went down", r"\bsnag\b", r"\bsnapped",
              r"\bthreat", r"\bRed Sea"],
        never=[],
    ),
    dict(
        n=5, name="who",
        says="not proxies, their own history, Yemen",
        sources=["lackner"],
        strong=[r"not Iranian prox", r"not Iranian servants", r"\bprox(y|ies)",
                r"their own (history|agenda|interests|reasons)",
                r"what the Iranians tell", r"as Iran says"],
        weak=[r"\bYemen", r"\bHouthi", r"\bIran", r"\bhistory\b", r"\bZaidi",
              r"Ansar Allah", r"\bdomestic", r"\balliance", r"\bsect",
              r"\bmovement\b"],
        # Democracy Now's own framing - the headline read at the top, the
        # host's introduction, the guest's bibliography - describes the
        # programme, not who the Houthis are. It matched on `Yemen` and
        # `Houthi` and took half the pool.
        never=[r"we'?re joined by", r"the author of", r"several books",
               r"Yemen in Crisis", r"Road to War", r"Poverty and Conflict",
               r"involved with Yemen for", r"military spokesperson",
               r"\bairstrikes\b", r"on Wednesday"],
    ),
    dict(
        n=6, name="doubt",
        says='"series of tubes" negation, or no internet to know if '
             "the internet's broken",
        sources=["blum"],
        strong=[r"not a series of tubes", r"no internet to know",
                r"internet'?s broken", r"internet breaks",
                r"\bamorphous blob", r"not a big truck",
                r"not something you can"],
        weak=[r"\binvisible", r"\btranscendent", r"\bvirtual\b",
              r"what else could it be", r"dictionary definition",
              r"\bmetaphor", r"\bdisappear", r"\bostensibly", r"\babsurd",
              r"\bamorphous", r"\bterrified"],
        never=[],
    ),
    dict(
        n=7, name="return",
        says="a beat-1 line again, a different take than beat 1 used",
        sources=["blum"],
        # Beat 7 has no pool of its own: it draws from beat 1's, so that
        # editing beat 1 by hand moves both ends of the piece at once. The
        # draw guarantees a different entry than beat 1 took.
        pool_from=1,
        strong=[], weak=[], never=[],
    ),
]

BEAT_NAMES = [b["name"] for b in ARC]

# Which consecutive pairs are allowed to share a source. The rule is that no
# source speaks two beats running - except where the arc says so, which is
# the two blum pairs it is built on: the claim and the place it names, and
# the doubt answered by the claim again.
SAME_SOURCE_OK = {(1, 2), (6, 7)}


def compile_arc():
    """The arc with its patterns compiled, once per run."""
    out = []
    for b in ARC:
        out.append(dict(
            b,
            re_strong=[re.compile(p, re.I) for p in b["strong"]],
            re_weak=[re.compile(p, re.I) for p in b["weak"]],
            re_never=[re.compile(p, re.I) for p in b["never"]],
        ))
    return out


# ----------------------------------------------------------- reading it
def load(path=CONFIG):
    """config/beats.json, with beat 7's pool resolved to beat 1's.

    `pool_from` is stored rather than copied so the file has one place to
    edit a beat-1 line; it is resolved here so everything downstream sees
    seven beats that each have a pool.
    """
    with open(path, encoding="utf-8") as f:
        cfg = json.load(f)
    beats = cfg["beats"]
    by_n = {b["n"]: b for b in beats}
    for b in beats:
        src = b.get("pool_from")
        if src:
            b["pool"] = by_n[src]["pool"]
    return cfg


def pool_sizes(cfg):
    return [(b["n"], b["name"], len(b["pool"])) for b in cfg["beats"]]


# ------------------------------------------------------------- the draw
def draw(rng, cfg):
    """One pick per beat, in arc order.

    Uniform inside each pool rather than score-weighted: the pool was
    authored, so every entry in it is meant to be usable, and weighting would
    quietly reduce thirty versions to the same five lines. The only
    constraints are the two the arc states - beat 7 is never beat 1's pick,
    and no source speaks two beats running unless the arc says it may.
    """
    picks = []
    for b in cfg["beats"]:
        pool = b["pool"]
        if not pool:
            raise RuntimeError(f"beat {b['n']} ({b['name']}) has an empty pool")
        cands = pool
        if b["n"] == 7 and picks:
            first = picks[0]
            cands = [p for p in pool
                     if (p["source"], p["in"]) != (first["source"], first["in"])]
            if not cands:
                raise RuntimeError("beat 1's pool has only one entry, so the "
                                   "return cannot be a different take")
        prev = picks[-1] if picks else None
        if prev is not None and (b["n"] - 1, b["n"]) not in SAME_SOURCE_OK:
            other = [p for p in cands if p["source"] != prev["source"]]
            if other:
                cands = other
        p = dict(cands[rng.randrange(len(cands))])
        p["beat"] = b["n"]
        p["beat_name"] = b["name"]
        picks.append(p)
    return picks


def consecutive_source_faults(picks):
    """Any pair of neighbouring beats sharing a source outside the arc's own.

    Reported rather than assumed: the arc fixes a source per beat, so this
    should be empty by construction, and a non-empty answer means the arc
    and config/beats.json have drifted apart.
    """
    bad = []
    for a, b in zip(picks, picks[1:]):
        if a["source"] != b["source"]:
            continue
        if (a["beat"], b["beat"]) in SAME_SOURCE_OK:
            continue
        bad.append((a["beat"], b["beat"], a["source"]))
    return bad


if __name__ == "__main__":
    cfg = load()
    for n, name, k in pool_sizes(cfg):
        print(f"  beat {n} {name:<9} {k:>3} candidates")
