"""data/plan.json -> PLAN.md, after checking every reference id exists and every date is the weekday it claims."""
import json, pathlib, datetime as dt
from collections import Counter

ROOT = pathlib.Path(__file__).resolve().parents[1]
plan = json.loads((ROOT / "data/plan.json").read_text(encoding="utf-8"))
vids = {v["id"]: v for v in json.loads((ROOT / "data/videos.json").read_text(encoding="utf-8"))}
a = json.loads((ROOT / "data/analysis.json").read_text(encoding="utf-8"))
SITE = "https://waituntilmay.com"
errs = []
for s in plan["slots"] + plan["backups"]:
    for r in s["refs"]:
        if r["id"] not in vids:
            errs.append(f"slot {s['n']}: unknown ref {r['id']}")
    if s["day"] != "backup":
        d = dt.date.fromisoformat(s["day"])
        if d.strftime("%a") != s["dow"]:
            errs.append(f"slot {s['n']}: {s['day']} is {d.strftime('%a')} not {s['dow']}")
assert len(plan["slots"]) == 20 and len(plan["backups"]) == 10 and len(plan["backlog"]) == 40, "counts"
if errs:
    raise SystemExit("\n".join(errs))


def k(n):
    return f"{n / 1e6:.1f}M" if n >= 1e6 else f"{n / 1e3:.0f}K" if n >= 1e3 else str(n)


def slot_md(s):
    refs = "\n".join(f"  - [{vids[r['id']]['platform']} · @{vids[r['id']]['creator_handle']}]({vids[r['id']]['url']}) `{r['id']}`: {r['why']}"
                     for r in s["refs"])
    head = f"### {s['n']:02d} · {s['dow']} {s['day']} · {s['title']}" if s["day"] != "backup" else f"### B{s['n'] - 20:02d} · {s['title']}"
    return f"""{head}

- **Pillar:** {s['pillar']} · **Genre:** {s['genre']} · **Format:** {s['format']} · **Hook:** {s['hook_type']} · **Effort:** {s['effort']}
- **Angle:** {s['angle']}
- **Sells (softly):** {s['service']}
- **Ostad's version:** {s['ostad_version']}
- **References:**
{refs}
"""


mix = Counter(s["genre"] for s in plan["slots"])
win = a["winningGenreMix"]; tw = sum(win.values())
batch_of = {n: b["name"] for b in plan["batches"] for n in b["slots"]}
for s in plan["slots"]:
    s["batch"] = batch_of.get(s["n"])
(ROOT / "data/plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=1), encoding="utf-8")

lines = ["# OSTAD — 4-week content plan (Mon 9 Nov → Fri 4 Dec 2026)", "",
         "Twenty posts, Monday to Friday, plus ten backups and forty backlog titles. Ideas, titles, angles and references, not scripts. "
         f"Every reference is a real video in the corpus (dashboard: {SITE}/ostad/plan). Numbers are views · outlier (views ÷ the creator's normal) unless stated.", "",
         "## Pillars", ""]
lines += [f"- **{p['name']}**: {p['why']}" for p in plan["pillars"]]
lines += ["", "## The weekly rhythm", "",
          "| | Mon | Tue | Wed | Thu | Fri |", "|---|---|---|---|---|---|"]
for w in range(4):
    row = plan["slots"][w * 5:(w + 1) * 5]
    lines.append(f"| **W{w + 1}** | " + " | ".join(f"{s['title']} <br>*{s['genre']} · {s['effort']}*" for s in row) + " |")
lines += ["", "**Mon = Mohs/skin cancer, every week.** The genre scores (4.1× overall, 31.3× on TikTok, 53% of TikTok ones win), so the spec's "
          "\"one per week only if it scores\" condition is met. **Tue = proof** (before-after / procedure, the biggest reach lever). **Wed = myth-bust / red flag** "
          "(best all-round engagement). **Thu = a real viewer question.** **Fri = trend or proof.**", "",
          "**Mix vs what wins in the niche:**", "", "| genre | slots in plan | share of plan | share of niche winners |", "|---|---:|---:|---:|"]
for g, n in mix.most_common():
    lines.append(f"| {g} | {n} | {n / 20 * 100:.0f}% | {win.get(g, 0) / tw * 100:.0f}% |")
lines += ["", "Bent toward education the way the data supports: ad/promo (12% of niche winners, but 0.67–1.0× and Ostad's most over-used genre) and "
          "generic humour (8%, mostly off-niche memes) are left out of the calendar on purpose; skin-cancer and Q&A get more weight than their winner share "
          "because they're the lanes he can own and where engagement is highest.", "", "## Shoot in batches", ""]
for b in plan["batches"]:
    lines.append(f"- **{b['name']}**: slots {', '.join(str(n) for n in b['slots'])}. {b['note']}")
lines += ["", "## The 20 slots", ""] + [slot_md(s) for s in plan["slots"]]
lines += ["## 10 backups", ""] + [slot_md(s) for s in plan["backups"]]
lines += ["## Backlog: 40 more titles, ranked", "", "Ranked by how well the topic scores in the corpus and how little he'd need to shoot.", ""]
lines += [f"{i}. {t}" for i, t in enumerate(plan["backlog"], 1)]
(ROOT / "PLAN.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
print("PLAN.md ok;", dict(mix))
