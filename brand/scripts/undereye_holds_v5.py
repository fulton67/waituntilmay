"""Under-eye v5 hold check (Naim: every pop-up holds >= 2 s). Resolves every beat of timelines/undereye.json against props_v5 and lists
(a) every non-footage beat's on-screen time, (b) every in-beat event/label that appears and then leaves with its beat (time from its
appearance to the beat's end). Anything under 48 f is a FAIL. The B/A window note1 -> note2 swap and card ticks count as pop-ups.
usage: python brand/scripts/undereye_holds_v5.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import timeline_lib as T
MIN = 48
tl = T.load(T.REM / "timelines/undereye.json"); P = T.transcript(tl)
bad, rows = [], []
for b in tl["beats"]:
    if b["lane"] == "footage" or b["id"].startswith("pic"): continue
    EMPH = {("plan", "side1"), ("plan", "side2")}  # line-weight emphasis on marks already drawn, not a pop-up
    s, e = T.resolve(b["start"], tl, P), T.resolve(b["end"], tl, P)
    if b.get("device") == "RealObject": e = max(e, s + 14 + MIN)  # RealObject.holdOut
    rows.append((b["id"], "beat", e - s))
    for k, a in (b.get("events") or {}).items():
        t = T.resolve(a, tl, P)
        if s <= t < e and (b["id"], k) not in EMPH: rows.append((b["id"], f"event {k}", e - t))
    for i, l in enumerate((b.get("plate") or {}).get("labels") or []):
        if isinstance(l, dict) and l.get("at"):
            t = T.resolve(l["at"], tl, P); rows.append((b["id"], f"label {l.get('text', i)}", e - t))
    for r in (b.get("text") or {}).get("rows") or []:
        if isinstance(r, dict) and r.get("at"):
            t = T.resolve(r["at"], tl, P); rows.append((b["id"], f"row {r['text']}", e - t))
for r in rows:
    if r[2] < MIN: bad.append(r)
print(f"{len(rows)} pop-ups checked; shortest:", sorted(rows, key=lambda r: r[2])[:5])
print("FAIL" if bad else "PASS", bad)
