"""Count trigger/concept keywords in words.json and locate their phrases."""
import json
import re
import sys
from collections import Counter

WORDS = "transcript/words.json"
PHRASES = "transcript/phrases.json"

TERMS = ["tubes", "water", "ocean", "sea", "under", "internet"]


def norm(w):
    return re.sub(r"[^a-z0-9']", "", w.lower())


def main():
    words = json.load(open(WORDS, encoding="utf-8"))
    phrases = json.load(open(PHRASES, encoding="utf-8"))
    w2p = {}
    for p in phrases:
        for wi in p["word_ids"]:
            w2p[wi] = p["id"]

    norms = [norm(w["word"]) for w in words]

    print("=" * 74)
    print("KEYWORD COUNTS in words.json  (exact token match, case/punct stripped)")
    print("=" * 74)
    print(f"  {'term':<12} {'exact':>7} {'substring':>10}   note")
    print("  " + "-" * 62)
    for t in TERMS:
        exact = sum(1 for n in norms if n == t)
        # substring counts catch plurals / compounds e.g. undersea, waters
        sub = sum(1 for n in norms if t in n)
        variants = Counter(n for n in norms if t in n and n != t)
        note = ", ".join(f"{k}x{v}" for k, v in variants.most_common(6)) or "-"
        print(f"  {t:<12} {exact:>7} {sub:>10}   {note}")

    # ---- every phrase containing "tubes"
    print("\n" + "=" * 74)
    print('PHRASES CONTAINING "tubes"')
    print("=" * 74)
    hits = [i for i, n in enumerate(norms) if n == "tubes"]
    seen = set()
    for wi in hits:
        pid = w2p.get(wi)
        if pid is None or pid in seen:
            continue
        seen.add(pid)
        p = phrases[pid]
        print(f"\n  phrase {pid}  [{p['start']:.3f} -> {p['end']:.3f}]  ({p['duration']:.3f}s)")
        print(f'    "{p["text"]}"')
        occ = [w for w in hits if w2p.get(w) == pid]
        for o in occ:
            print(f"      word {o}: \"{words[o]['word']}\" @ {words[o]['start']:.3f}-{words[o]['end']:.3f}")

    # ---- the "series of tubes" construction
    print("\n" + "=" * 74)
    print('OCCURRENCES OF "series of tubes"')
    print("=" * 74)
    found = 0
    for i in range(len(norms) - 2):
        if norms[i] == "series" and norms[i + 1] == "of" and norms[i + 2] == "tubes":
            found += 1
            pid = w2p.get(i)
            print(f"\n  words {i}-{i+2} @ {words[i]['start']:.3f} -> {words[i+2]['end']:.3f}"
                  f"   (phrase {pid})")
            print(f'    "{" ".join(words[j]["word"] for j in range(i, i+3))}"')
            if pid is not None:
                print(f'    full phrase: "{phrases[pid]["text"]}"')
    if not found:
        print("\n  none found as an exact 3-word sequence")
        # show any 'series' near 'tubes'
        for i, n in enumerate(norms):
            if n == "series":
                ctx = " ".join(words[j]["word"] for j in range(max(0, i - 3), min(len(words), i + 8)))
                print(f'    "series" at word {i} @ {words[i]["start"]:.3f}s: ...{ctx}...')

    # ---- every "internet" occurrence, for the trigger list
    inet = [i for i, n in enumerate(norms) if n == "internet"]
    print("\n" + "=" * 74)
    print(f'"internet" OCCURRENCES: {len(inet)}  (trigger words for the mosh)')
    print("=" * 74)
    pids = sorted({w2p.get(i) for i in inet if w2p.get(i) is not None})
    print(f"  spread across {len(pids)} distinct phrases")
    print(f"  first 5 @ " + ", ".join(f"{words[i]['start']:.3f}s" for i in inet[:5]))
    print(f"  last  5 @ " + ", ".join(f"{words[i]['start']:.3f}s" for i in inet[-5:]))


if __name__ == "__main__":
    sys.exit(main())
