"""Phase 6 numbers: data/analysis.json (+ data/ads.json from raw ads). Idempotent; REPORT.md quotes these numbers."""
import json, pathlib, statistics as st, datetime as dt, re
from collections import Counter, defaultdict

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA, RAW = ROOT / "data", ROOT / "raw"
NOW = dt.datetime(2026, 11, 1, tzinfo=dt.timezone.utc)


def med(xs):
    xs = [x for x in xs if x is not None]
    return st.median(xs) if xs else 0


def table(rows, key):
    g = defaultdict(list)
    for r in rows:
        k = r.get(key)
        for kk in (k if isinstance(k, list) else [k]):
            if kk:
                g[kk].append(r)
    out = [dict(key=k, n=len(v), medViews=med([r["views"] for r in v]), medOutlier=round(med([r["outlier_score"] for r in v]), 3),
                medEr=round(med([r["engagement_rate"] for r in v]), 4),
                medSaveRate=round(med([(r["saves"] + r["shares"]) / r["views"] for r in v if r["views"]]), 4),
                medCommentRate=round(med([r["comments"] / r["views"] for r in v if r["views"]]), 5),
                winShare=round(sum(bool(r.get("winning")) for r in v) / len(v), 3)) for k, v in g.items()]
    return sorted(out, key=lambda r: -r["medOutlier"])


def ads():
    out = []
    for f in sorted(RAW.glob("ads__meta__*.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        term = d["key"].split("__")[-1].replace("-", " ")
        for a in d["items"]:
            if a.get("error"):
                continue
            s = a.get("snapshot") or {}
            body = s.get("body") or {}
            body = body.get("text") if isinstance(body, dict) else str(body or "")
            cards = s.get("cards") or []
            if (not body or "{{" in body) and cards:
                body = cards[0].get("body") or body
            title = s.get("title") or (cards[0].get("title") if cards else "") or ""
            start = a.get("start_date")
            start_d = dt.datetime.fromtimestamp(int(start), dt.timezone.utc) if start else None
            out.append(dict(advertiser=a.get("page_name") or s.get("page_name"), headline=title if "{{" not in title else "",
                            body=(body or "")[:600], start=start_d.date().isoformat() if start_d else None,
                            days=(NOW - start_d).days if start_d else None,
                            platforms=[p.lower() for p in a.get("publisher_platform") or []],
                            link=a.get("ad_library_url"), term=term, landing=s.get("link_url"),
                            format=s.get("display_format"), cta=s.get("cta_text"),
                            page_likes=s.get("page_like_count"), categories=s.get("page_categories")))
    seen, uniq = set(), []
    for a in sorted(out, key=lambda a: -(a["days"] or 0)):
        k = (a["advertiser"], (a["body"] or "")[:80])
        if k in seen:
            continue
        seen.add(k)
        uniq.append(a)
    (DATA / "ads.json").write_text(json.dumps(uniq, ensure_ascii=False, indent=1), encoding="utf-8")
    return uniq


def main():
    vids = json.loads((DATA / "videos.json").read_text(encoding="utf-8"))
    niche = [v for v in vids if v["source"] != "own"]
    costs = json.loads((DATA / "costs.json").read_text())
    dates = sorted(v["posted_at"] for v in vids if v["posted_at"])
    a = dict(
        totals=dict(videos=len(vids), niche=len(niche), byPlatform=dict(Counter(v["platform"] for v in vids)),
                    bySource=dict(Counter(v["source"] for v in vids)),
                    byPlatformSource={f"{p}/{s}": n for (p, s), n in Counter((v["platform"], v["source"]) for v in vids).items()},
                    from_=dates[0] if dates else None, to=dates[-1] if dates else None,
                    costUsd=round(sum(max(c.get("usd") or 0, c.get("est") or 0) for c in costs), 2),
                    classified=sum(bool(v.get("genre")) for v in vids), winning=sum(bool(v.get("winning")) for v in niche),
                    withTranscript=sum(bool(v.get("on_screen_hook")) for v in vids),
                    postedLast90=sum(1 for v in niche if v["days_live"] and v["days_live"] <= 90)),
        medians={p: dict(views=med([v["views"] for v in niche if p == "all" or v["platform"] == p]),
                         er=round(med([v["engagement_rate"] for v in niche if p == "all" or v["platform"] == p]), 4),
                         outlier=round(med([v["outlier_score"] for v in niche if p == "all" or v["platform"] == p]), 3),
                         vpd=med([v["views_per_day"] for v in niche if p == "all" or v["platform"] == p]))
                 for p in ["all", "tiktok", "instagram", "youtube"]},
        tables=dict(genre=table(niche, "genre"), format=table(niche, "format"), hook=table(niche, "hook_type"),
                    topic=table(niche, "topic_tags"), source=table(niche, "source")),
        byPlatform=dict(genre={p: table([v for v in niche if v["platform"] == p], "genre") for p in ["tiktok", "instagram", "youtube"]},
                        format={p: table([v for v in niche if v["platform"] == p], "format") for p in ["tiktok", "instagram", "youtube"]}),
        relevant=dict(genre=table([v for v in niche if v.get("ostad_relevant")], "genre")),
        ownGenre=table([v for v in vids if v["source"] == "own"], "genre"),
        ownFormat=table([v for v in vids if v["source"] == "own"], "format"),
        winningGenreMix=dict(Counter(v.get("genre") for v in niche if v.get("winning"))),
        ownGenreMix=dict(Counter(v.get("genre") for v in vids if v["source"] == "own")),
        creators=sorted([dict(handle=h, platform=p, n=len(vs), medViews=med([v["views"] for v in vs]),
                              wins=sum(bool(v.get("winning")) for v in vs))
                         for (p, h), vs in _group(niche, lambda v: (v["platform"], v["creator_handle"])).items() if len(vs) >= 3],
                        key=lambda c: -c["medViews"]),
    )
    a["totals"]["from"] = a["totals"].pop("from_")
    a["ads"] = len(ads())
    (DATA / "analysis.json").write_text(json.dumps(a, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(a["totals"]), json.dumps(a["medians"]))


def _group(xs, f):
    g = defaultdict(list)
    for x in xs:
        g[f(x)].append(x)
    return g


if __name__ == "__main__":
    main()
