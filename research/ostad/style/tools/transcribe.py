"""M16: Whisper (faster-whisper "medium", CUDA fp16) with WORD-level timings, in the language M15 confirmed.
Output: language, segments (start, end, text), words (start, end, word, probability)."""
from common import has_audio, load_json, out_path, run, wav

_model = None


def model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        _model = WhisperModel("medium", device="cuda", compute_type="float16")
    return _model


def m16(ref, vid, path, P):
    meta = load_json(out_path(ref, vid, "audio_meta.json"))
    if meta is None:
        raise RuntimeError("needs audio_meta.json (M15)")
    if not meta.get("has_audio"):
        return {"has_audio": False, "segments": [], "words": []}
    segs, info = model().transcribe(wav(path, ref, vid), language=meta.get("detected_language") or "en", word_timestamps=True,
                                    vad_filter=True, beam_size=5)
    S, Wd = [], []
    for s in segs:
        S.append({"start": round(s.start, 3), "end": round(s.end, 3), "text": s.text.strip()})
        for w in s.words or []:
            Wd.append({"start": round(w.start, 3), "end": round(w.end, 3), "word": w.word.strip(), "p": round(w.probability, 3)})
    return {"has_audio": True, "language": info.language, "duration": round(info.duration, 3), "segments": S, "words": Wd}


if __name__ == "__main__":
    run("transcript.json", m16)
