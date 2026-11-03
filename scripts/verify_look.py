"""What the look did to one version, measured against the same cut unshaded.

Three claims, and each of them is a number here rather than a screenshot.

1. STILL BACKGROUND, measured twice, because one number on its own would
   be misleading either way round. The same version's cut is built out of
   the UNSHADED bank clips and compared frame for frame. A pixel the
   unshaded cut did not change between one frame and the next is "still"; a
   still pixel the shaded cut still agrees with is "clean".

   Every still pixel is the first number, and it is pulled down by
   something that is not a failure of this design: once a macroblock has
   been pushed, every skipped block after it repeats that push until the
   next keyframe, and a bank clip has exactly one keyframe, at its head. A
   shot that moves and then settles therefore reads as dirty for as long as
   it stays settled. That is what a datamosh is, and it is why the lab
   measures the same thing twice.

   The second number is the one that tests the claim actually being made -
   that nothing here invents motion where the footage had none. It counts
   only still pixels whose macroblock has not moved at any point since the
   start of its clip, so damage that arrived legitimately, earlier, cannot
   be charged to a block that was never touched.

2. THE FOLD TRACKS THE MAP. The fold is set to `inside-reveals`, so it is
   supposed to act where the damage map says and nowhere else. The shader
   measures both: how the fold's attention divides over the map's three
   channels, and how the map itself divides. If the fold tracked something
   other than the map those two distributions would come apart, so the
   number reported is the largest difference between them in percentage
   points, over the clips this version actually drew.

3. THE TRANSITIONS STILL CARRY. Left to scripts/mosh_evidence.py, which
   reads the elementary streams: it is the same test as before the look
   existed, run on footage that now has the look under it.

    .venv/Scripts/python.exe assemble_bank.py --seed 1 --keep-clean --keep-streams
    .venv/Scripts/python.exe scripts/verify_look.py --log renders_bank/v_1.json
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))
from pipeline import bank as BK                                  # noqa: E402
from pipeline import media as M                                  # noqa: E402

W, H = 640, 360
STILL = 2.0          # a pixel the footage moved by no more than this is still
# How far the look may be from the footage and still count as agreeing with
# it, in luma units of 255. Three of them, because one would be a guess:
# everything here passes through JPEG, H.264, MPEG-4 at qscale 3 and H.264
# again, and at 6 that chain alone disagrees with itself over most of the
# frame. The control - the same look with the underlayer at 0, whose output
# is layer C to the bit - is what separates the two, and --control prints it
# beside the render.
CLEANS = (6.0, 12.0, 20.0)
CLEAN = CLEANS[0]


def gray_of(paths, w=W, h=H):
    """Decode a list of jpgs to one grey array, in order, at full size."""
    lst = os.path.join(os.environ.get("TEMP", "."), "_vl_concat.txt")
    M.write_concat_list(lst, paths)
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst,
         "-vf", f"scale={w}:{h}", "-vsync", "0", "-pix_fmt", "gray",
         "-f", "rawvideo", "-"], check=True, capture_output=True).stdout
    n = len(raw) // (w * h)
    return np.frombuffer(raw[:n * w * h], np.uint8).reshape(n, h, w) \
             .astype(np.float32)


def frame_lists(log, bank, lookdir):
    """The version's frames, shaded and unshaded, in the same order.

    The unshaded list is built from the media cache the bank was cut out of,
    so it is the same jpgs the shaded clips were made from - the comparison
    is the look and nothing else, with no second decode of the source and no
    second encode in the way.
    """
    shaded, control, starts = [], [], []
    for s in log["segments"]:
        clip = bank["by_id"][s["clip"]]
        cdir = os.path.join(M.CACHE, "frames", clip["span_key"])
        meta = json.load(open(os.path.join(cdir, "meta.json"),
                              encoding="utf-8"))
        raw = [os.path.join(cdir, f) for f in meta["frames"]]
        if s["kind"] == "hold":
            # the breath is the last played frame, repeated
            shaded += [shaded[-1]] * s["n_frames"]
            control += [control[-1]] * s["n_frames"]
            continue
        n = s["n_frames"]
        starts.append(len(shaded))
        shaded += [os.path.join(lookdir, clip["id"], f"f_{i:05d}.jpg")
                   for i in range(n)]
        control += raw[:n]
    return shaded, control, starts


def still_report(shaded, control, starts, mb=16):
    """Still pixels, and the ones whose block has never moved at all.

    `starts` are the output frames a clip begins on, which is where the
    "never moved since the keyframe" accumulator resets - a bank clip has
    one keyframe and it is at its head, so a new clip is a clean slate.
    """
    a = gray_of(shaded)
    b = gray_of(control)
    n = min(len(a), len(b))
    a, b = a[:n], b[:n]
    moved = np.abs(np.diff(b, axis=0))          # the footage's own change
    still = moved <= STILL
    diff = np.abs(a[1:] - b[1:])

    # 360 is not a multiple of 16, so the bottom row of macroblocks is a
    # partial one. Pad it out with zeros - no motion - and crop the answer
    # back, rather than quietly dropping the last eight rows of the picture.
    rows, cols = -(-H // mb), -(-W // mb)
    pad = rows * mb - H
    padded = (np.pad(moved, ((0, 0), (0, pad), (0, 0))) if pad else moved)
    blocks = padded.reshape(n - 1, rows, mb, cols, mb).max(axis=(2, 4))
    touched = np.zeros((n - 1, rows, cols), bool)
    acc = np.zeros((rows, cols), bool)
    reset = set(starts)
    for f in range(n - 1):
        if f in reset:
            acc[:] = False
        acc |= blocks[f] > STILL
        touched[f] = acc
    untouched = np.repeat(np.repeat(~touched, mb, axis=1),
                          mb, axis=2)[:, :H, :W]
    ut = still & untouched

    total, ut_total = int(still.sum()), int(ut.sum())
    tol = {}
    for c in CLEANS:
        agree = diff <= c
        tol[c] = {
            "clean_px": int((still & agree).sum()),
            "clean_pct": round(100.0 * int((still & agree).sum())
                               / max(total, 1), 2),
            "untouched_clean_px": int((ut & agree).sum()),
            "untouched_clean_pct": round(100.0 * int((ut & agree).sum())
                                         / max(ut_total, 1), 2),
        }

    agree = diff <= CLEAN
    per_sec = []
    for sec in range(int(np.ceil((n - 1) / M.FPS))):
        f0, f1 = int(sec * M.FPS), min(int((sec + 1) * M.FPS), n - 1)
        if f1 <= f0:
            break
        st, u = still[f0:f1], ut[f0:f1]
        t, tu = int(st.sum()), int(u.sum())
        per_sec.append({
            "second": sec,
            "camera_pct": round(100.0 * float((~st).mean()), 1),
            "still_px": t,
            "clean_pct": round(100.0 * int((st & agree[f0:f1]).sum()) / t, 2)
            if t else None,
            "untouched_px": tu,
            "untouched_clean_pct":
                round(100.0 * int((u & agree[f0:f1]).sum()) / tu, 2)
                if tu else None,
            "mean_difference": round(float(diff[f0:f1][st].mean()), 2)
            if t else None,
        })
    return {"frames": n, "still_px": total, "untouched_px": ut_total,
            "still_threshold": STILL, "tolerances": tol,
            "mean_difference_on_still": round(float(diff[still].mean()), 2),
            "per_second": per_sec}


def fold_report(log, shade):
    """How the fold's attention divides against how the map divides."""
    by_id = {r["id"]: r for r in shade["per_clip"] if r.get("damage_split")}
    rows = []
    for s in log["segments"]:
        if s["kind"] != "speech":
            continue
        r = by_id.get(s["clip"])
        if not r:
            continue
        d = r["damage_split"]
        ft, mt = d["foldTotal"], d["mapTotal"]
        if ft <= 0 or mt <= 0:
            continue
        f = [x / ft for x in d["fold"]]
        m = [x / mt for x in d["map"]]
        rows.append({
            "clip": s["clip"],
            "fold_share_pct": round(100.0 * ft / mt, 2),
            "fold": [round(100 * x, 1) for x in f],
            "map": [round(100 * x, 1) for x in m],
            "max_gap_pts": round(100 * max(abs(x - y) for x, y in zip(f, m)), 2),
        })
    if not rows:
        return {"clips": 0}
    return {
        "clips": len(rows),
        "channels": ["block", "organic", "stretch"],
        "fold_share_pct": round(sum(r["fold_share_pct"] for r in rows)
                                / len(rows), 2),
        "max_gap_pts": round(max(r["max_gap_pts"] for r in rows), 2),
        "mean_gap_pts": round(sum(r["max_gap_pts"] for r in rows)
                              / len(rows), 2),
        "per_clip": rows,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--log", default="renders_bank/v_1.json")
    ap.add_argument("--bank", default=None)
    ap.add_argument("--control", default=None,
                    help="a render of the same seed with the underlayer at "
                         "0, which is the pipeline's own noise floor")
    ap.add_argument("--json", default=None)
    args = ap.parse_args()

    log = json.load(open(args.log, encoding="utf-8"))
    bank = BK.load(args.bank)
    lookdir = BK.look_dir(log["look"])
    shade = json.load(open(os.path.join(lookdir, "shade.json"),
                           encoding="utf-8"))

    shaded, control, starts = frame_lists(log, bank, lookdir)
    if len(shaded) != len(control):
        raise SystemExit(f"{len(shaded)} shaded frames against "
                         f"{len(control)} unshaded")

    print("=" * 78)
    print(f"THE LOOK, MEASURED   seed {log['seed']}   look {log['look']}")
    print("=" * 78)
    print(f"fold {shade['fold']['amount']} ({shade['fold']['where']}, centre "
          f"{shade['fold']['center']})   underlayer strength "
          f"{shade['underlayer']['strength']}")
    print(f"curve {'on' if shade['curveEnabled'] else 'off'}"
          f"{', blended with the words' if shade.get('curveBlend') else ''}")
    print(f"{len(shaded)} frames, {log['n_phrases']} phrases")

    st = still_report(shaded, control, starts)
    ctl = None
    if args.control:
        clog = json.load(open(args.control, encoding="utf-8"))
        cdir = BK.look_dir(clog["look"])
        cshaded, ccontrol, cstarts = frame_lists(clog, bank, cdir)
        ctl = still_report(cshaded, ccontrol, cstarts)
        cl = json.load(open(os.path.join(cdir, "shade.json"),
                            encoding="utf-8"))
        print(f"control: look {clog['look']}, underlayer strength "
              f"{cl['underlayer']['strength']} - the same chain with the look "
              f"turned off")

    print("\n1. the still background")
    print(f"   a pixel the footage moved by <= {STILL:.0f} of 255 between one "
          f"frame and the next is still.")
    print(f"   still pixels                          {st['still_px']:>12,}")
    print(f"   of those, in a block that never moved {st['untouched_px']:>12,}")
    print(f"   mean difference on a still pixel      "
          f"{st['mean_difference_on_still']:>12.2f} of 255"
          + (f"   (control {ctl['mean_difference_on_still']:.2f})" if ctl
             else ""))
    print(f"\n   {'tol':>5} {'still clean':>12} {'untouched clean':>16}"
          + ("   control still / untouched     the look's own cost" if ctl
             else ""))
    for c in CLEANS:
        row = (f"   {c:>5.0f} {st['tolerances'][c]['clean_pct']:>11.2f}% "
               f"{st['tolerances'][c]['untouched_clean_pct']:>15.2f}%")
        if ctl:
            a = ctl["tolerances"][c]
            b = st["tolerances"][c]
            row += (f"   {a['clean_pct']:>7.2f}% / {a['untouched_clean_pct']:>7.2f}%"
                    f"      {b['clean_pct'] - a['clean_pct']:>+6.2f} pts / "
                    f"{b['untouched_clean_pct'] - a['untouched_clean_pct']:>+6.2f} pts")
        print(row)
    print(f"\n   {'s':>3} {'camera%':>8} {'still px':>10} {'clean%':>8}"
          f" {'untouched':>10} {'clean%':>8} {'mean diff':>10}")
    for r in st["per_second"]:
        print(f"   {r['second']:>3} {r['camera_pct']:>8.1f} "
              f"{r['still_px']:>10,} "
              + (f"{r['clean_pct']:>8.2f}" if r["clean_pct"] is not None
                 else f"{'-':>8}")
              + f" {r['untouched_px']:>10,} "
              + (f"{r['untouched_clean_pct']:>8.2f}"
                 if r["untouched_clean_pct"] is not None else f"{'-':>8}")
              + (f" {r['mean_difference']:>10.2f}"
                 if r["mean_difference"] is not None else f" {'-':>10}"))

    fd = fold_report(log, shade)
    print("\n2. the fold tracks the map")
    if not fd["clips"]:
        print("   the fold is off in this look, so there is nothing to track")
    else:
        print(f"   over the {fd['clips']} clips this version draws, the fold "
              f"acts on {fd['fold_share_pct']:.1f}% of the damage map")
        print(f"   its share of each channel against the map's own share, "
              f"worst gap {fd['max_gap_pts']:.2f} points "
              f"(mean {fd['mean_gap_pts']:.2f})")
        print(f"\n   {'clip':<22} {'fold%':>6}  "
              f"{'fold b/o/s':>18}  {'map b/o/s':>18} {'gap':>6}")
        for r in fd["per_clip"]:
            print(f"   {r['clip']:<22} {r['fold_share_pct']:>6.1f}  "
                  f"{'/'.join(f'{x:4.1f}' for x in r['fold']):>18}  "
                  f"{'/'.join(f'{x:4.1f}' for x in r['map']):>18} "
                  f"{r['max_gap_pts']:>6.2f}")

    out = {"seed": log["seed"], "look": log["look"],
           "still_background": st, "fold": fd,
           "control": ctl, "control_log": args.control}
    if args.json:
        json.dump(out, open(args.json, "w", encoding="utf-8"), indent=1)
        print(f"\n-> {args.json}")
    print("\n3. the transitions: scripts/mosh_evidence.py "
          f"{os.path.basename(args.log)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
