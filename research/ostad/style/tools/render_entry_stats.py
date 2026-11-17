"""render_entry_stats.py: entry / exit statistics of one of OUR renders, by the exact entry_stats.json method.

Reads <raw>/<name>/{probe,graphic_elements,text_elements}.json from render_elements.py, fits every element's entry and exit with
easing_fit.element_fits and classifies the entry with device_stats.classify (the functions that built measure/_devices/entry_stats.json).
Adds, per fitted channel, the velocity peak (where dp/dt is largest, as a share of the settle time) and, for the ExoMind render, the
entry frame minus the nearest preceding word onset (yt_words.json x 24; the rule is a reveal at onset + 1 f).

Exits (time-reversed fit, elements with a mid-shot exit): "animated" when a channel changes over >= 2 frames, else "cut".

Run: C:/Users/naimj/tools/style-venv/Scripts/python.exe -I tools/render_entry_stats.py <raw> <name> <out.json> [--words] [--caption-band y0_frac]
"""
import json
import os
import statistics as st
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
STYLE = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(os.path.dirname(STYLE)))
sys.path.insert(0, HERE)
import easing_fit  # noqa: E402
from easing_fit import bez_y_of_t, element_fits  # noqa: E402
from device_stats import classify, q  # noqa: E402

_fit_full = easing_fit.fit_track


def _fit_bezier_only(v):
    """fit_track without the damped-spring model (6 s per element on this machine; settle, overshoot and the bezier are the same
    code path, only the spring alternative and `best` are dropped)."""
    p = easing_fit.progress(v)
    if p is None:
        return None
    T = max(1, easing_fit.settle_index(p))
    over = float(max(0.0, p.max() - 1) * 100)
    n = min(len(p), T + 1)
    t = np.arange(n) / T
    y = p[:n]
    best = None
    for x0 in ([0.25, 0.1, 0.25, 1.0], [0.22, 1, 0.36, 1], [0.4, 0, 0.2, 1], [0.34, 1.56, 0.64, 1]):
        r = easing_fit.least_squares(lambda qq: bez_y_of_t(t, *qq) - y, x0, bounds=([0, -1, 0, -1], [1, 2.5, 1, 2.5]))
        if best is None or r.cost < best.cost:
            best = r
    b = best.x
    return {"frames_to_settle": T, "overshoot_pct": round(over, 2), "bezier": [round(float(x), 4) for x in b],
            "bezier_rmse": round(float(np.sqrt(np.mean((bez_y_of_t(t, *b) - y) ** 2))), 4), "n": int(len(p))}


easing_fit.fit_track = _fit_bezier_only


def peak_share(bz):
    t = np.linspace(0, 1, 201)
    y = bez_y_of_t(t, *bz)
    return round(float(t[int(np.argmax(np.gradient(y, t)))]), 2)


def _fit(args):
    el, W, H, fps = args
    return element_fits(el, W, H, fps)


def main():
    raw, name, out = sys.argv[1], sys.argv[2], sys.argv[3]
    band = float(sys.argv[sys.argv.index("--caption-band") + 1]) if "--caption-band" in sys.argv else None
    d = os.path.join(raw, name)
    P = json.load(open(os.path.join(d, "probe.json")))
    W, H, fps = P["width"], P["height"], P["fps"]
    onsets = None
    if "--words" in sys.argv:
        w = json.load(open(os.path.join(REPO, "brand", "edits", "exomind-skin", "yt_words.json"), encoding="utf-8"))
        onsets = np.array(sorted({int(round(t * fps)) for line in w for t in line}))
    recs = []
    from concurrent.futures import ProcessPoolExecutor
    pool = ProcessPoolExecutor(max_workers=10)
    for kind, fn in (("graphic", "graphic_elements.json"), ("text", "text_elements.json")):
        p = os.path.join(d, fn)
        if not os.path.exists(p):
            continue
        els = []
        for el in json.load(open(p))["elements"]:
            tr = el.get("track") or []
            if len(tr) < 4 or (kind == "graphic" and not el.get("mid_shot_entry")):
                continue
            b = tr[-1]["bbox"]
            if W > H and (b[0] + b[2]) / 2 < 740:
                continue  # landscape: the keyed presenter's side, not the graphic zone
            els.append(el)
        fits = list(pool.map(_fit, [(el, W, H, fps) for el in els], chunksize=4))
        for el, fit in zip(els, fits):
            tr = el["track"]
            b = tr[-1]["bbox"]
            sub = kind
            if kind == "text" and band is not None and b[1] >= band * H:
                sub = "caption"
            style, dx, dy = classify(tr, fit, W, H, fps, kind == "text")
            ent = (fit or {}).get("entry") or {}
            ex = (fit or {}).get("exit") or {}
            settle = 0 if style == "pop" else max((c["frames_to_settle"] for c in ent.values()), default=0)
            over = max((c["overshoot_pct"] for c in ent.values()), default=0.0)
            peaks = {k: peak_share(c["bezier"]) for k, c in ent.items() if c["frames_to_settle"] >= 3 and c["bezier_rmse"] <= 0.08}
            exit_f = max((c["frames_to_settle"] for c in ex.values()), default=0)
            r = {"kind": sub, "id": el["id"], "entry": el["entry"], "exit": el["exit"], "style": style,
                 "settle_24": round(settle * 24 / fps, 1), "overshoot": round(over, 1), "dx": round(dx, 2), "dy": round(dy, 2),
                 "peaks": peaks, "exit_24": round(exit_f * 24 / fps, 1),
                 "exit_type": "animated" if exit_f >= 2 else "cut", "mid_shot_exit": el.get("mid_shot_exit", True),
                 "life_s": round((el["exit"] - el["entry"]) / fps, 2), "text": (el.get("text") or el.get("kind") or "")[:40]}
            if onsets is not None:
                c = onsets[onsets <= el["entry"] + 6]
                r["f_minus_word"] = int(el["entry"] - c[-1]) if len(c) else None
            recs.append(r)
    summ = {}
    for sub in sorted({r["kind"] for r in recs}):
        R = [r for r in recs if r["kind"] == sub]
        styles = {}
        for s in sorted({r["style"] for r in R}):
            X = [r for r in R if r["style"] == s]
            mv = [r["settle_24"] for r in X if r["settle_24"] > 0]
            dist = [abs(r["dy"]) if s in ("rise", "drop") else abs(r["dx"]) for r in X]
            pk = [v for r in X for v in r["peaks"].values()]
            styles[s] = {"n": len(X), "share": round(len(X) / len(R), 2), "settle_24_median": q(mv, 0.5), "settle_24_iqr": [q(mv, .25), q(mv, .75)],
                         "dist_pct_h_median": q(dist, 0.5), "overshoot_share": round(sum(r["overshoot"] > 2 for r in X) / len(X), 2),
                         "velocity_peak_median": q(pk, 0.5)}
        mv = [r["settle_24"] for r in R if r["settle_24"] > 0]
        pk = [v for r in R for v in r["peaks"].values()]
        exits = [r for r in R if r["mid_shot_exit"]]
        ex_anim = [r["exit_24"] for r in exits if r["exit_type"] == "animated"]
        s = {"n": len(R), "settle_24_median": q(mv, .5), "settle_24_iqr": [q(mv, .25), q(mv, .75)], "pop_share": round(sum(r["style"] == "pop" for r in R) / len(R), 2),
             "overshoot_share": round(sum(r["overshoot"] > 2 for r in R) / len(R), 2), "velocity_peak_median": q(pk, .5),
             "exits_n": len(exits), "exit_cut_share": round(sum(r["exit_type"] == "cut" for r in exits) / max(1, len(exits)), 2),
             "exit_animated_24_median": q(ex_anim, .5), "life_s_median": q([r["life_s"] for r in R], .5), "styles": styles}
        if onsets is not None:
            fw = [r["f_minus_word"] for r in R if r.get("f_minus_word") is not None]
            s["f_minus_word"] = {"n": len(fw), "median": q(fw, .5), "iqr": [q(fw, .25), q(fw, .75)],
                                 "on_word_0_to_3": round(sum(0 <= v <= 3 for v in fw) / max(1, len(fw)), 2),
                                 "early_lt_0": round(sum(v < 0 for v in fw) / max(1, len(fw)), 2),
                                 "late_gt_6": round(sum(v > 6 for v in fw) / max(1, len(fw)), 2)}
        summ[sub] = s
    json.dump({"render": name, "probe": P, "summary": summ, "elements": recs}, open(out, "w"), indent=1)
    print(json.dumps(summ, indent=1))


if __name__ == "__main__":
    main()
