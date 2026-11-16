"""Reading boards for a whole reference: per video, one tile at every hard cut (+3 frames) and one every second inside each shot,
so builds inside a scene are visible too (Evident animates inside one shot; its 'dissolves' are animation steps). Frame number and
time burned in; the words spoken in each second go to a sidecar .txt. Boards of 50 tiles (10 x 5), sized for one look each.
Usage: python -I tools/run.py shot_boards --ref evident_yt   -> sheets/<ref>_shots/<vid>_<n>.jpg + <vid>.txt"""
import os, sys
import cv2
import numpy as np
from common import MEASURE, STYLE, corpus, load_json

a = sys.argv[1:]
REF = a[a.index("--ref") + 1]
OUT = os.path.join(STYLE, "sheets", f"{REF}_shots")
os.makedirs(OUT, exist_ok=True)
TW, TH, COLS, ROWS = 150, 267, 10, 5

for ref, vid, path in corpus("video"):
    if ref != REF: continue
    m = os.path.join(MEASURE, ref, vid)
    fr, cuts, tr = load_json(f"{m}/frames.json"), load_json(f"{m}/cuts.json"), load_json(f"{m}/transcript.json", {})
    if not fr or not cuts: print("skip (no M1/M3)", vid); continue
    fps, n = fr["fps"], fr["frame_count"]
    bounds = [0] + sorted(c["frame"] for c in cuts["hard"]) + [n]
    want = {}
    for s, e in zip(bounds, bounds[1:]):
        want[min(s + 3, e - 1)] = "cut"
        t = s + int(fps)
        while t < e - int(fps * 0.4):
            want.setdefault(t, ""); t += int(fps)
    cap, idx, tiles = cv2.VideoCapture(path), 0, []
    if os.path.exists(os.path.join(OUT, f"{vid}_1.jpg")):  # boards already built: only refresh the words sidecar
        cap.release(); tiles = [None] * len(want); want = {}
    while want:
        ok, img = cap.read()
        if not ok: break
        if idx in want:
            h, w = img.shape[:2]
            s = min(TW / w, TH / h)
            t = cv2.resize(img, (int(w * s), int(h * s)), interpolation=cv2.INTER_AREA)
            tile = np.full((TH, TW, 3), 255, np.uint8)
            tile[(TH - t.shape[0]) // 2:(TH - t.shape[0]) // 2 + t.shape[0], (TW - t.shape[1]) // 2:(TW - t.shape[1]) // 2 + t.shape[1]] = t
            lab = f"{idx} {idx / fps:.1f}s" + (" CUT" if want[idx] == "cut" else "")
            cv2.rectangle(tile, (0, 0), (TW, 16), (0, 0, 200) if want[idx] == "cut" else (0, 0, 0), -1)
            cv2.putText(tile, lab, (3, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1, cv2.LINE_AA)
            tiles.append(tile)
        idx += 1
    cap.release()
    per = COLS * ROWS
    for b in range(0, len(tiles), per) if all(t is not None for t in tiles) else []:
        chunk = tiles[b:b + per] + [np.full((TH, TW, 3), 240, np.uint8)] * (per - len(tiles[b:b + per]))
        board = np.vstack([np.hstack(chunk[r * COLS:(r + 1) * COLS]) for r in range(ROWS)])
        cv2.imwrite(os.path.join(OUT, f"{vid}_{b // per + 1}.jpg"), board, [cv2.IMWRITE_JPEG_QUALITY, 88])
    words = tr.get("words") or []
    lines = []
    for sec in range(int(n / fps) + 1):
        ws = " ".join(w["word"].strip() for w in words if sec <= w["start"] < sec + 1)
        if ws: lines.append(f"{sec:4d}s  {ws}")
    open(os.path.join(OUT, f"{vid}.txt"), "w", encoding="utf8").write(
        f"{vid}  {n} frames  {fps} fps  {len(bounds) - 2} hard cuts  {len(tiles)} tiles\n" + "\n".join(lines) + "\n")
    print(f"[shot_boards] {ref}/{vid} {len(tiles)} tiles, {(len(tiles) + per - 1) // per} boards", flush=True)
