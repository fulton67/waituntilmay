"""Bring machine cutouts into the kit. Each image becomes kit/devices/img/<id>.png: trimmed to its alpha box, padded 4%, longest side
1600 px, and its id matched from the filename against devices.json ids, labels and spoken names (e.g. "Cutera excel V.png" -> excel-v).
An image without real transparency (under 5% clear pixels) is not ingested and is reported: the card sits on glass, so a box would show.
Pass id=path pairs to force a match. Then re-runs devices.py and copies the images to public/ for the video kit page.
usage: brand-venv python -I brand/scripts/devices_ingest.py <folder or files...> [id=path ...]"""
import json, pathlib, re, shutil, subprocess, sys
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parents[2]; K = ROOT / "brand" / "kit" / "devices"; PUB = ROOT / "public" / "brand" / "ostad" / "kit" / "devices" / "img"
reg = json.load(open(K / "devices.json", encoding="utf-8"))["devices"]
key = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
names = sorted(((key(n), d["id"]) for d in reg for n in [d["id"], d["label"], *d["say"]] if len(key(n)) >= 3), key=lambda x: -len(x[0]))  # longest first
forced, files = {}, []
for a in sys.argv[1:]:
    if "=" in a and not pathlib.Path(a).exists(): i, p = a.split("=", 1); forced[pathlib.Path(p).resolve()] = i; files.append(pathlib.Path(p))
    elif pathlib.Path(a).is_dir(): files += [f for f in pathlib.Path(a).rglob("*") if f.suffix.lower() in (".png", ".webp", ".tif", ".tiff")]
    else: files.append(pathlib.Path(a))
def fade_cut(im):
    """a maker photo cropped by its frame (a hard horizontal edge: the bottom opaque row spans > 15% of the object's width) fades out over
    its lowest 15%, so it does not read as a chopped-off box on screen"""
    import numpy as np
    a = np.asarray(im.getchannel("A"), dtype=np.float32); h, w = a.shape; ys = np.where((a > 16).any(1))[0]
    if not len(ys): return im
    y1 = ys[-1]; width = (a > 16).any(0).sum()
    if (a[y1] > 128).sum() <= 0.15 * width: return im
    n = max(2, int(0.15 * (y1 - ys[0]))); ramp = np.ones(h, np.float32); ramp[y1 - n + 1:y1 + 1] = np.linspace(1, 0, n) ** 1.4
    out = im.copy(); out.putalpha(Image.fromarray((a * ramp[:, None]).astype("uint8"))); return out
report = []
for f in files:
    did = forced.get(f.resolve()) or next((i for n, i in names if n in key(f.stem)), None)
    if not did: report.append({"file": str(f), "status": "no device name in filename (pass id=path)"}); continue
    im = Image.open(f).convert("RGBA"); a = im.getchannel("A")
    clear = sum(a.histogram()[:16]) / (im.width * im.height)
    if clear < 0.05: report.append({"file": str(f), "id": did, "status": f"not a cutout ({clear:.1%} transparent); remove the background first"}); continue
    im = fade_cut(im.crop(a.point(lambda v: 255 if v > 16 else 0).getbbox())); pad = round(max(im.size) * 0.04)
    out = Image.new("RGBA", (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0)); out.paste(im, (pad, pad))
    out.thumbnail((1600, 1600), Image.LANCZOS); out.save(K / "img" / f"{did}.png", optimize=True)
    report.append({"file": str(f), "id": did, "status": "ok", "size": out.size, "transparent": round(clear, 3)})
subprocess.run([sys.executable, "-I", str(ROOT / "brand" / "scripts" / "devices.py")], check=True)
PUB.mkdir(parents=True, exist_ok=True)
for p in (K / "img").glob("*.png"): shutil.copy2(p, PUB / p.name)
json.dump(report, open(K / "ingest_report.json", "w", encoding="utf-8"), indent=1)
for r in report: print(r["status"], "|", r.get("id", "-"), "|", pathlib.Path(r["file"]).name)
