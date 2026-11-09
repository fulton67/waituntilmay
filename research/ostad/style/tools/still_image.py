"""M21: still posts and carousel slides (and Are.na images): M7 (luma, RMS contrast, saturation, black / white point), M8 (shadow /
highlight hue), M9 (Lab k-means palette, k=5) on the image; M13 card geometry on every image-card contour found (M11's contour
cue at 270 px, then measured at native resolution); text blocks via M10's EasyOCR (bbox, text, size as % of the image height);
layout grid: each block's and card's position on a 12-column grid with 9.1% margins, and the rule-of-thirds band it sits in."""
import cv2
import numpy as np

from card_geometry import measure_card
from common import run
from graphic_track import contour_boxes, kind_of
from luma_contrast_sat import stats
from ocr_track import read
from palette import pal
from shadow_highlight_hue import tone


def m21(ref, vid, path, P):
    im = cv2.imread(path, cv2.IMREAD_COLOR)
    if im is None:
        from PIL import Image
        im = cv2.cvtColor(np.array(Image.open(path).convert("RGB")), cv2.COLOR_RGB2BGR)
    f = cv2.cvtColor(im, cv2.COLOR_BGR2RGB)
    H, W = f.shape[:2]
    small = cv2.resize(f, (270, int(round(H * 270 / W))), interpolation=cv2.INTER_AREA)
    k = W / 270
    g = cv2.cvtColor(small, cv2.COLOR_RGB2GRAY)
    cards = []
    for b in contour_boxes(g):
        if kind_of(small, b) != "image_card":
            continue
        r = measure_card(f, [v * k for v in b])
        if r:
            cards.append(r)
    rw = 540 if H >= W else 960
    rs = cv2.resize(f, (rw, int(round(H * rw / W))), interpolation=cv2.INTER_AREA)
    blocks = read(rs, W / rw)
    col_w = (1 - 2 * 0.091) / 12
    for b in blocks:
        cx, cy = (b["bbox"][0] + b["bbox"][2]) / 2 / W, (b["bbox"][1] + b["bbox"][3]) / 2 / H
        b["size_pct_h"] = round((b["bbox"][3] - b["bbox"][1]) / H * 100, 2)
        b["col12"] = int(np.clip((cx - 0.091) // col_w, 0, 11)) + 1
        b["third"] = ["top", "middle", "bottom"][min(2, int(cy * 3))]
    return {"size": [W, H], "stats": dict(zip(["luma", "rms_contrast", "saturation", "black_point", "white_point"], stats(small))),
            "tone": dict(zip(["shadow_hue", "shadow_sat", "highlight_hue", "highlight_sat"], tone(small))), "palette": pal(small),
            "cards": cards, "text_blocks": blocks}


if __name__ == "__main__":
    run("still.json", m21, kind="still")
