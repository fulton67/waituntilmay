"""Fallback: faster-whisper with word_timestamps=True and vad_filter=True.

Emits the same _raw_whisperx.json shape so build_outputs.py is unchanged.
"""
import argparse
import json
import os
import time


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", default="audio/blum_16k.wav")
    ap.add_argument("--model", default="large-v3")
    ap.add_argument("--out", default="sources/blum/_raw_whisperx.json")
    ap.add_argument("--force-cpu", action="store_true")
    args = ap.parse_args()

    from faster_whisper import WhisperModel

    device, compute_type = "cpu", "int8"
    if not args.force_cpu:
        try:
            import torch
            if torch.cuda.is_available():
                device, compute_type = "cuda", "float16"
        except Exception:
            pass

    print(f"[setup] device={device} compute_type={compute_type} model={args.model}", flush=True)
    t0 = time.time()
    try:
        model = WhisperModel(args.model, device=device, compute_type=compute_type)
    except Exception as e:
        print(f"[warn] {device} load failed ({e}); using CPU/int8", flush=True)
        device, compute_type = "cpu", "int8"
        model = WhisperModel(args.model, device=device, compute_type=compute_type)

    seg_iter, info = model.transcribe(
        args.audio,
        language="en",
        beam_size=5,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 300},
        condition_on_previous_text=False,
    )

    segments = []
    n_words = 0
    for s in seg_iter:
        ws = [{"word": w.word, "start": w.start, "end": w.end, "score": w.probability}
              for w in (s.words or [])]
        n_words += len(ws)
        segments.append({"start": s.start, "end": s.end, "text": s.text, "words": ws})
        if len(segments) % 50 == 0:
            print(f"[asr] {len(segments)} segments, {n_words} words, "
                  f"t={s.end:.0f}s ({time.time()-t0:.0f}s elapsed)", flush=True)

    elapsed = time.time() - t0
    print(f"[asr] done in {elapsed:.1f}s -> {len(segments)} segments, {n_words} words", flush=True)

    payload = {
        "meta": {
            "engine": "faster-whisper",
            "model": args.model,
            "device": device,
            "align_device": None,
            "compute_type": compute_type,
            "audio": args.audio,
            "audio_duration": round(info.duration, 3),
            "asr_seconds": round(elapsed, 1),
            "align_seconds": None,
            "vad_filter": True,
        },
        "segments": segments,
    }
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    print(f"[done] wrote {args.out}", flush=True)


if __name__ == "__main__":
    main()
