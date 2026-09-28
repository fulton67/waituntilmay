"""
Prepare the three available CD views for Shopify product media.

Crops each file to its trim box first — the source PNGs carry printed bleed
guides and a "BLEED …" caption baked into the outer band, measured in
scrape/assets/media.json. Shipping the uncropped file puts crop marks on the
product page.

Outputs assets/web/*.jpg plus manifest.json, which scripts/shopify_setup.py reads.

    python scripts/prep_media.py
"""


import sys as _sys
for _s in (_sys.stdout, _sys.stderr):
    try: _s.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
import json
import os

from PIL import Image

Image.MAX_IMAGE_PIXELS = None

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
OUT = os.path.join(ROOT, "assets", "web")
SRC_DIRS = [os.path.join(ROOT, "assets", "source"), "C:/Users/naimj/Downloads"]

# Shopify product images: square-ish is safest for the grid, but these are
# printed artefacts with real aspect ratios — keep them true and let the theme
# letterbox, matching the gallery decision in webflow/design-brief.md §5.
MAX_EDGE = 2048          # comfortably over the 1170px 3x need, under Shopify's 20MP
JPEG_QUALITY = 88

VIEWS = [
    {
        "slot": "1-front-insert",
        "src": "CD_Front_Insert_4.75x4.png",
        "out": "sie-cd-01-front-insert.jpg",
        "alt": "tazparis — From Paris, With Love — front insert",
        "trim_px": [1425, 1425],      # 4.75 x 4.75 in @ 300dpi, from 1500 bleed
    },
    {
        "slot": "2-tray-card",
        "src": "TAZPARIS_TrayCard_PRINT_READY.png",
        "out": "sie-cd-02-tray-card.jpg",
        "alt": "tazparis — From Paris, With Love — tray card with tracklist",
        "trim_px": [1771, 1393],      # 150 x 118 mm @ 300dpi, from 1842x1464 bleed
    },
    {
        "slot": "4-poster",
        "src": "SIE POSTER 2.png",
        "out": "sie-cd-03-poster.jpg",
        "alt": "tazparis — From Paris, With Love — folded poster",
        "trim_px": None,              # 17x11 in, no bleed to remove
    },
]

MISSING_DISC = {
    "slot": "3-disc",
    "status": "MISSING",
    "blocking": False,
    "note": ("No disc artwork exists on disk. Product ships with three views; "
             "add the disc later with `python scripts/shopify_setup.py --only media`, "
             "which skips media already attached."),
    "requirement": {
        "shape": "circle on a fully transparent ground, exported square",
        "pixels": [1170, 1170],
        "format": "PNG or AVIF with a real alpha channel",
        "why": "a rotating rectangle sweeps sqrt(2) = 1.414x its width and clips in a fixed frame",
    },
}


def resolve(name):
    for d in SRC_DIRS:
        p = os.path.join(d, name)
        if os.path.exists(p):
            return p, os.path.abspath(d) == os.path.abspath(SRC_DIRS[0])
    return None, False


def center_crop(im, tw, th):
    w, h = im.size
    left, top = max(0, (w - tw) // 2), max(0, (h - th) // 2)
    return im.crop((left, top, left + min(tw, w), top + min(th, h)))


def main():
    os.makedirs(OUT, exist_ok=True)
    files, notes = [], []

    for v in VIEWS:
        path, in_repo = resolve(v["src"])
        if not path:
            notes.append(f"{v['slot']}: SOURCE NOT FOUND ({v['src']})")
            print(f"  {v['slot']:18} NOT FOUND  {v['src']}")
            continue

        im = Image.open(path)
        orig = im.size
        if v["trim_px"]:
            im = center_crop(im, *v["trim_px"])
        trimmed = im.size

        im = im.convert("RGB")
        if max(im.size) > MAX_EDGE:
            im.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)

        dest = os.path.join(OUT, v["out"])
        im.save(dest, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        size = os.path.getsize(dest)

        files.append({
            "slot": v["slot"],
            "filename": v["out"],
            "alt": v["alt"],
            "mime": "image/jpeg",
            "upload": True,
            "source": path.replace("\\", "/"),
            "sourceInRepo": in_repo,
            "sourcePx": list(orig),
            "trimmedPx": list(trimmed),
            "outputPx": list(im.size),
            "bytes": size,
            "aspect": round(im.size[0] / im.size[1], 4),
        })
        print(f"  {v['slot']:18} {orig[0]}x{orig[1]} -> trim {trimmed[0]}x{trimmed[1]} "
              f"-> out {im.size[0]}x{im.size[1]}  {size / 1024:.0f} KB")

    manifest = {
        "generatedBy": "scripts/prep_media.py",
        "outputDir": "assets/web",
        "maxEdge": MAX_EDGE,
        "jpegQuality": JPEG_QUALITY,
        "sourceDirSearched": [d.replace("\\", "/") for d in SRC_DIRS],
        "assetsSourceExists": os.path.isdir(SRC_DIRS[0]),
        "files": files,
        "missing": [MISSING_DISC],
        "notes": notes,
    }
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=1)

    print(f"\n  {len(files)} of 4 views prepared -> assets/web/")
    print(f"  manifest -> assets/web/manifest.json")
    if not manifest["assetsSourceExists"]:
        print("  note: assets/source/ does not exist; sources read from Downloads")
    print(f"  missing: 3-disc ({MISSING_DISC['requirement']['pixels'][0]}px circle, alpha)")


if __name__ == "__main__":
    main()
