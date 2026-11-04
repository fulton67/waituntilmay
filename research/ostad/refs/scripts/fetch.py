"""Download the shortlist at full size, measure, perceptual-hash, dedupe, and lay out judging sheets.

in : cache/shortlist.json
out: cache/full/{id}.{ext}, cache/fetched.json, sheets/{pid}__{n}.jpg + sheets/{pid}__{n}.json (tile legend)
"""
import json, pathlib, io, re, sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse
import requests, imagehash
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from sheet import make_sheet

Image.MAX_IMAGE_PIXELS = 200_000_000
R = pathlib.Path(__file__).resolve().parents[1]
C = R / "cache"; FULL = C / "full"; FULL.mkdir(exist_ok=True)
SH = R / "sheets"; SH.mkdir(exist_ok=True)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
short = json.load(open(C / "shortlist.json", encoding="utf-8"))
meta_f = C / "fetched.json"
meta = json.load(open(meta_f, encoding="utf-8")) if meta_f.exists() else {}

def fetch(c):
    if c["id"] in meta:
        return c["id"], meta[c["id"]]
    m = {"ok": False}
    try:
        r = requests.get(c["image"], headers={"User-Agent": UA, "Referer": c.get("page") or ""}, timeout=40)
        ct = r.headers.get("content-type", "")
        if r.status_code != 200 or len(r.content) < 3000:
            m["err"] = f"http {r.status_code} {len(r.content)}"
        elif "svg" in ct or c["image"].lower().split("?")[0].endswith(".svg"):
            p = FULL / f"{c['id']}.svg"; p.write_bytes(r.content)
            m.update(ok=True, ext="svg", w=None, h=None, phash=None, bytes=len(r.content))
        else:
            im = Image.open(io.BytesIO(r.content)); im.load()
            ext = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp", "GIF": "gif"}.get(im.format, "jpg")
            if im.format not in ("JPEG", "PNG", "WEBP", "GIF"):
                ext = "png"; buf = io.BytesIO(); im.convert("RGBA").save(buf, "PNG"); data = buf.getvalue()
            else:
                data = r.content
            p = FULL / f"{c['id']}.{ext}"; p.write_bytes(data)
            rgb = im.convert("RGB")
            m.update(ok=True, ext=ext, w=im.width, h=im.height, phash=str(imagehash.phash(rgb)), bytes=len(data))
    except Exception as e:
        m["err"] = str(e)[:120]
    return c["id"], m

with ThreadPoolExecutor(16) as ex:
    for i, (cid, m) in enumerate(ex.map(fetch, short)):
        meta[cid] = m
        if i % 500 == 0:
            print("fetched", i, flush=True); json.dump(meta, open(meta_f, "w"))
json.dump(meta, open(meta_f, "w"))

ok = [c for c in short if meta[c["id"]]["ok"] and (meta[c["id"]]["ext"] == "svg" or max(meta[c["id"]]["w"], meta[c["id"]]["h"]) >= 800)]
print("downloaded", sum(1 for c in short if meta[c["id"]]["ok"]), "of", len(short), "; >= 800px or svg:", len(ok))

# perceptual-hash dedupe across the whole library: best score wins, hamming <= 6
ok.sort(key=lambda c: -c.get("score", 0))
kept, hashes, dup = [], [], 0
for c in ok:
    ph = meta[c["id"]]["phash"]
    if ph:
        h = imagehash.hex_to_hash(ph)
        if any(h - o <= 6 for o in hashes):
            dup += 1; continue
        hashes.append(h)
    kept.append(c)
print("after phash dedupe", len(kept), "dropped", dup)
json.dump(kept, open(C / "to_judge.json", "w", encoding="utf-8"))

# sheets of 20 per procedure
by = defaultdict(list)
for c in kept:
    by[c["pid"]].append(c)
for f in SH.glob("*__*.*"):
    f.unlink()
n_sheets = 0
for pid, cs in by.items():
    cs.sort(key=lambda c: -c.get("score", 0))
    for s in range(0, len(cs), 20):
        part = cs[s:s + 20]
        paths = []
        for c in part:
            m = meta[c["id"]]
            paths.append(FULL / f"{c['id']}.{m['ext']}" if m["ext"] != "svg" else C / "thumbs" / f"{c['id']}.jpg")
        stem = f"{pid}__{s // 20}"
        make_sheet(paths, SH / f"{stem}.jpg", labels=[str(i) for i in range(len(part))])
        legend = [{"i": i, "id": c["id"], "title": (c.get("title") or "")[:140], "site": urlparse(c.get("page") or c["image"]).netloc,
                   "size": f"{meta[c['id']]['w']}x{meta[c['id']]['h']}", "path": str(paths[i]).replace("\\", "/")} for i, c in enumerate(part)]
        json.dump({"pid": pid, "tiles": legend}, open(SH / f"{stem}.json", "w", encoding="utf-8"), indent=0, ensure_ascii=False)
        n_sheets += 1
print("sheets", n_sheets, "procedures", len(by))
