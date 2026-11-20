"""One command per reel: prep (cached) -> render -> master -> checks -> a versioned build with a manifest. Recipe: brand/remotion/REELS.md.

  python brand/scripts/reel.py <reel> [--version vN] [--frames A-B] [--prep auto|skip|force] [--face-clear] [--compare <delivered.mp4>]
  python brand/scripts/reel.py <reel> --plan            print the steps and stop (nothing runs)
  python brand/scripts/reel.py compare <a.mp4> <b.mp4> [--frames A-B] [--offset N]     picture + loudness difference of two files

<reel> = jan08 | oct14 | undereye. The edit is read from brand/remotion/timelines/<reel>.<version>.json when that frozen file exists,
else from the working brand/remotion/timelines/<reel>.json (edit it by hand or in the view: python brand/scripts/timeline_view.py).
Output: brand/edits/<edit>/builds/<reel>_<version>[_fA-B]__<time>/  raw.mp4, <reel>_<version>.mp4 (the master), manifest.json,
build.log, timeline.json and props.json (exactly what was rendered). A build folder is always new: nothing is ever overwritten.
Prep steps are cached on the hash of their inputs (builds/prep_cache.json): the first run adopts the assets already on disk, a later
run re-runs a step only when one of its inputs changed or an output is missing (--prep force re-runs all, --prep skip none).
--frames renders a segment: the loudness gain is still measured on the whole reel's audio (an audio-only render), so a segment of the
master sounds the same as that stretch of the full master.
Checks (in the manifest; exit code 1 when one fails): timeline validation, format, loudness (-14 LUFS +-0.5, true peak <= -1 dBTP),
colour (raw footage: render vs a plain ffmpeg decode of the source frame, mean difference <= 2 levels; stills are skipped), frozen picture
(the footage in the render keeps advancing with its source: no layer holds a stale frame for >= 6 frames), toneMapped lint (every
OffthreadVideo carries toneMapped={false}), and with --face-clear the reel's face_clear.py.
"""
import argparse, datetime, fnmatch, glob, hashlib, json, os, re, shutil, subprocess, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import timeline_lib as T

for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception: pass
ROOT = T.ROOT
REM = T.REM
PUB = REM / "public"
HOME = Path.home()
STYLE = str(HOME / "tools/style-venv/Scripts/python.exe")   # mediapipe, cv2, numpy
BRAND = str(HOME / "tools/brand-venv/Scripts/python.exe")   # onnxruntime (Robust Video Matting)
CLINIC = "C:/Users/naimj/clinic-library/.venv/Scripts/python.exe"  # local faster-whisper on the GPU; nothing leaves this PC
S = "brand/scripts"

# ---------------------------------------------------------------------------------------------------------------- the recipes
# prep step: (name, command, inputs, outputs). Paths are repo-relative globs unless absolute. Commands run from the repo root.
REELS = {
    "jan08": {
        "edit": "brand/edits/jan08-filler-fatigue", "pub": "jan08", "plates": ["J1", "J2", "J3", "J4", "J5"],
        "raw": ["C:/Users/naimj/clinic-library/tmp/jan08/IMG_2421.MOV"],
        "prep": [
            ("words", f'"{CLINIC}" {S}/jan08_prep.py words', ["C:/Users/naimj/clinic-library/tmp/jan08/IMG_2421.MOV"], ["brand/edits/jan08-filler-fatigue/words_talk.json"]),
            ("gaps", f'"{STYLE}" -I {S}/jan08_gaps.py check', ["brand/edits/jan08-filler-fatigue/talk48.wav", "research/ostad/style/jan08/cut.json"], ["brand/edits/jan08-filler-fatigue/gaps.json"]),
            ("footage", "restore the raw clips from hlg_backup/ (never tone-mapped: DECISIONS 16f)", ["brand/edits/jan08-filler-fatigue/hlg_backup/*.mp4"],
             ["brand/remotion/public/jan08/talk.mp4", "brand/remotion/public/jan08/clinic/IMG_3453.mp4", "brand/remotion/public/jan08/clinic/IMG_3470.mp4"]),
            ("props", f'"{STYLE}" -I {S}/jan08_prep.py props', ["research/ostad/style/jan08/cut.json", "brand/edits/jan08-filler-fatigue/words_talk.json"], ["brand/remotion/public/jan08/props.json"]),
            ("voice", f'"{STYLE}" -I {S}/jan08_prep.py voice', ["brand/remotion/public/jan08/props.json", "brand/edits/jan08-filler-fatigue/talk48.wav"], ["brand/remotion/public/jan08/voice.wav"]),
            ("before_after", f'"{STYLE}" -I {S}/jan08_ba.py', [f"{S}/jan08_ba.py"], ["brand/remotion/public/jan08/ba.json", "brand/remotion/public/jan08/clinic/front_after_aligned.jpg"]),
            ("plan", f'"{STYLE}" -I {S}/jan08_plan.py', ["brand/remotion/public/jan08/ba.json", f"{S}/jan08_plan.py"], ["brand/remotion/src/jan08/planV3.ts"]),
            ("matte_rvm", f'"{BRAND}" -I {S}/video_matte.py <piece_src.mp4> brand/edits/jan08-filler-fatigue/matte/<piece>   (per keyed piece: hook belief aging method cheekbones approach)',
             ["brand/edits/jan08-filler-fatigue/hlg_backup/talk.mp4"], ["brand/edits/jan08-filler-fatigue/matte/*_pha.mp4"]),
            ("mattes", f'"{STYLE}" -I {S}/jan08_mattes.py', ["brand/edits/jan08-filler-fatigue/matte/*_pha.mp4", f"{S}/jan08_mattes.py", f"{S}/jan08_masks.py"], ["brand/remotion/public/jan08/matte/*.mp4"]),
        ],
        "face_clear": {"renders": {"footage": {"mode": "footage"}, "graphics": {"mode": "check"}},
                       "cmd": f'"{STYLE}" -I research/ostad/style/jan08/face_clear.py {{footage}} {{graphics}} {{out}} --label {{version}}'},
        "more_checks": ["research/ostad/style/jan08/track_v3.py (mark lock: median / p95 / max px)", f"{S}/jan08_verify.py <master> (cuts, pacing, edges)", f"{S}/jan08_pieces_asr.py final <master> (no clipped word)"],
    },
    "oct14": {
        "edit": "brand/edits/oct14-injection", "pub": "oct14", "plates": ["O1", "O2", "O3", "O4"],
        "raw": ["C:/Users/naimj/clinic-library/tmp/oct14/"],
        "prep": [
            ("select", f'"{STYLE}" -I {S}/oct14_prep.py select', ["C:/Users/naimj/clinic-library/tmp/oct14/*.MOV"], ["brand/edits/oct14-injection/clips.json"]),
            ("words", f'"{STYLE}" -I {S}/oct14_prep.py words', ["brand/edits/oct14-injection/clips.json"], ["brand/edits/oct14-injection/words_*.json"]),
            ("footage", "restore the raw clips from hlg_backup/ (never tone-mapped: DECISIONS 16f); first build: oct14_prep.py transcode", ["brand/edits/oct14-injection/hlg_backup/*.mp4"], ["brand/remotion/public/oct14/intro.mp4", "brand/remotion/public/oct14/after.mp4", "brand/remotion/public/oct14/inj*.mp4", "brand/remotion/public/oct14/neuro.mp4"]),
            ("plan", f'"{STYLE}" -I {S}/oct14_plan.py', ["brand/edits/oct14-injection/words_*.json", f"{S}/oct14_plan.py"], ["research/ostad/style/oct14/cut.json", "research/ostad/style/oct14/plan.json"]),
            ("before_after", f'"{STYLE}" -I {S}/oct14_pairs.py', [f"{S}/oct14_pairs.py"], ["brand/remotion/public/oct14/before.jpg", "brand/remotion/public/oct14/after_aligned.jpg", "brand/edits/oct14-injection/pair.json"]),
            ("track", f'"{STYLE}" -I {S}/oct14_track.py', [f"{S}/oct14_track.py", "research/ostad/style/oct14/cut.json"], ["brand/edits/oct14-injection/tracks.json"]),
            ("props", f'"{STYLE}" -I {S}/oct14_prep.py props', ["research/ostad/style/oct14/cut.json", "brand/edits/oct14-injection/words_*.json", "brand/edits/oct14-injection/tracks.json", "brand/edits/oct14-injection/pair.json"], ["brand/remotion/public/oct14/props.json"]),
            ("audio", f'"{STYLE}" -I {S}/oct14_prep.py audio   (v6+: audio_v6 -> mix_v6.wav)', ["brand/remotion/public/oct14/props.json"], ["brand/remotion/public/oct14/mix.wav"]),
            ("track_v5", f'"{STYLE}" -I {S}/oct14_track_v5.py', ["brand/remotion/public/oct14/props.json", f"{S}/oct14_track_v5.py"], ["brand/remotion/public/oct14/tracks_v5.json"]),
            ("still_v5", f'"{STYLE}" -I {S}/oct14_still_v5.py', ["brand/remotion/public/oct14/props.json", f"{S}/oct14_still_v5.py"], ["brand/remotion/public/oct14/stills_v5.json", "brand/remotion/public/oct14/still_jowl.jpg"]),
            ("markup_v5", f'"{STYLE}" -I {S}/oct14_v5_markup.py', [f"{S}/oct14_v5_markup.py", "brand/remotion/public/oct14/before.jpg", "brand/remotion/public/oct14/after_aligned.jpg"], ["brand/remotion/public/oct14/markup_v5.json"]),
            ("faces", f'"{STYLE}" -I {S}/oct14_faces.py   (then --render <allowed.mp4> once a layer="allowed" render exists)', ["brand/remotion/public/oct14/props.json", f"{S}/oct14_faces.py"], ["brand/edits/oct14-injection/faces_src.json"]),
            ("layout_v5", f'"{STYLE}" -I {S}/oct14_layout_v5.py', ["brand/remotion/public/oct14/props.json", "brand/edits/oct14-injection/faces_*.json", f"{S}/oct14_layout_v5.py"], ["brand/remotion/public/oct14/layout_v5.json"]),
        ],
        "face_clear": {"renders": {"final": None, "allowed": {"layer": "allowed"}},
                       "cmd": f'"{STYLE}" -I research/ostad/style/oct14/face_clear.py {{final}} {{allowed}} {{out}}'},
        "more_checks": ['research/ostad/style/oct14/track_measure_v5.py <probe.mp4> <out.json> on a layer="probe" render (median < 6, p95 < 15, max <= 15 px)', f"{S}/oct14_verify.py <master> <bare.mp4> (patient name = 0 hits, captions, reveals)"],
    },
    "undereye": {
        "edit": "brand/edits/undereye-filler", "pub": "undereye-filler", "plates": ["U1", "U3", "U4", "U5", "U6", "U7", "U8", "U9"],
        "raw": ["C:/Users/naimj/clinic-library (IMG_6813-6821, IMG_7044)"],
        "prep": [
            ("footage", "restore the raw clips from hlg_backup/ (never tone-mapped: DECISIONS 16f); first build: undereye_prep.py", ["brand/edits/undereye-filler/hlg_backup/*.mp4"], ["brand/remotion/public/undereye-filler/68*.mp4", "brand/remotion/public/undereye-filler/7044.mp4"]),
            ("before_after", f'"{STYLE}" -I {S}/undereye_beforeafter.py', [f"{S}/undereye_beforeafter.py"], ["brand/remotion/public/undereye-filler/ba_wipe_before.jpg", "brand/remotion/public/undereye-filler/ba_wipe_after.jpg"]),
            ("sketch", f'"{STYLE}" -I {S}/undereye_sketch.py', [f"{S}/undereye_sketch.py"], ["brand/edits/undereye-filler/sketch.json"]),
            ("track_v2", f'"{STYLE}" -I {S}/undereye_track_v2.py', [f"{S}/undereye_track_v2.py", "research/ostad/style/undereye/cut_v2.json"], ["brand/edits/undereye-filler/tracks_v2.json"]),
            ("props_v2", f'"{STYLE}" -I {S}/undereye_prep_v2.py build', ["research/ostad/style/undereye/cut_v2.json", "brand/edits/undereye-filler/sketch.json", "brand/edits/undereye-filler/tracks_v2.json", f"{S}/undereye_prep_v2.py"],
             ["brand/remotion/public/undereye-filler/props_v2.json", "brand/remotion/public/undereye-filler/dialogue_v2.wav"]),
            ("props_v4", f'"{STYLE}" -I {S}/undereye_prep_v4.py', ["brand/remotion/public/undereye-filler/props_v2.json", f"{S}/undereye_prep_v4.py"], ["brand/remotion/public/undereye-filler/props_v4.json"]),
            ("keys", f'"{BRAND}" -I {S}/undereye_key.py <name> <clip> <a_s> <b_s>   (per props_v4 keys: title c01 c02 c02b c03 c04)', ["brand/remotion/public/undereye-filler/props_v4.json", f"{S}/undereye_key.py"], ["brand/remotion/public/undereye-filler/key_*.webm"]),
        ],
        "face_clear": {"renders": {"bare": {"bare": True}}, "scale": 0.5,
                       "cmd": f'"{STYLE}" -I research/ostad/style/undereye/face_clear.py boxes {{props}} {{faces}} && "{STYLE}" -I research/ostad/style/undereye/face_clear.py check {{bare}} {{faces}} {{out}}'},
        "more_checks": [f"{S}/undereye_lock_check.py (mark lock: median / p95 / max px)", f"{S}/undereye_master_v4.py measure <master> <json> (scdet cut list)"],
    },
}
FLORA = ("flora_frames", f'"{STYLE}" -I {S}/flora_frames.py <plate ids>', ["brand/edits/flora-anatomy/qa_omni.json", f"{S}/flora_frames.py"], ["brand/remotion/public/flora/frames.json"])

# ---------------------------------------------------------------------------------------------------------------- helpers
LOG = None
def say(*a):
    s = " ".join(str(x) for x in a)
    print(s, flush=True)
    if LOG: LOG.write(s + "\n"); LOG.flush()

def run(cmd, cwd=ROOT, check=True, quiet=False):
    say("$", cmd if isinstance(cmd, str) else subprocess.list2cmdline(cmd))
    t = time.time()
    r = subprocess.run(cmd, cwd=cwd, shell=isinstance(cmd, str), capture_output=True, text=True, encoding="utf-8", errors="replace")
    out = (r.stdout or "") + (r.stderr or "")
    if LOG: LOG.write(out[-6000:] + f"\n[{time.time() - t:.1f} s, exit {r.returncode}]\n"); LOG.flush()
    if not quiet and r.returncode: print(out[-3000:])
    if check and r.returncode:
        if LOG: Path(LOG.name).with_name("FAILED.txt").write_text(f"exit {r.returncode}: {cmd}\n" + out[-3000:], encoding="utf-8")
        raise SystemExit(f"step failed (exit {r.returncode}): see the build log; the build folder is kept, marked FAILED.txt")
    return r

def fhash(p):
    """sha1 of a file; files over 64 MB are hashed on size + first and last 8 MB (marked q:)"""
    p = Path(p); n = p.stat().st_size; h = hashlib.sha1()
    with open(p, "rb") as f:
        if n <= 64 << 20:
            for b in iter(lambda: f.read(1 << 20), b""): h.update(b)
            return h.hexdigest()[:16]
        h.update(str(n).encode()); h.update(f.read(8 << 20)); f.seek(n - (8 << 20)); h.update(f.read(8 << 20))
        return "q:" + h.hexdigest()[:16]

def expand(pats):
    out = []
    for p in pats:
        q = p if os.path.isabs(p) or re.match(r"^[A-Za-z]:", p) else str(ROOT / p)
        out += sorted(glob.glob(q))
    return [Path(x) for x in out if Path(x).is_file()]

def hash_set(pats):
    return {str(p).replace("\\", "/").replace(str(ROOT).replace("\\", "/") + "/", ""): fhash(p) for p in expand(pats)}

def dir_sig(d):
    """a folder of frames: count + total size + newest mtime (hashing 10^4 PNGs every build is not worth it)"""
    fs = [x for x in Path(d).rglob("*") if x.is_file()]
    return {"files": len(fs), "bytes": sum(x.stat().st_size for x in fs), "newest": max((int(x.stat().st_mtime) for x in fs), default=0)}

# ---------------------------------------------------------------------------------------------------------------- prep
def prep(reel, mode, plan=False):
    R = REELS[reel]
    cache_p = ROOT / R["edit"] / "builds/prep_cache.json"
    cache = json.loads(cache_p.read_text()) if cache_p.exists() else {}
    report = []
    steps = R["prep"] + [(FLORA[0], FLORA[1].replace("<plate ids>", " ".join(R["plates"])), FLORA[2], FLORA[3] + [f"brand/remotion/public/flora/{p}/*0.png" for p in R["plates"]])]
    for name, cmd, ins, outs in steps:
        sig = hashlib.sha1(json.dumps([cmd, hash_set(ins)], sort_keys=True).encode()).hexdigest()[:16]
        have = all(expand([o]) for o in outs)
        prev = cache.get(name)
        runnable = "<" not in cmd and not cmd.startswith("restore")
        if mode == "skip": st = "skipped"
        elif mode == "force" and runnable: st = "run"
        elif not have: st = "run" if runnable else "MISSING (manual step)"
        elif prev is None: st = "adopted"          # first build: the assets on disk are the baseline
        elif prev == sig: st = "cached"
        else: st = "run" if runnable else "STALE (manual step)"
        report.append({"step": name, "status": st, "cmd": cmd, "inputs": len(expand(ins)), "sig": sig})
        say(f"  prep {name:13s} {st:9s} {cmd if plan or st == 'run' else ''}")
        if plan: continue
        if st == "run":
            run(cmd)
            sig = hashlib.sha1(json.dumps([cmd, hash_set(ins)], sort_keys=True).encode()).hexdigest()[:16]
        if st in ("run", "adopted", "cached"): cache[name] = sig
    if not plan:
        cache_p.parent.mkdir(parents=True, exist_ok=True)
        cache_p.write_text(json.dumps(cache, indent=1))
    bad = [r for r in report if r["status"].startswith(("MISSING", "STALE"))]
    return report, bad

# ---------------------------------------------------------------------------------------------------------------- render + master
def render(entry, comp, out, props_file, frames=None, conc=4, audio_only=False, scale=None):
    cmd = ["npx", "remotion", "render", entry, comp, str(out), f"--props={props_file}", "--log=error", f"--concurrency={conc}", "--timeout=240000"]  # a busy PC: the default 30 s frame timeout is too short
    if audio_only: cmd += ["--codec=wav"]
    else: cmd += ["--crf=16"]
    if frames: cmd += [f"--frames={frames[0]}-{frames[1]}"]
    if scale: cmd += [f"--scale={scale}"]
    run(subprocess.list2cmdline(cmd), cwd=REM)
    if not Path(out).exists(): raise SystemExit(f"render wrote nothing: {out}")

LIM = "aresample=192000,alimiter=limit=0.56:attack=1:release=60:level=false,aresample=48000,"  # 4x-oversampled peak limiter (undereye_master_v4.py master_lim)
def loud_measure(src, pre="", I=-14, TP=-1.5):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(src), "-af", f"{pre}loudnorm=I={I}:TP={TP}:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return json.loads(r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1])

def master(raw, dst, m, measure_from=None):
    """two-pass linear loudnorm (jan08_prep.py master); the picture is copied. measure_from = the whole reel's audio for a segment."""
    I, TP, pre = m.get("lufs", -14), m.get("tp", -1.5), LIM if m.get("limiter") else ""
    j = loud_measure(measure_from or raw, pre, I, TP)
    af = (f"{pre}loudnorm=I={I}:TP={TP}:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
          f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,aresample=48000")
    run(["ffmpeg", "-n", "-loglevel", "error", "-i", str(raw), "-c:v", "copy", "-af", af, "-c:a", "aac", "-b:a", "192k", str(dst)])
    return {"input_i": float(j["input_i"]), "input_tp": float(j["input_tp"]), "filter": af}

def ebur(src, ss=None, t=None):
    cmd = ["ffmpeg", "-hide_banner", "-nostats"] + (["-ss", str(ss)] if ss is not None else []) + (["-t", str(t)] if t is not None else []) + ["-i", str(src), "-filter_complex", "ebur128=peak=true", "-f", "null", "-"]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    tail = r[r.rindex("Summary:"):]
    return {"lufs": float(re.search(r"I:\s+(-?[\d.]+) LUFS", tail).group(1)), "true_peak": float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", tail).group(1))}

def probe(src):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate,nb_frames,pix_fmt:format=duration", "-of", "json", str(src)], capture_output=True, text=True)
    j = json.loads(r.stdout); s = j["streams"][0]
    return {"width": s["width"], "height": s["height"], "fps": s["r_frame_rate"], "frames": int(s.get("nb_frames", 0)), "pix_fmt": s["pix_fmt"], "duration": float(j["format"]["duration"])}

# ---------------------------------------------------------------------------------------------------------------- picture checks
def frame_rgb(src, n, size=None, fps=24):
    """frame n of a video as an RGB array: a plain ffmpeg decode (no tone map, no grade)"""
    import numpy as np
    w, h = size or (1080, 1920)
    r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{max(0, (n - 0.25) / fps):.5f}", "-i", str(src), "-vf", f"scale={w}:{h}", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True)
    if len(r.stdout) != w * h * 3: return None
    return np.frombuffer(r.stdout, np.uint8).reshape(h, w, 3).astype(np.int16)

def frames_rgb(src, start, count, step=1):
    """frames start, start+step, ... of a video (sequential decode from the start: exact frame numbers)"""
    import numpy as np
    r = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(src), "-vf", f"select=gte(n\\,{start})*not(mod(n-{start}\\,{step}))", "-vsync", "0", "-frames:v", str(count), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    n = 1080 * 1920 * 3
    while True:
        b = r.stdout.read(n)
        if len(b) < n: break
        yield np.frombuffer(b, np.uint8).reshape(1920, 1080, 3).astype(np.int16)
    r.stdout.close(); r.wait()

def colour_check(tl, P, raw, f0, f1, limit=2.0, want=6):
    """Raw footage only: on frames where the footage is full frame with no graphic over the measured region, the render must equal a
    plain ffmpeg decode of the same source frame (mean |difference| <= 2 levels over y 120-1440, the region no caption reaches).
    The source time is (round(in * 24) + (f - start) * rate) / 24 s; the best of that frame and its two neighbours counts."""
    import numpy as np
    B = [(b, T.resolve(b["start"], tl, P), T.resolve(b["end"], tl, P)) for b in tl["beats"]]
    busy = [(s - 12, e + 12) for b, s, e in B if b["lane"] in ("titles", "plates", "objects", "markup") or (b["lane"] == "footage" and not (b.get("source") or {}).get("clip"))]
    # full-frame stills or graphics that are still drawn in TSX (no beat yet): "checks": {"colour_skip": [[anchor, anchor], ...]}
    busy += [(T.resolve(a, tl, P) - 12, T.resolve(z, tl, P) + 12) for a, z in (tl.get("checks") or {}).get("colour_skip", [])]
    cands = []
    for b, s, e in B:
        src = b.get("source") or {}
        lay = b.get("layout") or {}
        if b["lane"] != "footage" or not src.get("clip") or src.get("in") is None: continue
        if lay.get("punch", 1) != 1 or lay.get("scale", 1) != 1: continue
        clip = PUB / src["clip"]
        if not clip.exists(): continue
        for f in range(max(s + 4, f0), min(e - 4, f1), 5):
            if any(a <= f < z for a, z in busy): continue
            if any(o is not b and o["lane"] == "footage" and (o.get("source") or {}).get("clip") and so <= f < eo and so > s for o, so, eo in B): continue  # b-roll laid over it
            cands.append((f, b["id"], clip, src, s))
    if not cands: return {"pass": None, "note": "no frame in this range shows full-frame footage without graphics"}
    picks = [cands[round(i * (len(cands) - 1) / max(1, want - 1))] for i in range(min(want, len(cands)))]
    rows, skipped = [], []
    for f, bid, clip, src, s in picks:
        pr = probe(clip)
        if (pr["width"], pr["height"]) != (1080, 1920): continue
        num, den = (int(x) for x in pr["fps"].split("/"))
        cf = int((round(src["in"] * 24) + (f - s) * float(src.get("rate", 1))) / 24 * (num / den) + 1e-6)  # Remotion seeks by time: the clip may not be 24 fps
        got = frame_rgb(raw, f - f0)
        if got is None: continue
        best = None
        for k in (cf - 1, cf, cf + 1):
            ref = frame_rgb(clip, k, fps=num / den)
            if ref is None: continue
            d = np.abs(got[120:1440] - ref[120:1440])
            m = float(d.mean())
            if best is None or m < best["mean_diff"]: best = {"frame": f, "beat": bid, "clip": src["clip"], "clip_frame": k, "mean_diff": round(m, 2), "mean_rgb_shift": [round(float(x), 2) for x in (got[120:1440] - ref[120:1440]).mean((0, 1))]}
        if not best: continue
        # a still image or a full-frame graphic is on screen, not this footage: the pictures do not correlate (a colour cast or a
        # tone map keeps the structure, r > 0.9). Skipped and listed, never counted as a colour failure.
        ref = frame_rgb(clip, best["clip_frame"], fps=num / den)
        ga, gb = got[120:1440:4, ::4].mean(2).ravel(), ref[120:1440:4, ::4].mean(2).ravel()
        best["correlation"] = round(float(np.corrcoef(ga, gb)[0, 1]), 3)
        (rows if best["correlation"] >= 0.8 else skipped).append(best)
    if not rows: return {"pass": None, "note": "no comparable frame", "skipped_not_footage": skipped}
    worst = max(r["mean_diff"] for r in rows)
    return {"pass": worst <= limit, "limit": limit, "worst_mean_diff": worst, "frames": rows, "skipped_not_footage": skipped}

def grey_frames(src, ss=None, t=None, step=1, w=270, h=480):
    """grey frames of a video at w x h (a plain decode), as one uint8 array [n, h, w]"""
    import numpy as np
    cmd = ["ffmpeg", "-v", "error"] + (["-ss", f"{ss:.5f}"] if ss else []) + (["-t", f"{t:.5f}"] if t else []) + ["-i", str(src), "-vf",
           (f"select=not(mod(n\\,{step}))," if step > 1 else "") + f"scale={w}:{h},format=gray", "-vsync", "0", "-f", "rawvideo", "-pix_fmt", "gray", "-"]
    b = subprocess.run(cmd, capture_output=True).stdout
    return np.frombuffer(b[: len(b) // (w * h) * (w * h)], np.uint8).reshape(-1, h, w)

def frozen_check(tl, P, raw, f0, f1, step=3, min_span=6):
    """A picture that stops while the footage should move (under-eye v5, f1579-1611: an RVM key layer outlived its webm, OffthreadVideo
    held its last frame, and the keyed figure froze over the moving footage for 1.4 s).
    For every footage beat with a clip: every `step`-th render frame's body region (the middle of the frame, above the captions) is
    matched against the source clip's frames from 2 s before the expected source time to just after it (zero-mean difference at
    270x480, through the beat's punch-in). The matched source time must advance with the composition. A stall = the best match stays on
    one source frame, clearly better than the expected frame, for >= `min_span` composition frames while the source itself moves.
    A cream-room takeover, a card or a still matches no source frame better than another, so it is not a stall."""
    import numpy as np
    W, H = 270, 480
    Y0, Y1, X0, X1 = int(H * 0.22), int(H * 0.78), int(W * 0.18), int(W * 0.82)
    B = [(b, T.resolve(b["start"], tl, P), T.resolve(b["end"], tl, P)) for b in tl["beats"]]
    R = grey_frames(raw, step=step)  # render sample i = render frame i * step = composition frame f0 + i * step
    zm = lambda a: a.astype(np.float32) - a.mean()
    stalls, pieces, samples = [], 0, 0
    for b, s, e in B:
        src, lay = b.get("source") or {}, b.get("layout") or {}
        if b["lane"] != "footage" or not src.get("clip") or src.get("in") is None: continue
        clip = PUB / src["clip"]
        a, z = max(s, f0), min(e, f1 + 1)
        if not clip.exists() or z - a < min_span + step: continue
        pr = probe(clip)
        if (pr["width"], pr["height"]) != (1080, 1920): continue
        num, den = (int(x) for x in pr["fps"].split("/")); cfps = num / den
        rate = float(src.get("rate", 1))
        t_of = lambda f: (round(src["in"] * 24) + (f - s) * rate) / 24  # the source time the composition shows at frame f
        t0 = max(0.0, t_of(a) - 2.0)
        S = grey_frames(clip, ss=t0, t=t_of(z) - t0 + 0.3)
        if len(S) < 4: continue
        k = float(lay.get("punch", lay.get("scale", 1)) or 1)
        if k != 1:  # the same punch-in the composition applies (Oct 14: punch about origin * frame; under-eye: scale about ox, oy)
            import cv2
            o = lay.get("origin")
            ox, oy = (o[0] * W, o[1] * H) if o else (lay.get("ox", 0.4 * 1080 if "punch" in lay else 540) / 4, lay.get("oy", 0.42 * 1920 if "punch" in lay else 960) / 4)
            M = np.float32([[k, 0, ox * (1 - k)], [0, k, oy * (1 - k)]])
            S = np.stack([cv2.warpAffine(x, M, (W, H)) for x in S])
        Sz = np.stack([zm(x[Y0:Y1, X0:X1]) for x in S])
        pieces += 1
        run = []
        def close():
            if len(run) >= 2 and run[-1][0] - run[0][0] + step >= min_span:
                stalls.append({"beat": b["id"], "clip": src["clip"], "frames": [run[0][0], run[-1][0] + step - 1], "seconds": [round(run[0][0] / 24, 2), round((run[-1][0] + step) / 24, 2)],
                               "held_source_s": round(t0 + run[0][1] / cfps, 2), "behind_by_s": round((run[-1][2] - run[-1][1]) / cfps, 2),
                               "confidence": "high" if len(run) >= 4 else "low: 2-3 samples, confirm by eye"})
            run.clear()
        first = a + (-(a - f0)) % step
        for f in range(first, z, step):
            i = (f - f0) // step
            if i >= len(R): break
            ex = int((t_of(f) - t0) * cfps + 1e-6)
            if ex >= len(Sz): break
            lo = max(0, ex - int(2 * cfps))
            r = zm(R[i][Y0:Y1, X0:X1])
            d = np.abs(Sz[lo:min(len(Sz), ex + 3)] - r).mean((1, 2))
            m = lo + int(d.argmin()); d_m, d_ex = float(d.min()), float(d[ex - lo])
            samples += 1
            moving = float(np.abs(Sz[ex] - Sz[max(0, ex - int(cfps * min_span / 24))]).mean()) > 1.5  # the source itself changes over the span
            behind = ex - m >= 3 and d_m < 0.7 * d_ex and d_ex - d_m > 1.0 and moving
            if behind and (not run or abs(m - run[0][1]) <= 1): run.append((f, m, ex))
            else:
                close()
                if behind: run.append((f, m, ex))
        close()
    if not pieces: return {"pass": None, "note": "no footage beat with a 1080x1920 clip in this range"}
    return {"pass": not stalls, "footage_beats": pieces, "frames_sampled": samples, "step": step, "min_span_frames": min_span, "stalls": stalls}

def tonemap_lint(tl):
    """every <OffthreadVideo> in the reel's own sources (and the shared flora/timeline folders) must carry toneMapped={false}"""
    reel = tl["reel"]
    bad, total = [], 0
    for p in sorted((REM / "src" / reel).glob("*.tsx")) + sorted((REM / "src/flora").glob("*.tsx")):
        s = p.read_text(encoding="utf-8")
        for m in re.finditer(r"<OffthreadVideo\b[^>]*?/?>", s, re.S):
            total += 1
            if "toneMapped={false}" not in m.group(0): bad.append(f"{p.name}:{s[:m.start()].count(chr(10)) + 1}")
    comp_file = re.sub(r"^(Jan08|Oct14|Undereye)", "", tl["comp"]["id"])
    mine = [b for b in bad if b.startswith(comp_file + ".tsx")]
    return {"pass": not mine, "comp_file": comp_file + ".tsx", "missing_in_comp_file": mine, "missing_in_reel_folder": len(bad), "tags_in_reel_folder": total,
            "note": "pass = the composition's own file is clean; older delivered files in the folder predate the rule and are not edited"}

def compare(a, b, frames=None, offset=0, step=6):
    """picture: mean |a - b| per sampled frame (frame i of a vs frame i + offset of b); loudness of both over the same span"""
    import numpy as np
    pa = probe(a)
    f0, f1 = frames or (0, pa["frames"] - 1)
    n = (f1 - f0) // step + 1
    ga, gb = frames_rgb(a, 0 if frames else f0, n, step), frames_rgb(b, f0 + offset, n, step)
    ds, ps = [], []
    for x, y in zip(ga, gb):
        d = np.abs(x - y); ds.append(float(d.mean())); mse = float((d.astype(np.float64) ** 2).mean()); ps.append(99.0 if mse == 0 else 10 * np.log10(255 ** 2 / mse))
    la = ebur(a)
    lb = ebur(b, ss=(f0 + offset) / 24, t=(f1 - f0 + 1) / 24) if frames else ebur(b)
    return {"frames_compared": len(ds), "step": step, "range_in_b": [f0 + offset, f1 + offset], "mean_abs_diff": round(float(np.mean(ds)), 3), "max_frame_mean_abs_diff": round(float(np.max(ds)), 3),
            "psnr_db_mean": round(float(np.mean(ps)), 2), "psnr_db_min": round(float(np.min(ps)), 2), "loudness_a": la, "loudness_b_same_span": lb,
            "lufs_diff": round(la["lufs"] - lb["lufs"], 2), "true_peak_diff": round(la["true_peak"] - lb["true_peak"], 2)}

# ---------------------------------------------------------------------------------------------------------------- build
def new_dir(base, name):
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    for i in range(100):
        d = base / (f"{name}__{stamp}" + (f"-{i + 1}" if i else ""))
        try: d.mkdir(parents=True, exist_ok=False); return d
        except FileExistsError: continue
    raise SystemExit("could not make a new build folder")

def build(a):
    global LOG
    reel = a.reel; R = REELS[reel]
    tl_path = T.path_for(reel, a.version)
    tl = T.load(tl_path)
    version = a.version or tl["version"]
    if a.version and tl["version"] != a.version and tl_path.name == f"{reel}.json":
        raise SystemExit(f"timelines/{reel}.json is version {tl['version']}, and there is no frozen timelines/{reel}.{a.version}.json")
    P = T.transcript(tl)
    total = P["durationInFrames"] + {"jan08": P.get("tail", 0), "oct14": P.get("tail", 0), "undereye": 72}[reel]
    frames = tuple(int(x) for x in a.frames.split("-")) if a.frames else None
    errs = T.validate(tl, P)
    hard = [e for e in errs if ": note:" not in e]
    print(f"{reel} {version}: {tl_path.name}, {len(tl['beats'])} beats, comp {tl['comp']['id']}, {total} frames" + (f", segment {frames[0]}-{frames[1]}" if frames else ""))
    if a.plan:
        prep(reel, a.prep, plan=True)
        print("  render  npx remotion render", tl["comp"]["entry"], tl["comp"]["id"], "<build>/raw.mp4 --props=<build>/props.json --log=error --concurrency=%d --crf=16 --timeout=240000" % a.concurrency)
        print("  master  two-pass linear loudnorm", tl.get("master"))
        print("  checks  timeline, format, loudness, colour, frozen picture, toneMapped lint" + (", face_clear" if a.face_clear else ""), "| by hand:", "; ".join(R["more_checks"]))
        for e in errs: print("  timeline:", e)
        return 0
    if hard: raise SystemExit("timeline errors:\n  " + "\n  ".join(hard))
    out = new_dir(ROOT / R["edit"] / "builds", f"{reel}_{version}" + (f"_f{frames[0]}-{frames[1]}" if frames else ""))
    LOG = open(out / "build.log", "w", encoding="utf-8")
    say(f"build {out}")
    t0 = time.time()
    if a.hdr: return build_hdr(a, reel, R, tl, tl_path, P, total, frames, out, version, errs, t0)
    man = {"reel": reel, "version": version, "built": datetime.datetime.now().isoformat(timespec="seconds"), "timeline_file": str(tl_path.relative_to(ROOT)).replace("\\", "/"),
           "comp": tl["comp"], "frames": list(frames) if frames else [0, total - 1], "segment": bool(frames), "notes": [e for e in errs if ": note:" in e]}
    # 1 prep
    man["prep"], bad = prep(reel, a.prep)
    if bad: say("  prep: manual steps need attention:", ", ".join(r["step"] for r in bad))
    # 2 inputs
    shutil.copy2(tl_path, out / "timeline.json")
    props = {**(tl["comp"].get("props") or {}), "timeline": tl}
    (out / "props.json").write_text(json.dumps(props), encoding="utf-8")
    src_files = [f"brand/remotion/src/{reel}/*", "brand/remotion/src/timeline/*", "brand/remotion/src/flora/*", "brand/remotion/src/components/*", "brand/remotion/src/devices/*", "brand/remotion/src/*.ts*", "brand/remotion/remotion.config.ts", "brand/remotion/package.json"]
    man["inputs"] = {"timeline": fhash(tl_path), "transcript": {tl["transcript"]: fhash(REM / tl["transcript"])}, "source": hash_set(src_files),
                     "public": hash_set([f"brand/remotion/public/{R['pub']}/*", f"brand/remotion/public/{R['pub']}/clinic/*", f"brand/remotion/public/{R['pub']}/clinic/web/*", "brand/remotion/public/flora/frames.json", "brand/remotion/public/sfx/*"]),
                     "plates": {p: dir_sig(PUB / "flora" / p) for p in R["plates"] if (PUB / "flora" / p).exists()},
                     "git": subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True).stdout.strip()}
    # 3 render
    raw = out / "raw.mp4"
    render(tl["comp"]["entry"], tl["comp"]["id"], raw, out / "props.json", frames, a.concurrency)
    full_audio = None
    if frames:
        full_audio = out / "audio_full.wav"
        render(tl["comp"]["entry"], tl["comp"]["id"], full_audio, out / "props.json", None, a.concurrency, audio_only=True)
    man["render_s"] = round(time.time() - t0, 1)
    # 4 master
    final = out / f"{reel}_{version}.mp4"
    man["master"] = {**(tl.get("master") or {}), **master(raw, final, tl.get("master") or {}, full_audio)}
    # 5 checks
    C = man["checks"] = {}
    C["timeline"] = {"pass": not hard, "beats": len(tl["beats"]), "notes": len(errs)}
    pr = probe(final)
    want = (frames[1] - frames[0] + 1) if frames else total
    C["format"] = {"pass": (pr["width"], pr["height"], pr["fps"]) == (1080, 1920, "24/1") and pr["frames"] == want, **pr, "frames_expected": want}
    lo = ebur(final)
    if frames:
        whole = out / "audio_full_mastered.wav"
        subprocess.run(["ffmpeg", "-n", "-loglevel", "error", "-i", str(full_audio), "-af", man["master"]["filter"], str(whole)], check=True)
        lw = ebur(whole)
        C["loudness"] = {"pass": abs(lw["lufs"] + 14) <= 0.5 and lw["true_peak"] <= -1.0, "whole_reel_audio": lw, "this_segment": lo, "note": "the gain is measured on the whole reel's audio; pass/fail is on the whole reel"}
    else:
        C["loudness"] = {"pass": abs(lo["lufs"] + 14) <= 0.5 and lo["true_peak"] <= -1.0, **lo}
    C["colour"] = colour_check(tl, P, raw, frames[0] if frames else 0, (frames[1] if frames else total - 1))
    C["frozen_picture"] = frozen_check(tl, P, raw, frames[0] if frames else 0, (frames[1] if frames else total - 1))
    C["tonemap_lint"] = tonemap_lint(tl)
    if a.face_clear: C["face_clear"] = face_clear(reel, tl, out, final, frames, a.concurrency, version)
    if a.compare:
        cmpd = compare(final, a.compare, frames)
        C["matches_delivered"] = {"pass": cmpd["mean_abs_diff"] <= 2.0 and abs(cmpd["lufs_diff"]) <= 0.3, "file": a.compare, **cmpd}
    man["total_s"] = round(time.time() - t0, 1)
    man["output"] = str(final.relative_to(ROOT)).replace("\\", "/")
    (out / "manifest.json").write_text(json.dumps(man, indent=1, ensure_ascii=False), encoding="utf-8")
    say("")
    for k, v in C.items():
        say(f"  {k:18s} {'PASS' if v.get('pass') else ('n/a ' if v.get('pass') is None else 'FAIL')}  " + json.dumps({q: w for q, w in v.items() if q not in ('pass', 'frames', 'note', 'filter') and not isinstance(w, (dict, list))}) + ("  stalls: " + json.dumps(v["stalls"]) if v.get("stalls") else ""))
    say(f"master   {final}\nmanifest {out / 'manifest.json'}   ({man['total_s']} s)")
    fails = [k for k, v in C.items() if v.get("pass") is False]
    return 1 if fails else 0

def build_hdr(a, reel, R, tl, tl_path, P, total, frames, out, version, errs, t0):
    """--hdr: the 10-bit HLG master with the footage cut from the original camera files (brand/scripts/reel_hdr.py)"""
    import reel_hdr
    if a.comp: tl = {**tl, "comp": {**tl["comp"], "id": a.comp}}  # e.g. Oct14ReelV6b while timelines/oct14.json still names Oct14ReelV6
    if not a.audio:  # the existing delivered master's sound, unchanged
        hit = sorted(q for q in (ROOT / R["edit"]).glob(f"*{version}.mp4") if "raw" not in q.name.lower() and "hdr" not in q.name.lower() and q.name[-len(version) - 5] in "_ ")
        a.audio = str(hit[0]) if hit else None
    def render_cmd(entry, comp, d, props_file, fr, conc):
        return subprocess.list2cmdline(["npx", "remotion", "render", entry, comp, str(d), f"--props={props_file}", "--sequence", "--image-format=png", "--log=error",
                                        f"--concurrency={conc}", "--timeout=240000", f"--frames={fr[0]}-{fr[1]}"])
    shutil.copy2(tl_path, out / "timeline.json")
    f0, f1 = frames or (0, total - 1)
    man = {"reel": reel, "version": version, "built": datetime.datetime.now().isoformat(timespec="seconds"), "timeline_file": str(tl_path.relative_to(ROOT)).replace("\\", "/"),
           "comp": tl["comp"], "frames": [f0, f1], "segment": bool(frames), "notes": [e for e in errs if ": note:" in e]}
    more, final = reel_hdr.build(a, reel, R, tl, P, total, frames, out, run, say, render_cmd, lambda f: frozen_check(tl, P, f, f0, f1))
    man.update(more)
    C = man["checks"]
    pr = probe(final)
    C["format"] = {"pass": (pr["width"], pr["height"], pr["fps"]) == (1080, 1920, "24/1") and pr["frames"] == f1 - f0 + 1, **pr, "frames_expected": f1 - f0 + 1}
    if a.audio: C["audio_unchanged"] = audio_same(final, a.audio, f0 / 24 if frames else 0, (f1 - f0 + 1) / 24)
    if a.audio and not frames:  # the whole picture against the delivered SDR master: same layers, same frames, nothing blurred
        C["picture_vs_delivered"] = reel_hdr.against_delivered(final, a.audio)
    if a.name:  # a copy beside the delivered masters, under the given name; an existing file is never overwritten
        dst = ROOT / R["edit"] / a.name
        if [k for k, v in C.items() if v.get("pass") is False]: dst = dst.with_name(f"{dst.stem} (FAILED){dst.suffix}")  # a failed build is never delivered under the clean name
        if dst.exists(): dst = dst.with_name(f"{dst.stem} ({out.name.split('__')[-1]}){dst.suffix}")
        shutil.copy2(final, dst); man["delivered_copy"] = str(dst.relative_to(ROOT)).replace("\\", "/")
    man["total_s"] = round(time.time() - t0, 1)
    (out / "manifest.json").write_text(json.dumps(man, indent=1, ensure_ascii=False), encoding="utf-8")
    say("")
    for k, v in C.items():
        say(f"  {k:20s} {'PASS' if v.get('pass') else ('n/a ' if v.get('pass') is None else 'FAIL')}  " + json.dumps({q: w for q, w in v.items() if q not in ('pass', 'frames', 'note') and not isinstance(w, (dict, list))}) + ("  stalls: " + json.dumps(v["stalls"]) if v.get("stalls") else ""))
    say(f"master   {final}\nmanifest {out / 'manifest.json'}   ({man['total_s']} s)")
    return 1 if [k for k, v in C.items() if v.get("pass") is False] else 0

def audio_same(final, src, ss, t):
    """the HDR master's sound is the existing master's, stream-copied: decode both and compare the samples"""
    import numpy as np
    def pcm(p, pre):
        return np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", *pre, "-i", str(p), "-vn", "-ac", "2", "-ar", "48000", "-f", "s16le", "-"], capture_output=True).stdout, "<i2").astype(np.int32).reshape(-1, 2)
    x, y = pcm(final, []), pcm(src, ["-ss", f"{ss:.5f}", "-t", f"{t:.5f}"])
    n = min(len(x), len(y)) - 4096
    if n < 24000: return {"pass": False, "note": "no audio to compare"}
    # a segment's copy starts on an AAC packet (1024 samples), so the same samples may sit up to 2 packets later in the copy
    d = {k: float(np.abs(x[k: k + n] - y[:n]).mean()) for k in (range(0, 2049) if ss else [0])}
    k = min(d, key=d.get)
    level = float(np.abs(y[:n]).mean()) or 1.0
    # whole reel: the stream is copied whole, so the samples are identical. A segment's copy starts mid-stream on an AAC packet: the decoder
    # has no history there, so the samples are near, not identical; that is reported, not passed
    ok = True if d[k] <= 1.0 else (None if ss and d[k] / level <= 0.02 else False)
    return {"pass": ok, "source": str(src), "mean_abs_sample_diff_16bit": round(d[k], 3), "relative_to_signal": round(d[k] / level, 4), "offset_samples": k, "samples": n}

def face_clear(reel, tl, out, final, frames, conc, version):
    FC = REELS[reel]["face_clear"]
    paths = {"out": str(out / "face_clear.json"), "version": version, "final": str(final), "faces": str(out / "faces.json"), "props": str(REM / tl["transcript"])}
    for name, extra in FC["renders"].items():
        if extra is None: continue
        pf = out / f"props_{name}.json"
        pf.write_text(json.dumps({**(tl["comp"].get("props") or {}), "timeline": tl, **extra}), encoding="utf-8")
        paths[name] = str(out / f"{name}.mp4")
        render(tl["comp"]["entry"], tl["comp"]["id"], paths[name], pf, frames, conc, scale=FC.get("scale"))
    r = run(FC["cmd"].format(**paths), check=False)
    try:
        j = json.loads(Path(paths["out"]).read_text())
        bad = j.get("violating_frames", j.get("fail_frames", j.get("failed", j.get("violations"))))
        n = len(bad) if isinstance(bad, list) else bad
        return {"pass": n == 0 if n is not None else None, "failing_frames": n, "report": paths["out"], "segment_note": "frame numbers are relative to the segment" if frames else None}
    except Exception as e:
        return {"pass": None, "note": f"face_clear did not produce a readable report ({e}); exit {r.returncode}"}

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "compare":
        ap = argparse.ArgumentParser(); ap.add_argument("cmd"); ap.add_argument("a"); ap.add_argument("b"); ap.add_argument("--frames"); ap.add_argument("--offset", type=int, default=0); ap.add_argument("--step", type=int, default=6)
        q = ap.parse_args()
        print(json.dumps(compare(q.a, q.b, tuple(int(x) for x in q.frames.split("-")) if q.frames else None, q.offset, q.step), indent=1)); sys.exit(0)
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("reel", choices=sorted(REELS)); ap.add_argument("--version"); ap.add_argument("--frames"); ap.add_argument("--prep", choices=["auto", "skip", "force"], default="auto")
    ap.add_argument("--plan", action="store_true"); ap.add_argument("--face-clear", action="store_true"); ap.add_argument("--compare"); ap.add_argument("--concurrency", type=int, default=4)
    ap.add_argument("--hdr", action="store_true", help="10-bit HEVC HLG master, footage cut from the original camera files (reel_hdr.py)")
    ap.add_argument("--audio", help="--hdr: the existing master whose audio is copied (default: the delivered <edit>/*_<version>.mp4)")
    ap.add_argument("--passes", help="--hdr: graphics passes to render (default under,matte,over,media)"); ap.add_argument("--crf", type=int, default=8, help="--hdr: x265 crf (8 keeps the footage within 2 ten-bit codes of the original on the noisiest clip; 14 measured 1.7-2.7)"); ap.add_argument("--keep", action="store_true", help="--hdr: keep the intermediate passes")
    ap.add_argument("--threads", type=int, help="--hdr: limit the composite's filter and x265 threads (less memory)")
    ap.add_argument("--recut", action="store_true", help="--hdr --reuse: cut the footage again from the originals, reuse only the rendered passes")
    ap.add_argument("--reuse", help="--hdr: composite again from this build folder's kept intermediates (--keep), without cutting or rendering")
    ap.add_argument("--name", help="--hdr: also copy the master into the edit folder under this file name")
    ap.add_argument("--comp", help="--hdr: composition id to render the passes from, when it is not the timeline's (it must take the `pass` prop)")
    sys.exit(build(ap.parse_args()))
