"""Run 2: writes the compact JSON the /ostad reading tool imports (app/ostad/data/) and the per-video transcripts it
fetches on demand (public/ostad/tr/{id}.txt). Every number on the dashboard comes from here.

Inputs: data/videos.json (read2 fields + theme), data/themes.json + themes/{slug}.md, data/cares.json, data/plan.json,
REPORT2.md, data/ads.json, data/embeds.json.
"""
import json, re, shutil, statistics
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
DATA, OUT, TR = ROOT / "data", REPO / "app" / "ostad" / "data", REPO / "public" / "ostad" / "tr"
OUT.mkdir(parents=True, exist_ok=True)
TR.mkdir(parents=True, exist_ok=True)


def j(name, default=None):
    f = DATA / name
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else default


def w(name, obj):
    (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return obj


def med(xs):
    xs = [x for x in xs if x is not None]
    return round(statistics.median(xs), 3) if xs else 0


def blocks(md, slug_headings=False):
    out, para = [], []

    def flush():
        if para:
            out.append(dict(t="p", s=" ".join(para)))
            para.clear()

    for line in md.splitlines():
        s = line.rstrip()
        if not s.strip():
            flush(); continue
        if s.startswith("# "):
            flush(); continue  # the page supplies its own title
        if s.strip() == "<!-- figure -->":
            flush(); out.append(dict(t="fig", s="")); continue
        if s.startswith("<!--"):
            continue
        m = re.match(r"^(#{2,3})\s+(.*?)\s*(\{#([a-z0-9-]+)\})?\s*$", s)
        if m:
            flush()
            b = dict(t="h2" if len(m.group(1)) == 2 else "h3", s=m.group(2))
            if m.group(4):
                b["theme"] = m.group(4)
            out.append(b); continue
        if re.match(r"^\s*([-*]|\d+\.)\s+", s):
            flush(); out.append(dict(t="li", s=re.sub(r"^\s*([-*]|\d+\.)\s+", "", s))); continue
        if s.startswith(">"):
            flush(); out.append(dict(t="quote", s=s.lstrip("> ").strip())); continue
        para.append(s.strip())
    flush()
    return out


vids = j("videos.json")
emb = j("embeds.json", {})
niche = [v for v in vids if v["source"] != "own"]


def sc(v):
    return round(((v.get("saves") or 0) + (v.get("comments") or 0)) / v["views"] * 1000, 2) if v.get("views") else 0


compact = []
for v in vids:
    t = (v.get("transcript") or "") if v.get("transcript_status") in ("whisper", "captions") else ""
    if t:
        (TR / f"{v['id']}.txt").write_text(t, encoding="utf-8")
    compact.append(dict(
        id=v["id"], p=v["platform"], src=v["source"], url=v["url"], emb=(emb.get(v["id"]) or {}).get("emb"),
        h=v["creator_handle"] or "", fol=v.get("creator_followers"), d=(v.get("posted_at") or "")[:10] or None,
        dur=v.get("duration_s"), cap=(v.get("caption") or "")[:300], title=v.get("title") or "",
        v=v.get("views") or 0, l=v.get("likes") or 0, c=v.get("comments") or 0, s=v.get("shares") or 0, sv=v.get("saves") or 0,
        vpd=round(v.get("views_per_day") or 0), x=round(v.get("outlier_score") or 0, 3), sc=sc(v), win=bool(v.get("winning")),
        g=v.get("genre") or "", f=v.get("format") or "", ht=v.get("hook_type") or "", subj=v.get("subject") or "",
        claim=v.get("claim") or "", tone=v.get("tone") or [], spk=v.get("speaker") or "other",
        mk=bool(v.get("makeable_by_ostad")), mkn=v.get("makeable_note") or None, ar=v.get("audience_reaction") or None,
        th=v.get("theme") or "", ol=v.get("opening_line"), ts=v.get("transcript_status") or "pending",
        tw=len(t.split())))
w("videos.json", compact)

# themes
tmeta = j("themes.json", [])
themes = []
for t in tmeta:
    tv = [v for v in niche if v.get("theme") == t["slug"]]
    md_f = ROOT / "themes" / f"{t['slug']}.md"
    meta_f = ROOT / "classify2" / f"theme_meta_{t['slug']}.json"
    if meta_f.exists():
        t = dict(t, **{k: v for k, v in json.loads(meta_f.read_text(encoding="utf-8")).items() if k in ("says", "examples")})
    themes.append(dict(
        slug=t["slug"], name=t["name"], short=t["short"], says=t.get("says", ""), examples=t["examples"],
        n=len(tv), share=round(len(tv) / len(niche), 3), winShare=round(sum(v["winning"] for v in tv) / max(len(tv), 1), 3),
        medX=med([v["outlier_score"] for v in tv]), mkShare=round(sum(bool(v.get("makeable_by_ostad")) for v in tv) / max(len(tv), 1), 3),
        mkN=sum(bool(v.get("makeable_by_ostad")) for v in tv),
        blocks=blocks(md_f.read_text(encoding="utf-8")) if md_f.exists() else []))
themes.sort(key=lambda t: -t["n"])
w("themes.json", themes)

w("cares.json", j("cares.json", []))  # authored in phase 2c
plan = j("plan.json", {"slots": [], "backups": [], "backlog": [], "batches": []})
byid = {v["id"]: v for v in vids}
for s_ in plan.get("slots", []) + plan.get("backups", []):
    s_["refs"] = [dict(id=r["id"], ol=byid.get(r["id"], {}).get("opening_line")) for r in s_.get("refs", [])]
w("plan.json", {k: plan.get(k, []) for k in ("slots", "backups", "backlog", "batches")})

rep_f = ROOT / "REPORT2.md"
rep = rep_f.read_text(encoding="utf-8") if rep_f.exists() else "# Report\n\npending\n"
title = re.search(r"^# (.+)$", rep, re.M).group(1)
bl = blocks(rep)
lede = bl.pop(0)["s"] if bl and bl[0]["t"] == "p" else ""
w("report.json", dict(title=title, lede=lede, blocks=bl))

# him: genre + tone mix, his videos vs winning makeable niche videos
own = [v for v in vids if v["source"] == "own"]
winmk = [v for v in niche if v.get("winning") and v.get("makeable_by_ostad")]


def share(rows, key, val):
    def has(r):
        x = r.get(key)
        return val in x if isinstance(x, list) else x == val
    return sum(1 for r in rows if has(r)) / max(len(rows), 1)


gs = Counter(v.get("genre") for v in own) + Counter(v.get("genre") for v in winmk)
top = [g for g, _ in sorted(gs.items(), key=lambda kv: -(share(own, "genre", kv[0]) + share(winmk, "genre", kv[0])))][:7]
gmix = [dict(key=g, his=round(share(own, "genre", g), 3), win=round(share(winmk, "genre", g), 3)) for g in top]
gmix.append(dict(key="everything else", his=round(1 - sum(m["his"] for m in gmix), 3), win=round(1 - sum(m["win"] for m in gmix), 3)))
tones = sorted({t for v in own + winmk for t in (v.get("tone") or [])})
tmix = sorted([dict(key=t, his=round(share(own, "tone", t), 3), win=round(share(winmk, "tone", t), 3)) for t in tones],
              key=lambda m: -abs(m["his"] - m["win"]))
own_meta = j("ostad_own.json", {}).get("baseline", {})
w("him.json", dict(genre=gmix, tone=tmix, hisN=len(own), winN=len(winmk),
                   medians={p: dict(his=b.get("median_views"), niche=med([v["views"] for v in niche if v["platform"] == p and v.get("makeable_by_ostad")]),
                                    posts=b.get("posts")) for p, b in own_meta.items()}))

ads = j("ads.json", [])
w("ads.json", [{k: x.get(k) for k in ("advertiser", "headline", "body", "start", "days", "platforms", "link", "term", "page_url")} for x in ads])

dates = sorted(v["posted_at"][:7] for v in vids if v.get("posted_at"))
st = Counter(v.get("transcript_status") for v in vids)
w("meta.json", {"videos": len(vids), "transcribed": st["whisper"] + st["captions"], "from": dates[0], "to": dates[-1]})

print(f"videos {len(compact)} · makeable {sum(c['mk'] for c in compact)} · themes {len(themes)} · transcripts {sum(1 for _ in TR.glob('*.txt'))}")
print("bytes:", {f.name: f.stat().st_size for f in OUT.glob('*.json')})
