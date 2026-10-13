"""Datamosh a rendered clip, preserving frame count and timing.

Method follows whatmakeart/ffmpeg-datamosh: encode to MPEG-4, find the
I-frames, and REPLACE each one with a neighbouring frame rather than deleting
it, so the frame count never changes. That repo is a Colab notebook driven by
files.upload() and input() prompts, so it cannot be invoked from a build; the
same technique is applied here to the raw MPEG-4 elementary stream, which
avoids rewriting an AVI index and makes the frame mapping explicit.

Strengths:
  medium  replace a fraction of the I-frames
  full    replace every I-frame and duplicate P-frames, so motion vectors
          keep smearing across the picture

  python scripts/mosh_datamosh.py --src in.mp4 --out out.mp4 --strength full
"""
import argparse
import json
import os
import random
import subprocess
import sys

START = b"\x00\x00\x01"
VOP = 0xB6
I_VOP, P_VOP = 0, 1


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True)


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_frames",
         "-show_entries", "stream=width,height,r_frame_rate,nb_read_frames",
         "-show_entries", "format=duration,size", "-of", "json", path],
        capture_output=True, text=True, check=True).stdout
    d = json.loads(out)
    s = d["streams"][0]
    return {"w": s["width"], "h": s["height"], "fps": s["r_frame_rate"],
            "frames": int(s["nb_read_frames"]),
            "duration": float(d["format"]["duration"]),
            "size": int(d["format"]["size"])}


def parse_vops(buf):
    """Split an MPEG-4 part 2 elementary stream into one entry per coded frame."""
    pos, i = [], 0
    while True:
        j = buf.find(START, i)
        if j < 0:
            break
        pos.append(j)
        i = j + 3
    if not pos:
        return buf, []
    pos.append(len(buf))
    header, frames, pending = b"", [], b""
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--strength", choices=["medium", "full"], default="full")
    ap.add_argument("--gop", type=int, default=12)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--keep", action="store_true")
    a = ap.parse_args()

    rng = random.Random(a.seed)
    src = probe(a.src)
    print(f"source {os.path.basename(a.src)}  {src['w']}x{src['h']} @ {src['fps']}  "
          f"{src['frames']} frames  {src['duration']:.3f}s")

    base = os.path.splitext(a.out)[0]
    m4v, moshed = base + "_src.m4v", base + "_mosh.m4v"

    # 1. encode to MPEG-4 with regular I-frames to attack, no B-frames so VOP
    #    order equals display order
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", a.src,
         "-an", "-c:v", "mpeg4", "-q:v", "3", "-g", str(a.gop), "-bf", "0",
         "-sc_threshold", "0", "-f", "m4v", m4v])

    buf = open(m4v, "rb").read()
    header, frames = parse_vops(buf)
    n = len(frames)
    if n == 0:
        print("no VOPs parsed", file=sys.stderr)
        return 1
    types = [f["type"] for f in frames]
    n_i = sum(1 for t in types if t == I_VOP)
    print(f"parsed {n} VOPs, {n_i} I-frames (gop {a.gop})")

    out = [f["bytes"] for f in frames]
    replaced, bloomed = 0, 0
    p_full = 1.0 if a.strength == "full" else 0.55
    bloom_p = 0.22 if a.strength == "full" else 0.0

    for i in range(1, n):            # never touch the first frame
        if types[i] == I_VOP and rng.random() < p_full:
            # replace with the NEXT frame, as the notebook does, so the count
            # is unchanged and the stale motion vectors bloom
            src_i = i + 1 if i + 1 < n else i - 1
            out[i] = frames[src_i]["bytes"]
            replaced += 1
        elif types[i] == P_VOP and bloom_p and rng.random() < bloom_p:
            out[i] = frames[i - 1]["bytes"]
            bloomed += 1

    open(moshed, "wb").write(header + b"".join(out))
    print(f"{a.strength}: replaced {replaced}/{n_i} I-frames, duplicated {bloomed} P-frames")

    # 2. back to H.264, forced to the source frame rate and frame count
    fps = src["fps"]
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
         "-fflags", "+genpts", "-r", fps, "-f", "m4v", "-i", moshed,
         "-vf", f"scale={src['w']}:{src['h']}", "-frames:v", str(src["frames"]),
         "-c:v", "libx264", "-preset", "medium", "-crf", "20",
         "-pix_fmt", "yuv420p", "-r", fps,
         "-movflags", "+faststart", a.out])

    got = probe(a.out)
    print(f"output {os.path.basename(a.out)}  {got['w']}x{got['h']} @ {got['fps']}  "
          f"{got['frames']} frames  {got['duration']:.3f}s  {got['size']/1e6:.2f} MB")

    ok_frames = got["frames"] == src["frames"]
    ok_dur = abs(got["duration"] - src["duration"]) <= 1.0 / 24
    print(f"  frame count matches source : {ok_frames} ({got['frames']} vs {src['frames']})")
    print(f"  duration matches source    : {ok_dur} "
          f"({got['duration']:.3f}s vs {src['duration']:.3f}s, "
          f"delta {abs(got['duration']-src['duration'])*1000:.1f} ms)")

    if not a.keep:
        for f in (m4v, moshed):
            try:
                os.remove(f)
            except OSError:
                pass
    return 0 if (ok_frames and ok_dur) else 1


if __name__ == "__main__":
    sys.exit(main())
