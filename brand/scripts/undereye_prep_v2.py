"""Under-eye filler reel v2 (user notes 2026-11-17): the cut, cut only in silence, fillers out, one dialogue track with 15 ms fades.

  $PY -I brand/scripts/undereye_prep_v2.py check   # resolve research/ostad/style/undereye/cut_v2.json, print every cut's gap
  $PY -I brand/scripts/undereye_prep_v2.py build   # + the dialogue track and public/undereye-filler/props_v2.json

Cut rules (note 1):
  - every in and out point sits inside a silence gap >= 80 ms measured on the audio (undereye_gaps.py), never on a word boundary
    guessed from the recogniser: the in point is 25 ms before the gap's end (or its middle if shorter than 50 ms), the out point
    25 ms after the gap's start (or its middle), so >= 25 ms of silence is kept on each side of the join and no phoneme is clipped;
  - a piece whose boundary word has no gap next to it is refused (exit 1) and a different word must be chosen;
  - `drop` removes words inside a piece (fillers, repeats, restarts) with the same rule at both ends of the drop;
  - each join gets a 15 ms fade-out / fade-in (afade) in the dialogue track, so nothing pops (note 1).
Fillers (note 2): um / uh / er / ah / hmm, a word or two-word phrase repeated within 1 s, and the `restart` spans named in the cut,
counted before and after the cut (verify).
The dialogue track: each piece's audio from the transcoded clip (loudnorm'd), atempo to the edit speed, padded or trimmed to its
whole number of composition frames, faded 15 ms at both ends, concatenated: brand/remotion/public/undereye-filler/dialogue_v2.wav.
(Remotion's volume works per frame, 42 ms at 24 fps, too coarse for a 10-20 ms fade, so the dialogue track is assembled here.)
No name: the words files are redacted on read (undereye_prep.py); a piece or drop that would keep a "[name]" word is refused.
"""
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "brand/scripts"))
import undereye_gaps as G  # noqa: E402
from undereye_prep import norm  # noqa: E402

CUT = ROOT / "research/ostad/style/undereye/cut_v2.json"
EDIT, PUB = G.EDIT, G.PUB
FADE, KEEP = 0.015, 0.025
FILLERS = {"um", "uh", "uhm", "er", "ah", "hmm", "erm"}


def words(clip):
    return json.loads((EDIT / f"words_{clip}.json").read_text(encoding="utf-8"))["words"]


def find(ws, phrase, lo=0, n=1, last=False):
    toks = [norm(t) for t in phrase.split() if norm(t)]
    seen = 0
    for i in range(lo, len(ws) - len(toks) + 1):
        if all(norm(ws[i + k]["w"]) == t for k, t in enumerate(toks)):
            seen += 1
            if seen == n:
                return (i + len(toks) - 1) if last else i
    raise SystemExit(f"phrase not found: {phrase!r}")


def _pick(clip, lo, hi, side):
    """The silence gap >= 80 ms nearest the word, between two word onsets: for an in point its END lies in (lo, hi]; for an out point its
    START lies in [lo, hi). (A pause can run a little past the recogniser's onset; the cut point keeps 25 ms from the speech side.)"""
    c = [(s, e) for s, e in G.gaps(clip) if (lo < e <= hi if side == "in" else lo <= s < hi)]
    if not c:
        return None
    # the pause right next to the word: the latest one before an in point, the earliest one after an out point
    return max(c, key=lambda g: g[1]) if side == "in" else min(c, key=lambda g: g[0])


def snap_in(clip, ws, i):
    """In point before word i: the latest gap that ends by the recogniser's onset + 60 ms (after the previous word's end); if there is
    none, by the onset + 250 ms (onsets run early or late). Measured on the pieces: a gap that ends well after the onset is usually a
    dip inside the word."""
    lo = ws[i - 1]["e"] - 0.06 if i > 0 else 0.0
    g = _pick(clip, lo, ws[i]["s"] + 0.06, "in") or _pick(clip, (ws[i - 1]["s"] + 0.08) if i > 0 else 0.0, ws[i]["s"] + 0.25, "in")
    if not g:
        return None, None
    return place_in(g, ws[i]["s"]), round(g[1] - g[0], 3)


def place_in(g, onset):
    """In point inside gap g: 60 ms before the recogniser's onset if that is inside the gap, never closer than 25 ms to its edges."""
    if g[1] - g[0] < 2 * KEEP:
        return round((g[0] + g[1]) / 2, 3)
    return round(max(g[0] + KEEP, min(g[1] - KEEP, onset - 0.06)), 3)


def place_out(g, end):
    """Out point inside gap g: 60 ms after the recogniser's word end if that is inside the gap (a soft word ending such as '-ing'
    can fall under the silence threshold), never closer than 25 ms to the gap's edges."""
    if g[1] - g[0] < 2 * KEEP:
        return round((g[0] + g[1]) / 2, 3)
    return round(min(g[1] - KEEP, max(g[0] + KEEP, end + 0.06)), 3)


def snap_out(clip, ws, i):
    """Out point after word i: the earliest gap that starts at or after the recogniser's word end - 60 ms (before the next onset);
    if there is none, after the onset + 80 ms. (A gap soon after the onset can be a dip between syllables: 'pro|cedure'.)"""
    hi = ws[i + 1]["s"] + 0.12 if i + 1 < len(ws) else ws[i]["e"] + 1.0
    g = _pick(clip, ws[i]["e"] - 0.06, hi, "out") or _pick(clip, ws[i]["s"] + 0.08, hi, "out")
    if not g:
        return None, None
    return place_out(g, ws[i]["e"]), round(g[1] - g[0], 3)


def filler_spans(ws):
    """Indices of fillers and repeats (a word or a two-word phrase said again within 1 s)."""
    bad = set()
    for i, w in enumerate(ws):
        n = norm(w["w"])
        if n in FILLERS:
            bad.add(i)
        if i >= 1 and n and n == norm(ws[i - 1]["w"]) and w["s"] - ws[i - 1]["s"] < 1.0:
            bad.add(i - 1)
        if i >= 3 and n and [norm(ws[i - 3]["w"]), norm(ws[i - 2]["w"])] == [norm(ws[i - 1]["w"]), n] and w["s"] - ws[i - 2]["s"] < 1.0:
            bad.update({i - 3, i - 2})
    return bad


def resolve():
    cut = json.loads(CUT.read_text(encoding="utf-8"))
    out, report, ok = [], [], True
    for pc in cut["pieces"]:
        clip, ws = pc["clip"], words(pc["clip"])
        i0, i1 = find(ws, pc["start"], n=pc.get("n", 1)), None
        i1 = find(ws, pc["end"], lo=i0, last=True)
        drops = []
        for d in pc.get("drop", []):
            a = find(ws, d, lo=i0)
            drops.append((a, a + len([t for t in d.split() if norm(t)]) - 1))
        # sub-pieces between the drops
        spans, cur = [], i0
        for a, b in sorted(drops):
            spans.append((cur, a - 1))
            cur = b + 1
        spans.append((cur, i1))
        for k, (a, b) in enumerate(spans):
            if any(w.get("redacted") for w in ws[a:b + 1]):
                raise SystemExit(f"{pc['id']} keeps a redacted word")
            t0, g0 = snap_in(clip, ws, a)
            t1, g1 = snap_out(clip, ws, b)
            # an explicit pause, named by a time inside it, where the recogniser's onsets are visibly off (a word stretched over the
            # pause): the gap must still be >= 80 ms of measured silence
            if k == 0 and "in_gap" in pc:
                g = G.gap_at(clip, pc["in_gap"])
                # a named pause: the recogniser's onset is off, so keep 60 ms of the pause before the speech (25 ms if the pause is short)
                lead = pc.get("in_lead", 0.06 if g and g[1] - g[0] >= 0.12 else KEEP)  # in_lead: more of the pause kept (a soft first word)
                t0, g0 = (round(max(g[0] + KEEP, g[1] - lead), 3), round(g[1] - g[0], 3)) if g else (None, None)
            if k == len(spans) - 1 and "out_gap" in pc:
                g = G.gap_at(clip, pc["out_gap"])
                t1, g1 = (place_out(g, ws[b]["e"]), round(g[1] - g[0], 3)) if g else (None, None)
            sid = pc["id"] + ("" if len(spans) == 1 else "abcdefgh"[k])
            good = t0 is not None and t1 is not None
            ok &= good
            report.append(f"{sid:5s} {clip} in {t0} (gap {g0}) '{ws[a]['w']}' .. '{ws[b]['w']}' out {t1} (gap {g1}) {'ok' if good else 'NO GAP'}")
            base = {k2: v for k2, v in pc.items() if k2 not in ("start", "end", "drop", "in_gap", "out_gap", "in_lead", "cut_t")}
            # cut_t: [[ta, tb], ...] a stutter inside a word span that the recogniser hears as one word ("bo- bothered"): cut from the
            # pause containing ta to the pause containing tb (both measured, >= 80 ms), re-transcribed to confirm it plays once
            cuts = [(G.gap_at(clip, ta), G.gap_at(clip, tb)) for ta, tb in pc.get("cut_t", [])] if k == 0 else []
            if any(ga is None or gb is None for ga, gb in cuts):
                raise SystemExit(f"{sid}: a cut_t point is not inside a silence gap")
            if not cuts:
                out.append({**base, "id": sid, "from": t0, "to": t1, "gap_in": g0, "gap_out": g1, "w0": a, "w1": b, "sub": k, "subs": len(spans)})
                continue
            bounds = [(t0, g0)]
            edges = [t0 - 1] + [x for ga, gb in cuts for x in (ga[1], gb[0])] + [t1 + 1]  # word midpoints split on the gaps
            for ga, gb in cuts:
                bounds += [(round(ga[0] + KEEP, 3), round(ga[1] - ga[0], 3)), (round(gb[1] - KEEP, 3), round(gb[1] - gb[0], 3))]
            bounds.append((t1, g1))
            for j in range(0, len(bounds), 2):
                (f0, gi), (f1, go) = bounds[j], bounds[j + 1]
                lo_, hi_ = edges[j], edges[j + 1]
                wi = [i for i in range(a, b + 1) if lo_ <= (ws[i]["s"] + ws[i]["e"]) / 2 < hi_] or [a]
                out.append({**base, "id": f"{sid}{'xyz'[j // 2]}", "from": f0, "to": f1, "gap_in": gi, "gap_out": go, "w0": wi[0], "w1": wi[-1], "sub": j // 2, "subs": len(bounds) // 2})
                report.append(f"   {sid}{'xyz'[j // 2]} stutter cut: {f0}..{f1}")
    return cut, out, report, ok


def stat():
    """The measured under-eye shadow (beforeafter.json): |under-eye minus cheek L*|, both sides averaged, Sept 20 and Oct 4."""
    f = ROOT / "research/ostad/style/undereye/beforeafter.json"
    if not f.exists():
        return None
    sd = json.loads(f.read_text(encoding="utf-8"))["sides"]
    b = sum(abs(v["under_minus_cheek_before"]) for v in sd.values()) / len(sd)
    a = sum(abs(v["under_minus_cheek_after"]) for v in sd.values()) / len(sd)
    return {"before": round(b), "after": round(a)}


def ai_slots():
    """AI illustration slots that exist (research/ostad/style/undereye/AI_SLOTS.md): copied from the gitignored edit folder to public/."""
    import shutil
    src, dst = EDIT / "ai", PUB / "ai"
    found = []
    if src.exists():
        dst.mkdir(parents=True, exist_ok=True)
        for f in sorted(src.glob("*.png")):
            shutil.copy2(f, dst / f.name)
            found.append(f.stem)
    return found


def main():
    cut, pieces, report, ok = resolve()
    print("\n".join(report))
    if not ok:
        raise SystemExit("some cut has no silence gap >= 80 ms: choose other words")
    if sys.argv[1] != "build":
        return
    fps, speed = cut["fps"], cut["speed"]
    at, wav_parts, words_out = 0, [], []
    for p in pieces:
        ws = words(p["clip"])
        dur = round((p["to"] - p["from"]) / speed * fps)
        p.update(at=at, dur=dur)
        for k in range(p["w0"], p["w1"] + 1):
            w = ws[k]
            f0 = at + round((w["s"] - p["from"]) / speed * fps)
            words_out.append({"w": w["w"], "f": max(at, f0), "f1": max(f0 + 1, at + round((w["e"] - p["from"]) / speed * fps)), "piece": p["id"],
                              "voice": p.get("voice", "ostad"), "fill": k in filler_spans(ws)})
        part = EDIT / f"_a_{p['id']}.wav"
        T = dur / fps
        af = f"atrim={p['from']}:{p['to']},asetpts=PTS-STARTPTS,atempo={speed},apad,atrim=0:{T:.6f},afade=t=in:d={FADE},afade=t=out:st={T - FADE:.6f}:d={FADE}"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(PUB / f"{p['clip']}.mp4"), "-vn", "-af", af, "-ar", "48000", "-ac", "2", str(part)], check=True)
        wav_parts.append(part)
        at += dur
    # pictures: each `pics` entry runs from its word (or the piece start) to the next entry (or the piece end)
    for p in pieces:
        pw = [w for w in words_out if w["piece"] == p["id"]]
        segs = []
        for q in p.get("pics", [{"clip": p["clip"]}]):
            f0 = p["at"]
            if "w" in q:
                hit = [w for w in pw if norm(w["w"]) == norm(q["w"])]
                if not hit:
                    continue  # the word is in another sub-piece
                f0 = hit[0]["f"]
            segs.append({**q, "f0": f0})
        segs.sort(key=lambda q: q["f0"])
        # a micro-cut inside a piece (a drop or a stutter cut) on the same shot: change the framing so the jump reads as a punch-in
        if p.get("sub", 0) > 0 and segs and "clip" in segs[0]:
            segs[0] = {**segs[0], "scale": 1.0 if segs[0].get("scale", 1.0) != 1.0 else 1.12, "ox": segs[0].get("ox", 540), "oy": segs[0].get("oy", 760)}
        for k, q in enumerate(segs):
            q["f1"] = segs[k + 1]["f0"] if k + 1 < len(segs) else p["at"] + p["dur"]
            if "clip" in q:
                q["src"] = round(q["from"] + (q["f0"] - p["at"]) / fps * speed * 0 if "from" in q else p["from"] + (q["f0"] - p["at"]) / fps * speed, 3)
                q.pop("w", None)
        p["pics"] = segs
    lst = EDIT / "_a_list.txt"
    lst.write_text("".join(f"file '{q.as_posix()}'\n" for q in wav_parts), encoding="utf-8")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "pcm_s16le", str(PUB / "dialogue_v2.wav")], check=True)
    for q in wav_parts:
        q.unlink()
    cues = {}
    for key, (pid, word, occ) in cut["cues"].items():
        cand = [w for w in words_out if w["piece"].startswith(pid) and norm(w["w"]) == norm(word)]
        if len(cand) < occ:
            raise SystemExit(f"cue {key}: {word!r} not in {pid}")
        cues[key] = cand[occ - 1]["f"]
    tracks = json.loads((EDIT / "tracks_v2.json").read_text(encoding="utf-8")) if (EDIT / "tracks_v2.json").exists() else {}
    ba = ROOT / "research/ostad/style/undereye/beforeafter.json"
    bands = {}
    if ba.exists():
        B = json.loads(ba.read_text(encoding="utf-8"))
        bands = {k: {"after": v["after"]} for k, v in B["eyes_still_bands"].items() if B["sides"][k]["less_shadow"]}  # measured sides only
    sk = EDIT / "sketch.json"
    props = {"fps": fps, "speed": speed, "durationInFrames": at, "pieces": pieces, "words": words_out, "cues": cues, "tracks": tracks, "bands": bands,
             "sketch": json.loads(sk.read_text(encoding="utf-8")) if sk.exists() else None, "ai": ai_slots(),
             "section": json.loads((EDIT / "anatomy/section_lines.json").read_text(encoding="utf-8")) if (EDIT / "anatomy/section_lines.json").exists() else None,
             "stat": stat()}
    (PUB / "props_v2.json").write_text(json.dumps(props), encoding="utf-8")
    print(f"props_v2: {len(pieces)} pieces, {at} f = {at / fps:.2f} s, {len(words_out)} words, min gap at a cut "
          f"{min(min(p['gap_in'], p['gap_out']) for p in pieces) * 1000:.0f} ms")


def listen():
    """Re-transcribe every piece of the dialogue track alone: the first and last words must be whole (note 1). Writes
    research/ostad/style/undereye/pieces_heard_v2.json (his words only; her introduction is not in any piece)."""
    sys.path.insert(0, str(ROOT / "research/ostad/style/tools"))
    import common
    common.cuda_dlls()
    from faster_whisper import WhisperModel
    m = WhisperModel("medium", device="auto", compute_type="auto")
    P = json.loads((PUB / "props_v2.json").read_text(encoding="utf-8"))
    out = {}
    for p in P["pieces"]:
        tmp = EDIT / "_pc.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(p["at"] / 24), "-t", str(p["dur"] / 24), "-i", str(PUB / "dialogue_v2.wav"), str(tmp)], check=True)
        segs, _ = m.transcribe(str(tmp), language="en", beam_size=5)
        heard = " ".join(x.text.strip() for x in segs)
        cut = " ".join(w["w"] for w in P["words"] if w["piece"] == p["id"])
        out[p["id"]] = {"cut": cut, "heard": heard}
        print(f"{p['id']:5s} {heard}")
        tmp.unlink()
    (ROOT / "research/ostad/style/undereye/pieces_heard_v2.json").write_text(json.dumps(out, indent=1), encoding="utf-8")


if __name__ == "__main__":
    listen() if sys.argv[1] == "listen" else main()
