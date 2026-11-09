"""M18: loudness. Integrated LUFS and true peak of the mix (ffmpeg ebur128), then Demucs (htdemucs, --two-stems vocals, CUDA)
separates voice from everything else (music bed + SFX); LUFS of each stem (pyloudnorm, BS.1770) and the voice-minus-bed gap.
Stems are kept in stems/<ref>/<vid>/ (gitignored) for M19."""
import os
import re
import subprocess
import sys

import numpy as np
import pyloudnorm as pyln
import soundfile as sf

from common import STYLE, has_audio, run


def ebur(path):
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    I = re.findall(r"I:\s+(-?[\d.]+) LUFS", err)
    tp = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", err)
    lra = re.findall(r"LRA:\s+([\d.]+) LU", err)
    return (float(I[-1]) if I else None, float(tp[-1]) if tp else None, float(lra[-1]) if lra else None)


def stems(path, ref, vid):
    d = os.path.join(STYLE, "stems", ref, vid)
    v, nv = os.path.join(d, "vocals.wav"), os.path.join(d, "no_vocals.wav")
    if not (os.path.exists(v) and os.path.exists(nv)):
        os.makedirs(d, exist_ok=True)
        src = os.path.join(d, "mix44.wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-vn", "-ac", "2", "-ar", "44100", src], check=True)
        out = os.path.join(d, "_demucs")
        subprocess.run([sys.executable, "-m", "demucs", "-n", "htdemucs", "--two-stems", "vocals", "-d", "cuda", "-o", out, src],
                       check=True, capture_output=True)
        base = os.path.join(out, "htdemucs", "mix44")
        os.replace(os.path.join(base, "vocals.wav"), v)
        os.replace(os.path.join(base, "no_vocals.wav"), nv)
    return v, nv


def lufs(p):
    y, sr = sf.read(p)
    if y.ndim == 1:
        y = y[:, None]
    if np.max(np.abs(y)) < 1e-6:
        return None
    try:
        v = pyln.Meter(sr).integrated_loudness(y)
        return round(float(v), 2) if np.isfinite(v) else None
    except ValueError:
        return None


def m18(ref, vid, path, P):
    if not has_audio(path):
        return {"has_audio": False}
    I, tp, lra = ebur(path)
    v, nv = stems(path, ref, vid)
    lv, lb = lufs(v), lufs(nv)
    return {"has_audio": True, "mix_lufs": I, "true_peak_dbfs": tp, "lra_lu": lra, "voice_lufs": lv, "bed_lufs": lb,
            "voice_minus_bed_lu": round(lv - lb, 2) if (lv is not None and lb is not None) else None, "separator": "demucs htdemucs two-stems"}


if __name__ == "__main__":
    run("loudness.json", m18)
