"""Oct 14 colour proof (coordinator rule 1, 2026-11-19): the render's footage must match a PLAIN ffmpeg decode of the source frame
(no tone map) within 2 levels (mean abs diff) in a graphics-free region.

  $PY -I research/ostad/style/oct14/colour_check.py <render.mp4> <out.json> [frame ...]

For each comp frame: the piece under it, the source frame Remotion shows (floor(trimBefore + t * rate)), decoded by ffmpeg to rgb24
(the plain decode the rule names), the piece's punch-in applied (scale about punchO), then the mean |diff| over a 220 px patch at the
top-left / top-right corners of the frame (wall; no card, caption or mark is placed there on these frames). Pass = every patch <= 2.
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parents[4]
PUB = ROOT / "brand/remotion/public/oct14"
P = json.loads((PUB / "props.json").read_text(encoding="utf-8"))
W, H = 1080, 1920


def plain(role, idx):
    """ffmpeg plain decode of source frame idx (select by frame number; rgb24, no tone mapping)"""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(PUB / f"{role}.mp4"), "-vf", f"select=eq(n\\,{idx})", "-vsync", "0", "-frames:v", "1",
                          "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(H, W, 3)


def main():
    src, out = sys.argv[1], Path(sys.argv[2])
    frames = [int(a) for a in sys.argv[3:]] or [160, 300, 450, 840, 1300, 1820, 2100]
    cap = cv2.VideoCapture(src)
    rows = []
    want = sorted(frames)
    i = -1
    while want:
        ok, fr = cap.read()
        if not ok:
            break
        i += 1
        if i != want[0]:
            continue
        want.pop(0)
        pc = next(p for p in P["pieces"] if p["at"] <= i < p["at"] + p["dur"])
        idx = int(np.floor(round(pc["pictureFrom"] * 24) + (i - pc["at"]) * P["speed"] + 1e-6))
        ref = plain(pc["pictureRole"], idx)
        s = pc.get("punch") or 1
        o = pc.get("punchO") or [0.4, 0.42]
        ox, oy = o[0] * W, o[1] * H
        ref = cv2.warpAffine(ref, np.float32([[s, 0, ox * (1 - s)], [0, s, oy * (1 - s)]]), (W, H), flags=cv2.INTER_LINEAR)
        for name, (x0, y0) in {"top-left": (0, 0), "top-right": (W - 220, 0)}.items():
            a = fr[y0:y0 + 220, x0:x0 + 220].astype(int)
            b = ref[y0:y0 + 220, x0:x0 + 220].astype(int)
            rows.append({"f": i, "piece": pc["id"], "src_frame": idx, "patch": name, "mean_abs": round(float(np.abs(a - b).mean()), 2),
                         "bgr_mean_diff": [round(float(v), 2) for v in (a - b).mean(axis=(0, 1))]})
    worst = max(r["mean_abs"] for r in rows)
    res = {"render": src, "worst_mean_abs": worst, "bound": 2.0, "pass": worst <= 2.0, "rows": rows}
    out.write_text(json.dumps(res, indent=1))
    print(json.dumps({k: v for k, v in res.items() if k != "rows"}), [(r["f"], r["patch"], r["mean_abs"]) for r in rows])


if __name__ == "__main__":
    main()
