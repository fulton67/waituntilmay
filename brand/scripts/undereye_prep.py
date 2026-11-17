"""Under-eye filler reel: footage, words, cut and props for the Remotion composition UndereyeReel.

Run with the style venv, isolated, from the repo root:
  PY=C:/Users/naimj/tools/style-venv/Scripts/python.exe
  $PY -I brand/scripts/undereye_prep.py transcode   # ffmpeg: the 4 MOVs -> H.264 mp4 in brand/remotion/public/undereye-filler/ (gitignored)
  $PY -I brand/scripts/undereye_prep.py words       # faster-whisper word timings per clip -> brand/edits/undereye-filler/words_<clip>.json
  $PY -I brand/scripts/undereye_prep.py props [--approx]   # cut.json + words -> public/undereye-filler/props.json
  --approx: no footage yet; words are spread evenly inside the catalog's [m:ss] segments and the picture falls back to the
            catalog's stills (frames every 3 s), for layout stills only.

PRIVACY (clinic rule): the patient's first name is never written by this script. It is read at run time from the catalog
transcript (the word after "patient," in IMG_6816's opening line, read-only) and every word that matches it (fuzzy, ratio >= 0.75)
is replaced with "[name]" before anything is stored. A cut piece that would contain a "[name]" word raises an error, so the name
can't reach the audio either. Output files hold only redacted words. Patient media and words stay in gitignored folders.
"""
import difflib, json, re, sqlite3, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CUT = ROOT / "research/ostad/style/undereye/cut.json"
EDIT = ROOT / "brand/edits/undereye-filler"
PUB = ROOT / "brand/remotion/public/undereye-filler"
LIB = Path("C:/Users/naimj/clinic-library")
SRC = LIB / "tmp"
CATALOG = LIB / "catalog/catalog.sqlite"
IDS = {"6816": 10434, "6817": 10433, "6818": 10432, "6821": 10431}
FRAME_STEP = 3.0  # the catalog's stills: one every 3 s from 0 s

norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())


def catalog(clip):
    con = sqlite3.connect(f"file:{CATALOG}?mode=ro", uri=True)
    return con.execute("select transcript, duration from assets where id=?", (IDS[clip],)).fetchone()


def secret_names():
    tr = catalog("6816")[0]
    m = re.search(r"patient,\s*([A-Za-z]+),", tr)
    return {norm(m.group(1))} if m else set()


def redact(words, secrets):
    out = []
    for w in words:
        n = norm(w["w"])
        hit = n and any(difflib.SequenceMatcher(None, n, s).ratio() >= 0.75 for s in secrets)
        out.append({**w, "w": "[name]", "redacted": True} if hit or "[name]" in w["w"] else w)
    return out


def approx_words(clip):
    """Words spread evenly over each [m:ss] segment of the catalog transcript (layout only)."""
    tr, dur = catalog(clip)
    segs = [(int(m.group(1)) * 60 + int(m.group(2)), m.group(3).strip()) for m in re.finditer(r"\[(\d+):(\d+)\]\s*([^\[]*)", tr)]
    tr = re.sub(r"\[name\]", " [name] ", tr)
    out = []
    for i, (t0, text) in enumerate(segs):
        t1 = segs[i + 1][0] if i + 1 < len(segs) else min(dur, t0 + max(2.0, 0.33 * len(text.split())))
        toks = text.replace("[name]", " [name] ").split()
        # each word gets a length from its letters (about 2.7 words/s for his pace: 0.055 s per letter + 0.11 s), from the segment's
        # timestamp on; if that runs past the next timestamp, everything is squeezed to fit. Pauses fall at the end of a segment.
        est = [0.11 + 0.055 * len(norm(tok) or "x") for tok in toks]
        k_fit = min(1.0, (t1 - t0) / max(1e-6, sum(est)))
        t = t0
        for tok, d in zip(toks, est):
            out.append({"w": tok, "s": round(t, 3), "e": round(t + 0.9 * d * k_fit, 3)})
            t += d * k_fit
    return out


def cmd_transcode():
    PUB.mkdir(parents=True, exist_ok=True)
    cut = json.loads(CUT.read_text(encoding="utf-8"))
    for clip, name in cut["clips"].items():
        src, dst = SRC / name, PUB / f"{clip}.mp4"
        if dst.exists():
            continue
        # transcode only: same picture size and frame rate, H.264 for the browser, AAC audio; no edit, no grade
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-map", "0:v:0", "-map", "0:a:0", "-c:v", "libx264", "-preset", "medium",
                        "-crf", "14", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", str(dst)], check=True)
        print("transcoded", dst.name)


def cmd_words():
    sys.path.insert(0, str(ROOT / "research/ostad/style/tools"))
    import common  # noqa: F401  (adds the CUDA dlls that faster-whisper needs on Windows)
    from faster_whisper import WhisperModel
    secrets = secret_names()
    EDIT.mkdir(parents=True, exist_ok=True)
    model = WhisperModel("medium", device="auto", compute_type="auto")
    for clip in IDS:
        dst = EDIT / f"words_{clip}.json"
        if dst.exists():
            continue
        segs, _ = model.transcribe(str(PUB / f"{clip}.mp4"), language="en", word_timestamps=True, vad_filter=False, beam_size=5)
        words = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)} for s in segs for w in s.words]
        words = redact(words, secrets)
        dst.write_text(json.dumps({"clip": clip, "words": words}, indent=0), encoding="utf-8")
        print("words", clip, len(words), "redacted", sum(1 for w in words if w.get("redacted")))


def find(words, phrase, lo=0, n=1, last=False):
    toks = [norm(t) for t in phrase.split() if norm(t)]
    seen = 0
    for i in range(lo, len(words) - len(toks) + 1):
        if all(difflib.SequenceMatcher(None, norm(words[i + k]["w"]), t).ratio() >= 0.8 for k, t in enumerate(toks)):
            seen += 1
            if seen == n:
                return (i + len(toks) - 1) if last else i
    raise SystemExit(f"phrase not found: {phrase!r} from word {lo}")


def cmd_props(approx):
    cut = json.loads(CUT.read_text(encoding="utf-8"))
    fps, speed = cut["fps"], cut["speed"]
    secrets = secret_names()
    W = {}
    for clip in cut["clips"]:
        if approx:
            W[clip] = redact(approx_words(clip), secrets)
        else:
            W[clip] = json.loads((EDIT / f"words_{clip}.json").read_text(encoding="utf-8"))["words"]
    pieces, words_out, at = [], [], 0
    pic_end = {}
    for pc in cut["pieces"]:
        ws = W[pc["clip"]]
        i0 = find(ws, pc["start"], n=pc.get("n", 1))
        i1 = find(ws, pc["end"], lo=i0, last=True)
        if any(w.get("redacted") for w in ws[i0:i1 + 1]):
            raise SystemExit(f"{pc['id']} would include a redacted word")
        prev_e = ws[i0 - 1]["e"] if i0 > 0 else 0.0
        next_s = ws[i1 + 1]["s"] if i1 + 1 < len(ws) else ws[i1]["e"] + 0.5
        # breathe room around the phrase, never into a neighbouring word (and so never into a redacted one)
        t0 = max(ws[i0]["s"] - 0.10, prev_e + 0.03, 0.0)
        t1 = min(ws[i1]["e"] + 0.16, next_s - 0.03)
        for j in (i0 - 1, i1 + 1):  # a redacted neighbour gets a wider berth
            if 0 <= j < len(ws) and ws[j].get("redacted"):
                t0 = max(t0, ws[j]["e"] + 0.08) if j < i0 else t0
                t1 = min(t1, ws[j]["s"] - 0.08) if j > i1 else t1
        dur = round((t1 - t0) / speed * fps)
        pic = pc.get("picture", pc["clip"])
        pf = pc.get("pictureFrom", t0)
        if pf == "continue":
            pf = pic_end[pic]
        pic_end[pic] = pf + dur / fps * speed
        pieces.append({"id": pc["id"], "clip": pc["clip"], "section": pc["section"], "from": round(t0, 3), "to": round(t1, 3), "at": at, "dur": dur,
                       "picture": pic, "pictureFrom": round(pf, 3)})
        for k in range(i0, i1 + 1):
            w = ws[k]
            f0 = at + round((w["s"] - t0) / speed * fps)
            f1 = at + round((w["e"] - t0) / speed * fps)
            words_out.append({"w": w["w"], "f": f0, "f1": max(f0 + 1, f1), "piece": pc["id"], "k": k - i0})
        at += dur
    cues = {}
    for key, (pid, word, occ) in cut["cues"].items():
        cand = [w for w in words_out if w["piece"] == pid and difflib.SequenceMatcher(None, norm(w["w"]), norm(word)).ratio() >= 0.8]
        if len(cand) < occ:
            raise SystemExit(f"cue {key}: {word!r} not in {pid}")
        cues[key] = cand[occ - 1]["f"]
    props = {"fps": fps, "speed": speed, "durationInFrames": at, "approx": approx, "pieces": pieces, "words": words_out, "cues": cues,
             "tracks": json.loads((EDIT / "tracks.json").read_text(encoding="utf-8")) if (EDIT / "tracks.json").exists() else {}}
    PUB.mkdir(parents=True, exist_ok=True)
    (PUB / "props.json").write_text(json.dumps(props), encoding="utf-8")
    print(f"props: {len(pieces)} pieces, {at} f = {at / fps:.2f} s, {len(words_out)} words, {len(cues)} cues, approx={approx}")


if __name__ == "__main__":
    a = sys.argv[1:]
    {"transcode": cmd_transcode, "words": cmd_words}.get(a[0], lambda: cmd_props("--approx" in a))()
