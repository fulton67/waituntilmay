"""M17: pacing from M16's word timings (+ the audio's own voice activity for dead air).
  words_per_second : words / speaking span (first word start -> last word end); also over the whole video
  pauses           : every gap between consecutive words >= 0.25 s (start, length); median, p90, count per minute
  dead_air_share   : share of the video with neither a word nor voice energy (frame RMS < -45 dBFS over 50 ms windows), and the
                     share with no word at all (music-only stretches count as no-word but not as dead air)
  sentences        : split at . ? ! ; lengths in words and seconds (median, p90)."""
import re

import numpy as np
import soundfile as sf

from common import load_json, out_path, run, wav


def m17(ref, vid, path, P):
    tr = load_json(out_path(ref, vid, "transcript.json"))
    if tr is None:
        raise RuntimeError("needs transcript.json")
    dur = P["duration"]
    if not tr.get("has_audio"):
        return {"has_audio": False}
    W = tr["words"]
    if not W:
        return {"has_audio": True, "words": 0, "dead_air_share": None}
    span = W[-1]["end"] - W[0]["start"]
    gaps = [(W[i]["end"], round(W[i + 1]["start"] - W[i]["end"], 3)) for i in range(len(W) - 1) if W[i + 1]["start"] - W[i]["end"] >= 0.25]
    y, sr = sf.read(wav(path, ref, vid))
    hop = int(0.05 * sr)
    rms = np.array([np.sqrt(np.mean(y[i:i + hop] ** 2)) for i in range(0, len(y) - hop, hop)]) + 1e-9
    db = 20 * np.log10(rms)
    t = np.arange(len(db)) * 0.05
    inword = np.zeros(len(t), bool)
    for w in W:
        inword[(t >= w["start"]) & (t < w["end"])] = True
    dead = (~inword) & (db < -45)
    sents, cur = [], []
    for w in W:
        cur.append(w)
        if re.search(r"[.?!]$", w["word"]):
            sents.append(cur); cur = []
    if cur:
        sents.append(cur)
    sl = [len(s) for s in sents]
    ss = [s[-1]["end"] - s[0]["start"] for s in sents]
    gl = [g[1] for g in gaps]
    return {"has_audio": True, "words": len(W), "speaking_span_s": round(span, 3), "words_per_second": round(len(W) / span, 3) if span else None,
            "words_per_second_whole": round(len(W) / dur, 3) if dur else None, "first_word_s": W[0]["start"], "last_word_end_s": W[-1]["end"],
            "pauses": {"count": len(gaps), "per_minute": round(len(gaps) / (dur / 60), 2) if dur else None,
                       "median_s": round(float(np.median(gl)), 3) if gl else None, "p90_s": round(float(np.percentile(gl, 90)), 3) if gl else None,
                       "list": gaps},
            "dead_air_share": round(float(dead.mean()), 4), "no_word_share": round(float((~inword).mean()), 4),
            "sentences": {"count": len(sents), "words_median": float(np.median(sl)), "words_p90": float(np.percentile(sl, 90)),
                          "seconds_median": round(float(np.median(ss)), 3), "seconds_p90": round(float(np.percentile(ss, 90)), 3)}}


if __name__ == "__main__":
    run("pacing.json", m17)
