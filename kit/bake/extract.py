# Step 1a: each painted part out of its cell. The cell's background colour is the median of its border (below the
# label); a pixel belongs to the part where it is far enough from that colour in Lab. The back sheet's drop
# shadows are the background darkened with no colour of their own, so lightness alone does not count until it is
# well past a shadow's depth; colour (a, b) counts from a small distance. The result is cleaned (largest
# components, holes filled) and given a soft 1.5 px edge. Writes kit/work/paint-<view>-<label>.png (RGBA, the part
# with its mask as alpha) and a contact sheet kit/work/masks.png.
import os
import sys

import cv2
import numpy as np
from scipy import ndimage

sys.path.insert(0, os.path.dirname(__file__))
from common import KIT, ORDER, PAINT_CELL, WORK

LABEL_H = 78  # the "A  FRAME (...)" line at the top of each cell
# lightness drop that counts on its own (a shadow is lighter than this below the background), colour distance
SHADOW_DL = {"front": 14, "back": 30}
CHROMA = {"front": 6, "back": 4}
COMPONENTS = {"D": 2, "F": 1}


def cell(sheet, label):
    k = ORDER.index(label)
    w, h = PAINT_CELL
    x, y = (k % 2) * w, (k // 2) * h
    return sheet[y:y + h, x:x + w]


def extract(view, label):
    sheet = cv2.imread(os.path.join(KIT, f"painted-{view}.png"))
    c = cell(sheet, label).copy()
    h, w = c.shape[:2]
    lab = cv2.cvtColor(c, cv2.COLOR_BGR2LAB).astype(np.float32)
    lab[..., 0] *= 100 / 255
    lab[..., 1:] -= 128
    ring = np.zeros((h, w), bool)
    ring[LABEL_H:LABEL_H + 12, 8:-8] = ring[-14:-6, 8:-8] = True
    ring[LABEL_H:-6, 6:14] = ring[LABEL_H:-6, -14:-6] = True
    bg = np.median(lab[ring], axis=0)
    dL = bg[0] - lab[..., 0]
    dC = np.hypot(lab[..., 1] - bg[1], lab[..., 2] - bg[2])
    # on the front's mid-grey ground a highlight is lighter than the ground, and counts; on the back's near-white
    # ground the only lighter things are the floor's reflections under the parts, which do not
    m = (dL > SHADOW_DL[view]) | (dC > CHROMA[view]) | ((dL < -6) if view == "front" else False)
    m[:LABEL_H + 4] = False
    m[:, :8] = m[:, -8:] = False
    m[-6:] = False
    m = ndimage.binary_opening(m, iterations=1)
    lab_, n = ndimage.label(m)
    if n:
        sizes = ndimage.sum(m, lab_, range(1, n + 1))
        keep = np.argsort(sizes)[::-1][:COMPONENTS.get(label, 1)] + 1
        m = np.isin(lab_, keep)
    m = ndimage.binary_closing(m, iterations=2)
    # pinholes (a highlight or a speck the thresholds missed) are filled; real openings (the frame's loop, the
    # base's hole, the discs' holes) are hundreds of times bigger and stay open
    holes = ndimage.binary_fill_holes(m) & ~m
    hl, hn = ndimage.label(holes)
    if hn:
        hs = ndimage.sum(holes, hl, range(1, hn + 1))
        m |= np.isin(hl, np.where(hs < 300)[0] + 1)
    soft = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.5)
    rgba = np.dstack([c, (soft * 255).astype(np.uint8)])
    cv2.imwrite(os.path.join(WORK, f"paint-{view}-{label}.png"), rgba)
    return m, c


if __name__ == "__main__":
    tiles = []
    for view in ("front", "back"):
        row = []
        for label in "ABCDEF":
            m, c = extract(view, label)
            vis = c.copy()
            vis[~m] = (vis[~m] * 0.25 + np.array([255, 0, 255]) * 0.75).astype(np.uint8)
            row.append(cv2.resize(vis, (424, 316)))
        tiles.append(np.hstack(row))
    cv2.imwrite(os.path.join(WORK, "masks.png"), np.vstack(tiles))
    print("ok")
