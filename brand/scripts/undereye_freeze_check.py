"""Frozen-layer check (v5b; coordinator measured v5 f1579-1611: the keyed figure under "04 The result" held one source frame while the
footage and his voice went on). For every span where a key layer can be mounted (each section title with a person key), each render frame's
lower-body region (y 960-1580, under the titles, above the captions) is matched against the source clip frames within +-1.5 s of where the
composition says the footage is. The matched source time must keep advancing: a run of >= 5 render frames on the same source frame while
the expected time moves >= 0.15 s is a FREEZE.
usage: python brand/scripts/undereye_freeze_check.py <render.mp4> <out.json> [timeline.json]"""
import json, subprocess, sys
from pathlib import Path
import numpy as np, cv2
sys.path.insert(0, str(Path(__file__).parent))
import timeline_lib as T
SECTION_LEN, W, H = 80, 270, 480
render, out = sys.argv[1], sys.argv[2]
tl = T.load(sys.argv[3] if len(sys.argv) > 3 else T.REM / "timelines/undereye.json"); P = T.transcript(tl)
PUB = T.REM / "public"
sp = P["speed"]; pics = sorted([q for x in P["pieces"] for q in x["pics"]], key=lambda q: q["f0"])
Y0, Y1 = 960 // 4, 1580 // 4

def grab(path, ss, t, fps=None):
    vf = f"scale={W}:{H}" + (f",fps={fps}" if fps else "")
    b = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{max(0, ss):.3f}", "-i", str(path), "-t", f"{t:.3f}", "-vf", vf, "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
    return np.frombuffer(b, np.uint8).reshape(-1, H, W).astype(np.float32)

def xf(im, q):
    sc = q.get("scale") or 1
    if sc == 1: return im
    ox, oy = q.get("ox", 540) / 4, q.get("oy", 960) / 4
    M = np.float32([[sc, 0, ox * (1 - sc)], [0, sc, oy * (1 - sc)]])
    return cv2.warpAffine(im, M, (W, H))

rows, freezes = [], []
for b in tl["beats"]:
    name = (b.get("layout") or {}).get("key")
    if b["lane"] != "titles" or not name: continue
    s = T.resolve(b["start"], tl, P); e = s + SECTION_LEN
    R = grab(render, s / 24, (e - s + 1) / 24, fps=24)
    for q in pics:
        if not q.get("clip") or q["f1"] <= s or q["f0"] > e: continue
        f0, f1 = max(q["f0"], s), min(q["f1"] - 1, e)
        t0 = q["src"] + (f0 - q["f0"]) * sp / 24; t1 = q["src"] + (f1 - q["f0"]) * sp / 24
        clip = PUB / f"undereye-filler/{q['clip']}.mp4"
        Sf = grab(clip, t0 - 1.5, t1 - t0 + 3.0)
        fps = 30.0; base = max(0, t0 - 1.5)
        Sx = np.stack([xf(im, q) for im in Sf])[:, Y0:Y1]
        run = []
        for f in range(f0, f1 + 1):
            r = R[f - s][Y0:Y1]
            exp = q["src"] + (f - q["f0"]) * sp / 24
            lo, hi = max(0, int((exp - 1.5 - base) * fps)), min(len(Sx), int((exp + 1.5 - base) * fps) + 1)
            d = np.abs(Sx[lo:hi] - r).mean((1, 2))
            k = lo + int(d.argmin()); mt = base + k / fps
            rows.append({"beat": b["id"], "frame": f, "expected_src": round(exp, 3), "matched_src": round(mt, 3), "mae": round(float(d.min()), 2)})
            run.append((f, k, exp))
        i = 0
        while i < len(run):
            j = i
            while j + 1 < len(run) and run[j + 1][1] == run[i][1]: j += 1
            if j - i + 1 >= 5 and run[j][2] - run[i][2] >= 0.15:
                freezes.append({"beat": b["id"], "frames": [run[i][0], run[j][0]], "held_src": round(base + run[i][1] / fps, 3), "expected_moved_s": round(run[j][2] - run[i][2], 2)})
            i = j + 1
res = {"render": render, "frames_checked": len(rows), "freezes": freezes, "pass": not freezes, "rows": rows}
json.dump(res, open(out, "w"), indent=1)
print(f"{len(rows)} frames checked, {len(freezes)} frozen spans:", freezes)
