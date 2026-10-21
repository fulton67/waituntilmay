"""Compare the hue distribution of a rendered frame against a reference image.

A thin-film palette is a claim about WHICH hues appear and in what
proportion, so that is what gets measured - not average colour, which would
call a purple-and-orange frame "grey".

Near-black pixels carry no hue worth counting and there are a lot of them in
both images by design, so pixels are weighted by saturation x value and
anything under a floor is dropped. The floor and the share dropped are both
reported, because a palette comparison that quietly discards 90% of an image
is not a comparison.

Reported:
  the weighted hue histogram, in 12 bins of 30 degrees, named
  cosine similarity and intersection between the two histograms
  earth-mover distance around the hue circle, which is the one that notices
    "right colours, wrong proportions"
  the top bins on each side, so a mismatch can be read rather than inferred

  python scripts/palette_match.py rendered.png --ref refs/crystal.jpg
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np

BINS = 12
NAMES = ["red", "orange", "yellow", "chartreuse", "green", "spring",
         "cyan", "azure", "blue", "violet", "magenta", "rose"]


def load_rgb(path):
    """Decode anything ffmpeg reads into an (h, w, 3) uint8 array."""
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height", "-of", "json", path],
        check=True, capture_output=True, text=True).stdout
    s = json.loads(probe)["streams"][0]
    w, h = s["width"], s["height"]
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-frames:v", "1",
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        check=True, capture_output=True).stdout
    return np.frombuffer(raw[:w * h * 3], np.uint8).reshape(h, w, 3)


def hsv(rgb):
    a = rgb.astype(np.float32) / 255.0
    mx = a.max(axis=2)
    mn = a.min(axis=2)
    d = mx - mn
    h = np.zeros_like(mx)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    nz = d > 1e-6
    # standard piecewise hue, in degrees
    idx = (mx == r) & nz
    h[idx] = (60 * ((g[idx] - b[idx]) / d[idx])) % 360
    idx = (mx == g) & nz
    h[idx] = (60 * ((b[idx] - r[idx]) / d[idx]) + 120) % 360
    idx = (mx == b) & nz
    h[idx] = (60 * ((r[idx] - g[idx]) / d[idx]) + 240) % 360
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0.0)
    return h, s, mx


def histogram(path, floor=0.035):
    rgb = load_rgb(path)
    h, s, v = hsv(rgb)
    w = (s * v).ravel()
    hh = h.ravel()
    keep = w >= floor
    kept = w[keep]
    hist = np.zeros(BINS)
    if kept.size:
        b = ((hh[keep] + 15.0) % 360) / 30.0
        np.add.at(hist, b.astype(int) % BINS, kept)
        hist = hist / hist.sum()
    return {
        "path": path, "size": f"{rgb.shape[1]}x{rgb.shape[0]}",
        "hist": hist,
        "kept_pct": 100.0 * keep.mean(),
        "mean_sat": float(s.ravel()[keep].mean()) if keep.any() else 0.0,
        "mean_val": float(v.ravel()[keep].mean()) if keep.any() else 0.0,
        "black_pct": 100.0 * float((v.ravel() < 0.12).mean()),
    }


def emd_circular(p, q):
    """Earth mover on a circle: the best of all rotations of the cumulative."""
    n = len(p)
    d = p - q
    best = None
    for shift in range(n):
        c = np.cumsum(np.roll(d, shift))
        cost = np.abs(c).sum()
        best = cost if best is None else min(best, cost)
    return float(best / n)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("rendered")
    ap.add_argument("--ref", default="public/mosh-lab/refs/crystal.jpg")
    ap.add_argument("--floor", type=float, default=0.035)
    ap.add_argument("--json-out", default=None)
    args = ap.parse_args()

    a = histogram(args.rendered, args.floor)
    print("=" * 78)
    print("HUE DISTRIBUTION  (weighted by saturation x value, 12 bins of 30 deg)")
    print("=" * 78)
    have_ref = os.path.exists(args.ref)
    b = histogram(args.ref, args.floor) if have_ref else None

    hdr = f"{'bin':<12}{'rendered':>10}"
    if b:
        hdr += f"{'reference':>11}{'diff':>8}"
    print(hdr)
    print("-" * len(hdr))
    for i, nm in enumerate(NAMES):
        line = f"{nm:<12}{a['hist'][i] * 100:>9.2f}%"
        if b:
            line += f"{b['hist'][i] * 100:>10.2f}%{(a['hist'][i] - b['hist'][i]) * 100:>+8.2f}"
        print(line)

    def side(x, label):
        top = np.argsort(-x["hist"])[:4]
        print(f"\n{label}: {x['size']}  "
              f"pixels counted {x['kept_pct']:.1f}%  "
              f"near-black {x['black_pct']:.1f}%  "
              f"mean sat {x['mean_sat']:.3f}  mean val {x['mean_val']:.3f}")
        print("  top hues: " + ", ".join(
            f"{NAMES[i]} {x['hist'][i] * 100:.1f}%" for i in top))

    side(a, "rendered")
    if b:
        side(b, "reference")
        cos = float(np.dot(a["hist"], b["hist"])
                    / max(np.linalg.norm(a["hist"]) * np.linalg.norm(b["hist"]), 1e-9))
        inter = float(np.minimum(a["hist"], b["hist"]).sum())
        emd = emd_circular(a["hist"], b["hist"])
        print("\n--- match ---")
        print(f"  cosine similarity   : {cos:.4f}   (1 = identical proportions)")
        print(f"  histogram overlap   : {inter * 100:.2f}%  (share of the palette shared)")
        print(f"  circular EMD        : {emd:.4f}   (0 = identical; lower is better)")
    else:
        print(f"\nno reference at {args.ref} - nothing to compare against yet.")
        print("Drop the image there and re-run; the rendered side above is final.")

    if args.json_out:
        out = {"rendered": {k: (v.tolist() if isinstance(v, np.ndarray) else v)
                            for k, v in a.items()}}
        if b:
            out["reference"] = {k: (v.tolist() if isinstance(v, np.ndarray) else v)
                                for k, v in b.items()}
            out["match"] = {"cosine": cos, "overlap": inter, "emd": emd}
        json.dump(out, open(args.json_out, "w", encoding="utf-8"), indent=1)
        print(f"\njson -> {args.json_out}")
    return 0 if have_ref else 2


if __name__ == "__main__":
    sys.exit(main())
