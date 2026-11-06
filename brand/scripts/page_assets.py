"""BUILDER Phase G: web assets and a manifest for /brand/ostad, in the order Make · Demo wall · Templates · Look · Icons · Type.
Sources stay in brand/ (full-size PNGs); the page gets JPEG renditions in public/brand/ostad/page/ and reads
app/brand/ostad/data/page.json. Every caption number comes from a brand/ JSON named beside it. brand-venv python -I."""
import json, pathlib, shutil, ast
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parents[2]; B = ROOT / "brand"; PUB = ROOT / "public" / "brand" / "ostad" / "page"
DATA = ROOT / "app" / "brand" / "ostad" / "data" / "page.json"
shutil.rmtree(PUB, ignore_errors=True); PUB.mkdir(parents=True)
j = lambda p: json.load(open(p, encoding="utf-8"))

def jpg(src, rel, width, q=82):
    """resize to width (never up) and save as JPEG; returns {src, w, h} for next/image"""
    im = Image.open(src); im.seek(0); im = im.convert("RGB")
    if im.width > width: im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    out = PUB / rel; out.parent.mkdir(parents=True, exist_ok=True); im.save(out, "JPEG", quality=q, optimize=True, progressive=True)
    return {"src": "/brand/ostad/page/" + rel.replace("\\", "/"), "w": im.width, "h": im.height}

# demo wall (demo/demo.json)
demo = j(B / "demo" / "demo.json"); posts = []
for p in demo["posts"]:
    files = ast.literal_eval(p["files"]) if isinstance(p["files"], str) else p["files"]
    pages = [jpg(B / f.replace("\\", "/"), "demo/" + pathlib.Path(f).stem + ".jpg", 540) for f in files]
    posts.append({"n": int(p["n"]), "code": p["shortCode"], "date": p["date"], "caption": p["caption_start"].strip()[:140], "size": p["size"], "template": p["template"], "pages": pages})
reel = j(B / "kit" / "video" / "reel.json")
# templates (kit/templates/index.json, slots, board blocks)
idx = j(B / "kit" / "templates" / "index.json"); imgs = {p.name.split("_")[0]: p for p in (B / "board" / "img").iterdir()}
templates = []
for t in idx:
    thumbs = {s: jpg(B / "kit" / "templates" / t["id"] / f"thumb_{s}.png", f"templates/{t['id']}_{s}.jpg", 360) for s in ("4x5", "1x1", "9x16")
              if (B / "kit" / "templates" / t["id"] / f"thumb_{s}.png").exists()}
    board = [dict(jpg(imgs[b], f"board/{b}.jpg", 360), id=b) for b in t["board_blocks"] if b in imgs]
    templates.append({"id": t["id"], "name": t["name"], "cluster": t["cluster"], "thumbs": thumbs, "board": board})
# look (look/catalog.json kept devices, look/proof/*.png; kit/palette.json; kit/treatment.json)
cat = j(B / "look" / "catalog.json"); dev = {d["device"]: d for d in cat["devices"]}
look = [dict(jpg(B / "look" / "proof" / f"{k}.png", f"look/{k}.jpg", 720), device=k, images=dev[k]["images"], weighted=dev[k]["weighted"])
        for k in cat["kept"] if (B / "look" / "proof" / f"{k}.png").exists()]
pal = j(B / "kit" / "palette.json")["roles"]; palette = [{"role": r, "hex": v["hex"], "L": v["L"], "C": v["C"]} for r, v in pal.items()]
tr = j(B / "kit" / "treatment.json")
treatment = [jpg(B / "fig" / f"treatment_{k}.png", f"look/treatment_{k}.jpg", 900) | {"name": k} for k in ("curve", "saturation", "contrast", "grain") if (B / "fig" / f"treatment_{k}.png").exists()]
# icons (kit/icons/icons.json, sheet.png)
ic = j(B / "kit" / "icons" / "icons.json"); sheet = jpg(B / "kit" / "icons" / "sheet.png", "icons/sheet.jpg", 1600, 90)
icons = ic.get("icons", ic.get("picked", []))
man = {
    "make": {"href": "/brand/ostad/make", "templates": len(idx), "icons": len(icons) if isinstance(icons, (list, dict)) else 24, "check": j(B / "kit" / "templates" / "make_check.json").get("summary", {})},
    "demo": {"posts": posts, "summary": demo["summary"], "wall": jpg(B / "demo" / "wall.png", "demo/wall.jpg", 1600)},
    "reel": {"src": "/brand/ostad/kit/video/reel.mp4", "poster": "/brand/ostad/kit/video/reel.jpg", "clip": reel["clip_id"], "start_s": reel["start_s"], "dur_s": reel["dur_s"], "fps": reel["fps"],
             "check": {k: v for k, v in j(B / "kit" / "video" / "reel_check.json").items() if k != "rows"}},
    "video": {"elements": len(j(B / "kit" / "video" / "video_kit.json")["elements"]), "lottie": j(B / "kit" / "video" / "lottie" / "lottie_check.json")["passed"]},
    "templates": templates,
    "look": {"devices": look, "kept": len(cat["kept"]), "board_images": cat["n_board_images"], "palette": palette, "treatment": treatment, "treatment_params": tr["params"]},
    "icons": {"sheet": sheet, "count": len(icons) if isinstance(icons, (list, dict)) else 24},
}
json.dump(man, open(DATA, "w", encoding="utf-8"), indent=1)
n = sum(1 for _ in PUB.rglob("*.jpg")); size = sum(p.stat().st_size for p in PUB.rglob("*.jpg"))
print(n, "images,", round(size / 1e6, 1), "MB ->", PUB, "|", len(posts), "posts,", len(templates), "templates,", len(look), "devices,", man["icons"]["count"], "icons")
