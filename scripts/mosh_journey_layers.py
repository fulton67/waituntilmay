"""Build layer A (the journey mosh) and its un-moshed control for a test clip.

A is produced by the live journey datamosh, unchanged, so the composite is
built on the real thing rather than a reimplementation. The control runs the
same encode chain with the mosh skipped, which is what gives the pixel
detector an honest noise floor instead of a guessed threshold.

Both intermediates are kept: the composite reads motion vectors out of the
clean and moshed elementary streams.

  python scripts/mosh_journey_layers.py --src public/mosh-lab/blum-clip-internet.mp4 \
      --outdir public/mosh-lab --name blum-internet --phase 4
"""
import argparse
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline import mosh as MOSH                                    # noqa: E402

# the phase table the journey renders use; phase only sets mosh depth here
PHASE = {1: (4.0, 0.72), 2: (3.0, 0.86), 3: (2.2, 0.95), 4: (1.4, 1.00)}


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


def triggers_from_transcript(word, clip_start, frames, fps):
    words = json.load(open("sources/blum/transcript/words.json", encoding="utf-8"))
    dur = frames / fps

    def norm(w):
        return "".join(c for c in w.lower() if c.isalnum() or c == "'")

    hits = [w for w in words if norm(w["word"]) == word.lower()
            and clip_start <= w["start"] <= clip_start + dur]
    return [int(round((w["start"] - clip_start) * fps)) for w in hits]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--outdir", default="public/mosh-lab")
    ap.add_argument("--name", default=None)
    ap.add_argument("--phase", type=int, default=4, choices=[1, 2, 3, 4])
    ap.add_argument("--trigger-word", default="internet")
    ap.add_argument("--clip-start", type=float, default=0.0)
    ap.add_argument("--triggers", default="", help="override, comma separated")
    args = ap.parse_args()

    name = args.name or os.path.splitext(os.path.basename(args.src))[0]
    p = probe(args.src)
    gamma, peak = PHASE[args.phase]
    print(f"source {os.path.basename(args.src)}  {p['w']}x{p['h']} @ {p['fps']:g}  "
          f"{p['frames']} frames  {p['duration']:.3f}s")
    print(f"phase {args.phase}: gamma={gamma} peak={peak}")

    if args.triggers.strip():
        triggers = [int(x) for x in args.triggers.split(",") if x.strip()]
    else:
        triggers = triggers_from_transcript(args.trigger_word, args.clip_start,
                                            p["frames"], p["fps"])
    print(f'triggers for "{args.trigger_word}": '
          f'{", ".join(map(str, triggers)) or "none in range"}')

    os.makedirs(args.outdir, exist_ok=True)
    a_mp4 = os.path.join(args.outdir, f"{name}-journey-mosh.mp4")
    ctl_mp4 = os.path.join(args.outdir, f"{name}-journey-control.mp4")

    print("\n--- A: the journey mosh ---")
    res = MOSH.datamosh(args.src, a_mp4, triggers=triggers,
                        n_frames=p["frames"], gamma=gamma, peak=peak,
                        cfg=json.load(open("config/triggers.json", encoding="utf-8")),
                        seed=8001, keep_intermediate=True, fps=p["fps"])
    print(f"  {res['total_vops']} VOPs, {res['keyframes']} I-VOPs, "
          f"{res['moshed_frames']} frames moshed")

    # the same chain with the mosh skipped: mpeg4 q:v 3 -> H.264 crf 20
    print("\n--- control: identical encode chain, no mosh ---")
    clean_m4v = res["intermediate"]["clean_m4v"]
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                    "-fflags", "+genpts", "-r", str(p["fps"]), "-f", "m4v",
                    "-i", clean_m4v, "-an", "-c:v", "libx264", "-preset",
                    "medium", "-crf", "20", "-pix_fmt", "yuv420p",
                    "-r", str(p["fps"]), "-movflags", "+faststart", ctl_mp4],
                   check=True, capture_output=True)

    for tag, path in (("A  journey mosh", a_mp4), ("control", ctl_mp4)):
        g = probe(path)
        print(f"  {tag:<18} {g['frames']} frames  {g['duration']:.3f}s  "
              f"{os.path.getsize(path) / 1e6:.2f} MB")

    meta = {"name": name, "src": args.src, "phase": args.phase,
            "gamma": gamma, "peak": peak, "triggers": triggers,
            "frames": p["frames"], "fps": p["fps"],
            "a": a_mp4, "control": ctl_mp4,
            "clean_m4v": res["intermediate"]["clean_m4v"],
            "moshed_m4v": res["intermediate"]["moshed_m4v"],
            "moshed_index": res["moshed_index"]}
    meta_path = os.path.join(args.outdir, f"{name}-journey-layers.json")
    json.dump(meta, open(meta_path, "w", encoding="utf-8"), indent=1)
    print(f"\nmeta -> {meta_path}")
    print(f"  ground truth: {len(res['moshed_index'])} moshed frames")


if __name__ == "__main__":
    main()
