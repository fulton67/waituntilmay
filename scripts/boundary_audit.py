"""Does a phrase boundary cut mid-word?

Three-way classification per boundary, which a bare "is the edge loud" test
cannot do (it reads silence-vs-silence and speech-vs-speech as the same
small step):

  SILENT  edge sits in room tone            -> nothing clipped, safest
  ONSET   quiet outside, loud inside        -> lands on the word attack/release
  INSIDE  loud on BOTH sides of the edge    -> continuous speech, cut is mid-utterance

The room-tone floor is measured from the file, not assumed.
"""
import argparse
import json
import math
import os
import statistics
import wave

import numpy as np

SR = 16000


def load_wav(path):
    with wave.open(path, "rb") as w:
        assert w.getframerate() == SR and w.getnchannels() == 1
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64)


def db(x):
    if len(x) == 0:
        return -120.0
    r = math.sqrt(float(np.mean(x * x)))
    return -120.0 if r <= 1e-9 else 20.0 * math.log10(r / 32768.0)


def seg(x, t0, t1):
    a = max(0, int(round(t0 * SR)))
    b = min(len(x), int(round(t1 * SR)))
    return x[a:b] if b > a else np.array([])


def noise_floor(x, win=0.05):
    """5th percentile of 50ms frame levels = the room-tone floor."""
    n = int(win * SR)
    nf = len(x) // n
    frames = x[:nf * n].reshape(nf, n)
    rms = np.sqrt((frames * frames).mean(axis=1))
    lv = 20 * np.log10(np.maximum(rms, 1e-9) / 32768.0)
    return float(np.percentile(lv, 5)), float(np.percentile(lv, 50)), lv


def classify(inside, outside, floor_db, step=6.0, margin=8.0):
    """floor_db + margin = the level below which we call it room tone."""
    quiet = floor_db + margin
    if inside <= quiet:
        return "SILENT"
    if inside - outside >= step:
        return "ONSET"
    if outside <= quiet:
        return "ONSET"
    return "INSIDE"


def audit(x, phrases, floor_db, edge, step, margin):
    rows = []
    for p in phrases:
        s, e = p["start"], p["end"]
        pre = db(seg(x, s - edge, s))
        head = db(seg(x, s, s + edge))
        mid = db(seg(x, s + (e - s) * 0.35, s + (e - s) * 0.65))
        tail = db(seg(x, e - edge, e))
        post = db(seg(x, e, e + edge))
        rows.append({
            "id": p["id"], "start": s, "end": e, "duration": p["duration"],
            "pre": pre, "head": head, "mid": mid, "tail": tail, "post": post,
            "head_step": head - pre, "tail_step": tail - post,
            "head_class": classify(head, pre, floor_db, step, margin),
            "tail_class": classify(tail, post, floor_db, step, margin),
            "text": p["text"],
        })
    return rows


def summarize(rows, label, floor_db):
    def tally(key):
        c = {"SILENT": 0, "ONSET": 0, "INSIDE": 0}
        for r in rows:
            c[r[key]] += 1
        return c
    h, t = tally("head_class"), tally("tail_class")
    n = len(rows)
    risky = sum(r["head_class"] == "INSIDE" or r["tail_class"] == "INSIDE" for r in rows)
    print(f"\n--- {label}  (n={n}) ---")
    print(f"  HEAD  SILENT {h['SILENT']:>5} ({100*h['SILENT']/n:5.1f}%)   "
          f"ONSET {h['ONSET']:>5} ({100*h['ONSET']/n:5.1f}%)   "
          f"INSIDE {h['INSIDE']:>5} ({100*h['INSIDE']/n:5.1f}%)")
    print(f"  TAIL  SILENT {t['SILENT']:>5} ({100*t['SILENT']/n:5.1f}%)   "
          f"ONSET {t['ONSET']:>5} ({100*t['ONSET']/n:5.1f}%)   "
          f"INSIDE {t['INSIDE']:>5} ({100*t['INSIDE']/n:5.1f}%)")
    print(f"  safe on both edges (no INSIDE): {n-risky}/{n} ({100*(n-risky)/n:.1f}%)")
    return {"head": h, "tail": t, "safe_pct": 100 * (n - risky) / n}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--wav", default="audio/blum_16k.wav")
    ap.add_argument("--transcript", default="transcript")
    ap.add_argument("--edge", type=float, default=0.05)
    ap.add_argument("--step", type=float, default=6.0)
    ap.add_argument("--margin", type=float, default=8.0)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--n", type=int, default=10)
    args = ap.parse_args()

    x = load_wav(args.wav)
    p5, p50, _ = noise_floor(x)
    print(f"loaded {len(x)/SR:.3f}s")
    print(f"measured room-tone floor (p5 of 50ms frames) : {p5:.1f} dBFS")
    print(f"median 50ms frame level                      : {p50:.1f} dBFS")
    print(f"'quiet' threshold used                       : {p5+args.margin:.1f} dBFS")

    out = {"floor_db": p5, "quiet_db": p5 + args.margin}
    all_rows = {}
    for fn, label in [("phrases.json", "UNPADDED"), ("phrases_padded.json", "PADDED 0.05s")]:
        path = os.path.join(args.transcript, fn)
        if not os.path.exists(path):
            continue
        phrases = json.load(open(path, encoding="utf-8"))
        rows = audit(x, phrases, p5, args.edge, args.step, args.margin)
        all_rows[label] = rows
        out[label] = summarize(rows, label, p5)

    base = all_rows.get("UNPADDED")
    if base:
        import random
        rng = random.Random(args.seed)
        picks = sorted(rng.sample(range(len(base)), min(args.n, len(base))))
        print(f"\n--- the {len(picks)} random spot-check phrases ---")
        hdr = (f"  {'id':>5} {'pre':>7} {'head':>7} {'mid':>7} {'tail':>7} {'post':>7}"
               f"  {'HEAD':>6} {'TAIL':>6}")
        print(hdr)
        print("  " + "-" * (len(hdr) - 2))
        for i in picks:
            r = base[i]
            print(f"  {r['id']:>5} {r['pre']:>7.1f} {r['head']:>7.1f} {r['mid']:>7.1f} "
                  f"{r['tail']:>7.1f} {r['post']:>7.1f}  {r['head_class']:>6} {r['tail_class']:>6}")

        ins = [r for r in base if r["head_class"] == "INSIDE" or r["tail_class"] == "INSIDE"]
        print(f"\n  phrases with at least one INSIDE edge: {len(ins)}/{len(base)}")
        print("  worst 8 by combined step:")
        for r in sorted(ins, key=lambda r: r["head_step"] + r["tail_step"])[:8]:
            print(f"    id {r['id']:>5}  h{r['head_step']:+6.1f} t{r['tail_step']:+6.1f}  "
                  f"\"{r['text'][:54]}\"")

    with open(os.path.join(args.transcript, "_boundary_audit.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
    print()


if __name__ == "__main__":
    main()
