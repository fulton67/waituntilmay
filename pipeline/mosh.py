"""Datamosh pass two.

Pass one builds a clean, frame-accurate 30.0s edit. This pass corrupts its
ENCODED form, which is the opposite of a clean frame reassembly and so cannot
be done in the frame pipeline itself.

Method: re-encode to an MPEG-4 Part 2 elementary stream (raw .m4v, no
container index to keep consistent), then rewrite the VOP sequence.

  - An I-VOP we want to mosh is REPLACED by a copy of the preceding P-VOP.
    The decoder applies stale motion vectors to the current picture, which is
    the bloom. Replacing rather than deleting keeps the frame count exact.
  - A P-VOP bloom REPLACES the following k frames with copies of one P-VOP,
    smearing its motion across them.

Both operations preserve the frame count, so the render stays exactly 720
frames and A/V sync is untouched.

Intensity follows a curve across the render: near zero at the start, maximum
in the last few seconds. `gamma` sets the steepness (phase 1 gentle, phase 4
steep), `peak` the ceiling.
"""
import os
import random
import subprocess

START = b"\x00\x00\x01"
VOP = 0xB6

I_VOP, P_VOP = 0, 1


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True)


def _has_audio(path):
    """The journey edits always carry voice; a bare test clip may not."""
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a",
                        "-show_entries", "stream=index", "-of", "csv=p=0", path],
                       check=True, capture_output=True, text=True)
    return bool(r.stdout.strip())


def _start_positions(buf):
    pos, i, n = [], 0, len(buf)
    while True:
        j = buf.find(START, i)
        if j < 0:
            break
        pos.append(j)
        i = j + 3
    return pos


def parse_vops(buf):
    """-> (header_bytes, [ {bytes, type} ]) one entry per coded frame."""
    pos = _start_positions(buf)
    if not pos:
        return buf, []
    pos.append(len(buf))
    header = b""
    frames = []
    pending = b""
    for k in range(len(pos) - 1):
        s, e = pos[k], pos[k + 1]
        seg = buf[s:e]
        code = buf[s + 3] if s + 3 < len(buf) else 0
        if code == VOP:
            vtype = (buf[s + 4] >> 6) & 0x03 if s + 4 < len(buf) else P_VOP
            if not frames and not header:
                header, pending = pending, b""
            frames.append({"bytes": pending + seg, "type": vtype})
            pending = b""
        else:
            pending += seg
    if pending and frames:
        frames[-1]["bytes"] += pending
    return header, frames


def curve(i, n, gamma, peak):
    """0 at the start, `peak` at the end; gamma sets the steepness."""
    if n <= 1:
        return 0.0
    return peak * (i / (n - 1)) ** gamma


def datamosh(src_mp4, out_mp4, triggers=(), n_frames=720, gamma=2.0, peak=0.7,
             cfg=None, seed=0, keep_intermediate=False, fps=24):
    rng = random.Random(seed ^ 0x5EED)
    base = os.path.splitext(out_mp4)[0]
    m4v = base + "_src.m4v"
    moshed = base + "_mosh.m4v"

    # 1. encode to a raw MPEG-4 part 2 stream with regular I-frames to attack,
    #    and no B-frames so VOP order == display order.
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", src_mp4,
         "-an", "-c:v", "mpeg4", "-q:v", "3", "-g", "12", "-bf", "0",
         "-sc_threshold", "0", "-f", "m4v", m4v])

    buf = open(m4v, "rb").read()
    header, frames = parse_vops(buf)
    n = len(frames)
    if n == 0:
        raise RuntimeError("no VOPs parsed from the mpeg4 stream")

    tm = cfg["trigger_mosh"] if cfg else {"bloom_frames": {"min": 4, "max": 12}}
    bl = tm.get("bloom_frames", {"min": 4, "max": 12})

    out = [f["bytes"] for f in frames]
    types = [f["type"] for f in frames]
    moshed_idx = set()

    def last_p_before(i):
        j = i - 1
        while j > 0:
            if types[j] == P_VOP:
                return j
            j -= 1
        return None

    # 2. trigger words: force a mosh right at that frame
    for t in triggers:
        if not (0 < t < n):
            continue
        src = last_p_before(t)
        if src is None:
            continue
        if types[t] == I_VOP:
            out[t] = frames[src]["bytes"]
            moshed_idx.add(t)
        k = rng.randint(bl["min"], bl["max"])
        donor = t if types[t] == P_VOP else src
        for d in range(1, k + 1):
            if t + d >= n:
                break
            out[t + d] = frames[donor]["bytes"]
            moshed_idx.add(t + d)

    # 3. the escalation curve
    for i in range(1, n):
        p = curve(i, n, gamma, peak)
        if types[i] == I_VOP:
            if rng.random() < p:
                src = last_p_before(i)
                if src is not None:
                    out[i] = frames[src]["bytes"]
                    moshed_idx.add(i)
        elif rng.random() < p * 0.18:
            src = last_p_before(i)
            if src is not None:
                out[i] = frames[src]["bytes"]
                moshed_idx.add(i)

    open(moshed, "wb").write(header + b"".join(out))

    # 4. remux with the clean audio; re-encode video to H.264 for the web
    r = str(fps)
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
           "-fflags", "+genpts", "-r", r, "-f", "m4v", "-i", moshed]
    if _has_audio(src_mp4):
        cmd += ["-i", src_mp4, "-map", "0:v:0", "-map", "1:a:0",
                "-c:a", "aac", "-b:a", "192k", "-shortest"]
    else:
        cmd += ["-an"]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "20",
            "-pix_fmt", "yuv420p", "-r", r, "-movflags", "+faststart", out_mp4]
    run(cmd)

    if not keep_intermediate:
        for f in (m4v, moshed):
            try:
                os.remove(f)
            except OSError:
                pass
    return {"moshed_frames": len(moshed_idx), "total_vops": n,
            "keyframes": sum(1 for t in types if t == I_VOP),
            # which frames were touched, for anything that needs ground truth
            "moshed_index": sorted(moshed_idx),
            "intermediate": {"clean_m4v": m4v, "moshed_m4v": moshed}
                            if keep_intermediate else None}
