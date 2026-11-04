# The drum's end plates' material: the inner discs' painted gunmetal as a seamless tile (bake.py cut it from their
# painted pixels, kit/work/tile-D.png) with roughness, metalness and normal derived as for the discs themselves
# (pbr.maps, "metal": paint 0.45, rust 0.85, Sobel 0.5). Mapped triplanar at the tile's own scale on the site.
#   ~/tools/rolodex-venv/Scripts/python -I kit/bake/gunmetal.py
import json
import os
import sys

import cv2

sys.path.insert(0, os.path.dirname(__file__))
from common import ROOT, WORK
from pbr import maps

tile = cv2.imread(os.path.join(WORK, "tile-D.png"))
big = cv2.resize(tile, (512, 512), interpolation=cv2.INTER_CUBIC)
rm, normal, st = maps("D", big)
out = os.path.join(ROOT, "public", "models", "housing-maps")
cv2.imwrite(os.path.join(out, "gunmetal-albedo.jpg"), big, [cv2.IMWRITE_JPEG_QUALITY, 90])
cv2.imwrite(os.path.join(out, "gunmetal-rm.png"), rm)
cv2.imwrite(os.path.join(out, "gunmetal-normal.png"), normal)
world = json.load(open(os.path.join(WORK, "bake.json")))["D"]["tileWorldM"]
print({"tilePx": tile.shape[0], "tileWorldM": world, **st})
