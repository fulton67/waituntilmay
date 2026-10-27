"""The word-paced intensity envelope that drives how far the picture opens.

The piece is a talk, so the decay should answer the talk rather than run on a
timer. This builds a per-output-frame envelope from three measured things:

  concept words   the vocabulary the piece is about - internet, water, tubes,
                  center - weighted high and stem-matched, so "internet's"
                  counts where an exact match would miss it
  phrases         units whose text matches the physical and definition pools
                  in pipeline.units, weighted medium: a sustained bed under
                  the word spikes rather than a spike of its own
  loudness        per-frame RMS of the rendered voice, so an emphasised line
                  reads as intensity even when its words are not on the list

Everything is computed on SOURCE time and then mapped through the edit, which
is what makes it work for both a straight clip and a 30s edit that jumps
around the talk: a `Timeline` is just a list of (out frames) <-> (source
seconds) segments, built one way for a clip and another from the renderer's
own placement.

The raw track is spiky by construction. An attack/release follower turns it
into something a picture can follow: ~3 frames to open, 1-2s to let go.

The envelope is deliberately NOT the coverage. decay.py maps it onto a
coverage target, so the two can be tuned apart.
"""
import json
import math
import os
import re
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def norm_word(w):
    """Lowercase, keep letters/digits/apostrophe - the renderer's own rule."""
    return "".join(c for c in w.lower() if c.isalnum() or c == "'")


def stem(w):
    """Crude but predictable: drop a possessive or plural tail.

    "internet's" and "internets" both reduce to "internet". Nothing longer is
    worth the risk of collapsing two real words into one.
    """
    w = norm_word(w)
    for suf in ("'s", "s'", "es", "s"):
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            return w[:-len(suf)]
    return w


# --------------------------------------------------------------- timeline
class Timeline:
    """Maps source seconds to output frames for whatever edit produced them.

    segments: (out_f0, out_f1, src_a, src_b), linear within each segment.
    """

    def __init__(self, segments, n_frames, fps):
        self.segments = list(segments)
        self.n_frames = n_frames
        self.fps = fps

    @classmethod
    def clip(cls, clip_start, n_frames, fps):
        """A straight excerpt: one segment, source time running with output."""
        return cls([(0, n_frames, clip_start, clip_start + n_frames / fps)],
                   n_frames, fps)

    @classmethod
    def from_placement(cls, placement, units_by_id, n_frames, fps):
        """The journey edit: each placed unit contributes its own spans.

        Built the same way pipeline.arc locates a trigger word - walk the
        unit's spans accumulating duration - so a word lands on the same
        output frame here as it does there.
        """
        segs = []
        for p in placement:
            f0 = p["frame"]
            u = units_by_id.get(p["unit"])
            if u is None:
                continue
            acc = 0.0
            for a, b in u["spans"]:
                d = b - a
                s0 = f0 + int(round(acc * fps))
                s1 = f0 + int(round((acc + d) * fps))
                if s0 < n_frames:
                    segs.append((s0, min(s1, n_frames), a, b))
                acc += d
        return cls(segs, n_frames, fps)

    def to_frames(self, t_src):
        """Every output frame showing source time t_src (a cut can repeat it)."""
        out = []
        for f0, f1, a, b in self.segments:
            if a <= t_src <= b and f1 > f0:
                out.append(min(f1 - 1, f0 + int(round((t_src - a) * self.fps))))
        return out

    def span_to_frames(self, a_src, b_src):
        """Frame range overlapping a source interval, per segment."""
        out = []
        for f0, f1, a, b in self.segments:
            lo, hi = max(a, a_src), min(b, b_src)
            if hi <= lo or f1 <= f0:
                continue
            g0 = f0 + int(round((lo - a) * self.fps))
            g1 = f0 + int(round((hi - a) * self.fps))
            out.append((max(f0, g0), min(f1, max(g0 + 1, g1))))
        return out


# --------------------------------------------------------------- loudness
SR = 16000


def _decode_mono(path, start=None, dur=None):
    """Mono 16 kHz samples, or None when the file carries no audio.

    The mosh-lab test clips are video-only, so this has to be a measured
    absence rather than a crash: the caller falls back to the source talk.
    """
    try:
        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "a:0",
             "-show_entries", "stream=codec_type", "-of", "csv=p=0", path],
            check=True, capture_output=True, text=True).stdout.strip()
        if not probe:
            return None
    except subprocess.CalledProcessError:
        return None
    cmd = ["ffmpeg", "-v", "error"]
    if start is not None:
        cmd += ["-ss", f"{start:.3f}"]
    if dur is not None:
        cmd += ["-t", f"{dur:.3f}"]
    cmd += ["-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"]
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype="<i2").astype(np.float64)


def loudness_through(timeline, src_path):
    """Per-frame RMS pulled from the SOURCE through the edit's own segments.

    The journey render hands over its mixed voice array directly. A raw clip
    has no audio of its own, so its loudness is read from the talk at the
    source times the clip actually shows - which is also how it would behave
    for an edit that jumps around.
    """
    n, fps = timeline.n_frames, timeline.fps
    out = np.zeros(n)
    for f0, f1, a, b in timeline.segments:
        if f1 <= f0:
            continue
        x = _decode_mono(src_path, start=a, dur=max(b - a, 1.0 / fps))
        if x is None or not len(x):
            continue
        per = max(int(round(SR / fps)), 1)
        for f in range(f0, min(f1, n)):
            s = (f - f0) * per
            seg = x[s:s + per]
            if len(seg):
                out[f] = math.sqrt(float((seg ** 2).mean()))
    ref = np.percentile(out[out > 0], 95) if (out > 0).any() else 1.0
    return np.clip(out / max(ref, 1e-9), 0.0, 1.0)


def loudness(path_or_array, n_frames, fps, samples_per_frame=None):
    """Per-frame RMS, normalised to [0,1] against its own 95th percentile.

    Absolute level is useless here - the bed sits at -45 dBFS and the voice
    at -20 - so this is scaled to the loud end of this render's own range.
    """
    if isinstance(path_or_array, np.ndarray):
        a = path_or_array
        n = samples_per_frame or (len(a) // max(n_frames, 1))
        nf = min(n_frames, len(a) // max(n, 1))
        x = a[:nf * n]
        x = x.astype(np.float64)
        if x.ndim > 1:
            x = x.mean(axis=1)
        rms = np.sqrt((x.reshape(nf, n) ** 2).mean(axis=1))
    else:
        a = _decode_mono(path_or_array)
        if a is None:
            return np.zeros(n_frames)
        n = max(int(round(SR / fps)), 1)
        nf = min(n_frames, len(a) // n)
        if nf == 0:
            return np.zeros(n_frames)
        rms = np.sqrt((a[:nf * n].reshape(nf, n) ** 2).mean(axis=1))
    ref = np.percentile(rms, 95) if len(rms) else 1.0
    out = np.zeros(n_frames)
    out[:len(rms)] = np.clip(rms / max(ref, 1e-9), 0.0, 1.0)
    if len(rms) < n_frames and len(rms):
        out[len(rms):] = out[len(rms) - 1]
    return out


# --------------------------------------------------------------- the track
def phrase_weights(units, pools):
    """Source-time spans of the medium-weight phrases, from the unit pools.

    pipeline.units already decides which units are physical or definitional
    and how strongly, so this reads that rather than inventing a second
    vocabulary that could disagree with the beat selection.
    """
    out = []
    for u in units:
        hit = [b for b in pools if b in u.get("pools", [])]
        if not hit:
            continue
        w = 1.0 if any(b in u.get("strong", []) for b in hit) else 0.55
        for a, b in u["spans"]:
            out.append((a, b, w))
    return out


def build(timeline, words, units, cfg, audio=None, trigger_frames=(),
          samples_per_frame=None, seed=0):
    """The envelope, plus everything measured on the way for the report."""
    ic = (cfg or {}).get("intensity") or {}
    concept = [stem(w) for w in ((cfg or {}).get("concept_words") or [])]
    cw = float(ic.get("concept_weight", 1.0))
    pw = float(ic.get("phrase_weight", 0.45))
    lw = float(ic.get("loudness_weight", 0.35))
    pools = ic.get("phrase_pools") or ["physical", "question"]
    atk = max(float(ic.get("attack_frames", 3)), 0.5)
    rel_s = max(float(ic.get("release_seconds", 1.5)), 0.05)

    n, fps = timeline.n_frames, timeline.fps
    raw = np.zeros(n)
    hits = []

    # ---- concept words: a spike one word long, at every frame showing it
    cset = set(concept)
    for x in words:
        if stem(x["word"]) not in cset:
            continue
        frames = timeline.to_frames(x["start"])
        if not frames:
            continue
        dur = max(x.get("end", x["start"]) - x["start"], 1.0 / fps)
        for f in frames:
            f1 = min(n, f + max(int(round(dur * fps)), 1))
            raw[f:f1] = np.maximum(raw[f:f1], cw)
            hits.append({"word": norm_word(x["word"]), "stem": stem(x["word"]),
                         "src_t": round(x["start"], 3), "frame": int(f),
                         "second": int(f // fps)})

    # ---- phrases: a lower bed wherever a physical/definition unit plays
    for a, b, w in phrase_weights(units, pools):
        for f0, f1 in timeline.span_to_frames(a, b):
            raw[f0:f1] = np.maximum(raw[f0:f1], pw * w)

    # ---- loudness: added, not maxed, so emphasis lifts a quiet word
    if isinstance(audio, Timeline):
        raise TypeError("pass loudness_through(timeline, src) as `audio`")
    loud = np.zeros(n)
    if audio is not None:
        loud = (audio if isinstance(audio, np.ndarray) and audio.shape == (n,)
                else loudness(audio, n, fps, samples_per_frame))
    raw = np.clip(raw + lw * loud, 0.0, 1.0)

    # ---- trigger words get a hard onset; the follower eases them out
    for t in trigger_frames:
        if 0 <= t < n:
            raw[int(t)] = 1.0

    # ---- attack / release follower
    ka = 1.0 - math.exp(-1.0 / atk)
    kr = 1.0 - math.exp(-1.0 / max(rel_s * fps, 1.0))
    env = np.zeros(n)
    e = 0.0
    for i in range(n):
        tgt = raw[i]
        e += (tgt - e) * (ka if tgt > e else kr)
        env[i] = e

    # ---- a slow, seeded wander so the quiet stretches are never flat
    rng = np.random.default_rng(seed or 0)
    k = max(int(round(fps * 2.5)), 3)
    walk = np.convolve(rng.standard_normal(n + 4 * k), np.ones(k) / k, "same")
    walk = walk[2 * k:2 * k + n]
    sd = walk.std() or 1.0
    drift = 0.5 + 0.5 * np.tanh(walk / (2.0 * sd))

    hits.sort(key=lambda h: h["frame"])
    return {
        "env": env, "raw": raw, "loud": loud, "drift": drift,
        "concept_hits": hits,
        "concept_words": sorted(cset),
        "params": {"concept_weight": cw, "phrase_weight": pw,
                   "loudness_weight": lw, "attack_frames": atk,
                   "release_seconds": rel_s, "phrase_pools": pools},
        "per_second": [
            {"second": s,
             "env_mean": round(float(env[int(s * fps):int((s + 1) * fps)].mean()), 4),
             "env_max": round(float(env[int(s * fps):int((s + 1) * fps)].max()), 4)}
            for s in range(int(math.ceil(n / fps)))
            if int(s * fps) < n],
    }


def load_words(path="sources/blum/transcript/words.json"):
    return json.load(open(os.path.join(ROOT, path), encoding="utf-8"))


def load_cfg(path="config/triggers.json"):
    return json.load(open(os.path.join(ROOT, path), encoding="utf-8"))
