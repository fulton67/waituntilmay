"""Synthesised UI sound effects for the markup devices (style DECISIONS 9): small, soft and glassy to match the glass chips; made
here so there is no licence question. 48 kHz mono 16-bit WAVs in public/sfx/ (gitignored; re-run to recreate):
  pop.wav    chip / card / pin appears: sine blip 1400 -> 700 Hz over 60 ms + a 4 ms air transient
  swish.wav  a ring drawing on (0.5 s): band-passed noise sweeping 1.2 -> 4 kHz, soft in and out
  yes.wav    check mark: two glassy partial-rich tones (E6 then B6), 90 ms apart, ~0.5 s ring-out
  no.wav     X mark: muted low tock (A3 + A4 sine, fast decay) with a tiny click
  card.wav   an image card opening: airy noise rise 0.25 s into a soft pop
Peak -1 dBFS each; the reel mixes them under the voice (gain in OstadReel).
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


def pop():
    tt = t(0.12)
    f = 700 + 700 * np.exp(-tt / 0.02)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-tt / 0.03)
    x[: int(SR * 0.004)] += bandnoise(int(SR * 0.004), 3000, 9000, 3) * 0.6
    return norm(x * env(len(x), 0.001, 0.08))


def swish():
    x = sweep_noise(0.5, 1200, 4000)
    n = len(x)
    e = np.sin(np.linspace(0, np.pi, n)) ** 1.5
    return norm(x * e, -4)


def tone(f, d, partials=((1, 1), (2.76, 0.35), (5.4, 0.12)), tau=0.18):
    tt = t(d)
    return sum(a * np.sin(2 * np.pi * f * k * tt) * np.exp(-tt / (tau / k ** 0.5)) for k, a in partials)


def yes():
    a = tone(1318.5, 0.6)
    b = tone(1975.5, 0.6)
    x = np.zeros(int(SR * 0.7))
    x[: len(a)] += a * 0.8
    o = int(SR * 0.09)
    x[o:o + len(b)] += b
    return norm(x * env(len(x), 0.002, 0.3))


def no():
    tt = t(0.25)
    x = (np.sin(2 * np.pi * 220 * tt) + 0.4 * np.sin(2 * np.pi * 440 * tt)) * np.exp(-tt / 0.045)
    x[: int(SR * 0.003)] += bandnoise(int(SR * 0.003), 1500, 6000, 3) * 0.5
    return norm(x * env(len(x), 0.001, 0.1), -2)


def card():
    rise = sweep_noise(0.25, 800, 3500, 7) * np.linspace(0, 1, int(SR * 0.25)) ** 2
    p = pop()
    x = np.concatenate([norm(rise, -9), p * 0.7])
    return norm(x)


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
