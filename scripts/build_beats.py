"""Build config/beats.json - the candidate pool for each of the seven beats.

Candidates are contiguous word runs, not the clause units the old randomiser
drew on. A unit is a single clause, and a single clause almost never lands in
the 2.0-4.25s band a slot wants: of blum's 823 units only 265 are in band at
all, and only 10 of those matched beat 1. A run may span several clauses, so
a beat can reach a whole thought instead of whatever fragment happened to be
the right length.

Every run starts at a clause boundary and ends at one, so there are no
mid-word starts and no mid-word ends. A run that ends on a connective,
article or preposition is dropped unless it closes a sentence - "a cable
that" is still mid-thought however well it fits the slot.

The pool is written as one contiguous `in`/`out` per entry, which is the
whole truth about where it comes from: the renderer plays exactly [in, out]
of exactly that source, and nothing re-derives it. That is what makes the
file editable by hand. Internal silence is therefore kept rather than
trimmed, because a trim would need a list of spans and an entry would stop
being one readable line.

    .venv/Scripts/python.exe scripts/build_beats.py
    .venv/Scripts/python.exe scripts/build_beats.py --max 20 --min 8
"""
import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline import beats as B
from pipeline import sources as SRCS
from pipeline import units as U

PAD = 0.06                 # the tail a word's measured end needs to not clip
CLAUSE = tuple(".!?;:,")
HARD = tuple(".!?")
BOUNDARY_GAP = 0.5         # silence this long is a boundary even mid-sentence
MIN_DENSITY = 2.0          # words/sec; below this the run is mostly air

# Two candidates are the same material in two windows when they share tape.
# The test needs a tolerance: adjacent runs touch at the boundary word's
# measured end plus PAD, so "This is the episode of South Park where the
# internet breaks," and "but there's no internet to know if the internet's
# broken." overlap by 0.017s and a zero-tolerance test threw the second one
# away - the line the beat is named after. Anything under a word's worth of
# tape is a seam, not a repeat.
OVERLAP_TOLERANCE = 0.30

# For a source not in English, the match is made against the translation of
# the phrase the run sits in, and a phrase can be far longer than the run.
# houthi-13's opening 3.6s translates as six sentences, one of which says
# "cable cuts below the sea" - said nowhere near those 3.6s. A candidate is
# only accepted where the run covers this much of the translated phrase, so
# the words the pool was matched on are roughly the words it plays.
MIN_TRANSLATION_COVER = 0.5


def boundaries(words):
    """Which word indices a run may end on."""
    n = len(words)
    out = [False] * n
    for i, w in enumerate(words):
        if i == n - 1:
            out[i] = True
            continue
        gap = words[i + 1]["start"] - w["end"]
        out[i] = w["word"].endswith(CLAUSE) or gap > BOUNDARY_GAP
    return out


def text_of(words, i, j):
    t = re.sub(r"\s+", " ", " ".join(w["word"] for w in words[i:j + 1])).strip()
    return re.sub(r"\s+([,.!?;:])", r"\1", t)


def runs(words, band=B.BAND):
    """Every contiguous boundary-to-boundary run whose length is in band.

    Yields (i, j, in, out, starts_sentence).
    """
    lo, hi = band
    n = len(words)
    bnd = boundaries(words)
    starts = [0] + [i + 1 for i in range(n - 1) if bnd[i]]
    for i in starts:
        if i >= n:
            continue
        opens = i == 0 or words[i - 1]["word"].rstrip().endswith(HARD)
        for j in range(i, n):
            out = words[j]["end"] + PAD
            d = out - words[i]["start"]
            if d > hi:
                break
            if not bnd[j] or d < lo:
                continue
            yield i, j, words[i]["start"], out, opens


def score(beat, text, dur, dens, opens, strong):
    """How good a candidate is, for ordering the pool a person will read.

    The pool is not weighted at draw time, so this only decides which
    candidates make the cut and in what order they are written out.
    """
    s = 0.0
    s += 3.0 if strong else 0.0
    s += 2.0 if opens else 0.0                      # a whole sentence reads
    s += 1.5 if text.rstrip().endswith(HARD) else 0.0
    s += 1.0 if 2.4 <= dur <= 4.0 else 0.0          # comfortably inside a slot
    s += min(dens, 6.0) * 0.25
    return s


def candidates(beat, srcs, taken):
    """The runs that belong to this beat, best first, non-overlapping.

    `taken` carries the time ranges already claimed by an earlier beat, per
    source, so the pools come out disjoint: beats 1, 2 and 6 all read blum,
    and without this a line about a cable in a building could be drawn by
    two different beats in the same version and said twice.
    """
    out = []
    for sid in beat["sources"]:
        s = srcs.get(sid)
        if not s:
            continue
        words = json.load(open(s["words"], encoding="utf-8"))
        en = U.english_by_word(s)
        # how many words each translated phrase covers, so a run can be
        # measured against the phrase its translation came from
        en_size = {}
        for w, txt in en.items():
            en_size[txt] = en_size.get(txt, 0) + 1
        for i, j, a, b, opens in runs(words):
            text = text_of(words, i, j)
            toks = text.split()
            if len(toks) < 3:
                continue
            # A source not in English is read through its translation, the
            # same text the tagger and the selection filter read. The spoken
            # words are still what gets cut and shown.
            read = text
            if en:
                mine = [en[k] for k in range(i, j + 1) if k in en]
                tr = " ".join(dict.fromkeys(mine))
                if not tr:
                    continue
                # the run has to be most of the phrase it is read as
                covered = sum(en_size.get(t, 0) for t in dict.fromkeys(mine))
                if covered and len(mine) / covered < MIN_TRANSLATION_COVER:
                    continue
                read = tr
            if U.FURNITURE.search(read):
                continue
            last = re.sub(r"[^a-z']", "", toks[-1].lower())
            if not text.rstrip().endswith(HARD) and last in U.DANGLING:
                continue
            dens = len(toks) / (b - a)
            if dens < MIN_DENSITY:
                continue
            if any(p.search(read) for p in beat["re_never"]):
                continue
            strong = any(p.search(read) for p in beat["re_strong"])
            if not strong and not any(p.search(read) for p in beat["re_weak"]):
                continue
            out.append({
                "text": text, "source": sid,
                "in": round(a, 3), "out": round(b, 3),
                "_seconds": round(b - a, 3),
                "_score": round(score(beat, read, b - a, dens, opens, strong), 2),
                "_strong": strong,
                "_reads": None if read == text else read,
            })
    out.sort(key=lambda c: -c["_score"])
    return out


def pick_pool(cands, taken, cap, per_source):
    """Take the best non-overlapping candidates, capped per source.

    Two runs from the same stretch of tape are the same line in two windows,
    and a pool of those is one line pretending to be eight. Overlap of any
    kind disqualifies, so every entry is distinct material.

    `per_source` stops one clip owning a beat: beat 4 reads fifteen Red Sea
    channels, and the longest of them has four times the transcript of the
    shortest.
    """
    kept, by_src = [], {}
    for c in cands:
        sid = c["source"]
        if by_src.get(sid, 0) >= per_source:
            continue
        rngs = taken.setdefault(sid, [])
        if any(min(c["out"], b) - max(c["in"], a) > OVERLAP_TOLERANCE
               for a, b in rngs):
            continue
        rngs.append((c["in"], c["out"]))
        by_src[sid] = by_src.get(sid, 0) + 1
        kept.append(c)
        if len(kept) >= cap:
            break
    return kept


def write(cfg, path):
    """Write beats.json with one pool entry per line.

    json.dump with an indent puts every key of every entry on its own line,
    which turns a twenty-entry pool into 120 lines nobody can scan. The file
    exists to be read and edited by hand, so the entries are emitted one to a
    line and the structure around them is indented normally.
    """
    def entry(c):
        d = {"text": c["text"], "source": c["source"],
             "in": c["in"], "out": c["out"]}
        if c.get("_reads"):
            d["reads"] = c["_reads"]
        return json.dumps(d, ensure_ascii=False)

    lines = ["{"]
    lines.append(' "_comment": ' + json.dumps(cfg["_comment"],
                                              ensure_ascii=False) + ",")
    for k in ("fps", "total_frames", "slot_frames", "duration_band",
              "mosh_beats"):
        lines.append(f' "{k}": ' + json.dumps(cfg[k]) + ",")
    lines.append(' "beats": [')
    for bi, b in enumerate(cfg["beats"]):
        lines.append("  {")
        lines.append(f'   "n": {b["n"]},')
        lines.append(f'   "name": {json.dumps(b["name"])},')
        lines.append(f'   "says": {json.dumps(b["says"], ensure_ascii=False)},')
        lines.append(f'   "sources": {json.dumps(b["sources"])},')
        if b.get("pool_from"):
            lines.append(f'   "pool_from": {b["pool_from"]},')
            lines.append('   "pool": []')
        else:
            lines.append('   "pool": [')
            for k, c in enumerate(b["pool"]):
                comma = "," if k + 1 < len(b["pool"]) else ""
                lines.append("    " + entry(c) + comma)
            lines.append("   ]")
        lines.append("  }" + ("," if bi + 1 < len(cfg["beats"]) else ""))
    lines.append(" ]")
    lines.append("}")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=B.CONFIG)
    ap.add_argument("--sources", default=SRCS.CONFIG)
    ap.add_argument("--max", type=int, default=20, help="pool ceiling per beat")
    ap.add_argument("--min", type=int, default=8, help="pool floor per beat")
    ap.add_argument("--per-source", type=int, default=0,
                    help="cap per source (0 = the ceiling, i.e. no cap)")
    args = ap.parse_args()

    srcs = {s["id"]: s for s in SRCS.load(args.sources)}
    arc = B.compile_arc()
    taken = {}
    out_beats, thin = [], []
    for beat in arc:
        if beat.get("pool_from"):
            out_beats.append({k: beat[k] for k in
                              ("n", "name", "says", "sources", "pool_from")}
                             | {"pool": []})
            continue
        cands = candidates(beat, srcs, taken)
        # Beat 4 reads fifteen channels; the others read one, so a per-source
        # cap there would only cap the beat.
        # Beat 4 reads fifteen channels of wildly different length - the
        # longest transcript is ten times the shortest - so two entries each
        # is what spreads the beat across the coverage rather than across
        # whichever channel talked longest.
        per = args.per_source or (2 if len(beat["sources"]) > 1 else args.max)
        pool = pick_pool(cands, taken, args.max, per)
        if len(pool) < args.min:
            thin.append((beat["n"], beat["name"], len(pool)))
        out_beats.append({k: beat[k] for k in ("n", "name", "says", "sources")}
                         | {"pool": pool, "_matched": len(cands)})

    cfg = {
        "_comment": (
            "The seven-beat arc's candidate pool. Every version plays all "
            "seven beats in this order, one pick per beat, so editing a pool "
            "edits the piece. An entry is one contiguous stretch of one "
            "source: the renderer plays exactly [in, out] of that source's "
            "source.mp4 and nothing re-derives it, so in/out can be nudged "
            "by hand. `reads` appears where the source is not in English and "
            "is the translation the beat was matched on; the spoken words are "
            "still what gets cut and shown. Beat 7 has no pool of its own - "
            "`pool_from: 1` means it draws from beat 1's, and the draw "
            "guarantees a different entry than beat 1 took. Candidates are "
            "2.0-4.25s so every one of them fits every slot without clipping "
            "a word. Rebuild with scripts/build_beats.py; it overwrites this "
            "file, so hand edits belong in version control."),
        "fps": B.FPS,
        "total_frames": B.OUT_FRAMES,
        "slot_frames": B.SLOT_FRAMES,
        "duration_band": list(B.BAND),
        "mosh_beats": list(B.MOSH_BEATS),
        "beats": out_beats,
    }
    write(cfg, args.out)

    print(f"wrote {args.out}")
    print(f"{'beat':>5} {'name':<9} {'sources':>8} {'matched':>8} "
          f"{'pool':>5} {'strong':>7} {'seconds':>8}")
    print("-" * 56)
    for b in out_beats:
        if b.get("pool_from"):
            print(f'{b["n"]:>5} {b["name"]:<9} {len(b["sources"]):>8} '
                  f'{"-":>8} {"= beat " + str(b["pool_from"]):>5}')
            continue
        pool = b["pool"]
        print(f'{b["n"]:>5} {b["name"]:<9} {len(b["sources"]):>8} '
              f'{b["_matched"]:>8} {len(pool):>5} '
              f'{sum(1 for c in pool if c["_strong"]):>7} '
              f'{sum(c["_seconds"] for c in pool):>8.1f}')
    if thin:
        print("\nTHIN POOLS (under the floor):")
        for n, name, k in thin:
            print(f"  beat {n} {name}: {k}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
