# Is the sheet camera in common.py the one the kit sheets were rendered with? Each part's silhouette from
# common.silhouette against the part in kit/rolodex-parts-kit-<view>.png (anything not the flat 233 grey, below the
# cell's label). Prints the IoU of the outlines (holes filled) per part and view; they should all be close to 1.
import os
import sys

import cv2
import numpy as np
from scipy import ndimage

sys.path.insert(0, os.path.dirname(__file__))
from common import KIT, KIT_CELL, ORDER, PARTS, iou, part_meshes, scene, silhouette

sc = scene()
for view in ("front", "back"):
    sheet = cv2.imread(os.path.join(KIT, f"rolodex-parts-kit-{view}.png"))
    for label in PARTS:
        k = ORDER.index(label)
        cx, cy = (k % 4) * KIT_CELL, (k // 4) * KIT_CELL
        cell = sheet[cy:cy + KIT_CELL, cx:cx + KIT_CELL].astype(int)
        mask = (np.abs(cell - 233).max(2) > 6).astype(np.float32)
        mask[:70] = 0  # the label
        mask[540:] = 0 if k >= 4 else mask[540:]  # the caption line under the bottom row
        mask[:, :4] = 0; mask[:, -4:] = 0; mask[:4] = 0  # the cell rules
        sil = silhouette(part_meshes(sc, label), view)
        # the kit is shaded: a light face can come out the background's own 233 grey, so the comparison is between
        # outlines, holes filled on both sides
        fill = lambda m: ndimage.binary_fill_holes(ndimage.binary_closing(m > 0.5, iterations=2)).astype(np.float32)
        print(view, label, PARTS[label][1], "outline IoU", round(iou(fill(sil), fill(mask)), 4), "raw", round(iou(sil, mask), 4))
        cv2.imwrite(os.path.join(KIT, "work", f"check-{view}-{label}.png"), np.dstack([sil * 255, mask * 255, np.zeros_like(mask)]).astype(np.uint8))
