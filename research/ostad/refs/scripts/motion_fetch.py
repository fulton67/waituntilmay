"""Pass 2 phase 1: shortlist YouTube animations per procedure, download whole (720p), grab frames across
the full duration (1 fps under 2 min, every 2 s above), and lay out frame sheets for watching.

out: cache/motion_short.json, motion/{pid}/{vid}.mp4, cache/frames/{vid}/*.jpg, cache/msheets/{vid}__{n}.jpg + {vid}.json
"""
import json, pathlib, re, glob, subprocess, collections, sys, shutil
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from sheet import make_sheet

R = pathlib.Path(__file__).resolve().parents[1]
C = R / "cache"
PER = int(sys.argv[1]) if len(sys.argv) > 1 else 5
GOOD = re.compile(r"anima|mechanism|how (it|does|do).*work|3d|moa|explain|technology|science|medical illustration|cgi", re.I)
BAD = re.compile(r"before.{0,5}after|testimonial|review|vlog|my experience|results?\b|asmr|day in|cost|price|tiktok|#shorts|reaction|podcast|interview|live\b|webinar", re.I)
MAKERS = re.compile(r"inmode|solta|btl|candela|cutera|cynosure|lutronic|allergan|galderma|evolus|merz|miradry|sinclair|benev|lumenis|nucleus|scientific animations|random42|xvivo|ghost productions|hybrid medical|alila|visible body|osmosis|armando hasudungan|zygote|3d4medical|medical animation", re.I)
procs = {p["id"]: p for p in json.load(open(R / "procedures.json", encoding="utf-8"))}

by = collections.defaultdict(dict)
for f in glob.glob(str(C / "yt/*.json")):
    d = json.load(open(f, encoding="utf-8"))
    for i, r in enumerate(d["rows"]):
        t = r["title"] or ""
        if not GOOD.search(t) or BAD.search(t):
            continue
        if not r["duration"] or r["duration"] < 15 or r["duration"] > 1200:
            continue
        c = by[d["pid"]].setdefault(r["id"], {**r, "pid": d["pid"], "hits": 0, "rank": 99})
        c["hits"] += 1; c["rank"] = min(c["rank"], i)
short, seen = [], set()
for pid, cs in by.items():
    def score(r):
        return r["hits"] * 2 - r["rank"] * 0.15 + (3 if MAKERS.search(r["channel"] or "") else 0) + (1 if 30 <= r["duration"] <= 240 else 0)
    picked = 0
    for r in sorted(cs.values(), key=lambda r: -score(r)):
        if r["id"] in seen:
            continue
        seen.add(r["id"]); short.append(r); picked += 1
        if picked >= PER:
            break
json.dump(short, open(C / "motion_short.json", "w", encoding="utf-8"), indent=0, ensure_ascii=False)
print("shortlist", len(short), "procedures", len({r['pid'] for r in short}), flush=True)

FR = C / "frames"; MS = C / "msheets"; FR.mkdir(exist_ok=True); MS.mkdir(exist_ok=True)

def work(r):
    vid, pid = r["id"], r["pid"]
    out = R / "motion" / pid; out.mkdir(parents=True, exist_ok=True)
    mp4 = out / f"{vid}.mp4"
    if not mp4.exists():
        subprocess.run(["yt-dlp", "-q", "--no-warnings", "-f", "bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720]/b", "--merge-output-format", "mp4",
                        "-o", str(mp4), r["url"]], capture_output=True, timeout=900)
    if not mp4.exists():
        return vid, "download failed"
    fd = FR / vid
    if not (fd / "done").exists():
        shutil.rmtree(fd, ignore_errors=True); fd.mkdir()
        step = 1 if (r["duration"] or 0) < 120 else 2
        subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(mp4), "-vf", f"fps=1/{step},scale=320:-2", "-q:v", "4", str(fd / "f%04d.jpg")], timeout=900)
        (fd / "done").write_text(str(step))
    step = int((fd / "done").read_text())
    frames = sorted(fd.glob("f*.jpg"))
    for k in range(0, len(frames), 30):
        part = frames[k:k + 30]
        dst = MS / f"{vid}__{k // 30}.jpg"
        if not dst.exists():
            make_sheet(part, dst, cols=6, tile=220, labels=[f"{(k + i) * step}s" for i in range(len(part))])
    json.dump({**r, "procedure": procs[pid]["name"], "step_s": step, "frames": len(frames), "sheets": (len(frames) + 29) // 30,
               "mp4": str(mp4).replace("\\", "/")}, open(MS / f"{vid}.json", "w", encoding="utf-8"), ensure_ascii=False)
    return vid, f"{len(frames)} frames"

with ThreadPoolExecutor(4) as ex:
    for i, (vid, s) in enumerate(ex.map(work, short)):
        if i % 25 == 0 or "fail" in s:
            print(i, vid, s, flush=True)
print("done")
