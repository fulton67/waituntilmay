"""Measure the YouTube v5 render from decoded frames (PROCESS.md section 5; DECISIONS 14f).

python -I verify_v5.py <render.mp4> <props_yt.json>  ->  prints a report and writes verify_v5.json next to this script.

- captions: for every caption word, the frame of the largest change in the caption band within +/-3 f of its onset frame
  (round(onset * 24)); offset = measured - onset frame (the caption code cuts each word on at its onset frame).
- animations: one probe per new v5 graphic. A probe is a rect plus a metric:
    ice  = share of pixels within 18 levels of the highlighter #c4e4f8 (sweeps, row wipes: progress = block width)
    blue = share of pixels within 40 levels of brand blue #37a9e8 (the L03 ring)
    diff = mean abs difference against the frame 4 before the onset (arrivals, typing, dims, cuts)
    edge = the morph card's left edge on row y=500 (dark footage vs light canvas), as progress 0..1
  The first frame the metric passes 10 % of its plateau and the frame it passes 90 % are compared with the same crossings of
  the token curve started at onset + 1 f (MOTION.md tokens), so 'start' and 'span' errors are in frames.
- canvas: HSV hue and saturation of room-canvas patches (v4 range: hue 212-216 deg, sat ~0.05).
- flashes: frames that differ from both neighbours while the neighbours match each other (a one-frame flash).
"""
import json, os, sys
import cv2, numpy as np

src, props = sys.argv[1], sys.argv[2]
spec = json.load(open(props, encoding="utf8"))["spec"]
FPS = 24

def bez(x1, y1, x2, y2):
    def f(x):
        if x <= 0: return 0.0
        if x >= 1: return 1.0
        lo, hi = 0.0, 1.0
        for _ in range(40):
            m = (lo + hi) / 2
            bx = 3 * (1 - m) ** 2 * m * x1 + 3 * (1 - m) * m * m * x2 + m ** 3
            lo, hi = (m, hi) if bx < x else (lo, m)
        return 3 * (1 - m) ** 2 * m * y1 + 3 * (1 - m) * m * m * y2 + m ** 3
    return f
CURVE = {"sweep": bez(.6, 0, .25, 1), "arrive": bez(.22, 1, .36, 1), "swap": bez(.16, 1, .3, 1), "plate": bez(.15, 0, .25, 1),
         "morph": bez(.66, 0, .25, 1), "blank": bez(.76, 0, .24, 1), "linear": lambda x: max(0, min(1, x)), "cut": lambda x: 1.0 if x >= 0 else 0.0}

def predicted(start, dur, token):
    """frames where the token's progress first reaches 0.1 and 0.9, Remotion-style: value at frame f = curve((f - start) / dur)"""
    c = CURVE[token]
    if token == "cut": return start, start
    a = next(f for f in range(start - 2, start + dur + 5) if c((f - start) / dur) >= 0.1)
    b = next(f for f in range(start - 2, start + dur + 5) if c((f - start) / dur) >= 0.9)
    return a, b

def fr(t): return int(round(t * FPS))

# ---------------- probes: (name, library entry, trigger word, onset s, rect x0,y0,x1,y1, metric, token, duration f, delay f after onset+1)
P = [
    ("s1 Exomind highlighter", "L01", "Exomind", 5.18, (166, 518, 514, 618), "ice", "sweep", 16, 0),
    ("s2 picture through plate", "L06 plate", "mind", 7.78, (520, 320, 820, 760), "diff", "plate", 18, 0),
    ("s2 rolling label", "L05", "total", 9.32, (1100, 470, 1700, 570), "diff", "swap", 16, 0),
    ("s4 typed Giveaway winners", "L14", "giveaway", 18.24, (780, 219, 1180, 272), "diff", "linear", 16, -1),
    ("s4 email arrives", "L14 icon", "email", 19.12, (780, 296, 900, 346), "diff", "arrive", 14, 0),
    ("s5 row 1 wipe", "L08", "goals", 32.62, (886, 242, 1248, 292), "ice", "sweep", 14, 0),
    ("s5 row 2 wipe", "L08", "history", 33.86, (890, 328, 1422, 376), "ice", "sweep", 14, 0),
    ("s5 row 3 wipe", "L08", "appropriate", 35.78, (892, 413, 1492, 462), "ice", "sweep", 14, 0),
    ("s6 hear-about-it highlighter", "L01", "hear", 43.68, (1248, 447, 1440, 486), "ice", "sweep", 16, 0),
    ("s7 card to full frame", "L09", "seeing", 49.88, None, "edge", "morph", 26, 0),
    ("s8 blank in (chapter)", "L13", "(section start +7 f)", 51.7 + 6 / 24, (1300, 420, 1700, 620), "diff", "blank", 11, 0),
    ("s8 karaoke 'this'", "L02", "this", 53.8, (178, 368, 300, 412), "diff", "cut", 1, 0),
    ("s8 punch block total-skin-health", "L02", "total..health", 55.64, (592, 434, 910, 524), "ice", "sweep", 17, 0),
    ("s8 karaoke 'comprehensive'", "L02", "comprehensive", 54.12, (390, 368, 760, 412), "diff", "cut", 1, 0),
    ("s9 divider", "L17", "beyond", 62.02, (1386, 380, 1394, 640), "diff", "sweep", 12, 0),
    ("s9 Beyond highlighter", "L17", "beyond", 62.02, (1430, 460, 1584, 509), "ice", "sweep", 16, 0),
    ("s10 centre hairline", "L23", "(section first frame 1559, +2 f)", 1559 / 24, (957, 40, 963, 1040), "diff", "sweep", 10, 0),
    ("s10 emotions highlighter", "L23/L01", "emotions", 68.94, (1240, 122, 1460, 164), "ice", "sweep", 16, 0),
    ("s11A dim the rest", "L07", "technology", 71.64, (1250, 560, 1650, 820), "diff", "sweep", 12, 0),
    ("s11B ring lands", "L03", "neuroplasticity", 73.96, (1022, 372, 1046, 412), "blue", "arrive", 5, 0),
    ("s11C typed Neurotransmitter", "L14", "neurotransmitter", 78.14, (197, 748, 520, 792), "diff", "linear", 16, -1),
    ("s11E Focused arrives", "L19", "focused", 80.8, (175, 335, 430, 400), "diff", "arrive", 14, 0),
    ("s12 Feel better arrives", "L21", "feel", 83.8, (760, 425, 1000, 470), "diff", "arrive", 14, 0),
    ("s12 better-skin highlighter", "L01", "better", 85.86, (1028, 485, 1233, 534), "ice", "sweep", 16, 0),
]
ICE = np.array([248, 228, 196], np.int16)  # BGR of #c4e4f8
BLUE = np.array([232, 169, 55], np.int16)  # BGR of #37a9e8

def metric(kind, crop, ref):
    if kind == "ice": return float((np.abs(crop.astype(np.int16) - ICE).max(axis=2) <= 8).mean())
    if kind == "blue": return float((np.abs(crop.astype(np.int16) - BLUE).max(axis=2) <= 40).mean())
    if kind == "diff": return float(np.abs(crop.astype(np.int16) - ref.astype(np.int16)).mean())
    raise ValueError(kind)

# windows of frames each probe needs
need = {}
for p in P:
    o = fr(p[3])
    for f in range(o - 6, o + 50): need.setdefault(f, []).append(p[0])
caps = [(c, w) for c in spec["captions"] for w in c.get("words", [])]
hide = (fr(53.8), fr(56.66))
cap_frames = sorted({fr(w) for _, w in caps})
cap_need = set()
for F in cap_frames:
    for f in range(F - 4, F + 4): cap_need.add(f)

cap = cv2.VideoCapture(src)
n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
series = {p[0]: {} for p in P}
refs = {}
band = {}
prev_small = None; prev2 = None; flashes = []; diffs = []
canvas = []
CANVAS_AT = [(fr(8.0), (1300, 820, 1800, 900)), (fr(30.0), (900, 650, 1700, 880)), (fr(35.0), (1000, 650, 1700, 880)), (fr(84.0), (1300, 750, 1800, 880)), (fr(62.0), (1100, 750, 1700, 880))]
i = 0
while True:
    ok, img = cap.read()
    if not ok: break
    small = cv2.resize(img, (480, 270), interpolation=cv2.INTER_AREA).astype(np.int16)
    if prev_small is not None:
        d1 = float(np.abs(small - prev_small).mean()); diffs.append(d1)
        if prev2 is not None:
            d02 = float(np.abs(small - prev2).mean())
            dprev = diffs[-2] if len(diffs) >= 2 else 0
            if dprev > 12 and d1 > 12 and d02 < 0.35 * min(dprev, d1): flashes.append({"frame": i - 1, "d_in": round(dprev, 1), "d_out": round(d1, 1), "d_skip": round(d02, 1)})
    prev2, prev_small = prev_small, small
    for p in P:
        name, _, _, t, rect, kind = p[:6]
        o = fr(t)
        if o - 6 <= i < o + 50:
            if kind == "edge":
                row = cv2.cvtColor(img[495:505], cv2.COLOR_BGR2GRAY).mean(axis=0)
                dark = np.where(row < 120)[0]
                x = int(dark[0]) if len(dark) else 1920
                series[name][i] = (1060 - min(x, 1060)) / 1060
                continue
            x0, y0, x1, y1 = rect
            crop = img[y0:y1, x0:x1]
            if i == (o if name.startswith("s10 centre") else o - 4): refs[name] = crop.copy()
            if kind == "diff":
                if name in refs: series[name][i] = metric(kind, crop, refs[name])
            else: series[name][i] = metric(kind, crop, None)
    if i in cap_need:
        band[i] = cv2.cvtColor(img[925:1032], cv2.COLOR_BGR2GRAY).astype(np.int16)
    for (cf, (x0, y0, x1, y1)) in CANVAS_AT:
        if i == cf:
            hsv = cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_BGR2HSV_FULL).reshape(-1, 3).astype(float)
            h = hsv[:, 0] * 360 / 256; s = hsv[:, 1] / 255
            canvas.append({"t": round(cf / FPS, 2), "hue_med": round(float(np.median(h)), 1), "sat_med": round(float(np.median(s)), 3)})
    i += 1

out = {"frames": i, "duration_s": round(i / FPS, 3), "probes": [], "canvas": canvas, "flashes": flashes}
# probes
for p in P:
    name, lib, word, t, rect, kind, token, dur, delay = p
    s = series[name]; o = fr(t)
    fs = sorted(s)
    if not fs: continue
    base = np.median([s[f] for f in fs if f <= o]) if any(f <= o for f in fs) else s[fs[0]]
    win = [s[f] for f in fs if o < f <= o + dur + 12]
    plateau = max(win, key=lambda x: abs(x - base))  # the value furthest from the base inside the token's window (the next cut can follow)
    rng = plateau - base
    def cross(q):
        for f in fs:
            if f > o - 3 and (s[f] - base) >= q * rng: return f
        return None
    first = next((f for f in fs if f > o - 3 and abs(s[f] - base) > max(0.02 * abs(rng), 1e-9) and abs(s[f] - base) > (0.004 if kind in ("ice", "blue", "edge") else 0.6)), None)
    a, b = cross(0.1), cross(0.9)
    pa, pb = predicted(o + 1 + delay, dur, token)
    out["probes"].append({"name": name, "lib": lib, "word": word, "onset_frame": o, "first_change": None if first is None else first - o,
                          "p10": None if a is None else a - o, "p90": None if b is None else b - o, "pred_p10": pa - o, "pred_p90": pb - o,
                          "start_err_f": None if a is None else a - pa, "span_err_f": None if (a is None or b is None) else (b - a) - (pb - pa), "token": f"{token} {dur} f"})
# captions
# caption zones (OstadYT ZONES) on the v5 section timeline (s10 to 69.9 s)
SEC = [(0, "s1"), (6.62, "s2"), (10.95, "s3"), (17.2, "s4"), (27.48, "s5"), (37.2, "s6"), (47.25, "s7"), (51.7, "s8"), (57.4, "s9"), (64.95, "s10"), (69.9, "s11"), (82.72, "s12"), (87.15, "s13")]
ZX = {"s1": (175, 995), "s4": (780, 1780), "s5": (840, 1780), "s6": (1060, 1760), "s9": (990, 1780), "s12": (760, 1780)}
offs = []
for c, w in caps:
    F = fr(w)
    if hide[0] <= F < hide[1]: continue
    if not all(f in band for f in range(F - 3, F + 4)): continue
    kind = [k for a, k in SEC if w >= a - 1e-6][-1]
    x0, x1 = ZX.get(kind, (175, 1745))
    pre, post = band[F - 3][:, x0:x1], band[F + 3][:, x0:x1]
    mask = np.abs(post - pre) > 45  # glyph edges: a word cut on at full contrast; footage drifts far less in 6 f
    if mask.sum() < 30: continue
    full = float(np.abs(post - pre)[mask].mean())
    bf = next((f for f in range(F - 3, F + 4) if float(np.abs(band[f][:, x0:x1] - pre)[mask].mean()) >= 0.5 * full), None)
    if bf is not None: offs.append(bf - F)
offs = np.array(offs)
out["captions"] = {"words": int(len(offs)), "within_0_1": int(((offs >= 0) & (offs <= 1)).sum()), "exact_0": int((offs == 0).sum()),
                   "median": float(np.median(offs)), "hist": {str(k): int((offs == k).sum()) for k in range(-3, 4)}}
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "verify_v5.json"), "w"), indent=1)
print(json.dumps({k: v for k, v in out.items() if k != "probes"}, indent=1))
for r in out["probes"]: print(r)
