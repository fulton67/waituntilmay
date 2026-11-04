"""Measure that every overlay render really carries transparency.
PNG frames: top corners alpha 0 (shoulders may touch the bottom ones), at least 30% of pixels fully transparent, some pixels alpha 255. WebM: decoded with libvpx-vp9 (the only decoder that reads VP9 alpha),
alpha plane has both 0 and 255. MP4: duration = frames / 24. Writes renders/ALPHA_CHECK.json, exits 1 on any failure.
"""
import json, pathlib, subprocess, sys, tempfile
from PIL import Image

R = pathlib.Path(__file__).resolve().parents[1] / "renders"
res, bad = {}, 0
for d in sorted(p for p in R.iterdir() if (p / "frames").is_dir()):
    frames = sorted((d / "frames").glob("*.png"))
    a0 = Image.open(frames[0]); a = Image.open(frames[len(frames) // 2]).getchannel("A")
    w, h = a.size
    corners = [a.getpixel(p) for p in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1))]
    lo, hi = a.getextrema()
    clear = sum(a.histogram()[:1]) / (w * h)
    with tempfile.TemporaryDirectory() as t:
        out = pathlib.Path(t) / "f.png"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-c:v", "libvpx-vp9", "-i", str(d / f"{d.name}.webm"),
                        "-vf", f"select=eq(n\,{len(frames) // 2})", "-frames:v", "1", str(out)], check=True)
        wa = Image.open(out)
        wmode = wa.mode
        wlo, whi = wa.getchannel("A").getextrema() if "A" in wa.mode else (255, 255)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(d / f"{d.name}.mp4")],
                               capture_output=True, text=True).stdout.strip() or 0)
    r = {"frames": len(frames), "png_mode": a0.mode, "size": f"{w}x{h}", "png_corner_alpha": corners, "png_alpha_range": [lo, hi], "png_transparent_share": round(clear, 3),
         "webm_decoded_mode": wmode, "webm_alpha_range": [wlo, whi], "webm_mb": round((d / f"{d.name}.webm").stat().st_size / 1e6, 2),
         "mp4_s": round(dur, 2), "mp4_expected_s": round(len(frames) / 24, 2), "mp4_mb": round((d / f"{d.name}.mp4").stat().st_size / 1e6, 2)}
    r["ok"] = (a0.mode == "RGBA" and max(corners[:2]) == 0 and clear >= 0.3 and hi == 255 and wlo == 0 and whi >= 250
               and abs(dur - len(frames) / 24) < 0.1)
    bad += not r["ok"]
    res[d.name] = r
    print(("ok  " if r["ok"] else "FAIL"), d.name, json.dumps(r))
json.dump(res, open(R / "ALPHA_CHECK.json", "w"), indent=1)
sys.exit(1 if bad else 0)
