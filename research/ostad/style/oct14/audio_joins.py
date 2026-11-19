"""Oct 14 audio check (coordinator rule 2, 2026-11-19): clicks, dropouts, level jumps at every piece join and SFX.
  $PY -I research/ostad/style/oct14/audio_joins.py <master.mp4> <out.json>
Per join / SFX (comp frame -> time): RMS in 50 ms windows over +-300 ms; jump = |dB step| between adjacent windows across the join;
click = max |sample step| within +-3 ms of the join / the 99.5th percentile step of the surrounding +-300 ms (> 1.5 = audible click);
dropout = any 50 ms window < -50 dBFS inside speech (between the join's neighbours' RMS > -40)."""
import json, sys, subprocess
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[4]
P = json.loads((ROOT / "brand/remotion/public/oct14/props.json").read_text(encoding="utf-8"))
src, out = sys.argv[1], Path(sys.argv[2])
SR = 48000
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
x = np.frombuffer(raw, np.float32)
def db(v): return 20 * np.log10(max(1e-9, v))
def rms(a, b): seg = x[max(0, a):max(0, b)]; return db(float(np.sqrt(np.mean(seg ** 2)))) if len(seg) else -120
pts = [("join", p["id"], p["at"]) for p in P["pieces"][1:]] + [("sfx", s["name"], P["cues"][s["cue"]] + 1) for s in P.get("sfx", [])]
pts.append(("join", "tail", P["durationInFrames"]))
rows = []
w = int(0.05 * SR)
for kind, name, f in pts:
    t = int(f / 24 * SR)
    win = [rms(t + k * w, t + (k + 1) * w) for k in range(-6, 6)]
    jump = abs(win[6] - win[5])
    d = np.abs(np.diff(x[max(0, t - int(0.3 * SR)):t + int(0.3 * SR)]))
    near = np.abs(np.diff(x[max(0, t - int(0.003 * SR)):t + int(0.003 * SR)]))
    # a click is a sample step at the join bigger than anything the surrounding 300 ms (speech) does: ratio to its 99.5th percentile
    click = float(near.max() / (np.percentile(d, 99.5) + 1e-9)) if len(near) and len(d) else 0
    speech = max(win[:5]) > -40 and max(win[7:]) > -40
    drop = speech and min(win) < -50
    rows.append({"kind": kind, "name": name, "frame": f, "rms_db": [round(v, 1) for v in win], "jump_db": round(jump, 1), "click_ratio": round(click, 1), "dropout": bool(drop)})
worst_jump = max(rows, key=lambda r: r["jump_db"]); worst_click = max(rows, key=lambda r: r["click_ratio"])
res = {"src": src, "n": len(rows), "worst_jump": {k: worst_jump[k] for k in ("kind", "name", "frame", "jump_db")},
       "worst_click": {k: worst_click[k] for k in ("kind", "name", "frame", "click_ratio")}, "dropouts": [r["name"] for r in rows if r["dropout"]], "rows": rows}
out.write_text(json.dumps(res, indent=1))
print(json.dumps({k: v for k, v in res.items() if k != "rows"}, indent=1))
