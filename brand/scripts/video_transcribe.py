"""Word-timed transcript of a source video for scripts/video_edit.cjs (captions). faster-whisper "medium", CPU int8, VAD on,
word timestamps; times are in SOURCE seconds (before any speed change).
usage: python -I brand/scripts/video_transcribe.py <video> <out.json>   (the python that has faster-whisper installed, not brand-venv)"""
import json, subprocess, sys, tempfile, pathlib
from faster_whisper import WhisperModel
src, out = sys.argv[1], pathlib.Path(sys.argv[2])
with tempfile.TemporaryDirectory() as d:
    wav = str(pathlib.Path(d) / "a.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000", wav], check=True)
    m = WhisperModel("medium", device="cpu", compute_type="int8")
    segs, info = m.transcribe(wav, language="en", word_timestamps=True, vad_filter=True, beam_size=5)
    rows = [{"start": s.start, "end": s.end, "text": s.text.strip(),
             "words": [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)} for w in s.words]} for s in segs]
out.parent.mkdir(parents=True, exist_ok=True)
json.dump({"source": src, "model": "faster-whisper medium int8", "duration": info.duration, "segments": rows}, open(out, "w", encoding="utf-8"), indent=1)
print(len(rows), "segments,", sum(len(r["words"]) for r in rows), "words ->", out)
