"""Run 2: data/plan.json (authored from the themes) -> PLAN.md, and validates it.

Checks: 20 slots on Mon–Fri from 2026-11-09, 10 backups, 40 backlog titles, every slot has claim / opening line / 3 beats /
1–2 tones / ≥2 refs, every ref exists and is makeable, every theme slug exists. Exit 1 on any failure.
Fills each ref's opening line from videos.json so PLAN.md and the dashboard quote the same words.
"""
import datetime as dt, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
plan = json.loads((ROOT / "data" / "plan.json").read_text(encoding="utf-8"))
vids = {v["id"]: v for v in json.loads((ROOT / "data" / "videos.json").read_text(encoding="utf-8"))}
themes = {t["slug"]: t for t in json.loads((ROOT / "data" / "themes.json").read_text(encoding="utf-8"))}
TONES = {"clinical", "casual-friend", "confessional", "fear/warning", "humor", "luxury", "contrarian", "reassuring", "salesy"}
err = []

start = dt.date(2026, 11, 9)
days = [start + dt.timedelta(days=w * 7 + d) for w in range(4) for d in range(5)]
if len(plan["slots"]) != 20: err.append(f"{len(plan['slots'])} slots")
if len(plan["backups"]) != 10: err.append(f"{len(plan['backups'])} backups")
if len(plan["backlog"]) != 40: err.append(f"{len(plan['backlog'])} backlog")
for i, s in enumerate(plan["slots"]):
    s["n"], s["day"], s["dow"] = i + 1, days[i].isoformat(), days[i].strftime("%a")
for i, s in enumerate(plan["backups"]):
    s["n"], s["day"], s["dow"] = f"B{i + 1:02d}", None, None
for s in plan["slots"] + plan["backups"]:
    for k in ("title", "claim", "open", "why", "service", "batch"):
        if not s.get(k): err.append(f"{s['n']}: no {k}")
    if set(s.get("beats", {})) != {"open", "middle", "close"}: err.append(f"{s['n']}: beats")
    if not 1 <= len(s.get("tone", [])) <= 2 or set(s["tone"]) - TONES: err.append(f"{s['n']}: tone {s.get('tone')}")
    if s.get("theme") not in themes: err.append(f"{s['n']}: theme {s.get('theme')}")
    if len(s.get("refs", [])) < 2: err.append(f"{s['n']}: <2 refs")
    for r in s.get("refs", []):
        v = vids.get(r["id"])
        if not v: err.append(f"{s['n']}: ref {r['id']} missing"); continue
        if not v.get("makeable_by_ostad"): err.append(f"{s['n']}: ref {r['id']} not makeable")
        r["ol"] = v.get("opening_line")
for b in plan["backlog"]:
    if b.get("theme") not in themes: err.append(f"backlog theme {b.get('theme')}")
slot_ids = {str(s["n"]) for s in plan["slots"] + plan["backups"]}
for b in plan["batches"]:
    for n in b["slots"]:
        if str(n) not in slot_ids: err.append(f"batch {b['key']}: slot {n}")
in_batch = {str(n) for b in plan["batches"] for n in b["slots"]}
if missing := sorted(slot_ids - in_batch, key=str): err.append(f"slots in no batch: {missing}")
(ROOT / "data" / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=1), encoding="utf-8")


def x(v):
    return f"{v['outlier_score']:.1f}×" if v["outlier_score"] < 10 else f"{v['outlier_score']:.0f}×"


def slot_md(s):
    head = f"### {s['n']:02d} · {s['dow']} {s['day']} · {s['title']}" if isinstance(s["n"], int) else f"### {s['n']} · {s['title']}"
    out = [head, "",
           f"> “{s['open']}”", "",
           f"- **Theme:** {themes[s['theme']]['name']} · **tone:** {', '.join(s['tone'])} · **sells:** {s['service']} · **shoot:** {s['batch']}",
           f"- **Claim:** {s['claim']}",
           f"- **Open:** {s['beats']['open']}",
           f"- **Middle:** {s['beats']['middle']}",
           f"- **Close:** {s['beats']['close']}",
           f"- **Why it's his:** {s['why']}",
           "- **Built from:**"]
    for r in s["refs"]:
        v = vids[r["id"]]
        ol = f" “{r['ol']}”" if r.get("ol") else ""
        out.append(f"  - [{v['platform']} @{v['creator_handle']}]({v['url']}) · {x(v)} usual ·{ol}")
    return "\n".join(out) + "\n"


md = ["# OSTAD CONTENT INTEL: Plan (run 2)", "",
      "Twenty posts from Monday 2026-11-09, plus 10 backups and 40 more titles. The plan is built from the themes in `themes/`, not from genre tables.",
      "Each slot gives the claim, the first line Dr. Ostad says, the video's shape in three beats (structure, not a script), the tone, and the makeable videos it is built from.", "",
      "## The four weeks", "", "| | Mon | Tue | Wed | Thu | Fri |", "|---|---|---|---|---|---|"]
for w in range(4):
    cells = [f"“{s['open']}” <br>*{themes[s['theme']]['name']}*" for s in plan["slots"][w * 5:(w + 1) * 5]]
    md.append(f"| **W{w + 1}** | " + " | ".join(cells) + " |")
md += ["", plan.get("rhythm", ""), "", "## Shoot in batches", ""]
for b in plan["batches"]:
    md.append(f"- **{b['name']}**: slots {', '.join(str(n) for n in b['slots'])}. {b['note']}")
md += ["", "## The 20 slots", ""] + [slot_md(s) for s in plan["slots"]]
md += ["## 10 backups", ""] + [slot_md(s) for s in plan["backups"]]
md += ["## Backlog: 40 more, ranked", ""] + [f"{i + 1}. {b['title']} *({themes[b['theme']]['name']})*" for i, b in enumerate(plan["backlog"])]
(ROOT / "PLAN.md").write_text("\n".join(md) + "\n", encoding="utf-8")

print("PLAN.md written;", "OK" if not err else f"{len(err)} problems")
for e in err[:40]:
    print("  ", e)
sys.exit(1 if err else 0)
