"""Composite the journey mosh with the mv-transfer layer through a block mask.

Three layers, same edit and timing:

  A  the journey mosh - I-VOPs replaced by stale P-VOPs, P-frame blooms.
     This is the base: what is live now.
  B  the mv-transfer layer - the source's encoded motion driven by the
     shader's field, with a P-VOP repeated every N frames so the
     displacement compounds instead of resetting.
  C  the clean, un-moshed edit. Reference only; never shown.

The output is A everywhere except inside blocks the mask calls "glitched",
which show B. Hard 16x16 edges, no feathering: the point is that the glitch
squares become windows.

Two detectors are built and scored against ground truth before one is used:

  diff  per-block mean |A - C| on luma. Measures the visible damage, but
        every block also carries the MPEG-4 and H.264 quantisation noise of
        A's own encode, so it needs a measured floor.
  mv    per-block |mv_A - mv_clean| in half-pel, from the two elementary
        streams. A moshed frame carries the donor's vectors, so this reads
        the disagreement between the motion that is coded and the motion
        that should be there. Zero by construction where nothing was moved.

datamosh() reports exactly which frames it touched, so both detectors can be
scored on frame-level ground truth rather than by eye.

Deterioration:
  - the mask threshold is the (1 - curve(i)) quantile of that frame's block
    scores, so the escalation curve sets coverage directly: nothing at the
    start, up to `peak` at the end, with `gamma` (the phase) as steepness
  - an absolute measured floor sits under the quantile, so a quiet block
    never opens just because the quantile fell. Full coverage is therefore
    possible but never forced
  - once open, a block stays open, and the mask is advected along A's own
    motion vectors each frame, so a drag pulls its B space with it
  - a trigger word opens a burst of blocks around that frame's moving region

  python scripts/mosh_composite.py --a a.mp4 --b b.mp4 --c c.mp4 \
      --clean-m4v a_src.m4v --moshed-m4v a_mosh.m4v --control ctrl.mp4 \
      --out out.mp4 --triggers 101,150 --gamma 1.4 --peak 1.0
"""
import argparse
import json
import math
import os
import subprocess
import sys

import numpy as np

FFEDIT = os.path.join(".tools", "ffglitch-0.10.2-windows-x86_64", "ffedit.exe")
BIG = 4096.0          # score for an intra/inter mismatch: no vector at all


# --------------------------------------------------------------- media io
def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_frames",
         "-show_entries", "stream=width,height,r_frame_rate,nb_read_frames",
         "-show_entries", "format=duration", "-of", "json", path],
        check=True, capture_output=True, text=True).stdout
    d = json.loads(out)
    s = d["streams"][0]
    num, den = (s["r_frame_rate"].split("/") + ["1"])[:2]
    return {"w": s["width"], "h": s["height"], "fps": float(num) / float(den),
            "frames": int(s["nb_read_frames"]),
            "duration": float(d["format"]["duration"])}


def reader(path, w, h, gray=False):
    """Yield decoded frames as numpy arrays, streamed - never all at once."""
    fmt = "gray" if gray else "rgb24"
    size = w * h * (1 if gray else 3)
    p = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", path, "-f", "rawvideo",
         "-pix_fmt", fmt, "-"],
        stdout=subprocess.PIPE, bufsize=size * 4)
    try:
        while True:
            buf = p.stdout.read(size)
            if len(buf) < size:
                break
            a = np.frombuffer(buf, np.uint8)
            yield a.reshape((h, w) if gray else (h, w, 3))
    finally:
        p.stdout.close()
        p.wait()


# ------------------------------------------------------- block arithmetic
def block_mean(img, rows, cols, mb):
    """Mean of each macroblock, handling a partial last row/column."""
    h, w = img.shape[:2]
    pad = np.zeros((rows * mb, cols * mb), np.float32)
    cnt = np.zeros((rows * mb, cols * mb), np.float32)
    pad[:h, :w] = img
    cnt[:h, :w] = 1.0
    s = pad.reshape(rows, mb, cols, mb).sum(axis=(1, 3))
    n = cnt.reshape(rows, mb, cols, mb).sum(axis=(1, 3))
    return s / np.maximum(n, 1.0)


def luma(rgb):
    f = rgb.astype(np.float32)
    return 0.299 * f[:, :, 0] + 0.587 * f[:, :, 1] + 0.114 * f[:, :, 2]


# ------------------------------------------------------- motion vectors
def export_mv(m4v, out_json):
    subprocess.run([FFEDIT, "-i", m4v, "-f", "mv", "-e", out_json],
                   check=True, capture_output=True)
    return json.load(open(out_json, encoding="utf-8"))


def mv_arrays(doc, rows, cols, n):
    """-> (mv [n,rows,cols,2] float32, has [n,rows,cols] bool).

    `has` is False for an intra-coded macroblock or a frame with no vectors
    at all (an I-VOP), which is a different thing from a zero vector.
    """
    mv = np.zeros((n, rows, cols, 2), np.float32)
    has = np.zeros((n, rows, cols), bool)
    frames = doc["streams"][0]["frames"]
    for i in range(min(n, len(frames))):
        fwd = frames[i].get("mv", {}).get("forward")
        if not fwd:
            continue
        for r in range(min(rows, len(fwd))):
            row = fwd[r]
            for c in range(min(cols, len(row))):
                v = row[c]
                if v is None:
                    continue
                mv[i, r, c, 0] = v[0]
                mv[i, r, c, 1] = v[1]
                has[i, r, c] = True
    return mv, has


# ------------------------------------------------------------ the curve
def curve(i, n, gamma, peak):
    """0 at the start, `peak` at the end; gamma sets the steepness.

    Same function the journey mosh escalates with, so the mask opens on the
    same schedule the underlying corruption does.
    """
    if n <= 1:
        return 0.0
    return peak * (i / (n - 1)) ** gamma


# ----------------------------------------------------------- mask growth
def advect(open_prev, acc, mv_f, has_f, mb):
    """Pull the open mask along the motion, accumulating sub-block drift.

    A forward MV is (reference position - current position) in half-pel, so
    the content now at block p came from p + mv. If that source block was
    open, this one opens: the B space travels with the drag.

    The catch is scale. A 16 px macroblock needs 32 half-pel of motion to
    move one whole block, and ordinary footage codes a couple of pixels a
    frame, so rounding each frame on its own throws nearly all of the drag
    away. `acc` therefore carries the fractional displacement forward and
    only the whole-block part is spent, so a slow pan still drags the mask.

    Returns (advected mask, updated accumulator).
    """
    rows, cols = open_prev.shape
    rr, cc = np.meshgrid(np.arange(rows), np.arange(cols), indexing="ij")
    acc = acc.copy()
    acc[:, :, 0] += np.where(has_f, mv_f[:, :, 0] / (2.0 * mb), 0.0)
    acc[:, :, 1] += np.where(has_f, mv_f[:, :, 1] / (2.0 * mb), 0.0)
    dc = np.rint(acc[:, :, 0]).astype(np.int32)
    dr = np.rint(acc[:, :, 1]).astype(np.int32)
    acc[:, :, 0] -= dc                      # keep only the remainder
    acc[:, :, 1] -= dr
    sr = np.clip(rr + dr, 0, rows - 1)
    sc = np.clip(cc + dc, 0, cols - 1)
    return open_prev[sr, sc], acc


def burst(mag, rows, cols, radius, quantile=0.75):
    """Blocks around the moving region: a disc on the motion centroid."""
    m = np.zeros((rows, cols), bool)
    if not np.any(mag > 0):
        return m
    thr = np.quantile(mag[mag > 0], quantile)
    hot = mag >= thr
    if not hot.any():
        return m
    rr, cc = np.nonzero(hot)
    wgt = mag[hot]
    r0 = float(np.average(rr, weights=wgt))
    c0 = float(np.average(cc, weights=wgt))
    gr, gc = np.meshgrid(np.arange(rows), np.arange(cols), indexing="ij")
    m |= ((gr - r0) ** 2 + (gc - c0) ** 2) <= radius ** 2
    m |= hot                      # and the moving blocks themselves
    return m


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--a", required=True, help="journey mosh (base)")
    ap.add_argument("--b", required=True, help="mv-transfer layer (window)")
    ap.add_argument("--c", required=True, help="clean edit (reference)")
    ap.add_argument("--clean-m4v", required=True)
    ap.add_argument("--moshed-m4v", required=True)
    ap.add_argument("--control", default=None,
                    help="clean edit through A's encode chain, un-moshed; "
                         "sets the measured noise floor for the diff detector")
    ap.add_argument("--out", required=True)
    ap.add_argument("--report", default=None)
    ap.add_argument("--triggers", default="")
    ap.add_argument("--ground-truth", default="",
                    help="comma list of frames datamosh actually touched")
    ap.add_argument("--gamma", type=float, default=1.4)
    ap.add_argument("--peak", type=float, default=1.0)
    ap.add_argument("--mb", type=int, default=16)
    ap.add_argument("--burst-radius", type=float, default=6.0)
    ap.add_argument("--detector", default="auto",
                    choices=["auto", "diff", "mv"])
    ap.add_argument("--crf", type=int, default=23)
    ap.add_argument("--tmp", default=".mosh-composite")
    args = ap.parse_args()

    os.makedirs(args.tmp, exist_ok=True)
    pa, pc = probe(args.a), probe(args.c)
    n = min(pa["frames"], pc["frames"], probe(args.b)["frames"])
    w, h, fps, mb = pc["w"], pc["h"], pc["fps"], args.mb
    rows, cols = math.ceil(h / mb), math.ceil(w / mb)
    nblocks = rows * cols
    triggers = [int(x) for x in args.triggers.split(",") if x.strip()]
    truth = sorted(int(x) for x in args.ground_truth.split(",") if x.strip())

    print(f"frames {n}  {w}x{h} @ {fps:g}  grid {cols}x{rows} = {nblocks} blocks")
    print(f"curve gamma={args.gamma} peak={args.peak}  triggers {triggers or '-'}")

    # ---------------------------------------------- 1. motion vector fields
    print("\n--- motion vectors from both elementary streams ---")
    mv_clean, has_clean = mv_arrays(
        export_mv(args.clean_m4v, os.path.join(args.tmp, "mv-clean.json")),
        rows, cols, n)
    mv_mosh, has_mosh = mv_arrays(
        export_mv(args.moshed_m4v, os.path.join(args.tmp, "mv-mosh.json")),
        rows, cols, n)
    mag_mosh = np.hypot(mv_mosh[:, :, :, 0], mv_mosh[:, :, :, 1])
    print(f"  clean stream: {has_clean.sum()} inter blocks, "
          f"mean |mv| {np.hypot(*[mv_clean[:, :, :, k][has_clean] for k in (0, 1)]).mean():.2f} half-pel")
    print(f"  moshed stream: {has_mosh.sum()} inter blocks, "
          f"mean |mv| {mag_mosh[has_mosh].mean():.2f} half-pel")

    # mv detector score: how far the coded motion is from the true motion
    d = np.hypot(mv_mosh[:, :, :, 0] - mv_clean[:, :, :, 0],
                 mv_mosh[:, :, :, 1] - mv_clean[:, :, :, 1])
    mismatch = has_mosh != has_clean
    score_mv = np.where(mismatch, BIG, d).astype(np.float32)

    # ------------------------------------------------- 2. pixel diff scores
    print("\n--- pass 1: |A - C| per macroblock ---")
    score_diff = np.zeros((n, rows, cols), np.float32)
    ra, rc = reader(args.a, w, h), reader(args.c, w, h, gray=True)
    for i in range(n):
        try:
            fa, fc = next(ra), next(rc)
        except StopIteration:
            n = i
            break
        score_diff[i] = block_mean(np.abs(luma(fa) - fc.astype(np.float32)),
                                   rows, cols, mb)
        if i % 60 == 0:
            sys.stdout.write(f"\r  frame {i}/{n}   ")
    sys.stdout.write("\n")
    score_diff = score_diff[:n]
    score_mv = score_mv[:n]

    # the floor: what |A - C| looks like where nothing was moshed at all
    floor_diff = 6.0
    if args.control:
        print("--- noise floor from the un-moshed control ---")
        ctl = np.zeros((n, rows, cols), np.float32)
        r1, r2 = reader(args.control, w, h), reader(args.c, w, h, gray=True)
        for i in range(n):
            try:
                f1, f2 = next(r1), next(r2)
            except StopIteration:
                break
            ctl[i] = block_mean(np.abs(luma(f1) - f2.astype(np.float32)),
                                rows, cols, mb)
        floor_diff = float(np.quantile(ctl, 0.995))
        print(f"  control |A-C|: mean {ctl.mean():.2f}  p99.5 {floor_diff:.2f}"
              f"  max {ctl.max():.2f}  (same encode chain, no mosh)")
    floor_mv = 4.0            # 2 px: below this it is rounding, not a move

    # ------------------------------------------- 3. score the two detectors
    print("\n=== detector reliability (frame-level ground truth) ===")
    rep_det = {}
    if truth:
        tset = np.zeros(n, bool)
        tset[[t for t in truth if t < n]] = True
        print(f"{'detector':<10}{'untouched':>12}{'moshed':>12}{'ratio':>9}"
              f"{'overlap':>10}{'floor':>9}")
        for name, sc, floor in (("diff", score_diff, floor_diff),
                                ("mv", score_mv, floor_mv)):
            per = (sc > floor).mean(axis=(1, 2)) * 100.0     # % blocks flagged
            u, m = per[~tset], per[tset]
            if not len(u) or not len(m):
                continue
            ratio = (m.mean() / u.mean()) if u.mean() > 0 else float("inf")
            # how often an untouched frame looks as flagged as a moshed one
            overlap = float((u > np.quantile(m, 0.05)).mean() * 100.0)
            rep_det[name] = {"untouched_pct": float(u.mean()),
                             "moshed_pct": float(m.mean()),
                             "ratio": float(ratio), "overlap_pct": overlap,
                             "floor": float(floor)}
            print(f"{name:<10}{u.mean():>11.2f}%{m.mean():>11.2f}%"
                  f"{ratio:>9.2f}{overlap:>9.1f}%{floor:>9.2f}")
        print("  untouched/moshed = mean % of blocks flagged per frame in each"
              " population; overlap = untouched frames above the moshed 5th pct")

    if args.detector == "auto":
        if rep_det:
            # fewest false positives first, then the widest separation
            pick = min(rep_det, key=lambda k: (rep_det[k]["overlap_pct"],
                                               -rep_det[k]["ratio"]))
        else:
            pick = "mv"
        print(f"\nchosen detector: {pick} (auto)")
    else:
        pick = args.detector
        print(f"\nchosen detector: {pick} (forced)")
    score = score_diff if pick == "diff" else score_mv
    floor = floor_diff if pick == "diff" else floor_mv

    # --------------------------------------------------- 4. grow the mask
    print("\n--- mask growth ---")
    masks = np.zeros((n, rows, cols), bool)
    open_m = np.zeros((rows, cols), bool)
    trig_cov = {}
    # where each newly opened block came from, so "spreads along the motion
    # vectors" is a measured claim and not a hopeful one
    added = {"threshold": 0, "advect": 0, "burst": 0}
    acc = np.zeros((rows, cols, 2), np.float32)
    drift = []
    for i in range(n):
        frac = curve(i, n, args.gamma, args.peak)
        # the mask travels with A's own motion, and never closes
        if i > 0:
            adv, acc = advect(open_m, acc, mv_mosh[i], has_mosh[i], mb)
            added["advect"] += int((adv & ~open_m).sum())
            open_m = open_m | adv
            drift.append(float(np.abs(acc).max()))
        if frac > 0:
            q = float(np.quantile(score[i], max(0.0, 1.0 - frac)))
            thr = max(q, floor)
            new = score[i] > thr
            added["threshold"] += int((new & ~open_m).sum())
            open_m = open_m | new
        if i in triggers:
            before = open_m.mean() * 100.0
            bst = burst(mag_mosh[i], rows, cols, args.burst_radius)
            added["burst"] += int((bst & ~open_m).sum())
            open_m = open_m | bst
            trig_cov[i] = {"before_pct": float(before),
                           "after_pct": float(open_m.mean() * 100.0)}
        masks[i] = open_m
    tot = max(sum(added.values()), 1)
    print("  blocks opened by: " + "  ".join(
        f"{k} {v} ({v / tot * 100:.1f}%)" for k, v in added.items()))

    cov = masks.reshape(n, -1).mean(axis=1) * 100.0

    # ------------------------------------------------------ 5. composite
    print("--- pass 2: composite ---")
    enc = subprocess.Popen(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}",
         "-framerate", f"{fps:g}", "-i", "-", "-an",
         "-c:v", "libx264", "-preset", "slow", "-crf", str(args.crf),
         "-pix_fmt", "yuv420p", "-r", f"{fps:g}",
         "-movflags", "+faststart", args.out],
        stdin=subprocess.PIPE)
    ra, rb = reader(args.a, w, h), reader(args.b, w, h)
    wrote = 0
    for i in range(n):
        try:
            fa, fb = next(ra), next(rb)
        except StopIteration:
            break
        # hard block edges: nearest-neighbour upsample of the block mask
        m = np.repeat(np.repeat(masks[i], mb, axis=0), mb, axis=1)[:h, :w]
        out = np.where(m[:, :, None], fb, fa)
        enc.stdin.write(np.ascontiguousarray(out, np.uint8).tobytes())
        wrote += 1
        if i % 60 == 0:
            sys.stdout.write(f"\r  frame {i}/{n}   ")
    sys.stdout.write("\n")
    enc.stdin.close()
    if enc.wait() != 0:
        raise SystemExit("encode failed")

    # ------------------------------------------- 6. verify the composite
    # the output should be B inside the mask and A outside it. Decoding the
    # encoded result and asking, per block, which source it is closer to
    # checks the composite end to end rather than trusting the array maths.
    print("--- pass 3: verify output against the mask ---")
    ro, ra2, rb2 = (reader(args.out, w, h), reader(args.a, w, h),
                    reader(args.b, w, h))
    in_b, in_a, out_a, out_b = [], [], [], []
    agree = tot_blk = 0
    for i in range(n):
        try:
            fo, fa, fb = next(ro), next(ra2), next(rb2)
        except StopIteration:
            break
        lo, la, lb = luma(fo), luma(fa), luma(fb)
        da = block_mean(np.abs(lo - la), rows, cols, mb)
        db = block_mean(np.abs(lo - lb), rows, cols, mb)
        m = masks[i]
        # only blocks where A and B actually differ can testify
        amb = block_mean(np.abs(la - lb), rows, cols, mb) > 2.0
        if amb.any():
            agree += int((((db < da) == m) & amb).sum())
            tot_blk += int(amb.sum())
        if (m & amb).any():
            in_b.append(float(db[m & amb].mean()))
            in_a.append(float(da[m & amb].mean()))
        if (~m & amb).any():
            out_a.append(float(da[~m & amb].mean()))
            out_b.append(float(db[~m & amb].mean()))
    verify = {
        "inside_mask_vs_B": float(np.mean(in_b)) if in_b else None,
        "inside_mask_vs_A": float(np.mean(in_a)) if in_a else None,
        "outside_mask_vs_A": float(np.mean(out_a)) if out_a else None,
        "outside_mask_vs_B": float(np.mean(out_b)) if out_b else None,
        "block_agreement_pct": (agree / tot_blk * 100.0) if tot_blk else None,
        "blocks_tested": tot_blk,
    }
    print(f"  inside the mask : |out-B| {verify['inside_mask_vs_B']:.2f}   "
          f"|out-A| {verify['inside_mask_vs_A']:.2f}")
    print(f"  outside it      : |out-A| {verify['outside_mask_vs_A']:.2f}   "
          f"|out-B| {verify['outside_mask_vs_B']:.2f}")
    print(f"  per-block nearest source matches the mask: "
          f"{verify['block_agreement_pct']:.2f}% of {tot_blk} blocks where A!=B")

    # --------------------------------------------------------- 7. report
    got = probe(args.out)
    print("\n=== coverage per second (% of blocks showing B) ===")
    per_sec = []
    step = int(round(fps))
    for s in range(math.ceil(n / step)):
        seg = cov[s * step:(s + 1) * step]
        if not len(seg):
            break
        row = {"second": s, "mean_pct": float(seg.mean()),
               "end_pct": float(seg[-1]),
               "target_pct": curve(min((s + 1) * step - 1, n - 1), n,
                                   args.gamma, args.peak) * 100.0}
        per_sec.append(row)
        bar = "#" * int(round(row["end_pct"] / 2.5))
        print(f"  {s:>2}s  mean {row['mean_pct']:>6.2f}%  end {row['end_pct']:>6.2f}%"
              f"  curve {row['target_pct']:>6.2f}%  {bar}")

    if trig_cov:
        print("\n=== trigger frames ===")
        for f, v in sorted(trig_cov.items()):
            print(f"  frame {f:>4} ({f / fps:6.2f}s)  coverage "
                  f"{v['before_pct']:.2f}% -> {v['after_pct']:.2f}%  "
                  f"(+{v['after_pct'] - v['before_pct']:.2f} pts, "
                  f"{int(round((v['after_pct'] - v['before_pct']) / 100 * nblocks))} blocks)")

    print(f"\n=== output ===\n{args.out}")
    print(f"  {got['w']}x{got['h']}  {got['frames']} frames  "
          f"{got['duration']:.3f}s")
    print(f"  source: {pc['frames']} frames {pc['duration']:.3f}s")
    print(f"  frame count matches: {got['frames'] == pc['frames']}")
    print(f"  coverage: first {cov[0]:.2f}%  final {cov[-1]:.2f}%  "
          f"max {cov.max():.2f}%  monotone {bool(np.all(np.diff(cov) >= -1e-9))}")

    if args.report:
        json.dump({"frames": int(n), "grid": [cols, rows], "blocks": nblocks,
                   "fps": fps, "gamma": args.gamma, "peak": args.peak,
                   "detector": pick, "detectors": rep_det,
                   "floor": {"diff": floor_diff, "mv": floor_mv},
                   "per_second": per_sec, "triggers": trig_cov,
                   "opened_by": added, "verify": verify,
                   "coverage_per_frame": [round(float(x), 4) for x in cov],
                   "output": {"path": args.out, "frames": got["frames"],
                              "duration": got["duration"]}},
                  open(args.report, "w", encoding="utf-8"), indent=1)
        print(f"  report -> {args.report}")


if __name__ == "__main__":
    main()
