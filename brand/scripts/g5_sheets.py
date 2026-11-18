"""Review sheets for the grid 5 AviClear redo (the bar in brand/posts/CRITIQUE_grid5.md).

  _avi_old_new.jpg   old carousel (row 1) over the new one (row 2)
  _avi_vs_refs.jpg   our cover beside Naim's reference posts, all at phone size (360 px wide)
  _grid_phone.jpg    the new cover top-left of the feed, followed by the grid 4 posts, 360 px tiles

python brand/scripts/g5_sheets.py
"""
import glob
from PIL import Image, ImageOps, ImageDraw, ImageFont

G = "brand/posts/grid5/"
NEW = G + "aviclear_v2/"
OLD = G + "avi_old/"
T = (360, 450)
F = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 18)


def tile(p, size=T):
    return ImageOps.fit(Image.open(p).convert("RGB"), size, Image.LANCZOS)


def row(paths, size=T, gap=8):
    ims = [tile(p, size) for p in paths]
    o = Image.new("RGB", (len(ims) * (size[0] + gap) - gap, size[1]), "white")
    for i, im in enumerate(ims):
        o.paste(im, (i * (size[0] + gap), 0))
    return o


def stack(rows, labels, gap=40):
    w = max(r.width for r in rows)
    o = Image.new("RGB", (w, sum(r.height + gap + 30 for r in rows)), "white")
    d = ImageDraw.Draw(o); y = 0
    for r, l in zip(rows, labels):
        d.text((0, y + 4), l, font=F, fill=(40, 40, 40)); o.paste(r, (0, y + 30)); y += r.height + gap + 30
    return o


old = sorted(glob.glob(OLD + "avi_*.png"))
new = [NEW + f for f in ("avi_1_cover.png", "avi_2_count.png", "avi_3_how.png", "avi_4_visits.png")]
stack([row(old, (540, 675)), row(new, (540, 675))], ["Before (v1)", "After (v2)"]).save(G + "_avi_old_new.jpg", quality=88)

refs = [r for r in sorted(glob.glob("brand/refs/grid/*")) if "feed" not in r and "grid" not in r.split("/")[-1].split("_", 1)[-1]]
stack([row([new[0]] + refs)], ["Our cover (left) beside the reference posts, 360 px wide (phone feed size)"]).save(G + "_avi_vs_refs.jpg", quality=88)

g4 = sorted(glob.glob("public/brand/ostad/stills/out/grid4/*.png"))[:8]
cells = [new[0]] + g4
grid = Image.new("RGB", (3 * 360 + 8, 3 * 450 + 8), "white")
for i, p in enumerate(cells):
    grid.paste(tile(p), ((i % 3) * 364, (i // 3) * 454))
grid.save(G + "_grid_phone.jpg", quality=88)
print("sheets:", G + "_avi_old_new.jpg", G + "_avi_vs_refs.jpg", G + "_grid_phone.jpg", "| refs:", refs, "| grid4:", len(g4))
