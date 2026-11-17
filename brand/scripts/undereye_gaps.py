"""Under-eye filler reel v2: silence gaps in each clip's audio, for cutting only in silence (user note 1: every in and out point in a
gap of >= 80 ms, no clipped phoneme).

Envelope: RMS of the (loudnorm'd) transcoded audio in 10 ms hops, 30 ms windows, in dBFS. A frame is silent when it is below the floor (10th percentile) + 9 dB, or when it is >= 12 dB
below the loudest frame within +-300 ms (the speech around it) AND below the clip's 10th percentile + 15 dB (so a quiet word is never
"silence"). A first rule, a fixed floor + 9 dB, found no pause in IMG_6817, whose room noise (gloves, chair) sits 10-14 dB above its
floor between words. A gap is a run of silent frames >= 80 ms.
Import gaps(clip) -> [(start_s, end_s)]; or run it to print each clip's words with the measured gap after every word
(the word list is the redacted one: brand/edits/undereye-filler/words_<clip>.json).
"""
import json, subprocess, sys
from functools import lru_cache
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "brand/remotion/public/undereye-filler"
EDIT = ROOT / "brand/edits/undereye-filler"
SR, HOP, WIN, MIN_GAP = 16000, 0.010, 0.030, 0.080


@lru_cache(None)
def envelope(clip):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(PUB / f"{clip}.mp4"), "-vn", "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    h, w = int(SR * HOP), int(SR * WIN)
    n = max(1, (len(x) - w) // h)
    rms = np.array([np.sqrt(np.mean(x[i * h:i * h + w] ** 2) + 1e-12) for i in range(n)])
    db = 20 * np.log10(rms)
    from scipy.ndimage import maximum_filter1d
    local = maximum_filter1d(db, size=61)
    p10 = np.percentile(db, 10)
    thr = np.maximum(p10 + 9, np.minimum(local - 12, p10 + 15))
    return db, thr


@lru_cache(None)
def gaps(clip):
    db, thr = envelope(clip)
    sil = db < thr
    out, i = [], 0
    while i < len(sil):
        if sil[i]:
            j = i
            while j < len(sil) and sil[j]:
                j += 1
            # frame k covers [k*HOP, k*HOP + WIN]; the silent span is from the first frame's centre to the last frame's centre
            s, e = i * HOP + WIN / 2, (j - 1) * HOP + WIN / 2
            if e - s >= MIN_GAP:
                out.append((round(s, 3), round(e, 3)))
            i = j
        else:
            i += 1
    return out


def gap_at(clip, t):
    """The gap containing time t, or None."""
    return next(((s, e) for s, e in gaps(clip) if s <= t <= e), None)


def gap_between(clip, a, b):
    """The longest gap overlapping [a, b] (a = end of one word, b = start of the next), or None."""
    c = [(s, e) for s, e in gaps(clip) if e >= a - 0.12 and s <= b + 0.12]
    return max(c, key=lambda g: g[1] - g[0]) if c else None


if __name__ == "__main__":
    clip = sys.argv[1]
    lo, hi = (float(sys.argv[2]), float(sys.argv[3])) if len(sys.argv) > 3 else (0, 1e9)
    ws = json.loads((EDIT / f"words_{clip}.json").read_text(encoding="utf-8"))["words"]
    line = []
    for i, w in enumerate(ws):
        if not lo <= w["s"] <= hi:
            continue
        nxt = ws[i + 1]["s"] if i + 1 < len(ws) else w["e"] + 0.5
        g = gap_between(clip, w["e"], nxt)
        tag = f"|{int((g[1] - g[0]) * 1000)}" if g else ""
        line.append(f"{w['w']}@{w['s']:.2f}{tag}")
    print(" ".join(line))
