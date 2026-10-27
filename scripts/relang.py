"""Detect language per phrase, not per file, and re-transcribe what disagrees.

WhisperX decides a language from the first 30 seconds and then transcribes the
whole file in it. That is wrong for this material: an Indian or Gulf news
package opens with an English anchor, cuts to a correspondent in Hindi or
Arabic, and cuts back. Everything after the handover gets decoded as English
and comes out as confident nonsense - which the unit builder would happily cut
into the piece.

So every phrase is judged on its own audio, and sustained passages that
disagree with the file's language are transcribed again in theirs and
translated to English for tagging.

Two stages on purpose. A cheap sweep with `small` over every phrase finds
candidates; each candidate region is then confirmed with `large-v3` before
anything is re-transcribed, because acting on one small model's guess would
rewrite good English on a bad hunch. Silence detects as English at p=0.36, so
a probability floor is not optional.

Only sustained regions are rewritten. A single 1.4s phrase that reads as
Arabic inside a 9-minute English report is far more likely to be a detector
artefact than a real language change, and rewriting it would cost more than
leaving it.

  .venv/Scripts/python.exe scripts/relang.py --all
  .venv/Scripts/python.exe scripts/relang.py --source sources/houthi-05
"""
import argparse
import json
import os
import subprocess
import sys
import time

import torch                      # first: registers the NVIDIA DLL dirs, or
import whisperx                   # ctranslate2 cannot find cublas64_12.dll
from faster_whisper import WhisperModel

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

REPORT = "sources/_relang.json"
MIN_PHRASE_S = 1.0        # shorter than this is not enough audio to judge
MIN_PROB = 0.60           # silence reads as en at 0.36
CONFIRM_PROB = 0.70       # large-v3 has to agree this strongly
REGION_GAP_S = 1.0        # contiguous disagreement joins into one region
MIN_REGION_S = 2.0        # and only a sustained one is worth rewriting
SR = 16000


def slice_audio(audio, a, b, pad_to=MIN_PHRASE_S):
    i = max(0, int(a * SR))
    j = min(len(audio), int(b * SR))
    if (j - i) < int(pad_to * SR):
        j = min(len(audio), i + int(pad_to * SR))
    return audio[i:j]


def detect(model, audio, a, b):
    try:
        lang, prob, _ = model.detect_language(audio=slice_audio(audio, a, b))
        return lang, float(prob)
    except Exception:
        return None, 0.0


def regions_from(flags, gap=REGION_GAP_S, min_s=MIN_REGION_S):
    """Join neighbouring disagreeing phrases of the same language."""
    out = []
    for f in flags:
        if out and f["lang"] == out[-1]["lang"] \
                and f["start"] - out[-1]["end"] <= gap:
            out[-1]["end"] = f["end"]
            out[-1]["phrases"].append(f["id"])
        else:
            out.append({"lang": f["lang"], "start": f["start"],
                        "end": f["end"], "phrases": [f["id"]]})
    return [r for r in out if (r["end"] - r["start"]) >= min_s]


def transcribe_region(big, audio, r):
    """Re-transcribe one region in its own language, with word timings.

    faster-whisper's own word timestamps are used rather than WhisperX's
    forced alignment: they are good enough for an insert, they need no
    per-language alignment model, and some of these languages have none
    (there is no Sinhala aligner).
    """
    a = slice_audio(audio, r["start"], r["end"], pad_to=0.0)
    segs, _ = big.transcribe(a, language=r["lang"], word_timestamps=True,
                             beam_size=1)
    out = []
    for s in segs:
        words = []
        for w in (s.words or []):
            words.append({"word": w.word.strip(),
                          "start": round(r["start"] + w.start, 3),
                          "end": round(r["start"] + w.end, 3),
                          "score": round(float(getattr(w, "probability", 0.9)), 3)})
        if not (s.text or "").strip():
            continue
        out.append({"start": round(r["start"] + s.start, 3),
                    "end": round(r["start"] + s.end, 3),
                    "text": s.text.strip(), "words": words})
    return out


def translate_region(big, audio, r):
    a = slice_audio(audio, r["start"], r["end"], pad_to=0.0)
    segs, _ = big.transcribe(a, language=r["lang"], task="translate",
                             beam_size=1)
    return [{"start": round(r["start"] + s.start, 3),
             "end": round(r["start"] + s.end, 3),
             "text": (s.text or "").strip()}
            for s in segs if (s.text or "").strip()]


def overlaps(seg, regions):
    for r in regions:
        if min(seg.get("end", 0), r["end"]) - max(seg.get("start", 0), r["start"]) > 0:
            return True
    return False


def process(sid, sdir, small, get_big, quiet=False):
    raw_p = os.path.join(sdir, "_raw_whisperx.json")
    ph_p = os.path.join(sdir, "transcript", "phrases.json")
    wav = os.path.join(ROOT, "audio", f"{sid}_16k.wav")
    if not (os.path.exists(raw_p) and os.path.exists(ph_p)
            and os.path.exists(wav)):
        return {"id": sid, "skipped": "nothing transcribed"}

    raw = json.load(open(raw_p, encoding="utf-8"))
    dominant = (raw.get("meta") or {}).get("language") or "en"
    phrases = json.load(open(ph_p, encoding="utf-8"))
    if not phrases:
        return {"id": sid, "skipped": "no phrases", "language": dominant}

    audio = whisperx.load_audio(wav)

    judged, flags, langs = 0, [], {}
    for p in phrases:
        if (p["end"] - p["start"]) < MIN_PHRASE_S:
            continue
        judged += 1
        lang, prob = detect(small, audio, p["start"], p["end"])
        if not lang:
            continue
        langs[lang] = langs.get(lang, 0) + 1
        if lang != dominant and prob >= MIN_PROB:
            flags.append({"id": p["id"], "start": p["start"], "end": p["end"],
                          "lang": lang, "prob": round(prob, 3)})

    cand = regions_from(flags)

    # ---- confirm each candidate with the big model before touching anything
    confirmed = []
    if cand:
        big = get_big()
        for r in cand:
            lang, prob = detect(big, audio, r["start"], r["end"])
            r["confirm"] = {"lang": lang, "prob": round(prob, 3)}
            if lang == r["lang"] and prob >= CONFIRM_PROB:
                confirmed.append(r)

    rewritten_phrases = sum(len(r["phrases"]) for r in confirmed)
    res = {
        "id": sid, "language": dominant,
        "phrases": len(phrases), "judged": judged,
        "detected_other": len(flags),
        "detected_langs": dict(sorted(langs.items(), key=lambda kv: -kv[1])),
        "candidate_regions": len(cand),
        "regions": [{"lang": r["lang"], "start": r["start"], "end": r["end"],
                     "seconds": round(r["end"] - r["start"], 2),
                     "phrases": len(r["phrases"]),
                     "confirmed": r in confirmed,
                     "confirm": r.get("confirm")} for r in cand],
        "changed_phrases": rewritten_phrases,
        "changed_seconds": round(sum(r["end"] - r["start"] for r in confirmed), 2),
    }
    if not confirmed:
        return res

    # ---- rewrite the disagreeing regions
    big = get_big()
    new_segs, new_tr = [], []
    for r in confirmed:
        new_segs.extend(transcribe_region(big, audio, r))
        new_tr.extend(translate_region(big, audio, r))

    kept = [s for s in raw["segments"] if not overlaps(s, confirmed)]
    raw["segments"] = sorted(kept + new_segs, key=lambda s: s.get("start", 0))
    tr = [t for t in (raw.get("translation") or []) if not overlaps(t, confirmed)]
    raw["translation"] = sorted(tr + new_tr, key=lambda t: t["start"])
    raw.setdefault("meta", {})["relang"] = {
        "dominant": dominant,
        "regions": [{"lang": r["lang"], "start": r["start"], "end": r["end"]}
                    for r in confirmed],
        "changed_phrases": rewritten_phrases,
    }
    tmp = raw_p + ".tmp"
    json.dump(raw, open(tmp, "w", encoding="utf-8"), ensure_ascii=False)
    os.replace(tmp, raw_p)
    res["rewritten"] = True

    # The transcript files and tags.json are derived from the raw payload, so
    # rewriting the raw and stopping there would leave words.json still saying
    # the English the detector just disproved.
    dur = _duration(sid, sdir)
    td = os.path.join("sources", sid, "transcript")
    subprocess.run([sys.executable, "scripts/build_outputs.py",
                    "--raw", os.path.join("sources", sid, "_raw_whisperx.json"),
                    "--outdir", td, "--duration", f"{dur:.3f}", "--pad", "0.05"],
                   cwd=ROOT, check=True, capture_output=True, text=True)
    subprocess.run([sys.executable, "scripts/autotag.py", "tag",
                    "--source", os.path.join("sources", sid)],
                   cwd=ROOT, check=True, capture_output=True, text=True)
    after = json.load(open(ph_p, encoding="utf-8"))
    res["phrases_after"] = len(after)
    return res


def _duration(sid, sdir):
    m = os.path.join(sdir, "_meta.json")
    if os.path.exists(m):
        d = json.load(open(m, encoding="utf-8")).get("duration")
        if d:
            return float(d)
    cfg = json.load(open(os.path.join(ROOT, "config/sources.json"),
                        encoding="utf-8"))
    for s in cfg["sources"]:
        if s["id"] == sid and s.get("duration"):
            return float(s["duration"])
    raise RuntimeError(f"no duration known for {sid}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", action="append", default=[])
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--detect-model", default="small")
    ap.add_argument("--big-model", default="large-v3")
    ap.add_argument("--rebuild", action="store_true", default=True)
    args = ap.parse_args()

    dirs = list(args.source)
    if args.all or not dirs:
        cfg = json.load(open(os.path.join(ROOT, "config/sources.json"),
                             encoding="utf-8"))
        ids = [s["id"] for s in cfg["sources"]]
        ids += sorted(d for d in os.listdir(os.path.join(ROOT, "sources"))
                      if d.startswith("houthi-") and os.path.isdir(
                          os.path.join(ROOT, "sources", d)) and d not in ids)
        dirs = [os.path.join("sources", i) for i in dict.fromkeys(ids)]

    print(f"[setup] detect={args.detect_model} confirm/rewrite={args.big_model} "
          f"cuda={torch.cuda.is_available()}", flush=True)
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    ct = "float16" if dev == "cuda" else "int8"
    small = WhisperModel(args.detect_model, device=dev, compute_type=ct)
    big_box = {}

    def get_big():
        if "m" not in big_box:
            print(f"[setup] loading {args.big_model}", flush=True)
            big_box["m"] = WhisperModel(args.big_model, device=dev,
                                        compute_type=ct)
        return big_box["m"]

    rows = []
    for d in dirs:
        sid = os.path.basename(d.rstrip("/\\"))
        sdir = os.path.join(ROOT, d)
        t0 = time.time()
        try:
            r = process(sid, sdir, small, get_big)
        except Exception as e:
            r = {"id": sid, "error": f"{type(e).__name__}: {e}"}
        r["seconds"] = round(time.time() - t0, 1)
        rows.append(r)
        note = r.get("skipped") or r.get("error")
        if not note:
            note = (f"lang={r['language']} judged={r['judged']}/{r['phrases']}"
                    f" other={r['detected_other']}"
                    f" regions={r['candidate_regions']}"
                    f" changed={r['changed_phrases']}")
        print(f"  {sid:<12} {note}  ({r['seconds']}s)", flush=True)

    json.dump(rows, open(os.path.join(ROOT, REPORT), "w", encoding="utf-8"),
              indent=1, ensure_ascii=False)

    print("\n" + "=" * 96)
    print("PER-PHRASE LANGUAGE  (judged on each phrase's own audio, not the "
          "first 30s)")
    print("=" * 96)
    print(f"{'source':<12} {'file':>5} {'phrases':>8} {'judged':>7} "
          f"{'other':>6} {'regions':>8} {'changed':>8} {'secs':>6}  languages seen")
    print("-" * 96)
    tot_changed = 0
    for r in rows:
        if r.get("skipped") or r.get("error"):
            print(f"{r['id']:<12} {r.get('skipped') or r.get('error')}")
            continue
        tot_changed += r["changed_phrases"]
        seen = " ".join(f"{k}:{v}" for k, v in
                        list(r["detected_langs"].items())[:4])
        print(f"{r['id']:<12} {r['language']:>5} {r['phrases']:>8} "
              f"{r['judged']:>7} {r['detected_other']:>6} "
              f"{r['candidate_regions']:>8} {r['changed_phrases']:>8} "
              f"{r['changed_seconds']:>6.1f}  {seen}")
    print("-" * 96)
    print(f"{tot_changed} phrases re-transcribed in another language")
    print(f"\nthresholds: phrase >= {MIN_PHRASE_S}s to be judged, sweep "
          f"p >= {MIN_PROB}, confirmation p >= {CONFIRM_PROB} from "
          f"{args.big_model}, region >= {MIN_REGION_S}s")
    print(REPORT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
