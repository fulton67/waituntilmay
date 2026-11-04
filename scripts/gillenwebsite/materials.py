# The Rolodex's three tileable materials, from public/materials/<name>.png (2048, seamless):
#   ~/tools/rolodex-venv/Scripts/python -I scripts/gillenwebsite/materials.py
# For each of enamel, bakelite and chrome:
#   albedo     the source as it is
#   roughness  luminance inverted, then levelled with a gamma so its median is the material's roughness on the
#              site before (enamel 0.46, bakelite 0.35, chrome 0.18)
#   normal     from the luminance as height: Sobel with wrap-around edges (so it tiles), strength 0.6 enamel,
#              0.3 bakelite, 0.4 chrome
# A source that is not there yet is made as seamless placeholder noise in the material's colour, so the pipeline
# and the shader run end to end; MATERIALS.md says what to drop in. Maps are written at the source size into
# scripts/gillenwebsite/cache/materials and at the runtime size (enamel 1024, bakelite and chrome 512) into
# public/materials/<name>-{albedo.jpg,rough.png,normal.png}; public/materials/materials.json records which.
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "public", "materials")
CACHE = os.path.join(os.path.dirname(__file__), "cache", "materials")
MATS = {
    "enamel": {"rough": 0.46, "strength": 0.6, "size": 1024, "colour": (179, 154, 116), "grain": [(8, 0.5), (32, 0.3), (128, 0.2)], "amp": 0.10},
    "bakelite": {"rough": 0.35, "strength": 0.3, "size": 512, "colour": (43, 33, 26), "grain": [(16, 0.4), (64, 0.4), (256, 0.2)], "amp": 0.25},
    "chrome": {"rough": 0.18, "strength": 0.4, "size": 512, "colour": (216, 212, 204), "grain": [(4, 0.3), (512, 0.7)], "amp": 0.05},
}


def periodic_noise(n, octaves, seed):
    """fBm that tiles: white noise filtered in the frequency domain, so it wraps by construction"""
    rng = np.random.default_rng(seed)
    out = np.zeros((n, n))
    fy, fx = np.meshgrid(np.fft.fftfreq(n) * n, np.fft.fftfreq(n) * n, indexing="ij")
    f = np.hypot(fx, fy)
    for cells, w in octaves:
        spec = np.fft.fft2(rng.standard_normal((n, n)))
        band = np.exp(-((f - cells) ** 2) / (2 * (cells * 0.5) ** 2))
        o = np.real(np.fft.ifft2(spec * band))
        out += w * (o - o.mean()) / (o.std() + 1e-9)
    return out / (np.abs(out).max() + 1e-9)


def placeholder(name, m, n=2048):
    h = periodic_noise(n, m["grain"], seed=sum(map(ord, name)))
    if name == "chrome":  # a brushed direction: stretch the fine noise along x
        h = 0.6 * h + 0.4 * ndimage.uniform_filter1d(periodic_noise(n, [(256, 1.0)], 7), 64, axis=1, mode="wrap")
    c = np.array(m["colour"], float)[None, None, :] / 255
    rgb = np.clip(c * (1 + m["amp"] * h[..., None]), 0, 1)
    return Image.fromarray((rgb * 255).astype(np.uint8), "RGB")


def lum(rgb):
    a = np.asarray(rgb, float) / 255
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]


def roughness(rgb, target):
    r = np.clip(1 - lum(rgb), 1e-4, 1)
    g = np.log(target) / np.log(np.median(r))
    return np.clip(r ** g, 0, 1)


def normal(rgb, strength):
    h = ndimage.gaussian_filter(lum(rgb), 1.0, mode="wrap")
    gx = ndimage.sobel(h, axis=1, mode="wrap") / 8
    gy = ndimage.sobel(h, axis=0, mode="wrap") / 8
    k = strength * 40  # height in luminance units -> slope; 40 keeps 0.6 at a visible but quiet relief
    n = np.dstack([-gx * k, gy * k, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8), "RGB")


os.makedirs(SRC, exist_ok=True)
os.makedirs(CACHE, exist_ok=True)
info = {}
for name, m in MATS.items():
    path = os.path.join(SRC, f"{name}.png")
    real = os.path.exists(path)
    src = Image.open(path).convert("RGB") if real else placeholder(name, m)
    rough = roughness(src, m["rough"])
    rimg = Image.fromarray((rough * 255).astype(np.uint8), "L")
    nimg = normal(src, m["strength"])
    src.save(os.path.join(CACHE, f"{name}-albedo.png"))
    rimg.save(os.path.join(CACHE, f"{name}-rough.png"))
    nimg.save(os.path.join(CACHE, f"{name}-normal.png"))
    s = m["size"]
    src.resize((s, s), Image.LANCZOS).save(os.path.join(SRC, f"{name}-albedo.jpg"), quality=90)
    rimg.resize((s, s), Image.LANCZOS).save(os.path.join(SRC, f"{name}-rough.png"))
    nimg.resize((s, s), Image.LANCZOS).save(os.path.join(SRC, f"{name}-normal.png"))
    info[name] = {"source": f"public/materials/{name}.png" if real else "placeholder noise", "sourceSize": src.size[0], "runtimeSize": s,
                  "roughnessMedian": round(float(np.median(rough)), 3), "targetMedian": m["rough"], "normalStrength": m["strength"], "tileM": 0.25}
    print(name, info[name])
json.dump(info, open(os.path.join(SRC, "materials.json"), "w"), indent=2)
