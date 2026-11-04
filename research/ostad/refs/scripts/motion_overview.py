"""One overview sheet per downloaded video: 16 frames spread evenly from the first frame to the last,
each labelled with its timestamp, so a judge can write beats covering the whole video from one image.

in : cache/msheets/{vid}.json (from motion_fetch.py), cache/frames/{vid}/f*.jpg
out: cache/movw/{vid}.jpg, cache/movw/batches.json (videos with no cache/movw/{vid}.beats.json yet, split into judging batches)
"""
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from sheet import make_sheet

R = pathlib.Path(__file__).resolve().parents[1]
C = R / "cache"
OUT = C / "movw"; OUT.mkdir(exist_ok=True)
N = 16

vids = []
for f in sorted((C / "msheets").glob("*.json")):
    m = json.load(open(f, encoding="utf-8"))
    frames = sorted((C / "frames" / m["id"]).glob("f*.jpg"))
    if not frames:
        continue
    idx = sorted({round(i * (len(frames) - 1) / (N - 1)) for i in range(N)}) if len(frames) > N else list(range(len(frames)))
    # frame k (1-based file f{k}) was taken at (k-1)*step seconds
    labels = [f"{int(i * m['step_s']) // 60}:{int(i * m['step_s']) % 60:02d}" for i in idx]
    out = OUT / f"{m['id']}.jpg"
    if not out.exists():
        make_sheet([frames[i] for i in idx], out, cols=4, tile=240, labels=labels)
    vids.append({"id": m["id"], "pid": m["pid"], "procedure": m["procedure"], "title": m["title"], "channel": m["channel"],
                 "duration": m["duration"], "url": m["url"], "sheet": str(out).replace("\\", "/")})

B = int(sys.argv[1]) if len(sys.argv) > 1 else 45
vids = [v for v in vids if not (OUT / f"{v['id']}.beats.json").exists()]
vids.sort(key=lambda v: (v["pid"], v["id"]))
batches = [vids[i:i + B] for i in range(0, len(vids), B)]
json.dump(batches, open(OUT / "batches.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(f"{len(vids)} videos -> {len(batches)} batches of <= {B}")
