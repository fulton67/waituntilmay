"""Cut a raw talking-head recording to the kept phrases before the edit (scripts/video_edit.cjs runs on the result).
edit.json "cut": { "raw": <source video>, "keep": [[start_s, end_s, "text", "who"], ...] } in RAW source seconds; ranges are padded by
hand at word boundaries from the word-timed raw transcript (scripts/video_transcribe.py). Dead air between kept phrases goes; inside a
range, pauses longer than "maxPause" (default 0.30 s) are shortened to it using the transcript's word gaps.
Video: hard cuts, every frame kept at the source rate. Audio: 15 ms fades at every join so cuts don't click.
Writes <slug>/<slug>_cut.mp4 and <slug>/cut_map.json (each piece's raw range, its start in the cut, text, speaker).
usage: python -I brand/scripts/video_cut.py brand/edits/<slug>/edit.json"""
import json, os, subprocess, sys

cfg_path = sys.argv[1]
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

F = 0.015
fc, n = [], 0
for i, (s, e, _, _) in enumerate(pieces):
    d = e - s
    fc.append(f"[0:v]trim=start={s:.3f}:end={e:.3f},setpts=PTS-STARTPTS[v{i}];")
    fc.append(f"[0:a]atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS,afade=t=in:d={F},afade=t=out:st={max(0, d - F):.3f}:d={F}[a{i}];")
fc.append("".join(f"[v{i}][a{i}]" for i in range(len(pieces))) + f"concat=n={len(pieces)}:v=1:a=1[v][a]")
out = os.path.join(D, f"{slug}_cut.mp4")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", cut["raw"], "-filter_complex", "".join(fc), "-map", "[v]", "-map", "[a]",
                "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", out], check=True)
t, cmap = 0.0, []
for s, e, text, who in pieces:
    cmap.append({"raw": [round(s, 3), round(e, 3)], "at": round(t, 3), "text": text, "who": who}); t += e - s
json.dump({"raw": cut["raw"], "duration": round(t, 3), "pieces": cmap}, open(os.path.join(D, "cut_map.json"), "w", encoding="utf-8"), indent=1)
print(f"{len(cut['keep'])} kept phrases -> {len(pieces)} pieces, {t:.2f} s (raw {words[-1]['e']:.1f} s) -> {out}")
