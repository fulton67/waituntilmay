"""Jan 08 filler-fatigue reel: word timings, transcode, props, master. Source: clinic-library/tmp/jan08/IMG_2421.MOV
(catalog id 163, filmed 2026-01-08 13:26, 270.6 s, HEVC 1920x1080 rot -90 -> portrait 1080x1920). Read-only against the
clinic library; everything this writes is under brand/edits/jan08-filler-fatigue/ or brand/remotion/public/jan08/ (both gitignored).

  CPY=C:/Users/naimj/clinic-library/.venv/Scripts/python.exe   (local faster-whisper on the GPU; nothing leaves this PC)
  $CPY brand/scripts/jan08_prep.py words      -> EDIT/words_talk.json
  $CPY brand/scripts/jan08_prep.py transcode  -> public/jan08/talk.mp4 (1080x1920, 24 fps)
  python brand/scripts/jan08_prep.py props    research/ostad/style/jan08/cut.json + words -> public/jan08/props.json
  python brand/scripts/jan08_prep.py master <raw.mp4> <final.mp4>   two-pass loudnorm -14 LUFS / -1.5 dBTP
"""
import json, os, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = Path("C:/Users/naimj/clinic-library/tmp/jan08/IMG_2421.MOV")
EDIT = ROOT / "brand/edits/jan08-filler-fatigue"
PUB = ROOT / "brand/remotion/public/jan08"
CUT = ROOT / "research/ostad/style/jan08/cut.json"
FPS = 24


def model():
    for sub in ("cublas", "cudnn"):
        d = f"C:/Users/naimj/clinic-library/.venv/Lib/site-packages/nvidia/{sub}/bin"
        if os.path.isdir(d):
            os.add_dll_directory(d)
            os.environ["PATH"] = d + os.pathsep + os.environ["PATH"]
    sys.path.insert(0, "C:/Users/naimj/clinic-library/scripts")
    from preview import whisper  # noqa: E402  the clinic pipeline's local model
    return whisper()


def audio16k(path):
    import numpy as np
    pcm = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(path), "-map", "0:a:0", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                         capture_output=True).stdout
    return np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0


def words():
    EDIT.mkdir(parents=True, exist_ok=True)
    segs, _ = model().transcribe(audio16k(SRC), language="en", word_timestamps=True, vad_filter=False, beam_size=5)
    ws = [{"w": w.word.strip(), "t0": round(w.start, 3), "t1": round(w.end, 3), "p": round(w.probability, 3)} for s in segs for w in (s.words or [])]
    (EDIT / "words_talk.json").write_text(json.dumps(ws))
    with open(EDIT / "words_talk.txt", "w", encoding="utf-8") as f:
        for i, w in enumerate(ws):
            f.write(f"{i}\t{w['t0']:.2f}\t{w['t1']:.2f}\t{w['w']}\n")
    print(len(ws), "words")


def transcode():
    PUB.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(SRC), "-vf", f"scale=1080:1920,fps={FPS}", "-c:v", "libx264", "-crf", "17",
                    "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart",
                    str(PUB / "talk.mp4")], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(SRC), "-vn", "-ac", "1", "-ar", "48000", str(EDIT / "talk.wav")], check=True)
    print("transcoded")


def props():
    """cut.json pieces {id, from, to, why} (raw seconds) -> props.json with composition frames, words and cues {name: [pieceId, 'word', nth?, offF?]}"""
    cut = json.loads(CUT.read_text(encoding="utf-8"))
    W = json.loads((EDIT / "words_talk.json").read_text())
    asr = {x["id"]: x for x in json.loads((EDIT / "pieces_asr.json").read_text())} if (EDIT / "pieces_asr.json").exists() else {}
    at, pieces, out_words = 0, [], []
    for p in cut["pieces"]:
        mids = [w for w in W if p["from"] <= (w["t0"] + w["t1"]) / 2 <= p["to"]]  # a word belongs to the piece holding its midpoint (L7)
        a = asr.get(p["id"])
        if a and abs(a["from"] - p["from"]) < 1e-3 and abs(a["to"] - p["to"]) < 1e-3:  # the cut piece re-transcribed on its own: exact words
            mids = [{"w": w["w"], "t0": p["from"] + w["t0"], "t1": p["from"] + w["t1"]} for w in a["words"]]
        dur = round((p["to"] - p["from"]) * FPS)
        pieces.append({**p, "at": at, "dur": dur})
        joined = []
        for w in mids:  # whisper splits hyphenated words ("micro" "-cannulas"): one caption word
            if joined and w["w"].startswith("-"):
                joined[-1] = {**joined[-1], "w": joined[-1]["w"] + w["w"], "t1": w["t1"]}
            else:
                joined.append(dict(w))
        for w in joined:
            t = cut.get("spell", {}).get(re.sub(r"[^a-z0-9-]", "", w["w"].lower()), None)
            txt = re.sub(r"[A-Za-z0-9-]+", t, w["w"], count=1) if t else w["w"]
            out_words.append({"w": txt, "f": at + max(0, round((w["t0"] - p["from"]) * FPS)), "f1": at + min(dur, round((w["t1"] - p["from"]) * FPS)), "piece": p["id"]})
        at += dur
    # caption fixes (cut.json "fix": [piece, word as transcribed, replacement]; "" drops the word): mishearings and sentence ends at joins
    for pid, old, new in cut.get("fix", []):
        hit = next((w for w in out_words if w["piece"] == pid and w["w"] == old), None)
        if not hit:
            raise SystemExit(f"fix: {old!r} not in {pid}")
        hit["w"] = new
    out_words = [w for w in out_words if w["w"]]
    for i in range(1, len(out_words)):  # sentence case after a full stop
        if re.search(r"[.?!]$", out_words[i - 1]["w"]) and out_words[i]["w"][:1].islower():
            out_words[i]["w"] = out_words[i]["w"][:1].upper() + out_words[i]["w"][1:]
    byid = {p["id"]: p for p in pieces}
    cues = {}
    for k, v in cut.get("cues", {}).items():
        pc = byid[v[0]]
        cand = [w for w in out_words if w["piece"] == v[0] and re.sub(r"[^a-z0-9]", "", w["w"].lower()) == v[1]]
        if not cand:
            raise SystemExit(f"cue {k}: word {v[1]!r} not in piece {v[0]}")
        n = v[2] if len(v) > 2 else 0
        cues[k] = cand[n]["f"] + (v[3] if len(v) > 3 else 0)
    for k in byid:
        cues["start:" + k], cues["end:" + k] = byid[k]["at"], byid[k]["at"] + byid[k]["dur"]
    res = {"fps": FPS, "durationInFrames": at, "pieces": pieces, "words": out_words, "cues": cues, "tail": cut.get("tail", 60)}
    PUB.mkdir(parents=True, exist_ok=True)
    (PUB / "props.json").write_text(json.dumps(res))
    (EDIT / "cut_transcript.txt").write_text(" ".join(w["w"] for w in out_words), encoding="utf-8")
    print("frames", at, f"({at / FPS:.1f} s)", "pieces", len(pieces), "words", len(out_words))
    return res


XF = 0.015  # crossfade at every join (LESSONS L7: 10-20 ms)


def voice():
    """the cut voice as one track: each piece runs from `from` for its frame-rounded length + XF, joined with a XF-second
    triangular crossfade, so the track lasts exactly sum(dur)/24 s and every join is a 15 ms crossfade inside a measured gap"""
    pr = json.loads((PUB / "props.json").read_text())
    ins, fl = [], []
    for i, p in enumerate(pr["pieces"]):
        ins += ["-ss", f"{p['from']:.3f}", "-t", f"{p['dur'] / FPS + XF:.4f}", "-i", str(EDIT / "talk48.wav")]
    n = len(pr["pieces"])
    prev = "[0:a]"
    for i in range(1, n):
        out = f"[x{i}]"
        fl.append(f"{prev}[{i}:a]acrossfade=d={XF}:c1=tri:c2=tri{out}")
        prev = out
    fl.append(f"{prev}atrim=0:{pr['durationInFrames'] / FPS:.4f}[v]")
    subprocess.run(["ffmpeg", "-y", "-v", "error", *ins, "-filter_complex", ";".join(fl), "-map", "[v]", "-ar", "48000", "-ac", "1", str(PUB / "voice.wav")], check=True)
    print("voice.wav", pr["durationInFrames"] / FPS, "s")


def master():
    src, dst = sys.argv[2], sys.argv[3]
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", src, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
    j = json.loads(r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1])
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
          f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,aresample=48000")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-c:v", "copy", "-af", af, "-c:a", "aac", "-b:a", "192k", dst], check=True)
    print("input", j["input_i"], "LUFS ->", dst)


if __name__ == "__main__":
    {"master": master, "words": words, "transcode": transcode, "props": props, "voice": voice}[sys.argv[1]]()
