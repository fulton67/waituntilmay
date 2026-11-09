"""Synthesised UI sound effects (style DECISIONS 9, softened in 11): made here so there is no licence question.
v2 after client feedback ("swishes and things like that that aren't as distracting ... more low-key or familiar"): everything is
quieter, lower and shorter, closer to a phone UI than a cartoon. 48 kHz mono 16-bit WAVs in public/sfx/ (gitignored; re-run):
  pop.wav    something appears: a soft rounded tap (low-passed click + 620 Hz body, 70 ms)
  swish.wav  a line draws / a card slides: a low airy whoosh (band 350 -> 1400 Hz, 0.42 s, slow in and out)
  yes.wav    a check / the good result: one soft two-partial tone (A5), gentle ring-out
  no.wav     a strike / X: a muted low thud (180 Hz, very fast decay)
  card.wav   a card opening: just the low whoosh, shorter, with a faint tap at the end
Peaks are set per sound (-6 to -12 dBFS) so nothing jumps out; the reel mixes them under the voice.
Usage: python -I scripts/sfx.py public/sfx"""
import os
import sys
import wave

import numpy as np

SR = 48000


def t(d):
    return np.arange(int(SR * d)) / SR


def env(n, a, r):
    e = np.ones(n)
    na, nr = int(SR * a), int(SR * r)
    e[:na] = np.linspace(0, 1, na) ** 2 if na else 1
    e[-nr:] *= np.exp(-np.linspace(0, 6, nr))
    return e


def bandnoise(n, f0, f1, q=6.0, seed=1):
    rng = np.random.default_rng(seed)
    x = rng.standard_normal(n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    fc = np.sqrt(f0 * f1)
    X *= np.exp(-0.5 * (np.log(np.maximum(f, 1) / fc) * q / 2) ** 2)
    return np.fft.irfft(X, n)


def sweep_noise(d, f0, f1, seed=2):
    n = int(SR * d)
    hop = 1024
    out = np.zeros(n + hop * 2)
    win = np.hanning(hop * 2)
    for i, k in enumerate(range(0, n, hop)):
        q = k / n
        fc = f0 * (f1 / f0) ** q
        seg = bandnoise(hop * 2, fc * 0.8, fc * 1.25, 5, seed + i)
        out[k:k + hop * 2] += seg * win
    return out[:n]


def norm(x, peak_db=-1.0):
    x = x - x.mean()
    return x / (np.abs(x).max() + 1e-9) * 10 ** (peak_db / 20)


def lowpass(x, fc):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X /= np.sqrt(1 + (f / fc) ** 4)
    return np.fft.irfft(X, len(x))


def pop():
    tt = t(0.09)
    body = np.sin(2 * np.pi * (620 + 180 * np.exp(-tt / 0.01)) * tt) * np.exp(-tt / 0.018)
    click = np.zeros(len(tt))
    click[: int(SR * 0.003)] = bandnoise(int(SR * 0.003), 800, 3000, 3)
    x = lowpass(body + 0.5 * click, 2600)
    return norm(x * env(len(x), 0.0015, 0.05), -8)


def swish():
    x = lowpass(sweep_noise(0.42, 350, 1400), 2200)
    n = len(x)
    e = np.sin(np.linspace(0, np.pi, n)) ** 2.2
    return norm(x * e, -12)


def tone(f, d, partials=((1, 1), (2.0, 0.18)), tau=0.16):
    tt = t(d)
    return sum(a * np.sin(2 * np.pi * f * k * tt) * np.exp(-tt / (tau / k ** 0.5)) for k, a in partials)


def yes():
    x = tone(880, 0.5)
    return norm(x * env(len(x), 0.004, 0.25), -10)


def no():
    tt = t(0.16)
    x = np.sin(2 * np.pi * 180 * tt) * np.exp(-tt / 0.03)
    return norm(lowpass(x, 900) * env(len(x), 0.002, 0.08), -9)


def card():
    n = int(SR * 0.3)
    w = lowpass(sweep_noise(0.3, 400, 1200, 7), 2000) * np.sin(np.linspace(0, np.pi, n)) ** 2
    x = np.concatenate([norm(w, -12), np.zeros(int(SR * 0.01)), pop() * 0.35])
    return x


def write(path, x):
    y = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "public/sfx"
    os.makedirs(out, exist_ok=True)
    for name, fn in [("pop", pop), ("swish", swish), ("yes", yes), ("no", no), ("card", card)]:
        x = fn()
        write(os.path.join(out, f"{name}.wav"), x)
        print(name, f"{len(x) / SR:.2f}s", f"peak {20 * np.log10(np.abs(x).max()):.1f} dBFS")
