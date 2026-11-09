"""Download every IG item's media from the Apify dumps (raw/ig_posts.json, raw/ig_direct.json): reels -> media/ig/<owner>/<shortcode>.mp4
(+ cover .jpg), carousels -> <shortcode>_<n>.jpg (or .mp4 for video slides), stills -> <shortcode>.jpg. Writes raw/ig_index.json.
Usage: python -I ig_media.py <style dir>"""
import json, os, sys, urllib.request
S = sys.argv[1]
items = json.load(open(f"{S}/raw/ig_posts.json", encoding="utf8")) + json.load(open(f"{S}/raw/ig_direct.json", encoding="utf8"))
def fetch(url, dst):
    if os.path.exists(dst) and os.path.getsize(dst) > 0: return True
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        open(dst, "wb").write(urllib.request.urlopen(req, timeout=120).read()); return True
    except Exception as e:
        print("FAIL", dst, e); return False
index = []
for it in items:
    sc, owner = it.get("shortCode"), it.get("ownerUsername") or "unknown"
    d = f"{S}/media/ig/{owner}"; os.makedirs(d, exist_ok=True)
    rec = {"shortcode": sc, "owner": owner, "type": it.get("type"), "productType": it.get("productType"), "url": it.get("url"),
           "timestamp": it.get("timestamp"), "caption": it.get("caption"), "likes": it.get("likesCount"), "comments": it.get("commentsCount"),
           "views": it.get("videoViewCount") or it.get("videoPlayCount"), "duration": it.get("videoDuration"), "files": []}
    if it.get("videoUrl"):
        if fetch(it["videoUrl"], f"{d}/{sc}.mp4"): rec["files"].append(f"{sc}.mp4")
        if it.get("displayUrl") and fetch(it["displayUrl"], f"{d}/{sc}_cover.jpg"): rec["files"].append(f"{sc}_cover.jpg")
    elif it.get("childPosts"):
        for n, c in enumerate(it["childPosts"], 1):
            u, ext = (c.get("videoUrl"), "mp4") if c.get("videoUrl") else (c.get("displayUrl"), "jpg")
            if u and fetch(u, f"{d}/{sc}_{n}.{ext}"): rec["files"].append(f"{sc}_{n}.{ext}")
    elif it.get("images"):
        for n, u in enumerate(it["images"], 1):
            if fetch(u, f"{d}/{sc}_{n}.jpg"): rec["files"].append(f"{sc}_{n}.jpg")
    elif it.get("displayUrl"):
        if fetch(it["displayUrl"], f"{d}/{sc}.jpg"): rec["files"].append(f"{sc}.jpg")
    index.append(rec)
json.dump(index, open(f"{S}/raw/ig_index.json", "w", encoding="utf8"), indent=1, ensure_ascii=False)
from collections import Counter
print(len(index), "items", Counter((r["owner"], r["type"]) for r in index), "files", sum(len(r["files"]) for r in index))
