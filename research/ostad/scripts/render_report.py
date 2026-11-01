"""REPORT.src.md + data -> REPORT.md. Every {{TOKEN}} is a table rendered from data/, so the numbers can't drift from the data."""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[1]
D = ROOT / "data"
a = json.loads((D / "analysis.json").read_text(encoding="utf-8"))
v = json.loads((D / "videos.json").read_text(encoding="utf-8"))
own = json.loads((D / "ostad_own.json").read_text(encoding="utf-8"))
q = json.loads((D / "questions.json").read_text(encoding="utf-8"))
ads = json.loads((D / "ads.json").read_text(encoding="utf-8"))
byid = {x["id"]: x for x in v}
SITE = "https://waituntilmay.com"


def k(n):
    n = n or 0
    return f"{n / 1e6:.1f}M" if n >= 1e6 else f"{n / 1e3:.0f}K" if n >= 1e4 else f"{n / 1e3:.1f}K" if n >= 1e3 else f"{n:.0f}"


def table(rows, label, minn=5):
    out = [f"| {label} | n | median views | median outlier | median engagement | saves+shares / view | comments / view | share winning |",
           "|---|---:|---:|---:|---:|---:|---:|---:|"]
    for r in rows:
        if r["n"] >= minn:
            out.append(f"| {r['key']} | {r['n']} | {k(r['medViews'])} | {r['medOutlier']:.2f}× | {r['medEr'] * 100:.1f}% | "
                       f"{r['medSaveRate'] * 100:.2f}% | {r['medCommentRate'] * 100:.3f}% | {r['winShare'] * 100:.0f}% |")
    return "\n".join(out)


def matrix():
    plats = ["tiktok", "instagram", "youtube"]
    per = {p: {r["key"]: r for r in a["byPlatform"]["genre"][p]} for p in plats}
    out = ["| genre | TikTok n · outlier · eng | Instagram n · outlier · eng | YouTube n · outlier · eng |", "|---|---|---|---|"]
    for r in a["tables"]["genre"]:
        cells = []
        for p in plats:
            x = per[p].get(r["key"])
            cells.append(f"{x['n']} · {x['medOutlier']:.2f}× · {x['medEr'] * 100:.1f}%" if x else "—")
        out.append(f"| {r['key']} | " + " | ".join(cells) + " |")
    return "\n".join(out)


def top30():
    ids = json.loads((D / "top30_ids.json").read_text())
    out = ["| # | thumb | platform · creator | genre | views · outlier · eng | hook / title | why it worked |", "|---|---|---|---|---|---|---|"]
    for i, vid in enumerate(ids, 1):
        x = byid[vid]
        hook = (x["on_screen_hook"] or x["title"] or x["caption"]).replace("\n", " ").replace("|", "/")[:90]
        out.append(f"| {i} | ![]({SITE}{x['thumbnail_local']}) | [{x['platform']} · @{x['creator_handle']}]({x['url']}) | {x['genre']} | "
                   f"{k(x['views'])} · {x['outlier_score']:.0f}× · {x['engagement_rate'] * 100:.1f}% | {hook} | {x['why'].replace('|', '/')} |")
    return "\n".join(out)


def own_rows(best=True):
    o = sorted([x for x in v if x["source"] == "own"], key=lambda x: -x["views"])
    sel = o[:5] if best else o[-5:]
    out = ["| platform | date | views | genre · hook | post | why |", "|---|---|---:|---|---|---|"]
    for x in sel:
        t = (x["title"] or x["caption"]).replace("\n", " ").replace("|", "/")[:80]
        out.append(f"| {x['platform']} | {x['posted_at']} | {x['views']:,} | {x['genre']} · {x['hook_type']} | [{t}]({x['url']}) | {x['why'].replace('|', '/')} |")
    return "\n".join(out)


def baseline():
    b = own["baseline"]
    out = ["| platform | his posts scraped | with view counts | his median views | niche median views | gap |", "|---|---:|---:|---:|---:|---:|"]
    for p in ("tiktok", "instagram", "youtube"):
        nm = a["medians"][p]["views"]
        om = b[p]["median_views"] or 0
        out.append(f"| {p} | {b[p]['posts']} | {b[p]['videos_with_views']} | {k(om)} | {k(nm)} | {nm / om:.0f}× |")
    return "\n".join(out)


def mix():
    w = a["winningGenreMix"]; o = a["ownGenreMix"]
    tw, to = sum(w.values()), sum(o.values())
    keys = sorted(set(w) | set(o), key=lambda g: -(w.get(g, 0) / tw))
    out = ["| genre | share of niche winners | share of Ostad's videos |", "|---|---:|---:|"]
    for g in keys:
        out.append(f"| {g} | {w.get(g, 0) / tw * 100:.0f}% ({w.get(g, 0)}) | {o.get(g, 0) / to * 100:.0f}% ({o.get(g, 0)}) |")
    return "\n".join(out)


def questions():
    out = ["| # | question (verbatim) | likes | topic | Ostad service | good video in corpus? |", "|---|---|---:|---|---|---|"]
    seen, i = set(), 0
    for x in q:
        if x["topic"] in seen:
            continue
        seen.add(x["topic"]); i += 1
        out.append(f"| {i} | {x['q'][:140].replace('|', '/').replace(chr(10), ' ')} | {x['likes']:,} | {x['topic']} | {x['service']} | {x['covered']} |")
        if i == 15:
            break
    return "\n".join(out)


def adtable():
    out = ["| days running | advertiser | search | format | angle (headline / first line) |", "|---:|---|---|---|---|"]
    for x in ads[:15]:
        body = (x["headline"] or "") + " — " + (x["body"] or "")[:120]
        out.append(f"| {x['days']} | [{x['advertiser']}]({x['link']}) | {x['term']} | {x.get('format') or ''} | {body.replace('|', '/').replace(chr(10), ' ')} |")
    return "\n".join(out)


T = {"GENRE": table(a["tables"]["genre"], "genre"), "FORMAT": table(a["tables"]["format"], "format"),
     "HOOK": table(a["tables"]["hook"], "hook type"), "MATRIX": matrix(), "TOP30": top30(), "OWN_BEST": own_rows(True),
     "OWN_WORST": own_rows(False), "BASELINE": baseline(), "MIX": mix(), "QUESTIONS": questions(), "ADS": adtable()}
src = (ROOT / "REPORT.src.md").read_text(encoding="utf-8")
out = re.sub(r"\{\{(\w+)\}\}", lambda m: T[m.group(1)], src)
(ROOT / "REPORT.md").write_text(out, encoding="utf-8")
print("REPORT.md", len(out), "chars; tokens left:", re.findall(r"\{\{\w+\}\}", out))
