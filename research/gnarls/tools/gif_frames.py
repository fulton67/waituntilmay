"""G9: the GIF animations, frame by frame (FRAME_BY_FRAME.md step 3, literally). Every frame is decoded (PIL, disposal applied by
compositing onto the previous canvas), none dropped. Per frame: duration ms, subject bbox (alpha >= 128, or difference from the
first frame's border colour when opaque), centroid, height/width as % of canvas, scale vs frame 0, tilt (principal-axis angle of
the subject mask, degrees), and mean abs pixel change vs the previous frame. A contact sheet per GIF shows every frame with its index.
Outputs measure/gif.jsonl (one row per GIF with a per-frame table) and sheets/gif_<id>.jpg."""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from common import MEASURE, ROOT, corpus, dumps


def frames(path):
    # Pillow's GIF reader applies each frame's disposal on seek(), so the converted frame is already the full displayed canvas
    im = Image.open(path)
    for i in range(getattr(im, "n_frames", 1)):
        im.seek(i)
        yield i, int(im.info.get("duration", 100)), np.array(im.convert("RGBA"))


def subject(rgba, bg):
    if (rgba[..., 3] < 128).mean() > 0.005:
        return rgba[..., 3] >= 128
    d = np.abs(rgba[..., :3].astype(int) - bg).sum(2)
    return d > 40


def measure(path):
    rows, prev, base_h, tiles = [], None, None, []
    bg = None
    for i, dur, f in frames(path):
        H, W = f.shape[:2]
        if bg is None:
            border = np.concatenate([f[0, :, :3], f[-1, :, :3], f[:, 0, :3], f[:, -1, :3]])
            bg = np.median(border, axis=0)
        m = subject(f, bg)
        r = {"i": i, "ms": dur}
        if m.any():
            ys, xs = np.nonzero(m)
            x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
            h = y1 - y0 + 1
            base_h = base_h or h
            mu = cv2.moments(m.astype(np.uint8), True)
            tilt = 0.5 * math.degrees(math.atan2(2 * mu["mu11"], mu["mu20"] - mu["mu02"])) if mu["m00"] else None
            r.update({"bbox": [int(x0), int(y0), int(x1), int(y1)], "cx_pct": round(xs.mean() / W * 100, 2), "cy_pct": round(ys.mean() / H * 100, 2),
                      "h_pct": round(h / H * 100, 2), "w_pct": round((x1 - x0 + 1) / W * 100, 2), "scale_vs_0": round(h / base_h, 4),
                      "tilt_deg": round(tilt, 2) if tilt is not None else None, "area_pct": round(m.mean() * 100, 2)})
        if prev is not None:
            r["diff"] = round(float(np.abs(f.astype(np.int16) - prev.astype(np.int16)).mean()), 3)
        prev = f
        rows.append(r)
        t = Image.fromarray(f); t.thumbnail((200, 200)); tiles.append((i, t))
    return {"size": [W, H], "n_frames": len(rows), "total_ms": sum(r["ms"] for r in rows), "frames": rows}, tiles


def sheet(tiles, out):
    cols = 8
    th = max(t.height for _, t in tiles)
    sh = Image.new("RGB", (cols * 200, math.ceil(len(tiles) / cols) * (th + 14)), (40, 40, 40))
    dr = ImageDraw.Draw(sh)
    try: font = ImageFont.truetype("arialbd.ttf", 12)
    except OSError: font = ImageFont.load_default()
    for k, (i, t) in enumerate(tiles):
        x, y = (k % cols) * 200, (k // cols) * (th + 14)
        bgc = Image.new("RGBA", t.size, (170, 170, 170, 255)); bgc.alpha_composite(t)
        sh.paste(bgc.convert("RGB"), (x, y + 14))
        dr.text((x + 2, y), str(i), fill=(255, 220, 0), font=font)
    sh.save(out, quality=85)


def main():
    os.makedirs(os.path.join(ROOT, "sheets"), exist_ok=True)
    with open(os.path.join(MEASURE, "gif.jsonl"), "w", encoding="utf8") as fh:
        for iid, rel, p in corpus("image"):
            if not rel.lower().endswith(".gif"): continue
            res, tiles = measure(p)
            sheet(tiles, os.path.join(ROOT, "sheets", f"gif_{iid}.jpg"))
            fh.write(dumps({"id": iid, "path": rel, **res}) + "\n")
            print(iid, rel, res["n_frames"], "frames", res["total_ms"], "ms")


if __name__ == "__main__":
    main()
