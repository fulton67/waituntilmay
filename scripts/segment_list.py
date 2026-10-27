"""What a version actually says, segment by segment, and what links each cut.

The log carries it all, but reading a 2000-line json to find out whether an
edit reads as an exchange is not reading. This prints the thing a person
checks: who speaks, for how long, what they say, and which word or tag the
next phrase picked up.

  python scripts/segment_list.py renders_multi/v_4242.json
  python scripts/segment_list.py --dir renders_multi --best-linked
"""
import argparse
import glob
import json
import os
import sys

BAR = "-" * 100


def one(log, width=58):
    segs = [s for s in (log.get("segments") or []) if s.get("kind") == "speech"]
    track = log.get("audio_track") or []
    ls = log.get("segment_link_stats") or {}
    mix = log.get("source_mix") or {}

    print("=" * 100)
    print(f"seed {log['seed']}   phase {log['phase']}   "
          f"{log.get('output_duration', 0):.3f}s   "
          f"speech {log.get('speech_pct', 0):.1f}%")
    print(f"mix  " + "   ".join(
        f"{k} {v.get('pct', 0):.1f}%" for k, v in sorted(mix.items())))
    print(f"cuts {ls.get('cuts', 0)}   linked {ls.get('linked_pct', 0):.0f}% "
          f"(word {ls.get('by_word', 0)}, tag {ls.get('by_tag', 0)}, "
          f"random {ls.get('random', 0)})   "
          f"cross-source {ls.get('cross_source', 0)}")
    print("=" * 100)
    print(f"{'at':>6} {'dur':>5} {'source':<9} {'link':<22} phrase")
    print(BAR)

    for i, t in enumerate(track):
        lk = t.get("link") or {}
        if not lk:
            link = "(opens)"
        elif lk.get("kind") == "none":
            link = "random"
        else:
            arrow = "x" if lk.get("cross") else "="
            link = f"{arrow} {lk.get('kind')}: {lk.get('via')}"
        txt = (t.get("text") or "").strip()
        if len(txt) > width:
            txt = txt[:width - 1] + "…"
        seg = segs[i] if i < len(segs) else {}
        print(f"{t.get('seconds', 0):>6.2f} {t.get('dur', 0):>5.2f} "
              f"{str(t.get('src')):<9} {link:<22} {txt}")
        if seg.get("kind") == "speech":
            pass
    print(BAR)
    holds = [s for s in (log.get("segments") or [])
             if s.get("kind") in ("hold", "tail")]
    if holds:
        print(f"{len(holds)} holds between phrases "
              f"({sum(s.get('seconds', 0) for s in holds):.2f}s total) - the "
              f"picture stays on whoever just spoke")
    print("x = cut across sources, = = same source\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("log", nargs="?")
    ap.add_argument("--dir", default="renders_multi")
    ap.add_argument("--best-linked", action="store_true",
                    help="the version with the highest share of word links")
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()

    if args.log:
        one(json.load(open(args.log, encoding="utf-8")))
        return 0

    logs = sorted(glob.glob(os.path.join(args.dir, "v_*.json")))
    if not logs:
        print("no renders found")
        return 1
    rows = [json.load(open(p, encoding="utf-8")) for p in logs]
    rows = [r for r in rows if r.get("segments")]
    if not rows:
        print("no render in that directory carries per-segment provenance")
        return 1
    if args.all:
        for r in rows:
            one(r)
        return 0
    if args.best_linked:
        rows.sort(key=lambda r: -(r.get("segment_link_stats") or {}).get(
            "by_word", 0))
    one(rows[0])
    return 0


if __name__ == "__main__":
    sys.exit(main())
