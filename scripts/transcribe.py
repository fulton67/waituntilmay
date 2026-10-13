"""Transcribe with WhisperX (transcription + forced alignment) -> raw_words.json

Falls back CUDA/float16 -> CPU/int8 if the GPU path fails.
"""
import argparse
import json
import os
import sys
import time

AUDIO = "audio/blum_16k.wav"
OUT = "transcript/_raw_whisperx.json"


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
    args = ap.parse_args()

    import whisperx

    if args.force_cpu:
        device, compute_type = "cpu", "int8"
    else:
        device, compute_type = pick_device()

    print(f"[setup] device={device} compute_type={compute_type} model={args.model}", flush=True)

    audio = whisperx.load_audio(args.audio)
    dur = len(audio) / 16000.0
    print(f"[setup] audio duration = {dur:.3f}s", flush=True)

    t0 = time.time()
    try:
        model = whisperx.load_model(args.model, device, compute_type=compute_type, language="en")
    except Exception as e:
        print(f"[warn] GPU load failed ({e}); falling back to CPU/int8", flush=True)
        device, compute_type = "cpu", "int8"
        model = whisperx.load_model(args.model, device, compute_type=compute_type, language="en")

    print("[asr] transcribing...", flush=True)
    try:
        result = model.transcribe(audio, batch_size=args.batch_size, language="en")
    except Exception as e:
        print(f"[warn] GPU transcribe failed ({e}); retrying on CPU/int8", flush=True)
        del model
        device, compute_type = "cpu", "int8"
        model = whisperx.load_model(args.model, device, compute_type=compute_type, language="en")
        result = model.transcribe(audio, batch_size=args.batch_size, language="en")
    t_asr = time.time() - t0
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
    try:
        model_a, metadata = whisperx.load_align_model(language_code="en", device=align_device)
        aligned = whisperx.align(result["segments"], model_a, metadata, audio,
                                 align_device, return_char_alignments=False)
    except Exception as e:
        print(f"[warn] GPU align failed ({e}); aligning on CPU", flush=True)
        align_device = "cpu"
        model_a, metadata = whisperx.load_align_model(language_code="en", device=align_device)
        aligned = whisperx.align(result["segments"], model_a, metadata, audio,
                                 align_device, return_char_alignments=False)
    t_align = time.time() - t1
    print(f"[align] done in {t_align:.1f}s", flush=True)

    payload = {
        "meta": {
            "engine": "whisperx",
            "model": args.model,
            "device": device,
            "align_device": align_device,
            "compute_type": compute_type,
            "audio": args.audio,
            "audio_duration": round(dur, 3),
            "asr_seconds": round(t_asr, 1),
            "align_seconds": round(t_align, 1),
        },
        "segments": aligned["segments"],
    }
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    print(f"[done] wrote {args.out}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
