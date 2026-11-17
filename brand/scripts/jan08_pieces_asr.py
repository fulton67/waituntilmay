"""Jan 08 reel: re-transcribe each cut piece on its own (local faster-whisper, the clinic model) so a cut that clips a word, or
lets in an um or a stutter, shows up in the text (LESSONS L7). Run with the clinic venv:
  C:/Users/naimj/clinic-library/.venv/Scripts/python.exe brand/scripts/jan08_pieces_asr.py [a:b ...]
No args: every piece of research/ostad/style/jan08/cut.json -> brand/edits/jan08-filler-fatigue/pieces_asr.json.
Also `final <mp4>`: transcribe the rendered reel's audio -> final_asr.json (fillers counted in the first 10 s and overall).
"""
import json, re, sys, wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from jan08_prep import EDIT, CUT, model, audio16k  # noqa: E402

FILLERS = {"um", "uh", "erm", "ah", "hmm", "mm"}


def clip(a, b):
    with wave.open(str(EDIT / "talk48.wav")) as f:
        sr = f.getframerate()
        f.setpos(int(a * sr))
        x = np.frombuffer(f.readframes(int((b - a) * sr)), np.int16).astype(np.float32) / 32768
    return x[::3]  # 48 kHz -> 16 kHz (decimation is enough for ASR)


def stutters(ws):
    t = [re.sub(r"[^a-z']", "", w.lower()) for w in ws]
    return [t[i] for i in range(1, len(t)) if t[i] and t[i] == t[i - 1] and t[i] not in {"that", "very", "so"}]


def main():
    m = model()
    args = sys.argv[1:]
    if args and args[0] == "final":
        segs, _ = m.transcribe(audio16k(args[1]), language="en", word_timestamps=True, vad_filter=False, beam_size=5)
        ws = [{"w": w.word.strip(), "t0": round(w.start, 2)} for s in segs for w in s.words or []]
        fill = [w for w in ws if re.sub(r"[^a-z]", "", w["w"].lower()) in FILLERS]
        res = {"text": " ".join(w["w"] for w in ws), "fillers": fill, "fillers_first_10s": [w for w in fill if w["t0"] < 10], "stutters": stutters([w["w"] for w in ws])}
        (EDIT / "final_asr.json").write_text(json.dumps(res, indent=1))
        print(json.dumps({k: v for k, v in res.items() if k != "text"}, indent=1)); print(res["text"])
        return
    spans = [(None, float(a), float(b)) for a, b in (s.split(":") for s in args)] if args else \
        [(p["id"], p["from"], p["to"]) for p in json.loads(CUT.read_text(encoding="utf-8"))["pieces"]]
    out = []
    for pid, a, b in spans:
        segs, _ = m.transcribe(clip(a, b), language="en", word_timestamps=True, vad_filter=False, beam_size=5)
        wt = [{"w": w.word.strip(), "t0": round(w.start, 3), "t1": round(w.end, 3)} for s in segs for w in s.words or []]
        ws = [w["w"] for w in wt]
        fill = [w for w in ws if re.sub(r"[^a-z]", "", w.lower()) in FILLERS]
        out.append({"id": pid, "from": a, "to": b, "text": " ".join(ws), "fillers": fill, "stutters": stutters(ws), "words": wt})
        print(f"{pid or ''} {a:.2f}-{b:.2f}: {' '.join(ws)}  {'FILLERS ' + str(fill) if fill else ''}")
    if not args:
        (EDIT / "pieces_asr.json").write_text(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
