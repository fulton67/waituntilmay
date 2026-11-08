"""Machine cutouts from the manufacturers' own product images (DECISIONS 63). Reads a urls.json ([{id, page, images: [{url, official}]}]),
downloads each candidate, and makes a cutout:
  - the file already has real transparency (>= 5% clear pixels): kept as is
  - otherwise rembg (isnet-general-use) removes the background
Each cutout is scored: the subject must fill 8-85% of its frame (a cutout that keeps the whole frame failed; a sliver is a fragment),
its alpha must be mostly hard (few half-transparent pixels, so no haze left from the background), and bigger sources win ties.
The best candidate per id goes through devices_ingest.py (trim, pad, 1600 px, registry), and the source of every image is kept in
kit/devices/sources.json (manufacturer page and image URL: these are the makers' product photos, used to name their machines).
usage: brand-venv python -I brand/scripts/devices_fetch.py <urls.json> <workdir>   -> <workdir>/raw, cut, sheet.jpg; kit/devices/*"""
import json, pathlib, subprocess, sys, urllib.request, io
import numpy as np
from PIL import Image
from rembg import remove, new_session
ROOT = pathlib.Path(__file__).resolve().parents[2]; K = ROOT / "brand" / "kit" / "devices"
U = json.load(open(sys.argv[1], encoding="utf-8")); W = pathlib.Path(sys.argv[2]); (W / "raw").mkdir(parents=True, exist_ok=True); (W / "cut").mkdir(exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", "Accept": "image/avif,image/webp,image/png,image/*,*/*"}
sess = new_session("isnet-general-use")
def score(im):
    a = np.asarray(im.getchannel("A"), dtype=np.float32) / 255; fill = (a > 0.5).mean(); soft = ((a > 0.08) & (a < 0.92)).sum() / max(1, (a > 0.08).sum())
    ok = bool(0.08 <= fill <= 0.85)
    return (ok, round(float(1 - soft), 3), min(im.size)), {"fill": round(float(fill), 3), "soft": round(float(soft), 3)}
rows, best = [], {}
for d in U:
    for n, c in enumerate(d.get("images", [])):
        r = {"id": d["id"], "page": d.get("page"), "url": c["url"], "official": c.get("official", True)}
        try:
            raw, cp = W / "raw" / f"{d['id']}_{n}.png", W / "cut" / f"{d['id']}_{n}.png"  # cached on re-runs
            if raw.exists(): im = Image.open(raw).convert("RGBA")
            else:
                data = urllib.request.urlopen(urllib.request.Request(c["url"], headers={**UA, "Referer": d.get("page") or c["url"]}), timeout=40).read()
                im = Image.open(io.BytesIO(data)); im.seek(0); im = im.convert("RGBA"); im.save(raw)
            clear = float((np.asarray(im.getchannel("A")) < 16).mean())
            if clear >= 0.05: cut, how = im, "own alpha"
            elif cp.exists(): cut, how = Image.open(cp), "rembg isnet"
            else: cut, how = remove(im, session=sess), "rembg isnet"
            cut.save(W / "cut" / f"{d['id']}_{n}.png"); key, m = score(cut)
            r.update({"status": "ok", "how": how, "size": im.size, **m, "usable": bool(key[0])})
            if key[0] and (d["id"] not in best or key > best[d["id"]][0]): best[d["id"]] = (key, W / "cut" / f"{d['id']}_{n}.png", r)
        except Exception as e:
            r.update({"status": f"error: {type(e).__name__}: {str(e)[:120]}"})
        rows.append(r); print(r["id"], n, r["status"], r.get("how", ""), r.get("fill", ""), r.get("soft", ""))
json.dump(rows, open(W / "fetch.json", "w", encoding="utf-8"), indent=1)
# contact sheet of every cutout on a mid grey (chosen ones outlined) for review
cuts = sorted((W / "cut").glob("*.png")); s = 240; cols = 8
sheet = Image.new("RGB", (cols * s, ((len(cuts) + cols - 1) // cols) * (s + 24)), (190, 190, 190))
from PIL import ImageDraw
dr = ImageDraw.Draw(sheet); chosen = {str(v[1]) for v in best.values()}
for i, p in enumerate(cuts):
    im = Image.open(p); im.thumbnail((s - 12, s - 12)); x, y = (i % cols) * s, (i // cols) * (s + 24)
    sheet.paste(im, (x + 6, y + 6), im); dr.text((x + 6, y + s), p.stem + (" *" if str(p) in chosen else ""), fill=(0, 0, 0))
    if str(p) in chosen: dr.rectangle([x + 1, y + 1, x + s - 2, y + s - 2], outline=(200, 30, 30), width=3)
sheet.save(W / "sheet.jpg", quality=85)
pairs = [f"{i}={v[1]}" for i, v in best.items()]
if pairs: subprocess.run([sys.executable, "-I", str(ROOT / "brand" / "scripts" / "devices_ingest.py"), *pairs], check=True)
src = {i: {k: v[2][k] for k in ("page", "url", "official", "how")} for i, v in best.items()}
old = json.load(open(K / "sources.json", encoding="utf-8")) if (K / "sources.json").exists() else {}
json.dump({**old, **src}, open(K / "sources.json", "w", encoding="utf-8"), indent=1)
print(len(best), "machines with a cutout:", ", ".join(sorted(best)), "| missing:", ", ".join(sorted({d["id"] for d in U} - set(best))))
