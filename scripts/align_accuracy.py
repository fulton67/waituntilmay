"""How accurate are the word timestamps, in milliseconds?

Measured only on words with real silence beside them, where the acoustic
onset is unambiguous. The detector is self-calibrating per word: the
threshold is set relative to THAT word's own loudness, not to a global
level, so breaths and room noise don't trigger it.

  onset  = walking back from the word's loudest point, the last frame
           that is still >= (word_peak - drop_db)
  error  = detected - timestamped     (negative => timestamp is LATE)

Words whose neighbouring 'silence' is not actually quiet are skipped, and
the count of skips is reported so the sample is auditable.
"""
import argparse
import json
import statistics
import wave

import numpy as np

SR = 16000
HOP = 0.005
WIN = 0.020


def load_wav(path):
    with wave.open(path, "rb") as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64)


def frame_db(x):
    hop, win = int(HOP * SR), int(WIN * SR)
    n = max(0, (len(x) - win) // hop + 1)
    idx = np.arange(win)[None, :] + hop * np.arange(n)[:, None]
    fr = x[idx]
    rms = np.sqrt((fr * fr).mean(axis=1))
    return 20 * np.log10(np.maximum(rms, 1e-9) / 32768.0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--wav", default="audio/blum_16k.wav")
    ap.add_argument("--words", default="transcript/words.json")
    ap.add_argument("--min-gap", type=float, default=0.30)
    ap.add_argument("--search", type=float, default=0.30)
    ap.add_argument("--drop-db", type=float, default=15.0,
                    help="onset = where level falls this far below the word's own peak")
    ap.add_argument("--quiet-margin", type=float, default=10.0,
                    help="neighbouring gap must sit within this of the room-tone floor")
    args = ap.parse_args()

    x = load_wav(args.wav)
    lv = frame_db(x)
    floor = float(np.percentile(lv, 5))
    quiet = floor + args.quiet_margin
    print(f"frames {len(lv)}   room-tone floor(p5) {floor:.1f} dBFS   "
          f"'genuinely quiet' <= {quiet:.1f} dBFS")

    words = json.load(open(args.words, encoding="utf-8"))
    F = lambda t: int(round(t / HOP))

    onset_err, offset_err = [], []
    skip_noisy = skip_short = 0

    for i, w in enumerate(words):
        prev_end = words[i - 1]["end"] if i else 0.0
        nxt_start = words[i + 1]["start"] if i + 1 < len(words) else len(x) / SR
        a_w, b_w = F(w["start"]), F(w["end"])
        if b_w - a_w < 3:
            skip_short += 1
            continue
        peak = float(lv[a_w:b_w].max())
        thr = peak - args.drop_db

        # ---------- ONSET ----------
        if w["start"] - prev_end >= args.min_gap:
            g0, g1 = F(prev_end), F(w["start"])
            gap_lv = lv[max(0, g1 - 20):g1]           # last 100ms before the word
            if len(gap_lv) and float(np.median(gap_lv)) <= quiet:
                lo = max(0, F(w["start"] - args.search), g0)
                # walk back from the word's loudest frame to the first sub-threshold frame
                pk = a_w + int(np.argmax(lv[a_w:b_w]))
                j = pk
                while j > lo and lv[j] >= thr:
                    j -= 1
                det = (j + 1) * HOP
                onset_err.append((det - w["start"]) * 1000.0)
            else:
                skip_noisy += 1

        # ---------- OFFSET ----------
        if nxt_start - w["end"] >= args.min_gap:
            g0, g1 = F(w["end"]), F(nxt_start)
            gap_lv = lv[g0:min(len(lv), g0 + 20)]      # first 100ms after the word
            if len(gap_lv) and float(np.median(gap_lv)) <= quiet:
                hi = min(len(lv) - 1, F(w["end"] + args.search), g1)
                pk = a_w + int(np.argmax(lv[a_w:b_w]))
                j = pk
                while j < hi and lv[j] >= thr:
                    j += 1
                det = j * HOP + WIN
                offset_err.append((det - w["end"]) * 1000.0)
            else:
                skip_noisy += 1

    print(f"skipped: {skip_noisy} (neighbouring gap not actually quiet), "
          f"{skip_short} (word too short)")

    def report(errs, name):
        if not errs:
            print(f"\n{name}: no measurable cases")
            return
        e = sorted(errs)
        within = lambda ms: 100 * sum(1 for v in e if abs(v) <= ms) / len(e)
        print(f"\n{name}   n={len(e)}")
        print(f"  median error : {statistics.median(e):+7.1f} ms  (negative = timestamp late)")
        print(f"  median |err| : {statistics.median([abs(v) for v in e]):7.1f} ms")
        print(f"  p10 / p90    : {e[int(.1*len(e))]:+7.1f} / {e[int(.9*len(e))]:+7.1f} ms")
        for ms in (20, 50, 100):
            print(f"  within {ms:>3}ms : {within(ms):5.1f}%")

    report(onset_err, "WORD ONSET accuracy")
    report(offset_err, "WORD OFFSET accuracy")


if __name__ == "__main__":
    main()
