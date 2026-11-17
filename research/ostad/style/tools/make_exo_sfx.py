"""make_exo_sfx.py: the three new event sounds of ExoMind YouTube v6 gap round 1 (DECISIONS 14o, exomind/gap/audio.md gap 2).

audio.md found `card` and `swish` near-twins (0.40 / 0.42 s, centroid 1140 / 1096 Hz) and `swish` covering 6 event kinds, so the
arrow (the signature device) had no sound of its own. This writes, into brand/remotion/public/sfx/ (gitignored; regenerate with this):
  exo_draw.wav     the arrow draw: a short pen stroke, band-passed noise that rises 2.4 -> 4.2 kHz over 0.18 s with a soft tick at the end
  exo_card.wav     a card / plate landing: a low, round thump (fundamental 150 Hz + a felt body), 0.32 s, centroid well under swish
  exo_chapter.wav  a section card: a soft two-note glass chime (E5 then B5, 70 ms apart) over a low air swell, 0.75 s
Existing wavs are not touched (other edits use them): swish = reveals / wipes / picture cuts, pop = chips and labels, yes = ticks and
the circled slot. Peaks are normalised to -6 dBFS; the mix gain is set in OstadYT6.tsx (hero 0.32, rest 0.16).
Usage: python -I make_exo_sfx.py [out_dir]   (prints each file's length and spectral centroid)
"""
from __future__ import annotations
import sys, wave
from pathlib import Path
import numpy as np

SR = 48000
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[4] / "brand" / "remotion" / "public" / "sfx"
rng = np.random.default_rng(14)


def env(n: int, a: float, d: float) -> np.ndarray:
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)


def bandnoise(n: int, f0: np.ndarray, q: float = 6.0) -> np.ndarray:
    # time-varying resonant band-pass (state-variable filter) on white noise
    x = rng.standard_normal(n)
    y = np.zeros(n); low = band = 0.0
    for i in range(n):
        fc = 2 * np.sin(np.pi * f0[i] / SR)
        high = x[i] - low - band / q
        band += fc * high
        low += fc * band
        y[i] = band
    return y


def norm(x: np.ndarray, db: float = -6.0) -> np.ndarray:
    return x / (np.abs(x).max() + 1e-9) * 10 ** (db / 20)


def write(name: str, x: np.ndarray) -> None:
    x = norm(x)
    st = np.stack([x, x], 1)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype("<i2").tobytes())
    spec = np.abs(np.fft.rfft(x)); fr = np.fft.rfftfreq(len(x), 1 / SR)
    print(f"{name}: {len(x) / SR:.2f} s, centroid {float((spec * fr).sum() / spec.sum()):.0f} Hz")


def draw() -> np.ndarray:
    n = int(0.2 * SR); t = np.arange(n) / SR
    f0 = 2400 + 1800 * (t / t[-1]) ** 1.5
    x = bandnoise(n, f0, 5.0) * env(n, 0.02, 0.09) * (0.6 + 0.4 * np.sin(2 * np.pi * 38 * t) ** 2)
    tick = np.zeros(n); k = int(0.165 * SR); m = int(0.012 * SR)
    tick[k:k + m] = np.sin(2 * np.pi * 3200 * np.arange(m) / SR) * np.exp(-np.arange(m) / (0.003 * SR))
    return x + 0.5 * tick


def card() -> np.ndarray:
    n = int(0.32 * SR); t = np.arange(n) / SR
    f = 150 * (1 + 0.25 * np.exp(-t / 0.03))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.004, 0.07)
    knock = np.sin(2 * np.pi * 330 * t) * env(n, 0.001, 0.018) * 0.6  # a short wooden knock on the landing
    return body + knock


def chapter() -> np.ndarray:
    n = int(0.75 * SR); t = np.arange(n) / SR
    def bell(fr, at):
        u = np.clip(t - at, 0, None); on = (t >= at).astype(float)
        return on * (np.sin(2 * np.pi * fr * u) + 0.3 * np.sin(2 * np.pi * 2.76 * fr * u) * np.exp(-u / 0.08)) * np.exp(-u / 0.32) * np.minimum(1, u / 0.003)
    air = bandnoise(n, np.full(n, 700.0), 1.5) * np.sin(np.pi * np.clip(t / 0.6, 0, 1)) ** 2 * 0.35
    return 0.55 * bell(659.3, 0.0) + 0.45 * bell(987.8, 0.07) + air


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    write("exo_draw", draw())
    write("exo_card", card())
    write("exo_chapter", chapter())
