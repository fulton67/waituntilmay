#!/usr/bin/env python
"""Journey to the Center of the Internet - one version, stitched from the bank.

This replaces assemble.py's second half. assemble.py went to the tape for
every version: thirty renders meant thirty passes over a 54-minute talk, and
anything done to the footage was done thirty times. The clip bank cuts each
phrase once (scripts/build_bank.py) and shades each one once
(scripts/shade_bank.mjs), so a version is a stitch of frames that already
exist - no decode, no seek, no look.

What changed in the piece, not just in the pipeline
---------------------------------------------------
A beat may now say two things instead of one. Beats 4 and 5 always do: the
cables being cut and who cut them are where the piece argues rather than
asserts, so the break is reported twice and answered twice. The rest carry a
second phrase when there is room for one, which there usually is. That takes
the piece from seven cuts to eleven - a cut every 2.7s instead of every 4.3 -
and the slots stop being equal: the planner trims at word boundaries to land
on exactly 720 frames and hands out whatever is left as breath at the end of
each beat. Where the old renderer held 185 frames of still picture a version,
this one holds about six.

The two datamoshes are unchanged, and deliberately so: the same code, the
same seed, the same 12-24 frame bloom, at the first frame of beat 4 and the
first frame of beat 5 - which are now wherever the plan puts them rather
than at 309 and 412.

    python assemble_bank.py --seed 1
    python assemble_bank.py --seeds 1-30 --outdir renders_bank
    python assemble_bank.py --seed 1 --keep-streams
"""
import argparse
import json
import os
import random
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pipeline import bank as BK
from pipeline import beats as B
from pipeline import media as M
from pipeline import mosh_cuts as MC
from pipeline import sources as SRCS

OUT_DIR = "renders_bank"
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


def shaded_frames(lookdir, clip_id, n):
    """The shaded frames for one clip, in order, checked for existence."""
    d = os.path.join(lookdir, clip_id)
    out = [os.path.join(d, f"f_{i:05d}.jpg") for i in range(n)]
    missing = [p for p in out if not os.path.exists(p)]
    if missing:
        raise RuntimeError(f"{clip_id}: {len(missing)} shaded frames missing "
                           f"(first {os.path.basename(missing[0])}); "
                           f"re-run scripts/shade_bank.mjs")
    return out


def render_one(seed, outdir=OUT_DIR, cfg=None, bank=None, srcs=None,
               tones=None, lookdir=None, look=None, keep_clean=False,
               keep_streams=False, quiet=False):
    t0 = time.time()
    rng = random.Random(seed)
    cfg = cfg or B.load()
    bank = bank or BK.load()
    srcs = srcs or {s["id"]: s for s in SRCS.load(SOURCES)}
    tones = tones if tones is not None else {}
    look = look or BK.look_hash()
    lookdir = lookdir or BK.look_dir(look)

    plan = BK.plan(rng, cfg, bank)
    faults = BK.source_faults(plan)
    if faults:
        raise RuntimeError(f"a source speaks two beats running: {faults}")

    t_plan = time.time()
    frames, segments, audio_blocks, track = [], [], [], []
    for p in plan["phrases"]:
        clip = bank["by_id"][p["clip"]]
        sid = p["source"]
        s = srcs[sid]
        nf, hold = p["frames"], p["hold"]

        # The picture is the shaded frames of this clip; the voice is the
        # same stretch of the same tape, out of the media cache the bank was
        # cut from. Frame i of the phrase carries the samples of frame i of
        # that stretch, by construction rather than by correction - which is
        # the whole of the alignment gate.
        frames.extend(shaded_frames(lookdir, clip["id"], nf))
        frag = M.extract_span(s["video"], clip["in"], clip["out"],
                              s["duration"], source=sid)
        whole = M.fragment_audio(frag, n_frames=clip["frames"])
        audio_blocks.append(whole[:nf * M.SAMPLES_PER_FRAME])

        span = [[p["in"], p["out"]]]
        segments.append({
            "kind": "speech", "beat": p["beat"], "beat_name": p["beat_name"],
            "phrase": p["index"], "clip": clip["id"],
            "frame": len(frames) - nf, "n_frames": nf,
            "seconds": round(nf / M.FPS, 3),
            "src": sid, "audio_src": sid,
            "video_span": span, "audio_span": span,
            "av_offset_frames": 0, "text": p["text"],
            "trimmed_frames": p["trimmed"],
        })
        track.append({"beat": p["beat"], "beat_name": p["beat_name"],
                      "phrase": p["index"], "clip": clip["id"],
                      "frame": segments[-1]["frame"],
                      "seconds": round(segments[-1]["frame"] / M.FPS, 3),
                      "src": sid, "dur": segments[-1]["seconds"],
                      "in": p["in"], "out": p["out"], "text": p["text"]})

        if hold:
            # Breath. The picture is this speaker's own last shaded frame and
            # the sound is this source's own measured room tone at its own
            # pitch; nothing is filled in from anywhere else.
            tone = tones.get(sid)
            frames.extend([frames[-1]] * hold)
            audio_blocks.append(
                M.room_tone_block(tone["tone"], hold, rng) if tone is not None
                else np.zeros((hold * M.SAMPLES_PER_FRAME, M.CHANNELS),
                              np.int16))
            segments.append({
                "kind": "hold", "beat": p["beat"],
                "beat_name": p["beat_name"], "phrase": p["index"],
                "clip": clip["id"],
                "frame": len(frames) - hold, "n_frames": hold,
                "seconds": round(hold / M.FPS, 3),
                "src": sid, "audio_src": sid,
                "video_span": None, "audio_span": None,
                "av_offset_frames": 0, "op": "hold",
            })

    if len(frames) != B.OUT_FRAMES:
        raise RuntimeError(f"{len(frames)} frames stitched, not "
                           f"{B.OUT_FRAMES}")
    audio = np.concatenate(audio_blocks, axis=0)
    audio = M.fit_samples(audio, B.OUT_FRAMES * M.SAMPLES_PER_FRAME)
    t_gather = time.time()

    os.makedirs(outdir, exist_ok=True)
    base = os.path.join(outdir, f"v_{seed}")
    clean, final = base + "_clean.mp4", base + ".mp4"
    # The clean cut is an intermediate: ffgac re-encodes it to MPEG-4 in
    # the next breath, so it is written at the fastest preset and a crf
    # low enough that it is not the generation that costs anything. At
    # preset medium it was 6.1s of the 12.0s a version took.
    M.assemble(frames, audio, clean, base + "_frames.txt",
               crf=14, preset="veryfast")
    t_clean = time.time()

    mosh = MC.datamosh(clean, final, plan["cuts"], n_frames=B.OUT_FRAMES,
                       seed=seed, fps=M.FPS, keep_intermediate=keep_streams,
                       preset="fast")
    t_mosh = time.time()

    meas = M.measure(final)
    sm = speech_metrics(audio)

    by_beat = {}
    for p in plan["phrases"]:
        e = by_beat.setdefault(p["beat"], {"n": p["beat"],
                                           "name": p["beat_name"],
                                           "phrases": [], "frames": 0,
                                           "hold_frames": 0,
                                           "sources": []})
        e["phrases"].append({"clip": p["clip"], "source": p["source"],
                             "in": p["in"], "out": p["out"],
                             "frames": p["frames"], "hold": p["hold"],
                             "trimmed": p["trimmed"], "text": p["text"]})
        e["frames"] += p["frames"]
        e["hold_frames"] += p["hold"]
        if p["source"] not in e["sources"]:
            e["sources"].append(p["source"])
    beats = []
    for n in range(1, len(B.BEAT_NAMES) + 1):
        e = by_beat[n]
        e["source"] = e["phrases"][0]["source"]
        e["seconds"] = round(e["frames"] / M.FPS, 3)
        beats.append(e)

    per_src = {}
    for t in track:
        e = per_src.setdefault(t["src"], {"phrases": 0, "seconds": 0.0})
        e["phrases"] += 1
        e["seconds"] = round(e["seconds"] + t["dur"], 3)
    tot = sum(e["seconds"] for e in per_src.values()) or 1.0
    for e in per_src.values():
        e["pct"] = round(100.0 * e["seconds"] / tot, 1)

    log = {
        "seed": seed,
        "renderer": "assemble_bank.py",
        "output": os.path.basename(final),
        "structure": ("7-beat arc, 1-2 phrases a beat: "
                      + " -> ".join(B.BEAT_NAMES)),
        "look": look,
        "look_file": BK.LOOK,
        "bank": os.path.join(BK.BANK_DIR, "bank.json"),
        "overlay": None,
        "pitch_shift": False,
        # The slots are no longer equal: they are what the plan made them,
        # and the gate reads them from here rather than from the arc.
        "slot_frames": [b["frames"] + b["hold_frames"] for b in beats],
        "min_phrase_seconds": BK.MIN_PHRASE_FRAMES / M.FPS,
        "mosh_beats": list(BK.TWO_ALWAYS),
        "mosh_cuts_expected": plan["cuts"],
        "n_phrases": plan["n_phrases"],
        "mean_cut_seconds": plan["mean_cut_seconds"],
        "trimmed_frames": sum(p["trimmed"] for p in plan["phrases"]),
        "held_frames": sum(p["hold"] for p in plan["phrases"]),
        "beats": beats,
        "phrases": plan["phrases"],
        "source_mix": per_src,
        "source_order": [b["source"] for b in beats],
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
                      for k, v in tones.items() if k in per_src},
        "segments": segments,
        "audio_track": track,
        "audio_transcript": " ".join(t["text"] for t in track),
        "seconds": {
            "plan": round(t_plan - t0, 3),
            "gather": round(t_gather - t_plan, 3),
            "encode_clean": round(t_clean - t_gather, 3),
            "datamosh": round(t_mosh - t_clean, 3),
            "total": round(time.time() - t0, 3),
        },
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
        s = log["seconds"]
        print(f"  seed {seed:>5}  {plan['n_phrases']:>2} phrases  "
              f"cut/{plan['mean_cut_seconds']:.2f}s  "
              f"trim {log['trimmed_frames']:>3}f  hold {log['held_frames']:>3}f  "
              f"speech {sm['speech_pct']:4.1f}%  "
              f"mosh {plan['cuts'][0]}+{mosh['cuts'][0]['bloom']} "
              f"{plan['cuts'][1]}+{mosh['cuts'][1]['bloom']}  "
              f"{meas['container_duration']:.3f}s {meas['n_frames']}f  "
              f"[{s['gather']:.1f}+{s['encode_clean']:.1f}+"
              f"{s['datamosh']:.1f}={s['total']:.1f}s]")
    return log


def seed_list(args):
    if args.seeds:
        out = []
        for part in args.seeds.split(","):
            if "-" in part:
                a, b = part.split("-")
                out.extend(range(int(a), int(b) + 1))
            else:
                out.append(int(part))
        return out
    if args.seed is not None:
        return [args.seed + i for i in range(args.count)]
    return [random.randrange(1, 10 ** 9) for _ in range(args.count)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--seeds", default=None,
                    help="an explicit list or range, e.g. 1-30")
    ap.add_argument("--count", type=int, default=1)
    ap.add_argument("--outdir", default=OUT_DIR)
    ap.add_argument("--beats", default=B.CONFIG)
    ap.add_argument("--bank", default=None)
    ap.add_argument("--look", default=None, help="a look hash; default is "
                                                 "whatever journey/look.json "
                                                 "hashes to")
    ap.add_argument("--sources", default=SOURCES)
    ap.add_argument("--keep-clean", action="store_true")
    ap.add_argument("--keep-streams", action="store_true")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    cfg = B.load(args.beats)
    bank = BK.load(args.bank)
    srcs = {s["id"]: s for s in SRCS.load(args.sources)}
    look = args.look or BK.look_hash()
    lookdir = BK.look_dir(look)
    if not os.path.isdir(lookdir):
        raise SystemExit(f"{lookdir} does not exist - shade the bank first:\n"
                         f"  node scripts/shade_bank.mjs")

    print(f"bank {len(bank['clips'])} clips  look {look}  "
          f"{lookdir}")
    wanted = sorted({c["source"] for c in bank["clips"]})
    tones = {sid: M.quietest_window(srcs[sid]["video"], source=sid)
             for sid in wanted}

    t0, failures = time.time(), []
    seeds = seed_list(args)
    for seed in seeds:
        try:
            render_one(seed, args.outdir, cfg=cfg, bank=bank, srcs=srcs,
                       tones=tones, lookdir=lookdir, look=look,
                       keep_clean=args.keep_clean,
                       keep_streams=args.keep_streams, quiet=args.quiet)
        except Exception as e:
            print(f"  seed {seed:>5}  FAILED: {e}")
            failures.append((seed, str(e)))
    el = time.time() - t0
    done = len(seeds) - len(failures)
    print(f"done in {el:.1f}s ({done}/{len(seeds)} rendered, "
          f"{el / max(done, 1):.1f}s a version)")
    if failures:
        print("\nfailed seeds (rerun them with --seed):")
        for seed, why in failures:
            print(f"  {seed}: {why.splitlines()[0]}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
