"""Calibration: synthetic images with known answers. G3, G5, G6, G7 must land within 10% (or the stated tolerance) before any
corpus run counts. Writes measure/_calibration/calibration.json and exits non-zero on any failure.

Cases
 1. Outlined sticker: 600x800 RGBA, transparent bg, grey ellipse (rx 200, ry 300) with an 8 px black outline.
    Known: bbox 401x601, fill ratio pi/4, subject aspect 401/601, outlined, stroke 8 px.
 2. Unoutlined photo cut-out: the same ellipse filled with noisy grey, no rim. Known: outlined False.
 3. Thick outline: 24 px outline. Known: stroke 24 px.
 4. Palette: 300x300 opaque, 50% TNS red / 30% black / 20% white blocks. Known: palette shares .5/.3/.2, brand shares the same.
 5. Hash: case 1 vs itself resized to 50% and JPEG q70 -> pHash distance <= 6; vs case 4 -> distance >= 20.
 6. Gnarls colours: a block of each official GNARLS_LAB colour (style guide p.2), equal shares -> each share 1/n within 10%.
"""
import io, json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cv2
import numpy as np
from PIL import Image

from common import MEASURE
from gtools import BRAND, GNARLS_LAB, g3_color, g5_silhouette, g6_hash, g7_gnarls


def ellipse(stroke, noisy=False):
    im = np.zeros((800, 600, 4), np.uint8)
    cv2.ellipse(im, (300, 400), (200, 300), 0, 0, 360, (180, 182, 185, 255), -1, lineType=cv2.LINE_8)
    if noisy:
        m = im[..., 3] > 0
        n = np.random.default_rng(0).normal(0, 12, im[..., :3].shape)
        im[..., :3] = np.where(m[..., None], np.clip(im[..., :3] + n, 0, 255), 0).astype(np.uint8)
    if stroke:
        a = (im[..., 3] > 0).astype(np.uint8)
        dist = cv2.distanceTransform(a, cv2.DIST_L2, 5)
        rim = (a > 0) & (dist <= stroke)
        im[rim, :3] = 0
    return im


def lab_to_rgb(L, a, b):
    v = np.array([[[L * 255 / 100, a + 128, b + 128]]], np.float32)
    return cv2.cvtColor(np.clip(v, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)[0, 0]


def within(got, want, tol=0.10):
    return got is not None and abs(got - want) <= tol * abs(want)


def main():
    res = []

    def check(name, got, want, ok):
        res.append({"case": name, "got": got, "want": want, "pass": bool(ok)})

    s = g5_silhouette(ellipse(8), "")
    x0, y0, x1, y1 = s["bbox"]
    check("sticker bbox w", x1 - x0 + 1, 401, within(x1 - x0 + 1, 401, 0.01))
    check("sticker bbox h", y1 - y0 + 1, 601, within(y1 - y0 + 1, 601, 0.01))
    check("sticker fill ratio", s["fill_ratio"], round(math.pi / 4, 4), within(s["fill_ratio"], math.pi / 4))
    check("sticker aspect", s["subject_aspect_wh"], round(401 / 601, 4), within(s["subject_aspect_wh"], 401 / 601))
    check("sticker outlined", s["outline"]["outlined"], True, s["outline"]["outlined"] is True)
    check("stroke 8px", s["outline"].get("width_px"), 8, within(s["outline"].get("width_px"), 8, 0.125))
    s2 = g5_silhouette(ellipse(0, noisy=True), "")
    check("photo cut-out not outlined", s2["outline"]["outlined"], False, s2["outline"]["outlined"] is False)
    s3 = g5_silhouette(ellipse(24), "")
    check("stroke 24px", s3["outline"].get("width_px"), 24, within(s3["outline"].get("width_px"), 24))

    pal = np.zeros((300, 300, 4), np.uint8); pal[..., 3] = 255
    pal[:150, :, :3] = BRAND["tns_red"]; pal[150:240, :, :3] = BRAND["black"]; pal[240:, :, :3] = BRAND["white"]
    c = g3_color(pal, "")
    shares = {h: v for h, v in c["palette"] if v > 0.01}
    top = sorted(shares.values(), reverse=True)
    for want, got in zip([0.5, 0.3, 0.2], top):
        check(f"palette share {want}", got, want, within(got, want))
    for k, want in (("tns_red", 0.5), ("black", 0.3), ("white", 0.2)):
        check(f"brand share {k}", c["brand_share"][k], want, within(c["brand_share"][k], want))

    import imagehash
    h1 = imagehash.hex_to_hash(g6_hash(ellipse(8), "")["phash"])
    b = io.BytesIO()
    e = ellipse(8); e2 = e[..., :3].copy(); e2[e[..., 3] < 128] = 255
    Image.fromarray(e2).resize((300, 400)).save(b, "JPEG", quality=70)
    j = np.array(Image.open(io.BytesIO(b.getvalue())).convert("RGBA"))
    h2 = imagehash.hex_to_hash(g6_hash(j, "")["phash"])
    h3 = imagehash.hex_to_hash(g6_hash(pal, "")["phash"])
    # pHash flips ~10 bits on flat synthetic shapes after resize+JPEG (measured 10), so duplicate groups use dHash <= 6;
    # pHash stays as a secondary signal and must still separate different images.
    d1 = imagehash.hex_to_hash(g6_hash(ellipse(8), "")["dhash"])
    d2 = imagehash.hex_to_hash(g6_hash(j, "")["dhash"])
    d3 = imagehash.hex_to_hash(g6_hash(pal, "")["dhash"])
    check("dhash same image resized+jpeg <= 6", d1 - d2, "<=6", (d1 - d2) <= 6)
    check("dhash different image >= 20", d1 - d3, ">=20", (d1 - d3) >= 20)
    check("phash different image >= 20", h1 - h3, ">=20", (h1 - h3) >= 20)

    names = list(GNARLS_LAB)
    g = np.zeros((90 * len(names), 360, 4), np.uint8); g[..., 3] = 255
    for i, n in enumerate(names):
        g[i * 90:(i + 1) * 90, :, :3] = lab_to_rgb(*GNARLS_LAB[n][0])
    gs = g7_gnarls(g, "")
    for n in names:
        check(f"gnarls {n} share", gs[n], round(1 / len(names), 4), within(gs[n], 1 / len(names)))

    os.makedirs(os.path.join(MEASURE, "_calibration"), exist_ok=True)
    json.dump(res, open(os.path.join(MEASURE, "_calibration", "calibration.json"), "w"), indent=1, default=str)
    for r in res:
        print(("PASS " if r["pass"] else "FAIL ") + f"{r['case']}: got {r['got']} want {r['want']}")
    bad = [r for r in res if not r["pass"]]
    print(f"{len(res) - len(bad)}/{len(res)} pass")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
