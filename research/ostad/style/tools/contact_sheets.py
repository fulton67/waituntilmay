"""M2: one contact sheet per 2 s window; EVERY frame of the window is a tile with its frame number burned in.
sheets/<ref>/<vid>/<n>.jpg (n from 0); expected count = ceil(frame_count / round(2*fps)). Output sheets.json lists them."""
import math
import os

from PIL import Image, ImageDraw, ImageFont

from common import STYLE, frames, run

TILE_W = 120


def m2(ref, vid, path, P):
    per = max(1, int(round(2 * P["fps"])))
    d = os.path.join(STYLE, "sheets", ref, vid)
    os.makedirs(d, exist_ok=True)
    font = ImageFont.load_default()
    sheets, buf = [], []

    def flush():
        if not buf:
            return
        cols = 10 if per <= 60 else 12
        th = buf[0][1].height
        rows = math.ceil(len(buf) / cols)
        sh = Image.new("RGB", (cols * TILE_W, rows * th), "black")
        dr = ImageDraw.Draw(sh)
        for k, (i, im) in enumerate(buf):
            x, y = (k % cols) * TILE_W, (k // cols) * th
            sh.paste(im, (x, y))
            dr.rectangle([x, y, x + 34, y + 11], fill="black")
            dr.text((x + 2, y), str(i), fill="yellow", font=font)
        n = len(sheets)
        p = os.path.join(d, f"{n:04d}.jpg")
        sh.save(p, quality=82)
        sheets.append({"n": n, "path": os.path.relpath(p, STYLE).replace("\\", "/"), "from": buf[0][0], "to": buf[-1][0]})
        buf.clear()

    for i, f in frames(path, width=TILE_W):
        buf.append((i, Image.fromarray(f)))
        if len(buf) == per:
            flush()
    flush()
    return {"per_sheet": per, "count": len(sheets), "expected": math.ceil(P["frame_count"] / per),
            "frames_covered": sum(s["to"] - s["from"] + 1 for s in sheets), "sheets": sheets}


if __name__ == "__main__":
    run("sheets.json", m2)
