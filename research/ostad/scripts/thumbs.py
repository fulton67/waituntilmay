"""Download every thumbnail (videos.json + ostad_own.json) -> thumbs/{id}.jpg, 360w JPEG q70 (q55 if >25MB).
Failures get a flat grey placeholder. Then mirror to public/ostad/thumbs/. Idempotent."""
import json, io, sys, shutil, pathlib
from concurrent.futures import ThreadPoolExecutor
import requests
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
T, PUB = ROOT / "thumbs", REPO / "public" / "ostad" / "thumbs"
T.mkdir(exist_ok=True); PUB.mkdir(parents=True, exist_ok=True)
Q = int(sys.argv[1]) if len(sys.argv) > 1 else 70
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36"}

def one(job):
    i, url = job
    f = T / f"{i}.jpg"
    if f.exists() and Q == 70:
        return "cached"
    try:
        r = requests.get(url, timeout=25, headers=UA)
        r.raise_for_status()
        im = Image.open(io.BytesIO(r.content)).convert("RGB")
        im = im.resize((360, max(1, round(im.height * 360 / im.width))), Image.LANCZOS)
        im.save(f, "JPEG", quality=Q, optimize=True, progressive=True)
        return "ok"
    except Exception:
        Image.new("RGB", (360, 640), (200, 200, 200)).save(f, "JPEG", quality=50)
        return "placeholder"

videos = json.loads((ROOT / "data/videos.json").read_text(encoding="utf-8"))
own = json.loads((ROOT / "data/ostad_own.json").read_text(encoding="utf-8"))["posts"]
jobs = {v["id"]: v["thumbnail_url"] for v in videos + own if v.get("thumbnail_url")}
for v in videos + own:
    jobs.setdefault(v["id"], "")
from collections import Counter
with ThreadPoolExecutor(16) as ex:
    c = Counter(ex.map(one, jobs.items()))
mb = sum(f.stat().st_size for f in T.glob("*.jpg")) / 1e6
print(dict(c), f"{mb:.1f} MB")
if mb > 25 and Q == 70:
    print("over 25MB, rerun with q55"); sys.exit(2)
for f in T.glob("*.jpg"):
    d = PUB / f.name
    if not d.exists() or d.stat().st_size != f.stat().st_size:
        shutil.copy2(f, d)
print("mirrored", len(list(PUB.glob("*.jpg"))))
