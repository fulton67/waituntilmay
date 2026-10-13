#!/usr/bin/env python
"""Journey to the Center of the Internet - render one version.

Selection is random inside a fixed five-beat arc rather than across the whole
talk, so every version tells the same story with different words. The voice
runs as one continuous line; the picture cuts underneath it on its own rhythm
(an L-cut), so a cut never breaks a thought.

  python randomize.py                 one render, random seed
  python randomize.py --count 20      twenty renders
  python randomize.py --seed 1234     reproduce a render exactly
  python randomize.py --phase 3       force a phase (picture rhythm + mosh)
"""
import argparse
import json
import os
import random
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pipeline import arc as ARC
from pipeline import media as M
from pipeline import mosh as MOSH
from pipeline import overlay as OV
from pipeline import units as U

SRC = os.environ.get("JC_SRC", r"C:\Users\naimj\Downloads\videoplayback.mp4")
OUT_DIR = "renders"
CONFIG = "config/triggers.json"

OUT_SECONDS = ARC.TARGET_SECONDS
OUT_FRAMES = ARC.OUT_FRAMES
MAX_SOURCE_SECONDS = 30.0
MIN_SOURCE_SECONDS = 10.0
ROOM_TONE_SPAN = (3248.60, 3251.80)     # measured: -49.7 dBFS
BED_GAIN = 2.6                          # lifts the drone to roughly -45 dBFS

# The arc drives selection in every phase. Phase now only shapes the PICTURE
# rhythm and how steeply the mosh escalates - the depth, per concept.md.
PHASE = {
    1: dict(cut_frames=(30, 72), freeze_p=0.10, reverse_p=0.00,
            stutter_p=0.04, step_p=0.00, mosh_gamma=4.0, mosh_peak=0.72),
    2: dict(cut_frames=(18, 48), freeze_p=0.14, reverse_p=0.05,
            stutter_p=0.10, step_p=0.06, mosh_gamma=3.0, mosh_peak=0.86),
    3: dict(cut_frames=(10, 30), freeze_p=0.18, reverse_p=0.10,
            stutter_p=0.18, step_p=0.14, mosh_gamma=2.2, mosh_peak=0.95),
    4: dict(cut_frames=(4, 16), freeze_p=0.22, reverse_p=0.18,
            stutter_p=0.22, step_p=0.24, mosh_gamma=1.4, mosh_peak=1.00),
}


def norm_word(w):
    return "".join(c for c in w.lower() if c.isalnum() or c == "'")


def load_all():
    words = json.load(open("transcript/words.json", encoding="utf-8"))
    cfg = json.load(open(CONFIG, encoding="utf-8"))
    us = U.build_units()
    pools = U.pools(us)
    return words, cfg, us, pools


def trigger_word_ids(words, cfg):
    t = {w.lower() for w in cfg["trigger_words"]}
    return [w["i"] for w in words if norm_word(w["word"]) in t]


# ------------------------------------------------------------ measurement
def speech_metrics(voice, floor_db=-47.0, margin=9.0):
    """Measure the rendered voice track, not the plan.

    Share of the runtime carrying speech, and the longest silence, using a
    threshold relative to the measured room-tone floor.
    """
    n = M.SAMPLES_PER_FRAME
    nf = len(voice) // n
    if nf == 0:
        return {"speech_pct": 0.0, "longest_silence_s": 0.0, "frames": 0}
    x = voice[:nf * n].astype(np.float64).mean(axis=1).reshape(nf, n)
    rms = np.sqrt((x * x).mean(axis=1))
    lv = 20 * np.log10(np.maximum(rms, 1e-9) / 32768.0)
    speech = lv > (floor_db + margin)
    longest, run = 0, 0
    for s in speech:
        run = 0 if s else run + 1
        longest = max(longest, run)
    return {"speech_pct": round(100.0 * float(speech.mean()), 1),
            "longest_silence_s": round(longest / M.FPS, 3), "frames": nf}


def render_one(seed, phase=None, outdir=OUT_DIR, keep_clean=False, quiet=False):
    rng = random.Random(seed)
    words, cfg, us, pools = load_all()
    dur_limit = M.probe_duration(SRC)
    if phase is None:
        phase = rng.randint(1, 4)
    spec = PHASE[phase]

    tone = M.room_tone(SRC, *ROOM_TONE_SPAN)
    bed_src = M.drone(SRC)

    plan = ARC.plan_arc(rng, us, pools)
    tw = trigger_word_ids(words, cfg)
    voice, placement, triggers, media_cache = ARC.build_audio(
        rng, SRC, plan, tone, dur_limit, tw, words)
    frames, vops = ARC.build_video(rng, plan, media_cache, spec)

    # a quiet bed so silence reads as intentional rather than empty
    bed = M.room_tone_block(bed_src, OUT_FRAMES, rng)
    audio = M.mix(voice, bed, BED_GAIN)

    # source footage actually consumed (each unit counted once)
    uniq = {u["id"]: u for u in plan["order"]}
    source_seconds = sum(sum(b - a for a, b in u["spans"]) for u in uniq.values())

    os.makedirs(outdir, exist_ok=True)
    base = os.path.join(outdir, f"v_{seed}")
    clean, final = base + "_clean.mp4", base + ".mp4"

    M.assemble(frames, audio, clean, base + "_frames.txt",
               overlay_filter=OV.cam_overlay(OUT_SECONDS))
    moshed = MOSH.datamosh(clean, final, triggers=triggers, n_frames=OUT_FRAMES,
                           gamma=spec["mosh_gamma"], peak=spec["mosh_peak"],
                           cfg=cfg, seed=seed)

    meas = M.measure(final)
    sm = speech_metrics(voice)
    beats_log = [{"beat": b, "units": len(chosen),
                  "seconds": round(sum(u["duration"] for u in chosen), 3),
                  "text": [u["text"] for u in chosen]}
                 for b, chosen in zip(U.BEATS, plan["beats"])]

    log = {
        "seed": seed, "phase": phase, "output": os.path.basename(final),
        "structure": "5-beat arc: " + " -> ".join(U.BEATS),
        "refrain": plan["refrain"]["text"] if plan["refrain"] else None,
        "refrain_seconds": plan["refrain"]["duration"] if plan["refrain"] else 0,
        "units_total": len(plan["order"]),
        "units_unique": len(uniq),
        "beats": beats_log,
        "units_per_beat": [len(b) for b in plan["beats"]],
        "total_source_seconds": round(source_seconds, 3),
        "speech_pct": sm["speech_pct"],
        "longest_silence_s": sm["longest_silence_s"],
        "planned_speech_seconds": plan["speech_seconds"],
        "output_duration": meas["container_duration"],
        "video_duration": meas["video_duration"],
        "audio_duration": meas["audio_duration"],
        "av_drift_seconds": round(abs((meas["video_duration"] or 0) -
                                      (meas["audio_duration"] or 0)), 4),
        "n_frames": meas["n_frames"],
        "resolution": f'{meas["width"]}x{meas["height"]}',
        "internet_triggers": len(triggers),
        "trigger_frames": triggers,
        "moshed_frames": moshed["moshed_frames"],
        "picture_cuts": len(vops),
        "picture_ops": vops,
        "audio_track": [{"frame": p["frame"],
                         "seconds": round(p["frame"] / M.FPS, 3),
                         "unit": p["unit"], "dur": p["seconds"], "text": p["text"]}
                        for p in placement],
        "audio_transcript": " ".join(p["text"] for p in placement),
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
        print(f"  seed {seed:>10}  ph{phase}  units {len(plan['order']):>2}"
              f"({'/'.join(str(len(b)) for b in plan['beats'])})  "
              f"src {source_seconds:5.2f}s  speech {sm['speech_pct']:4.1f}%  "
              f"gap {sm['longest_silence_s']:.2f}s  cuts {len(vops):>3}  "
              f"trig {len(triggers)}  mosh {moshed['moshed_frames']:>3}  "
              f"out {meas['container_duration']:.3f}s")
    return log


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--phase", type=int, default=None, choices=[1, 2, 3, 4])
    ap.add_argument("--count", type=int, default=1)
    ap.add_argument("--outdir", default=OUT_DIR)
    ap.add_argument("--keep-clean", action="store_true")
    args = ap.parse_args()

    t0 = time.time()
    for n in range(args.count):
        seed = args.seed if args.seed is not None else random.randrange(1, 10 ** 9)
        if args.seed is not None and args.count > 1:
            seed = args.seed + n
        render_one(seed, args.phase, args.outdir, args.keep_clean)
    print(f"done in {time.time()-t0:.1f}s")


if __name__ == "__main__":
    main()
