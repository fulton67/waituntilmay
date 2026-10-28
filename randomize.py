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
from collections import Counter
import json
import os
import random
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pipeline import arc as ARC
from pipeline import link as LINK
from pipeline import media as M
from pipeline import mosh as MOSH
from pipeline import moshv2 as MOSHV2
from pipeline import overlay as OV
from pipeline import sources as SRCS
from pipeline import units as U

OUT_DIR = "renders"
CONFIG = "config/triggers.json"
SOURCES = os.environ.get("JC_SOURCES", SRCS.CONFIG)

OUT_SECONDS = ARC.TARGET_SECONDS
OUT_FRAMES = ARC.OUT_FRAMES
MAX_SOURCE_SECONDS = 30.0
MIN_SOURCE_SECONDS = 10.0
ROOM_TONE_SPAN = (3248.60, 3251.80)     # measured: -49.7 dBFS
BED_GAIN = 2.6                          # lifts the drone to roughly -45 dBFS

# The arc drives selection in every phase. Phase shapes how steeply the mosh
# escalates - the depth, per concept.md - and how restless the picture gets in
# the breaths between phrases.
#
# freeze_p/reverse_p/stutter_p/step_p apply to BREATH HOLDS ONLY. Over speech
# the picture is locked to the voice, one segment per phrase at that phrase's
# own timestamps; a freeze or a reverse there would put the wrong frame
# against the word being said, which is the fault the lock exists to prevent
# and the alignment gate measures. In a pause nobody is speaking, so the
# frames of whoever just finished can be rewound or stuttered without lying
# about who is on screen. cut_frames is gone for good: there is no
# independent cutting rhythm left to tune.
PHASE = {
    1: dict(freeze_p=0.10, reverse_p=0.00, stutter_p=0.04, step_p=0.00,
            mosh_gamma=4.0, mosh_peak=0.72),
    2: dict(freeze_p=0.14, reverse_p=0.05, stutter_p=0.10, step_p=0.06,
            mosh_gamma=3.0, mosh_peak=0.86),
    3: dict(freeze_p=0.18, reverse_p=0.10, stutter_p=0.18, step_p=0.14,
            mosh_gamma=2.2, mosh_peak=0.95),
    4: dict(freeze_p=0.22, reverse_p=0.18, stutter_p=0.22, step_p=0.24,
            mosh_gamma=1.4, mosh_peak=1.00),
}


def norm_word(w):
    return "".join(c for c in w.lower() if c.isalnum() or c == "'")


def load_all(config=SOURCES):
    """The whole pool: every enabled source's words, units and weights.

    One version can draw from all of them, so the units arrive in one list
    with globally unique ids and a `src` on each. The per-source word lists
    stay separate, because a word index only means anything inside the
    source it was aligned against.
    """
    srcs = SRCS.load(config)
    cfg = json.load(open(CONFIG, encoding="utf-8"))
    words = {s["id"]: json.load(open(s["words"], encoding="utf-8"))
             for s in srcs}
    us = U.build_pool(srcs)
    # the keys the sequencer links cuts on, attached once for the whole run
    LINK.attach(us, srcs)
    # and which units can fire a mosh trigger at all, so the planner can make
    # sure one of them is in the edit instead of hoping. A word index only
    # means anything inside its own source, hence the per-source lookup.
    tw = trigger_word_ids(words, cfg)
    for u in us:
        t = set(tw.get(u.get("src")) or [])
        u["has_trigger"] = bool(t & set(u.get("word_ids") or []))
    pools = U.pools(us)
    return srcs, words, cfg, us, pools


def trigger_word_ids(words, cfg):
    """Per-source trigger word indices, keyed the same way `words` is."""
    t = {w.lower() for w in cfg["trigger_words"]}
    if isinstance(words, dict):
        return {sid: [w["i"] for w in ws if norm_word(w["word"]) in t]
                for sid, ws in words.items()}
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


def render_one(seed, phase=None, outdir=OUT_DIR, keep_clean=False, quiet=False,
               config=SOURCES):
    rng = random.Random(seed)
    srcs, words, cfg, us, pools = load_all(config)
    by_id = {s["id"]: s for s in srcs}
    weights = SRCS.weights(srcs)
    if phase is None:
        phase = rng.randint(1, 4)
    spec = PHASE[phase]

    # the bed is sampled from one source however many the words came from,
    # so silence between beats still sounds like one room
    prim = SRCS.primary(srcs, config)
    tone_span = prim.get("room_tone") or list(ROOM_TONE_SPAN)
    tone = M.room_tone(prim["video"], *tone_span, source=prim["id"])
    dr = prim.get("drone") or {}
    bed_src = M.drone(prim["video"], start=dr.get("start", 1849.2),
                      seconds=dr.get("seconds", 8.0), source=prim["id"])

    plan = ARC.plan_arc(rng, us, pools, weights=weights)
    tw = trigger_word_ids(words, cfg)
    voice, placement, triggers, media_cache = ARC.build_audio(
        rng, prim["video"], plan, tone, prim["duration"], tw, words, cfg=cfg,
        srcs=by_id)
    # the picture follows the voice: same source, same timestamps, per segment.
    # spec only reaches the breaths - see PHASE and ARC._hold_frames
    frames, segments = ARC.build_video(rng, plan, placement, media_cache, spec)

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
    # v2: the v1 mosh becomes the base, and its own glitched blocks become
    # windows onto a motion-vector-transferred version of the same edit
    moshed = MOSHV2.datamosh_v2(clean, final, triggers=triggers,
                                n_frames=OUT_FRAMES, gamma=spec["mosh_gamma"],
                                peak=spec["mosh_peak"], cfg=cfg, seed=seed,
                                fps=M.FPS, quiet=quiet)

    meas = M.measure(final)
    sm = speech_metrics(voice)
    beats_log = [{"beat": b, "units": len(chosen),
                  "seconds": round(sum(u["duration"] for u in chosen), 3),
                  "sources": [u.get("src") for u in chosen],
                  "text": [u["text"] for u in chosen]}
                 for b, chosen in zip(U.BEATS, plan["beats"])]

    # which sources this version actually drew on, in seconds of speech and
    # in share of the units - the mix, measured on the result not the config
    per_src = {}
    for p in placement:
        k = p.get("src") or prim["id"]
        e = per_src.setdefault(k, {"units": 0, "seconds": 0.0})
        e["units"] += 1
        e["seconds"] = round(e["seconds"] + p["seconds"], 3)
    tot_s = sum(e["seconds"] for e in per_src.values()) or 1.0
    for e in per_src.values():
        e["pct"] = round(100.0 * e["seconds"] / tot_s, 1)
    crossings = sum(1 for a, b in zip(placement, placement[1:])
                    if a.get("src") != b.get("src"))

    # how the cuts were made: a cut that shares a word or a tag with the line
    # before it reads as an exchange, one that shares nothing reads as a
    # shuffle. Counted over the order that shipped, so trimming cannot leave
    # the number describing an edit that no longer exists.
    links = plan.get("links") or [None] * len(placement)
    cuts = [lk for lk in links if lk]
    linked = [lk for lk in cuts if lk["kind"] != "none"]
    cross = [lk for lk in cuts if lk["cross"]]
    link_stats = {
        "cuts": len(cuts),
        "linked": len(linked),
        "random": len(cuts) - len(linked),
        "linked_pct": round(100.0 * len(linked) / max(len(cuts), 1), 1),
        "cross_source": len(cross),
        "cross_linked": sum(1 for lk in cross if lk["kind"] != "none"),
        "by_word": sum(1 for lk in cuts if lk["kind"] == "word"),
        "by_tag": sum(1 for lk in cuts if lk["kind"] == "tag"),
    }
    mix_str = "/".join("%s%.0f" % (k, per_src[k]["pct"]) for k in sorted(per_src))

    log = {
        "seed": seed, "phase": phase, "output": os.path.basename(final),
        "structure": "5-beat arc: " + " -> ".join(U.BEATS),
        "sources_enabled": [s["id"] for s in srcs],
        "source_weights": {k: round(v, 3) for k, v in weights.items()},
        "source_mix": per_src,
        "source_crossings": crossings,
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
        "mosh_version": 2,
        "b_detector": moshed["b_detector"],
        "b_coverage_final_pct": moshed["b_coverage_final_pct"],
        "b_coverage_per_second": moshed["b_coverage_per_second"],
        "b_opened_by": moshed["mask"]["opened_by"],
        "b_coverage_monotone": moshed["mask"]["coverage_monotone"],
        "b_block_agreement_pct": (moshed["mask"]["verify"] or {}).get(
            "block_agreement_pct"),
        "b_trigger_coverage": moshed["mask"]["triggers"],
        "picture_cuts": len(segments),
        # the picture, segment by segment, with where each one came from.
        # verify_renders.py checks these against audio_track: the two lists
        # are written by the two builders, so their agreeing is a real
        # invariant rather than one of them certifying itself.
        "segments": segments,
        "segment_link_stats": link_stats,
        "hold_ops": dict(sorted(Counter(
            s.get("op") for s in segments
            if s.get("kind") in ("hold", "tail")).items(),
            key=lambda kv: -kv[1])),
        "audio_track": [{"frame": p["frame"],
                         "seconds": round(p["frame"] / M.FPS, 3),
                         "unit": p["unit"], "src": p.get("src"),
                         "dur": p["seconds"], "text": p["text"],
                         "link": lk}
                        for p, lk in zip(placement, links)],
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
              f"gap {sm['longest_silence_s']:.2f}s  "
              f"seg {len(segments):>3}  "
              f"link {link_stats['linked_pct']:4.0f}%  "
              f"trig {len(triggers)}  mosh {moshed['moshed_frames']:>3}  "
              f"B {moshed['b_coverage_final_pct']:5.1f}%  "
              f"mix {mix_str}  x{crossings}  "
              f"out {meas['container_duration']:.3f}s")
    return log


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--phase", type=int, default=None, choices=[1, 2, 3, 4])
    ap.add_argument("--count", type=int, default=1)
    ap.add_argument("--outdir", default=OUT_DIR)
    ap.add_argument("--keep-clean", action="store_true")
    ap.add_argument("--sources", default=SOURCES,
                    help="path to a sources config (default config/sources.json)")
    args = ap.parse_args()

    t0 = time.time()
    failures = []
    for n in range(args.count):
        seed = args.seed if args.seed is not None else random.randrange(1, 10 ** 9)
        if args.seed is not None and args.count > 1:
            seed = args.seed + n
        # one bad render must not cost the rest of the batch: the mosh goes
        # through a browser and a GPU, and those fail in ways a rerun fixes
        try:
            render_one(seed, args.phase, args.outdir, args.keep_clean,
                       config=args.sources)
        except Exception as e:
            print(f"  seed {seed:>10}  FAILED: {e}")
            failures.append((seed, str(e)))
    print(f"done in {time.time()-t0:.1f}s  "
          f"({args.count - len(failures)}/{args.count} rendered)")
    if failures:
        print("\nfailed seeds (rerun them with --seed):")
        for seed, why in failures:
            print(f"  {seed}: {why.splitlines()[0]}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
