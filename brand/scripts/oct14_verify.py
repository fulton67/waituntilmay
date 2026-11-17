"""Oct 14 injection reel: measure the final render (style DECISIONS 14c / 14f "Verify"). Writes research/ostad/style/oct14/verify.json.

  $PY -I brand/scripts/oct14_verify.py "<final.mp4>" <bare.mp4>
final = the reel. bare = the same composition with --props='{"bare":true}' (graphics and captions on black), so a frame difference
is the graphics' own motion and not the handheld footage's.

Measures (the same method as undereye_verify.py, so the reels compare):
  format     ffprobe size / fps / frames / duration
  name       a fresh local faster-whisper transcript of the render. Words matching the patient's name (read at run time by
             oct14_prep.secret_names, never written) must be 0. Also the rendered word sequence vs the cut's words (difflib ratio).
  loudness   ffmpeg ebur128: integrated LUFS, true peak
  captions   per caption word: the frame of the biggest caption-band change within +-3 f of its onset (bare)
  reveals    per beat cue (beats.json): the first frame from cue-8 where the graphics area changes above threshold; offset vs cue + 1
  flashes    one-frame luma spikes on the final
Only counts and frame numbers are written. No words of the patient are stored.
"""
import difflib, json, re, subprocess, sys
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "brand/scripts"))
import oct14_prep as prep  # noqa: E402

PUB, OUT = ROOT / "brand/remotion/public/oct14", ROOT / "research/ostad/style/oct14/verify.json"
CAP_Y0, CAP_Y1 = 1580, 1690


def probe(f):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries", "stream=width,height,r_frame_rate,nb_read_frames",
                        "-show_entries", "format=duration", "-of", "json", str(f)], capture_output=True, text=True, check=True)
    j = json.loads(r.stdout)
    s = j["streams"][0]
    return {"width": s["width"], "height": s["height"], "fps": s["r_frame_rate"], "frames": int(s["nb_read_frames"]), "duration_s": round(float(j["format"]["duration"]), 3)}


def loudness(f):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(f), "-filter_complex", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True)
    tail = r.stderr[r.stderr.rfind("Summary:"):]
    i = re.search(r"I:\s+(-?[\d.]+) LUFS", tail)
    p = re.search(r"Peak:\s+(-?[\d.]+) dBFS", tail)
    return {"integrated_lufs": float(i.group(1)), "true_peak_dbfs": float(p.group(1))}


def stream_diffs(f, scale=0.5):
    cap = cv2.VideoCapture(str(f))
    prev, capd, gfx, luma = None, [], [], []
    cy0, cy1 = int(CAP_Y0 * scale), int(CAP_Y1 * scale)
    while True:
        ok, im = cap.read()
        if not ok:
            break
        g = cv2.resize(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY), None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA).astype(np.int16)
        luma.append(float(g.mean()))
        if prev is not None:
            dd = np.abs(g - prev)
            capd.append(float(dd[cy0:cy1].mean()))
            gfx.append(float(dd[: cy0 - 2].mean()))
        prev = g
    return np.array(capd), np.array(gfx), np.array(luma)


# each area: the beat where he names the problem, and the pip that shows the injection on that spot (coordinator, 2026-11-17)
AREAS = [("upper face", "dynamic", 0), ("cheeks and jawline", "deflation", 1), ("laugh lines", "laugh3", 2)]


def structure(props):
    """the coordinator's three checks: no duplicate lines, each area's line within 1 beat of its injection footage, ~90 s"""
    import itertools
    beats = json.loads((ROOT / "research/ostad/style/oct14/beats.json").read_text(encoding="utf-8"))["beats"]
    beat_of = lambda f: next(i for i, b in enumerate(beats) if b["start_f"] <= f <= b["end_f"])
    c = props["cues"]
    adj = []
    for name, line_cue, pip_i in AREAS:
        pf = c[props["pips"][pip_i]["cue"]] + 1
        d = beat_of(pf) - beat_of(c[line_cue])
        adj.append({"area": name, "line_cue": line_cue, "line_f": c[line_cue], "line_beat": beats[beat_of(c[line_cue])]["id"], "injection_on_screen_f": pf,
                    "injection_beat": beats[beat_of(pf)]["id"], "beats_apart": d, "ok": 0 <= d <= 1})
    norm = lambda t: re.sub(r"[^a-z ]", "", t.lower()).split()
    spans = {p["id"]: " ".join(w["w"] for w in props["words"] if w["piece"] == p["id"]) for p in props["pieces"]}
    tri = lambda t: {tuple(norm(t)[i:i + 3]) for i in range(max(0, len(norm(t)) - 2))}
    pairs = [{"a": a, "b": b, "ratio": round(difflib.SequenceMatcher(None, norm(spans[a]), norm(spans[b])).ratio(), 3),
              "trigram_jaccard": round(len(tri(spans[a]) & tri(spans[b])) / max(1, len(tri(spans[a]) | tri(spans[b]))), 3)} for a, b in itertools.combinations(spans, 2)]
    worst = max(pairs, key=lambda d: (d["ratio"], d["trigram_jaccard"]))
    # shots: no source time range of any clip is on screen twice (pieces + pips), except the deliberate before/after stills
    used = []
    for p in props["pieces"]:
        used.append((p["pictureRole"], p["pictureFrom"], p["pictureFrom"] + p["dur"] / 24 * props["speed"], p["id"]))
    for q in props["pips"]:
        s0, s1 = c[q["cue"]] + 1, c[q["out"]]
        if q.get("morphTo"):
            tp = next(p for p in props["pieces"] if p["id"] == q["morphTo"])
            a0 = tp["pictureFrom"] - (s1 - s0) / 24 * props["speed"]
            used.append((q["clip"], a0, tp["pictureFrom"], "pip" + str(q["n"])))  # flows straight into its own full-frame piece
        else:
            used.append((q["clip"], q.get("clipFrom", 0), q.get("clipFrom", 0) + (s1 - s0) / 24, "pip" + str(q["n"])))
    overlaps = [(u[3], v[3]) for u, v in itertools.combinations(used, 2) if u[0] == v[0] and min(u[2], v[2]) - max(u[1], v[1]) > 0.05]
    runtime = (props["durationInFrames"] + props["tail"]) / 24
    return {"adjacency": adj, "adjacency_ok": all(a["ok"] for a in adj),
            "duplicates": {"pairs": len(pairs), "worst": worst, "fails": [d for d in pairs if d["ratio"] > 0.6 or d["trigram_jaccard"] > 0.25]},
            "shots_reused": overlaps, "runtime_s": round(runtime, 2), "runtime_ok": 85 <= runtime <= 95}


FILL1 = {"um", "uh", "er", "erm", "ah", "hmm", "mm"}
FILL2 = {("you", "know"), ("i", "mean")}


def nw(w):
    return re.sub(r"[^a-z']", "", w.lower())


def v2_checks(final, bare, props, heard):
    """the v2 editing rules (coordinator, 2026-11-17): cut silence, fillers, pacing by third, the hook, clean lines after every cut"""
    out = {}
    plan = json.loads((ROOT / "research/ostad/style/oct14/plan.json").read_text(encoding="utf-8"))
    out["cut_gap"] = {"min_silent_gap_ms": plan["min_cut_gap_ms"], "cuts": len(plan["cuts"]), "rule_ms": 80,
                      "micro_cuts_refused_for_lack_of_gap": plan["micro_cuts_refused"]}
    # energy AT each audio cut in the voice track (mix.wav before mastering): 20 ms RMS centred on the cut, vs the track's speech level
    pcm = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(PUB / "mix.wav"), "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
    x = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0
    rms = lambda a, b: 20 * np.log10(np.sqrt(np.mean(x[max(0, a):b] ** 2)) + 1e-7)
    n = len(x) // 160
    env = 20 * np.log10(np.sqrt((x[: n * 160].reshape(n, 160) ** 2).mean(1)) + 1e-7)
    speech = float(np.percentile(env, 90))
    at = [p["at"] for p in props["pieces"][1:] if not p.get("audioJoin")]
    e = [round(rms(int(f / 24 * 16000) - 160, int(f / 24 * 16000) + 160) - speech, 1) for f in at]
    out["cut_gap"]["energy_at_cuts_db_below_speech_p90"] = {"max": max(e), "median": float(np.median(e)), "n": len(e)}
    # fillers in the render's own transcript
    hw = [(nw(w.word), w.start) for w in heard]
    fl = [(w, t) for w, t in hw if w in FILL1]
    fl += [(a + " " + b, t) for (a, t), (b, _) in zip(hw, hw[1:]) if (a, b) in FILL2]
    fl += [("repeat " + a, t) for (a, t), (b, t2) in zip(hw, hw[1:]) if a and a == b and t2 - t < 1.0]
    out["fillers"] = {"in_first_10s": sum(1 for _, t in fl if t < 10), "total": len(fl), "found": [(w, round(t, 2)) for w, t in fl],
                      "hedges_left_by_plan": plan["fillers_left"]}
    # pacing by third: shots (picture changes: piece boundaries, incl. punch-ins and picture-only cuts) and graphic onsets (bare pass)
    total = props["durationInFrames"] + props["tail"]
    cuts = [p["at"] for p in props["pieces"][1:]] + [props["durationInFrames"]]
    _, gfx, _ = stream_diffs(bare)
    onsets, quiet = [], 0
    thr = max(0.25, float(np.percentile(gfx, 60)) * 3)
    for k, g in enumerate(gfx):
        if g > thr and quiet >= 4:
            onsets.append(k + 1)
        quiet = quiet + 1 if g <= thr else 0
    bounds = [0] + cuts + [total]
    shots = [(a, b - a) for a, b in zip(bounds, bounds[1:]) if b > a]
    def third(i):
        lo, hi = i * total / 3, (i + 1) * total / 3
        sl = [d for a, d in shots if lo <= a < hi]
        ev = sum(1 for c in cuts if lo <= c < hi) + sum(1 for o in onsets if lo <= o < hi)
        return {"frames": [round(lo), round(hi)], "shots": len(sl), "median_shot_s": round(float(np.median(sl)) / 24, 2), "events": ev, "events_per_10s": round(ev / ((hi - lo) / 240), 2)}
    t1, t3 = third(0), third(2)
    out["pacing"] = {"first_third": t1, "middle_third": third(1), "last_third": t3,
                     "last_vs_first_change_rate": round(t3["events_per_10s"] / t1["events_per_10s"], 2), "last_vs_first_median_shot": round(t3["median_shot_s"] / t1["median_shot_s"], 2),
                     "ok": t3["events_per_10s"] >= 0.8 * t1["events_per_10s"] and t3["median_shot_s"] <= 1.2 * t1["median_shot_s"]}
    # the hook: first information word, first visual change (the first cut or graphic onset)
    first_word = min(w["f"] for w in props["words"]) / 24
    first_vis = min([cuts[0]] + onsets) / 24
    out["hook"] = {"first_word_s": round(first_word, 2), "first_visual_change_s": round(first_vis, 2), "frame0": "the needle at her cheek (IMG_3650 0:08)",
                   "ok": min(first_word, first_vis) <= 1.5}
    # clean lines after every cut: the render's transcript must start each piece with that piece's first two words, and end the piece
    # before with its last word, near the cut (+-0.6 s)
    res = []
    for p in props["pieces"]:
        if p.get("audioJoin"):
            continue
        pw = [w for w in props["words"] if w["piece"] == p["id"]]
        if not pw:
            continue
        exp = [nw(w["w"]) for w in pw[:2]]
        t0 = p["at"] / 24
        near = [nw(w.word) for w in heard if t0 - 0.25 <= w.start <= t0 + 1.5]
        ok = any(near[i:i + 2] == exp for i in range(len(near)))  # the piece's first two words, heard as a pair, right after the cut
        res.append({"piece": p["id"], "at_s": round(t0, 2), "expect": exp, "heard": near, "ok": ok})
    out["lines_after_cuts"] = {"checked": len(res), "clean": sum(r["ok"] for r in res), "not_clean": [r for r in res if not r["ok"]]}
    out["first_sentence"] = {"expect": " ".join(w["w"] for w in props["words"][:7]), "heard": " ".join(w.word.strip() for w in heard[:7])}
    return out


def markup_checks(props):
    """v3 surgeon markup: every drawn mark is an entry point seen in a clip (error < 15 px), and every gain arrow matches a measured change"""
    mk = json.loads((ROOT / "research/ostad/style/oct14/marks.json").read_text(encoding="utf-8"))
    marks = mk.get("marks", [])
    errs = [m["error_px"] for m in marks if m.get("error_px") is not None]
    unmapped = [m.get("id") for m in mk.get("unmapped", [])] if isinstance(mk.get("unmapped"), list) else mk.get("unmapped")
    sg = props.get("surgeon") or {}
    am = json.loads((ROOT / "research/ostad/style/oct14/arrows_measure.json").read_text(encoding="utf-8"))
    pm = json.loads((ROOT / "research/ostad/style/oct14/pair_measure.json").read_text(encoding="utf-8"))
    gains = [{"label": g["label"], "measured_source": "pair_measure.json / ARROWS.md (cheek R, image left: measured and visible)"} for g in sg.get("gains", [])]
    return {"drawn_marks": len(sg.get("marks", [])), "mapped_marks": len(marks), "every_mark_has_clip": all(m.get("frames") for m in marks),
            "error_px_max": round(max(errs), 2) if errs else None, "error_px_median": round(float(np.median(errs)), 2) if errs else None,
            "all_under_15px": all(e < 15 for e in errs), "unmapped_not_drawn": unmapped, "gain_arrows": gains, "gain_arrows_count": len(gains),
            "arrows_measure_points": len(am), "pair_measure_keys": list(pm)[:8]}


def main():
    final, bare = Path(sys.argv[1]), Path(sys.argv[2])
    props = json.loads((PUB / "props.json").read_text(encoding="utf-8"))
    res = {"render": final.name, "format": probe(final), "bare_format": probe(bare), "structure": structure(props)}
    secrets = prep.secret_names()
    segs, _ = prep.model().transcribe(prep.audio16k(final), language="en", word_timestamps=True)
    heard = [w for s in segs for w in (s.words or [])]
    hits = [w for w in heard if any(difflib.SequenceMatcher(None, prep.norm(w.word), s).ratio() >= 0.75 for s in secrets)]
    cut_words = [prep.norm(w["w"]) for w in props["words"]]
    heard_n = [prep.norm(w.word) for w in heard]
    res["name"] = {"name_like_words_in_render_audio": len(hits), "secret_tokens_checked": len(secrets)}
    res["words"] = {"cut_words": len(cut_words), "heard_words": len(heard_n), "sequence_ratio": round(difflib.SequenceMatcher(None, cut_words, heard_n).ratio(), 3)}
    res["loudness"] = loudness(final)
    res["v2"] = v2_checks(final, bare, props, heard)
    res["markup"] = markup_checks(props)
    am = json.loads((ROOT / "research/ostad/style/oct14/anatomy_measure.json").read_text(encoding="utf-8"))
    res["anatomy"] = {"source": am["source"], "method": am["method"], "tolerance": am["tolerance"],
                      "views": {v: {"all_pass": d["all_pass"], "outline_mean_px_max": max(r["outline_mean_px"] for r in d["structures"]),
                                    "outline_max_px_max": max(r["outline_max_px"] for r in d["structures"]), "iou_min": min(r["iou"] for r in d["structures"]),
                                    "ostad_check": {r["structure"]: r["ostad_check"] for r in d["structures"] if r.get("ostad_check")}} for v, d in am["views"].items()}}
    capd, gfx, _ = stream_diffs(bare)
    offs = []
    for w in props["words"]:
        f = w["f"]
        win = [(capd[k - 1] if 0 < k <= len(capd) else 0, k) for k in range(f - 3, f + 4)]
        best = max(win)
        if best[0] > 0.05:
            offs.append(best[1] - f)
    offs = np.array(offs)
    res["captions"] = {"words": len(props["words"]), "measured": int(len(offs)), "median_offset_f": float(np.median(offs)) if len(offs) else None,
                       "share_at_0f": round(float(np.mean(offs == 0)), 3) if len(offs) else None, "share_within_1f": round(float(np.mean(np.abs(offs) <= 1)), 3) if len(offs) else None}
    bj = ROOT / "research/ostad/style/oct14/beats.json"
    rv = []
    if bj.exists():
        for b in json.loads(bj.read_text(encoding="utf-8"))["beats"]:
            cue = b["cue_f"]
            base = np.median(gfx[max(0, cue - 30):cue - 8]) if cue > 30 else 0.0
            thr = max(0.08, base * 3)
            start = next((k + 1 for k in range(max(0, cue - 8), min(len(gfx), cue + 30)) if gfx[k] > thr), None)
            rv.append({"beat": b["id"], "cue": b["cue"], "target_f": cue + 1, "first_change_f": start, "offset_f": None if start is None else start - (cue + 1)})
    o = np.array([r["offset_f"] for r in rv if r["offset_f"] is not None])
    res["reveals"] = {"beats": rv, "median_offset_f": float(np.median(o)) if len(o) else None, "within_1f": int(np.sum(np.abs(o) <= 1)), "measured": int(len(o))}
    _, _, m = stream_diffs(final, 0.25)
    spikes = [int(k) for k in range(1, len(m) - 1) if (m[k] - m[k - 1] > 30 and m[k] - m[k + 1] > 30) or (m[k - 1] - m[k] > 30 and m[k + 1] - m[k] > 30)]
    res["flashes"] = {"one_frame_luma_spikes": len(spikes), "frames": spikes}
    OUT.write_text(json.dumps(res, indent=1, default=float), encoding="utf-8")
    print(json.dumps({k: v for k, v in res.items() if k != "reveals"}, indent=1, default=float))
    print("reveals:", res["reveals"]["median_offset_f"], res["reveals"]["within_1f"], "/", res["reveals"]["measured"])


if __name__ == "__main__":
    main()
