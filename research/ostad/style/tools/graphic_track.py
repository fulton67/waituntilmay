"""M11: non-text overlays (image cards, chips, badges, stickers, panels, phone mockups), detected per frame and tracked.

Detection, at 270 px wide, every frame, two cues combined:
  (a) contour: Canny edges -> closed contours -> polygon approx; keep shapes covering 0.4-70% of the frame whose fill of their
      bounding box is >= 0.80 (rectangles and rounded rectangles) and whose border is crisp (mean edge strength along the contour
      >= 2x the frame's median gradient). Overlays have engineered, crisp edges; footage rarely does.
  (b) stillness against motion: within a shot, pixels that stay within 3 levels over the last 0.5 s while the frame as a whole
      changes (median |diff| > 2): connected components >= 0.4% of the frame. Catches graphics held still over moving footage.
Boxes from (a) and (b) are merged (IoU >= 0.5) and tracked across frames by IoU >= 0.4; an element ends after 3 frames unseen.
Per element and frame: bbox (source px), opacity estimate and kind.
  opacity: mean |frame - background| inside the bbox divided by the element's settled value (median over the middle of its life);
           background = the same region in the last frame before entry. 0..1 (clipped at 1.5 to show overshoot of brightness).
  kind:    "image_card" (rect, high colour variance inside: a photo), "panel" (rect, low variance), "phone" (aspect 0.42-0.56,
           dark ring), "shape" (other). M13 measures image cards; M14 phones.
Each element is flagged mid_shot_entry / mid_shot_exit (appears / leaves > 2 frames away from a cut or the video's ends). Elements
that span their whole shot are usually scenery (shelves, doors, windows) or a persistent watermark; readers filter on the flags.
Opacity is measured only for elements with a mid-shot entry or exit (the animated ones).
rows: one per frame = [element ids present]."""
from collections import deque

import cv2
import numpy as np

from common import ANALYSIS_W, cuts_frames, frames, run


def iou(a, b):
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = ix * iy
    u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / u if u > 0 else 0


def contour_boxes(g):
    H, W = g.shape
    area = H * W
    gx, gy = cv2.Sobel(g, cv2.CV_32F, 1, 0), cv2.Sobel(g, cv2.CV_32F, 0, 1)
    mag = cv2.magnitude(gx, gy)
    med = float(np.median(mag)) + 1e-3
    e = cv2.Canny(g, 40, 120)
    e = cv2.dilate(e, np.ones((2, 2), np.uint8))
    cs, _ = cv2.findContours(e, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    out = []
    for c in cs:
        x, y, w, h = cv2.boundingRect(c)
        a = w * h
        if not (0.004 * area <= a <= 0.7 * area) or w < 12 or h < 12:
            continue
        if cv2.contourArea(c) / a < 0.80:
            continue
        pts = c.reshape(-1, 2)
        strength = float(mag[pts[:, 1].clip(0, H - 1), pts[:, 0].clip(0, W - 1)].mean())
        if strength < 2 * med:
            continue
        out.append([x, y, x + w, y + h])
    return out


def still_boxes(hist, g):
    if len(hist) < hist.maxlen:
        return []
    stack = np.stack(list(hist) + [g]).astype(np.int16)
    frame_change = float(np.median(np.abs(stack[-1] - stack[0])))
    if frame_change <= 2:
        return []
    still = (stack.max(0) - stack.min(0) <= 3).astype(np.uint8)
    still = cv2.morphologyEx(still, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(still)
    H, W = g.shape
    return [[int(x), int(y), int(x + w), int(y + h)] for x, y, w, h, a in st[1:] if a >= 0.004 * H * W and w >= 10 and h >= 10]


def kind_of(rgb, box):
    x0, y0, x1, y1 = box
    patch = rgb[y0:y1, x0:x1]
    if patch.size == 0:
        return "shape"
    w, h = x1 - x0, y1 - y0
    var = float(patch.reshape(-1, 3).std(0).mean())
    if 0.42 <= w / max(1, h) <= 0.56:
        H, W = rgb.shape[:2]
        ring = rgb[max(0, y0 - 3):min(H, y1 + 3), max(0, x0 - 3):min(W, x1 + 3)].astype(np.float32).mean()
        inner = patch.astype(np.float32).mean()
        if ring < inner * 0.7:
            return "phone"
    return "image_card" if var >= 28 else "panel"


def m11(ref, vid, path, P):
    k = P["width"] / ANALYSIS_W
    fps = P["fps"]
    cuts = set(cuts_frames(ref, vid))
    hist = deque(maxlen=max(2, int(round(fps / 2))))
    els, active, rows = [], [], []
    for i, f in frames(path):
        g = cv2.cvtColor(f, cv2.COLOR_RGB2GRAY)
        if i in cuts:
            hist.clear()
        boxes = contour_boxes(g)
        for b in still_boxes(hist, g):
            if not any(iou(b, c) >= 0.5 for c in boxes):
                boxes.append(b)
        hist.append(g)
        present = []
        for b in boxes:
            best = max(active, key=lambda e: iou(e["track"][-1]["_b"], b), default=None)
            if best is None or iou(best["track"][-1]["_b"], b) < 0.4 or best["track"][-1]["frame"] == i:
                best = {"id": len(els), "entry": i, "track": [], "last": i, "kinds": []}
                els.append(best); active.append(best)
            best["track"].append({"frame": i, "_b": b, "bbox": [round(v * k, 1) for v in b]})
            best["kinds"].append(kind_of(f, b))
            best["last"] = i; present.append(best["id"])
        active = [e for e in active if i - e["last"] <= 3]
        rows.append(present)
    # opacity: need the frames again (background before entry + per-frame region difference)
    keep = [e for e in els if len(e["track"]) >= max(3, int(fps * 0.2))]
    bounds = sorted({0, *cuts, P["frame_count"]})
    for e in keep:
        sa = max(b for b in bounds if b <= e["entry"]); sz = min(b for b in bounds if b > e["last"]) - 1 if any(b > e["last"] for b in bounds) else P["frame_count"] - 1
        e["mid_shot_entry"] = e["entry"] - sa > 2
        e["mid_shot_exit"] = sz - e["last"] > 2
    want = {}
    for e in keep:
        if not (e["mid_shot_entry"] or e["mid_shot_exit"]):
            continue
        want.setdefault(max(0, e["entry"] - 1), []).append(("bg", e))
        for t in e["track"]:
            want.setdefault(t["frame"], []).append(("fg", e, t))
    bgs = {}
    for i, f in frames(path):
        for item in want.get(i, []):
            if item[0] == "bg":
                bgs[item[1]["id"]] = f.astype(np.int16)
        for item in want.get(i, []):
            if item[0] == "fg":
                e, t = item[1], item[2]
                bg = bgs.get(e["id"])
                x0, y0, x1, y1 = t["_b"]
                t["_d"] = float(np.abs(f[y0:y1, x0:x1].astype(np.int16) - bg[y0:y1, x0:x1]).mean()) if bg is not None and x1 > x0 and y1 > y0 else None
    out = []
    for e in keep:
        ds = [t.get("_d") for t in e["track"]]
        mid = [d for d in ds[len(ds) // 4: max(len(ds) // 4 + 1, 3 * len(ds) // 4)] if d is not None]
        settled = float(np.median(mid)) if mid else None
        track = []
        for t, d in zip(e["track"], ds):
            op = round(min(1.5, d / settled), 3) if (d is not None and settled) else None
            track.append({"frame": t["frame"], "bbox": t["bbox"], "opacity": op})
        kind = max(set(e["kinds"]), key=e["kinds"].count)
        out.append({"id": e["id"], "kind": kind, "entry": e["entry"], "exit": e["last"], "frames": len(track),
                    "mid_shot_entry": e["mid_shot_entry"], "mid_shot_exit": e["mid_shot_exit"], "track": track})
    ids = {e["id"] for e in keep}
    return {"detect_width": ANALYSIS_W, "elements": out, "cols": ["element_ids"], "rows": [[x for x in r if x in ids] for r in rows]}


if __name__ == "__main__":
    run("graphic_elements.json", m11)
