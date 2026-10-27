"""Transcribe with WhisperX (transcription + forced alignment) -> raw_words.json

Falls back CUDA/float16 -> CPU/int8 if the GPU path fails.

The language is detected unless one is given. A source that is not English is
transcribed and aligned in its own language - the word timings have to match
the audio that will be cut, and aligning an English translation against Arabic
speech would put every word in the wrong place - and then translated in a
second pass with task="translate", stored alongside as segment-level English.
The original audio is what ships; the translation exists so the tagger and the
selection filter have something they can read.
"""
import argparse
import json
import os
import sys
import time

AUDIO = "audio/blum_16k.wav"
OUT = "sources/blum/_raw_whisperx.json"


def pick_device():
    import torch
    if torch.cuda.is_available():
        return "cuda", "float16"
    return "cpu", "int8"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", default=AUDIO)
    ap.add_argument("--model", default="large-v3")
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--batch-size", type=int, default=8)
    ap.add_argument("--force-cpu", action="store_true")
    ap.add_argument("--language", default="en",
                    help="language code, or 'auto' to detect")
    ap.add_argument("--also-translate", action="store_true",
                    help="for a non-English source, add an English pass")
    ap.add_argument("--translate-only", action="store_true",
                    help="redo just the English pass on an existing transcript")
    args = ap.parse_args()

    import whisperx

    if args.force_cpu:
        device, compute_type = "cpu", "int8"
    else:
        device, compute_type = pick_device()

    lang = None if args.language in ("auto", "", None) else args.language
    print(f"[setup] device={device} compute_type={compute_type} "
          f"model={args.model} language={lang or 'auto'}", flush=True)

    audio = whisperx.load_audio(args.audio)
    dur = len(audio) / 16000.0
    print(f"[setup] audio duration = {dur:.3f}s", flush=True)

    t0 = time.time()
    def load(dev, ct, task="transcribe"):
        return whisperx.load_model(args.model, dev, compute_type=ct,
                                   language=lang, task=task)

    # ---- redo only the English pass
    # The transcribe and the align are the expensive parts and they were not
    # wrong; only the translate task was dropped. Re-running them to fix a
    # translation would cost minutes per source for nothing.
    if args.translate_only:
        payload = json.load(open(args.out, encoding="utf-8"))
        detected = (payload.get("meta") or {}).get("language") or "en"
        print(f"[tr] {detected} -> en, segments only", flush=True)
        tm = load(device, compute_type, task="translate")
        tr = tm.transcribe(audio, batch_size=args.batch_size,
                           task="translate", language=detected)
        payload["translation"] = [
            {"start": round(s.get("start", 0.0), 3),
             "end": round(s.get("end", 0.0), 3),
             "text": (s.get("text") or "").strip()}
            for s in tr.get("segments", []) if (s.get("text") or "").strip()]
        payload.setdefault("meta", {})["translated"] = bool(payload["translation"])
        tmp = args.out + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False)
        os.replace(tmp, args.out)
        print(f"[tr] {len(payload['translation'])} segments -> {args.out} "
              f"in {time.time()-t0:.0f}s", flush=True)
        return 0

    try:
        model = load(device, compute_type)
    except Exception as e:
        print(f"[warn] GPU load failed ({e}); falling back to CPU/int8", flush=True)
        device, compute_type = "cpu", "int8"
        model = load(device, compute_type)

    print("[asr] transcribing...", flush=True)
    try:
        result = model.transcribe(audio, batch_size=args.batch_size)
    except Exception as e:
        print(f"[warn] GPU transcribe failed ({e}); retrying on CPU/int8", flush=True)
        del model
        device, compute_type = "cpu", "int8"
        model = load(device, compute_type)
        result = model.transcribe(audio, batch_size=args.batch_size)
    t_asr = time.time() - t0
    detected = result.get("language") or lang or "en"
    print(f"[asr] language = {detected}", flush=True)
    n_seg = len(result["segments"])
    print(f"[asr] done in {t_asr:.1f}s -> {n_seg} segments", flush=True)

    # free ASR model before loading the alignment model (8GB VRAM budget)
    try:
        del model
        import gc, torch
        gc.collect()
        if device == "cuda":
            torch.cuda.empty_cache()
    except Exception:
        pass

    print("[align] loading alignment model...", flush=True)
    t1 = time.time()
    align_device = device
    align_error = None
    try:
        model_a, metadata = whisperx.load_align_model(language_code=detected,
                                                      device=align_device)
        aligned = whisperx.align(result["segments"], model_a, metadata, audio,
                                 align_device, return_char_alignments=False)
    except Exception as e:
        print(f"[warn] GPU align failed ({e}); aligning on CPU", flush=True)
        align_device = "cpu"
        try:
            model_a, metadata = whisperx.load_align_model(
                language_code=detected, device=align_device)
            aligned = whisperx.align(result["segments"], model_a, metadata,
                                     audio, align_device,
                                     return_char_alignments=False)
        except Exception as e2:
            # Some languages have no forced-alignment model at all - WhisperX
            # ships none for Sinhala, and a Sinhala source killed this script
            # outright after a 390-second transcribe. A missing aligner is a
            # property of the language, not a failure of the run, so the
            # segments are kept with word timings spread evenly across each
            # one and `aligned` is recorded as false. Those timings are
            # approximations: a clause boundary drawn from them can fall
            # mid-word, so selection refuses such a source rather than
            # cutting the piece on guesses.
            print(f"[warn] no aligner for {detected} ({e2}); keeping "
                  f"segment-level timings", flush=True)
            align_device = "none"
            align_error = str(e2)
            for seg in result["segments"]:
                toks = (seg.get("text") or "").split()
                a, b = seg.get("start"), seg.get("end")
                if not toks or a is None or b is None:
                    seg["words"] = []
                    continue
                step = (b - a) / len(toks)
                seg["words"] = [
                    {"word": t, "start": round(a + i * step, 3),
                     "end": round(a + (i + 1) * step, 3), "score": 0.0}
                    for i, t in enumerate(toks)]
            aligned = {"segments": result["segments"]}
    t_align = time.time() - t1
    print(f"[align] done in {t_align:.1f}s "
          f"({'no aligner' if align_device == 'none' else align_device})",
          flush=True)

    # ---- the English pass, for a source that is not in English
    # Segment level only, and deliberately not aligned: these words were never
    # spoken, so forcing them onto the waveform would invent timings. The cut
    # runs on the aligned original; this is read, not cut.
    translation = None
    if args.also_translate and detected != "en":
        print(f"[tr] translating {detected} -> en ...", flush=True)
        t2 = time.time()
        try:
            del model_a
            import gc
            import torch
            gc.collect()
            if device == "cuda":
                torch.cuda.empty_cache()
        except Exception:
            pass
        try:
            tm = load(device, compute_type, task="translate")
            # task and language go to transcribe(), not just to load_model().
            # WhisperX only builds its tokenizer at load time if a language
            # was given; with language=auto it builds it on the first call
            # and does `task = task or "transcribe"`, which silently throws
            # away the translate task. The symptom is a "translation" that
            # comes back in Hindi, and a selection filter that then rejects
            # the source for never saying the word cable.
            tr = tm.transcribe(audio, batch_size=args.batch_size,
                               task="translate", language=detected)
            translation = [{"start": round(s.get("start", 0.0), 3),
                            "end": round(s.get("end", 0.0), 3),
                            "text": (s.get("text") or "").strip()}
                           for s in tr.get("segments", [])]
            print(f"[tr] done in {time.time()-t2:.1f}s -> "
                  f"{len(translation)} segments", flush=True)
        except Exception as e:
            print(f"[warn] translation pass failed ({e}); continuing without",
                  flush=True)

    payload = {
        "meta": {
            "engine": "whisperx",
            "model": args.model,
            "device": device,
            "align_device": align_device,
            "language": detected,
            "translated": bool(translation),
            "aligned": align_device != "none",
            "align_error": align_error,
            "compute_type": compute_type,
            "audio": args.audio,
            "audio_duration": round(dur, 3),
            "asr_seconds": round(t_asr, 1),
            "align_seconds": round(t_align, 1),
        },
        "segments": aligned["segments"],
    }
    if translation:
        payload["translation"] = translation
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    print(f"[done] wrote {args.out}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
