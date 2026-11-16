"""G2: contact sheets. Every image is one tile (aspect kept, fitted in a 380 px square); cut-outs sit on a grey checkerboard so the
alpha edge and any white sticker border are visible. The image id is burned top-left; a second line gives the folder.
Sheets are grouped by top-level/second-level folder so a reader sees related work together: sheets/<nnnn>.jpg, 12 tiles each
(4 x 3, 1520 x 1140 + labels). sheets.json lists each sheet's ids; expected count = sum(ceil(group size / 12))."""
import json, math, os

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from common import ROOT, corpus, load_rgba

TILE, COLS, ROWS, LABEL = 380, 4, 3, 30
PER = COLS * ROWS


def checker(w, h, s=16):
    y, x = np.mgrid[0:h, 0:w]
    c = (((x // s) + (y // s)) % 2).astype(np.uint8)
    a = np.where(c[..., None] == 1, 200, 150).astype(np.uint8)
    return np.repeat(a, 3, axis=2)


def tile(path):
    rgba = load_rgba(path)
    im = Image.fromarray(rgba)
    im.thumbnail((TILE, TILE), Image.LANCZOS)
    bg = Image.fromarray(checker(im.width, im.height))
    bg.paste(im, (0, 0), im)
    return bg, rgba.shape[1], rgba.shape[0]


def group_of(rel):
    parts = rel.split("/")
    return "/".join(parts[:2]) if len(parts) > 2 else parts[0] if len(parts) > 1 else "(root)"


def main():
    d = os.path.join(ROOT, "sheets")
    os.makedirs(d, exist_ok=True)
    items = corpus("image")
    groups = {}
    for iid, rel, p in items:
        groups.setdefault(group_of(rel), []).append((iid, rel, p))
    try:
        font = ImageFont.truetype("arialbd.ttf", 15); small_f = ImageFont.truetype("arial.ttf", 11)
    except OSError:
        font = small_f = ImageFont.load_default()
    index, n = [], 0
    for g in sorted(groups):
        lst = groups[g]
        for s in range(0, len(lst), PER):
            chunk = lst[s:s + PER]
            out = os.path.join(d, f"{n:04d}.jpg")
            if not os.path.exists(out):
                rows = math.ceil(len(chunk) / COLS)
                sh = Image.new("RGB", (COLS * TILE, rows * (TILE + LABEL)), (24, 24, 24))
                dr = ImageDraw.Draw(sh)
                for k, (iid, rel, p) in enumerate(chunk):
                    x, y = (k % COLS) * TILE, (k // COLS) * (TILE + LABEL)
                    try:
                        t, W, H = tile(p)
                        sh.paste(t, (x + (TILE - t.width) // 2, y + LABEL + (TILE - t.height) // 2))
                        dims = f"{W}x{H}"
                    except Exception as e:
                        dims = f"ERR {e!r}"[:40]
                    dr.text((x + 4, y + 1), f"{iid}  {dims}", fill=(255, 220, 0), font=font)
                    dr.text((x + 4, y + 17), os.path.basename(rel)[:58], fill=(200, 200, 200), font=small_f)
                sh.save(out, quality=86)
            index.append({"n": n, "path": f"sheets/{n:04d}.jpg", "group": g, "ids": [c[0] for c in chunk],
                          "files": [c[1] for c in chunk]})
            n += 1
    json.dump(index, open(os.path.join(ROOT, "sheets.json"), "w", encoding="utf8"), indent=1, ensure_ascii=False)
    print(f"{n} sheets for {len(items)} images in {len(groups)} groups")


if __name__ == "__main__":
    main()
