"""Find pixel stretches in an image or a video, and describe them.

A stretch is a column of pixels repeated down (or up) the frame: the same
row copied over and over, which is what a stalled P-frame does and what the
reference look is made of. That makes it directly detectable rather than a
matter of opinion - in a stretch, |I(x, y) - I(x, y-1)| is almost exactly
zero for a long run of rows, while real footage almost never is.

So: find maximal vertical runs of near-zero row-to-row difference, keep the
long ones, and group neighbouring columns that share a run into one stretch.

Reported, because these are the things a stretch system can get wrong:
  length      how far the trails reach
  width       how wide they are, and whether widths vary at all
  x mod 16    whether they sit on the macroblock grid - a hashed, grid-locked
              system puts nearly everything at 0
  spawn CV    over a video, the coefficient of variation of the gaps between
              new stretches appearing. Poisson gives about 1; a fixed cycle
              gives nearly 0
  fall speed  over a video, how fast heads move down between frames

  python scripts/stretch_stats.py public/mosh-lab/refs/drip.png
  python scripts/stretch_stats.py out.mp4 --frames 120 --json-out s.json
"""
import argparse
import json
import subprocess
import sys

import numpy as np

EPS = 2.0          # row-to-row difference that still counts as "repeated"
MIN_RUN = 10       # a run shorter than this is texture, not a stretch


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height,nb_read_frames", "-count_frames",
         "-of", "json", path], check=True, capture_output=True, text=True).stdout
    s = json.loads(out)["streams"][0]
    n = s.get("nb_read_frames")
    return s["width"], s["height"], int(n) if str(n).isdigit() else 1


def frames(path, w, h, limit=None):
    p = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", path, "-f", "rawvideo",
         "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE, bufsize=w * h * 3 * 4)
    size = w * h * 3
    i = 0
    try:
        while True:
            if limit is not None and i >= limit:
                break
            buf = p.stdout.read(size)
            if len(buf) < size:
                break
            yield np.frombuffer(buf, np.uint8).reshape(h, w, 3)
            i += 1
    finally:
        p.stdout.close()
        p.wait()


def find_stretches(img, eps=EPS, min_run=MIN_RUN, min_hgrad=3.0, max_width=64):
    """-> list of dicts: x, width, y0, y1, length.

    Vertical uniformity alone is not enough. A flat wall is uniform down AND
    across, and on the reference that put the whole 302 px background in as
    one "stretch". A real trail is uniform down but structured across - it is
    a gradient over its own width - so a column only counts if it also
    differs from its horizontal neighbour.
    """
    g = img.astype(np.float32).mean(axis=2)
    h, w = g.shape
    same = np.abs(np.diff(g, axis=0)) < eps          # (h-1, w)
    hg = np.abs(np.diff(g, axis=1))                  # (h, w-1)
    hgrad = np.zeros_like(g)
    hgrad[:, 1:] = hg
    hgrad[:, :-1] = np.maximum(hgrad[:, :-1], hg)

    # per column, the maximal runs of "same as the row above"
    runs = []
    for x in range(w):
        col = same[:, x]
        if not col.any():
            continue
        d = np.diff(np.concatenate(([0], col.view(np.int8), [0])))
        starts = np.flatnonzero(d == 1)
        ends = np.flatnonzero(d == -1)
        for a, b in zip(starts, ends):
            if b - a + 1 < min_run:
                continue
            # the run has to look like a tube, not like flat background
            if hgrad[a:b + 1, x].mean() < min_hgrad:
                continue
            runs.append((x, int(a), int(b + 1)))
    if not runs:
        return []

    # group columns whose runs overlap into one stretch
    runs.sort()
    used = [False] * len(runs)
    by_col = {}
    for i, (x, a, b) in enumerate(runs):
        by_col.setdefault(x, []).append(i)
    out = []
    for i, (x, a, b) in enumerate(runs):
        if used[i]:
            continue
        used[i] = True
        cols = [x]
        lo, hi = a, b
        cx = x + 1
        while cx in by_col:
            hit = None
            for j in by_col[cx]:
                if used[j]:
                    continue
                _, aa, bb = runs[j]
                if min(hi, bb) - max(lo, aa) > 0.5 * min(hi - lo, bb - aa):
                    hit = j
                    break
            if hit is None:
                break
            used[hit] = True
            _, aa, bb = runs[hit]
            lo, hi = min(lo, aa), max(hi, bb)
            cols.append(cx)
            cx += 1
        if len(cols) <= max_width:
            out.append({"x": int(min(cols)), "width": len(cols),
                        "y0": int(lo), "y1": int(hi), "length": int(hi - lo)})
    return out


def describe(vals, name, unit=""):
    if not len(vals):
        return f"  {name:<22} (none)"
    v = np.asarray(vals, float)
    return (f"  {name:<22} min {v.min():6.1f}{unit}  median {np.median(v):6.1f}{unit}"
            f"  max {v.max():6.1f}{unit}  mean {v.mean():6.1f}{unit}  n={len(v)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--frames", type=int, default=None)
    ap.add_argument("--eps", type=float, default=EPS)
    ap.add_argument("--min-run", type=int, default=MIN_RUN)
    ap.add_argument("--grid", type=int, default=16)
    ap.add_argument("--min-hgrad", type=float, default=3.0)
    ap.add_argument("--max-width", type=int, default=64)
    ap.add_argument("--json-out", default=None)
    args = ap.parse_args()

    w, h, n = probe(args.path)
    limit = args.frames if args.frames else (None if n > 1 else 1)
    print("=" * 74)
    print(f"PIXEL STRETCHES  {args.path}  {w}x{h}"
          + (f"  {n} frames" if n > 1 else ""))
    print("=" * 74)

    per_frame, all_s = [], []
    prev_heads = None
    speeds, spawn_frames = [], []
    for i, img in enumerate(frames(args.path, w, h, limit)):
        st = find_stretches(img, args.eps, args.min_run,
                            args.min_hgrad, args.max_width)
        per_frame.append(len(st))
        all_s.extend(st)
        # a head is the top of a downward trail; match to the nearest previous
        heads = sorted((s["x"] + s["width"] / 2, s["y0"], s["width"]) for s in st)
        if prev_heads is not None:
            for cx, y0, wd in heads:
                near = [p for p in prev_heads if abs(p[0] - cx) < 3]
                if near:
                    dy = y0 - min(near, key=lambda p: abs(p[0] - cx))[1]
                    if 0 <= dy < 40:
                        speeds.append(dy)
                else:
                    spawn_frames.append(i)
        prev_heads = heads

    lens = [s["length"] for s in all_s]
    wids = [s["width"] for s in all_s]
    mods = [s["x"] % args.grid for s in all_s]
    aligned = 100.0 * float(np.mean([m == 0 for m in mods])) if mods else float("nan")

    print(describe(lens, "trail length", " px"))
    print(describe(wids, "width", " px"))
    if n > 1:
        print(describe(per_frame, "stretches per frame", ""))
        print(describe(speeds, "fall speed", " px/frame"))
        if len(spawn_frames) > 2:
            gaps = np.diff(sorted(set(spawn_frames)))
            cv = float(gaps.std() / max(gaps.mean(), 1e-9))
            print(f"  {'spawn interval':<22} mean {gaps.mean():.2f} frames  "
                  f"sd {gaps.std():.2f}  CV {cv:.3f}  n={len(gaps)}")
    print(f"\n  on the {args.grid} px grid (x mod {args.grid} == 0): {aligned:.1f}%"
          f"   (a hashed grid system sits near {100.0 / args.grid * args.grid:.0f}%)")
    hist = np.bincount(np.array(mods), minlength=args.grid) if mods else np.zeros(args.grid)
    tot = max(hist.sum(), 1)
    print("  x mod grid: " + " ".join(f"{k}:{v / tot * 100:.0f}%"
                                      for k, v in enumerate(hist) if v))
    if wids:
        wh = np.bincount(np.array(wids), minlength=14)[:14]
        print("  widths:     " + " ".join(f"{k}px:{v}" for k, v in enumerate(wh) if v))

    if args.json_out:
        json.dump({"path": args.path, "size": [w, h], "count": len(all_s),
                   "length": lens, "width": wids, "x_mod_grid": mods,
                   "aligned_pct": aligned,
                   "per_frame": per_frame, "fall_speed": speeds},
                  open(args.json_out, "w"), indent=1)
        print(f"\njson -> {args.json_out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
