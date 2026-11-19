"""Companion to key_freeze.py for the PLACED (shrunk) key spans, where a pixel match against a resampled source is too loose to
read a lag: a held key frame shows as NO frame-to-frame motion in his region while the source still moves. Per frame: render
motion m_r = mean |R[n] - R[n-1]| in his head/shoulders, source motion m_s the same on talk.mp4 at the expected frames. Frozen =
m_s > 1.0 while m_r < 0.15. Also the correlation of the two motion signals (they move together if the key follows the footage).
  python research/ostad/style/jan08/key_freeze_motion.py <render.mp4> <props.json> <out.json>
"""
import json, sys
import numpy as np
sys.argv, args = sys.argv[:1], sys.argv[1:]
import importlib.util
spec = importlib.util.spec_from_file_location("kf", __file__.replace("key_freeze_motion.py", "key_freeze.py"))
render, props, out = args
P = json.load(open(props)); pcs = {p["id"]: p for p in P["pieces"]}
src = open(__file__.replace("key_freeze_motion.py", "key_freeze.py"), encoding="utf-8").read()
ns = {}; exec(src.split("render, props, out")[0], ns)
frames, TALK, SW, SH = ns["frames"], ns["TALK"], ns["SW"], ns["SH"]
res = []
for pid, s, e, (x, sc) in [("belief", 176, 336, (-250, 0.8)), ("aging", 638, 827, (-250, 0.8))]:
    pc = pcs[pid]; k0 = round(pc["from"] * 24) + (s - pc["at"])
    R, S = frames(render, s, e - s), frames(TALK, k0, e - s)
    w, h = round(SW * sc), round(SH * sc); ox = round(x / 4)
    rr = (slice(SH - h + int(0.12 * h), SH - h + int(0.55 * h)), slice(max(0, ox + int(0.30 * w)), ox + int(0.70 * w)))
    rs = (slice(int(0.12 * SH), int(0.55 * SH)), slice(int(0.30 * SW), int(0.70 * SW)))
    mr = np.array([np.abs(R[i][rr] - R[i - 1][rr]).mean() for i in range(1, len(R))])
    ms = np.array([np.abs(S[i][rs] - S[i - 1][rs]).mean() for i in range(1, len(S))])
    frozen = [int(s + 1 + i) for i in range(len(mr)) if ms[i] > 1.0 and mr[i] < 0.15]
    res.append({"piece": pid, "span": [s, e], "corr_motion": round(float(np.corrcoef(mr, ms)[0, 1]), 3), "frozen_frames": frozen,
                "render_motion_min": round(float(mr.min()), 3), "source_motion_median": round(float(np.median(ms)), 3)})
    print(res[-1])
json.dump(res, open(out, "w"), indent=1)
