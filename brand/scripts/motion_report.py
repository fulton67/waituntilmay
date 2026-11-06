"""Phase 4 motion, reporting: brand/motion/motion.json -> brand/motion/BEATS.md, brand/motion/summary.json,
brand/fig/motion_contact.png, brand/fig/motion_shot_lengths.png, brand/fig/motion_camera.png, brand/fig/motion_text.png.
Each plate makes one claim. Run with brand-venv python -I after motion.py."""
import json, pathlib, statistics as st, sys
from collections import Counter
import numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.stdout.reconfigure(encoding="utf-8")
B = pathlib.Path(__file__).resolve().parents[1]; M = B / "motion"; FIG = B / "fig"
J = json.load(open(M / "motion.json", encoding="utf-8")); V = J["videos"]
# The flow classifier calls the board reel 'handheld/subject motion'. motion_board.py / motion_board_flow.py show a locked camera
# (border drift median 0.127 px/frame) with the content zooming 1 -> 4.47x -> 1.01x, so the board shot is relabelled from those files.
BD = json.load(open(M / "board_detail.json")); BF = json.load(open(M / "board_flow.json"))
for v in V:
    if v["role"] == "board":
        v["shots"][0]["camera_flow_classifier"] = v["shots"][0]["camera"]; v["shots"][0]["camera"] = "locked camera, content zooms"
        v["camera_counts"] = {"locked camera, content zooms": 1}
board = [v for v in V if v["role"] == "board"]; ig = [v for v in V if v["role"] == "instagram"]

def F(sz, bold=False):
    for n in (["arialbd.ttf"] if bold else []) + ["arial.ttf", "DejaVuSans.ttf"]:
        try: return ImageFont.truetype(n, sz)
        except OSError: pass
    return ImageFont.load_default()

def agg(vs):
    shots = [s for v in vs for s in v["shots"]]; ev = [e for v in vs for e in v["text_events"]]; tr = [t for v in vs for t in v["transition_frames"]]
    return {"videos": len(vs), "total_s": round(sum(v["duration_s"] for v in vs), 1), "median_duration_s": st.median([v["duration_s"] for v in vs]),
            "shots": len(shots), "median_shot_s": st.median([s["len_s"] for s in shots]) if shots else None,
            "shot_s_iqr": [round(float(np.percentile([s["len_s"] for s in shots], q)), 2) for q in (25, 75)] if shots else None,
            "cuts_per_10s_median": st.median([v["cuts_per_10s"] for v in vs]),
            "hard_cut_share": round(sum(1 for t in tr if t <= 2) / len(tr), 2) if tr else None, "transition_frames_median": st.median(tr) if tr else None,
            "camera_counts": dict(Counter(s["camera"] for s in shots)),
            "camera_share_by_time": {k: round(sum(s["len_s"] for s in shots if s["camera"] == k) / sum(s["len_s"] for s in shots), 2) for k in Counter(s["camera"] for s in shots)},
            "text_on_screen_share_median": st.median([v["text_on_screen_share"] for v in vs]),
            "first_text_s_median": st.median([v["first_text_s"] for v in vs if v["first_text_s"] is not None]) if any(v["first_text_s"] is not None for v in vs) else None,
            "text_events": len(ev), "text_arrivals": dict(Counter(e["arrives"] for e in ev)),
            "reveal_s_median_animated": st.median([e["reveal_s"] for e in ev if e["arrives"] == "animated in place"]) if any(e["arrives"] == "animated in place" for e in ev) else None,
            "text_box_top_median": st.median([e["box"][1] for e in ev]) if ev else None, "text_box_bottom_median": st.median([e["box"][3] for e in ev]) if ev else None,
            "text_box_left_median": st.median([e["box"][0] for e in ev]) if ev else None,
            "loops": sum(v["loops"] for v in vs), "aspect": dict(Counter(f"{v['w']}x{v['h']}" for v in vs)), "fps": dict(Counter(v["fps"] for v in vs))}
S = {"board": agg(board), "instagram": agg(ig), "thresholds": J["thresholds"]}
json.dump(S, open(M / "summary.json", "w", encoding="utf-8"), indent=1)

# BEATS.md
L = ["# Motion beats", "", "Measured by `scripts/motion.py` (thresholds in `motion.json` → `thresholds`). One table per video: shots with camera motion, then text as it arrives.",
     "The board reel is read frame by frame in `board_detail.json` and `board_flow.json` (`scripts/motion_board.py`, `scripts/motion_board_flow.py`); its beats come first.", "",
     "## Board reel 43001699 — the direction", "",
     f"One {BD['duration_s']} s take, {BD['fps']:.0f} fps, 1080×1920, no cuts, no text. Camera locked (border drift median {BD['global_drift_px_median']} px/frame at 270 px wide); "
     f"content moves on {BD['moving_area_pct_median']}% of the frame per frame (median), {int(100*BD['held_frame_share'])}% held frames (not stop-motion).", "",
     "| Beat | In | Out | What moves | Speed (px/frame at 270 px, median per second) |", "|---|---|---|---|---|"]
zi, zo = BF["zoom_in_spans_s"][0], BF["zoom_out_spans_s"][0]; sb = BF["speed_by_second"]
L += [f"| 1 · pattern drifts | 0.00 | {zi[0]} | full product pattern on white, objects drift | {sb['0']}, {sb['1']}, {sb['2']} |",
      f"| 2 · zoom in | {zi[0]} | {zi[1]} | scale climbs to {BF['cum_scale_max']}× (max at {BF['cum_scale_at_max_t']} s), motion blur; {BF['zoom_easing'][0]['shape']}, peak at {BF['zoom_easing'][0]['peak_at']} of the span | {sb['3']}, {sb['4']} |",
      f"| 3 · close hold | {zi[1]} | {zo[0]} | a few large products slide past | {sb['5']}, {sb['6']} |",
      f"| 4 · zoom out | {zo[0]} | {zo[1]} | back to the pattern, scale {BF['cum_scale_end']}× at the end; {BF['zoom_easing'][1]['shape']}, {int(100*BF['zoom_easing'][1]['first_half_share'])}% of the change in the first half | {sb['7']}, {sb['8']} |",
      f"| 5 · settle | {zo[1]} | {BD['duration_s']} | pattern drifts to a stop | {sb['9']} |", ""]
for v in V:
    L += [f"## {v['id']} ({v['role']}) — {v['duration_s']} s, {v['w']}×{v['h']} @ {v['fps']} fps", "",
          f"{v['cuts']} cuts, median shot {v['median_shot_s']} s, transitions {v['transition_frames']} frames, text on screen in {int(100 * v['text_on_screen_share'])}% of samples, loops: {'yes' if v['loops'] else 'no'} (first/last diff {v['first_last_mean_abs_diff']}).", "",
          "| # | In | Out | Length | Camera |", "|---|---|---|---|---|"]
    for i, s in enumerate(v["shots"], 1):
        L.append(f"| {i} | {s['start_s']} | {s['end_s']} | {s['len_s']} | {s['camera']} |")
    if v["text_events"]:
        L += ["", "| Text at | Text | Arrives | Reveal |", "|---|---|---|---|"]
        for e in v["text_events"][:40]:
            L.append(f"| {e['t']} s | {e['text'][:60].replace('|', '/')} | {e['arrives']} | {e['reveal_s']} s |")
    L.append("")
(M / "BEATS.md").write_text("\n".join(L), encoding="utf-8")

# contact sheet: board reel every second, then 8 evenly spaced frames per Instagram clip
frames = sorted((M / "frames").glob("*.jpg")); TW, TH = 120, 213
rows = [("board 43001699 (every second)", [f for f in frames if f.name.startswith("board_")])]
for v in ig:
    fs = [f for f in frames if f.name.startswith(v["id"] + "_")]
    if fs: rows.append((v["id"], [fs[int(i)] for i in np.linspace(0, len(fs) - 1, min(10, len(fs)))]))
cols = max(len(r[1]) for r in rows); pad = 230
sheet = Image.new("RGB", (pad + cols * (TW + 4), len(rows) * (TH + 8) + 50), "white"); d = ImageDraw.Draw(sheet)
d.text((10, 12), "MOTION CONTACT SHEET — the board reel against Dr. Ostad's own clips", fill="black", font=F(20, True))
for r, (name, fs) in enumerate(rows):
    y = 50 + r * (TH + 8); d.text((10, y + TH // 2 - 8), name, fill="black", font=F(14))
    for c, f in enumerate(fs):
        im = Image.open(f); im.thumbnail((TW, TH)); sheet.paste(im, (pad + c * (TW + 4), y))
sheet.save(FIG / "motion_contact.png")

# plate 1: shot-length strips, coloured by camera motion
COL = {"locked camera, content zooms": (191, 134, 98), "static": (190, 187, 183), "push-in": (166, 121, 88), "pull-out": (128, 84, 61), "pan": (80, 95, 83), "tilt": (125, 128, 117), "handheld/subject motion": (33, 27, 21)}
W1, rowh = 1400, 34; maxd = max(v["duration_s"] for v in V)
im = Image.new("RGB", (W1, 110 + len(V) * rowh + 60), "white"); d = ImageDraw.Draw(im)
d.text((20, 15), "SHOT LENGTHS", fill="black", font=F(26, True))
d.text((20, 50), f"The board reel is one {S['board']['median_shot_s']} s take; Dr. Ostad's clips cut every {S['instagram']['median_shot_s']} s (median shot, {S['instagram']['shots']} shots).", fill="black", font=F(16))
x0 = 260; sc = (W1 - x0 - 30) / maxd
for i, v in enumerate(V):
    y = 100 + i * rowh; d.text((20, y + 8), v["id"], fill="black", font=F(13, v["role"] == "board"))
    for s in v["shots"]:
        d.rectangle([x0 + s["start_s"] * sc, y + 4, max(x0 + s["start_s"] * sc + 1, x0 + s["end_s"] * sc - 2), y + rowh - 6], fill=COL.get(s["camera"], (0, 0, 0)))
y = 100 + len(V) * rowh + 15; x = 20
for k, c in COL.items():
    d.rectangle([x, y, x + 16, y + 16], fill=c); d.text((x + 22, y), k, fill="black", font=F(13)); x += 30 + int(d.textlength(k, font=F(13)))
for t in range(0, int(maxd) + 1, 5):
    d.text((x0 + t * sc - 4, 85), f"{t}s", fill=(120, 120, 120), font=F(11))
im.save(FIG / "motion_shot_lengths.png")

# plate 2: camera motion share of screen time
im = Image.new("RGB", (1100, 420), "white"); d = ImageDraw.Draw(im)
d.text((20, 15), "CAMERA MOTION, SHARE OF SCREEN TIME", fill="black", font=F(24, True))
for r, (name, a) in enumerate([("board reel", S["board"]), ("Dr. Ostad's clips", S["instagram"])]):
    y = 90 + r * 140; d.text((20, y - 28), name, fill="black", font=F(16, True)); x = 20
    for k in COL:
        sh = a["camera_share_by_time"].get(k, 0)
        if sh <= 0: continue
        w = int(1040 * sh); d.rectangle([x, y, x + w - 2, y + 60], fill=COL[k])
        if w > 60: d.text((x + 6, y + 66), f"{k} {int(100 * sh)}%", fill="black", font=F(12))
        x += w
im.save(FIG / "motion_camera.png")

# plate 3: how text arrives
im = Image.new("RGB", (1100, 420), "white"); d = ImageDraw.Draw(im)
d.text((20, 15), "HOW TEXT ARRIVES", fill="black", font=F(24, True))
TC = {"with a cut": (33, 27, 21), "cuts on in place": (125, 128, 117), "animated in place": (166, 121, 88)}
for r, (name, a) in enumerate([("board reel", S["board"]), ("Dr. Ostad's clips", S["instagram"])]):
    y = 90 + r * 140; tot = sum(a["text_arrivals"].values()) or 1
    d.text((20, y - 28), f"{name} — {a['text_events']} text events, on screen in {int(100 * a['text_on_screen_share_median'])}% of samples (median)", fill="black", font=F(16, True)); x = 20
    for k, c in TC.items():
        n = a["text_arrivals"].get(k, 0)
        if not n: continue
        w = int(1040 * n / tot); d.rectangle([x, y, x + w - 2, y + 60], fill=c)
        if w > 80: d.text((x + 6, y + 66), f"{k} {n}", fill="black", font=F(12))
        x += w
im.save(FIG / "motion_text.png")
print(json.dumps(S, indent=1))
