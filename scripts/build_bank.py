"""Cut every phrase in config/beats.json out of its source, once.

The piece used to go to the tape on every render: thirty versions meant
thirty passes of ffmpeg over a 54-minute talk and fifteen news clips, and
anything applied to the footage was applied thirty times over. The pools are
small - a hundred-odd phrases, five and a half minutes of tape in total - and
every version is a permutation of them, so the tape only has to be cut once.

That is this: one clip per distinct phrase, with its own audio, at the frame
grid the renderer uses (24 fps, 48 kHz, 2000 samples a frame). A version is
then a stitch of clips rather than a set of seeks into an hour of video, and
anything expensive done to the footage - the tune look, in this case - is
done to a clip once and reused by every version that draws it.

Beat 7 draws from beat 1's pool, so a clip is keyed by what it is rather than
by which beat wants it: `<source>_<in in milliseconds>`. Two beats asking for
the same stretch of tape get the same clip, and nudging `in` by hand in
config/beats.json makes a new one, which is correct - it is a different cut.

    .venv/Scripts/python.exe scripts/build_bank.py
    .venv/Scripts/python.exe scripts/build_bank.py --force

Writes bank/clean/<id>.mp4 and bank/bank.json.
"""
import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline import bank as BK                                  # noqa: E402
from pipeline import beats as B                                  # noqa: E402
from pipeline import media as M                                  # noqa: E402
from pipeline import sources as SRCS                             # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--beats", default=B.CONFIG)
    ap.add_argument("--sources", default=SRCS.CONFIG)
    ap.add_argument("--out", default=BK.BANK_DIR)
    ap.add_argument("--crf", type=int, default=14,
                    help="the clean clip is an intermediate, so near-lossless")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    cfg = B.load(args.beats)
    srcs = {s["id"]: s for s in SRCS.load(args.sources)}
    wants = BK.phrases(cfg)
    clean_dir = os.path.join(args.out, "clean")
    os.makedirs(clean_dir, exist_ok=True)

    print(f"{len(wants)} distinct phrases in {len(cfg['beats'])} beats")
    print(f"{'id':<22} {'beats':>7} {'s':>6} {'frames':>7} {'words':>6}  text")
    print("-" * 110)

    clips, t0, built, reused = [], time.time(), 0, 0
    for w in wants:
        sid = w["source"]
        s = srcs[sid]
        out_mp4 = os.path.join(clean_dir, w["id"] + ".mp4")
        frag = M.extract_span(s["video"], w["in"], w["out"],
                              s["duration"], source=sid)
        n = frag["n_frames"]
        if n < 2:
            raise SystemExit(f"{w['id']}: {n} frames extracted")
        if args.force or not os.path.exists(out_mp4):
            audio = M.fragment_audio(frag, n_frames=n)
            M.assemble(frag["frames"][:n], audio, out_mp4,
                       os.path.join(clean_dir, w["id"] + "_frames.txt"),
                       crf=args.crf)
            os.remove(os.path.join(clean_dir, w["id"] + "_frames.txt"))
            built += 1
        else:
            reused += 1

        # Where a word ends, in this clip's own frames. A beat that has to
        # make room for a second phrase trims at one of these and never
        # inside a word; 0 is not one of them, because a clip trimmed to
        # nothing is not a trim.
        cuts = BK.word_frames(s, w["in"], w["out"], n)
        clips.append({
            "id": w["id"], "source": sid, "in": w["in"], "out": w["out"],
            "frames": n, "seconds": round(n / M.FPS, 3),
            "beats": w["beats"], "text": w["text"],
            "reads": w.get("reads"),
            "clean": os.path.relpath(out_mp4).replace("\\", "/"),
            "span_key": frag["key"],
            "word_frames": cuts,
        })
        print(f'{w["id"]:<22} {",".join(map(str, w["beats"])):>7} '
              f'{n / M.FPS:6.2f} {n:>7} {len(cuts):>6}  {w["text"][:52]}')

    total_f = sum(c["frames"] for c in clips)
    manifest = {
        "_comment": (
            "The clip bank: one entry per distinct phrase in "
            "config/beats.json, cut from its source at the renderer's own "
            "frame grid (24 fps, 48 kHz). `beats` is which beats may draw "
            "it - beat 7 shares beat 1's pool, so a clip can belong to two. "
            "`word_frames` are the frames a word ends on, which is where a "
            "beat carrying two phrases is allowed to trim. `span_key` is the "
            "media cache entry the audio comes from, so the assembler never "
            "decodes the source again. Rebuild with scripts/build_bank.py."),
        "fps": M.FPS,
        "built": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "beats_config": args.beats,
        "clips": clips,
        "frames": total_f,
        "seconds": round(total_f / M.FPS, 2),
    }
    path = os.path.join(args.out, "bank.json")
    json.dump(manifest, open(path, "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    size = sum(os.path.getsize(os.path.join(clean_dir, f))
               for f in os.listdir(clean_dir) if f.endswith(".mp4"))
    print("-" * 110)
    print(f"{len(clips)} clips  {total_f} frames  "
          f"{total_f / M.FPS:.1f}s = {total_f / M.FPS / 60:.2f} min  "
          f"{size / 1e6:.1f} MB")
    print(f"{built} cut, {reused} already on disk, in {time.time() - t0:.1f}s")
    by_src = {}
    for c in clips:
        e = by_src.setdefault(c["source"], [0, 0.0])
        e[0] += 1
        e[1] += c["seconds"]
    print("per source: " + "  ".join(
        f"{k}={v[0]}/{v[1]:.0f}s" for k, v in sorted(by_src.items())))
    print(f"\n-> {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
