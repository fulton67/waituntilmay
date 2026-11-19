"""Verify the P0010 AviClear Story render (src/bastory). Prints JSON; writes check images to <outdir> (keep them outside the repo).

  python -I brand/scripts/ba_story_verify.py <story.mp4> <outdir> [story|feed]

  format   size, fps, frames, duration, codec
  flashes  the repo's rule (undereye_verify_v2): one-frame mean-luma spikes > 30 levels, both directions (target 0)
  edges    every 10th frame: the photo window's outer 12 px band on each side and its four 60 px corners, compared with the clean
           pair in public/ba-story (both cut inside the clean area of the sheet). Also a direct test for sheet artefacts: no
           near-white (sheet margin) or near-black (seam/text) run along any window edge. Corner crops of the sweep frames are
           tiled into <outdir>/edges.png for a visual check.
  posters  first frame and an end-card frame as PNG
"""
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

# photo window in the frame (Story.tsx LAYOUTS): story k=1, feed k=0.92 (1080x1350)
WINS = {"story": (799, 858, 141, 376), "feed": (865, 929, 108, 180)}
# story only: the empty zone left for the Instagram link sticker (x0, y0, x1, y1); it must stay plain paper in every frame
STICKER = (240, 1380, 840, 1540)
IVORY_BGR = np.array([235, 242, 245])


def main():
    global W, H, X0, Y0
    W, H, X0, Y0 = WINS[sys.argv[3] if len(sys.argv) > 3 else "story"]
    mp4, out = Path(sys.argv[1]), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(str(mp4))
    fps = cap.get(cv2.CAP_PROP_FPS)
    frames, luma = [], []
    while True:
        ok, f = cap.read()
        if not ok:
            break
        frames.append(f)
        luma.append(float(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).mean()))
    n = len(frames)
    zone = None
    if sys.argv[3:4] == ["story"]:
        x0, y0, x1, y1 = STICKER
        dev = [float(np.abs(f[y0:y1, x0:x1].astype(int) - IVORY_BGR).max()) for f in frames]
        zone = {"max_dev_from_paper": round(max(dev), 1), "frames_over_8": sum(d > 8 for d in dev)}
    probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height,pix_fmt",
                            "-of", "json", str(mp4)], capture_output=True, text=True)
    m = luma
    spikes = [k for k in range(1, n - 1) if (m[k] - m[k - 1] > 30 and m[k] - m[k + 1] > 30) or (m[k - 1] - m[k] > 30 and m[k + 1] - m[k] > 30)]
    maxstep = max(abs(m[k] - m[k - 1]) for k in range(1, n))
    # edges: sheet margin is pure white (>245 all channels), seams/caption strokes near black on a light band; count such pixels
    # in a 6 px band just inside the window (the rounded corners are skipped by 34 px)
    bad = []
    tiles = []
    for k in range(0, n, 10):
        f = frames[k]
        win = f[Y0:Y0 + H, X0:X0 + W]
        bands = {"top": win[2:8, 34:-34], "bottom": win[-8:-2, 34:-34], "left": win[34:-34, 2:8], "right": win[34:-34, -8:-2]}
        for side, b in bands.items():
            white = float((b.min(axis=2) > 245).mean())
            if white > 0.02:
                bad.append({"frame": k, "side": side, "white_frac": round(white, 3)})
        if k % 30 == 0 and k < 280:
            c = 110
            corners = [win[:c, :c], win[:c, -c:], win[-c:, :c], win[-c:, -c:], win[:c, W // 2 - c // 2:W // 2 + c // 2], win[H // 2 - c // 2:H // 2 + c // 2, -c:]]
            tiles.append(np.hstack(corners))
    cv2.imwrite(str(out / "edges.png"), np.vstack(tiles))
    cv2.imwrite(str(out / "poster_first.png"), frames[0])
    cv2.imwrite(str(out / "poster_end.png"), frames[n - 15])
    sheet = [cv2.resize(frames[min(n - 1, int(s * fps))], (270, frames[0].shape[0] * 270 // 1080)) for s in (0.5, 1.2, 1.9, 3.3, 5.2, 6.1, 7.6, 8.3, 9.6, 11.3)]
    cv2.imwrite(str(out / "sheet.png"), np.vstack([np.hstack(sheet[:5]), np.hstack(sheet[5:])]))
    print(json.dumps({"frames": n, "fps": fps, "duration_s": round(n / fps, 3), "probe": json.loads(probe.stdout or "{}").get("streams"),
                      "flashes": {"one_frame_luma_spikes": len(spikes), "frames": spikes, "max_frame_step": round(maxstep, 2)},
                      "edge_white_runs": bad[:20], "edge_checked_frames": len(range(0, n, 10)), "sticker_zone": zone}, indent=1))


if __name__ == "__main__":
    main()
