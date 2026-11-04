# Step 3 and 4: PBR maps from each baked albedo, and the aged-paper tile.
# Roughness: inverted luminance as the variation around a level per surface: intact paint 0.45, rust 0.85
# (rust masked by hue: red-brown, saturated, not too light or dark), bakelite 0.3. Metalness: 0.7 on intact paint,
# 0.9 where rust shows, 0 on bakelite. Normal: Sobel of the albedo's luminance, strength 0.5 on the metal parts and
# 0.25 on bakelite, so chip edges catch the light. Roughness (G) and metalness (B) share one texture, the way
# three.js reads them.
# The paper: from panel H (the single card) of the painted front sheet, the largest square inside the card with
# its edges and stains left out, made seamless and written at 1024.
# Runtime sizes keep the textures' GPU memory under 40 MB: the frame and side plate at 1024 (normal 512), the base
# at 768 (roughness/metal 512, normal 256), the discs and knobs at 512 (normal 256), the paper at 512. Writes public/models/housing-maps/<part>-{albedo.jpg,rm.png,
# normal.png}, public/materials/paper.jpg and kit/work/pbr.json.
import json
import os
import sys

import cv2
import numpy as np
from scipy import ndimage

sys.path.insert(0, os.path.dirname(__file__))
from common import KIT, ORDER, PAINT_CELL, PARTS, ROOT, WORK
from bake import seamless_tile

OUT = os.path.join(ROOT, "public", "models", "housing-maps")
KIND = {"A": "metal", "B": "metal", "C": "metal", "D": "metal", "E": "bakelite", "F": "bakelite"}
NAMES = {"A": "frame", "B": "base", "C": "side_right", "D": "side_inner", "E": "knob_right", "F": "knob_left"}
RUNTIME = {"A": (1024, 1024, 512), "B": (768, 512, 256), "C": (1024, 1024, 512), "D": (512, 512, 256), "E": (512, 512, 256), "F": (512, 512, 256)}
PAPER = 512


def rust_mask(bgr):
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV_FULL).astype(np.float32)
    h, s, v = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
    m = ((h < 38) | (h > 345)) & (s > 0.32) & (v > 0.12) & (v < 0.8)
    return cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.2)


def maps(label, albedo):
    lum = cv2.cvtColor(albedo, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    inv = 1 - lum
    var = (inv - np.median(inv)) * 0.25
    if KIND[label] == "bakelite":
        rough = np.clip(0.3 + var, 0.05, 1)
        metal = np.zeros_like(lum)
        strength = 0.25
        rust = np.zeros_like(lum)
    else:
        rust = rust_mask(albedo)
        rough = np.clip(0.45 + (0.85 - 0.45) * rust + var, 0.05, 1)
        metal = 0.7 + 0.2 * rust
        strength = 0.5
    h = cv2.GaussianBlur(lum, (0, 0), 1.0)
    gx = cv2.Sobel(h, cv2.CV_32F, 1, 0, ksize=3) / 8
    gy = cv2.Sobel(h, cv2.CV_32F, 0, 1, ksize=3) / 8
    k = strength * 40
    # image rows run down the atlas (v down, as glTF's UVs do), so +y in the image is -v
    n = np.dstack([-gx * k, gy * k, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    normal = ((n * 0.5 + 0.5) * 255).astype(np.uint8)[..., ::-1]  # RGB -> BGR for cv2
    rm = np.dstack([metal, rough, np.full_like(lum, 1.0)])  # BGR: B = metalness, G = roughness, R = occlusion (1)
    return (rm * 255).astype(np.uint8), normal, {"rustPct": round(100 * float((rust > 0.5).mean()), 1), "roughMedian": round(float(np.median(rough)), 3), "metalMedian": round(float(np.median(metal)), 3), "normalStrength": strength}


def paper():
    sheet = cv2.imread(os.path.join(KIT, "painted-front.png"))
    k = ORDER.index("H")
    w, h = PAINT_CELL
    c = sheet[(k // 2) * h:(k // 2 + 1) * h, (k % 2) * w:(k % 2 + 1) * w]
    lab = cv2.cvtColor(c, cv2.COLOR_BGR2LAB).astype(np.float32)
    bg = np.median(lab[100:120, 20:60].reshape(-1, 3), axis=0)
    m = np.linalg.norm(lab - bg, axis=2) > 12
    m[:90] = False
    m = ndimage.binary_fill_holes(ndimage.binary_opening(m, iterations=2))
    tile, n = seamless_tile(c.astype(np.float32), m, sizes=(320, 256, 224, 192, 160, 128))
    return cv2.resize(np.clip(tile, 0, 255).astype(np.uint8), (1024, 1024), interpolation=cv2.INTER_CUBIC), n


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    bake = json.load(open(os.path.join(WORK, "bake.json")))
    info, mem = {}, 0
    for label in PARTS:
        if not bake[label].get("baked"):
            continue
        albedo = cv2.imread(os.path.join(WORK, f"bake-{label}-albedo.png"))
        rm, normal, st = maps(label, albedo)
        cv2.imwrite(os.path.join(WORK, f"bake-{label}-rm.png"), rm)
        cv2.imwrite(os.path.join(WORK, f"bake-{label}-normal.png"), normal)
        a, rsz, nsz = RUNTIME[label]
        name = NAMES[label]
        cv2.imwrite(os.path.join(OUT, f"{name}-albedo.jpg"), cv2.resize(albedo, (a, a), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 90])
        cv2.imwrite(os.path.join(OUT, f"{name}-rm.png"), cv2.resize(rm, (rsz, rsz), interpolation=cv2.INTER_AREA))
        cv2.imwrite(os.path.join(OUT, f"{name}-normal.png"), cv2.resize(normal, (nsz, nsz), interpolation=cv2.INTER_AREA))
        # GPU memory: RGBA8 with a full mip chain (4/3)
        m = (a * a + rsz * rsz + nsz * nsz) * 4 * 4 / 3
        mem += m
        info[label] = {"part": PARTS[label][1], "file": name, "kind": KIND[label], "albedo": a, "rm": rsz, "normal": nsz, "gpuMB": round(m / 2 ** 20, 2), **st}
        print(label, info[label])
    p, n = paper()
    cv2.imwrite(os.path.join(WORK, "paper-1024.png"), p)
    cv2.imwrite(os.path.join(ROOT, "public", "materials", "paper.jpg"), cv2.resize(p, (PAPER, PAPER), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 90])
    mem += PAPER * PAPER * 4 * 4 / 3
    info["paper"] = {"from": "panel H, painted-front", "patchPx": n, "tile": 1024, "runtime": PAPER, "gpuMB": round(PAPER * PAPER * 4 * 4 / 3 / 2 ** 20, 2)}
    info["gpuMBAdded"] = round(mem / 2 ** 20, 2)
    print("paper", info["paper"], "GPU MB added", info["gpuMBAdded"])
    json.dump(info, open(os.path.join(WORK, "pbr.json"), "w"), indent=2)
    # the site's manifest: GLB mesh node -> its baked geometry (in housing-baked.glb) and maps; a part whose fit
    # failed in both views is not in it, so it keeps its previous material
    nodes = {}
    for label, (meshes, _) in PARTS.items():
        if label not in info:
            continue
        for node in meshes:
            nodes[node] = {"geometry": "side_right_inner" if node == "side_left_inner" else node, "maps": NAMES[label], "kind": KIND[label]}
    json.dump({"nodes": nodes, "notBaked": [PARTS[l][1] for l in PARTS if l not in info], "gpuMBAdded": info["gpuMBAdded"]},
              open(os.path.join(ROOT, "lib", "gillenwebsite", "housing-bake.json"), "w"), indent=2)
