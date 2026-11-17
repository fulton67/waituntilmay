"""Under-eye filler reel: measure the render (style DECISIONS 14c / 14f "Verify"). Writes research/ostad/style/undereye/verify.json.

  $PY -I brand/scripts/undereye_verify.py <final.mp4> <bare.mp4> [--proxy]
--proxy: the stills proxy has no audio (the originals are not downloaded), so name / words / loudness are skipped and say so.
final.mp4: the reel. bare.mp4: the same composition with --props bare=true (graphics and captions on black), so a frame difference
is the graphics' own motion, not the handheld footage's.

Measures:
  format         ffprobe size / fps / frames / duration
  name           a fresh faster-whisper transcript of the render: words matching the patient's name (read from the catalog at run time,
                 never written) must be 0; the rendered word sequence vs the cut's words (difflib ratio)
  loudness       ffmpeg ebur128: integrated LUFS, true peak
  captions       for every caption word, the frame where its caption-band region changes most within +-3 f of its onset (bare)
  reveals        for every beat cue, the first frame from cue-8 on where the graphics area (above the caption band) changes by more than
                 the threshold (bare); offset vs the target onset + 1 f
  flashes        one-frame luma spikes on the final (> 30 levels up and back down)
Only counts and frame numbers are written; no words of the patient.
"""
import difflib, json, re, subprocess, sys
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "brand/scripts"))
import undereye_prep as prep  # noqa: E402

PUB, OUT = ROOT / "brand/remotion/public/undereye-filler", ROOT / "research/ostad/style/undereye/verify.json"
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
    """Per step k (frame k -> k+1): mean abs grey change in the caption band and in the graphics area above it; and each frame's mean luma."""
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


def audio_checks(final, props, res):
    sys.path.insert(0, str(ROOT / "research/ostad/style/tools"))
    import common  # noqa: F401
    from faster_whisper import WhisperModel
    secrets = prep.secret_names()
    segs, _ = WhisperModel("medium", device="auto", compute_type="auto").transcribe(str(final), language="en", word_timestamps=True)
    heard = [w for s in segs for w in s.words]
    hits = [w for w in heard if any(difflib.SequenceMatcher(None, prep.norm(w.word), s).ratio() >= 0.75 for s in secrets)]
    cut_words = [prep.norm(w["w"]) for w in props["words"]]
    heard_n = [prep.norm(w.word) for w in heard]
    res["name"] = {"name_like_words_in_render_audio": len(hits), "secret_tokens_checked": len(secrets)}
    res["words"] = {"cut_words": len(cut_words), "heard_words": len(heard_n), "sequence_ratio": round(difflib.SequenceMatcher(None, cut_words, heard_n).ratio(), 3)}
    res["loudness"] = loudness(final)



def main():
    final, bare = Path(sys.argv[1]), Path(sys.argv[2])
    props = json.loads((PUB / "props.json").read_text(encoding="utf-8"))
    res = {"render": final.name, "format": probe(final), "bare_format": probe(bare)}

    proxy = "--proxy" in sys.argv
    res["mode"] = "proxy (catalog stills, catalog timestamps, no audio)" if proxy else "final (original footage, whisper word timings)"
    if proxy:
        res["name"] = res["words"] = res["loudness"] = "n/a: the proxy has no audio track"
    else:
        audio_checks(final, props, res)
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

    beats = json.loads((ROOT / "research/ostad/style/undereye/beats.json").read_text(encoding="utf-8"))["beats"]
    rv = []
    for b in beats:
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
    (OUT.with_name("verify_proxy.json") if proxy else OUT).write_text(json.dumps(res, indent=1), encoding="utf-8")
    print(json.dumps({k: v for k, v in res.items() if k != "reveals"}, indent=1))
    print("reveals:", res["reveals"]["median_offset_f"], res["reveals"]["within_1f"], "/", res["reveals"]["measured"])


if __name__ == "__main__":
    main()
