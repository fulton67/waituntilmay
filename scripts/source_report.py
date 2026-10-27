"""What each source in config/sources.json actually contains.

Duration, words, phrases, the tag counts, and the four words the piece turns
on. Run it after ingesting a source, and after changing the tag rules.

  python scripts/source_report.py
  python scripts/source_report.py --json sources/_report.json
"""
import argparse
import json
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline import sources as S

KEYWORDS = ["internet", "network", "cable", "tube"]


def norm(w):
    return "".join(c for c in w.lower() if c.isalnum() or c == "'")


def loudness(path):
    """Integrated loudness. A source off the common level both jumps at the
    splice and reads as silence to the speech gate, so it is reported."""
    import subprocess
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path,
                        "-af", "ebur128=framelog=quiet", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = re.search(r"Integrated loudness[\s\S]{0,80}?I:\s*(-?[\d.]+)\s*LUFS",
                  r.stderr or "")
    return float(m.group(1)) if m else None


def report_one(src):
    words = json.load(open(src["words"], encoding="utf-8"))
    phrases = json.load(open(src["phrases"], encoding="utf-8"))
    tags = json.load(open(src["tags"], encoding="utf-8")) \
        if os.path.exists(src["tags"]) else {}
    counts = Counter()
    for w in words:
        n = norm(w["word"])
        for k in KEYWORDS:
            # stem match, so "networks" and "tubes" count
            if n.startswith(k):
                counts[k] += 1
    tc = Counter(t for ts in tags.values() for t in ts)
    return {
        "id": src["id"], "title": src.get("title"),
        "channel": src.get("channel"), "date": src.get("date"),
        "enabled": src["enabled"], "weight": src["weight"],
        "duration": round(src["duration"], 2),
        "lufs": loudness(src["video"]) if os.path.exists(src["video"]) else None,
        "words": len(words), "phrases": len(phrases),
        "tagged": len(tags),
        "tags": dict(sorted(tc.items())),
        "keywords": {k: counts.get(k, 0) for k in KEYWORDS},
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default=S.CONFIG)
    ap.add_argument("--json", default=None)
    ap.add_argument("--all", action="store_true",
                    help="include sources with enabled: false")
    args = ap.parse_args()

    cfg = S.load(args.config, only_enabled=not args.all)
    rows = [report_one(s) for s in cfg]
    tagnames = sorted({t for r in rows for t in r["tags"]})

    print(f"{'id':<12} {'dur':>8} {'words':>7} {'phr':>6} {'wt':>5} "
          f"{'LUFS':>7}  title")
    for r in rows:
        lu = f"{r['lufs']:.1f}" if r["lufs"] is not None else "-"
        print(f"{r['id']:<12} {r['duration']:>8.1f} {r['words']:>7} "
              f"{r['phrases']:>6} {r['weight']:>5.2f} {lu:>7}  "
              f"{(r['title'] or '')[:46]}")
    lus = [r["lufs"] for r in rows if r["lufs"] is not None]
    if len(lus) > 1:
        spread = max(lus) - min(lus)
        print(f"\nloudness spread {spread:.1f} LU"
              + ("  (matched)" if spread <= 1.0 else
                 "  <-- a source off the common level jumps at the splice "
                 "and reads as silence to the speech gate"))

    print(f"\n{'id':<12} " + " ".join(f"{t[:7]:>7}" for t in tagnames))
    for r in rows:
        print(f"{r['id']:<12} " +
              " ".join(f"{r['tags'].get(t, 0):>7}" for t in tagnames))

    print(f"\n{'id':<12} " + " ".join(f"{k:>9}" for k in KEYWORDS))
    for r in rows:
        print(f"{r['id']:<12} " +
              " ".join(f"{r['keywords'][k]:>9}" for k in KEYWORDS))

    if args.json:
        json.dump(rows, open(args.json, "w", encoding="utf-8"), indent=1)
        print(f"\n{args.json}")


if __name__ == "__main__":
    main()
