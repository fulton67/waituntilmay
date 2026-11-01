"""research/ostad/data/*.json -> app/ostad/data/*.json (compact shapes in app/ostad/_lib/types.ts). Idempotent."""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUT = ROOT.parents[1] / "app" / "ostad" / "data"
OUT.mkdir(parents=True, exist_ok=True)


def j(p, default=None):
    f = DATA / p
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else default


def w(name, obj):
    (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


vids = j("videos.json")
w("videos.json", [dict(id=v["id"], p=v["platform"], src=v["source"], q=v["query_or_hashtag"], url=v["url"], h=v["creator_handle"],
                       fol=v["creator_followers"], d=v["posted_at"], days=v["days_live"], dur=v["duration_s"],
                       cap=(v["caption"] or "")[:1200], title=v["title"] or "", hook=v["on_screen_hook"] or "", tr=v["transcript"] or "",
                       v=v["views"], l=v["likes"], c=v["comments"], s=v["shares"], sv=v["saves"], er=v["engagement_rate"],
                       vpd=v["views_per_day"], os=v["outlier_score"], g=v.get("genre") or "", f=v.get("format") or "",
                       ht=v.get("hook_type") or "", tags=v.get("topic_tags") or [], rel=bool(v.get("ostad_relevant")),
                       win=bool(v.get("winning")), why=v.get("why") or "", notes=v["notes"]) for v in vids])

a = j("analysis.json")
a["byPlatform"] = {"genre": a["byPlatform"]["genre"]}
w("analysis.json", {k: a[k] for k in ("totals", "medians", "tables", "byPlatform")})

own = j("ostad_own.json")
genre_by_url = {v["url"]: v.get("genre") for v in vids if v["source"] == "own"}
w("own.json", dict(baseline=own["baseline"],
                   niche={p: {"median_views": a["medians"][p]["views"]} for p in ("tiktok", "instagram", "youtube")},
                   posts=[dict(id=p["id"], p=p["platform"], url=p["url"], d=p["date"], cap=p["caption"][:300], v=p["views"],
                               l=p["likes"], c=p["comments"], kind=p["kind"], g=genre_by_url.get(p["url"])) for p in own["posts"]]))

w("plan.json", j("plan.json", {"pillars": [], "slots": [], "backups": [], "backlog": [], "batches": []}))
w("questions.json", j("questions.json", []))
w("ads.json", [{k: x[k] for k in ("advertiser", "headline", "body", "start", "days", "platforms", "link", "term")} for x in j("ads.json", [])])
print("wrote", sorted(p.name for p in OUT.glob("*.json")), sum(p.stat().st_size for p in OUT.glob("*.json")) // 1024, "KB")
