"""Oct 14 injection reel: pick the clips, transcribe them locally, transcode them, and build the reel's props.

NOT FOR POSTING until patient consent = yes. Source: C:/Users/naimj/clinic-library/tmp/oct14/ (the user's phone copy). The script reads
that folder and writes only its own transcripts there. iCloud is never called.

  PY=C:/Users/naimj/tools/style-venv/Scripts/python.exe
  $PY -I brand/scripts/oct14_prep.py select      # ffprobe com.apple.quicktime.creationdate (NOT the file time) -> clips.json
  $PY -I brand/scripts/oct14_prep.py transcribe  # clinic-library transcribe.py (local faster-whisper) per clip -> <clip>.MOV.txt
  $PY -I brand/scripts/oct14_prep.py words       # local faster-whisper (GPU) word timings -> words_<role>.json (name redacted on read)
  $PY -I brand/scripts/oct14_prep.py transcode   # -> brand/remotion/public/oct14/<role>.mp4 (H.264, 1080x1920, 24 fps, rotation applied)
  $PY -I brand/scripts/oct14_prep.py props       # research/ostad/style/oct14/cut.json + words -> public/oct14/props.json

Roles: "intro" = the clip created at 4:44 PM; "after" = the clip created at 4:55 PM; "inj1".."injN" = the clips created between them,
in creation order. Photos in the folder are listed but not used.

PRIVACY (clinic rule). The patient's name is never written by this script.
- It is found at run time from the intro's transcript: the word(s) after "patient" in the opening line.
- Every word that matches it (fuzzy ratio >= 0.75), and every word in NAMES_EXTRA, becomes "[name]" before anything is stored.
- A cut piece that would contain a "[name]" word raises an error.
- Outputs hold only redacted words, and all of them stay in gitignored folders.
"""
import datetime as dt, difflib, json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = Path("C:/Users/naimj/clinic-library/tmp/oct14")
LIB_PY = Path("C:/Users/naimj/clinic-library/.venv/Scripts/python.exe")
TRANSCRIBE = Path("C:/Users/naimj/clinic-library/transcribe.py")
EDIT = ROOT / "brand/edits/oct14-injection"
PUB = ROOT / "brand/remotion/public/oct14"
CUT = ROOT / "research/ostad/style/oct14/cut.json"
VIDEO = {".mov", ".mp4", ".m4v"}
PHOTO = {".heic", ".jpg", ".jpeg", ".png"}
NAMES_EXTRA: set[str] = set()  # filled from EDIT/names.local.json (gitignored) if a name needs adding by hand; never in code
FPS = 24

norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())


def probe(f: Path) -> dict:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:format_tags:stream=codec_type,width,height,r_frame_rate:stream_tags=rotate:stream_side_data=rotation",
                        "-of", "json", str(f)], capture_output=True, text=True, check=True)
    j = json.loads(r.stdout)
    tags = {k.lower(): v for k, v in (j.get("format", {}).get("tags") or {}).items()}
    v = next((s for s in j.get("streams", []) if s.get("codec_type") == "video"), {})
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(float(sd["rotation"]))
    if "rotate" in (v.get("tags") or {}):
        rot = int(v["tags"]["rotate"])
    w, h = v.get("width", 0), v.get("height", 0)
    if abs(rot) % 180 == 90:
        w, h = h, w
    return {"creation": tags.get("com.apple.quicktime.creationdate"), "creation_fallback": tags.get("creation_time"), "duration": float(j["format"]["duration"]),
            "w": w, "h": h, "rotation": rot, "fps": v.get("r_frame_rate"), "audio": any(s.get("codec_type") == "audio" for s in j.get("streams", []))}


def local_time(s: str | None):
    if not s:
        return None
    t = dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
    return t  # com.apple.quicktime.creationdate carries the phone's own offset (local wall clock), e.g. 2026-10-14T16:44:12-0400


def select():
    if SRC == Path("C:/Users/naimj/clinic-library/tmp/oct14") and not (SRC / "_COMPLETE.txt").exists():
        raise SystemExit("tmp/oct14/_COMPLETE.txt is missing: the download is not finished, so no MOV is read yet")
    vids, photos = [], []
    for f in sorted(SRC.rglob("*")):
        if f.suffix.lower() in VIDEO:
            vids.append({"file": str(f), "name": f.name, **probe(f)})
        elif f.suffix.lower() in PHOTO:
            photos.append(f.name)
    for v in vids:
        t = local_time(v["creation"])
        v["local"] = t.strftime("%Y-%m-%d %H:%M:%S %z") if t else None
        v["hm"] = t.strftime("%H:%M") if t else None
        v["source_of_time"] = "com.apple.quicktime.creationdate" if v["creation"] else "MISSING (not using the file time)"
    timed = sorted([v for v in vids if v["creation"]], key=lambda v: local_time(v["creation"]))
    # several clips can share a minute (16:55:43 and 16:55:44): take the longest one with audio, and confirm it from its transcript
    # and its picture before it is used (DECISIONS 16)
    best = lambda hm: max((v for v in timed if v["hm"] == hm), key=lambda v: (v["audio"], v["duration"]), default=None)
    intro, after = best("16:44"), best("16:55")
    roles = {}
    if intro:
        roles["intro"] = intro["name"]
    if after:
        roles["after"] = after["name"]
    if intro and after:
        mids = [v for v in timed if local_time(intro["creation"]) < local_time(v["creation"]) < local_time(after["creation"]) and v["duration"] >= 2.0]  # < 2 s = an accidental tap
        for i, v in enumerate(mids, 1):
            roles[f"inj{i}"] = v["name"]
    out = {"clips": vids, "photos": photos, "roles": roles,
           "rule": "intro = created 16:44, after = created 16:55, inj = created between them, in order (com.apple.quicktime.creationdate)"}
    EDIT.mkdir(parents=True, exist_ok=True)
    (EDIT / "clips.json").write_text(json.dumps(out, indent=1))
    for v in timed:
        print(f'{v["local"]}  {v["name"]:<16} {v["duration"]:7.2f}s {v["w"]}x{v["h"]} rot {v["rotation"]}  audio={v["audio"]}')
    for v in vids:
        if not v["creation"]:
            print("NO creationdate:", v["name"], "(file time not used)")
    print("roles:", roles, "| photos:", len(photos))
    return out


def clips():
    return json.loads((EDIT / "clips.json").read_text())


def transcribe():
    c = clips()
    files = [str(SRC / n) for n in c["roles"].values()]
    subprocess.run([str(LIB_PY), str(TRANSCRIBE), *files], check=True)


def secret_names() -> set[str]:
    """the patient's name from the intro transcript: word(s) after 'patient' in the opening line; never printed or written"""
    names = set(NAMES_EXTRA)
    extra = EDIT / "names.local.json"
    if extra.exists():
        names |= {norm(x) for x in json.loads(extra.read_text())}
    c = clips()
    tr = (SRC / (c["roles"]["intro"] + ".txt"))
    if tr.exists():
        txt = tr.read_text(encoding="utf-8")
        for m in re.finditer(r"patient[,.]?\s+([A-Z][a-z]+)", txt):
            w = m.group(1)
            if norm(w) not in {"she", "who", "her", "and", "is", "has", "we", "today", "here", "that", "the"}:
                names.add(norm(w))
    return {n for n in names if n}


def redact(words, secrets):
    out = []
    for w in words:
        n = norm(w["w"])
        hit = n and any(difflib.SequenceMatcher(None, n, s).ratio() >= 0.75 for s in secrets)
        out.append({**w, "w": "[name]", "redacted": True} if hit else w)
    return out


def model():
    """the clinic pipeline's own local model (clinic-library/scripts/preview.py whisper(): medium on the GPU, read-only import) when run
    with the clinic venv; otherwise faster-whisper medium on the CPU. Both are local: nothing leaves this PC."""
    import os
    for sub in ("cublas", "cudnn"):  # the CUDA runtime DLLs the clinic venv ships, so the style venv can use the GPU too (read-only)
        d = f"C:/Users/naimj/clinic-library/.venv/Lib/site-packages/nvidia/{sub}/bin"
        if os.path.isdir(d):
            os.add_dll_directory(d)
            os.environ["PATH"] = d + os.pathsep + os.environ["PATH"]
    try:
        sys.path.insert(0, "C:/Users/naimj/clinic-library/scripts")
        from preview import whisper  # noqa: E402
        return whisper()
    except Exception:  # noqa: BLE001
        from faster_whisper import WhisperModel
        return WhisperModel("medium", device="cpu", compute_type="int8")


def audio16k(path):
    """the clip's first audio track as 16 kHz mono float32 (decoded by ffmpeg, as clinic-library transcribe.py does; the PyAV path fails here)"""
    import numpy as np
    pcm = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(path), "-map", "0:a:0", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                         capture_output=True).stdout
    return np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0


def words():
    c = clips()
    secrets = secret_names()
    print(f"name tokens to redact: {len(secrets)} (not shown)")
    model_ = model()
    for role, name in c["roles"].items():
        segs, _ = model_.transcribe(audio16k(SRC / name), language="en", word_timestamps=True, vad_filter=False, beam_size=5)
        ws = [{"w": w.word.strip(), "t0": round(w.start, 3), "t1": round(w.end, 3), "p": round(w.probability, 3)} for s in segs for w in (s.words or [])]
        ws = redact(ws, secrets)
        (EDIT / f"words_{role}.json").write_text(json.dumps(ws))
        print(role, len(ws), "words,", sum(1 for w in ws if w.get("redacted")), "redacted")


def transcode():
    c = clips()
    PUB.mkdir(parents=True, exist_ok=True)
    for role, name in c["roles"].items():
        v = next(x for x in c["clips"] if x["name"] == name)
        vf = f"scale=1080:-2,fps={FPS}" if v["w"] <= v["h"] else f"scale=-2:1080,fps={FPS}"  # portrait -> 1080 wide; landscape -> 1080 high (covered in the comp)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(SRC / name), "-vf", vf, "-c:v", "libx264", "-crf", "17", "-preset", "medium",
                        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", str(PUB / f"{role}.mp4")], check=True)
        print("transcoded", role)


# caption spelling for the product names he says (whisper hears them several ways); the label is never readable, he says them
SPELL = {"eboli's": "Evolysse", "evolice": "Evolysse", "everly's": "Evolysse", "evelise": "Evolysse", "form": "Form"}


def fix(w, prev):
    k = re.sub(r"[^a-z']", "", w.lower())
    if k in ("eboli's", "evolice", "everly's", "evelise"):
        return re.sub(r"[A-Za-z']+", SPELL[k], w)
    if k == "form" and prev and "Evolysse" in prev:
        return w.replace("form", "Form")
    return w


def audio():
    """v2: the voice track as ONE file (public/oct14/mix.wav), so every cut gets a 15 ms crossfade (Remotion can only fade per
    frame = 42 ms). Each piece: its clip's audio from..to, sped up (atempo, pitch kept), padded or trimmed to its exact frame length,
    a 15 ms fade in and out; consecutive pieces of one continuous span (audioJoin) join without a fade. The fades overlap the
    neighbouring piece by 7.5 ms each side (acrossfade would shift the frame grid, so a fade-out + fade-in on the frame line is used)."""
    pr = json.loads((PUB / "props.json").read_text())
    sp, segs = pr["speed"], []
    pcs = pr["pieces"]
    for i, p in enumerate(pcs):
        d = p["dur"] / FPS
        fin = 0 if p.get("audioJoin") else 0.015
        fout = 0 if i + 1 < len(pcs) and pcs[i + 1].get("audioJoin") else 0.015
        f = f"atrim={p['from']}:{p['to']},asetpts=PTS-STARTPTS,atempo={sp},aresample=48000,apad,atrim=0:{d:.6f}"
        if fin:
            f += f",afade=t=in:st=0:d={fin}"
        if fout:
            f += f",afade=t=out:st={d - fout:.6f}:d={fout}"
        segs.append((p["role"], f))
    roles = sorted({r for r, _ in segs})
    args = ["ffmpeg", "-y", "-loglevel", "error"]
    for r in roles:
        args += ["-i", str(PUB / f"{r}.mp4")]
    fc = ";".join(f"[{roles.index(r)}:a]{f},aformat=channel_layouts=stereo[a{i}]" for i, (r, f) in enumerate(segs))
    fc += ";" + "".join(f"[a{i}]" for i in range(len(segs))) + f"concat=n={len(segs)}:v=0:a=1[out]"
    args += ["-filter_complex", fc, "-map", "[out]", "-c:a", "pcm_s16le", str(PUB / "mix.wav")]
    subprocess.run(args, check=True)
    print("mix.wav", len(segs), "pieces")


def props():
    """cut.json -> public/oct14/props.json. Pieces carry raw seconds of their audio clip (role) and of the picture under them
    (pictureRole / pictureFrom). Cues: {name: [pieceId, roleWordIndex, offsetFrames?]} -> the composition frame of that word's onset."""
    cut = json.loads(CUT.read_text(encoding="utf-8"))
    sp = cut["speed"]
    W = {r: json.loads((EDIT / f"words_{r}.json").read_text()) for r in {p["role"] for p in cut["pieces"]}}
    at, pieces, out_words = 0, [], []
    for p in cut["pieces"]:
        # a word belongs to the piece whose span holds its midpoint (whisper's word edges are loose; the cut itself sits in measured silence)
        ws = [w for w in W[p["role"]] if p["from"] <= (w["t0"] + w["t1"]) / 2 < p["to"]]
        if any(w.get("redacted") for w in ws):
            raise SystemExit(f"piece {p['id']} contains a redacted name word: move its bounds")
        dur = round((p["to"] - p["from"]) / sp * FPS)
        pieces.append({**p, "at": at, "dur": dur})
        prev = ""
        for w in ws:
            t = fix(w["w"], prev)
            prev = t
            out_words.append({"w": t, "f": at + round((w["t0"] - p["from"]) / sp * FPS), "f1": at + round((w["t1"] - p["from"]) / sp * FPS), "piece": p["id"]})
        at += dur
    cues = {}
    for k, v in cut.get("cues", {}).items():
        if isinstance(v, (int, float)):
            cues[k] = int(v)
            continue
        # v[0] is a LINE id; the word lands in whichever of that line's pieces covers it (micro-cuts split lines into pieces)
        line = [p for p in pieces if p.get("line", p["id"]) == v[0]]
        t0 = W[line[0]["role"]][v[1]]["t0"]
        pc = next((p for p in line if p["from"] - 0.03 <= t0 < p["to"]), None)
        if pc is None:
            raise SystemExit(f"cue {k}: word {v[1]} of {v[0]} was cut out")
        cues[k] = pc["at"] + round((t0 - pc["from"]) / sp * FPS) + (v[2] if len(v) > 2 else 0)
    for p in pieces:  # every line's start and end (first piece's start, last piece's end) as cues too
        ln = p.get("line", p["id"])
        cues.setdefault("start:" + ln, p["at"])
        cues["end:" + ln] = p["at"] + p["dur"]
    tr = json.loads((EDIT / "tracks.json").read_text()) if (EDIT / "tracks.json").exists() else {}
    res = {"fps": FPS, "speed": sp, "durationInFrames": at, "pieces": pieces, "words": out_words, "cues": cues,
           "pips": cut.get("pips", []), "title": cut.get("title"), "hideCaps": cut.get("hideCaps", []), "sfx": cut.get("sfx", []), "tail": cut.get("tail", 72),
           "beats": cut.get("beats", {}), "surgeon": cut.get("surgeon"), "tracks": {r: tr[r] for r in tr if r in {p["pictureRole"] for p in pieces}}}
    if cut.get("ba") and (EDIT / "pair.json").exists():
        pair = json.loads((EDIT / "pair.json").read_text())
        res["ba"] = {**cut["ba"], "iw": pair["w"], "ih": pair["h"], "pts": pair["pts_before"]}
    cm = ROOT / "research/ostad/style/oct14/contour_measure.json"
    if res.get("surgeon") and cm.exists():  # the measured cheek shadow line, before vs after (oct14_contour.py)
        c = json.loads(cm.read_text())
        if c.get("drawn"):
            res["surgeon"]["contour"] = {"before": c["before"], "after": c["after"], "shift_px": c["median_shift_px"]}
    if (PUB / "anatomy.json").exists():  # line drawings traced from face.glb (brand/scripts/oct14_anatomy.py)
        res["anatomy"] = json.loads((PUB / "anatomy.json").read_text())
    (PUB / "props.json").write_text(json.dumps(res))
    print("frames", at, f"({at / FPS:.1f} s)", "pieces", len(pieces), "words", len(out_words))
    return res


def master():
    """two-pass ffmpeg loudnorm of the render to -14 LUFS, true peak -1.5 dBFS (style DECISIONS 14f); the picture is copied untouched.
    The phone audio renders at about -34 LUFS. Usage: master <raw_mix.mp4> <final.mp4>"""
    src, dst = sys.argv[2], sys.argv[3]
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", src, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
    j = json.loads(r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1])
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
          f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,aresample=48000")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-c:v", "copy", "-af", af, "-c:a", "aac", "-b:a", "192k", dst], check=True)
    print("input", j["input_i"], "LUFS ->", dst)


if __name__ == "__main__":
    {"master": master, "audio": audio, "select": select, "transcribe": transcribe, "words": words, "transcode": transcode, "props": props}[sys.argv[1]]()
