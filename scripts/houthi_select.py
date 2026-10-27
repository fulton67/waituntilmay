"""Keep a Houthi candidate only if it says the thing, not if it is titled it.

A title is a headline writer's summary. Searching YouTube for Houthis and
cables returns mostly strike footage - drones, missiles, carrier decks - whose
titles mention cables because the description does, and which never say the
word out loud. Those are useless to this piece: it cuts phrases, so a video
earns its place only if someone in it says both halves of the idea close
enough together to be one thought.

The test, per the brief: the transcript mentions cables/undersea/submarine/
internet AND Houthi/Yemen/Red Sea within 60 seconds of each other.

An Arabic source is judged on its English translation pass, which carries its
own segment times, so the 60-second window means the same thing in both
languages. The audio that ships is always the original.

  python scripts/houthi_select.py
  python scripts/houthi_select.py --register --max 15
"""
import argparse
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

SHORTLIST = "sources/houthi-shortlist.json"
REPORT = "sources/houthi-selection.json"
CONFIG = "config/sources.json"
WINDOW_S = 60.0
MIN_WORDS = 40

# The two halves of the idea. Either may be the one that fires first.
CABLE = re.compile(
    r"\b(cable|cables|undersea|under[- ]?sea|submarine|subsea|fib(?:er|re)"
    r"|internet|connectivity|bandwidth|seacom|aae|eig\b|telecom"
    r"|data (?:cable|link|traffic))\b", re.I)
PLACE = re.compile(
    r"\b(houthi|houthis|houthi[- ]?led|ansar allah|yemen|yemeni|yemenis"
    r"|red sea|bab[- ]el[- ]mandeb|bab al[- ]mandab|gulf of aden|sana'?a"
    r"|hodeidah|hudaydah|rubymar)\b", re.I)


def timed_sentences(sdir):
    """English sentences with times, whatever language was spoken.

    Returns (sentences, basis) where basis says which text was judged.
    """
    raw = os.path.join(sdir, "_raw_whisperx.json")
    if os.path.exists(raw):
        d = json.load(open(raw, encoding="utf-8"))
        tr = d.get("translation")
        if tr:
            return ([{"start": s["start"], "end": s["end"], "text": s["text"]}
                     for s in tr if (s.get("text") or "").strip()],
                    f"translation from {d.get('meta', {}).get('language')}")
    p = os.path.join(sdir, "transcript", "phrases.json")
    if os.path.exists(p):
        ph = json.load(open(p, encoding="utf-8"))
        return ([{"start": x["start"], "end": x["end"], "text": x["text"]}
                 for x in ph], "transcript")
    return [], "none"


def hits(sentences, pat):
    """Every sentence that matches, with the time it matched at."""
    out = []
    for s in sentences:
        m = pat.search(s["text"] or "")
        if m:
            out.append({"t": float(s["start"]), "text": s["text"].strip(),
                        "match": m.group(0)})
    return out


def source_language(sdir):
    """What was actually spoken, and whether any of it was re-detected.

    Recorded for every candidate whether it is kept or not: which sources are
    not in English decides what the tagger reads and what the link sequencer
    can link on, so it is not a detail to leave in a log.
    """
    raw = os.path.join(sdir, "_raw_whisperx.json")
    if not os.path.exists(raw):
        return {}
    meta = json.load(open(raw, encoding="utf-8")).get("meta") or {}
    rl = meta.get("relang") or {}
    return {"language": meta.get("language"),
            "translated": bool(meta.get("translated")),
            "aligned": meta.get("aligned", True),
            "relang_phrases": rl.get("changed_phrases", 0),
            "relang_langs": sorted({r["lang"] for r in rl.get("regions", [])})}


def judge(sdir):
    sentences, basis = timed_sentences(sdir)
    words_p = os.path.join(sdir, "transcript", "words.json")
    n_words = len(json.load(open(words_p, encoding="utf-8"))) \
        if os.path.exists(words_p) else 0

    res = {"basis": basis, "sentences": len(sentences), "words": n_words,
           "keep": False, "why": None, "evidence": None, "gap_s": None,
           "cable_hits": 0, "place_hits": 0}
    if not sentences:
        res["why"] = "no transcript"
        return res

    # A source with no forced-alignment model for its language keeps
    # segment-level timings spread evenly over the words. The piece cuts
    # clause runs and trims internal silence by word timing, so those
    # approximations put boundaries mid-word and make the density metric
    # meaningless. Better to lose the source than to cut on guesses.
    raw = os.path.join(sdir, "_raw_whisperx.json")
    if os.path.exists(raw):
        meta = json.load(open(raw, encoding="utf-8")).get("meta") or {}
        if meta.get("aligned") is False:
            res["language"] = meta.get("language")
            res["why"] = (f"no forced aligner for {meta.get('language')}; "
                          f"word timings are interpolated")
            return res
    if n_words < MIN_WORDS:
        res["why"] = f"only {n_words} words of speech"
        return res

    cs, ps = hits(sentences, CABLE), hits(sentences, PLACE)
    res["cable_hits"], res["place_hits"] = len(cs), len(ps)
    if not cs:
        res["why"] = "never says cable/undersea/internet"
        return res
    if not ps:
        res["why"] = "never says Houthi/Yemen/Red Sea"
        return res

    # the closest pair of the two ideas anywhere in the video
    best = None
    for c in cs:
        for p in ps:
            gap = abs(c["t"] - p["t"])
            if best is None or gap < best[0]:
                best = (gap, c, p)
    gap, c, p = best
    res["gap_s"] = round(gap, 1)
    if gap > WINDOW_S:
        res["why"] = (f"closest pair {gap:.0f}s apart, over the "
                      f"{WINDOW_S:.0f}s window")
        return res

    res["keep"] = True
    res["why"] = f"'{c['match']}' and '{p['match']}' {gap:.0f}s apart"
    # the sentence a person would read to check the call
    res["evidence"] = c["text"] if c["t"] <= p["t"] else p["text"]
    res["evidence_pair"] = [
        {"t": round(c["t"], 1), "text": c["text"]},
        {"t": round(p["t"], 1), "text": p["text"]},
    ]
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shortlist", default=SHORTLIST)
    ap.add_argument("--register", action="store_true")
    ap.add_argument("--weight", type=float, default=0.3)
    ap.add_argument("--max", type=int, default=15)
    ap.add_argument("--group", default="",
                    help="comma-separated ids that share the weight with the "
                         "kept sources. Empty: the split is blum 0.45, swartz "
                         "0.15, lackner 0.10 and 0.30 shared between the Red "
                         "Sea clips, with lackner weighted on its own because "
                         "it is Yemeni politics, not cable coverage")
    args = ap.parse_args()

    short = json.load(open(os.path.join(ROOT, args.shortlist), encoding="utf-8"))
    rows = []
    for v in short:
        sdir = os.path.join(ROOT, "sources", v["id"])
        if not os.path.isdir(sdir):
            rows.append({**{k: v.get(k) for k in
                            ("id", "title", "channel", "date", "duration", "url")},
                         "keep": False, "why": "not ingested"})
            continue
        r = judge(sdir)
        rows.append({**{k: v.get(k) for k in
                        ("id", "title", "channel", "date", "duration", "url")},
                     **source_language(sdir), **r})

    keep = [r for r in rows if r["keep"]][:args.max]
    print("=" * 110)
    print(f"HOUTHI SELECTION  - kept only if cables AND Houthi/Yemen/Red Sea "
          f"are said within {WINDOW_S:.0f}s")
    print("=" * 110)
    for r in rows:
        mark = "KEEP  " if r["keep"] else "reject"
        if r["keep"] and r not in keep:
            mark = "over  "
        print(f"\n{mark} {r['id']}  {r.get('duration') or '?'}  "
              f"{r.get('channel') or '?'}  {r.get('date') or '?'}")
        print(f"       {(r.get('title') or '')[:92]}")
        lang = r.get("language") or "?"
        extra = f"  [{lang}"
        if r.get("relang_phrases"):
            extra += f", {r['relang_phrases']} phrases re-detected as "                      f"{'/'.join(r.get('relang_langs') or [])}"
        if r.get("translated"):
            extra += ", translated"
        extra += "]"
        print(f"       {extra}")
        print(f"       {r['why']}"
              + (f"   [{r.get('basis')}, {r.get('cable_hits', 0)} cable / "
                 f"{r.get('place_hits', 0)} place hits]"
                 if r.get("basis") else ""))
        if r.get("evidence"):
            print(f"       “{r['evidence'][:92]}”")

    print("\n" + "-" * 110)
    print(f"{len(keep)} kept of {len(rows)} transcribed "
          f"({sum(1 for r in rows if not r['keep'])} rejected)")
    json.dump(rows, open(os.path.join(ROOT, REPORT), "w", encoding="utf-8"),
              indent=1, ensure_ascii=False)
    print(REPORT)

    if args.register and keep:
        p = os.path.join(ROOT, CONFIG)
        cfg = json.load(open(p, encoding="utf-8"))
        # The Red Sea material shares one weight between all of it, so adding
        # a dozen news clips does not quietly make the pool nine tenths Red
        # Sea and drown out the two voices the piece is built on. lackner is
        # part of that material, not a fourth thing.
        group = [g for g in (args.group or "").split(",") if g.strip()]
        n_share = len(keep) + len(group)
        each = round(args.weight / max(n_share, 1), 4)
        rest = [s for s in cfg["sources"] if not s["id"].startswith("houthi-")]
        for s in rest:
            if s["id"] in group:
                s["weight"] = each
        for r in keep:
            sdir = os.path.join(ROOT, "sources", r["id"])
            dur = json.load(open(os.path.join(sdir, "_meta.json"),
                                 encoding="utf-8")).get("duration") \
                if os.path.exists(os.path.join(sdir, "_meta.json")) else None
            rest.append({"id": r["id"], "title": r.get("title"),
                         "channel": r.get("channel"), "url": r.get("url"),
                         "date": r.get("date"), "duration": dur, "fps": 24,
                         "enabled": True, "weight": each})
        cfg["sources"] = rest
        tmp = p + ".tmp"
        json.dump(cfg, open(tmp, "w", encoding="utf-8"), indent=2,
                  ensure_ascii=False)
        os.replace(tmp, p)
        print(f"\nregistered {len(keep)} houthi sources; the Red Sea group is "
              f"{n_share} sources at {each} each, sharing {args.weight}"
              + (f" (with {', '.join(group)})" if group else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
