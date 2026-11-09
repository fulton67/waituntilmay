"""Pull the public Are.na channel dr-ostad (v3 API, no token) and its sub-channels: block list -> raw/arena/blocks.json,
originals (images, video/file attachments) -> media/arena/<id>.<ext>. Usage: python -I arena_pull.py <style dir>"""
import json, os, sys, time, urllib.error, urllib.request
S = sys.argv[1]; R = os.path.join(S, "raw", "arena"); M = os.path.join(S, "media", "arena")
os.makedirs(R, exist_ok=True); os.makedirs(M, exist_ok=True)
def get(u):
    for i in range(6):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "ostad-style"}), timeout=60))
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            time.sleep(5 * 2 ** i)
    raise RuntimeError("rate limited: " + u)
def contents(slug):
    out, page = [], 1
    while True:
        d = get(f"https://api.are.na/v3/channels/{slug}/contents?per=100&page={page}")
        out += d["data"]
        if len(d["data"]) < 100: return out
        page += 1
blocks, seen = [], set()
def walk(slug, path):
    for b in contents(slug):
        if b["type"] == "Channel":
            # only Naim's own sub-channels, one level down (connected channels by other people are not his board)
            if len(path) == 1 and (b.get("owner") or b.get("user") or {}).get("slug") == "naim-johnson" and b["slug"] not in seen: seen.add(b["slug"]); walk(b["slug"], path + [b["title"]])
            continue
        b["_channel_path"] = path; blocks.append(b)
walk("dr-ostad", ["dr ostad"])
for b in blocks:
    url = (b.get("attachment") or {}).get("url") or (b.get("image") or {}).get("src")
    if not url: continue
    ext = os.path.splitext(url.split("?")[0])[1] or ".bin"
    dst = os.path.join(M, f"{b['id']}{ext}"); b["_local"] = dst
    if not os.path.exists(dst):
        try: urllib.request.urlretrieve(url, dst)
        except Exception as e: b["_error"] = str(e)
json.dump(blocks, open(os.path.join(R, "blocks.json"), "w", encoding="utf8"), indent=1)
from collections import Counter
print(len(blocks), "blocks", Counter(b["type"] for b in blocks), "sub-channels", sorted(seen), "errors", sum("_error" in b for b in blocks))
