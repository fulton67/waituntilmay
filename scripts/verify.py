"""Measured verification of the transcript timing data.

Stats, speech coverage, long gaps, and 10 random ffmpeg cuts whose
boundary loudness is measured against the middle of the clip.
"""
import argparse
import json
import math
import os
import random
import statistics
import subprocess
import wave

import numpy as np


def hhmmss(t):
    h = int(t // 3600); m = int((t % 3600) // 60); s = t % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def read_wav_mono(path):
    with wave.open(path, "rb") as w:
        sr = w.getframerate()
        n = w.getnframes()
        data = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float64)
        if w.getnchannels() > 1:
            data = data.reshape(-1, w.getnchannels()).mean(axis=1)
    return data, sr


def rms_db(x):
    if len(x) == 0:
        return -120.0
    r = math.sqrt(float(np.mean(x * x)))
    if r <= 1e-9:
        return -120.0
    return 20.0 * math.log10(r / 32768.0)


def merge_intervals(iv, join=0.0):
    out = []
    for s, e in sorted(iv):
        if out and s - out[-1][1] <= join:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--duration", type=float, required=True)
    ap.add_argument("--transcript", default="transcript")
    ap.add_argument("--cutdir", default="cuts_test")
    ap.add_argument("--n", type=int, default=10)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--edge-ms", type=float, default=50.0)
    ap.add_argument("--phrases", default=None)
    ap.add_argument("--label", default="unpadded")
    args = ap.parse_args()

    words = json.load(open(os.path.join(args.transcript, "words.json"), encoding="utf-8"))
    ppath = args.phrases or os.path.join(args.transcript, "phrases.json")
    phrases = json.load(open(ppath, encoding="utf-8"))

    print("=" * 72)
    print(f"VERIFICATION  ({args.label}: {os.path.basename(ppath)})")
    print("=" * 72)

    # --- 1. counts and phrase-duration distribution -------------------------
    durs = sorted(p["duration"] for p in phrases)
    q = statistics.quantiles(durs, n=4)
    print(f"\n[1] COUNTS")
    print(f"  words            : {len(words)}")
    print(f"  phrases          : {len(phrases)}")
    print(f"  words/phrase avg : {len(words)/len(phrases):.2f}")
    print(f"\n[2] PHRASE DURATION (seconds)")
    print(f"  min    : {durs[0]:.3f}")
    print(f"  p25    : {q[0]:.3f}")
    print(f"  median : {statistics.median(durs):.3f}")
    print(f"  p75    : {q[2]:.3f}")
    print(f"  max    : {durs[-1]:.3f}")
    print(f"  mean   : {statistics.fmean(durs):.3f}")
    in_band = sum(1 for d in durs if 1.0 <= d <= 4.0)
    print(f"  within 1.0-4.0s : {in_band}/{len(durs)} ({100*in_band/len(durs):.1f}%)")
    print(f"  under 1.0s      : {sum(1 for d in durs if d < 1.0)}")
    print(f"  over  4.0s      : {sum(1 for d in durs if d > 4.0)}")

    # --- 3. speech coverage and gaps ---------------------------------------
    spans = merge_intervals([[w["start"], w["end"]] for w in words])
    speech = sum(e - s for s, e in spans)
    print(f"\n[3] SPEECH COVERAGE")
    print(f"  audio duration  : {args.duration:.3f}s  ({hhmmss(args.duration)})")
    print(f"  speech (union)  : {speech:.3f}s  ({100*speech/args.duration:.1f}%)")
    print(f"  non-speech      : {args.duration - speech:.3f}s  "
          f"({100*(args.duration-speech)/args.duration:.1f}%)")
    print(f"  first word at   : {words[0]['start']:.3f}s")
    print(f"  last word ends  : {words[-1]['end']:.3f}s")

    gaps = []
    if spans[0][0] > 5.0:
        gaps.append((0.0, spans[0][0], "lead-in"))
    for a, b in zip(spans, spans[1:]):
        if b[0] - a[1] > 5.0:
            gaps.append((a[1], b[0], "internal"))
    if args.duration - spans[-1][1] > 5.0:
        gaps.append((spans[-1][1], args.duration, "tail"))
    print(f"\n[4] GAPS > 5s  ({len(gaps)} found)")
    if not gaps:
        print("  none")
    for s, e, kind in gaps:
        print(f"  {hhmmss(s)} -> {hhmmss(e)}   {e-s:7.3f}s   [{kind}]")

    # --- 5. random cuts + boundary loudness --------------------------------
    os.makedirs(args.cutdir, exist_ok=True)
    rng = random.Random(args.seed)
    picks = sorted(rng.sample(range(len(phrases)), min(args.n, len(phrases))))
    edge = args.edge_ms / 1000.0

    print(f"\n[5] {len(picks)} RANDOM CUTS - boundary RMS vs middle RMS")
    print(f"    edge window = {args.edge_ms:.0f}ms; a boundary is flagged LOUD when it sits")
    print(f"    within 6 dB of the clip's middle level (i.e. likely mid-word).\n")
    hdr = f"  {'id':>5} {'start':>10} {'end':>10} {'dur':>6} {'head dB':>8} {'mid dB':>8} {'tail dB':>8}  flag"
    print(hdr)
    print("  " + "-" * (len(hdr) - 2))

    results = []
    for pid in picks:
        p = phrases[pid]
        base = os.path.join(args.cutdir, f"p{pid:05d}")
        wav = base + ".wav"
        clip = base + ".mp4"
        # video+audio clip for spot-checking (accurate seek + re-encode)
        subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                        "-ss", f"{p['start']:.3f}", "-to", f"{p['end']:.3f}",
                        "-i", args.src,
                        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                        "-c:a", "aac", "-b:a", "160k",
                        "-avoid_negative_ts", "make_zero", clip], check=True)
        # matching audio-only cut for measurement
        subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                        "-ss", f"{p['start']:.3f}", "-to", f"{p['end']:.3f}",
                        "-i", args.src, "-vn",
                        "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav], check=True)

        x, sr = read_wav_mono(wav)
        ne = int(edge * sr)
        head = rms_db(x[:ne])
        tail = rms_db(x[-ne:])
        mid_a, mid_b = int(0.35 * len(x)), int(0.65 * len(x))
        mid = rms_db(x[mid_a:mid_b])
        head_loud = head >= mid - 6.0
        tail_loud = tail >= mid - 6.0
        flag = ",".join(f for f, on in (("HEAD", head_loud), ("TAIL", tail_loud)) if on) or "ok"
        results.append({"id": pid, "head": head, "mid": mid, "tail": tail,
                        "head_loud": head_loud, "tail_loud": tail_loud,
                        "start": p["start"], "end": p["end"],
                        "duration": p["duration"], "text": p["text"], "wav": wav, "clip": clip})
        print(f"  {pid:>5} {p['start']:>10.3f} {p['end']:>10.3f} {p['duration']:>6.3f} "
              f"{head:>8.1f} {mid:>8.1f} {tail:>8.1f}  {flag}")

    n_head = sum(r["head_loud"] for r in results)
    n_tail = sum(r["tail_loud"] for r in results)
    n_any = sum(r["head_loud"] or r["tail_loud"] for r in results)
    print(f"\n  loud HEAD boundaries : {n_head}/{len(results)}")
    print(f"  loud TAIL boundaries : {n_tail}/{len(results)}")
    print(f"  clips with any loud boundary : {n_any}/{len(results)}")

    print(f"\n[6] SPOT-CHECK LIST (open these timecodes in a player)\n")
    for r in results:
        print(f"  id {r['id']:>5}  {hhmmss(r['start'])} -> {hhmmss(r['end'])}  ({r['duration']:.3f}s)")
        print(f"            \"{r['text']}\"")
        print(f"            {r['clip']}")
    print()

    with open(os.path.join(args.cutdir, f"_report_{args.label}.json"), "w", encoding="utf-8") as f:
        json.dump({"picks": results, "loud_head": n_head, "loud_tail": n_tail,
                   "loud_any": n_any, "speech_seconds": speech,
                   "coverage_pct": 100 * speech / args.duration,
                   "gaps_over_5s": [{"start": s, "end": e, "kind": k} for s, e, k in gaps]},
                  f, indent=2)


if __name__ == "__main__":
    main()
