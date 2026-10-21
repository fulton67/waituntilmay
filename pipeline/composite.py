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


def build(a, b, c, clean_m4v, moshed_m4v, out, control=None, triggers=(),
          ground_truth=(), gamma=1.4, peak=1.0, mb=16, burst_radius=6.0,
          detector="auto", crf=23, tmp=".mosh-composite", audio_from=None,
          verify=True, quiet=False):
    """Build the A/B composite and return everything that was measured."""
    def say(*x):
        if not quiet:
            print(*x)

    os.makedirs(tmp, exist_ok=True)
    pa, pc = probe(a), probe(c)
    n = min(pa["frames"], pc["frames"], probe(b)["frames"])
    w, h, fps = pc["w"], pc["h"], pc["fps"]
    rows, cols = math.ceil(h / mb), math.ceil(w / mb)
    nblocks = rows * cols
    triggers = list(triggers)
    truth = sorted(ground_truth)

    say(f"frames {n}  {w}x{h} @ {fps:g}  grid {cols}x{rows} = {nblocks} blocks")
    say(f"curve gamma={gamma} peak={peak}  triggers {triggers or '-'}")

    # ---------------------------------------------- 1. motion vector fields
    mv_clean, has_clean = mv_arrays(
        export_mv(clean_m4v, os.path.join(tmp, "mv-clean.json")), rows, cols, n)
    mv_mosh, has_mosh = mv_arrays(
        export_mv(moshed_m4v, os.path.join(tmp, "mv-mosh.json")), rows, cols, n)
    mag_mosh = np.hypot(mv_mosh[:, :, :, 0], mv_mosh[:, :, :, 1])

    # how far the coded motion sits from the motion that should be there
    d = np.hypot(mv_mosh[:, :, :, 0] - mv_clean[:, :, :, 0],
                 mv_mosh[:, :, :, 1] - mv_clean[:, :, :, 1])
    score_mv = np.where(has_mosh != has_clean, BIG, d).astype(np.float32)

    # ------------------------------------------------- 2. pixel diff scores
    say("--- pass 1: |A - C| per macroblock ---")
    score_diff = np.zeros((n, rows, cols), np.float32)
    ra, rc = reader(a, w, h), reader(c, w, h, gray=True)
    for i in range(n):
        try:
            fa, fc = next(ra), next(rc)
        except StopIteration:
            n = i
            break
        score_diff[i] = block_mean(np.abs(luma(fa) - fc.astype(np.float32)),
                                   rows, cols, mb)
    score_diff, score_mv = score_diff[:n], score_mv[:n]

    floor_diff = 6.0
    if control:
        ctl = np.zeros((n, rows, cols), np.float32)
        r1, r2 = reader(control, w, h), reader(c, w, h, gray=True)
        for i in range(n):
            try:
                f1, f2 = next(r1), next(r2)
            except StopIteration:
                break
            ctl[i] = block_mean(np.abs(luma(f1) - f2.astype(np.float32)),
                                rows, cols, mb)
        floor_diff = float(np.quantile(ctl, 0.995))
        say(f"  control |A-C| p99.5 = {floor_diff:.2f} (same chain, no mosh)")
    floor_mv = 4.0            # 2 px: below this it is rounding, not a move

    # ------------------------------------------- 3. score the two detectors
    rep_det = {}
    if truth:
        tset = np.zeros(n, bool)
        tset[[t for t in truth if t < n]] = True
        for name, sc, fl in (("diff", score_diff, floor_diff),
                             ("mv", score_mv, floor_mv)):
            per = (sc > fl).mean(axis=(1, 2)) * 100.0
            u, m = per[~tset], per[tset]
            if not len(u) or not len(m):
                continue
            rep_det[name] = {
                "untouched_pct": float(u.mean()), "moshed_pct": float(m.mean()),
                "ratio": float(m.mean() / u.mean()) if u.mean() > 0 else float("inf"),
                "overlap_pct": float((u > np.quantile(m, 0.05)).mean() * 100.0),
                "floor": float(fl)}
            say(f"  detector {name:<5} untouched {u.mean():5.2f}%  "
                f"moshed {m.mean():5.2f}%  "
                f"overlap {rep_det[name]['overlap_pct']:5.1f}%")

    if detector == "auto":
        pick = (min(rep_det, key=lambda k: (rep_det[k]["overlap_pct"],
                                            -rep_det[k]["ratio"]))
                if rep_det else "mv")
    else:
        pick = detector
    say(f"  detector: {pick}")
    score = score_diff if pick == "diff" else score_mv
    floor = floor_diff if pick == "diff" else floor_mv

    # --------------------------------------------------- 4. grow the mask
    masks = np.zeros((n, rows, cols), bool)
    open_m = np.zeros((rows, cols), bool)
    acc = np.zeros((rows, cols, 2), np.float32)
    trig_cov, added = {}, {"threshold": 0, "advect": 0, "burst": 0}
    for i in range(n):
        frac = curve(i, n, gamma, peak)
        if i > 0:
            adv, acc = advect(open_m, acc, mv_mosh[i], has_mosh[i], mb)
            added["advect"] += int((adv & ~open_m).sum())
            open_m = open_m | adv
        if frac > 0:
            thr = max(float(np.quantile(score[i], max(0.0, 1.0 - frac))), floor)
            new = score[i] > thr
            added["threshold"] += int((new & ~open_m).sum())
            open_m = open_m | new
        if i in triggers:
            before = open_m.mean() * 100.0
            bst = burst(mag_mosh[i], rows, cols, burst_radius)
            added["burst"] += int((bst & ~open_m).sum())
            open_m = open_m | bst
            trig_cov[i] = {"before_pct": float(before),
                           "after_pct": float(open_m.mean() * 100.0)}
        masks[i] = open_m
    cov = masks.reshape(n, -1).mean(axis=1) * 100.0
    tot = max(sum(added.values()), 1)
    say("  opened by: " + "  ".join(f"{k} {v} ({v / tot * 100:.0f}%)"
                                    for k, v in added.items()))

    # ------------------------------------------------------ 5. composite
    say("--- pass 2: composite ---")
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}",
           "-framerate", f"{fps:g}", "-i", "-"]
    if audio_from:
        cmd += ["-i", audio_from, "-map", "0:v:0", "-map", "1:a:0",
                "-c:a", "aac", "-b:a", "192k", "-shortest"]
    else:
        cmd += ["-an"]
    cmd += ["-c:v", "libx264", "-preset", "slow", "-crf", str(crf),
            "-pix_fmt", "yuv420p", "-r", f"{fps:g}",
            "-movflags", "+faststart", out]
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    ra, rb = reader(a, w, h), reader(b, w, h)
    for i in range(n):
        try:
            fa, fb = next(ra), next(rb)
        except StopIteration:
            break
        m = np.repeat(np.repeat(masks[i], mb, axis=0), mb, axis=1)[:h, :w]
        enc.stdin.write(np.ascontiguousarray(
            np.where(m[:, :, None], fb, fa), np.uint8).tobytes())
    enc.stdin.close()
    if enc.wait() != 0:
        raise RuntimeError("composite encode failed")

    # ------------------------------------------- 6. verify the composite
    ver = None
    if verify:
        say("--- pass 3: verify ---")
        ro, ra2, rb2 = reader(out, w, h), reader(a, w, h), reader(b, w, h)
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
        ver = {"inside_mask_vs_B": float(np.mean(in_b)) if in_b else None,
               "inside_mask_vs_A": float(np.mean(in_a)) if in_a else None,
               "outside_mask_vs_A": float(np.mean(out_a)) if out_a else None,
               "outside_mask_vs_B": float(np.mean(out_b)) if out_b else None,
               "block_agreement_pct": (agree / tot_blk * 100.0) if tot_blk else None,
               "blocks_tested": tot_blk}
        say(f"  nearest source matches the mask for "
            f"{ver['block_agreement_pct']:.2f}% of {tot_blk} blocks")

    # --------------------------------------------------------- 7. report
    got = probe(out)
    per_sec, step = [], int(round(fps))
    for s in range(math.ceil(n / step)):
        seg = cov[s * step:(s + 1) * step]
        if not len(seg):
            break
        per_sec.append({"second": s, "mean_pct": round(float(seg.mean()), 2),
                        "end_pct": round(float(seg[-1]), 2),
                        "target_pct": round(curve(min((s + 1) * step - 1, n - 1),
                                                  n, gamma, peak) * 100.0, 2)})
    return {"frames": int(n), "grid": [cols, rows], "blocks": nblocks,
            "fps": fps, "gamma": gamma, "peak": peak, "detector": pick,
            "detectors": rep_det, "floor": {"diff": floor_diff, "mv": floor_mv},
            "per_second": per_sec, "triggers": trig_cov, "opened_by": added,
            "verify": ver,
            "coverage_first_pct": round(float(cov[0]), 2),
            "coverage_final_pct": round(float(cov[-1]), 2),
            "coverage_max_pct": round(float(cov.max()), 2),
            "coverage_monotone": bool(np.all(np.diff(cov) >= -1e-9)),
            "coverage_per_frame": [round(float(x), 3) for x in cov],
            "output": {"path": out, "frames": got["frames"],
                       "duration": got["duration"]}}
