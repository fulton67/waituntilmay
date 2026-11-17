"""Entry-style statistics for DEVICE_LIBRARY.md, from the M10/M11/M12 measurements.

For every text element (text_elements.json) and graphic element (graphic_elements.json) with an M12 entry fit
(easing.json), classify how it enters and pull its measured numbers:
  style      : type-on | rise | drop | slide-left | slide-right | scale-in | fade | pop
  dist_pct_h : travel of the centre over the entry window, in % of frame height (signed: + is down / right)
  settle_24  : frames to settle (max over the fitted channels), converted to 24 fps
  overshoot  : max overshoot % over the fitted channels
  bezier     : the fit of the dominant channel
Writes measure/_devices/entry_stats.json (per ref, per style: n, medians, IQR, and the best examples by size and fit).

Run: C:/Users/naimj/tools/style-venv/Scripts/python.exe -I tools/device_stats.py   (from research/ostad/style)
Reads only measurement JSON; no media.
"""
import glob
import json
import os
import statistics as st

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MEAS = os.path.join(ROOT, "measure")


def load(p):
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def q(vals, p):
    vals = sorted(vals)
    if not vals:
        return None
    i = (len(vals) - 1) * p
    lo, hi = int(i), min(int(i) + 1, len(vals) - 1)
    return round(vals[lo] + (vals[hi] - vals[lo]) * (i - lo), 2)


def classify(track, fit, W, H, fps, is_text):
    k = max(3, int(round(fps * 0.8)))
    seg = track[:k]
    b0, b1 = seg[0]["bbox"], seg[-1]["bbox"]
    cx0, cy0 = (b0[0] + b0[2]) / 2, (b0[1] + b0[3]) / 2
    cx1, cy1 = (b1[0] + b1[2]) / 2, (b1[1] + b1[3]) / 2
    w0, w1 = b0[2] - b0[0], b1[2] - b1[0]
    dx, dy = (cx1 - cx0) / H * 100, (cy1 - cy0) / H * 100
    chans = (fit or {}).get("entry") or {}
    if is_text:
        t0 = len((seg[0].get("text") or "").strip())
        t1 = max(len((r.get("text") or "").strip()) for r in seg)
        grow = [len((r.get("text") or "").strip()) for r in seg]
        mono = sum(1 for a, b in zip(grow, grow[1:]) if b >= a) >= len(grow) - 2
        if t1 >= 4 and t0 <= 0.6 * t1 and mono and "w" in chans and abs(b1[0] - b0[0]) < 0.25 * max(w1, 1):
            return "type-on", dx, dy
    if not chans:
        return "pop", dx, dy
    if "cy" in chans and abs(dy) >= 1.0 and abs(dy) >= abs(dx):
        return ("rise" if dy < 0 else "drop"), dx, dy
    if "cx" in chans and abs(dx) >= 1.0:
        return ("slide-right" if dx > 0 else "slide-left"), dx, dy
    if "w" in chans and w0 > 0 and abs(w1 / w0 - 1) >= 0.05:
        return "scale-in", dx, dy
    if "opacity" in chans:
        return "fade", dx, dy
    return "pop", dx, dy


def main():
    out = {}
    for ez in sorted(glob.glob(os.path.join(MEAS, "*", "*", "easing.json"))):
        vdir = os.path.dirname(ez)
        vid = os.path.basename(vdir)
        ref = os.path.basename(os.path.dirname(vdir))
        probe = load(os.path.join(vdir, "probe.json")) or {}
        W, H, fps = probe.get("width", 1080), probe.get("height", 1920), probe.get("fps", 30) or 30
        e = load(ez) or {}
        for kind, fname in (("text", "text_elements.json"), ("graphic", "graphic_elements.json")):
            els = {x["id"]: x for x in (load(os.path.join(vdir, fname)) or {}).get("elements", [])}
            for f in e.get(kind, []):
                el = els.get(f["id"])
                if not el or len(el.get("track") or []) < 4:
                    continue
                style, dx, dy = classify(el["track"], f.get("fits"), W, H, fps, kind == "text")
                chans = ((f.get("fits") or {}).get("entry") or {})
                settle = 0 if style == "pop" else max((c["frames_to_settle"] for c in chans.values()), default=0)
                over = max((c["overshoot_pct"] for c in chans.values()), default=0.0)
                dom = None
                for name in ("cy", "cx", "w", "opacity"):
                    if name in chans:
                        dom = (name, chans[name]["bezier"], chans[name]["bezier_rmse"])
                        break
                b = el["track"][-1]["bbox"] if el["track"] else [0, 0, 0, 0]
                size = (b[3] - b[1]) / H * 100
                rec = {
                    "vid": vid, "id": f["id"], "entry": f["entry_frame"], "fps": fps,
                    "settle_24": round(settle * 24 / fps, 1), "overshoot": round(over, 1),
                    "dx": round(dx, 2), "dy": round(dy, 2), "size_pct_h": round(size, 2),
                    "bezier": dom, "text": (el.get("text") or "")[:40] if kind == "text" else el.get("kind"),
                }
                out.setdefault(ref, {}).setdefault(kind, {}).setdefault(style, []).append(rec)

    summary = {}
    for ref, kinds in out.items():
        for kind, styles in kinds.items():
            for style, recs in styles.items():
                moving = [r for r in recs if r["settle_24"] > 0]
                dist = [abs(r["dy"]) if style in ("rise", "drop") else abs(r["dx"]) for r in recs]
                good = sorted(
                    [r for r in recs if r["bezier"] and r["bezier"][2] <= 0.05 and r["size_pct_h"] >= 2.0],
                    key=lambda r: -r["size_pct_h"],
                )[:6]
                summary.setdefault(ref, {}).setdefault(kind, {})[style] = {
                    "n": len(recs),
                    "settle_24_median": q([r["settle_24"] for r in moving], 0.5),
                    "settle_24_iqr": [q([r["settle_24"] for r in moving], 0.25), q([r["settle_24"] for r in moving], 0.75)],
                    "dist_pct_h_median": q(dist, 0.5),
                    "overshoot_share": round(sum(1 for r in recs if r["overshoot"] > 2) / len(recs), 2),
                    "overshoot_median_when_present": q([r["overshoot"] for r in recs if r["overshoot"] > 2], 0.5),
                    "examples": good,
                }
    allk = {}
    for ref, kinds in out.items():
        for kind, styles in kinds.items():
            for style, recs in styles.items():
                allk.setdefault(kind, {}).setdefault(style, []).extend(recs)
    summary["_all"] = {}
    for kind, styles in allk.items():
        for style, recs in styles.items():
            moving = [r for r in recs if r["settle_24"] > 0]
            dist = [abs(r["dy"]) if style in ("rise", "drop") else abs(r["dx"]) for r in recs]
            summary["_all"].setdefault(kind, {})[style] = {
                "n": len(recs),
                "settle_24_median": q([r["settle_24"] for r in moving], 0.5),
                "settle_24_iqr": [q([r["settle_24"] for r in moving], 0.25), q([r["settle_24"] for r in moving], 0.75)],
                "dist_pct_h_median": q(dist, 0.5),
                "overshoot_share": round(sum(1 for r in recs if r["overshoot"] > 2) / len(recs), 2),
            }
    od = os.path.join(MEAS, "_devices")
    os.makedirs(od, exist_ok=True)
    with open(os.path.join(od, "entry_stats.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=1)
    for kind in ("text", "graphic"):
        print("==", kind)
        for style, s in sorted(summary["_all"].get(kind, {}).items(), key=lambda x: -x[1]["n"]):
            print(f"  {style:12s} n={s['n']:6d} settle24={s['settle_24_median']} iqr={s['settle_24_iqr']} "
                  f"dist%H={s['dist_pct_h_median']} over>2%={s['overshoot_share']}")


if __name__ == "__main__":
    main()
