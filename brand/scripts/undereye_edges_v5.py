"""Under-eye reel v5: where does each piece's first and last word REALLY start and end in its source clip? (faster-whisper, local, CPU;
the props' word times are letter-length estimates.) Output: research/ostad/style/undereye/edges_v5.json, used by undereye_audio_v5.py fix.
usage (style venv): python -I brand/scripts/undereye_edges_v5.py <props.json> <out.json>"""
import json, re, sys
from pathlib import Path
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "brand/remotion/public/undereye-filler"
norm = lambda s: re.sub(r"[^a-z0-9']", "", s.lower())
P = json.load(open(sys.argv[1]))
m = WhisperModel("small", device="cpu", compute_type="int8")
out = []
for p in P["pieces"]:
    ws = [w for w in P["words"] if w["piece"] == p["id"]]
    if not ws:
        continue
    a, b = max(0, p["from"] - 1.0), p["to"] + 1.0
    segs, _ = m.transcribe(str(PUB / f"{p['clip']}.mp4"), word_timestamps=True, language="en", clip_timestamps=[a, b])
    heard = [{"w": norm(w.word), "s": w.start, "e": w.end} for s in segs for w in s.words]
    first, last = norm(ws[0]["w"]), norm(ws[-1]["w"])
    # the heard word nearest the cut edge with the cut's text (or, failing that, the heard word spanning the edge)
    cf = [h for h in heard if h["w"] == first]; cl = [h for h in heard if h["w"] == last]
    hf = min(cf, key=lambda h: abs(h["s"] - p["from"])) if cf else None
    hl = min(cl, key=lambda h: abs(h["e"] - p["to"])) if cl else None
    after = [h for h in heard if h["s"] >= (hl["e"] if hl else p["to"]) - 0.01]
    before = [h for h in heard if h["e"] <= (hf["s"] if hf else p["from"]) + 0.01]
    r = {"piece": p["id"], "clip": p["clip"], "from": p["from"], "to": p["to"], "first": first, "last": last,
         "first_heard_s": hf and round(hf["s"], 3), "last_heard_e": hl and round(hl["e"], 3),
         "next_word": after[0] if after else None, "prev_word": before[-1] if before else None}
    # a word that starts inside the cut after its last word = a fragment at the out point; one that ends inside before its first = at the in point
    r["out_fragment"] = bool(after and after[0]["s"] < p["to"] - 0.03)
    r["in_fragment"] = bool(before and before[-1]["e"] > p["from"] + 0.03)
    out.append(r)
    print(r)
json.dump(out, open(sys.argv[2], "w"), indent=1, default=float)
