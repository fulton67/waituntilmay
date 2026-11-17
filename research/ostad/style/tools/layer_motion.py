"""layer_motion.py: pixel-level motion audit of a v6 render against its empty room (no element tracker needed).

Graphic zone = right of the keyed presenter and above the caption band (x >= 740, y < 940 at 1920x1080). Per frame, at 480x270:
  G_t = max-channel |frame_t - room|, room = frame 0 (only the cream room is right of him before the B01 wordmark starts at f3;
        the room's own drift is 2.5 px on a smooth gradient, measured < 2 grey levels).
  pop-in pixel   : G_{t-1} < 0.15 * Gref and G_t >= 0.8 * Gref, Gref = G_{t+6} >= 25   (it went from absent to full in one frame)
  cut-out pixel  : G_{t-1} >= 0.8 * Gref and G_t < 0.15 * Gref, Gref = G_{t-7} >= 25   (it went from held to absent in one frame)
  An animated entry/exit on arrive (14 f) / exit (7 f) never passes 0.15 -> 0.8 in one frame; a 1-frame pop or cut does.
  Events = runs of frames whose pop-in / cut-out area >= 0.25 % of the zone.
Beat-line exits: the pixels lit (G >= 25) 20 f before a beat's last frame are followed to the beat line: r(t) = their mean G / its value
  at e-20. exit_start = last frame with r >= 0.95, exit_end = first frame with r <= 0.10, largest one-frame drop of r (1.0 = a cut).
Image life: full-res grey crop of each image layer (beats.json image_layers + the three footage windows); change over a 12-frame gap,
  per frame. Frozen = 12-f change < 0.10 grey levels (5x the crf-16 still noise of 0.02, lint_compositions calibration; a 1 % zoom
  over 48 f measures 1.56 there). Reports the share of the layer's life that moves and the longest frozen run.
Word onsets: brand/edits/exomind-skin/yt_words.json (seconds on the 1.15x edit) x 24.

Run: C:/Users/naimj/tools/style-venv/Scripts/python.exe -I tools/layer_motion.py <render.mp4> <out.json>   (from research/ostad/style)
"""
import json
import os
import sys

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
STYLE = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(os.path.dirname(STYLE)))
sys.path.insert(0, HERE)
from common import frames  # noqa: E402

K = 4  # 1920 / 480
ZX, ZY = 740 // K, 940 // K


def word_onsets():
    w = json.load(open(os.path.join(REPO, "brand", "edits", "exomind-skin", "yt_words.json"), encoding="utf-8"))
    return np.array(sorted({int(round(t * 24)) for line in w for t in line}))


def nearest(onsets, f):
    """signed f - onset for the nearest onset at or before f+6 (a reveal is meant to sit at onset + 1)"""
    cand = onsets[onsets <= f + 6]
    if not len(cand):
        return None
    return int(f - cand[-1])


def main():
    path, out = sys.argv[1], sys.argv[2]
    beats = json.load(open(os.path.join(STYLE, "exomind", "beats.json"), encoding="utf-8"))
    B = beats["beats"]
    beat_of = lambda f: next((b["id"] for b in B if b["start_f"] <= f <= b["end_f"]), "end")
    on = word_onsets()

    G = []
    room = None
    for i, f in frames(path, width=480):
        z = f[:ZY, ZX:].astype(np.int16)
        if room is None:
            room = z.copy()
        G.append(np.abs(z - room).max(2).astype(np.uint8))
    G = np.stack(G).astype(np.float32)
    n = len(G)
    area = G[0].size
    pop = np.zeros(n); cut = np.zeros(n)
    for t in range(1, n):
        if t + 6 < n:
            ref = G[t + 6]
            m = (ref >= 25) & (G[t - 1] < 0.15 * ref) & (G[t] >= 0.8 * ref)
            pop[t] = m.sum() / area
        if t - 7 >= 0:
            ref = G[t - 7]
            m = (ref >= 25) & (G[t - 1] >= 0.8 * ref) & (G[t] < 0.15 * ref)
            cut[t] = m.sum() / area
    activity = (G >= 25).mean((1, 2))

    def events(x, th=0.0025):
        ev, t = [], 0
        while t < n:
            if x[t] >= th:
                s = t
                while t < n and x[t] >= th:
                    t += 1
                pk = int(s + np.argmax(x[s:t]))
                ev.append({"f": s, "frames": t - s, "area_pct": round(float(x[s:t].max() * 100), 2), "beat": beat_of(s),
                           "f_minus_word": nearest(on, s)})
            t += 1
        return ev

    # beat-line exits
    exits = []
    for b in B + [{"id": "end", "start_f": beats["cards"][-1]["start_f"], "end_f": n - 1}]:
        e = b["end_f"]
        if e - 20 < 0 or e >= n:
            continue
        m = G[e - 20] >= 25
        if m.sum() < 0.002 * area:
            exits.append({"beat": b["id"], "end_f": e, "lit_pct": round(float(m.mean() * 100), 2), "note": "nothing held"})
            continue
        base = G[e - 20][m].mean()
        r = np.array([G[t][m].mean() / base for t in range(e - 20, min(n, e + 2))])
        hi = [i for i in range(len(r)) if r[i] >= 0.95]
        lo = [i for i in range(len(r)) if r[i] <= 0.10]
        s0 = hi[-1] if hi else 0
        s1 = next((i for i in lo if i > s0), None)
        drop = float(np.max(r[:-1] - r[1:])) if len(r) > 1 else 0.0
        exits.append({"beat": b["id"], "end_f": e, "lit_pct": round(float(m.mean() * 100), 2),
                      "r_at_end": round(float(r[20]), 2) if len(r) > 20 else None,
                      "exit_start_f": e - 20 + s0, "exit_frames": (s1 - s0) if s1 is not None else None,
                      "max_one_frame_drop": round(drop, 2)})

    # image life (full res, sequential)
    layers = []
    for b in B:
        for L in b.get("image_layers", []):
            layers.append({"beat": b["id"], "asset": L["asset"], "box": L["box"], "f0": L["from_f"] + 14, "f1": L["to_f"] - 7})
    S = {b["id"]: b["start_f"] for b in B}
    layers += [
        {"beat": "B02", "asset": "unit_cut (plate, 18 f in)", "box": [1180, 120, 560, 720], "f0": S["B02"] + 19 + 18, "f1": S["B02"] + 46},
        {"beat": "B04", "asset": "consult_wide.mp4 (morph window)", "box": [1100, 80, 660, 800], "f0": S["B04"] + 30 + 14, "f1": S["B04"] + 143},
        {"beat": "B11", "asset": "office_team.mp4 (window)", "box": [1100, 80, 660, 800], "f0": S["B11"] + 1 + 14, "f1": S["B11"] + 91},
        {"beat": "B20", "asset": "p0001_quiet.mp4 (card)", "box": [740, 90, 520, 660], "f0": S["B20"] + 1 + 14, "f1": S["B20"] + 97},
    ]
    GAP = 12
    cap = cv2.VideoCapture(path)
    buf, i = {}, 0
    ch = {k: [] for k in range(len(layers))}
    while True:
        ok, im = cap.read()
        if not ok:
            break
        g = None
        for k, L in enumerate(layers):
            if L["f0"] - GAP <= i <= L["f1"]:
                if g is None:
                    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
                x, y, w, h = L["box"]
                c = g[y:y + h, x:x + w]
                buf.setdefault(k, {})[i] = c
                if i - GAP in buf[k]:
                    if i >= L["f0"]:
                        ch[k].append((i, float(np.mean(np.abs(c - buf[k][i - GAP])))))
                    del buf[k][i - GAP]
        i += 1
    cap.release()
    img = []
    for k, L in enumerate(layers):
        v = np.array([c for _, c in ch[k]])
        fr = [f for f, _ in ch[k]]
        frozen = v < 0.10
        run = best = 0
        for x in frozen:
            run = run + 1 if x else 0
            best = max(best, run)
        img.append({**L, "life_f": len(v), "moving_share": round(float((~frozen).mean()), 3) if len(v) else None,
                    "longest_frozen_f": int(best), "median_12f_change": round(float(np.median(v)), 3) if len(v) else None,
                    "min_12f_change": round(float(v.min()), 3) if len(v) else None})

    json.dump({"render": os.path.basename(path), "frames": n, "zone": [740, 0, 1920, 940],
               "pop_in_events": events(pop), "cut_out_events": events(cut), "beat_line_exits": exits, "image_life": img,
               "activity_lit_pct": [round(float(a * 100), 2) for a in activity]}, open(out, "w"), indent=1)
    print("pop-in", len(events(pop)), "cut-out", len(events(cut)))


if __name__ == "__main__":
    main()
