"""Pass 2 phase 1: YouTube search (yt-dlp ytsearch20, metadata only) per procedure.
Cache: refs/cache/yt/{sha}.json. Restartable."""
import json, pathlib, re, subprocess, hashlib, sys
from concurrent.futures import ThreadPoolExecutor

R = pathlib.Path(__file__).resolve().parents[1]
OUT = R / "cache/yt"; OUT.mkdir(parents=True, exist_ok=True)
procs = json.load(open(R / "procedures.json", encoding="utf-8"))

def short(p):
    s = re.split(r"[(:]", p["name"])[0].strip()
    if p["category"] == "neurotoxin" and s.endswith("toxin") and not s.startswith("Neuro"):
        s = s[:-5].strip() + " Botox"
    return s

plan = []
for p in procs:
    n = short(p)
    qs = [f"{n} mechanism of action animation", f"{n} 3D medical animation", f"{n} how it works animation"]
    if p.get("brand_or_device") and p["brand_or_device"].split(" /")[0].lower() not in n.lower():
        qs.append(f"{p['brand_or_device'].split(' /')[0]} how it works")
    for e in p["search_terms"][-2:]:
        qs.append(re.sub(r"\b(diagram|illustration)\b", "", e).strip() + " animation")
    for q in dict.fromkeys(qs):
        plan.append((p["id"], q))

def run(job):
    pid, q = job
    f = OUT / (hashlib.sha1(q.encode()).hexdigest()[:16] + ".json")
    if f.exists():
        return 0
    r = subprocess.run(["yt-dlp", "--flat-playlist", "-J", "--no-warnings", f"ytsearch20:{q}"], capture_output=True, text=True, encoding="utf-8", timeout=120)
    try:
        d = json.loads(r.stdout)
    except Exception:
        return -1
    rows = [{"id": e.get("id"), "title": e.get("title"), "channel": e.get("channel") or e.get("uploader"), "duration": e.get("duration"),
             "views": e.get("view_count"), "url": e.get("url") or f"https://www.youtube.com/watch?v={e.get('id')}"} for e in d.get("entries", [])]
    json.dump({"pid": pid, "q": q, "rows": rows}, open(f, "w", encoding="utf-8"))
    return len(rows)

print(len(plan), "queries", flush=True)
with ThreadPoolExecutor(6) as ex:
    for i, n in enumerate(ex.map(run, plan)):
        if i % 50 == 0:
            print(i, n, flush=True)
print("done")
