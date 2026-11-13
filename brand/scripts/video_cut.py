"""Cut a raw talking-head recording to the kept phrases before the edit (scripts/video_edit.cjs runs on the result).
edit.json "cut": { "raw": <source video>, "keep": [[start_s, end_s, "text", "who"], ...] } in RAW source seconds; ranges are padded by
hand at word boundaries from the word-timed raw transcript (scripts/video_transcribe.py). Dead air between kept phrases goes; inside a
range, pauses longer than "maxPause" (default 0.30 s) are shortened to it using the transcript's word gaps.
Video: hard cuts, every frame kept at the source rate. Audio: 15 ms fades at every join so cuts don't click.
Writes <slug>/<slug>_cut.mp4 and <slug>/cut_map.json (each piece's raw range, its start in the cut, text, speaker).
"xfade" (s, optional): instead of hard cuts, each join is a short cross-dissolve of picture and sound of that length (both sides of
a join sit in room tone, so the audio crossfade is silent); the cut gets shorter by xfade per join and cut_map "at" accounts for it.
usage: python -I brand/scripts/video_cut.py brand/edits/<slug>/edit.json [--raw <other video> --out <file>]
  --raw/--out: cut another file with the SAME pieces (e.g. the matte from video_matte.py, with the source audio muxed in); cut_map untouched"""
import json, os, subprocess, sys

args = sys.argv[1:]
opt = {k: args[args.index(k) + 1] for k in ("--raw", "--out") if k in args}
cfg_path = args[0]
D = os.path.dirname(os.path.abspath(cfg_path)); slug = os.path.basename(D)
C = json.load(open(cfg_path, encoding="utf-8")); cut = C["cut"]
maxp = cut.get("maxPause", 0.30)
words = [w for s in json.load(open(os.path.join(D, cut.get("transcript", "raw_transcript.json")), encoding="utf-8"))["segments"] for w in s["words"]]

# split each keep range at long internal pauses
pieces = []
for s, e, text, who in cut["keep"]:
    inner = [w for w in words if w["s"] >= s - 0.01 and w["e"] <= e + 0.01]
    a = s
    for w0, w1 in zip(inner, inner[1:]):
        gap = w1["s"] - w0["e"]
        if gap > maxp:
            pieces.append([a, w0["e"] + maxp / 2, text, who]); a = w1["s"] - maxp / 2
    pieces.append([a, e, text, who])

# "tail" (s, max): whisper's word ends land early on trailing consonants and breaths (v1 client note: "the cuts are a bit too fast
# and it cuts off what he says"), so each piece's end is pushed forward to the first quiet 10 ms frame (within 5 dB of the
# room tone) within "tail" seconds. If no dip comes in that window the next sound is joined speech (a filler that
# was cut, often missing from the transcript), and the end stays where it was.
tail = cut.get("tail", 0.0)
if tail:
    import numpy as np
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", cut["raw"], "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
    rms = np.sqrt(np.mean(x[: len(x) // 160 * 160].reshape(-1, 160) ** 2, axis=1))
    quiet = np.percentile(rms, 10) * 10 ** (5 / 20)  # 5 dB over the room tone (10th percentile frame); this recording peaks only ~16 dB above it
    skip = set(cut.get("tailSkip", []))  # range ends (raw s) where the next sound is a dropped retake or filler, checked by ear and re-transcription
    for p in pieces:
        if round(p[1], 2) in skip: continue
        i0 = int(p[1] * 100)
        dips = [i for i in range(i0, min(len(rms), i0 + int(tail * 100))) if rms[i] < quiet]
        if dips: p[1] = max(p[1], dips[0] / 100 + 0.02)
# pieces that now touch (adjacent keep ranges, short internal pauses) are merged so no sound plays twice
merged = []
for p in pieces:
    if merged and p[0] <= merged[-1][1] + 0.06: merged[-1][1] = max(merged[-1][1], p[1])
    else: merged.append(p)
pieces = merged

F = 0.015
X = float(cut.get("xfade", 0))
raw = opt.get("--raw", cut["raw"])
fc, n = [], 0
for i, (s, e, _, _) in enumerate(pieces):
    d = e - s
    fc.append(f"[0:v]trim=start={s:.3f}:end={e:.3f},setpts=PTS-STARTPTS[v{i}];")
    fade = "" if X else f",afade=t=in:d={F},afade=t=out:st={max(0, d - F):.3f}:d={F}"
    fc.append(f"[0:a]atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS{fade}[a{i}];")
if X and len(pieces) > 1:
    off, vl, al = 0.0, "v0", "a0"
    for i in range(1, len(pieces)):
        off += pieces[i - 1][1] - pieces[i - 1][0] - X
        last = i == len(pieces) - 1
        vo, ao = ("v", "a") if last else (f"vx{i}", f"ax{i}")
        fc.append(f"[{vl}][v{i}]xfade=transition=fade:duration={X}:offset={off:.3f}[{vo}];[{al}][a{i}]acrossfade=d={X}:c1=tri:c2=tri[{ao}]" + ("" if last else ";"))
        vl, al = vo, ao
else:
    fc.append("".join(f"[v{i}][a{i}]" for i in range(len(pieces))) + f"concat=n={len(pieces)}:v=1:a=1[v][a]")
out = opt.get("--out", os.path.join(D, f"{slug}_cut.mp4"))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-filter_complex", "".join(fc), "-map", "[v]", "-map", "[a]",
                "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", out], check=True)
if "--raw" in opt: print(f"{len(pieces)} pieces of {raw} -> {out}"); sys.exit(0)
t, cmap = 0.0, []
for s, e, text, who in pieces:
    cmap.append({"raw": [round(s, 3), round(e, 3)], "at": round(t, 3), "text": text, "who": who}); t += e - s - X
t += X
json.dump({"raw": cut["raw"], "duration": round(t, 3), "pieces": cmap}, open(os.path.join(D, "cut_map.json"), "w", encoding="utf-8"), indent=1)
print(f"{len(cut['keep'])} kept phrases -> {len(pieces)} pieces, {t:.2f} s (raw {words[-1]['e']:.1f} s) -> {out}")
