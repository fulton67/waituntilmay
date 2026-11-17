"""Pull @rit.clinic_official (every post, every carousel slide) + post DdjBJOUE436 via apify/instagram-scraper. Cap $5.
usage: python research/ostad/style/tools/rit_pull.py  -> research/ostad/style/raw/ritclinic/{posts.json,media/}  (media gitignored)"""
import json, os, time, pathlib, requests
ROOT = pathlib.Path(__file__).resolve().parents[4]
env = dict(l.split("=", 1) for l in (ROOT / ".env").read_text().splitlines() if "=" in l and not l.startswith("#"))
T = env["APIFY_TOKEN"].strip()
OUT = ROOT / "research/ostad/style/raw/ritclinic"; (OUT / "media").mkdir(parents=True, exist_ok=True)
import sys
# pass 1 (apify/instagram-scraper on the profile URL) returned only the 3 pinned posts; pass 2 uses the post scraper by username
ACT, inp = ("apify~instagram-post-scraper", {"username": ["rit.clinic_official"], "resultsLimit": 300}) if "--all" in sys.argv else (
    "apify~instagram-scraper", {"directUrls": ["https://www.instagram.com/rit.clinic_official/", "https://www.instagram.com/p/DdjBJOUE436/"], "resultsType": "posts", "resultsLimit": 300})
r = requests.post(f"https://api.apify.com/v2/acts/{ACT}/runs?token={T}&maxTotalChargeUsd=4.9", json=inp).json()["data"]
rid = r["id"]; print("run", rid, flush=True)
while True:
    s = requests.get(f"https://api.apify.com/v2/actor-runs/{rid}?token={T}").json()["data"]
    if s["status"] not in ("READY", "RUNNING"): break
    time.sleep(15)
print(s["status"], "usd", s.get("usageTotalUsd"), flush=True)
items = requests.get(f"https://api.apify.com/v2/datasets/{s['defaultDatasetId']}/items?clean=true&format=json&token={T}").json()
old = json.loads((OUT / "posts.json").read_text()) if (OUT / "posts.json").exists() else []
seen = {x.get("shortCode") for x in old}; items = old + [x for x in items if x.get("shortCode") not in seen]
(OUT / "posts.json").write_text(json.dumps(items, indent=1))
n = 0
for it in items:
    sc = it.get("shortCode") or it.get("id")
    urls = list(it.get("images") or []) or [it.get("displayUrl")]
    for c in it.get("childPosts") or []:
        if c.get("displayUrl") and c["displayUrl"] not in urls: urls.append(c["displayUrl"])
    for i, u in enumerate(u for u in urls if u):
        f = OUT / "media" / f"{sc}_{i+1:02d}.jpg"
        if not f.exists():
            try: f.write_bytes(requests.get(u, timeout=60).content); n += 1
            except Exception as e: print("fail", sc, e)
print(json.dumps({"posts": len(items), "files": n, "usd": s.get("usageTotalUsd")}))
