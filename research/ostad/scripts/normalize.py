"""Phase 2 + 4: raw/*.json -> data/videos.json, data/videos.csv, data/ostad_own.json.

Idempotent. Keeps any classification already in data/videos.json (genre etc.) keyed by id.
Also fetches TikTok subtitles (VTT) into raw/subs/ once; links expire, so run soon after scraping.
"""
import json, re, csv, statistics as st, pathlib, datetime as dt, html
from concurrent.futures import ThreadPoolExecutor
import requests

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW, DATA, SUBS = ROOT / "raw", ROOT / "data", ROOT / "raw" / "subs"
SUBS.mkdir(parents=True, exist_ok=True)
NOW = dt.datetime(2026, 11, 1, tzinfo=dt.timezone.utc)
OWN_HANDLES = {"drarielostad", "arielostadmd", "ariel ostad md", "arielostadmdpc", "dr. ariel ostad",
               "ariel ostad", "arielostad"}
CLASS_FIELDS = ["genre", "format", "hook_type", "topic_tags", "ostad_relevant", "why"]


def num(x):
    try:
        return max(int(float(x)), 0)
    except (TypeError, ValueError):
        return 0


def iso(s):
    if not s:
        return None
    if isinstance(s, (int, float)):
        return dt.datetime.fromtimestamp(s, dt.timezone.utc)
    try:
        return dt.datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except ValueError:
        return None


def hms(s):
    if not s:
        return None
    if isinstance(s, (int, float)):
        return float(s)
    parts = [int(p) for p in str(s).split(":") if p.isdigit()]
    t = 0
    for p in parts:
        t = t * 60 + p
    return float(t)


def source_of(key):
    return "own" if key.startswith("own__") else "benchmark" if key.startswith("bench__") else "search"


def tiktok(it, key):
    a, v = it.get("authorMeta") or {}, it.get("videoMeta") or {}
    subs = [s for s in (v.get("subtitleLinks") or []) if str(s.get("language", "")).startswith("eng")]
    return dict(platform="tiktok", vid=str(it.get("id")), url=it.get("webVideoUrl"),
                thumbnail_url=v.get("originalCoverUrl") or v.get("coverUrl"),
                creator_handle=a.get("name"), creator_followers=num(a.get("fans")),
                creator_url=a.get("profileUrl") or (a.get("name") and f"https://www.tiktok.com/@{a.get('name')}"),
                posted=iso(it.get("createTimeISO") or it.get("createTime")), duration_s=num(v.get("duration")),
                caption=it.get("text") or "", title="", views=num(it.get("playCount")), likes=num(it.get("diggCount")),
                comments=num(it.get("commentCount")), shares=num(it.get("shareCount")),
                saves=num(it.get("collectCount")), query=it.get("searchQuery") or it.get("input") or "",
                sub_url=(subs[0].get("downloadLink") if subs else None), is_ad=bool(it.get("isAd") or it.get("isSponsored")),
                slideshow=bool(it.get("isSlideshow")))


def instagram(it, key):
    views = num(it.get("videoPlayCount") or it.get("igPlayCount") or it.get("videoViewCount"))
    tag = ""
    m = re.search(r"/explore/tags/([^/]+)", it.get("inputUrl") or "")
    if m:
        tag = "#" + m.group(1)
    return dict(platform="instagram", vid=str(it.get("shortCode") or it.get("id")), url=it.get("url"),
                thumbnail_url=it.get("displayUrl"), creator_handle=it.get("ownerUsername"), creator_followers=0,
                creator_url=it.get("ownerUsername") and f"https://www.instagram.com/{it.get('ownerUsername')}/",
                posted=iso(it.get("timestamp")), duration_s=num(it.get("videoDuration")), caption=it.get("caption") or "",
                title="", views=views, likes=num(it.get("likesCount")), comments=num(it.get("commentsCount")),
                shares=num(it.get("sharesCount")), saves=0, query=tag, sub_url=None,
                is_ad=bool(it.get("paidPartnership")), ig_type=it.get("type"), product=it.get("productType"))


def youtube(it, key):
    q = it.get("input") or ""
    if isinstance(q, dict):
        q = q.get("query") or ""
    return dict(platform="youtube", vid=str(it.get("id")), url=it.get("url"), thumbnail_url=it.get("thumbnailUrl"),
                creator_handle=it.get("channelUsername") or it.get("channelName"),
                creator_followers=num(it.get("numberOfSubscribers")), creator_url=it.get("channelUrl"),
                posted=iso(it.get("date")), duration_s=hms(it.get("duration")), caption=it.get("text") or "",
                title=it.get("title") or "", views=num(it.get("viewCount")), likes=num(it.get("likes")),
                comments=num(it.get("commentsCount")), shares=0, saves=0, query=q if isinstance(q, str) else "",
                sub_url=None, is_ad=bool(it.get("isPaidContent")), yt_type=it.get("type"),
                channel_name=it.get("channelName"))


PARSE = {"tiktok": tiktok, "instagram": instagram, "youtube": youtube}


def platform_of(key, actor):
    if "tiktok" in actor:
        return "tiktok"
    if "instagram" in actor:
        return "instagram"
    if "youtube" in actor:
        return "youtube"
    return None


def load_raw():
    rows = []
    for f in sorted(RAW.glob("*.json")):
        if f.name.startswith("test__") or f.name.startswith("log"):
            continue
        d = json.loads(f.read_text(encoding="utf-8"))
        p = platform_of(d["key"], d["actor"])
        if not p:
            continue
        for it in d.get("items", []):
            if it.get("error") or it.get("errorDescription"):
                continue
            r = PARSE[p](it, d["key"])
            if not r["vid"] or r["vid"] == "None" or not r["url"]:
                continue
            r["source"] = source_of(d["key"])
            r["raw_key"] = d["key"]
            rows.append(r)
    return rows


def norm_url(u):
    u = (u or "").split("?")[0].rstrip("/").lower()
    return re.sub(r"^https?://(www\.|m\.)?", "", u)


def vtt_text(t):
    out, last = [], None
    for line in t.splitlines():
        line = line.strip()
        if not line or "-->" in line or line.startswith(("WEBVTT", "NOTE")) or line.isdigit():
            continue
        line = html.unescape(re.sub(r"<[^>]+>", "", line))
        if line != last:
            out.append(line)
        last = line
    return " ".join(out)


def fetch_sub(r):
    f = SUBS / f"{r['vid']}.txt"
    if f.exists():
        return
    try:
        resp = requests.get(r["sub_url"], timeout=20, headers={"User-Agent": "Mozilla/5.0", "Referer": "https://www.tiktok.com/"})
        f.write_text(vtt_text(resp.text) if resp.ok and "-->" in resp.text else "", encoding="utf-8")
    except requests.RequestException:
        pass


def main():
    rows = load_raw()
    # source precedence when the same video shows up twice: own > benchmark > search
    rank = {"own": 0, "benchmark": 1, "search": 2}
    rows.sort(key=lambda r: rank[r["source"]])
    seen, uniq = {}, []
    for r in rows:
        k1, k2 = (r["platform"], r["vid"]), norm_url(r["url"])
        if k1 in seen or k2 in seen:
            first = seen.get(k1) or seen.get(k2)
            if r["query"] and r["query"] not in first["queries"]:
                first["queries"].append(r["query"])
            continue
        r["queries"] = [r["query"]] if r["query"] else []
        seen[k1] = seen[k2] = r
        uniq.append(r)
    # own channel = Ostad's handles, wherever they came from
    for r in uniq:
        h = (r["creator_handle"] or "").lower()
        if h in OWN_HANDLES or (r["platform"] == "youtube" and "ostad" in (r.get("channel_name") or "").lower()):
            r["source"] = "own"
        elif r["source"] == "own":
            r["source"] = "search"  # collabs / tagged posts from other accounts
    # Ostad's IG baseline keeps photos/carousels (they are his output), but the video corpus is video only
    with ThreadPoolExecutor(16) as ex:
        list(ex.map(fetch_sub, [r for r in uniq if r.get("sub_url")]))

    videos = [r for r in uniq if r["views"] > 0 and not r.get("slideshow")]
    by_creator = {}
    for r in videos:
        by_creator.setdefault((r["platform"], (r["creator_handle"] or "").lower()), []).append(r["views"])
    plat_med = {p: st.median([r["views"] for r in videos if r["platform"] == p and r["source"] == "search"] or [1])
                for p in PARSE}

    old = {}
    if (DATA / "videos.json").exists():
        old = {v["id"]: v for v in json.loads((DATA / "videos.json").read_text(encoding="utf-8"))}

    out = []
    for r in videos:
        vid_id = f"{r['platform'][:2]}_{re.sub(r'[^A-Za-z0-9_-]', '', r['vid'])}"
        days = max((NOW - r["posted"]).days, 1) if r["posted"] else None
        eng = (r["likes"] + r["comments"] + r["shares"] + r["saves"]) / r["views"] if r["views"] else 0
        cv = by_creator[(r["platform"], (r["creator_handle"] or "").lower())]
        if len(cv) >= 3:
            outlier, how = r["views"] / max(st.median(cv), 1), f"outlier=views/creator_median (n={len(cv)})"
        elif r["creator_followers"]:
            outlier, how = r["views"] / max(r["creator_followers"], 1000), "outlier=views/max(followers,1000)"
        else:
            outlier, how = r["views"] / max(plat_med[r["platform"]], 1), "outlier=views/platform_median (no followers, <3 posts)"
        sub = SUBS / f"{r['vid']}.txt"
        transcript = sub.read_text(encoding="utf-8") if sub.exists() else ""
        row = dict(
            id=vid_id, platform=r["platform"], source=r["source"], query_or_hashtag=", ".join(r["queries"]),
            url=r["url"], thumbnail_url=r["thumbnail_url"], thumbnail_local=f"/ostad/thumbs/{vid_id}.jpg",
            creator_handle=r["creator_handle"], creator_followers=r["creator_followers"] or None,
            creator_url=r["creator_url"], posted_at=r["posted"].date().isoformat() if r["posted"] else None,
            days_live=days, duration_s=r["duration_s"] or None, caption=r["caption"][:2200], title=r["title"],
            on_screen_hook=" ".join(transcript.split()[:12]) if transcript else "", transcript=transcript,
            views=r["views"], likes=r["likes"], comments=r["comments"], shares=r["shares"], saves=r["saves"],
            engagement_rate=round(eng, 4), views_per_day=round(r["views"] / (days or 1), 1),
            likes_per_day=round(r["likes"] / (days or 1), 1), outlier_score=round(outlier, 3),
            yt_type=r.get("yt_type"), is_ad=r["is_ad"], notes=how)
        prev = old.get(vid_id, {})
        for f in CLASS_FIELDS:
            row[f] = prev.get(f, [] if f == "topic_tags" else None)
        out.append(row)

    # winning: top 20% outlier within platform AND views above platform median (niche rows: search + benchmark)
    for p in PARSE:
        niche = [r for r in out if r["platform"] == p and r["source"] != "own"]
        if not niche:
            continue
        cut = sorted(r["outlier_score"] for r in niche)[int(len(niche) * 0.8)]
        med = st.median(r["views"] for r in niche)
        for r in out:
            if r["platform"] == p:
                r["winning"] = r["source"] != "own" and r["outlier_score"] >= cut and r["views"] > med
    # transcript only kept for the top 80 by outlier (spec); hook stays for all
    top80 = {r["id"] for r in sorted([r for r in out if r["source"] != "own"], key=lambda r: -r["outlier_score"])[:80]}
    for r in out:
        if r["id"] not in top80 and r["source"] != "own":
            r["transcript"] = ""
    out.sort(key=lambda r: -r["outlier_score"])
    (DATA / "videos.json").write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding="utf-8")
    cols = list(out[0].keys())
    with open(DATA / "videos.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        for r in out:
            w.writerow({k: (json.dumps(v) if isinstance(v, list) else v) for k, v in r.items()})

    # Ostad's own: every post incl. photos, for the baseline
    own_all = []
    for r in uniq:
        if r["source"] != "own":
            continue
        oid = f"{r['platform'][:2]}_{re.sub(r'[^A-Za-z0-9_-]', '', r['vid'])}"
        own_all.append(dict(id=oid, thumbnail_local=f"/ostad/thumbs/{oid}.jpg", platform=r["platform"], url=r["url"], date=r["posted"].date().isoformat() if r["posted"] else None,
                            caption=(r["title"] + " " + r["caption"]).strip()[:600], views=r["views"] or None,
                            likes=r["likes"], comments=r["comments"], shares=r["shares"], duration_s=r["duration_s"] or None,
                            thumbnail_url=r["thumbnail_url"], kind=r.get("ig_type") or r.get("yt_type") or "video"))
    base = {}
    for p in PARSE:
        vs = [o["views"] for o in own_all if o["platform"] == p and o["views"]]
        ls = [o["likes"] for o in own_all if o["platform"] == p]
        base[p] = dict(posts=len([o for o in own_all if o["platform"] == p]), videos_with_views=len(vs),
                       median_views=st.median(vs) if vs else None, median_likes=st.median(ls) if ls else None)
    (DATA / "ostad_own.json").write_text(json.dumps({"baseline": base, "posts": own_all}, ensure_ascii=False, indent=1),
                                         encoding="utf-8")
    from collections import Counter
    print("unique videos", len(out), Counter((r["platform"], r["source"]) for r in out))
    print("winning", sum(r.get("winning", False) for r in out), "with transcript", sum(bool(r["on_screen_hook"]) for r in out))
    print("baseline", json.dumps(base))


if __name__ == "__main__":
    main()
