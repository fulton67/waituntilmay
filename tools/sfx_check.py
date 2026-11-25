"""sfx_check: every sound effect lands within 1 frame of its graphic's spring settle frame (first reach of the target, 0.5 %).

  python -I tools/sfx_check.py <timeline.json> [...]     FAST LANE timelines (public/fast/<reel>/timeline.json): slot.sfx.frame vs
                                                          slot.start + first_reach(slot.spring). Exit 1 on any miss.
  Legacy reel timelines (brand/remotion/timelines/*.json) name no springs: each sound is reported as UNNAMED (a fail), with its count.
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from springs import SPRINGS, first_reach  # noqa: E402


def check(p):
    tl = json.loads(Path(p).read_text(encoding="utf-8"))
    rows, bad = [], 0
    if tl.get("schema") == "fast/1":
        for s in tl["slots"]:
            if not s.get("sfx"):
                continue
            if s.get("spring") not in SPRINGS:
                rows.append((s["id"], "UNNAMED", None)); bad += 1; continue
            want = s["start"] + first_reach(s["spring"], tl.get("fps", 24))
            d = s["sfx"]["frame"] - want
            ok = abs(d) <= 1
            bad += not ok
            rows.append((s["id"], "ok" if ok else "MISS", d))
    else:
        for b in tl.get("beats", []):
            for x in b.get("sfx") or []:
                rows.append((f"{b['id']}:{x.get('name')}", "UNNAMED", None)); bad += 1
    return rows, bad


def main():
    total = 0
    for p in sys.argv[1:]:
        rows, bad = check(p)
        total += bad
        n = len(rows)
        print(f"{p}: {n} sounds, {n - bad} within 1 f of settle, {bad} fail")
        for r in rows:
            if r[1] != "ok":
                print("   ", r)
    print("sfx_check:", "FAIL" if total else "PASS")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
