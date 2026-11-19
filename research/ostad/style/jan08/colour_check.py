"""Jan08 colour check (round 4 shared rule 1): the render's footage against a PLAIN ffmpeg decode of the source (no tone map, no
colour filter), mean |diff| per channel on footage-only frames, in a region no graphic touches (the footage-only render, so the
comparison is the colour pipeline alone; the deliverable is checked on its graphics-free frames too).

  python research/ostad/style/jan08/colour_check.py <render.mp4> <props.json> <out.json> [--frames 20,700,1300,...]

For each comp frame n inside a talk piece: source time = piece.from + (n - piece.at) / fps -> ffmpeg -ss decode of talk.mp4 (rgb24,
default bt709 matrix, as the plain decode) vs the render's frame n. Pass: mean diff <= 2 levels.
"""
import json, subprocess, sys
import numpy as np

ROOT = "C:/Users/naimj/orca/workspaces/waituntilmay/OSTAD-CONTENT-INTEL/"
TALK = ROOT + "brand/remotion/public/jan08/talk.mp4"
W, H = 540, 960


def frame(path, n=None, t=None):
    args = ["ffmpeg", "-v", "error"]
    if t is not None:
        args += ["-ss", f"{t:.4f}", "-i", path, "-frames:v", "1"]
        vf = f"scale={W}:{H}:flags=area"
    else:
        args += ["-i", path]
        vf = f"select=eq(n\\,{n}),scale={W}:{H}:flags=area"
        args += ["-vsync", "0", "-frames:v", "1"]
    b = subprocess.run(args + ["-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(b, np.uint8).reshape(H, W, 3).astype(int)


render, props, out = sys.argv[1:4]
P = json.load(open(props))
fr = [int(x) for x in sys.argv[sys.argv.index("--frames") + 1].split(",")] if "--frames" in sys.argv else None
res = []
for n in fr:
    pc = next(p for p in P["pieces"] if p["at"] <= n < p["at"] + p["dur"])
    t = round(pc["from"] * 24) / 24 + (n - pc["at"]) / 24 + 0.5 / 24
    a, b = frame(render, n=n), frame(TALK, t=t)
    reg = (slice(0, 130), slice(0, W))  # the top band (ceiling / wall), above any title in these frames
    d = np.abs(a - b)
    res.append({"frame": n, "piece": pc["id"], "mean_rgb_region": [round(float(d[reg][..., c].mean()), 2) for c in range(3)],
                "mean_whole": round(float(d.mean()), 2), "signed_rgb_whole": [round(float((a - b)[..., c].mean()), 2) for c in range(3)]})
worst = max(max(r["mean_rgb_region"]) for r in res)
json.dump({"frames": res, "worst_region_mean": worst, "pass": worst <= 2}, open(out, "w"), indent=1)
for r in res:
    print(r)
print("worst", worst, "pass", worst <= 2)
