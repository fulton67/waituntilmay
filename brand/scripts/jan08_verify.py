"""Jan 08 filler-fatigue reel: the core checks on the render, written to research/ostad/style/jan08/verify.json.

  python -I brand/scripts/jan08_verify.py <final.mp4> [--arrow-log <audit render log>]

  cuts      ffmpeg scdet=threshold=8 (the flash scan): every hard cut, with its time
  pacing    picture changes on the render itself: 96x170 grey frames; a change = mean |frame - frame 6 earlier| >= 6 grey levels
            (a cut, a card or drawing arriving, a takeover), merged within 12 f. Longest stretch without a change (rule: <= 4 s);
            first third vs last third: changes per 10 s and median interval (rule: within about 20 %). Hook: first change or
            title on screen <= 1.5 s
  edges     the keyed presenter (B02, B04): his RVM alpha with the composition's 140-source-px right feather, placed at scale 0.8,
            x -250, bottom on the frame bottom. A straight source edge = an opaque run (alpha >= 0.5) on a source-frame edge that
            lands on screen, or a column step >= 0.5 across 3 source px, >= 12 screen px long (edge_check.py method)
  loudness  ffmpeg ebur128=peak=true: integrated LUFS and true peak
  arrows    research/ostad/style/tools/arrow_text_lint.py on the audit render's log (ARROWTEXT lines), if given
"""
import json, re, subprocess, sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
EDIT = ROOT / "brand/edits/jan08-filler-fatigue"
OUT = ROOT / "research/ostad/style/jan08/verify.json"
FPS = 24


def frames_grey(video, w=96, h=170):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(video), "-vf", f"scale={w}:{h}", "-pix_fmt", "gray", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)


def cuts(video):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(video), "-vf", "scdet=threshold=8", "-an", "-f", "null", "-"], capture_output=True, text=True)
    return [round(float(m.group(1)), 2) for m in re.finditer(r"lavfi\.scd\.time:\s*([\d.]+)", r.stderr)]


def pacing(G, end_f):
    d = np.array([0.0] * 6 + [float(np.abs(G[i] - G[i - 6]).mean()) for i in range(6, len(G))])
    ch, last = [0], -99
    for i in range(1, min(len(G), end_f)):
        if d[i] >= 6 and i - last > 12:
            if i - ch[-1] > 12:
                ch.append(i)
            last = i
    ch.append(end_f)
    gaps = np.diff(ch) / FPS
    third = end_f / 3
    def stats(a, b):
        c = [x for x in ch if a <= x < b]
        iv = np.diff(c) / FPS if len(c) > 1 else np.array([0.0])
        return {"changes": len(c), "per_10s": round(len(c) / ((b - a) / FPS) * 10, 2), "median_interval_s": round(float(np.median(iv)), 2)}
    i = int(np.argmax(gaps))
    first, last3 = stats(0, third), stats(2 * third, end_f)
    return {"changes_f": ch, "longest_s": round(float(gaps.max()), 2), "longest_at_s": [round(ch[i] / FPS, 2), round(ch[i + 1] / FPS, 2)],
            "first_third": first, "last_third": last3, "rate_ratio_last_vs_first": round(last3["per_10s"] / first["per_10s"], 2), "pass_4s": bool(gaps.max() <= 4.0)}


def edges():
    props = json.loads((ROOT / "brand/remotion/public/jan08/props.json").read_text())
    pc = {p["id"]: p for p in props["pieces"]}
    c = props["cues"]
    spans = {"belief": (78 + 80, c["start:cause"]), "aging": (c["start:aging"] + 80, c["aging2"])}
    S, LX, W, H, RAMP = 0.8, -250, 1080, 1920, 140
    top = H - H * S
    res = {}
    for k, (a, b) in spans.items():
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(EDIT / f"matte/{k}_pha.mp4"), "-vf", f"crop=40:{H}:{W - 40}:0", "-pix_fmt", "gray", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
        right = np.frombuffer(raw, np.uint8).reshape(-1, H, 40).astype(np.float32) / 255
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(EDIT / f"matte/{k}_pha.mp4"), "-vf", f"crop={W}:2:0:0", "-pix_fmt", "gray", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
        toprow = np.frombuffer(raw, np.uint8).reshape(-1, 2, W)[:, 0, :].astype(np.float32) / 255
        xs = np.arange(W - 40, W)
        g = np.clip((W - 1 - xs) / RAMP, 0, 1)
        bad, worst = [], 0.0
        for f in range(a, b):
            i = min(len(right) - 1, f - pc[k]["at"])
            al = right[i] * g[None, :]
            step_edge = al[:, -1] >= 0.5
            step_in = (al[:, :-3] - al[:, 3:]) >= 0.5
            run = 0
            for col in [step_edge] + [step_in[:, j] for j in range(step_in.shape[1])]:
                cur = best = 0
                for v in col:
                    cur = cur + 1 if v else 0
                    best = max(best, cur)
                run = max(run, best)
            top_run = int((toprow[i] >= 0.5).sum())  # the source top row lands on screen at y = top
            px = max(run * S, top_run * S)
            worst = max(worst, px)
            if px >= 12:
                bad.append(f)
        res[k] = {"frames": b - a, "edge_frames": len(bad), "max_run_screen_px": round(worst, 1), "list": bad[:20]}
    res["note"] = f"left source edge at screen x {LX} (off screen), bottom on the frame bottom, top row at y {top:.0f} (checked), right edge at x {LX + W * S:.0f} with a {RAMP} px feather"
    res["pass"] = all(v["edge_frames"] == 0 for k, v in res.items() if isinstance(v, dict))
    return res


def loudness(video):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(video), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r)[-1]); tp = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r)[-1])
    return {"integrated_lufs": I, "true_peak_dbtp": tp, "pass": abs(I + 14) <= 0.5 and tp <= -1.0}


def main():
    video = Path(sys.argv[1])
    props = json.loads((ROOT / "brand/remotion/public/jan08/props.json").read_text())
    G = frames_grey(video)
    res = {"render": str(video), "frames": len(G), "duration_s": round(len(G) / FPS, 2)}
    res["cuts_scdet8"] = cuts(video)
    res["pacing"] = pacing(G, props["durationInFrames"])
    res["edges"] = edges()
    res["loudness"] = loudness(video)
    if "--arrow-log" in sys.argv:
        log = sys.argv[sys.argv.index("--arrow-log") + 1]
        r = subprocess.run([sys.executable, "-I", str(ROOT / "research/ostad/style/tools/arrow_text_lint.py"), log], capture_output=True, text=True)
        n = len(re.findall("TEXTAUDIT", Path(log).read_text(encoding="utf-8", errors="replace")))
        res["arrow_text"] = {"exit": r.returncode, "audited_frames": n, "out": r.stdout.strip()[-600:]}
    for k in ("cut_gaps.json",):
        p = ROOT / "research/ostad/style/jan08" / k
        if p.exists():
            j = json.loads(p.read_text())
            res["audio_cuts"] = {"min_gap_s": j["min_gap_s"], "fails": len(j["fails"]), "exceptions": j["exceptions"], "crossfade_s": 0.015}
    fa = EDIT / "final_asr.json"
    if fa.exists():
        j = json.loads(fa.read_text())
        res["fillers"] = {"first_10s": j["fillers_first_10s"], "all": j["fillers"], "stutters": j["stutters"]}
    OUT.write_text(json.dumps(res, indent=1))
    print(json.dumps({k: (v if k not in ("pacing",) else {kk: vv for kk, vv in v.items() if kk != "changes_f"}) for k, v in res.items()}, indent=1)[:4000])


if __name__ == "__main__":
    main()
