"""Still study for feed posts (brand/posts/STILL_STUDY.md). For each still: M21 (still_image.m21: M7 luma/contrast/sat, M8 tone, M9
palette, M13 cards, OCR text blocks) plus four probes:

  layer    : share of the tile that is text (OCR boxes), empty (32 px blocks with luma std < 6 that hold no text) and photo (the rest);
             words per tile; type size = OCR box height / tile width (median, max); where type sits (thirds x left/centre/right)
  light    : key direction = angle from the tile centre to the centroid of the brightest 10 % of a 31 px-blurred luma map (0 deg = right,
             90 = down); key ratio = p95 / p5 luma; warmth = mean Lab b* (yellow +, blue -); softness = mean gradient magnitude of the
             blurred luma (low = soft light)
  material : for every M13 card (glass / panel candidates): inside vs outside sharpness (Laplacian variance ratio; < 0.35 reads as
             frosted / blurred glass), tint = mean RGB inside minus a 24 px ring outside, rim = border band contrast and which edge is
             brightest (the highlight side), shadow depth + blur from M13
  edge     : photo edge treatment: full bleed (photo pixels touch all 4 sides), inset (a flat margin on >= 2 sides), split (one flat band)

usage: python still_study.py <out.json> <dir-or-glob> [...]"""
import glob, json, os, sys
import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from still_image import m21  # noqa: E402


def probes(path, M):
    im = cv2.imread(path)
    if im is None:
        from PIL import Image
        im = cv2.cvtColor(np.array(Image.open(path).convert("RGB")), cv2.COLOR_RGB2BGR)
    H, W = im.shape[:2]
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
    text = np.zeros((H, W), bool)
    words = 0
    sizes = []
    pos = []
    for b in M["text_blocks"]:
        x0, y0, x1, y1 = [int(v) for v in b["bbox"]]
        text[max(0, y0):y1, max(0, x0):x1] = True
        words += max(1, len(str(b.get("text", "")).split()))
        sizes.append((y1 - y0) / W)
        cx, cy = (x0 + x1) / 2 / W, (y0 + y1) / 2 / H
        pos.append(["top", "middle", "bottom"][min(2, int(cy * 3))] + "-" + ["left", "centre", "right"][min(2, int(cx * 3))])
    B = 32
    flat = np.zeros((H, W), bool)
    for y in range(0, H - B + 1, B):
        for x in range(0, W - B + 1, B):
            if g[y:y + B, x:x + B].std() < 6:
                flat[y:y + B, x:x + B] = True
    empty = flat & ~text
    photo = ~(flat | text)
    # light
    sm = cv2.GaussianBlur(cv2.resize(g, (270, int(270 * H / W))), (31, 31), 0)
    thr = np.percentile(sm, 90)
    ys, xs = np.nonzero(sm >= thr)
    cx, cy = sm.shape[1] / 2, sm.shape[0] / 2
    ang = float(np.degrees(np.arctan2(ys.mean() - cy, xs.mean() - cx))) if len(xs) else None
    off = float(np.hypot(ys.mean() - cy, xs.mean() - cx) / max(cx, cy)) if len(xs) else 0
    lab = cv2.cvtColor(im, cv2.COLOR_BGR2LAB).astype(np.float32)
    gx, gy = cv2.Sobel(sm, cv2.CV_32F, 1, 0), cv2.Sobel(sm, cv2.CV_32F, 0, 1)
    light = {"key_dir_deg": round(ang, 1) if ang is not None else None, "key_offset": round(off, 2),
             "key_ratio": round(float((np.percentile(g, 95) + 1) / (np.percentile(g, 5) + 1)), 2),
             "warmth_b": round(float(lab[..., 2].mean() - 128), 1), "softness_grad": round(float(np.hypot(gx, gy).mean()), 2)}
    # material: every card
    mats = []
    lap = cv2.Laplacian(g, cv2.CV_32F)
    for c in M.get("cards", []):
        x0, y0, x1, y1 = [int(v) for v in c["bbox_px"]]
        if (x1 - x0) * (y1 - y0) < 0.01 * W * H:
            continue
        ins = lap[y0 + 8:y1 - 8, x0 + 8:x1 - 8]
        r = 24
        ring = np.zeros((H, W), bool)
        ring[max(0, y0 - r):min(H, y1 + r), max(0, x0 - r):min(W, x1 + r)] = True
        ring[y0:y1, x0:x1] = False
        out_var = float(lap[ring].var()) if ring.any() else 1.0
        tint = (im[y0 + 8:y1 - 8, x0 + 8:x1 - 8].reshape(-1, 3).mean(0) - im[ring].reshape(-1, 3).mean(0))[::-1] if ring.any() else [0, 0, 0]
        edges = {"top": g[y0:y0 + 3, x0:x1].mean(), "bottom": g[y1 - 3:y1, x0:x1].mean(), "left": g[y0:y1, x0:x0 + 3].mean(), "right": g[y0:y1, x1 - 3:x1].mean()}
        mats.append({"bbox_pct": [round(x0 / W * 100, 1), round(y0 / H * 100, 1), round(x1 / W * 100, 1), round(y1 / H * 100, 1)],
                     "radius_pct_w": c.get("corner_radius", {}).get("median_pct_w") if isinstance(c.get("corner_radius"), dict) else None,
                     "sharp_ratio": round(float(ins.var()) / (out_var + 1e-6), 3) if ins.size else None,
                     "tint_rgb": [round(float(v), 1) for v in tint], "highlight_edge": max(edges, key=edges.get),
                     "rim": c.get("border"), "shadow": c.get("shadow")})
    # edge treatment
    sides = {"top": flat[:B].mean(), "bottom": flat[-B:].mean(), "left": flat[:, :B].mean(), "right": flat[:, -B:].mean()}
    flats = [k for k, v in sides.items() if v > 0.85]
    edge = "full-bleed" if not flats else ("inset" if len(flats) >= 2 else "split-" + flats[0])
    rows = flat.mean(1)
    if edge == "full-bleed" and (rows > 0.9).sum() > 0.2 * H:
        edge = "split-band"
    return {"layer": {"text_share": round(float(text.mean()), 3), "empty_share": round(float(empty.mean()), 3), "photo_share": round(float(photo.mean()), 3),
                      "words": words, "type_h_over_w_median": round(float(np.median(sizes)), 4) if sizes else None,
                      "type_h_over_w_max": round(float(max(sizes)), 4) if sizes else None, "type_positions": pos},
            "light": light, "material": mats, "edge": edge,
            "stats": M["stats"], "palette": M["palette"][:5] if isinstance(M["palette"], list) else M["palette"]}


def main():
    out, pats = sys.argv[1], sys.argv[2:]
    files = []
    for p in pats:
        files += sorted(glob.glob(os.path.join(p, "*.*"))) if os.path.isdir(p) else sorted(glob.glob(p))
    files = [f for f in files if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))]
    res = json.load(open(out)) if os.path.exists(out) else {}
    for f in files:
        k = os.path.relpath(f).replace("\\", "/")
        if k in res:
            continue
        try:
            M = m21(None, None, f, {"path": f})
            res[k] = probes(f, M)
            print("ok", k, flush=True)
        except Exception as e:
            print("FAIL", k, type(e).__name__, e, flush=True)
        json.dump(res, open(out, "w"), indent=1, default=float)
    print("done", len(res))


if __name__ == "__main__":
    main()
