"""Compress the renders for the web and write the player manifest.

Writes to a staging directory by default - nothing is uploaded or copied into
the Next.js public/ folder until the hosting decision is made.

The manifest deliberately carries no phase number: the page must not reveal it.
"""
import argparse
import glob
import json
import os
import subprocess


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True)


def probe(path):
    out = run(["ffprobe", "-v", "error", "-show_entries",
               "stream=width,height", "-show_entries", "format=duration",
               "-of", "json", path]).stdout
    d = json.loads(out)
    v = next(s for s in d["streams"] if "width" in s)
    return v["width"], v["height"], float(d["format"]["duration"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default="renders")
    ap.add_argument("--out", default="renders/web")
    ap.add_argument("--height", type=int, default=0,
                    help="0 = keep native height (source is 360p; upscaling "
                         "only grows the file without adding detail)")
    ap.add_argument("--scale-flags", default="neighbor",
                    help="ffmpeg swscale flag; 'neighbor' keeps the datamosh "
                         "blocks hard-edged instead of interpolating them away")
    ap.add_argument("--crf", type=int, default=23)
    ap.add_argument("--audio-kbps", type=int, default=128)
    ap.add_argument("--budget-mb", type=float, default=6.0)
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    srcs = sorted(p for p in glob.glob(os.path.join(args.src, "v_*.mp4"))
                  if os.path.dirname(p) == args.src.rstrip("/\\"))
    if not srcs:
        print("no renders found")
        return 1

    rows = []
    for p in srcs:
        name = os.path.basename(p)
        dst = os.path.join(args.out, name)
        w, h, dur = probe(p)
        vf = ["format=yuv420p"]
        if args.height and args.height != h:
            vf.insert(0, f"scale=-2:{args.height}:flags={args.scale_flags}")
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", p,
             "-vf", ",".join(vf),
             "-c:v", "libx264", "-profile:v", "high", "-level", "4.0",
             "-preset", "slow", "-crf", str(args.crf),
             "-c:a", "aac", "-b:a", f"{args.audio_kbps}k",
             "-movflags", "+faststart", dst])
        rows.append({
            "name": name,
            "src_mb": os.path.getsize(p) / 1e6,
            "web_mb": os.path.getsize(dst) / 1e6,
            "res": f"{w}x{h}",
            "duration": dur,
        })

    manifest = {
        "files": [r["name"] for r in rows],
        "count": len(rows),
        "seconds_each": 30.0,
    }
    json.dump(manifest, open(os.path.join(args.out, "manifest.json"), "w",
                             encoding="utf-8"), indent=1)

    total_src = sum(r["src_mb"] for r in rows)
    total_web = sum(r["web_mb"] for r in rows)
    over = [r for r in rows if r["web_mb"] > args.budget_mb]

    print(f"{'file':<16}{'res':>10}{'dur s':>8}{'src MB':>9}{'web MB':>9}")
    print("-" * 52)
    for r in rows:
        print(f"{r['name']:<16}{r['res']:>10}{r['duration']:>8.3f}"
              f"{r['src_mb']:>9.2f}{r['web_mb']:>9.2f}")
    print("-" * 52)
    print(f"{'TOTAL':<16}{'':>10}{'':>8}{total_src:>9.2f}{total_web:>9.2f}")
    print(f"\n{len(rows)} files, {total_web:.1f} MB total, "
          f"mean {total_web/len(rows):.2f} MB, max {max(r['web_mb'] for r in rows):.2f} MB")
    print(f"budget {args.budget_mb} MB/file: "
          f"{'ALL PASS' if not over else f'{len(over)} OVER'}")
    for r in over:
        print(f"  OVER: {r['name']} {r['web_mb']:.2f} MB")
    print(f"\nstaged in {args.out}/ (nothing uploaded)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
