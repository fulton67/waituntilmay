"""Immersion/layout measure for OstadYT6: per-frame image fill share and image motion.
graphic layer = |render - plain render (room + presenter only)|; imagery = graphic blocks that are textured or dark
and not flat white card/type. Run with style-venv python -I.
usage: measure_v6.py <render.mp4> <plain_q.mp4> <beats.json> <out.json>
"""
import sys, json, subprocess
import numpy as np
from scipy import ndimage as ndi

W, H = 480, 270
B = 10  # block px at quarter scale (40 px at 1080p)


def frames(path):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={W}:{H}:flags=area", "-f", "rawvideo",
                          "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    n = W * H * 3
    while True:
        b = p.stdout.read(n)
        if len(b) < n:
            break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3).astype(np.float32)


def blocks(a):  # (H,W) -> (H/B, W/B, B*B)
    return a.reshape(H // B, B, W // B, B).transpose(0, 2, 1, 3).reshape(H // B, W // B, B * B)


render, plain, beats_p, out_p = sys.argv[1:5]
beats = json.load(open(beats_p, encoding="utf-8"))
# presenter not keyed on the canvas (pip or out). Gap round 1 (OstadYT6.tsx OUT_RANGES + S3); the v6 pre-gap render used
# [(1181, 1241), (1754, 1849)]: pass --pregap as a 5th argument to measure that render
OUT = [(263, 413), (546, 666), (893, 996), (1081, 1271), (1449, 1599), (1710, 1849)]
if len(sys.argv) > 5 and sys.argv[5] == "--pregap":
    OUT = [(1181, 1241), (1754, 1849)]

rows = []
prev_luma, prev_img = None, None
for f, (r, p) in enumerate(zip(frames(render), frames(plain))):
    luma = r @ np.array([0.299, 0.587, 0.114], np.float32)
    g = np.abs(r - p).max(axis=2) > 20  # graphic layer pixels
    sat = r.max(axis=2) - r.min(axis=2)
    whiteish = (luma > 222) & (sat < 28)
    gb = blocks(g.astype(np.float32)).mean(-1)
    lb = blocks(luma)
    std = lb.std(-1)
    mean = lb.mean(-1)
    wb = blocks(whiteish.astype(np.float32)).mean(-1)
    img_blocks = (gb > 0.7) & (wb < 0.35) & ((std > 7) | (mean < 120))
    # windows are rectangles: close gaps, then fill each dense component's bbox (bright clinic walls read as flat)
    cl = ndi.binary_closing(img_blocks, iterations=2) | img_blocks
    lab, n = ndi.label(cl)
    filled = np.zeros_like(img_blocks)
    for sl in ndi.find_objects(lab):
        comp = lab[sl] > 0
        if comp.sum() >= 8 and comp.mean() >= 0.3:
            filled[sl] = True
    img_blocks = filled
    img = np.repeat(np.repeat(img_blocks, B, 0), B, 1)
    fill = float(img_blocks.mean())
    graphic = float(g.mean())
    # image motion: luma change inside imagery present in both frames
    moving = None
    if prev_luma is not None:
        both = img & prev_img
        if both.sum() > 400:
            moving = float(np.abs(luma - prev_luma)[both].mean())
    # left/right halves (split detection)
    lf = float(img_blocks[:, : W // B // 2].mean()); rf = float(img_blocks[:, W // B // 2:].mean())
    pres = not any(a <= f <= b for a, b in OUT)
    rows.append({"f": f, "fill": round(fill, 4), "graphic": round(graphic, 4), "dimg": None if moving is None else round(moving, 3),
                 "left": round(lf, 4), "right": round(rf, 4), "presenter": pres})
    prev_luma, prev_img = luma, img
    if f in (60, 300, 1200, 1795, 1830, 2000):
        np.save(out_p.replace(".json", f"_mask{f}.npy"), img_blocks)
json.dump(rows, open(out_p, "w"))
print(len(rows))
