"""CLI over pipeline.composite - build the A/B composite for one clip.

The logic lives in pipeline/composite.py so the journey render pipeline can
call exactly the same code path rather than shelling out to a script.

  python scripts/mosh_composite.py --a a.mp4 --b b.mp4 --c c.mp4 \
      --clean-m4v a_src.m4v --moshed-m4v a_mosh.m4v --control ctrl.mp4 \
      --out out.mp4 --triggers 101,150 --gamma 1.4 --peak 1.0
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline import composite as CP                                 # noqa: E402


def ints(s):
    return [int(x) for x in s.split(",") if x.strip()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--a", required=True, help="journey mosh (base)")
    ap.add_argument("--b", required=True, help="mv-transfer layer (window)")
    ap.add_argument("--c", required=True, help="clean edit (reference)")
    ap.add_argument("--clean-m4v", required=True)
    ap.add_argument("--moshed-m4v", required=True)
    ap.add_argument("--control", default=None)
    ap.add_argument("--audio-from", default=None)
    ap.add_argument("--out", required=True)
    ap.add_argument("--report", default=None)
    ap.add_argument("--triggers", default="")
    ap.add_argument("--ground-truth", default="")
    ap.add_argument("--gamma", type=float, default=1.4)
    ap.add_argument("--peak", type=float, default=1.0)
    ap.add_argument("--mb", type=int, default=16)
    ap.add_argument("--burst-radius", type=float, default=6.0)
    ap.add_argument("--detector", default="auto", choices=["auto", "diff", "mv"])
    ap.add_argument("--crf", type=int, default=23)
    ap.add_argument("--tmp", default=".mosh-composite")
    args = ap.parse_args()

    r = CP.build(args.a, args.b, args.c, args.clean_m4v, args.moshed_m4v,
                 args.out, control=args.control, triggers=ints(args.triggers),
                 ground_truth=ints(args.ground_truth), gamma=args.gamma,
                 peak=args.peak, mb=args.mb, burst_radius=args.burst_radius,
                 detector=args.detector, crf=args.crf, tmp=args.tmp,
                 audio_from=args.audio_from)

    print("\n=== coverage per second (% of blocks showing B) ===")
    for row in r["per_second"]:
        bar = "#" * int(round(row["end_pct"] / 2.5))
        print(f"  {row['second']:>2}s  mean {row['mean_pct']:>6.2f}%  "
              f"end {row['end_pct']:>6.2f}%  curve {row['target_pct']:>6.2f}%  {bar}")
    if r["triggers"]:
        print("\n=== trigger frames ===")
        for f, v in sorted(r["triggers"].items()):
            print(f"  frame {f:>4} ({f / r['fps']:6.2f}s)  "
                  f"{v['before_pct']:.2f}% -> {v['after_pct']:.2f}%")
    o = r["output"]
    print(f"\n=== output ===\n{o['path']}")
    print(f"  {o['frames']} frames  {o['duration']:.3f}s")
    print(f"  coverage: first {r['coverage_first_pct']:.2f}%  "
          f"final {r['coverage_final_pct']:.2f}%  "
          f"monotone {r['coverage_monotone']}")

    if args.report:
        json.dump(r, open(args.report, "w", encoding="utf-8"), indent=1)
        print(f"  report -> {args.report}")


if __name__ == "__main__":
    main()
