"""Jan08 audio join check (round 4 shared rule 2): around every piece join and every SFX hit of the mastered reel, RMS per 50 ms
(+-300 ms) and the largest sample step (click) inside +-10 ms of the join, against the same measures across the whole track.

  python research/ostad/style/jan08/audio_joins.py <master.mp4> <props.json> <timeline.json> <out.json>

level jump = |dB(window after) - dB(window before)| for the two 50 ms windows touching the join; a jump in speech is normal, so the
report also gives whether either window is in a measured pause (both quiet = a join inside silence, as cut.json requires).
click = max |x[n] - x[n-1]| within +-10 ms of the join / the 99.9th percentile of the same over all speech.
"""
import json, subprocess, sys
import numpy as np

src, props, tlp, out = sys.argv[1:5]
SR = 48000
x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout, np.float32)
P = json.load(open(props))
TL = json.load(open(tlp, encoding="utf-8"))
fps = P["fps"]
db = lambda a: float(20 * np.log10(np.sqrt(np.mean(a.astype(np.float64) ** 2)) + 1e-9))
d = np.abs(np.diff(x))
ref = float(np.percentile(d, 99.9))
win = int(0.05 * SR)
floor = np.percentile([db(x[i:i + win]) for i in range(0, len(x) - win, win)], 10)


def at(t):
    n = int(round(t * SR))
    rms = [round(db(x[n + k * win:n + (k + 1) * win]), 1) for k in range(-6, 6)]
    step = float(d[max(0, n - SR // 100):n + SR // 100].max())
    before, after = rms[5], rms[6]
    return {"t": round(t, 3), "rms50ms": rms, "jump_db": round(abs(after - before), 1), "in_pause": bool(min(before, after) < floor + 8),
            "click_ratio": round(step / ref, 2)}


joins = [{"join": f"{a['id']}|{b['id']}", **at(b["at"] / fps)} for a, b in zip(P["pieces"], P["pieces"][1:])]
# SFX hits as the timeline places them (resolved frames are in the comp; the ids/anchors are resolved by the TS side, so take them
# from the rendered composition's props: here we read the beats with an sfx list and their resolved start from <out>.sfx.json if given)
sfx = []
try:
    for h in json.load(open(out.replace(".json", ".sfx.json"))):
        sfx.append({"sfx": h["name"], **at(h["at"])})
except FileNotFoundError:
    pass
res = {"floor_db": round(float(floor), 1), "click_ref": ref, "joins": joins, "sfx": sfx,
       "worst_join_jump_db": max(j["jump_db"] for j in joins), "worst_click_ratio": max(j["click_ratio"] for j in joins + sfx)}
json.dump(res, open(out, "w"), indent=1)
print(json.dumps({k: v for k, v in res.items() if k not in ("joins", "sfx")}))
for j in joins + sfx:
    print(j.get("join", j.get("sfx")), j["t"], "jump", j["jump_db"], "pause", j["in_pause"], "click", j["click_ratio"])
