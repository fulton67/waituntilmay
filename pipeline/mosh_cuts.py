"""Real datamosh at two cuts: classic I-frame removal, bloom, then recovery.

Two cuts in the seven-beat arc mosh and the other four are clean: the cut
into beat 4, where the cables are reported cut, and the cut into beat 5,
where someone says who did it. Nothing else in the render is damaged, and no
curve escalates anything - the damage is where the argument breaks, twice.

What happens at a cut
---------------------
Pass one builds the clean, frame-accurate edit. This pass works on its
*encoded* form, because an I-frame is a thing only an encoded stream has.

The clean edit is re-encoded to a raw MPEG-4 Part 2 elementary stream with a
keyframe forced exactly at the cut and exactly `bloom` frames after it. At
the cut, the I-VOP is taken out of the picture: what plays in its place is
the incoming clip's first P-VOP. A P-VOP is nothing but motion vectors and a
residual against whatever is already in the reference buffer - and what is in
the reference buffer is the last frame of the *previous* clip. So the new
shot's motion drags the old shot's pixels, which is the bloom. The P-VOPs
that follow compound it, and the forced keyframe at cut+bloom ends it in one
frame.

Replaced, not deleted
---------------------
Deleting the I-VOP is the classic recipe and it is what this reproduces, but
deleting changes the frame count, and a render here is exactly 720 frames and
30.000s - the gate. So the I-VOP's bytes are overwritten with a copy of the
following P-VOP's. The decoder then sees a P-VOP at that position carrying
the incoming clip's vectors over the outgoing clip's picture, which is
precisely what deletion produces, plus one extra repeat of that first motion
step. Measured on a two-shot test clip, cut at frame 96 with a 16-frame
bloom:

    frame   mosh vs clean same frame   mosh vs clean frame 95 (the old shot)
       95                      0.00                     0.00
       96                    145.77                     9.89
      100                    141.15                    18.87
      111                    140.12                    20.47
      112                      0.00                   145.60

Frame 96 onward is nothing like the incoming picture and nearly the outgoing
one, drifting away from it as the vectors accumulate; frame 112 is the
recovery keyframe and is exact again. The vectors themselves, read back with
ffedit: clean frame 96 is an I-VOP with no forward vectors at all, moshed
frame 96 carries |mv| 2.379 on all 920 macroblocks - the incoming clip's own
field, which in the clean stream belongs to frame 97.

An I-VOP that falls inside the bloom window - the encoder's own GOP keyframe,
every 12 frames - would cut the smear short, so it is replaced by the P-VOP
before it and the drag continues. Keyframes outside the two windows are left
alone, which is why every other cut in the render is clean.
"""
import os
import random
import subprocess

from .mosh import FFGAC, I_VOP, P_VOP, parse_vops

# How long a bloom runs, in frames. Short enough to read as a hit rather than
# a breakdown, long enough that the drag is visibly accumulating.
BLOOM = (12, 24)
GOP = 12                       # the encoder's own keyframe interval


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True)


def _has_audio(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a",
                        "-show_entries", "stream=index", "-of", "csv=p=0",
                        path], check=True, capture_output=True, text=True)
    return bool(r.stdout.strip())


def plan(rng, cuts, n_frames, bloom=BLOOM):
    """A bloom length per cut, and the keyframes the encoder must place.

    The keyframe list is what makes this exact: without a forced keyframe at
    the cut there is no I-VOP there to remove (the encoder is told not to add
    one on a scene change), and without one at cut+bloom the smear runs to
    the next GOP boundary instead of to the length asked for.
    """
    out = []
    for c in cuts:
        k = rng.randint(*bloom)
        k = min(k, n_frames - 1 - c)
        out.append({"cut": int(c), "bloom": int(k), "recover": int(c + k)})
    keys = sorted({0} | {p["cut"] for p in out} | {p["recover"] for p in out})
    return out, keys


def encode_m4v(src_mp4, m4v, keyframes, gop=GOP, qv=3):
    """The clean edit as a raw MPEG-4 Part 2 stream, keyed where we need it.

    `+forcemv` puts a motion vector on every macroblock, so a P-VOP dragged
    over the wrong picture drags all of it rather than leaving islands.
    `+nopimb` stops the encoder repairing its own error with intra
    macroblocks inside a P frame, which is exactly the repair this effect
    depends on not happening. `-sc_threshold max` stops it adding a keyframe
    of its own on a cut - every I-VOP in the stream is either the GOP's or
    one we asked for. No B-frames, so VOP order is display order and a frame
    index means one thing.
    """
    expr = "+".join(f"eq(n,{k})" for k in keyframes)
    run([FFGAC, "-y", "-hide_banner", "-loglevel", "error", "-i", src_mp4,
         "-an", "-c:v", "mpeg4", "-mpv_flags", "+forcemv+nopimb",
         "-q:v", str(qv), "-g", str(gop), "-bf", "0",
         "-sc_threshold", "max", "-force_key_frames", f"expr:{expr}",
         "-f", "m4v", m4v])
    return m4v


def mosh_stream(m4v, out_m4v, plans):
    """Take the I-VOP out at each cut; keep the frame count exact.

    Returns the evidence: what each VOP's type was before and after, which
    donor carried the motion, and where the recovery keyframe is.
    """
    buf = open(m4v, "rb").read()
    header, frames = parse_vops(buf)
    n = len(frames)
    if n == 0:
        raise RuntimeError("no VOPs parsed from the mpeg4 stream")
    types = [f["type"] for f in frames]
    out = [f["bytes"] for f in frames]

    def last_p_before(i):
        j = i - 1
        while j > 0:
            if types[j] == P_VOP:
                return j
            j -= 1
        return None

    report = []
    for p in plans:
        c, k, rec = p["cut"], p["bloom"], p["recover"]
        if not (0 < c < n and rec < n):
            raise RuntimeError(f"cut {c} (+{k}) outside the {n}-VOP stream")
        if types[c] != I_VOP:
            raise RuntimeError(
                f"frame {c} is not an I-VOP, so there is nothing to remove - "
                f"the forced keyframe did not land")
        if types[c + 1] != P_VOP:
            raise RuntimeError(f"frame {c+1} is not a P-VOP, so there is no "
                               f"incoming motion to carry over")
        if types[rec] != I_VOP:
            raise RuntimeError(
                f"frame {rec} is not an I-VOP, so the bloom has no recovery")
        # the cut: the incoming clip's first P-VOP plays where its keyframe was
        out[c] = frames[c + 1]["bytes"]
        suppressed = []
        for i in range(c + 1, rec):
            if types[i] == I_VOP:
                j = last_p_before(i)
                if j is None:
                    continue
                out[i] = frames[j]["bytes"]
                suppressed.append(i)
        report.append({
            "cut": c, "bloom": k, "recover": rec,
            "donor": c + 1,
            "was": "I", "now": "P",
            "gop_keyframes_suppressed": suppressed,
        })

    open(out_m4v, "wb").write(header + b"".join(out))
    return {"total_vops": n,
            "keyframes_clean": [i for i, t in enumerate(types) if t == I_VOP],
            "cuts": report}


def remux(moshed_m4v, src_mp4, out_mp4, fps=24, crf=20):
    """Back to H.264 with the clean edit's own audio, untouched.

    The audio never goes through this pass at all: the mosh is a video-stream
    rewrite and the voice is mapped straight off the clean edit, so there is
    no resample, no stretch and no pitch shift anywhere in it.
    """
    r = str(fps)
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
           "-fflags", "+genpts", "-r", r, "-f", "m4v", "-i", moshed_m4v]
    if _has_audio(src_mp4):
        cmd += ["-i", src_mp4, "-map", "0:v:0", "-map", "1:a:0",
                "-c:a", "copy", "-shortest"]
    else:
        cmd += ["-an"]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", str(crf),
            "-pix_fmt", "yuv420p", "-r", r, "-movflags", "+faststart",
            out_mp4]
    run(cmd)
    return out_mp4


def datamosh(clean_mp4, out_mp4, cuts, n_frames=720, seed=0, fps=24,
             bloom=BLOOM, keep_intermediate=False):
    """The whole pass: encode, remove, remux.

    `cuts` are output frame indices - the first frame of the incoming beat.
    """
    rng = random.Random(seed ^ 0x5EED)
    base = os.path.splitext(out_mp4)[0]
    m4v, moshed = base + "_clean.m4v", base + "_mosh.m4v"

    plans, keys = plan(rng, cuts, n_frames, bloom)
    encode_m4v(clean_mp4, m4v, keys)
    rep = mosh_stream(m4v, moshed, plans)
    remux(moshed, clean_mp4, out_mp4, fps=fps)

    rep["forced_keyframes"] = keys
    rep["moshed_frames"] = sum(
        c["bloom"] for c in rep["cuts"])
    rep["intermediate"] = ({"clean_m4v": m4v, "moshed_m4v": moshed}
                           if keep_intermediate else None)
    if not keep_intermediate:
        for f in (m4v, moshed):
            try:
                os.remove(f)
            except OSError:
                pass
    return rep
