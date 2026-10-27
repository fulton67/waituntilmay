"""Frame/audio extraction, caching, room tone, and final assembly.

Everything downstream works in whole frames at FPS, and every audio piece is
forced to exactly n_frames * SAMPLES_PER_FRAME samples, so A/V drift is zero
by construction rather than by luck.
"""
import json
import os
import subprocess
import wave

import numpy as np

FPS = 24
SR = 48000
CHANNELS = 2
SAMPLES_PER_FRAME = SR // FPS          # 2000 - exact, no rounding
CACHE = "cache"


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, **kw)


def probe_duration(path):
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
               "-of", "default=nw=1:nk=1", path]).stdout
    return float(out.strip())


def probe_streams(path):
    out = run(["ffprobe", "-v", "error", "-show_entries",
               "stream=codec_type,codec_name,width,height,duration,nb_frames,r_frame_rate",
               "-of", "json", path]).stdout
    return json.loads(out)["streams"]


# ----------------------------------------------------------------- wav io
def read_wav(path):
    with wave.open(path, "rb") as w:
        n, ch, sw = w.getnframes(), w.getnchannels(), w.getsampwidth()
        assert sw == 2, f"{path}: expected 16-bit"
        x = np.frombuffer(w.readframes(n), dtype=np.int16)
    return x.reshape(-1, ch) if ch > 1 else x.reshape(-1, 1)


def write_wav(path, x, sr=SR):
    x = np.clip(np.asarray(x), -32768, 32767).astype(np.int16)
    if x.ndim == 1:
        x = x[:, None]
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with wave.open(path, "wb") as w:
        w.setnchannels(x.shape[1])
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(x.tobytes())


def fit_samples(x, n):
    """Force an audio block to exactly n samples (pad with silence or trim)."""
    if len(x) == n:
        return x
    if len(x) > n:
        return x[:n]
    pad = np.zeros((n - len(x), x.shape[1]), dtype=x.dtype)
    return np.concatenate([x, pad], axis=0)


# ------------------------------------------------------------- extraction
def _frames_dir(key):
    return os.path.join(CACHE, "frames", key)


def _wav_path(key):
    return os.path.join(CACHE, "audio", f"{key}.wav")


def extract_fragment(src, key, start, end, pad=0.05, duration_limit=None):
    """Extract frames @FPS and a 48k stereo WAV for [start-pad, end+pad].

    Cached by `key`. Returns {"key","frames":[paths],"wav":path,"n_frames",
    "start","end"} where start/end are the padded bounds actually used.
    """
    s = max(0.0, start - pad)
    e = end + pad
    if duration_limit is not None:
        e = min(e, duration_limit)
    fdir = _frames_dir(key)
    wav = _wav_path(key)
    meta_path = os.path.join(fdir, "meta.json")

    if os.path.exists(meta_path) and os.path.exists(wav):
        meta = json.load(open(meta_path, encoding="utf-8"))
        frames = [os.path.join(fdir, f) for f in meta["frames"]]
        if all(os.path.exists(f) for f in frames) and frames:
            return {"key": key, "frames": frames, "wav": wav,
                    "n_frames": len(frames), "start": meta["start"], "end": meta["end"]}

    os.makedirs(fdir, exist_ok=True)
    os.makedirs(os.path.dirname(wav), exist_ok=True)
    for f in os.listdir(fdir):
        if f.endswith(".jpg"):
            os.remove(os.path.join(fdir, f))

    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
         "-ss", f"{s:.4f}", "-to", f"{e:.4f}", "-i", src,
         "-an", "-vf", f"fps={FPS}", "-q:v", "2",
         os.path.join(fdir, "f_%05d.jpg")])
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
         "-ss", f"{s:.4f}", "-to", f"{e:.4f}", "-i", src,
         "-vn", "-ac", str(CHANNELS), "-ar", str(SR), "-c:a", "pcm_s16le", wav])

    names = sorted(f for f in os.listdir(fdir) if f.endswith(".jpg"))
    if not names:
        raise RuntimeError(f"no frames extracted for {key} [{s:.3f},{e:.3f}]")
    json.dump({"frames": names, "start": s, "end": e},
              open(meta_path, "w", encoding="utf-8"))
    return {"key": key, "frames": [os.path.join(fdir, f) for f in names],
            "wav": wav, "n_frames": len(names), "start": s, "end": e}


def fragment_audio(frag, n_frames=None):
    """Audio for a fragment, resized to exactly n_frames worth of samples."""
    x = read_wav(frag["wav"])
    n = (n_frames if n_frames is not None else frag["n_frames"]) * SAMPLES_PER_FRAME
    return fit_samples(x, n)


# ------------------------------------------------------------- room tone
def room_tone(src, start, end, force=False, source=None):
    """Sample room tone once from a silent gap and cache it."""
    name = f"roomtone_{source}.wav" if source else "roomtone.wav"
    path = os.path.join(CACHE, name)
    if os.path.exists(path) and not force:
        return read_wav(path)
    os.makedirs(CACHE, exist_ok=True)
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
         "-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i", src,
         "-vn", "-ac", str(CHANNELS), "-ar", str(SR), "-c:a", "pcm_s16le", path])
    return read_wav(path)


def room_tone_block(tone, n_frames, rng=None):
    """n_frames worth of room tone, looped from a random offset."""
    n = n_frames * SAMPLES_PER_FRAME
    if len(tone) == 0:
        return np.zeros((n, CHANNELS), dtype=np.int16)
    off = rng.randrange(len(tone)) if rng is not None else 0
    reps = int(np.ceil((n + off) / len(tone)))
    buf = np.tile(tone, (reps, 1))[off:off + n]
    return fit_samples(buf, n)


# -------------------------------------------------------------- assembly
def write_concat_list(path, frames, per_frame=1.0 / FPS):
    """ffconcat frame list with explicit durations (concat demuxer)."""
    with open(path, "w", encoding="utf-8") as f:
        f.write("ffconcat version 1.0\n")
        for p in frames:
            f.write(f"file '{os.path.abspath(p).replace(os.sep, '/')}'\n")
            f.write(f"duration {per_frame:.6f}\n")
        # concat demuxer drops the final entry's duration unless repeated
        f.write(f"file '{os.path.abspath(frames[-1]).replace(os.sep, '/')}'\n")


def assemble(frames, audio, out_path, concat_list, width=None, height=None,
             overlay_filter=None, crf=18, preset="medium"):
    """Build the clean MP4 from a frame list + one audio array."""
    write_concat_list(concat_list, frames)
    wav = os.path.splitext(out_path)[0] + "_audio.wav"
    write_wav(wav, audio)

    vf = [f"fps={FPS}", "format=yuv420p"]
    if width and height:
        vf.insert(0, f"scale={width}:{height}")
    if overlay_filter:
        vf.insert(len(vf) - 1, overlay_filter)

    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
         "-f", "concat", "-safe", "0", "-i", concat_list,
         "-i", wav,
         "-map", "0:v:0", "-map", "1:a:0",
         "-vf", ",".join(vf),
         "-c:v", "libx264", "-preset", preset, "-crf", str(crf),
         "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", "-ar", str(SR),
         "-movflags", "+faststart",
         "-shortest", out_path])
    try:
        os.remove(wav)
    except OSError:
        pass
    return out_path


def measure(path):
    """Per-stream duration/frame count, for the verification table."""
    streams = probe_streams(path)
    v = next(s for s in streams if s["codec_type"] == "video")
    a = next((s for s in streams if s["codec_type"] == "audio"), None)
    nb = v.get("nb_frames")
    if nb in (None, "N/A"):
        out = run(["ffprobe", "-v", "error", "-count_frames",
                   "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames",
                   "-of", "default=nw=1:nk=1", path]).stdout.strip()
        nb = out
    vdur = float(v["duration"]) if v.get("duration") not in (None, "N/A") else None
    adur = float(a["duration"]) if a and a.get("duration") not in (None, "N/A") else None
    return {"video_duration": vdur, "audio_duration": adur,
            "n_frames": int(nb) if str(nb).isdigit() else None,
            "width": v.get("width"), "height": v.get("height"),
            "container_duration": probe_duration(path)}


# ------------------------------------------------- units (multi-span media)
def span_key(start, end, source=None):
    """Cache key for one span.

    The source id is part of the key. Without it, two sources' 12.340s-14.200s
    spans are the same cache entry, and the second version to ask gets the
    first one's frames - the one bug in a multi-source pool that would look
    like a rendering fault rather than a cache fault.
    """
    k = "sp_%08d_%08d" % (round(start * 1000), round(end * 1000))
    return f"{source}_{k}" if source else k


def extract_span(src, start, end, dur_limit=None, pad=0.0, source=None):
    """One contiguous span, cached by its source and millisecond bounds."""
    return extract_fragment(src, span_key(start, end, source), start, end,
                            pad, dur_limit)


def unit_media(src, unit, dur_limit=None):
    """Frames + audio for a clause unit whose internal silences were trimmed.

    The unit's spans are extracted separately and concatenated, so the audio
    plays as continuous speech even though it is discontiguous in the source.
    """
    frames, audio = [], []
    for a, b in unit["spans"]:
        f = extract_span(src, a, b, dur_limit, source=unit.get("src"))
        frames.extend(f["frames"])
        audio.append(fragment_audio(f))
    a = np.concatenate(audio, axis=0) if audio else np.zeros((0, CHANNELS), np.int16)
    # keep frames and samples consistent with each other
    n = len(frames)
    return {"frames": frames, "audio": fit_samples(a, n * SAMPLES_PER_FRAME),
            "n_frames": n}


def drone(src, start=1849.2, seconds=8.0, semitone_scale=0.25, gain_db=-30.0,
          force=False, source=None):
    """A slow, pitched-down bed made from the talk itself.

    Silence in the voice track should read as intentional rather than empty,
    so everything sits on this instead of on digital black.
    """
    path = os.path.join(CACHE, f"drone_{source}.wav" if source else "drone.wav")
    if os.path.exists(path) and not force:
        return read_wav(path)
    os.makedirs(CACHE, exist_ok=True)
    af = (f"asetrate={SR}*{semitone_scale},aresample={SR},"
          f"lowpass=f=320,highpass=f=40,volume={gain_db}dB")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
         "-ss", f"{start:.3f}", "-t", f"{seconds:.3f}", "-i", src,
         "-vn", "-af", af, "-ac", str(CHANNELS), "-ar", str(SR),
         "-c:a", "pcm_s16le", path])
    return read_wav(path)


def bed_block(bed, n_frames, rng=None):
    """n_frames worth of a looping bed, from a random offset."""
    return room_tone_block(bed, n_frames, rng)


def mix(voice, bed, bed_gain=1.0):
    """Lay the voice over the bed; both must already be the same length."""
    n = min(len(voice), len(bed))
    out = voice[:n].astype(np.int32) + (bed[:n].astype(np.int32) * bed_gain).astype(np.int32)
    return np.clip(out, -32768, 32767).astype(np.int16)
