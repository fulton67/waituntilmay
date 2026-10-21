"""Frame-to-frame mean brightness, and the jumps that stand out.

A periodic brightness flash is visible in exactly one statistic: the absolute
change in a frame's mean luma from the frame before it. A steady picture sits
near zero; a flash shows up as a spike, and a flash on a timer shows up as
spikes at a regular spacing. So this reports the series, its largest
excursions with their frame numbers, and - because "periodic" is the actual
complaint - the spacing between those excursions.

  python scripts/brightness_jumps.py a.mp4 b.mp4 --labels before after
"""
import argparse
import collections
import json
import subprocess

import numpy as np


def mean_luma(path):
    """Per-frame mean luma, 0-255, straight from the decoder."""
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height", "-of", "json", path],
        check=True, capture_output=True, text=True).stdout
    s = json.loads(probe)["streams"][0]
    w, h = s["width"], s["height"]
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-f", "rawvideo",
         "-pix_fmt", "gray", "-"],
        check=True, capture_output=True).stdout
    n = len(raw) // (w * h)
    a = np.frombuffer(raw[:n * w * h], np.uint8).reshape(n, h * w)
    return a.mean(axis=1), (w, h, n)


def report(path, label, top=5):
    lum, (w, h, n) = mean_luma(path)
    d = np.abs(np.diff(lum))
    order = np.argsort(-d)[:top]
    # frame i of the diff is the change from i to i+1
    jumps = [(int(i + 1), float(d[i]), float(lum[i]), float(lum[i + 1]))
             for i in sorted(order, key=lambda k: -d[k])]
    return {
        "label": label, "path": path, "frames": n, "size": f"{w}x{h}",
        "luma_mean": float(lum.mean()), "luma_min": float(lum.min()),
        "luma_max": float(lum.max()),
        "dmean": float(d.mean()), "dmedian": float(np.median(d)),
        "dp95": float(np.percentile(d, 95)), "dp99": float(np.percentile(d, 99)),
        "dmax": float(d.max()),
        "over_2": int((d > 2.0).sum()), "over_5": int((d > 5.0).sum()),
        "jumps": jumps, "series": d,
    }


def spacing(series, thresh):
    """Gaps between consecutive excursions - a timer shows up as one value."""
    idx = np.flatnonzero(series > thresh) + 1
    if len(idx) < 3:
        return []
    gaps = np.diff(idx)
    return collections.Counter(int(g) for g in gaps).most_common(6)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("videos", nargs="+")
    ap.add_argument("--labels", nargs="*", default=None)
    ap.add_argument("--top", type=int, default=5)
    ap.add_argument("--json-out", default=None)
    args = ap.parse_args()
    labels = args.labels or [f"v{i}" for i in range(len(args.videos))]

    reps = [report(v, labels[i] if i < len(labels) else f"v{i}", args.top)
            for i, v in enumerate(args.videos)]

    print("=" * 94)
    print("FRAME-TO-FRAME MEAN BRIGHTNESS CHANGE  (|d mean luma|, 0-255 scale)")
    print("=" * 94)
    print(f"{'':<12}{'frames':>7}{'luma mean':>11}{'mean |d|':>10}"
          f"{'median':>9}{'p95':>8}{'p99':>8}{'max':>8}{'>2':>6}{'>5':>6}")
    for r in reps:
        print(f"{r['label']:<12}{r['frames']:>7}{r['luma_mean']:>11.2f}"
              f"{r['dmean']:>10.4f}{r['dmedian']:>9.4f}{r['dp95']:>8.3f}"
              f"{r['dp99']:>8.3f}{r['dmax']:>8.3f}"
              f"{r['over_2']:>6}{r['over_5']:>6}")

    if len(reps) == 2:
        a, b = reps
        print(f"\nmean |d| {a['label']} -> {b['label']}: "
              f"{a['dmean']:.4f} -> {b['dmean']:.4f}  "
              f"({(b['dmean'] - a['dmean']) / max(a['dmean'], 1e-9) * 100:+.1f}%)")
        print(f"frames with |d| > 2: {a['over_2']} -> {b['over_2']}")
        print(f"frames with |d| > 5: {a['over_5']} -> {b['over_5']}")

    for r in reps:
        print(f"\n{r['label']}: {args.top} largest brightness jumps")
        print(f"  {'frame':>7}{'|d luma|':>10}{'from':>9}{'to':>9}")
        for f, dv, l0, l1 in r["jumps"]:
            print(f"  {f:>7}{dv:>10.3f}{l0:>9.2f}{l1:>9.2f}")
        for th in (1.0, 2.0):
            sp = spacing(r["series"], th)
            if sp:
                print(f"  spacing between |d| > {th} events "
                      f"(gap frames x count): {sp}")

    if args.json_out:
        out = [{k: v for k, v in r.items() if k != "series"} for r in reps]
        json.dump(out, open(args.json_out, "w", encoding="utf-8"), indent=1)
        print(f"\njson -> {args.json_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
