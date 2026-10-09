"""Clause-level units built from the WhisperX word timings.

A "unit" is a run of words between clause boundaries, never cut mid-thought.
Each unit carries a list of source spans rather than one span, because internal
silences longer than GAP_TRIM are removed - so a unit can be discontiguous in
the source while playing as continuous speech.

Units below MIN_DENSITY words/sec are dropped; that is what removes the dead
air a uniform random draw over a 54-minute lecture keeps landing on.
"""
import json
import re

CLAUSE_END = tuple(".!?;:,")          # clause boundaries, not just sentences
HARD_END = tuple(".!?")
MIN_DENSITY = 2.5                      # words per second, measured pre-trim
GAP_TRIM = 0.30                        # internal silence longer than this is cut
MIN_WORDS = 3
MIN_DUR = 0.45
MAX_DUR = 7.0

# ---------------------------------------------------------------- the arc
# Five beats, always in this order. Every version walks all five; only the
# units inside each beat change.
BEATS = ["question", "physical", "water", "internet", "dissolution"]

# Each pool has STRONG patterns (the thing itself) and WEAK ones (nearby
# vocabulary). Membership needs any match; a strong match raises the unit's
# score, so a beat reaches for the real line before the merely adjacent one.
# Bare negations and bare question marks are deliberately absent: in the first
# pass they pulled in audience chatter ("You guys are how many now?") and
# stray phrases ("I know about the move across the street").
STRONG = {
    "question": [
        r"what (the )?internet", r"where the internet",
        r"what (it|this) is\b", r"where (it|this) is\b",
        r"what is (it|this|the)\b", r"where is (it|this|the)\b",
        r"what it('s| is) made of", r"what does (it|that) mean",
        r"definition of", r"how (is|does) it (connect|work)",
        r"what goes on", r"what are the",
    ],
    "physical": [
        r"\bcable", r"\bfiber", r"\bfibre", r"\btube", r"\bconduit",
        r"\bduct\b", r"\brouter", r"\bmanhole", r"\bphysical",
        r"\btangible", r"real place", r"made of",
    ],
    "water": [
        r"\bwater\b", r"\bunderwater", r"\bocean", r"\bundersea",
        r"\bsea\b", r"\bbeach", r"\bshore\b", r"landing station",
        r"\bbuoy", r"\bskiff", r"\bscuba", r"\btide\b",
        r"transatlantic", r"across the (ocean|atlantic|pacific|sea)",
        r"\blighthouse", r"cable ship",
    ],
    "internet": [r"the internet", r"internet is", r"internet's"],
    "dissolution": [
        r"\bamorphous", r"\bblob\b", r"\binvisible", r"\bvirtual",
        r"\bdisappear", r"\bvanish", r"\bforget\b", r"no physical",
        r"\bnot (a|the|something|real|physical)\b", r"\bmetaphor",
        r"behind the screen", r"\btranscendent", r"\bostensibly",
    ],
}

WEAK = {
    "question": [r"\bwonder", r"\bimagine\b", r"\bquestion\b"],
    "physical": [
        r"\bbuilding", r"\bplace", r"\bmachine", r"\bsteel\b", r"\bcopper\b",
        r"\bdirt\b", r"\bground\b", r"\bwire", r"data cent", r"\bhut\b",
        r"\bwarehouse", r"\bdepot", r"\binfrastructure", r"\bequipment\b",
    ],
    "water": [r"\bisland", r"\bship\b", r"\bcoast", r"\bport\b",
              r"\batlantic", r"\bpacific", r"\blisbon", r"\bcontinent"],
    "internet": [r"\bnetwork", r"\bonline\b", r"web page"],
    "dissolution": [r"\bnever\b", r"\bnothing\b", r"\blost\b", r"\bgone\b",
                    r"\bseem", r"\bapparently\b", r"\bsupposedly\b",
                    r"\bempty\b"],
}

KEYWORDS = {b: STRONG[b] + WEAK[b] for b in BEATS}

# A refrain must assert that the internet is a real, physical place.
REFRAIN_PATTERNS = [
    r"absolutely real places",
    r"through absolutely real",
    r"distinct physical path",
    r"it's physical reality",
    r"physical reality",
    r"made of places",
    r"it's that tangible",
    r"the physical internet",
    r"physical connection is the same",
    r"series of tubes",
]


# A clause that ends on a connective, article or preposition is still
# mid-thought ("a cable that"), so it is dropped unless it closes a sentence.
DANGLING = {
    "a", "an", "the", "and", "but", "or", "so", "that", "which", "who",
    "of", "to", "in", "on", "at", "by", "for", "with", "from", "as", "if",
    "when", "because", "is", "was", "were", "are", "be", "been", "am",
    "this", "these", "those", "it", "its", "i", "we", "you", "they", "he",
    "she", "there", "kind", "sort", "very", "just", "about", "into", "than",
    "then", "what", "where", "how", "my", "your", "our", "their", "his",
}


def norm(s):
    return re.sub(r"\s+", " ", s).strip()


def build_units(words_path="transcript/words.json",
                min_density=MIN_DENSITY, gap_trim=GAP_TRIM):
    words = json.load(open(words_path, encoding="utf-8"))

    # ---- 1. split on clause boundaries, never mid-thought
    groups, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        nxt_gap = (words[i + 1]["start"] - w["end"]) if i + 1 < len(words) else 99
        if w["word"].endswith(CLAUSE_END) or nxt_gap > 0.6 or i == len(words) - 1:
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)

    units = []
    for g in groups:
        if len(g) < MIN_WORDS:
            continue
        s, e = words[g[0]]["start"], words[g[-1]]["end"]
        raw = e - s
        if raw <= 0:
            continue
        density = len(g) / raw
        if density < min_density:
            continue

        # ---- 2. trim internal silences, producing one or more spans
        spans, seg_start = [], s
        for k in range(len(g) - 1):
            if words[g[k + 1]]["start"] - words[g[k]]["end"] > gap_trim:
                spans.append([seg_start, words[g[k]]["end"] + 0.06])
                seg_start = words[g[k + 1]]["start"] - 0.04
        spans.append([seg_start, e + 0.06])
        spans = [[max(0.0, a), b] for a, b in spans if b - a > 0.08]
        if not spans:
            continue
        dur = sum(b - a for a, b in spans)
        if dur < MIN_DUR or dur > MAX_DUR:
            continue

        text = norm(" ".join(words[i]["word"] for i in g))
        text = re.sub(r"\s+([,.!?;:])", r"\1", text)

        ends_sentence = text.rstrip().endswith(HARD_END)
        toks = text.split()
        last = re.sub(r"[^a-z']", "", toks[-1].lower()) if toks else ""
        if not ends_sentence and last in DANGLING:
            continue

        units.append({
            "id": len(units),
            "word_ids": g,
            "spans": [[round(a, 3), round(b, 3)] for a, b in spans],
            "start": round(s, 3), "end": round(e, 3),
            "raw_duration": round(raw, 3),
            "duration": round(dur, 3),
            "trimmed": round(raw - dur, 3),
            "words": len(g),
            "density": round(density, 2),
            "text": text,
            "ends_sentence": ends_sentence,
        })

    # ---- 3. themed pools
    for u in units:
        t = u["text"].lower()
        u["pools"] = [b for b in BEATS
                      if any(re.search(p, t) for p in KEYWORDS[b])]
        u["strong"] = [b for b in BEATS
                       if any(re.search(p, t) for p in STRONG[b])]
        u["is_refrain"] = any(re.search(p, t) for p in REFRAIN_PATTERNS)
    return units


def pools(units):
    out = {b: [u for u in units if b in u["pools"]] for b in BEATS}
    out["refrain"] = [u for u in units if u["is_refrain"]]
    return out


if __name__ == "__main__":
    import statistics
    us = build_units()
    print(f"units: {len(us)}")
    d = [u["duration"] for u in us]
    print(f"duration  min {min(d):.2f}  median {statistics.median(d):.2f}  max {max(d):.2f}")
    print(f"density   median {statistics.median([u['density'] for u in us]):.2f} w/s")
    print(f"total trimmed silence: {sum(u['trimmed'] for u in us):.1f}s")
    print(f"multi-span units: {sum(1 for u in us if len(u['spans'])>1)}")
    p = pools(us)
    for k in BEATS + ["refrain"]:
        v = p[k]
        strong = sum(1 for u in v if k in u.get("strong", []))
        print(f"  {k:<12} {len(v):>4} units ({strong:>3} strong)  "
              f"{sum(x['duration'] for x in v):7.1f}s")
    print("\nstrongest per beat:")
    for b in BEATS:
        best = sorted([u for u in p[b] if b in u["strong"]],
                      key=lambda u: -u["density"])[:3]
        for u in best:
            print(f"  {b:<12} [{u['duration']:.2f}s] \"{u['text'][:62]}\"")
