"""dead_frames: find graphics that stop moving (FAST LANE, PLAYBOOK section 2).

A dead frame is one where something that should be alive isn't moving. On a graphics-only preview (transparent everywhere except the
graphics: the composition's gfx pass), every graphic is found as a connected alpha region, followed across frames, and its
frame-to-frame change is measured inside its bounding box. Any run of more than 12 frames with no change is flagged. Text that must
hold still to be read is exempt when the timeline marks its slot `hold: true` (FAST LANE timelines).
It runs on preview frames at quarter scale, before any render of the reel.

  python -I tools/dead_frames.py --reel <id>                 render public/fast/<id> gfx preview (0.25 scale), then check
  python -I tools/dead_frames.py --video <rgba.nut|.mov> [--video ...] [--timeline tl.json] [--fps 24] [--out report.json]
  Fix for a flagged run: drift / breathing / parallax from the `float` spring (fast/spring.ts drift()).
Exit 1 if any run is flagged (exempt runs are listed, not failed).
"""
import argparse, json, subprocess, sys, time
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RW, RH = 270, 480  # quarter of 1080 x 1920
MAX_STILL = 12
CHANGE_LEVEL = 2  # a pixel changed if any channel moved > 2 levels (of 255) at quarter scale
CHANGE_SHARE = 0.002
CAP_BAND = (1560, 170)  # captions: box top >= 1560 px and height <= 170 px (1080 x 1920)  # ... and a graphic moved if >= 0.2 % of its box changed


def frames_from_video(src):
    cmd = ["ffmpeg", "-v", "error", "-i", str(src), "-vf", f"scale={RW}:{RH}:flags=area,format=rgba", "-f", "rawvideo", "-pix_fmt", "rgba", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    n = RW * RH * 4
    while True:
        b = p.stdout.read(n)
        if len(b) < n:
            break
        yield np.frombuffer(b, np.uint8).reshape(RH, RW, 4)
    p.wait()


def frames_from_dir(d):
    from PIL import Image
    for f in sorted(Path(d).glob("*.png")):
        im = Image.open(f).convert("RGBA")
        if im.size != (RW, RH):
            im = im.resize((RW, RH))
        yield np.asarray(im)


def boxes(alpha):
    import cv2
    m = (alpha > 25).astype(np.uint8)
    if not m.any():
        return []
    m = cv2.dilate(m, np.ones((7, 7), np.uint8))
    n, _, st, _ = cv2.connectedComponentsWithStats(m)
    return [tuple(int(v) for v in st[k][:4]) for k in range(1, n) if st[k][4] >= 300]


def iou(a, b):
    ax0, ay0, aw, ah = a; bx0, by0, bw, bh = b
    ix = max(0, min(ax0 + aw, bx0 + bw) - max(ax0, bx0)); iy = max(0, min(ay0 + ah, by0 + bh) - max(ay0, by0))
    i = ix * iy
    return i / max(1, aw * ah + bw * bh - i)


def analyse(frames, fps=24, holds=()):
    tracks, live, prev = [], [], None
    for fi, fr in enumerate(frames):
        bs = boxes(fr[..., 3])
        nxt = []
        for b in bs:
            best = max(live, key=lambda t: iou(t["box"], b), default=None)
            if best is not None and iou(best["box"], b) > 0.3 and best not in nxt:
                t = best
            else:
                t = {"id": len(tracks), "first": fi, "box": b, "still": 0, "run_start": None, "runs": [], "frames": 0}
                tracks.append(t)
            if prev is not None and t["frames"] > 0:
                x0, y0 = min(t["box"][0], b[0]), min(t["box"][1], b[1])
                x1, y1 = max(t["box"][0] + t["box"][2], b[0] + b[2]), max(t["box"][1] + t["box"][3], b[1] + b[3])
                d = np.abs(fr[y0:y1, x0:x1].astype(np.int16) - prev[y0:y1, x0:x1].astype(np.int16)).max(axis=2)
                moved = (d > CHANGE_LEVEL).mean() >= CHANGE_SHARE
                if moved:
                    close(t, fi)
                else:
                    if t["run_start"] is None:
                        t["run_start"] = fi
            t["box"], t["last"] = b, fi
            t["frames"] += 1
            nxt.append(t)
        for t in live:
            if t not in nxt:
                close(t, t["last"] + 1)
        live, prev = nxt, fr
    for t in live:
        close(t, t["last"] + 1)
    flags, exempt = [], []
    for t in tracks:
        for a, b in t["runs"]:
            if b - a <= MAX_STILL:
                continue
            row = {"track": t["id"], "frames": [a, b - 1], "len": b - a, "t": [round(a / fps, 2), round((b - 1) / fps, 2)],
                   "box_px": [v * 4 for v in t["box"]]}
            h = next((s for s in holds if s["start"] <= a and b - 1 <= s["end"] + 16 and overlaps(s.get("box"), t["box"])), None)
            if h is None and t["box"][1] * 4 >= CAP_BAND[0] and t["box"][3] * 4 <= CAP_BAND[1]:
                h = {"id": "captions"}  # a caption phrase holds still to be read until the next phrase (captions cut on, by rule)
            (exempt if h else flags).append({**row, **({"hold_slot": h["id"]} if h else {})})
    return {"tracks": len(tracks), "flagged": flags, "exempt": exempt}


def overlaps(slot_box, b):
    if not slot_box:
        return True
    sx, sy, sw = slot_box["left"] / 4, slot_box["top"] / 4, slot_box["w"] / 4
    return not (b[0] > sx + sw or b[0] + b[2] < sx or b[1] + b[3] < sy - 10)


def close(t, fi):
    if t["run_start"] is not None:
        t["runs"].append((t["run_start"], fi))
        t["run_start"] = None


def render_preview(reel, out_dir, conc=4):
    out_dir.mkdir(parents=True, exist_ok=True)
    props = out_dir / "props.json"
    props.write_text(json.dumps({"reel": reel, "pass": "gfx"}))
    cmd = ["npx", "remotion", "render", "src/fast/index.ts", "FastReel", str(out_dir), f"--props={props}", "--sequence", "--image-format=png",
           "--scale=0.25", "--log=error", f"--concurrency={conc}"]
    subprocess.run(subprocess.list2cmdline(cmd), shell=True, check=True, cwd=ROOT / "brand/remotion")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--reel"); ap.add_argument("--video", action="append", default=[]); ap.add_argument("--dir", action="append", default=[])
    ap.add_argument("--timeline"); ap.add_argument("--fps", type=int, default=24); ap.add_argument("--out")
    a = ap.parse_args()
    t0 = time.time()
    tl_path = a.timeline
    srcs = [("video", v) for v in a.video] + [("dir", d) for d in a.dir]
    if a.reel:
        d = ROOT / "brand/remotion/public/fast" / a.reel / "preview_gfx"
        render_preview(a.reel, d)
        srcs.append(("dir", d))
        tl_path = tl_path or ROOT / "brand/remotion/public/fast" / a.reel / "timeline.json"
    holds = []
    if tl_path:
        tl = json.loads(Path(tl_path).read_text(encoding="utf-8"))
        holds = [s for s in tl.get("slots", []) if s.get("hold")]
    rep = {"sources": [], "max_still_frames": MAX_STILL}
    bad = 0
    for kind, s in srcs:
        r = analyse(frames_from_video(s) if kind == "video" else frames_from_dir(s), a.fps, holds)
        rep["sources"].append({"source": str(s), **r})
        bad += len(r["flagged"])
        print(f"{s}: {r['tracks']} graphics tracked, {len(r['flagged'])} dead runs > {MAX_STILL} f, {len(r['exempt'])} exempt holds")
        for f in r["flagged"][:40]:
            print("   DEAD", f["t"], f"{f['len']} f", "box", f["box_px"])
    rep["seconds"] = round(time.time() - t0, 1)
    if a.out:
        Path(a.out).write_text(json.dumps(rep, indent=1))
    print("dead_frames:", "FAIL" if bad else "PASS", f"({bad} runs, {rep['seconds']} s)")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
