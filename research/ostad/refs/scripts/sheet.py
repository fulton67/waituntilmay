"""Contact sheet helper: grid of numbered tiles from local image files."""
import pathlib
from PIL import Image, ImageDraw, ImageFont

def make_sheet(paths, out, cols=5, tile=300, labels=None):
    rows = (len(paths) + cols - 1) // cols
    W, H = cols * tile, rows * (tile + 22)
    S = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(S)
    try:
        font = ImageFont.truetype("arial.ttf", 16)
    except Exception:
        font = ImageFont.load_default()
    for i, p in enumerate(paths):
        x, y = (i % cols) * tile, (i // cols) * (tile + 22)
        try:
            im = Image.open(p)
            if im.mode in ("RGBA", "LA", "P"):  # transparent PNGs: composite on white, not black
                im = im.convert("RGBA"); bg = Image.new("RGB", im.size, "white"); bg.paste(im, mask=im.split()[3]); im = bg
            im = im.convert("RGB"); im.thumbnail((tile - 8, tile - 8))
            S.paste(im, (x + (tile - im.width) // 2, y + 22 + (tile - 8 - im.height) // 2))
        except Exception:
            d.text((x + 10, y + 120), "unreadable", fill="red", font=font)
        d.rectangle([x, y, x + tile - 1, y + tile + 21], outline="#bbbbbb")
        d.text((x + 6, y + 3), (labels[i] if labels else str(i)), fill="black", font=font)
    S.save(out, quality=88)
    return out
