"""arrow_text_lint.py: fail a render where an arrow crosses a text box (gap round 1, graphics_arrows.md: B02 ran 123 px over its FDA
chip, B07 114 px over "Wed 10:30").

Reads the verbose log of an audit render of a composition that mounts `TextAudit` (OstadYT6 with props {"audit": true}). Each frame
where a drawn arrow centreline (devices/Arrow.tsx `data-arrowline`, sampled every 3rd point) passes through a visible text box logs
`ARROWTEXT {"f": .., "hits": [{"t": text, "len": px}]}`. The first 12 px of the tail and the last 30 px before the tip are exempt
(an arrow lands beside its label) and an arrow's own label is exempt. A crossing shorter than --min px (default 8) is ignored.

Usage: python -I arrow_text_lint.py <render_log.txt> [--min 8]
Exit 1 when any crossing remains; prints one row per (text, frame run) with the longest crossing.
"""
from __future__ import annotations
import argparse, json, re, sys
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("log")
    ap.add_argument("--min", type=float, default=8)
    a = ap.parse_args()
    rows: dict[str, list[tuple[int, int]]] = {}
    n = 0
    for line in Path(a.log).read_text(encoding="utf-8", errors="replace").splitlines():
        m = re.search(r"ARROWTEXT (\{.*\})", line)
        if not m:
            continue
        try:
            d = json.loads(m.group(1))
        except json.JSONDecodeError:
            continue
        n += 1
        for h in d["hits"]:
            if h["len"] >= a.min:
                rows.setdefault(h["t"], []).append((d["f"], h["len"]))
    audited = len(re.findall(r"TEXTAUDIT ", Path(a.log).read_text(encoding="utf-8", errors="replace")))
    print(f"arrow_text_lint: {audited} audited frames, {n} with any crossing, threshold {a.min} px")
    for t, hs in sorted(rows.items(), key=lambda kv: kv[1][0][0]):
        fs = sorted(h[0] for h in hs)
        print(f"  FAIL  '{t}': frames {fs[0]}-{fs[-1]} ({len(set(fs))} f), longest {max(h[1] for h in hs)} px")
    if not audited:
        print("arrow_text_lint: no TEXTAUDIT lines (render with props {\"audit\": true} and --log=verbose)")
        return 2
    print("arrow_text_lint:", "PASS" if not rows else "FAIL")
    return 0 if not rows else 1


if __name__ == "__main__":
    sys.exit(main())
