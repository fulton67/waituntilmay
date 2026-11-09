"""M15: confirm the audio is the ORIGINAL language. Whisper language ID (faster-whisper, first 30 s) vs the source's declared
language (yt-dlp info.json `language` for YouTube; IG has none, so the detected language is recorded and English is expected for
these English-speaking creators). Videos without an audio stream are recorded as such (M16-M19 then don't apply)."""
import json
import os

from common import has_audio, run, wav

_model = None


def model():
    global _model
    if _model is None:
        from common import cuda_dlls
        cuda_dlls()
        from faster_whisper import WhisperModel
        _model = WhisperModel("small", device="cuda", compute_type="float16")
    return _model


def m15(ref, vid, path, P):
    if not has_audio(path):
        return {"has_audio": False}
    w = wav(path, ref, vid)
    _, info = model().transcribe(w, beam_size=1, language=None, without_timestamps=True, vad_filter=True, max_new_tokens=1)
    declared = None
    ij = os.path.splitext(path)[0] + ".info.json"
    if os.path.exists(ij):
        d = json.load(open(ij, encoding="utf8"))
        declared = d.get("language")
        fmt = d.get("format_note") or ""
        declared_audio = [f.get("language") for f in d.get("requested_formats", []) if f.get("acodec") not in (None, "none")]
    else:
        declared_audio = []
    lang = info.language
    ok = (declared is None or declared.split("-")[0] == lang) and lang == "en"
    return {"has_audio": True, "detected_language": lang, "probability": round(float(info.language_probability), 3),
            "declared_language": declared, "audio_track_language": declared_audio, "original_ok": bool(ok),
            "action": None if ok else "re-download the original-language track (yt-dlp -f ba[language=<orig>])"}


if __name__ == "__main__":
    run("audio_meta.json", m15)
