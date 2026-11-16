"""Shared helpers for the Gnarls image study (G1-G8). Method: research/ostad/style/FRAME_BY_FRAME.md, for stills.

Corpus: every raster image under media/drive (png, jpg, jpeg, heic, gif). Each image gets a stable id (I0001...) kept in
index.tsv; new files get the next free id, so ids never move. PSDs are a separate corpus (P001...) read only by G8.
Outputs: measure/<tool>.jsonl, one row per image ({"id":..., ...}). A tool is idempotent: ids already in its file are skipped.
Downloads are untrusted: run every tool as `python -I tools/run.py <tool>`.
"""
from __future__ import annotations
import json, os

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA, MEASURE = os.path.join(ROOT, "media", "drive"), os.path.join(ROOT, "measure")
OSTAD_TOOLS = os.path.join(ROOT, "..", "ostad", "style", "tools")
IMG_EXT = {".png", ".jpg", ".jpeg", ".heic", ".gif"}
PSD_EXT = {".psd"}
ANALYSIS_W = 270


import sys
# -I ignores PYTHONIOENCODING; rclone writes trailing spaces in folder names as U+2420, so force UTF-8 console output
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception: pass


def _np(o):
    from numbers import Rational, Real
    if isinstance(o, np.integer): return int(o)
    if isinstance(o, (tuple, list)): return [_np(x) if not isinstance(x, (int, float, str)) else x for x in o]
    if isinstance(o, Real) and not isinstance(o, bool): return round(float(o), 4)  # PIL IFDRational (JPEG dpi) and friends
    if isinstance(o, np.floating): return None if not np.isfinite(o) else round(float(o), 5)
    if isinstance(o, np.ndarray): return o.tolist()
    if isinstance(o, np.bool_): return bool(o)
    raise TypeError(type(o))


def dumps(o):
    return json.dumps(o, ensure_ascii=False, separators=(",", ":"), default=_np)


def _scan(exts):
    out = []
    for d, _, fs in os.walk(MEDIA):
        for f in fs:
            if os.path.splitext(f)[1].lower() in exts:
                out.append(os.path.relpath(os.path.join(d, f), MEDIA).replace("\\", "/"))
    return sorted(out)


def corpus(kind="image"):
    """[(id, relpath, abspath)]; ids persist in index.tsv (images, I####) or psd_index.tsv (P###)."""
    exts, idx, pre, width = (IMG_EXT, "index.tsv", "I", 4) if kind == "image" else (PSD_EXT, "psd_index.tsv", "P", 3)
    ip = os.path.join(ROOT, idx)
    known = {}
    if os.path.exists(ip):
        for line in open(ip, encoding="utf8").read().splitlines()[1:]:
            i, rel = line.split("\t", 1)
            known[rel] = i
    nxt = max([int(v[1:]) for v in known.values()] + [0]) + 1
    rels = _scan(exts)
    for rel in rels:
        if rel not in known:
            known[rel] = f"{pre}{nxt:0{width}d}"; nxt += 1
    with open(ip, "w", encoding="utf8", newline="\n") as f:
        f.write("id\tpath\n")
        for rel, i in sorted(known.items(), key=lambda kv: kv[1]):
            f.write(f"{i}\t{rel}\n")
    present = set(rels)
    return [(i, rel, os.path.join(MEDIA, rel)) for rel, i in sorted(known.items(), key=lambda kv: kv[1]) if rel in present]


def load_rgba(path):
    """Full-resolution RGBA uint8 array (first frame for GIFs). HEIC via pillow-heif. EXIF orientation applied."""
    from PIL import Image, ImageOps
    if path.lower().endswith(".heic"):
        import pillow_heif
        pillow_heif.register_heif_opener()
    im = Image.open(path)
    im.seek(0)
    im = ImageOps.exif_transpose(im)
    return np.array(im.convert("RGBA"))


def small(rgba, w=ANALYSIS_W):
    import cv2
    H, W = rgba.shape[:2]
    return cv2.resize(rgba, (w, max(1, int(round(H * w / W)))), interpolation=cv2.INTER_AREA)


def has_alpha(rgba, thresh=0.005):
    """True when at least 0.5% of pixels are transparent (alpha < 128): the image is a cut-out / sticker."""
    return float((rgba[..., 3] < 128).mean()) >= thresh


def done_ids(tool):
    p = os.path.join(MEASURE, tool + ".jsonl")
    if not os.path.exists(p): return set()
    return {json.loads(l)["id"] for l in open(p, encoding="utf8") if l.strip()}


def read_rows(tool):
    p = os.path.join(MEASURE, tool + ".jsonl")
    if not os.path.exists(p): return {}
    return {r["id"]: r for r in (json.loads(l) for l in open(p, encoding="utf8") if l.strip())}
