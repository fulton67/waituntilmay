"""M14: phone / device mockups. Every frame at 270 px: closed contours approximated to a quadrilateral (approxPolyDP, 2% of the
perimeter) or a rounded rectangle (bounding-box fill >= 0.85), aspect (short/long side) 0.42-0.56, covering 2-70% of the frame,
with either a dark ring (bezel: mean luminance just outside < 0.7x inside) or a bright, low-texture screen inside a darker hand /
background. Per detection: the 4 corners (source px), area share (scale), angle of the long axis from vertical (deg), perspective
(ratio of the two short sides; 1 = flat-on), screen brightness and texture (std). Detections are tracked by IoU >= 0.4 into
elements with entry/exit and the entry trajectory (centre, scale, angle per frame) so M12 can fit the entry animation.
rows: one per frame = [element ids present]."""
import cv2
import numpy as np

from common import ANALYSIS_W, frames, run


def iou(a, b):
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = ix * iy
    u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / u if u > 0 else 0


def detect(f):
    g = cv2.cvtColor(f, cv2.COLOR_RGB2GRAY)
    H, W = g.shape
    e = cv2.dilate(cv2.Canny(g, 40, 120), np.ones((2, 2), np.uint8))
    cs, _ = cv2.findContours(e, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    out = []
    for c in cs:
        x, y, w, h = cv2.boundingRect(c)
        if w * h < 0.02 * H * W or w * h > 0.7 * H * W:
            continue
        rect = cv2.minAreaRect(c)
        (rw, rh) = rect[1]
        if min(rw, rh) == 0:
            continue
        asp = min(rw, rh) / max(rw, rh)
        if not 0.42 <= asp <= 0.56:
            continue
        approx = cv2.approxPolyDP(c, 0.02 * cv2.arcLength(c, True), True)
        fill = cv2.contourArea(c) / (w * h)
        if len(approx) != 4 and fill < 0.85:
            continue
        inner = g[y:y + h, x:x + w].astype(np.float32)
        ring = g[max(0, y - 4):min(H, y + h + 4), max(0, x - 4):min(W, x + w + 4)].astype(np.float32)
        ring_mean = (ring.sum() - inner.sum()) / max(1, ring.size - inner.size)
        bezel = ring_mean < 0.7 * inner.mean()
        bright_screen = inner.mean() > 150 and inner.std() < 45
        if not (bezel or bright_screen):
            continue
        box = cv2.boxPoints(rect)
        quad = approx.reshape(-1, 2) if len(approx) == 4 else box
        angle = rect[2] if rw < rh else rect[2] - 90
        q = quad[np.argsort(quad[:, 1])]
        top, bot = q[:2], q[2:]
        persp = float(np.linalg.norm(top[0] - top[1]) / max(1e-3, np.linalg.norm(bot[0] - bot[1])))
        out.append({"box": [x, y, x + w, y + h], "quad": quad.tolist(), "area_share": round(w * h / (H * W), 4), "angle_deg": round(float(angle), 2),
                    "perspective": round(persp, 3), "screen_luma": round(float(inner.mean()), 1), "screen_std": round(float(inner.std()), 1),
                    "bezel": bool(bezel)})
    return out


def m14(ref, vid, path, P):
    k = P["width"] / ANALYSIS_W
    els, active, rows = [], [], []
    for i, f in frames(path):
        present = []
        for d in detect(f):
            best = max(active, key=lambda e: iou(e["_last"], d["box"]), default=None)
            if best is None or iou(best["_last"], d["box"]) < 0.4 or best["track"][-1]["frame"] == i:
                best = {"id": len(els), "entry": i, "track": []}
                els.append(best); active.append(best)
            best["_last"] = d["box"]; best["exit"] = i
            d2 = dict(d)
            d2["bbox"] = [round(v * k, 1) for v in d.pop("box")]
            d2.pop("box", None)
            d2["quad"] = [[round(px * k, 1), round(py * k, 1)] for px, py in d["quad"]]
            d2["frame"] = i
            best["track"].append(d2)
            present.append(best["id"])
        active = [e for e in active if i - e["exit"] <= 3]
        rows.append(present)
    keep = [e for e in els if len(e["track"]) >= max(3, int(P["fps"] * 0.2))]
    for e in keep:
        e.pop("_last", None)
        e["frames"] = len(e["track"])
    ids = {e["id"] for e in keep}
    return {"elements": keep, "cols": ["element_ids"], "rows": [[x for x in r if x in ids] for r in rows]}


if __name__ == "__main__":
    run("mockups.json", m14)
