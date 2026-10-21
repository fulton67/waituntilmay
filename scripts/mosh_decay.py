"""Build the decay composite on a test clip and report every measured number.

Three layers, same edit and timing:
  A  the current live journey mosh - pipeline.mosh, unchanged
  B  the mv-transfer layer, with its motion field made continuous
  C  the clean, un-moshed encode, as the reference A is measured against

and a control: the same encode chain with the mosh skipped, which is where
the |A-C| floor comes from.

  python scripts/mosh_decay.py --src public/mosh-lab/blum-clip-internet.mp4 \
      --name blum-internet --clip-start 385.649 --triggers 101,150
"""
import argparse
import json
import math
import os
import subprocess
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from pipeline import composite as CP          # noqa: E402
from pipeline import decay as DK              # noqa: E402
from pipeline import intensity as I           # noqa: E402
from pipeline import mosh as MOSH             # noqa: E402
from pipeline import units as U               # noqa: E402

JC_SRC = os.environ.get("JC_SRC", r"C:\Users\naimj\Downloads\videoplayback.mp4")
URL = "http://localhost:3000/mosh-lab"


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, cwd=ROOT, **kw)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default="public/mosh-lab/blum-clip-internet.mp4")
    ap.add_argument("--name", default="blum-internet")
    ap.add_argument("--outdir", default="public/mosh-lab")
    ap.add_argument("--clip-start", type=float, default=385.649)
    ap.add_argument("--triggers", default="101,150")
    ap.add_argument("--phase", type=int, default=4)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--knee", type=float, default=0.60)
    ap.add_argument("--gamma", type=float, default=1.6)
    ap.add_argument("--crf", type=int, default=20)
    ap.add_argument("--reuse", action="store_true",
                    help="keep A/C/control and the cached motion field")
    args = ap.parse_args()
    os.chdir(ROOT)

    triggers = [int(x) for x in args.triggers.split(",") if x.strip()]
    pr = CP.probe(args.src)
    n, fps = pr["frames"], pr["fps"]
    cfg = I.load_cfg()
    words = I.load_words()
    units = U.build_units()

    tmp = ".decay-test"
    os.makedirs(tmp, exist_ok=True)
    od = args.outdir
    a_mp4 = os.path.join(od, f"{args.name}-decay-A.mp4")
    b_mp4 = os.path.join(od, f"{args.name}-decay-B.mp4")
    ctl = os.path.join(tmp, f"{args.name}-ctl.mp4")
    out = os.path.join(od, f"{args.name}-decay.mp4")
    cache = os.path.join(tmp, f"{args.name}-mv")
    stats_json = os.path.join(tmp, f"{args.name}-motion.json")

    print(f"=== {args.name}: {n} frames @ {fps:g}  "
          f"{pr['w']}x{pr['h']}  clip starts {args.clip_start:.3f}s ===")

    # ---------------------------------------------------------------- A + C
    keep = args.reuse and os.path.exists(a_mp4)
    m4v_clean = os.path.join(tmp, f"{args.name}-A_src.m4v")
    m4v_mosh = os.path.join(tmp, f"{args.name}-A_mosh.m4v")
    if keep and os.path.exists(m4v_clean) and os.path.exists(m4v_mosh):
        print("\n--- layer A: reusing ---")
        a_info = json.load(open(os.path.join(tmp, f"{args.name}-A.json"),
                                encoding="utf-8"))
    else:
        print("\n--- layer A: the live journey mosh ---")
        a_info = MOSH.datamosh(args.src, a_mp4, triggers=triggers, n_frames=n,
                               gamma=1.4, peak=1.0, cfg=cfg, seed=args.seed,
                               keep_intermediate=True, fps=fps)
        for src_f, dst in ((a_info["intermediate"]["clean_m4v"], m4v_clean),
                           (a_info["intermediate"]["moshed_m4v"], m4v_mosh)):
            if os.path.abspath(src_f) != os.path.abspath(dst):
                os.replace(src_f, dst)
        a_info["intermediate"] = {"clean_m4v": m4v_clean, "moshed_m4v": m4v_mosh}
        json.dump(a_info, open(os.path.join(tmp, f"{args.name}-A.json"), "w",
                               encoding="utf-8"), indent=1)
        print(f"  moshed {a_info['moshed_frames']} of {a_info['total_vops']} VOPs")

    c_mp4 = os.path.join(tmp, f"{args.name}-C.mp4")
    if not (args.reuse and os.path.exists(c_mp4)):
        print("--- layer C: the clean encode ---")
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
             "-fflags", "+genpts", "-r", f"{fps:g}", "-f", "m4v",
             "-i", m4v_clean, "-an", "-c:v", "libx264", "-preset", "medium",
             "-crf", "18", "-pix_fmt", "yuv420p", "-r", f"{fps:g}", c_mp4])
    if not (args.reuse and os.path.exists(ctl)):
        print("--- control: same chain, mosh skipped ---")
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
             "-fflags", "+genpts", "-r", f"{fps:g}", "-f", "m4v",
             "-i", m4v_clean, "-an", "-c:v", "libx264", "-preset", "medium",
             "-crf", "20", "-pix_fmt", "yuv420p", "-r", f"{fps:g}", ctl])

    # ---------------------------------------------------------------- B
    print("\n--- layer B: mv-transfer with a continuous field ---")
    run(["node", "scripts/mosh-mv-transfer.mjs", "--src", args.src,
         "--name", args.name, "--outdir", od, "--k", "1.0",
         "--dup-p", "4", "--out-name", f"{args.name}-decay-B",
         "--mv-cache", cache, "--stats-out", stats_json, "--url", URL])
    motion = json.load(open(stats_json, encoding="utf-8"))

    # ------------------------------------------------------- the envelope
    print("\n--- intensity envelope ---")
    tl = I.Timeline.clip(args.clip_start, n, fps)
    loud = I.loudness_through(tl, JC_SRC)
    inten = I.build(tl, words, units, cfg, audio=loud,
                    trigger_frames=triggers, seed=args.seed)
    print(f"  concept words in this window: "
          f"{[h['stem'] for h in inten['concept_hits']]}")
    print(f"  env  mean {inten['env'].mean():.3f}  max {inten['env'].max():.3f}")

    # ------------------------------------------------------- the composite
    print("\n--- composite ---")
    rep = DK.build(a_mp4, b_mp4, c_mp4, out, control=ctl,
                   env=inten["env"], drift=inten["drift"], cfg=cfg,
                   concept_frames=inten["concept_hits"],
                   trigger_frames=triggers, seed=args.seed,
                   knee=args.knee, gamma=args.gamma, crf=args.crf,
                   tmp=os.path.join(tmp, "cp"), moshed_m4v=m4v_mosh)

    rep["name"] = args.name
    rep["src"] = args.src
    rep["clip_start"] = args.clip_start
    rep["triggers"] = triggers
    rep["layers"] = {"a": a_mp4, "b": b_mp4, "c": c_mp4, "control": ctl,
                     "composite": out}
    rep["a_moshed_frames"] = a_info["moshed_frames"]
    rep["motion"] = {
        "raw": {k: motion["raw"][k] for k in
                ("medianMean", "minMean", "maxMean", "minRelToMedian",
                 "maxFrameDelta", "maxFrameDeltaFrame", "worstLowFrame",
                 "meanFrameDelta", "okLevel", "okContinuity")},
        "smoothed": {k: motion["smoothed"][k] for k in
                     ("medianMean", "minMean", "maxMean", "minRelToMedian",
                      "maxFrameDelta", "maxFrameDeltaFrame", "worstLowFrame",
                      "meanFrameDelta", "okLevel", "okContinuity")},
        "smoothing": motion["smoothing"],
    }
    rep["envelope"] = {
        "per_second": inten["per_second"],
        "concept_hits": inten["concept_hits"],
        "params": inten["params"],
        "mean": round(float(inten["env"].mean()), 4),
        "max": round(float(inten["env"].max()), 4),
        "max_frame_jump": round(float(np.abs(np.diff(inten["env"])).max()), 4),
    }
    path = os.path.join(od, f"{args.name}-decay.json")
    json.dump(rep, open(path, "w", encoding="utf-8"), indent=1)
    print(f"\nreport -> {path}")
    report(rep)
    return 0


def report(rep):
    fps = rep["fps"]
    print("\n" + "=" * 96)
    print(f"DECAY COMPOSITE  {rep['name']}  {rep['frames']} frames @ {fps:g}")
    print("=" * 96)

    m = rep["motion"]
    print("\nLAYER B MOTION  (mean |mv| in pixels, per frame)")
    print(f"  {'':<12}{'median':>9}{'min':>9}{'max':>9}"
          f"{'min/median':>12}{'max d/frame':>13}{'mean d':>9}  gates")
    for k in ("raw", "smoothed"):
        s = m[k]
        g = ("level " + ("PASS" if s["okLevel"] else "FAIL")
             + "  cont " + ("PASS" if s["okContinuity"] else "FAIL"))
        print(f"  {k:<12}{s['medianMean']:>9.3f}{s['minMean']:>9.3f}"
              f"{s['maxMean']:>9.3f}{s['minRelToMedian'] * 100:>11.1f}%"
              f"{s['maxFrameDelta'] * 100:>12.2f}%{s['meanFrameDelta'] * 100:>8.2f}%"
              f"  {g}")
    s = m["smoothed"]
    print(f"  worst low frame {s['worstLowFrame']} "
          f"({s['minRelToMedian'] * 100:.1f}% of median), "
          f"worst change frame {s['maxFrameDeltaFrame']} "
          f"({s['maxFrameDelta'] * 100:.2f}%)")
    print("  gates: min/median >= 50%, frame-to-frame change < 15%")

    d = rep["detector"]
    print(f"\nWHERE A IS BROKEN  (the gate on where a square may open)")
    print(f"  |A-C| floor from control p99.5 : {d['floor_p99_5']}")
    print(f"  threshold used                 : {d['threshold']}")
    print(f"  A glitched, mean over frames   : {d['a_glitched_pct_mean']}% of macroblocks")
    if d["mv_detector_pct_mean"] is not None:
        print(f"  mv detector, for comparison    : {d['mv_detector_pct_mean']}%")

    sq = rep["squares"]
    print(f"\nSQUARES")
    print(f"  spawned {sq['spawned']}  ({sq['from_ring_pct']}% in the ring "
          f"outside existing damage)")
    print(f"  life  min {sq['life_frames']['min']}  max {sq['life_frames']['max']}"
          f"  mean {sq['life_frames']['mean']} frames")
    print(f"  fade  min {sq['fade_frames']['min']}  max {sq['fade_frames']['max']}"
          f"  mean {sq['fade_frames']['mean']} frames  "
          f"({sq['fade_clamped_pct']}% clamped short by their own life)")
    print(f"  live at once: mean {sq['live_mean']}  max {sq['live_max']}")
    cl = rep["clusters"]
    print(f"  clusters per frame, sub-cell islands : min {cl['min']}  "
          f"max {cl['max']}  mean {cl['mean']}")
    print(f"  clusters per frame, damaged regions  : min {cl['regions_min']}  "
          f"max {cl['regions_max']}  mean {cl['regions_mean']}"
          f"  (over {cl['sampled_frames']} sampled frames)")

    cov = rep["coverage"]
    env = rep["envelope"]
    print(f"\nPER SECOND")
    print(f"  {'s':>3} {'env mean':>9} {'env max':>8} {'cov mean':>9} {'cov max':>8}")
    for ps, pe in zip(cov["per_second"], env["per_second"]):
        print(f"  {ps['second']:>3} {pe['env_mean']:>9.3f} {pe['env_max']:>8.3f} "
              f"{ps['mean_pct']:>8.2f}% {ps['max_pct']:>7.2f}%")
    print(f"\n  coverage  mean {cov['mean_pct']}%  min {cov['min_pct']}%  "
          f"max {cov['max_pct']}%   target mean {rep['target']['mean_pct']}%  "
          f"max {rep['target']['max_pct']}%")
    print(f"  largest single-frame coverage change: {cov['max_frame_jump_pct']}%")
    print(f"  stretches over 1s with no change at all: {cov['flat_runs_over_1s']}")

    print(f"\nAT EACH CONCEPT WORD")
    if cov["at_concept_words"]:
        print(f"  {'word':<10}{'frame':>7}{'s':>4}{'env':>7}"
              f"{'cov':>9}{'peak <1s':>10}")
        for h in cov["at_concept_words"]:
            print(f"  {str(h['word']):<10}{h['frame']:>7}{h['second']:>4}"
                  f"{h['env']:>7.3f}{h['coverage_pct']:>8.2f}%"
                  f"{h['peak_next_1s_pct']:>9.2f}%")
    else:
        print("  (none in this window)")
    print()


if __name__ == "__main__":
    raise SystemExit(main())
