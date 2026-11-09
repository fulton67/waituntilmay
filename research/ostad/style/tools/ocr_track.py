"""M10: on-screen text, tracked. EasyOCR (GPU) text DETECTION on every 2nd frame (recognition cached per identical box crop); then on EVERY frame within +-5 of any change in the text
found (a text appearing, leaving, or changing); frames not read in either pass take the reading of the nearest read frame and are
marked "carried". Text is DETECTED at 360 px wide (portrait) / 640 px (landscape) and RECOGNISED from the 540 / 960 px frame
(measured: detection 0.067 s/frame at 360 vs 0.15 at 540 on the RTX 3050).
Readings are grouped into elements: same text (difflib ratio >= 0.7) at an overlapping place (IoU >= 0.2, or centre within 6% of
the frame width); an element ends after 3 frames unseen. Per element: id, text, entry and exit frame, bbox per frame (source px).
rows: one per frame = [source ("ocr" | "carried"), [element ids present]]."""
import difflib
import re

import numpy as np

from common import frames, run

_reader = None


def reader():
    global _reader
    if _reader is None:
        import easyocr
        _reader = easyocr.Reader(["en"], gpu=True, verbose=False)
    return _reader


def norm(t):
    return re.sub(r"[^a-z0-9]+", " ", t.lower()).strip()


_cache = {}


def read(img, k):
    """EasyOCR detection on the frame, then recognition only for boxes whose pixels were not already read: each box crop is
    keyed by a 16x8 grey thumbnail (quantised to 16 levels); an identical key reuses the cached text. Same output as readtext."""
    import cv2
    r = reader()
    dw = 360 if img.shape[0] >= img.shape[1] else 640
    ds = img.shape[1] / dw
    small = cv2.resize(img, (dw, int(round(img.shape[0] / ds))), interpolation=cv2.INTER_AREA)
    hl, fl = r.detect(small, min_size=6, text_threshold=0.6, low_text=0.35, canvas_size=max(small.shape[:2]))
    hl = [[b[0] * ds, b[1] * ds, b[2] * ds, b[3] * ds] for b in hl[0]]
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    out, todo = [], []
    for (x0, x1, y0, y1) in hl:
        x0, y0 = max(0, int(x0)), max(0, int(y0)); x1, y1 = min(img.shape[1], int(x1)), min(img.shape[0], int(y1))
        if x1 - x0 < 4 or y1 - y0 < 4:
            continue
        key = (cv2.resize(gray[y0:y1, x0:x1], (16, 8), interpolation=cv2.INTER_AREA) // 16).tobytes() + bytes([min(255, (x1 - x0) // 8)])
        if key in _cache:
            text, conf = _cache[key]
            if text is not None:
                out.append({"text": text, "bbox": [round(x0 * k, 1), round(y0 * k, 1), round(x1 * k, 1), round(y1 * k, 1)], "conf": conf})
        else:
            todo.append((key, [x0, x1, y0, y1]))
    if todo:
        res = r.recognize(gray, horizontal_list=[t[1] for t in todo], free_list=[], detail=1, paragraph=False)
        got = {}
        for box, text, conf in res:
            xs, ys = [p[0] for p in box], [p[1] for p in box]
            got[(int(min(xs)), int(min(ys)))] = (text, float(conf))
        for key, (x0, x1, y0, y1) in todo:
            text, conf = got.get((x0, y0), (None, 0.0))
            ok = text is not None and conf >= 0.35 and norm(text)
            _cache[key] = (text, round(conf, 3)) if ok else (None, 0.0)
            if ok:
                out.append({"text": text, "bbox": [round(x0 * k, 1), round(y0 * k, 1), round(x1 * k, 1), round(y1 * k, 1)], "conf": round(conf, 3)})
        if len(_cache) > 200000:
            _cache.clear()
    return out


def sig(dets):
    return tuple(sorted(norm(d["text"]) for d in dets))


def iou(a, b):
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = ix * iy
    u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / u if u > 0 else 0


def m10(ref, vid, path, P):
    W = 540 if P["height"] >= P["width"] else 960
    k = P["width"] / W
    n = P["frame_count"]
    readings = {}
    # pass A: every 2nd frame
    for i, f in frames(path, width=W):
        if i % 2 == 0:
            readings[i] = read(f, k)
    # pass B: every frame within +-5 of a change between consecutive pass-A readings
    keys = sorted(readings)
    need = set()
    for a, b in zip(keys[:-1], keys[1:]):
        if sig(readings[a]) != sig(readings[b]):
            need.update(range(max(0, a - 5), min(n, b + 6)))
    need -= set(readings)
    if need:
        for i, f in frames(path, width=W):
            if i in need:
                readings[i] = read(f, k)
    # per-frame readings (carry the nearest read frame where unread)
    read_idx = np.array(sorted(readings))
    per, src = [], []
    for i in range(n):
        if i in readings:
            per.append(readings[i]); src.append("ocr")
        else:
            j = int(read_idx[np.argmin(np.abs(read_idx - i))]) if len(read_idx) else None
            per.append(readings.get(j, [])); src.append("carried")
    # group into elements
    els, active, rows = [], [], []
    for i in range(n):
        present = []
        for d in per[i]:
            t = norm(d["text"]); best = None
            for e in active:
                if difflib.SequenceMatcher(None, t, e["key"]).ratio() >= 0.7:
                    lb = e["track"][-1]["bbox"]
                    cx = abs((lb[0] + lb[2]) - (d["bbox"][0] + d["bbox"][2])) / 2
                    cy = abs((lb[1] + lb[3]) - (d["bbox"][1] + d["bbox"][3])) / 2
                    if iou(lb, d["bbox"]) >= 0.2 or max(cx, cy) <= 0.06 * P["width"]:
                        best = e; break
            if best is None:
                best = {"id": len(els), "key": t, "text": d["text"], "entry": i, "track": [], "last": i}
                els.append(best); active.append(best)
            if best["track"] and best["track"][-1]["frame"] == i:
                continue
            best["track"].append({"frame": i, "bbox": d["bbox"], "text": d["text"], "conf": d["conf"]})
            best["last"] = i; present.append(best["id"])
        active = [e for e in active if i - e["last"] <= 3]
        rows.append([src[i], present])
    for e in els:
        e["exit"] = e.pop("last"); e.pop("key")
        e["frames"] = len(e["track"])
        e["text"] = max((t["text"] for t in e["track"]), key=lambda s: len(s))
    return {"read_width": W, "ocr_frames": int(sum(s == "ocr" for s in src)), "carried_frames": int(sum(s == "carried" for s in src)),
            "elements": els, "cols": ["source", "element_ids"], "rows": rows}


if __name__ == "__main__":
    run("text_elements.json", m10)
