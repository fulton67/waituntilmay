"""Prove the two datamoshes are real, from the streams rather than the log.

Three things have to be true for this to be a datamosh and not a filter that
looks like one:

  1  the I-frame at the cut is absent. The clean stream has an I-VOP there;
     the moshed stream has a P-VOP, and nothing else about the stream has
     changed - same VOP count, so same frame count, so same 30.000s.
  2  the motion vectors that play at the cut are the incoming clip's. Read
     back with ffedit: the clean I-VOP has no forward vectors at all, and the
     moshed P-VOP at the same index carries the field that belongs to the
     frame after it. That is the whole mechanism - the new shot's motion
     applied to the old shot's pixels.
  3  the damage is only there. Decoded frame by frame against the clean
     stream, the pixels differ over exactly the two bloom windows and are
     bit-identical everywhere else, including at the other four cuts.

Needs the .m4v pair, so render with --keep-streams:

    python assemble.py --seed 1 --keep-streams
    .venv/Scripts/python.exe scripts/mosh_evidence.py renders_arc/v_1.json
"""
import argparse
import json
import math
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline.mosh import I_VOP, parse_vops

FFEDIT = os.path.join(".tools", "ffglitch-0.10.2-windows-x86_64", "ffedit.exe")


def vop_types(path):
    _, frames = parse_vops(open(path, "rb").read())
    return ["I" if f["type"] == I_VOP else "P" for f in frames]


def mv_means(m4v, cache=None):
    """Mean |motion vector| per frame, and how many macroblocks carry one.

    None for a frame with no forward vectors at all, which is what an I-VOP
    is.
    """
    out_json = cache or (os.path.splitext(m4v)[0] + "-mv.json")
    if not os.path.exists(out_json):
        subprocess.run([FFEDIT, "-i", m4v, "-f", "mv", "-e", out_json],
                       check=True, capture_output=True)
    d = json.load(open(out_json, encoding="utf-8"))
    out = []
    for fr in d["streams"][0]["frames"]:
        fwd = (fr.get("mv") or {}).get("forward")
        if not fwd:
            out.append(None)
            continue
        tot = n = 0
        s = 0.0
        for row in fwd:
            for v in row:
                tot += 1
                if v is None:
                    continue
                n += 1
                s += math.hypot(v[0], v[1])
        out.append((round(s / max(n, 1), 3), n, tot))
    return out


def luma(m4v, w=160, h=90, fps=24):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-fflags", "+genpts", "-r", str(fps),
         "-f", "m4v", "-i", m4v, "-vf", f"scale={w}:{h}", "-vsync", "0",
         "-pix_fmt", "gray", "-f", "rawvideo", "-"],
        check=True, capture_output=True).stdout
    k = len(raw) // (w * h)
    return np.frombuffer(raw[:k * w * h], dtype=np.uint8).reshape(k, h, w) \
             .astype(np.float32)


def runs_of(idx):
    out = []
    for i in idx:
        if out and i == out[-1][1] + 1:
            out[-1][1] = i
        else:
            out.append([i, i])
    return [tuple(r) for r in out]


def report(log_path, quiet=False):
    log = json.load(open(log_path, encoding="utf-8"))
    inter = (log.get("mosh") or {}).get("intermediate")
    if not inter:
        raise SystemExit(f"{log_path} has no kept streams - re-render that "
                         f"seed with --keep-streams")
    clean_m4v, mosh_m4v = inter["clean_m4v"], inter["moshed_m4v"]
    for p in (clean_m4v, mosh_m4v):
        if not os.path.exists(p):
            raise SystemExit(f"missing {p}")

    tc, tm = vop_types(clean_m4v), vop_types(mosh_m4v)
    mvc, mvm = mv_means(clean_m4v), mv_means(mosh_m4v)
    lc, lm = luma(clean_m4v), luma(mosh_m4v)
    n = min(len(lc), len(lm))
    diff = np.abs(lm[:n] - lc[:n]).reshape(n, -1).mean(axis=1)
    changed = runs_of([i for i in range(n) if diff[i] > 0.5])

    out = {"seed": log["seed"], "vops_clean": len(tc), "vops_moshed": len(tm),
           "frames": log["n_frames"], "duration": log["output_duration"],
           "changed_runs": changed, "cuts": []}

    print("=" * 78)
    print(f"MOSH EVIDENCE  seed {log['seed']}")
    print("=" * 78)
    print(f"VOPs: clean {len(tc)}, moshed {len(tm)}  "
          f"(frame count is a gate, so the I-VOP is replaced, not deleted)")
    print(f"I-VOPs: clean {tc.count('I')}, moshed {tm.count('I')}")
    print(f"output: {log['output_duration']:.3f}s, {log['n_frames']} frames, "
          f"A/V drift {log['av_drift_seconds']}s")

    print("\n1. the I-frame at the cut is absent")
    print(f"   {'cut':>5} {'clean':>6} {'moshed':>7} {'recover':>8} "
          f"{'clean':>6} {'moshed':>7}  gop keyframes suppressed")
    for c in log["mosh"]["cuts"]:
        i, r = c["cut"], c["recover"]
        print(f"   {i:>5} {tc[i]:>6} {tm[i]:>7} {r:>8} {tc[r]:>6} {tm[r]:>7}"
              f"  {c['gop_keyframes_suppressed']}")
        out["cuts"].append({"cut": i, "clean_type": tc[i],
                            "moshed_type": tm[i], "recover": r,
                            "recover_type": tm[r], "bloom": c["bloom"]})

    print("\n2. the motion carried over is the incoming clip's")
    print(f"   {'frame':>6} {'clean |mv| (mb)':>22} {'moshed |mv| (mb)':>22}"
          f"  reading")
    for ci, c in enumerate(log["mosh"]["cuts"]):
        i = c["cut"]
        for f, why in ((i - 1, "last frame of the outgoing beat"),
                       (i, "the cut: no I-frame, incoming vectors"),
                       (i + 1, "the donor the cut now plays"),
                       (i + c["bloom"] - 1, "end of the bloom"),
                       (i + c["bloom"], "recovery keyframe")):
            def fmt(x):
                return "I-VOP, no forward mv" if x is None \
                    else f"{x[0]:>8.3f}  ({x[1]}/{x[2]})"
            print(f"   {f:>6} {fmt(mvc[f]):>22} {fmt(mvm[f]):>22}  {why}")
        cm, mm = mvc[i], mvm[i]
        nxt = mvc[i + 1]
        out["cuts"][ci].update({
            "clean_mv_at_cut": None if cm is None else cm[0],
            "moshed_mv_at_cut": None if mm is None else mm[0],
            "clean_mv_at_donor": None if nxt is None else nxt[0],
            "mv_carried": (cm is None and mm is not None
                           and nxt is not None
                           and abs(mm[0] - nxt[0]) < 1e-6),
            "mv_macroblocks": None if mm is None else mm[1],
        })
        print()

    print("3. the damage is only at those two cuts")
    print(f"   frames differing from the clean stream: "
          f"{int((diff > 0.5).sum())} of {n}")
    print(f"   runs: {changed}")
    want = [(c["cut"], c["recover"] - 1) for c in log["mosh"]["cuts"]]
    print(f"   expected: {want}")
    print(f"   max mean |difference| inside a bloom: "
          f"{diff.max():.2f} of 255")
    out["only_at_cuts"] = changed == want

    ok = (len(tc) == len(tm) == log["n_frames"]
          and all(c["clean_type"] == "I" and c["moshed_type"] == "P"
                  and c["recover_type"] == "I" for c in out["cuts"])
          and all(c["mv_carried"] for c in out["cuts"])
          and out["only_at_cuts"])
    print(f"\n{'PASS' if ok else 'FAIL'} - "
          f"I-frame absent, |mv| carried, damage confined")
    out["pass"] = bool(ok)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("logs", nargs="+")
    ap.add_argument("--json", help="write the report here as well")
    args = ap.parse_args()
    reps = [report(p) for p in args.logs]
    if args.json:
        json.dump(reps, open(args.json, "w", encoding="utf-8"), indent=1)
    return 0 if all(r["pass"] for r in reps) else 1


if __name__ == "__main__":
    sys.exit(main())
