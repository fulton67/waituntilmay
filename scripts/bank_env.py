"""The word envelope for every clip in the bank, scoped to the clip.

The look is driven by speech, and in the lab that speech is one 10-second
excerpt of one talk with a hand-placed trigger on each "internet". A bank
clip is two to four seconds of someone finishing a sentence, so it gets the
same treatment at its own scale: the words inside it, the concept words
inside it, its own loudness, its own drift. A clip that says "cables under
the water" peaks on "cables" and "water"; a clip that says "about 20 million
people live under Houthi rule" has no concept word in it at all and stays
calm, and that is correct - the look is not supposed to be uniform.

What comes out is the same shape as the lab's own manifest
(public/mosh-lab/*-tune.json), so /mosh-lab/tune can be pointed at a bank
clip with ?data=... and is driving the same code on the same kind of data.
Everything here is slider-independent - the follower, the gain and the knee
are read off the published look at shade time - so it is computed once and
cached.

    .venv/Scripts/python.exe scripts/bank_env.py
    .venv/Scripts/python.exe scripts/bank_env.py --only blum_00547682 --force
"""
import argparse
import json
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline import bank as BK                                  # noqa: E402
from pipeline import intensity as I                              # noqa: E402
from pipeline import media as M                                  # noqa: E402
from pipeline import sources as SRCS                             # noqa: E402
from pipeline import units as U                                  # noqa: E402

MB = 16


def concept_hits(src, clip, cfg, words):
    """Which frames of this clip a concept word lands on.

    An English source is stem-matched word by word, which is what the lab
    does. A source read through a translation has no English words to match:
    its hit goes on the first word of any phrase whose translation carries a
    concept word, because that is the only place the match can honestly be
    located - the translation has no word-level alignment to the original.
    """
    a, n = clip["in"], clip["frames"]
    stems = {I.stem(w) for w in (cfg.get("concept_words") or [])}
    en = U.english_by_word(src)
    out = []
    if en:
        seen = set()
        for i, w in enumerate(words):
            txt = en.get(i)
            if not txt or txt in seen:
                continue
            if not any(I.stem(t) in stems for t in txt.split()):
                continue
            seen.add(txt)
            f = int(round((w["start"] - a) * M.FPS))
            if 0 <= f < n:
                out.append({"stem": "(translated)", "frame": f})
        return out
    for w in words:
        if I.stem(w["word"]) not in stems:
            continue
        f = int(round((w["start"] - a) * M.FPS))
        if 0 <= f < n:
            out.append({"stem": I.stem(w["word"]), "frame": f})
    return out


def build_one(src, clip, cfg, units):
    a, n = clip["in"], clip["frames"]
    b = a + n / M.FPS
    words = BK.words_of(src)
    tl = I.Timeline.clip(a, n, M.FPS)
    loud = I.loudness_through(tl, src["video"])

    # The loudness term is stripped out of the raw track and handed over
    # separately, so its weight stays a live control: the page re-adds it at
    # whatever the slider says. Same reason the follower is not applied here.
    ic = dict(cfg.get("intensity") or {})
    bare = dict(cfg)
    bare["intensity"] = {**ic, "loudness_weight": 0.0}
    hits = concept_hits(src, clip, cfg, words)
    r = I.build(tl, words, units, bare, audio=None,
                trigger_frames=[h["frame"] for h in hits], seed=7)

    inside = []
    for w in words:
        t0 = w["start"]
        t1 = w.get("end", t0)
        if t1 < a or t0 > b:
            continue
        inside.append({"w": w["word"],
                       "f0": int(round((t0 - a) * M.FPS)),
                       "f1": int(round((t1 - a) * M.FPS)),
                       "stem": I.stem(w["word"])})

    return {
        "name": clip["id"],
        "frames": n, "fps": M.FPS,
        "width": 640, "height": 360, "mb": MB,
        "clipStart": a,
        "source": clip["source"],
        "text": clip["text"],
        # No forced triggers of their own: the concept words in the clip are
        # the triggers. The lab's two were placed by hand on a clip chosen
        # for having them; a bank of a hundred clips cannot be hand-placed,
        # and a clip with no concept word in it is meant to stay calm.
        "triggers": [h["frame"] for h in hits],
        "conceptWords": sorted({I.stem(w) for w in
                                (cfg.get("concept_words") or [])}),
        "conceptHits": hits,
        "words": inside,
        "rawNoLoudness": [round(float(v), 5) for v in r["raw"]],
        "loudness": [round(float(v), 5) for v in loud],
        "drift": [round(float(v), 5) for v in r["drift"]],
        "intensityParams": r["params"],
        "env_mean": round(float(r["env"].mean()), 4),
        "env_max": round(float(r["env"].max()), 4),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bank", default=None)
    ap.add_argument("--sources", default=SRCS.CONFIG)
    ap.add_argument("--only", default=None)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    bank = BK.load(args.bank)
    srcs = {s["id"]: s for s in SRCS.load(args.sources)}
    outdir = os.path.join(BK.BANK_DIR, "env")
    os.makedirs(outdir, exist_ok=True)
    cfg = I.load_cfg()

    units_by_src = {}
    clips = [c for c in bank["clips"]
             if not args.only or c["id"] == args.only]
    t0, built, reused = time.time(), 0, 0
    print(f"{'clip':<22} {'frames':>6} {'hits':>5} {'words':>6} "
          f"{'env mean':>9} {'env max':>8}")
    print("-" * 64)
    for c in clips:
        out = os.path.join(outdir, c["id"] + ".json")
        if os.path.exists(out) and not args.force:
            reused += 1
            continue
        sid = c["source"]
        src = srcs[sid]
        if sid not in units_by_src:
            units_by_src[sid] = U.build_units(words_path=src["words"],
                                              source=sid)
        d = build_one(src, c, cfg, units_by_src[sid])
        json.dump(d, open(out, "w", encoding="utf-8"),
                  ensure_ascii=False, separators=(",", ":"))
        built += 1
        print(f'{c["id"]:<22} {d["frames"]:>6} {len(d["conceptHits"]):>5} '
              f'{len(d["words"]):>6} {d["env_mean"]:>9.4f} '
              f'{d["env_max"]:>8.4f}')
    print("-" * 64)
    print(f"{built} built, {reused} cached, in {time.time() - t0:.1f}s "
          f"-> {outdir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
