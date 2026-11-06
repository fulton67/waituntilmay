"""BRANDKIT_RUN Phase 4, motion. Measures every video we hold for this brand:
  - the board's only video, Media/Link block 43001699 (Crown Affair reel, brand/board/media/43001699.mp4) — the direction
  - Dr. Ostad's own Instagram clips listed in brand/existing/posts.json and on disk in research/ostad/audio/in_{shortCode}.mp4 — current practice
Per video: duration and fps (ffprobe); cuts and shot lengths; transition length; camera motion per shot (Farneback optical flow);
text-on-screen appearances (easyocr every 0.5 s) and how each one arrives (frame difference inside vs outside its box);
loop (first vs last frame). Thresholds are stated in THRESH and are judgment calls; every derived rule cites motion.json.
-> brand/motion/motion.json, brand/motion/BEATS.md, brand/motion/frames/, brand/fig/motion_*.png. Run with brand-venv python -I."""
import json, pathlib, subprocess, sys, statistics as st, re
from collections import Counter
import numpy as np, cv2
sys.stdout.reconfigure(encoding="utf-8")
B = pathlib.Path(__file__).resolve().parents[1]; ROOT = B.parent
OUT = B / "motion"; FR = OUT / "frames"; FIG = B / "fig"
OUT.mkdir(exist_ok=True); FR.mkdir(exist_ok=True)

THRESH = {  # all judgment calls, stated once
    "cut_hist_bhattacharyya": 0.35,        # HSV 16x4x4 histogram distance between consecutive frames that counts as a cut
    "cut_local_ratio": 3.0,                # ...and it must be 3x the median distance of the surrounding 1 s
    "transition_frame_dist": 0.12,         # frames around a cut with distance above this belong to the transition
    "min_shot_s": 0.25,                    # shorter shots are merged into the previous one
    "flow_width_px": 160,                  # optical flow computed at 160 px wide
    "static_px_per_frame": 0.12,           # median flow magnitude below this = static camera
    "push_radial_share": 0.55,             # |radial| / magnitude above this = push (in) or pull (out)
    "pan_consistency": 0.6,                # |mean vector| / mean magnitude above this = pan/tilt; otherwise handheld
    "ocr_every_s": 0.5, "ocr_width_px": 540, "ocr_conf": 0.4, "ocr_min_chars": 3,
    "reveal_box_ratio": 2.0,               # a frame is part of a reveal when diff inside the text box > 2x diff outside it
    "loop_mean_abs_diff": 12.0,            # first vs last frame mean abs difference (0-255, 160 px) under this = loops
}

def probe(p):
    j = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height,r_frame_rate,codec_type",
                                   "-of", "json", str(p)], capture_output=True, text=True).stdout)
    v = next(s for s in j["streams"] if s["codec_type"] == "video"); n, d = v["r_frame_rate"].split("/")
    return float(j["format"]["duration"]), float(n) / float(d), v["width"], v["height"]

def hist(f):
    h = cv2.calcHist([cv2.cvtColor(f, cv2.COLOR_BGR2HSV)], [0, 1, 2], None, [16, 4, 4], [0, 180, 0, 256, 0, 256])
    return cv2.normalize(h, h).flatten()

def classify_shot(flows):
    if not flows:
        return "static", {}
    mags = [f["mag"] for f in flows]; m = float(np.median(mags))
    if m < THRESH["static_px_per_frame"]:
        return "static", {"median_mag": round(m, 3)}
    rad = float(np.median([f["radial"] for f in flows])); vec = np.array([[f["dx"], f["dy"]] for f in flows]).mean(0)
    cons = float(np.linalg.norm(vec) / (np.mean(mags) + 1e-9))
    info = {"median_mag": round(m, 3), "radial": round(rad, 3), "consistency": round(cons, 2), "mean_dx": round(float(vec[0]), 3), "mean_dy": round(float(vec[1]), 3)}
    if abs(rad) / m > THRESH["push_radial_share"]:
        return ("push-in" if rad > 0 else "pull-out"), info
    if cons > THRESH["pan_consistency"]:
        return ("pan" if abs(vec[0]) >= abs(vec[1]) else "tilt"), info
    return "handheld/subject motion", info

def analyse(vid, path, role, reader):
    dur, fps, W, H = probe(path)
    cap = cv2.VideoCapture(str(path)); frames, dists, small = [], [], []
    prev_h = None
    while True:
        ok, f = cap.read()
        if not ok:
            break
        s = cv2.resize(f, (THRESH["flow_width_px"], int(THRESH["flow_width_px"] * f.shape[0] / f.shape[1])))
        small.append(s); h = hist(s)
        dists.append(0.0 if prev_h is None else float(cv2.compareHist(prev_h, h, cv2.HISTCMP_BHATTACHARYYA))); prev_h = h
    n = len(small); fps = fps or n / dur
    # cuts
    cuts, trans = [], []
    w = int(fps)
    for i in range(1, n):
        loc = np.median(dists[max(1, i - w): i + w + 1]) + 1e-6
        if dists[i] > THRESH["cut_hist_bhattacharyya"] and dists[i] > THRESH["cut_local_ratio"] * loc:
            if cuts and i - cuts[-1] < THRESH["min_shot_s"] * fps:
                continue
            cuts.append(i)
            a = i
            while a - 1 > 0 and dists[a - 1] > THRESH["transition_frame_dist"]: a -= 1
            b = i
            while b + 1 < n and dists[b + 1] > THRESH["transition_frame_dist"]: b += 1
            trans.append(b - a + 1)
    bounds = [0] + cuts + [n]
    shots = []
    grays = [cv2.cvtColor(s, cv2.COLOR_BGR2GRAY) for s in small]
    hh, ww = grays[0].shape; yy, xx = np.mgrid[0:hh, 0:ww]; rx, ry = xx - ww / 2, yy - hh / 2; rn = np.sqrt(rx ** 2 + ry ** 2) + 1e-6
    for k in range(len(bounds) - 1):
        a, b = bounds[k], bounds[k + 1]; flows = []
        for i in range(a + 1, b - 1, 2):
            fl = cv2.calcOpticalFlowFarneback(grays[i - 1], grays[i], None, 0.5, 3, 15, 3, 5, 1.2, 0)
            mag = np.sqrt(fl[..., 0] ** 2 + fl[..., 1] ** 2)
            flows.append({"mag": float(mag.mean()), "dx": float(fl[..., 0].mean()), "dy": float(fl[..., 1].mean()),
                          "radial": float(((fl[..., 0] * rx + fl[..., 1] * ry) / rn).mean())})
        kind, info = classify_shot(flows)
        shots.append({"start_s": round(a / fps, 2), "end_s": round(b / fps, 2), "len_s": round((b - a) / fps, 2), "camera": kind, **info})
    # text on screen
    texts, step = [], max(1, int(round(THRESH["ocr_every_s"] * fps)))
    cap = cv2.VideoCapture(str(path)); idx = 0; full = {}
    while True:
        ok, f = cap.read()
        if not ok:
            break
        if idx % step == 0:
            s = cv2.resize(f, (THRESH["ocr_width_px"], int(THRESH["ocr_width_px"] * f.shape[0] / f.shape[1])))
            res = [(bx, t, c) for bx, t, c in reader.readtext(s) if c >= THRESH["ocr_conf"] and len(re.sub(r"\W", "", t)) >= THRESH["ocr_min_chars"]]
            texts.append({"t": round(idx / fps, 2), "frame": idx, "items": [{"text": t, "conf": round(float(c), 2),
                          "box": [float(min(p[0] for p in bx)) / s.shape[1], float(min(p[1] for p in bx)) / s.shape[0], float(max(p[0] for p in bx)) / s.shape[1], float(max(p[1] for p in bx)) / s.shape[0]]} for bx, t, c in res]})
        idx += 1
    norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
    events, seen = [], set()
    for k, smp in enumerate(texts):
        for it in smp["items"]:
            key = norm(it["text"])
            if key in seen:
                continue
            seen.add(key)
            # reveal: frames before this sample where the box changes much more than the rest of the frame
            x0, y0, x1, y1 = it["box"]; X0, Y0, X1, Y1 = int(x0 * ww), int(y0 * hh), max(int(x1 * ww), int(x0 * ww) + 1), max(int(y1 * hh), int(y0 * hh) + 1)
            fr = smp["frame"]; lo = max(1, fr - step * 2); rev = 0
            for i in range(fr, lo, -1):
                d = cv2.absdiff(grays[i], grays[i - 1]).astype(float)
                inside = d[Y0:Y1, X0:X1].mean(); m = np.ones_like(d, bool); m[Y0:Y1, X0:X1] = False; outside = d[m].mean()
                if inside > THRESH["reveal_box_ratio"] * outside and inside > 2:
                    rev += 1
                elif rev:
                    break
            at_cut = any(abs(fr - c) <= step for c in cuts) or k == 0
            events.append({"t": smp["t"], "text": it["text"], "box": [round(v, 3) for v in it["box"]], "reveal_frames": rev,
                           "reveal_s": round(rev / fps, 2), "arrives": "with a cut" if at_cut and rev <= 1 else ("animated in place" if rev > 2 else "cuts on in place")})
    on = sum(1 for s in texts if s["items"]) / max(1, len(texts))
    first_last = float(cv2.absdiff(small[0], small[-1]).mean())
    # frame grabs, 1 per second
    for sec in range(int(dur) + 1):
        i = min(n - 1, int(sec * fps)); cap = cv2.VideoCapture(str(path)); cap.set(cv2.CAP_PROP_POS_FRAMES, i); ok, f = cap.read()
        if ok:
            cv2.imwrite(str(FR / f"{vid}_{sec:03d}.jpg"), cv2.resize(f, (270, int(270 * f.shape[0] / f.shape[1]))), [cv2.IMWRITE_JPEG_QUALITY, 80])
    lens = [s["len_s"] for s in shots]
    return {"id": vid, "role": role, "file": str(path.relative_to(ROOT)).replace("\\", "/"), "duration_s": round(dur, 2), "fps": round(fps, 3), "w": W, "h": H,
            "frames": n, "cuts": len(cuts), "shots": shots, "median_shot_s": round(st.median(lens), 2), "cuts_per_10s": round(10 * len(cuts) / dur, 2),
            "transition_frames": trans, "hard_cut_share": round(sum(1 for t in trans if t <= 2) / len(trans), 2) if trans else None,
            "camera_counts": dict(Counter(s["camera"] for s in shots)), "text_on_screen_share": round(on, 2), "text_events": events,
            "first_text_s": events[0]["t"] if events else None, "first_last_mean_abs_diff": round(first_last, 1), "loops": first_last < THRESH["loop_mean_abs_diff"],
            "ocr_samples": texts}

if __name__ == "__main__":
    import easyocr
    reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    posts = json.load(open(B / "existing" / "posts.json", encoding="utf-8"))
    vids = [("board_43001699", B / "board" / "media" / "43001699.mp4", "board")]
    for p in posts:
        if p["type"] == "Video":
            f = ROOT / "research" / "ostad" / "audio" / f"in_{p['shortCode']}.mp4"
            if f.exists():
                vids.append((f"ig_{p['shortCode']}", f, "instagram"))
    res = []
    for vid, path, role in vids:
        r = analyse(vid, path, role, reader); res.append(r)
        print(vid, r["duration_s"], "s, cuts", r["cuts"], "median shot", r["median_shot_s"], r["camera_counts"], "text", r["text_on_screen_share"], "events", len(r["text_events"]), "loops", r["loops"], flush=True)
    missing = [p["shortCode"] for p in posts if p["type"] == "Video" and not (ROOT / "research" / "ostad" / "audio" / f"in_{p['shortCode']}.mp4").exists()]
    json.dump({"thresholds": THRESH, "videos": res, "instagram_clips_missing_on_disk": missing}, open(OUT / "motion.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
