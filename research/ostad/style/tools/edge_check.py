"""edge_check.py: find a straight source-frame edge on the keyed presenter (gap round 2, DECISIONS 14p).

His keyed take is a 1080x1920 phone frame. Where his body or arm reaches a side of that frame, the matte ends in a straight
line, which reads as a hard cut through him. This is a column-edge detector on the alpha he is composited with:

  effective alpha = matte (matte_pha_cut.mp4, 30 fps, the whole cut) x the feather ramp the composition applies (--ramp)

For every composition frame where he is keyed on the canvas (beats.json, not the step-out ranges), it maps the frame to the matte
frame (t = f / 24 x 1.15), takes the frame-edge column (right: x 1079; left: x 0; bottom row y 1919), keeps the part that lands on
screen at LAYER6 (0.7x at -30, -150), and measures the longest run of pixels whose effective alpha is >= 0.5 there. A run >= --min
screen px is a visible straight edge (a hard step from opaque to nothing across one column).

  python -I edge_check.py [--ramp 0] [--min 12] [--out exomind/gap/edge_check.json]

--ramp N: the composition fades the right N source px of the plate to 0 (linear, as OstadYT6 does); 0 = no feather (before).
"""
from __future__ import annotations
import argparse, json, subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[4]
MATTE = ROOT / "brand/edits/exomind-skin/matte_pha_cut.mp4"
BEATS = ROOT / "research/ostad/style/exomind/beats.json"
W, H, FPS_M = 1080, 1920, 30
SCALE, LX, LY = 0.7, -30, -150
SPEED = 1.15
# presenter off (OstadYT6 OUT_RANGES + S3 over B13's first frames)
OUT = [("B04", "B04"), ("B06", "B06"), ("B09", "B09"), ("B11", "B12"), ("B15", "B15"), ("B17", "B18")]


def keyed_frames(beats: dict, s3_len: int) -> list[int]:
    bt = {b["id"]: b for b in beats["beats"]}
    off = [(bt[a]["start_f"], bt[b]["end_f"]) for a, b in OUT] + [(bt["B13"]["start_f"], bt["B13"]["start_f"] + s3_len - 1)]
    return [f for f in range(beats["duration_f"]) if not any(a <= f <= b for a, b in off)]


def read_edges() -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """the right 40 columns, the left column and the bottom row of every matte frame (grey 0-255)"""
    def pipe(vf: str, w: int, h: int) -> np.ndarray:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(MATTE), "-vf", vf, "-pix_fmt", "gray", "-f", "rawvideo", "-"],
                             capture_output=True, check=True).stdout
        return np.frombuffer(raw, np.uint8).reshape(-1, h, w)
    right = pipe(f"crop=40:{H}:{W - 40}:0", 40, H)
    left = pipe(f"crop=2:{H}:0:0", 2, H)[:, :, 0]
    bottom = pipe(f"crop={W}:2:0:{H - 2}", W, 2)[:, 1, :]
    return right, left, bottom


def longest_run(mask: np.ndarray) -> int:
    best = cur = 0
    for v in mask:
        cur = cur + 1 if v else 0
        best = max(best, cur)
    return best


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ramp", type=int, default=0)
    ap.add_argument("--min", type=float, default=12.0)
    ap.add_argument("--s3", type=int, default=80, help="S3 card length over B13 (frames; 30 before gap round 2)")
    ap.add_argument("--out", default="research/ostad/style/exomind/gap/edge_check.json")
    a = ap.parse_args()
    beats = json.loads(BEATS.read_text(encoding="utf-8"))
    frames = keyed_frames(beats, a.s3)
    right, left, bottom = read_edges()
    n = len(right)
    # on-screen source rows / cols at LAYER6
    y0, y1 = max(0, int(np.ceil(-LY / SCALE))), min(H, int((1080 - LY) / SCALE))
    x_left_screen = LX  # source col 0 lands at screen x -30: off screen
    right_screen = LX + W * SCALE  # 726
    bottom_screen = LY + H * SCALE  # 1194: off screen
    ramp = a.ramp
    # effective alpha at the last column: the ramp is 0 at the frame edge, so any ramp > 0 takes the edge column to 0; the
    # visible "edge" is then the steepest column step inside the ramp. Measure the step between adjacent columns instead.
    bt = {b["id"]: b for b in beats["beats"]}
    def beat_of(f: int) -> str:
        for b in beats["beats"]:
            if b["start_f"] <= f <= b["end_f"]:
                return b["id"]
        return "END"
    rows = []
    for f in frames:
        i = min(n - 1, round(f / 24 * SPEED * FPS_M))
        al = right[i].astype(np.float32) / 255.0  # H x 40, col 39 = x 1079
        if ramp > 0:
            xs = np.arange(W - 40, W)
            g = np.clip((W - 1 - xs) / ramp, 0, 1)  # 0 at the edge, 1 at ramp px in
            al = al * g[None, :]
        al = al[y0:y1]
        # a straight edge = a column step: alpha >= 0.5 in one column and < 0.5 in the next one out (or the frame edge itself)
        step_edge = al[:, -1] >= 0.5  # opaque at the frame edge: a cut
        step_in = (al[:, :-3] - al[:, 3:]) >= 0.5  # a drop >= 0.5 across 3 source columns (2 screen px): a hard edge inside
        run = max(longest_run(step_edge), max((longest_run(step_in[:, c]) for c in range(step_in.shape[1])), default=0))
        run_px = run * SCALE
        steep = float(np.max(al[:, :-1] - al[:, 1:])) if al.size else 0.0  # steepest one-column alpha drop
        rows.append({"f": f, "beat": beat_of(f), "right_run_px": round(run_px, 1), "steep": round(steep, 3)})
    bad = [r for r in rows if r["right_run_px"] >= a.min]
    per_beat: dict[str, dict] = {}
    for r in rows:
        d = per_beat.setdefault(r["beat"], {"frames": 0, "edge_frames": 0, "max_px": 0.0})
        d["frames"] += 1
        if r["right_run_px"] >= a.min:
            d["edge_frames"] += 1
        d["max_px"] = max(d["max_px"], r["right_run_px"])
    left_hits = int(sum(1 for f in frames if (left[min(n - 1, round(f / 24 * SPEED * FPS_M))][y0:y1] >= 128).any()))
    bottom_hits = int(sum(1 for f in frames if (bottom[min(n - 1, round(f / 24 * SPEED * FPS_M))] >= 128).any()))
    res = {
        "ramp_src_px": ramp, "min_run_screen_px": a.min, "keyed_frames": len(frames),
        "right_edge_screen_x": right_screen, "left_edge_screen_x": x_left_screen, "bottom_edge_screen_y": bottom_screen,
        "left_edge_on_screen": x_left_screen >= 0, "bottom_edge_on_screen": bottom_screen <= 1080,
        "left_opaque_frames_offscreen": left_hits, "bottom_opaque_frames_offscreen": bottom_hits,
        "right_edge_frames": len(bad), "steepest_column_drop": max((r["steep"] for r in rows), default=0), "right_edge_max_px": max((r["right_run_px"] for r in rows), default=0),
        "per_beat": per_beat,
        "edge_frames_list": [r["f"] for r in bad],
    }
    out = ROOT / a.out
    out.write_text(json.dumps(res, indent=1), encoding="utf-8")
    print(json.dumps({k: v for k, v in res.items() if k not in ("edge_frames_list",)}, indent=1))
    raise SystemExit(1 if bad else 0)


if __name__ == "__main__":
    main()
