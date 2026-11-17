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
    OUT.write_text(json.dumps(res, indent=1), encoding="utf-8")
    print(json.dumps({k: v for k, v in res.items() if k != "reveals"}, indent=1))
    print("reveals:", res["reveals"]["median_offset_f"], res["reveals"]["within_1f"], "/", res["reveals"]["measured"])


if __name__ == "__main__":
    main()
