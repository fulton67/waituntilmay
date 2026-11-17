"""arrow_type_proof.py: measure the ArrowTypeLab renders with the reference method, and build the two proof sheets.

Input: PNG sequences of the ArrowTypeLab composition (brand/remotion/src/devices/ArrowTypeLab.tsx), one folder per item:
    npx remotion render ArrowTypeLab <LAB>/r/<item> --sequence --image-format=png --frames=0-72 --props='{"item":"<item>"}'
    (follow: --frames=0-110; f04: --frames=570-640)
Method (the same as measure/_devices/entry_stats.json, i.e. graphic_track.py + easing_fit.py, on our own pixels):
  - the element is every pixel that differs from the empty first frame (max channel |diff| > 25); per frame its bbox (cx, cy, w)
    and opacity (mean |diff| inside the settled bbox / its settled value);
  - each channel that changes is normalised to progress and fitted with easing_fit.fit_track: frames_to_settle (|p - 1| <= 1 % for
    good), overshoot %, cubic bezier. Entry settle = the max over channels (device_stats.py), counted from the item's start frame.
  - arrows: draw progress = ink pixels / held ink pixels (fit_track); the head = ink inside a box round the known tip: landing frame
    (>= 99 % of its held ink for good), its centroid after landing (overshoot px, frames to settle within 0.5 px), the hold breathe
    (centroid range of the whole arrow and of the head) and the exit (largest one-frame ink drop: 100 % would be a cut).
  - specials: highlighter / box block width from the ice-blue pixels; ghost/accumulate word lighting from the ink-dark pixels;
    typewriter / letter-out characters per frame from the ink width; follow: the tip against the tracked landmark.
Output: exomind/arrow_type_proof.json (numbers, committed) and, with --sheets, exomind/arrows_vs_refs.jpg + type_vs_refs.jpg
(reference crops beside our frames: gitignored like ref_*.jpg).

Run (from research/ostad/style): C:/Users/naimj/tools/style-venv/Scripts/python.exe -I tools/arrow_type_proof.py <LAB> [--sheets]
"""
import glob
import json
import math
import os
import sys

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
STYLE = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from easing_fit import fit_track  # noqa: E402
import ref_device_sheet as rds  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(STYLE)))
H, Wd = 1080, 1920
START, A_END, EXIT_AT = 6, 66, 54
ICE = np.array([248, 228, 196])  # #c4e4f8 in BGR
A_DRAW = {"curved-callout": 7, "straight-pointer": 7, "bracket-pointer": 7, "route-trace": 27, "arc-connector": 26, "dashed-flow": 8,
          "light-ribbon": 28, "orbit-arc": 9, "marker-tick": 1}
A_TIP = {"curved-callout": (1240, 360), "straight-pointer": (960, 300), "bracket-pointer": (1260, 540), "route-trace": (1420, 330),
         "arc-connector": (1360, 700), "dashed-flow": (1280, 420), "orbit-arc": (1250, 610), "marker-tick": (960, 500)}
A_FROM = {"curved-callout": (620, 760), "straight-pointer": (960, 820), "bracket-pointer": (700, 540), "route-trace": (1120, 640),
          "arc-connector": (560, 700), "dashed-flow": (640, 720), "orbit-arc": (1250, 560), "marker-tick": (960, 420)}
# reference numbers (DEVICE_LIBRARY.md §A; M = frame-counted)
A_REF = {
    "curved-callout": {"draw_f": 7, "overshoot": 0, "head": "lands on the last draw frame", "hold": "static", "src": "GMu3 f395-401 (M)"},
    "straight-pointer": {"draw_f": 7, "overshoot": 0, "head": "pops at the end", "hold": "static", "src": "WZ f926-933 (M)"},
    "bracket-pointer": {"draw_f": None, "overshoot": 0, "head": "-", "hold": "-", "src": "no corpus bracket; timed as the callout"},
    "route-trace": {"draw_f": 27, "peak": 44, "overshoot": 0, "head": "at the end", "hold": "-", "src": "DDOS f216-250 (M), sweep peak 44 %"},
    "arc-connector": {"draw_f": 26, "overshoot": 0, "head": "icon rides the end", "hold": "static", "src": "D_bh f1108-1140 (M)"},
    "dashed-flow": {"draw_f": 8, "overshoot": 0, "head": "appears at the end", "hold": "static", "src": "GMu3 f460-468 (E)"},
    "light-ribbon": {"draw_f": 28, "overshoot": 0, "head": "-", "hold": "keeps travelling", "src": "glp1 f1100-1170 (M)"},
    "orbit-arc": {"draw_f": 9, "overshoot": 0, "head": "-", "hold": "drifts with the model", "src": "DYKh5yyPxxg f1200-1264 (E, 8-10 f)"},
    "marker-tick": {"draw_f": 1, "overshoot": 0, "head": "pops", "hold": "static", "src": "WZ f940/944 (M)"},
}
# DEVICE_LIBRARY §T: settle frames, travel (% H, signed: - = up), overshoot
T_REF = {
    "type-word-fade-rise": {"settle": 5, "dy": -6.0, "src": "DDOS f3-9"},
    "type-highlight-sweep": {"settle": 16, "peak": 44, "src": "DDOS f27-47 (block width)"},
    "type-box-slam": {"settle": 4, "dy": -7.0, "box": 4, "src": "GMu3 f1512-1520"},
    "type-ghost-to-lit": {"settle": 5, "dy": -2.0, "lit_f": 1, "src": "WZ f238-263"},
    "type-line-accumulate": {"settle": 0, "lit_f": 1, "src": "DDOS f2595-2821 (lines cut on)"},
    "type-typewriter": {"cpf": 3.9, "src": "DDOS f1539-1556"},
    "type-message-lines": {"settle": 4, "line_dy": -1.0, "src": "glp1 f860-940"},
    "type-orbit-labels": {"settle": 3, "total": 9, "src": "glp1 f622-644"},
    "type-letter-stagger-out": {"f_per_char": 2.4, "src": "Are.na 12087163"},
    "type-card-rise": {"settle": 17, "dy": -10.7, "src": "colin DZiJljQJEKN f46-64 (easing.json)"},
    "type-rise": {"settle": 11.2, "dy": -4.2, "src": "entry_stats _all text rise (n 2,187)"},
    "type-slide-side": {"settle": 9, "dx": 2.8, "src": "entry_stats _all text slide-right (n 1,609)"},
    "type-scale-pop": {"settle": 5, "scale": 5.0, "src": "entry_stats _all text scale-in (n 2,270)"},
    "type-name-decode": {"span": 70, "src": "G4 FWfMMmC6mzE f960-1029"},
}
TEXT_LEN = {"type-typewriter": len("Non-invasive \u00b7 drug-free"), "type-letter-stagger-out": len("Your questions")}


def load(lab, item):
    fs = sorted(glob.glob(os.path.join(lab, "r", item, "element-*.png")))
    if not fs:
        raise SystemExit(f"no frames for {item}")
    first = int(os.path.basename(fs[0])[8:-4])
    return first, [cv2.imread(f, cv2.IMREAD_COLOR) for f in fs]


def mask_of(f, bg, thr=25):
    return np.abs(f.astype(np.int16) - bg.astype(np.int16)).max(2) > thr


def bbox(m):
    ys, xs = np.nonzero(m)
    if len(xs) == 0:
        return None
    return [float(xs.min()), float(ys.min()), float(xs.max() + 1), float(ys.max() + 1)]


def r1(v, n=1):
    return None if v is None else round(float(v), n)


# ---------------------------------------------------------------------------------------------------------------- arrows
def mass_of(f, bg):
    """ink mass: summed max-channel |diff| (>= 8 levels), so anti-aliasing and sub-pixel motion don't change it the way a pixel count does"""
    d = np.abs(f.astype(np.int16) - bg.astype(np.int16)).max(2)
    return np.where(d >= 8, d, 0)


def measure_arrow(item, frames):
    bg = frames[0]
    D = A_DRAW[item]
    ms = [mass_of(f, bg) for f in frames]
    n = np.array([m.sum() for m in ms], float)
    land = START + D
    hold = list(range(land + 3, A_END - 8))
    final = float(np.median(n[hold]))
    out = {"ref": A_REF[item]}
    p = n[START:START + D + 14] / final
    fit = fit_track(p) if p.max() > 0 else None
    if fit:
        dv = np.diff(np.clip(p[:fit["frames_to_settle"] + 1], 0, None))
        out["draw"] = {"frames_to_settle": fit["frames_to_settle"], "overshoot_pct": fit["overshoot_pct"], "bezier": fit["bezier"],
                       "bezier_rmse": fit["bezier_rmse"],
                       "velocity_peak_pct": r1(100 * (int(np.argmax(dv)) + 0.5) / max(1, fit["frames_to_settle"])) if len(dv) else None}
    if item in A_TIP:
        tx, ty = A_TIP[item]
        R = 40
        hm = [m[ty - R:ty + R, tx - R:tx + R] for m in ms]
        nh = np.array([m.sum() for m in hm], float)
        hf = float(np.median(nh[hold]))
        land_h = next((i for i in range(START, A_END) if nh[i] >= 0.99 * hf), None)
        # the apex: the ink pixel furthest along the direction of travel (from -> tip); the tip is pinned, so this is the head's own motion
        d = np.array([tx, ty], float) - np.array(A_FROM[item], float)
        d /= np.linalg.norm(d)
        ap = []
        for m in hm:
            ys, xs = np.nonzero(m >= 40)
            ap.append(float(np.max((xs - R) * d[0] + (ys - R) * d[1])) if len(xs) else np.nan)
        ap = np.array(ap)
        rest = float(np.nanmedian(ap[hold]))
        dev = ap - rest
        over = float(np.nanmax(dev[land_h:land_h + 12])) if land_h is not None else None
        settle_after = None
        if land_h is not None:
            bad = [i for i in range(land_h, land_h + 12) if abs(dev[i]) > 0.5]
            settle_after = (bad[-1] + 1 - land_h) if bad else 0
        out["head"] = {"landing_frame_rel_start": None if land_h is None else land_h - START, "apex_overshoot_px": r1(max(0.0, over), 2) if over is not None else None,
                       "frames_to_settle_after_landing": settle_after, "apex_hold_range_px": r1(np.nanmax(dev[hold]) - np.nanmin(dev[hold]), 2)}
    cents = []
    for m in ms:
        tot = m.sum()
        if tot <= 0:
            cents.append((np.nan, np.nan)); continue
        cents.append(((m.sum(0) * np.arange(m.shape[1])).sum() / tot, (m.sum(1) * np.arange(m.shape[0])).sum() / tot))
    cents = np.array(cents)
    hc = cents[hold]
    out["hold"] = {"centroid_range_px": r1(np.nanmax(np.linalg.norm(hc - np.nanmedian(hc, 0), axis=1)) * 2, 2),
                   "centroid_speed_px_per_f": r1(np.nanmedian(np.linalg.norm(np.diff(hc, axis=0), axis=1)), 2)}
    ex = n[A_END - 9:A_END + 2] / final
    out["exit"] = {"frames": int(sum(1 for i in range(A_END - 8, A_END + 1) if 0 < n[i] < 0.995 * final)),
                   "last_visible_frame_rel_end": int(max(i for i in range(len(n)) if n[i] > 0) - A_END),
                   "max_one_frame_drop_pct": r1(100 * float(np.max(-np.diff(ex))))}
    return out


def track_landmark(name, comp_frames):
    t = json.load(open(os.path.join(REPO, "brand", "remotion", "public", "exomind-skin", "track.json"), encoding="utf8"))
    j = t["names"].index(name)
    fr = t["frames"]
    out = []
    for c in comp_frames:
        s = (c / 24) * 1.15 * t["fps"]
        i = int(math.floor(s)); u = s - i
        a, b = fr[i], fr[min(i + 1, len(fr) - 1)]
        if a and b:
            row = [x + (y - x) * u for x, y in zip(a, b)]
        else:
            row = a or b
        x, y = row[11 + 2 * j], row[11 + 2 * j + 1]
        out.append((0 + 0.86 * x, -150 + 0.86 * y))  # LAYERS.keyed
    return out


def measure_follow(frames, follow_at=1000):
    bg = frames[0]
    D = 7
    tg = track_landmark("templeL", [f + follow_at for f in range(len(frames))])
    frm = np.array([1500.0, 860.0])
    errs, path = [], []
    for i in range(START + D + 1, A_END + 40 - 8):
        m = mask_of(frames[i], bg)
        tx, ty = tg[i]
        x0, y0 = int(tx) - 60, int(ty) - 60
        sub = m[max(0, y0):y0 + 120, max(0, x0):x0 + 120]
        ys, xs = np.nonzero(sub)
        if not len(xs):
            continue
        pts = np.stack([xs + max(0, x0), ys + max(0, y0)], 1).astype(float)
        d = np.array([tx, ty]) - frm
        d /= np.linalg.norm(d)
        apex = pts[np.argmax(pts @ d)]
        errs.append(float(np.linalg.norm(apex - np.array([tx, ty]))))
        path.append(tg[i])
    path = np.array(path)
    return {"landmark": "templeL (LAYERS.keyed)", "frames": len(errs), "target_travel_px": r1(np.ptp(path[:, 0]) + np.ptp(path[:, 1])),
            "tip_error_median_px": r1(np.median(errs), 2), "tip_error_p95_px": r1(np.percentile(errs, 95), 2),
            "note": "apex = ink pixel furthest along from->target within 60 px of the landmark; includes the round cap (~2.2 px)",
            "spec": "median < 6 px, p95 < 15 px (EXOMIND_REDO §3)"}


# ---------------------------------------------------------------------------------------------------------------- type
def channels_fit(boxes, ops, start_idx):
    """boxes / ops per frame from start_idx; returns per-channel fits counted from the start frame."""
    res = {}
    vis = [i for i, b in enumerate(boxes) if b is not None]
    if not vis:
        return res
    i0 = vis[0]
    seg = [b for b in boxes[i0:] if b is not None]
    bx = np.array(seg, float)
    ch = {"cx": (bx[:, 0] + bx[:, 2]) / 2, "cy": (bx[:, 1] + bx[:, 3]) / 2, "w": bx[:, 2] - bx[:, 0]}
    for name, v in ch.items():
        scale = {"cx": Wd, "cy": H, "w": max(1.0, float(np.median(v)))}[name]
        if np.ptp(v) / scale < 0.01 and not (name == "w" and np.ptp(v) / scale >= 0.004):
            continue
        f = fit_track(v)
        if f:
            f["frames_to_settle"] += i0
            f["first_visible_rel_start"] = i0
            res[name] = f
    op = np.array(ops, float)
    if np.ptp(op) >= 0.1:
        f = fit_track(op)
        if f:
            res["opacity"] = f
    return res


def element_track(frames, s, e, thr=25, sel=None):
    bg = frames[0]
    masks = []
    for f in frames:
        m = mask_of(f, bg, thr)
        if sel is not None:
            m &= sel(f)
        masks.append(m)
    hold = [i for i in range(s + 22, min(e, len(frames)) - 2)]
    fb = bbox(np.logical_or.reduce([masks[i] for i in hold]))
    x0, y0, x1, y1 = [int(v) for v in fb]
    diffs = [float(np.abs(f[y0:y1, x0:x1].astype(np.int16) - bg[y0:y1, x0:x1]).mean()) for f in frames]
    settled = float(np.median([diffs[i] for i in hold]))
    boxes = [bbox(m) for m in masks]
    ops = [min(1.5, d / settled) for d in diffs]
    return masks, boxes, ops, fb


def summarize(fits, boxes, s, win=20):
    vis = [b for b in boxes[s:s + win] if b is not None]
    out = {"settle_f": max((c["frames_to_settle"] for c in fits.values()), default=0),
           "overshoot_pct": max((c["overshoot_pct"] for c in fits.values()), default=0.0),
           "channels": {k: {"settle": v["frames_to_settle"], "overshoot": v["overshoot_pct"], "bezier": v["bezier"], "rmse": v["bezier_rmse"]} for k, v in fits.items()}}
    if vis:
        b0, b1 = vis[0], vis[-1]
        out["dy_pct_h_visible"] = r1(((b1[1] + b1[3]) - (b0[1] + b0[3])) / 2 / H * 100, 2)
        out["dx_pct_h_visible"] = r1(((b1[0] + b1[2]) - (b0[0] + b0[2])) / 2 / H * 100, 2)
        out["scale_change_pct"] = r1(((b1[2] - b1[0]) / max(1, b0[2] - b0[0]) - 1) * 100, 2)
    return out


def ice_sel(f):
    return np.abs(f.astype(np.int16) - ICE).max(2) < 18


def ink_sel(f):
    return f.max(2) < 110


def measure_type(item, frames):
    s, e = START, EXIT_AT
    out = {"ref": T_REF[item]}
    if item in ("type-rise", "type-slide-side", "type-scale-pop", "type-card-rise", "type-word-fade-rise"):
        masks, boxes, ops, fb = element_track(frames, s, e)
        fits = channels_fit(boxes[s:s + 20], ops[s:s + 20], 0)
        out["ours"] = summarize(fits, boxes, s)
    elif item == "type-message-lines":
        # plate: mean |diff| on the plate's bottom padding strip (glass only, no text); lines: ink mass of each text row band
        bg = frames[0].astype(np.int16)
        dd = [np.abs(f.astype(np.int16) - bg).max(2) for f in frames]
        plate = (dd[e - 3] > 2) & (dd[e - 3] < 20)
        pb = bbox(plate)
        x0, y0, x1, y1 = [int(v) for v in pb]
        strip = (slice(y1 - 14, y1 - 6), slice(x0 + 40, x1 - 40))
        pv = np.array([float(d[strip].mean()) for d in dd])
        pf = fit_track(pv[s:s + 20])
        txt = [(d >= 25) for d in dd]
        rows = np.nonzero(txt[e - 3].any(1))[0]
        bands, cur = [], [rows[0]]
        for r in rows[1:]:
            if r - cur[-1] > 4:
                bands.append(cur); cur = [r]
            else:
                cur.append(r)
        bands.append(cur)
        lines = []
        for bd in bands:
            ys = slice(bd[0] - 3, bd[-1] + 4)
            n = np.array([float(np.where(d[ys] >= 25, d[ys], 0).sum()) for d in dd])
            fin = np.median(n[e - 8:e - 2])
            on = next(i for i in range(s, e) if n[i] > 0.02 * fin)
            done = next(i for i in range(on, e) if (np.abs(n[i:e - 2] / fin - 1) <= 0.01).all())
            lines.append({"first_ink_rel_start": on - s, "settled_rel_start": done - s, "fade_frames": done - on + 1})
        out["ours"] = {"plate_settle_f": pf["frames_to_settle"] if pf else None, "lines": lines}
    elif item == "type-highlight-sweep":
        ws = []
        for f in frames:
            b = bbox(ice_sel(f))
            ws.append(0 if b is None else b[2] - b[0])
        p = np.array(ws[s:s + 22], float) / max(ws[s + 25:e - 2])
        f = fit_track(p)
        dv = np.diff(p[:f["frames_to_settle"] + 1])
        out["ours"] = {"settle_f": f["frames_to_settle"], "overshoot_pct": f["overshoot_pct"], "bezier": f["bezier"],
                       "velocity_peak_pct": r1(100 * (int(np.argmax(dv)) + 0.5) / f["frames_to_settle"])}
    elif item == "type-box-slam":
        masks, boxes, ops, fb = element_track(frames, s, e)
        fits = channels_fit(boxes[s:s + 4] + [b for b in boxes[s + 4:s + 20]], ops[s:s + 20], 0)
        _, iboxes, _, _ = element_track(frames, s, e, sel=ink_sel)
        fits = {k: v for k, v in channels_fit(iboxes[s:s + 20], [1.0] * 20, 0).items() if k != "opacity"}
        out["ours"] = summarize(fits, iboxes, s)
        vb = [b for b in boxes[s:s + 5] if b is not None]  # full mask before the box arrives: the visible rise
        out["ours"]["dy_pct_h_visible"] = r1(((vb[-1][1] + vb[-1][3]) - (vb[0][1] + vb[0][3])) / 2 / H * 100, 2)
        ws = []
        for fr in frames:
            b = bbox(ice_sel(fr))
            ws.append(0 if b is None else b[2] - b[0])
        on = next(i for i, w in enumerate(ws) if w > 0)
        full = next(i for i in range(on, len(ws)) if ws[i] >= 0.99 * max(ws[s + 15:e - 2]))
        out["ours"]["box_starts_rel_start"] = on - s
        out["ours"]["box_frames"] = full - on + 1
    elif item in ("type-ghost-to-lit", "type-line-accumulate"):
        dark = np.array([float((f.max(2) < 90).sum()) for f in frames])
        steps = np.diff(dark[s:e])
        big = steps > 0.02 * dark[e - 2]
        runs, cur = [], 0
        for b in big:
            if b:
                cur += 1
            elif cur:
                runs.append(cur); cur = 0
        out["ours"] = {"words_lit": len(runs), "frames_per_light_up": sorted(set(runs))}
        if item == "type-ghost-to-lit":
            masks, boxes, ops, fb = element_track(frames, s, e)
            seg = [b for b in boxes[s:s + 20] if b is not None]
            cy = np.array([(b[1] + b[3]) / 2 for b in seg])
            fc = fit_track(cy)
            out["ours"].update({"line_rise_settle_f": fc["frames_to_settle"] + (20 - len(seg)) if fc else None, "line_rise_overshoot_pct": fc["overshoot_pct"] if fc else None,
                                "dy_pct_h_visible": r1((cy[-1] - cy[0]) / H * 100, 2)})
        else:
            allm = np.array([float(mask_of(f, frames[0]).sum()) for f in frames])
            st = np.diff(allm[s:e])
            out["ours"]["line_appear_frames"] = int((st > 0.05 * allm[e - 2]).sum())
    elif item == "type-typewriter":
        ws = []
        for f in frames:
            b = bbox(mask_of(f, frames[0]))
            ws.append(0 if b is None else b[2])
        on = next(i for i, w in enumerate(ws) if w > 0)
        full = next(i for i in range(on, len(ws)) if ws[i] >= max(ws[s:e]) - 1)
        out["ours"] = {"frames_first_to_full": full - on + 1, "chars_per_frame": r1(TEXT_LEN[item] / (full - on + 1), 2),
                       "ref_frames_for_this_text": math.ceil(TEXT_LEN[item] / 3.9)}
    elif item == "type-letter-stagger-out":
        xa = 40
        ws = []
        for f in frames:
            b = bbox(mask_of(f, frames[0]))
            ws.append(0 if b is None else b[2])
        gone = next(i for i in range(xa, len(ws)) if ws[i] == 0)
        out["ours"] = {"exit_frames": gone - xa, "frames_per_char": r1((gone - xa) / TEXT_LEN[item], 2)}
    elif item == "type-orbit-labels":
        masks, boxes, ops, fb = element_track(frames, s, e)
        # label settle = the whole group's channels; last label = when the ink count reaches 99 % for good
        n = np.array([float(m.sum()) for m in masks])
        fin = np.median(n[s + 22:e - 2])
        last = next(i for i in range(s, e) if (np.abs(n[i:e - 2] / fin - 1) <= 0.01).all())
        first_pair = [i for i in range(s, e) if n[i] > 0]
        # first pair: ink up to before the third label appears (frame of the 2nd rise in ink)
        out["ours"] = {"all_labels_settled_rel_start": last - s, "first_ink_rel_start": first_pair[0] - s}
        d = np.diff(n[s:e])
        third = next((i for i in range(4, len(d)) if d[i] > 0.05 * fin and d[i - 1] <= 0.05 * fin), None)
        out["ours"]["third_label_starts_rel_start"] = third
        if third:
            pair = n[s + third]
            out["ours"]["first_pair_settled_rel_start"] = next(i for i in range(s, s + third + 1) if n[i] >= 0.99 * pair) - s
    elif item == "type-name-decode":
        bg = frames[0]
        ch = [int(np.abs(frames[i].astype(np.int16) - frames[i - 1].astype(np.int16)).max() > 40) for i in range(s + 1, min(len(frames), 84))]
        idx = [i for i, c in enumerate(ch) if c]
        out["ours"] = {"resolve_span_f": (idx[-1] - idx[0] + 1) if idx else 0, "changing_frames": len(idx)}
    return out


def measure_f04(first, frames):
    # headline "Check your texts" (top band y 480-600), word onsets check 580 / your 587 / text 592 (yt_words.json, x24)
    bg = frames[0]
    onsets = {"Check": 580, "your": 587, "texts": 592}
    band = slice(470, 610)
    m0 = [mask_of(f, bg)[band] for f in frames]
    allm = np.logical_or.reduce(m0[-10:])
    cols = np.nonzero(allm.any(0))[0]
    # split words by gaps > 12 px
    groups, cur = [], [cols[0]]
    for c in cols[1:]:
        if c - cur[-1] > 12:
            groups.append(cur); cur = [c]
        else:
            cur.append(c)
    groups.append(cur)
    out = {}
    for (w, on), g in zip(onsets.items(), groups):
        x0, x1 = g[0], g[-1] + 1
        n = np.array([float(m[:, x0:x1].sum()) for m in m0])
        fin = np.median(n[-8:])
        vis = next(i for i in range(len(n)) if n[i] > 0.01 * fin)
        done = next(i for i in range(len(n)) if (np.abs(n[i:] / fin - 1) <= 0.01).all())
        out[w] = {"onset_f": on, "first_ink_f": first + vis, "settled_f": first + done, "first_ink_minus_onset": first + vis - on,
                  "settled_minus_onset": first + done - on}
    out["v41"] = {"Check": {"onset_f": 580, "first_ink_f": 553, "settled_f": 590, "first_ink_minus_onset": -27, "settled_minus_onset": 10},
                  "note": "TYPE_AUDIT.md §1 (48 f CSS-ease fade, 30 px visible rise, 33 f early)"}
    return out


# ---------------------------------------------------------------------------------------------------------------- sheets
TH = 150


def tile(im, crop, label):
    x0, y0, x1, y1 = crop
    t = im[y0:y1, x0:x1]
    s = TH / t.shape[0]
    t = cv2.resize(t, (max(1, int(t.shape[1] * s)), TH), interpolation=cv2.INTER_AREA)
    rds.put(t, label, (6, 16), 0.45)
    return t


def label_col(lines, color=(20, 20, 20)):
    lab = np.full((TH, 300, 3), 245, np.uint8)
    y = 22
    for i, ln in enumerate(lines):
        for sub in rds.wrap(ln, 34 if i == 0 else 44)[:4]:
            cv2.putText(lab, sub, (8, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5 if i == 0 else 0.4, color if i == 0 else (70, 70, 70), 1, cv2.LINE_AA)
            y += 20 if i == 0 else 16
    return lab


def row(lab, tiles):
    parts = [lab]
    for t in tiles:
        parts += [t, np.full((TH, 4, 3), 255, np.uint8)]
    return np.hstack(parts)


def ref_row(spec_rows, prefix):
    r = next((x for x in spec_rows if x["label"].startswith(prefix)), None)
    if r is None:
        return None
    got = rds.grab(os.path.join(STYLE, r["video"]), r["frames"])
    tiles = []
    for f in r["frames"]:
        im = got.get(f)
        if im is None:
            continue
        crop = r.get("crop") or [0, 0, im.shape[1], im.shape[0]]
        tiles.append(tile(im, crop, f"f{f}"))
    return row(label_col([f"REF {r['label']}", r.get("note", "")], (120, 40, 0)), tiles)


def union_crop(frames, idxs, pad=60, aspect=1.5):
    bg = frames[0]
    m = np.logical_or.reduce([mask_of(frames[i], bg) for i in idxs])
    b = bbox(m) or [0, 0, Wd, H]
    cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
    w, h = b[2] - b[0] + 2 * pad, b[3] - b[1] + 2 * pad
    w, h = max(w, h * aspect), max(h, w / aspect)
    x0, y0 = int(max(0, cx - w / 2)), int(max(0, cy - h / 2))
    return [x0, y0, int(min(Wd, x0 + w)), int(min(H, y0 + h))]


def stack(rows_, title, path):
    mw = max(r.shape[1] for r in rows_)
    parts = [np.full((40, mw, 3), 255, np.uint8)]
    cv2.putText(parts[0], title, (8, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 0, 0), 2, cv2.LINE_AA)
    for r in rows_:
        parts += [np.hstack([r, np.full((r.shape[0], mw - r.shape[1], 3), 255, np.uint8)]), np.full((6, mw, 3), 255, np.uint8)]
    cv2.imwrite(path, np.vstack(parts), [cv2.IMWRITE_JPEG_QUALITY, 85])
    print(path)


def ours_note(m, kind):
    o = m.get("ours", m)
    if kind == "arrow":
        d, h = o.get("draw", {}), o.get("head", {})
        return f"draw {d.get('frames_to_settle')} f, OS {d.get('overshoot_pct')} %, head lands f+{h.get('landing_frame_rel_start')}, apex OS {h.get('apex_overshoot_px')} px, settle-after {h.get('frames_to_settle_after_landing')} f, exit {o['exit']['frames']} f"
    return json.dumps({k: v for k, v in o.items() if k != "channels"})[:160]


def sheets(lab, res):
    ra = json.load(open(os.path.join(HERE, "sheet_specs", "ref_arrows.json"), encoding="utf8"))["rows"]
    rt = json.load(open(os.path.join(HERE, "sheet_specs", "ref_type_entries.json"), encoding="utf8"))["rows"]
    rows_ = []
    for item, D in A_DRAW.items():
        first, fr = load(lab, item)
        r = ref_row(ra, f"arrow-{item}")
        if r is None and item == "route-trace":
            r = ref_row([{"label": "arrow-route-trace (Evident DDOS B03)", "video": "media/ig/evidentmediaorg/Ddos1QZRGmV.mp4",
                          "frames": [216, 222, 228, 234, 240, 246, 250], "crop": [0, 300, 1080, 1300], "note": "coast traced leg by leg, 34 f @30 = 27 f, sweep peak 44 %"}], "arrow-route-trace")
        if r is not None:
            rows_.append(r)
        else:
            rows_.append(row(label_col([f"REF arrow-{item}", "no reference arrow of this kind in the corpus (EXOMIND_REDO asks for it); timed as the curved callout"], (120, 40, 0)), []))
        picks = sorted(set([START + 1, START + max(1, D // 4), START + max(1, D // 2), START + max(1, 3 * D // 4), START + D, START + D + 12, START + D + 30, A_END - 4, A_END - 2, A_END]))
        crop = union_crop(fr, list(range(START, A_END - 6)))
        tiles = [tile(fr[i], crop, f"f{first + i - START:+d}") for i in picks]
        rows_.append(row(label_col([f"OURS {item}", ours_note(res["arrows"][item], "arrow")]), tiles))
    stack(rows_, "Arrows: reference (frame numbers = source) vs ours (frame numbers = relative to start; draw / landed / hold / exit)",
          os.path.join(STYLE, "exomind", "arrows_vs_refs.jpg"))

    rows_ = []
    alias = {"type-word-fade-rise": "type-word-fade-on"}
    for item in T_REF:
        first, fr = load(lab, item)
        r = ref_row(rt, alias.get(item, item))
        rows_.append(r if r is not None else row(label_col([f"REF {item}", T_REF[item]["src"] + " (corpus median; no single sheet)"], (120, 40, 0)), []))
        if item == "type-letter-stagger-out":
            picks = [7, 20, 40, 44, 48, 54, 60, 66, 72]
        elif item == "type-name-decode":
            picks = [7, 16, 28, 40, 52, 64, 72]
        else:
            picks = [START, START + 1, START + 2, START + 3, START + 5, START + 8, START + 12, START + 18, EXIT_AT + 3]
        crop = union_crop(fr, list(range(START, min(len(fr), EXIT_AT))), pad=40, aspect=2.4)
        rows_.append(row(label_col([f"OURS {item}", ours_note(res["type"][item], "type")]), [tile(fr[i], crop, f"f{first + i - START:+d}") for i in picks if i < len(fr)]))
    # F04: v4.1 render vs ours, same output frames
    v41 = os.path.join(os.path.expanduser("~"), "Downloads", "Ostad - Exomind and total skin health (YouTube v4.1).mp4")
    fs = [556, 564, 572, 580, 584, 588, 592, 596, 600]
    got = rds.grab(v41, fs) if os.path.exists(v41) else {}
    rows_.append(row(label_col(["v4.1 F04 'Check your texts'", "48 f CSS-ease fade + 30 px rise, starts f553 (33 f before 'check' f580), settles f590"], (0, 0, 160)),
                     [tile(got[f], [760, 480, 1500, 900], f"f{f}") for f in fs if f in got]))
    first, fr = load(lab, "f04")
    rows_.append(row(label_col(["OURS F04 rebuilt (B06 message lines + headline on onsets)", json.dumps({k: v for k, v in res["f04"].items() if k != "v41"})[:170]]),
                     [tile(fr[f - first], [700, 440, 1440, 860], f"f{f}") for f in fs if 0 <= f - first < len(fr)]))
    stack(rows_, "Type entries: reference vs ours (ours: frame numbers relative to start), and F04 v4.1 vs rebuilt",
          os.path.join(STYLE, "exomind", "type_vs_refs.jpg"))


def main():
    lab = sys.argv[1]
    res = {"method": __doc__.split("Output:")[0].strip(), "arrows": {}, "type": {}}
    for item in A_DRAW:
        res["arrows"][item] = measure_arrow(item, load(lab, item)[1])
        print(item, json.dumps(res["arrows"][item])[:400])
    res["follow"] = measure_follow(load(lab, "follow")[1])
    print("follow", res["follow"])
    for item in T_REF:
        res["type"][item] = measure_type(item, load(lab, item)[1])
        print(item, json.dumps(res["type"][item]["ours"])[:300])
    first, fr = load(lab, "f04")
    res["f04"] = measure_f04(first, fr)
    print("f04", res["f04"])
    json.dump(res, open(os.path.join(STYLE, "exomind", "arrow_type_proof.json"), "w", encoding="utf8"), indent=1)
    if "--sheets" in sys.argv:
        sheets(lab, res)


if __name__ == "__main__":
    main()
