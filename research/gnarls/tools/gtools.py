"""G1-G8: per-image measurements for the Gnarls study. Same formulas as the ostad M-tools where they overlap (M7 luma/contrast/
saturation, M8 shadow/highlight hue, M9 CIELAB k-means k=5, M10 EasyOCR, M21 still layout grid), plus cut-out tools for stills.

Every function takes (rgba full-res uint8 array, path) and returns a dict. Cut-outs (alpha) are measured on opaque pixels only,
so the transparent background never counts as a colour.

| # | name        | what it measures |
| G1 | probe       | format, size, aspect, the named delivery format it matches (design_requirements.png), file size, alpha, GIF frames, EXIF camera |
| G3 | color       | luma, RMS contrast, saturation, black / white point, shadow / highlight hue, 5-colour CIELAB palette, brand-colour shares |
| G4 | ocr         | text blocks: text, bbox, conf, size as % of image height, 12-col grid column, thirds band |
| G5 | silhouette  | cut-outs: subject bbox, fill ratio, aspect, centroid, components, solidity, outline stroke width (px and % of subject height), outline colour |
| G6 | hash        | pHash + dHash (64-bit) and a 16x16 average colour signature, for duplicate / variant groups |
| G7 | gnarls      | Gnarls-grey body share, tusk-cream share, glasses-brown share, red-tee share (thresholds in GNARLS_LAB, fitted in calibrate) |
| G8 | psd         | PSDs: canvas, layer tree (name, kind, bbox, visible, opacity, blend), text layer strings, smart objects |
(G2 = contact sheets, tools/sheets.py)
"""
from __future__ import annotations
import os

import cv2
import numpy as np

from common import has_alpha, small

# Delivery formats from media/key/design_requirements.png and design_brief.pdf (W, H, name)
FORMATS = [(1300, 780, "narwhal_nation_event_5x3"), (1080, 1920, "story_or_digital_easel_9x16"), (1080, 1350, "ig_feed_4x5"),
           (1080, 1080, "ig_feed_1x1"), (1920, 1080, "campus_tv_16x9")]

# Brand colours (sRGB). TNS red is the brief's red; the Gnarls set is filled in from the measured canonical stickers (calibrate.py
# prints the fitted centres; DECISIONS.md records them).
# Official values: media/key/gnarls_style_guide_2021.pdf p.2 ("Gnarls Character Usage").
BRAND = {"tns_red": (228, 42, 29), "black": (0, 0, 0), "white": (255, 255, 255)}  # Parsons Red, RGB 228 42 29
GNARLS_LAB = {  # name: (L*, a*, b*) centre from the guide's RGB, radius in Delta-E 76 (greys sit 15.4 apart, so radius 7 keeps them disjoint)
    "body_grey": ((65.5, -3.0, -7.0), 7),      # RGB 147 161 172, CMYK 45 30 26 0: main body
    "body_light": ((80.0, -1.0, -3.0), 7),     # RGB 193 199 203, CMYK 24 16 15 0: belly / highlight / tusk
    "glasses_brown": ((26.3, 21.0, 27.0), 12),  # RGB 100 48 22, CMYK 37 78 94 50: glasses frames
    "parsons_red": ((49.8, 68.0, 53.0), 15),    # RGB 228 42 29, PMS Parsons Red: tee
    "yellow_012": ((87.1, -2.0, 87.0), 15),     # RGB 255 215 0, PMS 012: secondary (sparkles, effects)
    "blue_279": ((58.0, 2.0, -47.0), 15),       # RGB 65 143 222, PMS 279: secondary (jeans, overalls)
}


def _lab(rgb):
    """sRGB uint8 (N,3) -> CIE L*a*b* float (OpenCV's 8-bit LAB rescaled to true units)."""
    lab = cv2.cvtColor(rgb.reshape(-1, 1, 3).astype(np.uint8), cv2.COLOR_RGB2LAB).reshape(-1, 3).astype(np.float32)
    lab[:, 0] *= 100 / 255; lab[:, 1:] -= 128
    return lab


def _opaque(rgba):
    m = rgba[..., 3] >= 128
    return rgba[..., :3][m] if m.any() else rgba[..., :3].reshape(-1, 3)


def g1_probe(rgba, path):
    from PIL import Image
    if path.lower().endswith(".heic"):
        import pillow_heif; pillow_heif.register_heif_opener()
    im = Image.open(path)
    H, W = rgba.shape[:2]
    frames = getattr(im, "n_frames", 1)
    exif = {}
    try:
        e = im.getexif()
        for tag, key in ((271, "make"), (272, "model"), (305, "software"), (306, "datetime")):
            if e.get(tag): exif[key] = str(e.get(tag)).strip("\x00 ")
    except Exception:
        pass
    fmt = None
    for fw, fh, name in FORMATS:
        if abs(W / H - fw / fh) / (fw / fh) < 0.01:
            fmt = name if (W, H) == (fw, fh) else name + "_ratio"
            break
    a = rgba[..., 3]
    return {"format": im.format, "mode": im.mode, "size": [W, H], "aspect": round(W / H, 4),
            "orientation": "portrait" if H > W * 1.02 else "landscape" if W > H * 1.02 else "square",
            "delivery_format": fmt, "bytes": os.path.getsize(path), "frames": frames, "dpi": im.info.get("dpi"),
            "alpha": has_alpha(rgba), "transparent_share": round(float((a < 128).mean()), 4),
            "semi_alpha_share": round(float(((a > 8) & (a < 247)).mean()), 4), "exif": exif}


def g3_color(rgba, path):
    s = small(rgba)
    px = _opaque(s)
    f = px.astype(np.float32)
    Y = 0.2126 * f[:, 0] + 0.7152 * f[:, 1] + 0.0722 * f[:, 2]
    mx, mn = f.max(1), f.min(1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    p1, p99 = np.percentile(Y, [1, 99])
    hsv = cv2.cvtColor(px.reshape(-1, 1, 3), cv2.COLOR_RGB2HSV).reshape(-1, 3).astype(np.float32)

    def hue(sel):
        if sel.sum() < 10: return [None, None]
        h = hsv[sel, 0] * 2 * np.pi / 180
        c, si = np.cos(h).mean(), np.sin(h).mean()
        return [round(float(np.degrees(np.arctan2(si, c)) % 360), 1), round(float(hsv[sel, 1].mean() / 255), 4)]
    lo, hi = Y <= np.percentile(Y, 20), Y >= np.percentile(Y, 80)
    lab = _lab(px)
    k = min(5, max(1, len(np.unique(px, axis=0))))
    crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5)
    _, lbl, C = cv2.kmeans(lab, k, None, crit, 2, cv2.KMEANS_PP_CENTERS)
    cnt = np.bincount(lbl.ravel(), minlength=k) / len(lbl)
    Cv = C.copy(); Cv[:, 0] *= 255 / 100; Cv[:, 1:] += 128
    rgb = cv2.cvtColor(np.clip(Cv, 0, 255).reshape(1, k, 3).astype(np.uint8), cv2.COLOR_LAB2RGB)[0]
    pal = [["#%02x%02x%02x" % tuple(int(v) for v in rgb[j]), round(float(cnt[j]), 4)] for j in np.argsort(-cnt)]
    brand = {}
    for name, c in BRAND.items():
        d = np.linalg.norm(lab - _lab(np.array([c], np.uint8))[0], axis=1)
        brand[name] = round(float((d < 15).mean()), 4)
    return {"luma": round(float(Y.mean()), 2), "rms_contrast": round(float(Y.std() / 255), 4), "saturation": round(float(sat.mean()), 4),
            "black_point": round(float(p1), 1), "white_point": round(float(p99), 1), "shadow_hue": hue(lo), "highlight_hue": hue(hi),
            "palette": pal, "brand_share": brand}


_reader = None


def g4_ocr(rgba, path):
    global _reader
    if _reader is None:
        import easyocr
        _reader = easyocr.Reader(["en"], gpu=True, verbose=False)
    H, W = rgba.shape[:2]
    rgb = rgba[..., :3].copy()
    rgb[rgba[..., 3] < 128] = 255  # transparent -> white so dark type on alpha reads
    rw = 1080 if max(H, W) > 1080 else W
    sc = W / rw
    img = cv2.resize(rgb, (rw, int(round(H / sc))), interpolation=cv2.INTER_AREA) if sc != 1 else rgb
    res = _reader.readtext(img, detail=1, paragraph=False, min_size=8, text_threshold=0.6)
    col_w = (1 - 2 * 0.091) / 12
    out = []
    for box, text, conf in res:
        xs, ys = [p[0] * sc for p in box], [p[1] * sc for p in box]
        x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
        cx, cy = (x0 + x1) / 2 / W, (y0 + y1) / 2 / H
        out.append({"text": text, "conf": round(float(conf), 3), "bbox": [round(x0, 1), round(y0, 1), round(x1, 1), round(y1, 1)],
                    "size_pct_h": round((y1 - y0) / H * 100, 2), "col12": int(np.clip((cx - 0.091) // col_w, 0, 11)) + 1,
                    "third": ["top", "middle", "bottom"][min(2, int(cy * 3))]})
    return {"blocks": out, "n": len(out), "text": " | ".join(b["text"] for b in out if b["conf"] >= 0.3)}


def outline_stroke(rgba):
    """Outline width of a cut-out: walk inward from the alpha edge along the distance transform; the outline is the run of
    pixels darker than the interior. Width = the inward depth (px) where luma first rises above the midpoint between the edge
    luma and the interior luma, measured as the median over all edge pixels whose inward ray is long enough."""
    a = (rgba[..., 3] >= 128).astype(np.uint8)
    if a.sum() < 400: return None
    dist = cv2.distanceTransform(a, cv2.DIST_L2, 5)
    Y = (0.2126 * rgba[..., 0] + 0.7152 * rgba[..., 1] + 0.0722 * rgba[..., 2]).astype(np.float32)
    maxd = float(dist.max())
    if maxd < 6: return None
    depths = np.arange(1, int(min(maxd * 0.6, 80)) + 1)
    prof = np.array([np.median(Y[(dist >= d - 0.5) & (dist < d + 0.5)]) if ((dist >= d - 0.5) & (dist < d + 0.5)).any() else np.nan for d in depths])
    if np.isnan(prof).all(): return None
    edge = float(np.nanmedian(prof[:2]))
    inner = float(np.nanmedian(prof[len(prof) // 2:]))
    if inner - edge < 25:  # no dark rim: unoutlined (photo cut-out) or a light outline
        return {"outlined": False, "edge_luma": round(edge, 1), "inner_luma": round(inner, 1)}
    mid = (edge + inner) / 2
    above = np.where(prof > mid)[0]
    # the distance transform is 1 on the outermost opaque pixel, so a k px rim spans depths 1..k and the first bright depth is k+1
    w = float(depths[above[0]] - 1) if len(above) else None
    ring = (dist >= 0.5) & (dist <= max(1.5, (w or 2) - 0.5))
    col = np.median(rgba[..., :3][ring], axis=0) if ring.any() else None
    return {"outlined": True, "width_px": w, "edge_luma": round(edge, 1), "inner_luma": round(inner, 1),
            "outline_rgb": "#%02x%02x%02x" % tuple(int(v) for v in col) if col is not None else None}


def g5_silhouette(rgba, path):
    if not has_alpha(rgba):
        return {"applicable": False}
    a = (rgba[..., 3] >= 128).astype(np.uint8)
    H, W = a.shape
    n, lab, st, cen = cv2.connectedComponentsWithStats(a, 8)
    areas = st[1:, cv2.CC_STAT_AREA] if n > 1 else np.array([0])
    big = [i + 1 for i, ar in enumerate(areas) if ar >= 0.01 * a.sum()]
    ys, xs = np.nonzero(a)
    if len(xs) == 0:
        return {"applicable": True, "empty": True}
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    bw, bh = x1 - x0 + 1, y1 - y0 + 1
    cnts, _ = cv2.findContours(a, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cnts, key=cv2.contourArea)
    hull = cv2.convexHull(c)
    solidity = cv2.contourArea(c) / max(1, cv2.contourArea(hull))
    per = cv2.arcLength(c, True)
    st_ = outline_stroke(rgba)
    if st_ and st_.get("width_px"):
        st_["width_pct_subject_h"] = round(st_["width_px"] / bh * 100, 3)
    # sticker border: a solid white (or near-uniform) rim around the subject = die-cut sticker treatment
    return {"applicable": True, "bbox": [int(x0), int(y0), int(x1), int(y1)], "bbox_pct": [round(x0 / W, 4), round(y0 / H, 4), round(x1 / W, 4), round(y1 / H, 4)],
            "subject_aspect_wh": round(bw / bh, 4), "fill_ratio": round(float(a[y0:y1 + 1, x0:x1 + 1].mean()), 4),
            "centroid_pct": [round(float(xs.mean() / W), 4), round(float(ys.mean() / H), 4)], "components": len(big),
            "solidity": round(float(solidity), 4), "compactness": round(float(4 * np.pi * cv2.contourArea(c) / max(per, 1) ** 2), 4),
            "margin_pct": [round(x0 / W, 4), round(y0 / H, 4), round((W - 1 - x1) / W, 4), round((H - 1 - y1) / H, 4)], "outline": st_}


def g6_hash(rgba, path):
    import imagehash
    from PIL import Image
    rgb = rgba[..., :3].copy()
    rgb[rgba[..., 3] < 128] = 255
    im = Image.fromarray(rgb)
    sig = cv2.resize(rgb, (16, 16), interpolation=cv2.INTER_AREA)
    return {"phash": str(imagehash.phash(im)), "dhash": str(imagehash.dhash(im)), "sig16": sig.reshape(-1, 3).mean(0).round(1).tolist()}


def g7_gnarls(rgba, path):
    """Share of opaque pixels within each official Gnarls colour (Delta-E radius). Measured at 360 px wide."""
    px = _opaque(small(rgba, 360))
    lab = _lab(px)
    out = {}
    for name, (c, r) in GNARLS_LAB.items():
        d = np.linalg.norm(lab - np.array(c, np.float32), axis=1)
        out[name] = round(float((d < r).mean()), 4)
    return out


def g8_psd(path):
    from psd_tools import PSDImage
    psd = PSDImage.open(path)

    def walk(layer, depth):
        rows = []
        for l in layer:
            r = {"d": depth, "name": l.name, "kind": l.kind, "visible": bool(l.visible), "opacity": int(l.opacity),
                 "blend": str(l.blend_mode).split(".")[-1], "bbox": list(l.bbox)}
            if l.kind == "type":
                try: r["text"] = l.text[:400]
                except Exception: pass
            if l.kind == "smartobject":
                try: r["smart"] = l.smart_object.filename
                except Exception: pass
            rows.append(r)
            if l.is_group():
                rows += walk(l, depth + 1)
        return rows
    layers = walk(psd, 0)
    return {"size": [psd.width, psd.height], "color_mode": str(psd.color_mode).split(".")[-1], "depth": psd.depth,
            "n_layers": len(layers), "layers": layers}


TOOLS = {"probe": g1_probe, "color": g3_color, "ocr": g4_ocr, "silhouette": g5_silhouette, "hash": g6_hash, "gnarls": g7_gnarls}
