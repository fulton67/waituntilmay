"""Build words.json / phrases.json / transcript.txt / transcript.srt from WhisperX output."""
import argparse
import json
import os
import re

RAW = "sources/blum/_raw_whisperx.json"
OUTDIR = "transcript"

# a word ends a phrase if its text ends with one of these
HARD_PUNCT = tuple(".!?")
SOFT_PUNCT = tuple(",;:—–")  # comma semicolon colon em/en dash


def r3(x):
    return round(float(x) + 0.0, 3)


def load_words(raw_path, audio_duration):
    """Flatten aligned segments into a word list, repairing any missing timings."""
    with open(raw_path, encoding="utf-8") as f:
        payload = json.load(f)
    segments = payload["segments"]
    meta = payload.get("meta", {})

    words = []
    n_repaired = 0
    for seg in segments:
        seg_start = seg.get("start")
        seg_end = seg.get("end")
        ws = seg.get("words") or []
        if not ws:
            continue
        # fill missing start/end by linear interpolation inside the segment
        idx_missing = [i for i, w in enumerate(ws)
                       if w.get("start") is None or w.get("end") is None]
        if idx_missing:
            n_repaired += len(idx_missing)
            known = [(i, w["start"], w["end"]) for i, w in enumerate(ws)
                     if w.get("start") is not None and w.get("end") is not None]
            if not known:
                if seg_start is None or seg_end is None:
                    continue
                step = (seg_end - seg_start) / len(ws)
                for i, w in enumerate(ws):
                    w["start"] = seg_start + i * step
                    w["end"] = seg_start + (i + 1) * step
            else:
                for i in idx_missing:
                    prev = max((k for k in known if k[0] < i), key=lambda k: k[0], default=None)
                    nxt = min((k for k in known if k[0] > i), key=lambda k: k[0], default=None)
                    lo = prev[2] if prev else (seg_start if seg_start is not None else known[0][1])
                    hi = nxt[1] if nxt else (seg_end if seg_end is not None else known[-1][2])
                    if hi is None or lo is None or hi <= lo:
                        lo = lo if lo is not None else 0.0
                        hi = lo + 0.08
                    ws[i]["start"] = lo
                    ws[i]["end"] = min(hi, lo + 0.30)

        for w in ws:
            txt = (w.get("word") or "").strip()
            if not txt:
                continue
            s, e = float(w["start"]), float(w["end"])
            if e < s:
                s, e = e, s
            words.append({"word": txt, "start": s, "end": e})

    # enforce monotonicity and clamp to the audio
    words.sort(key=lambda w: (w["start"], w["end"]))
    for i, w in enumerate(words):
        w["start"] = max(0.0, min(w["start"], audio_duration))
        w["end"] = max(w["start"], min(w["end"], audio_duration))
        if i and w["start"] < words[i - 1]["end"]:
            w["start"] = max(w["start"], words[i - 1]["end"])
            w["end"] = max(w["end"], w["start"])

    out = [{"i": i, "word": w["word"], "start": r3(w["start"]), "end": r3(w["end"])}
           for i, w in enumerate(words)]
    return out, meta, n_repaired


def split_phrases(words, gap_thresh=0.25, max_dur=4.0, min_dur=1.0, merge_gap=0.5):
    """Break at punctuation and at pauses > gap_thresh; then tidy toward 1-4s."""
    groups = []
    cur = []
    for i, w in enumerate(words):
        cur.append(i)
        txt = w["word"]
        ends_hard = txt.endswith(HARD_PUNCT)
        ends_soft = txt.endswith(SOFT_PUNCT)
        gap = (words[i + 1]["start"] - w["end"]) if i + 1 < len(words) else None
        big_pause = gap is not None and gap > gap_thresh
        last = i == len(words) - 1
        if last or ends_hard or ends_soft or big_pause:
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)

    def dur(g):
        return words[g[-1]]["end"] - words[g[0]]["start"]

    # split anything longer than max_dur at its largest internal gap
    def split_long(g):
        if dur(g) <= max_dur or len(g) < 2:
            return [g]
        best_k, best_gap = None, -1.0
        for k in range(len(g) - 1):
            gp = words[g[k + 1]]["start"] - words[g[k]]["end"]
            # prefer a balanced split when gaps tie
            score = gp + 0.001 * (1.0 - abs((k + 1) / len(g) - 0.5))
            if score > best_gap:
                best_gap, best_k = score, k
        left, right = g[:best_k + 1], g[best_k + 1:]
        return split_long(left) + split_long(right)

    expanded = []
    for g in groups:
        expanded.extend(split_long(g))
    groups = expanded

    # merge runs shorter than min_dur into a neighbour when the pause is small
    merged = []
    for g in groups:
        if (merged and dur(g) < min_dur
                and (words[g[0]]["start"] - words[merged[-1][-1]]["end"]) <= merge_gap
                and (words[g[-1]]["end"] - words[merged[-1][0]]["start"]) <= max_dur):
            merged[-1] = merged[-1] + g
        else:
            merged.append(g)
    return merged


def make_phrases(words, groups, pad=0.0, audio_duration=None):
    phrases = []
    for pid, g in enumerate(groups):
        s = words[g[0]]["start"]
        e = words[g[-1]]["end"]
        if pad:
            prev_end = words[g[0] - 1]["end"] if g[0] > 0 else 0.0
            nxt_start = (words[g[-1] + 1]["start"] if g[-1] + 1 < len(words)
                         else (audio_duration if audio_duration else e + pad))
            s = max(0.0, max(prev_end, s - pad))
            e = min(audio_duration if audio_duration else e + pad, min(nxt_start, e + pad))
        text = " ".join(words[i]["word"] for i in g)
        text = re.sub(r"\s+([,.!?;:])", r"\1", text).strip()
        phrases.append({
            "id": pid,
            "text": text,
            "start": r3(s),
            "end": r3(e),
            "duration": r3(e - s),
            "word_ids": g,
        })
    return phrases


def hhmmss(t, sep=":", ms=False):
    t = max(0.0, float(t))
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = t % 60
    if ms:
        return f"{h:02d}{sep}{m:02d}{sep}{int(s):02d},{int(round((s - int(s)) * 1000)):03d}"
    return f"{h:02d}{sep}{m:02d}{sep}{int(s):02d}"


def write_txt(phrases, path, para_gap=1.2, para_max=35.0):
    """Plain text, one [HH:MM:SS] stamp per paragraph."""
    paras = []
    cur = []
    for i, p in enumerate(phrases):
        cur.append(p)
        nxt = phrases[i + 1] if i + 1 < len(phrases) else None
        span = p["end"] - cur[0]["start"]
        gap = (nxt["start"] - p["end"]) if nxt else None
        ends_sentence = p["text"].rstrip().endswith(HARD_PUNCT)
        if nxt is None or (ends_sentence and (span >= para_max or (gap is not None and gap >= para_gap))):
            paras.append(cur)
            cur = []
    if cur:
        paras.append(cur)

    lines = []
    for para in paras:
        body = " ".join(p["text"] for p in para)
        body = re.sub(r"\s+", " ", body).strip()
        lines.append(f"[{hhmmss(para[0]['start'])}] {body}")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n\n".join(lines) + "\n")
    return len(paras)


def wrap2(text, width=42):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > width:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        lines.append(cur)
    if len(lines) > 2:
        mid = (len(words) + 1) // 2
        lines = [" ".join(words[:mid]), " ".join(words[mid:])]
    return lines


def write_srt(phrases, path, max_dur=6.0, max_chars=84):
    cues = []
    cur = None
    for p in phrases:
        if cur is None:
            cur = {"start": p["start"], "end": p["end"], "text": p["text"]}
            continue
        cand_text = f"{cur['text']} {p['text']}"
        if (p["end"] - cur["start"] <= max_dur and len(cand_text) <= max_chars
                and p["start"] - cur["end"] < 0.8):
            cur["end"] = p["end"]
            cur["text"] = cand_text
        else:
            cues.append(cur)
            cur = {"start": p["start"], "end": p["end"], "text": p["text"]}
    if cur:
        cues.append(cur)

    with open(path, "w", encoding="utf-8") as f:
        for n, c in enumerate(cues, 1):
            end = max(c["end"], c["start"] + 0.2)
            f.write(f"{n}\n{hhmmss(c['start'], ms=True)} --> {hhmmss(end, ms=True)}\n")
            f.write("\n".join(wrap2(c["text"])) + "\n\n")
    return len(cues)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default=RAW)
    ap.add_argument("--outdir", default=OUTDIR)
    ap.add_argument("--duration", type=float, required=True)
    ap.add_argument("--gap", type=float, default=0.25)
    ap.add_argument("--max-dur", type=float, default=4.0)
    ap.add_argument("--min-dur", type=float, default=1.0)
    ap.add_argument("--pad", type=float, default=0.0,
                    help="also write phrases_padded.json with boundaries padded by this many seconds")
    args = ap.parse_args()

    os.makedirs(args.outdir, exist_ok=True)
    words, meta, n_repaired = load_words(args.raw, args.duration)

    with open(os.path.join(args.outdir, "words.json"), "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False, indent=1)

    groups = split_phrases(words, args.gap, args.max_dur, args.min_dur)
    phrases = make_phrases(words, groups, pad=0.0, audio_duration=args.duration)
    with open(os.path.join(args.outdir, "phrases.json"), "w", encoding="utf-8") as f:
        json.dump(phrases, f, ensure_ascii=False, indent=1)

    if args.pad > 0:
        padded = make_phrases(words, groups, pad=args.pad, audio_duration=args.duration)
        with open(os.path.join(args.outdir, "phrases_padded.json"), "w", encoding="utf-8") as f:
            json.dump(padded, f, ensure_ascii=False, indent=1)

    n_para = write_txt(phrases, os.path.join(args.outdir, "transcript.txt"))
    n_cues = write_srt(phrases, os.path.join(args.outdir, "transcript.srt"))

    # ---- English alongside, for a source that was not spoken in English
    # The tagger and the link sequencer read English. A non-English source is
    # cut on its own aligned words - those are the ones in the audio - so the
    # translation is mapped onto the phrases by time overlap rather than
    # replacing them: phrase 41 keeps its Arabic text and its real timings,
    # and phrases_en.json says what phrase 41 means.
    n_en = 0
    tr = json.load(open(args.raw, encoding="utf-8")).get("translation")
    if tr:
        en = {}
        for ph in phrases:
            a, b = ph["start"], ph["end"]
            hit = [t["text"] for t in tr
                   if (t.get("text") or "").strip()
                   and min(b, t["end"]) - max(a, t["start"]) > 0]
            if hit:
                en[str(ph["id"])] = " ".join(hit).strip()
        with open(os.path.join(args.outdir, "phrases_en.json"), "w",
                  encoding="utf-8") as f:
            json.dump(en, f, ensure_ascii=False, indent=1)
        with open(os.path.join(args.outdir, "transcript_en.txt"), "w",
                  encoding="utf-8") as f:
            lines = [t["text"].strip() for t in tr
                     if (t.get("text") or "").strip()]
            f.write(os.linesep.join(lines) + os.linesep)
        n_en = len(en)

    print(json.dumps({
        "words": len(words),
        "words_with_repaired_timing": n_repaired,
        "phrases": len(phrases),
        "paragraphs": n_para,
        "srt_cues": n_cues,
        "phrases_translated": n_en,
        "asr_meta": meta,
    }, indent=2))


if __name__ == "__main__":
    main()
