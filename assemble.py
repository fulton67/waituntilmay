#!/usr/bin/env python
"""Journey to the Center of the Internet - assemble one version.

This replaces randomize.py as the production renderer. randomize.py drew
phrases at random inside a five-beat shape; this plays a fixed seven-beat arc,
in one order, every version:

    claim -> place -> control -> break -> who -> doubt -> return

A version is one pick per beat from config/beats.json. The pools are authored
and the file is meant to be edited by hand, so the piece is an assemblage with
thirty castings rather than thirty outcomes of a draw. See pipeline/beats.py.

    python assemble.py                     one version, random seed
    python assemble.py --count 30          a batch
    python assemble.py --seed 1234         reproduce a version exactly
    python assemble.py --outdir renders_arc

Three things the old renderer did are gone, deliberately:

  * the surveillance overlay. No CAM 03, no clock, no REC, no numbers
    anywhere on screen. scripts/verify_arc.py measures the corner regions
    for burn-in rather than taking this comment's word for it.
  * the pitch-shifted drone bed. Nothing in the audio path changes pitch:
    each source's own room tone, at its own pitch, runs under its own breath
    holds, and the voice is cut and copied, never resampled.
  * the escalating mosh curve and the ffgac amplify/underlayer/exchange
    composite. The damage is now two real datamoshes at two named cuts and
    nothing else; the composite look stays in the lab, behind
    randomize.py and /mosh-lab/tune.
"""
import argparse
import json
import os
import random
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pipeline import beats as B
from pipeline import media as M
from pipeline import mosh_cuts as MC
from pipeline import sources as SRCS

OUT_DIR = "renders_arc"
SOURCES = os.environ.get("JC_SOURCES", SRCS.CONFIG)


def speech_metrics(voice, floor_db=-47.0, margin=9.0):
    """Measure the rendered voice track, not the plan."""
    n = M.SAMPLES_PER_FRAME
    nf = len(voice) // n
    if nf == 0:
        return {"speech_pct": 0.0, "longest_silence_s": 0.0}
    x = voice[:nf * n].astype(np.float64).mean(axis=1).reshape(nf, n)
    rms = np.sqrt((x * x).mean(axis=1))
    lv = 20 * np.log10(np.maximum(rms, 1e-9) / 32768.0)
    speech = lv > (floor_db + margin)
    longest, run = 0, 0
    for s in speech:
        run = 0 if s else run + 1
        longest = max(longest, run)
    return {"speech_pct": round(100.0 * float(speech.mean()), 1),
            "longest_silence_s": round(longest / M.FPS, 3)}


def render_one(seed, outdir=OUT_DIR, cfg=None, srcs=None, tones=None,
               keep_clean=False, keep_streams=False, quiet=False):
    rng = random.Random(seed)
    cfg = cfg or B.load()
    srcs = srcs or {s["id"]: s for s in SRCS.load(SOURCES)}
    tones = tones if tones is not None else {}

    picks = B.draw(rng, cfg)
    faults = B.consecutive_source_faults(picks)
    if faults:
        raise RuntimeError(f"a source speaks two beats running: {faults}")

    slots = cfg["slot_frames"]
    frames, segments, audio_blocks, track = [], [], [], []

    for k, p in enumerate(picks):
        sid = p["source"]
        s = srcs[sid]
        slot = slots[k]
        frag = M.extract_span(s["video"], p["in"], p["out"],
                              s["duration"], source=sid)
        fr = frag["frames"]
        if not fr:
            raise RuntimeError(f"beat {p['beat']}: no frames for {sid} "
                               f"[{p['in']}, {p['out']}]")
        n = min(len(fr), slot)
        hold = slot - n
        # The picture and the voice are cut from the same span and fitted to
        # the same frame count, so frame i of a beat carries the samples of
        # frame i of that same stretch of tape. The offset is zero by
        # construction, not by correction.
        audio_blocks.append(M.fragment_audio(frag, n_frames=n))
        frames.extend(fr[:n])
        # The realised span, which is what actually plays: the frame grid is
        # 24fps from `in`, so n frames is n/24 of the source however the
        # authored `out` rounded.
        r_out = round(p["in"] + n / M.FPS, 3)
        span = [[p["in"], r_out]]
        segments.append({
            "kind": "speech", "beat": p["beat"], "beat_name": p["beat_name"],
            "frame": len(frames) - n, "n_frames": n,
            "seconds": round(n / M.FPS, 3),
            "src": sid, "audio_src": sid,
            "video_span": span, "audio_span": span,
            "av_offset_frames": 0, "text": p["text"],
        })
        track.append({"beat": p["beat"], "beat_name": p["beat_name"],
                      "frame": segments[-1]["frame"],
                      "seconds": round(segments[-1]["frame"] / M.FPS, 3),
                      "src": sid, "dur": segments[-1]["seconds"],
                      "in": p["in"], "out": r_out, "text": p["text"]})

        if hold:
            # A phrase shorter than its slot holds on the speaker's last
            # frame - the breath - and nothing is filled in from elsewhere:
            # the picture is that speaker's own last frame and the sound is
            # that source's own measured room tone at its own pitch.
            tone = tones.get(sid)
            frames.extend([fr[n - 1]] * hold)
            audio_blocks.append(
                M.room_tone_block(tone["tone"], hold, rng) if tone is not None
                else np.zeros((hold * M.SAMPLES_PER_FRAME, M.CHANNELS),
                              np.int16))
            segments.append({
                "kind": "hold", "beat": p["beat"],
                "beat_name": p["beat_name"],
                "frame": len(frames) - hold, "n_frames": hold,
                "seconds": round(hold / M.FPS, 3),
                "src": sid, "audio_src": sid,
                "video_span": None, "audio_span": None,
                "av_offset_frames": 0, "op": "hold",
            })

    if len(frames) != B.OUT_FRAMES:
        raise RuntimeError(f"{len(frames)} frames assembled, not "
                           f"{B.OUT_FRAMES}")
    audio = np.concatenate(audio_blocks, axis=0)
    audio = M.fit_samples(audio, B.OUT_FRAMES * M.SAMPLES_PER_FRAME)

    os.makedirs(outdir, exist_ok=True)
    base = os.path.join(outdir, f"v_{seed}")
    clean, final = base + "_clean.mp4", base + ".mp4"

    # overlay_filter is not passed at all. There is no burn-in to switch off.
    M.assemble(frames, audio, clean, base + "_frames.txt")

    # The two cuts that mosh, by the beat they land on: the first frame of
    # beat 4 and the first frame of beat 5.
    cuts = [B.SLOT_START[n - 1] for n in cfg["mosh_beats"]]
    mosh = MC.datamosh(clean, final, cuts, n_frames=B.OUT_FRAMES, seed=seed,
                       fps=M.FPS, keep_intermediate=keep_streams)

    meas = M.measure(final)
    sm = speech_metrics(audio)
    per_src = {}
    for t in track:
        e = per_src.setdefault(t["src"], {"beats": 0, "seconds": 0.0})
        e["beats"] += 1
        e["seconds"] = round(e["seconds"] + t["dur"], 3)
    tot = sum(e["seconds"] for e in per_src.values()) or 1.0
    for e in per_src.values():
        e["pct"] = round(100.0 * e["seconds"] / tot, 1)

    log = {
        "seed": seed,
        "renderer": "assemble.py",
        "output": os.path.basename(final),
        "structure": "7-beat arc: " + " -> ".join(B.BEAT_NAMES),
        "overlay": None,
        "pitch_shift": False,
        "slot_frames": slots,
        "beats": [{"n": p["beat"], "name": p["beat_name"], "source": p["source"],
                   "in": p["in"], "out": t["out"], "text": p["text"],
                   "frames": s["n_frames"],
                   "hold_frames": slots[i] - s["n_frames"],
                   "seconds": s["seconds"]}
                  for i, (p, t, s) in enumerate(
                      zip(picks, track,
                          [x for x in segments if x["kind"] == "speech"]))],
        "source_mix": per_src,
        "source_order": [p["source"] for p in picks],
        "mosh": mosh,
        "speech_pct": sm["speech_pct"],
        "longest_silence_s": sm["longest_silence_s"],
        "output_duration": meas["container_duration"],
        "video_duration": meas["video_duration"],
        "audio_duration": meas["audio_duration"],
        "av_drift_seconds": round(abs((meas["video_duration"] or 0) -
                                      (meas["audio_duration"] or 0)), 4),
        "n_frames": meas["n_frames"],
        "resolution": f'{meas["width"]}x{meas["height"]}',
        "room_tone": {k: {x: v[x] for x in ("start", "end", "dbfs")}
                      for k, v in tones.items()
                      if k in per_src},
        "segments": segments,
        "audio_track": track,
        "audio_transcript": " ".join(t["text"] for t in track),
    }
    json.dump(log, open(base + ".json", "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    if not keep_clean:
        for f in (clean, base + "_frames.txt"):
            try:
                os.remove(f)
            except OSError:
                pass
    if not quiet:
        blooms = "/".join(str(c["bloom"]) for c in mosh["cuts"])
        print(f"  seed {seed:>10}  "
              f"beats {'/'.join(str(b['frames']) for b in log['beats'])}f  "
              f"holds {sum(b['hold_frames'] for b in log['beats']):>3}f  "
              f"speech {sm['speech_pct']:4.1f}%  "
              f"src {'/'.join(log['source_order'][:3])}...  "
              f"mosh {cuts[0]}+{blooms.split('/')[0]} "
              f"{cuts[1]}+{blooms.split('/')[1]}  "
              f"out {meas['container_duration']:.3f}s  {meas['n_frames']}f")
    return log


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--count", type=int, default=1)
    ap.add_argument("--outdir", default=OUT_DIR)
    ap.add_argument("--beats", default=B.CONFIG)
    ap.add_argument("--sources", default=SOURCES)
    ap.add_argument("--keep-clean", action="store_true")
    ap.add_argument("--keep-streams", action="store_true",
                    help="keep the clean and moshed .m4v for the mosh audit")
    args = ap.parse_args()

    cfg = B.load(args.beats)
    srcs = {s["id"]: s for s in SRCS.load(args.sources)}
    print("pools: " + "  ".join(f"{n}:{name}={k}"
                                for n, name, k in B.pool_sizes(cfg)))

    # Each source's room tone is measured once for the whole batch - the
    # decode of blum's 54 minutes is the slow part, and it is cached on disk
    # besides.
    wanted = sorted({c["source"] for b in cfg["beats"] for c in b["pool"]})
    tones = {}
    for sid in wanted:
        t = M.quietest_window(srcs[sid]["video"], source=sid)
        tones[sid] = t
    print("room tone: " + "  ".join(
        f"{k} {v['dbfs']:.0f}dBFS@{v['start']:.0f}s" for k, v in tones.items()))

    t0 = time.time()
    failures = []
    for n in range(args.count):
        seed = args.seed if args.seed is not None else random.randrange(1, 10 ** 9)
        if args.seed is not None and args.count > 1:
            seed = args.seed + n
        try:
            render_one(seed, args.outdir, cfg=cfg, srcs=srcs, tones=tones,
                       keep_clean=args.keep_clean,
                       keep_streams=args.keep_streams)
        except Exception as e:
            print(f"  seed {seed:>10}  FAILED: {e}")
            failures.append((seed, str(e)))
    print(f"done in {time.time()-t0:.1f}s "
          f"({args.count - len(failures)}/{args.count} rendered)")
    if failures:
        print("\nfailed seeds (rerun them with --seed):")
        for seed, why in failures:
            print(f"  {seed}: {why.splitlines()[0]}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
