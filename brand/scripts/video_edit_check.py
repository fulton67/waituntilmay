"""Check an edit made by scripts/video_edit.cjs, by measurement on the encoded file (not the render log).
  format: 1080x1920, video.fps, H.264 + AAC, duration = result dur_s (one frame of tolerance)
  speed:  footage length = source / speed (one frame); audio pitch is kept by atempo, so only length is tested
  loudness: ffmpeg ebur128 on the output, integrated within 1 LU of the target and true peak <= target TP + 0.5
  captions: every caption read back by OCR at its midpoint (easyocr, band rows 72-86% of height), letter similarity >= 0.8
  layout: lower third above the caption box, both inside the side margins; end card text readable in the last second
usage: brand-venv python -I brand/scripts/video_edit_check.py brand/edits/<slug>  -> <slug>/check.json"""
import json, pathlib, re, subprocess, sys, difflib
import cv2, easyocr, numpy as np
D = pathlib.Path(sys.argv[1]).resolve(); R = json.load(open(D / "result.json", encoding="utf-8")); C = json.load(open(D / "edit.json", encoding="utf-8"))
out = pathlib.Path(R["out"]); FPS = R["fps"]; spec = R["spec"]
pr = R["probe"]; v = next(s for s in pr["streams"] if s["codec_type"] == "video"); a = next((s for s in pr["streams"] if s["codec_type"] == "audio"), None)
dur = float(pr["format"]["duration"])
fmt = {"w": v["width"], "h": v["height"], "fps": v["r_frame_rate"], "vcodec": v["codec_name"], "acodec": a and a["codec_name"], "dur_s": dur,
       "ok": v["width"] == 1080 and v["height"] == 1920 and v["r_frame_rate"] == f"{FPS}/1" and v["codec_name"] == "h264" and bool(a) and abs(dur - R["dur_s"]) <= 1.5 / FPS}
speed = {"source_s": R["source_s"], "footage_s": R["footage_s"], "expected_s": R["source_s"] / R["speed"]}
speed["ok"] = abs(speed["footage_s"] - speed["expected_s"]) <= 1.5 / FPS
eb = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(out), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
summ = eb[eb.rfind("Summary:"):]
I = float(re.search(r"I:\s+(-?[\d.]+) LUFS", summ).group(1)); TP = float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", summ).group(1))
L = C.get("loudness", {"I": -14, "TP": -1.5})
loud = {"I": I, "TP": TP, "target": L, "ok": abs(I - L["I"]) <= 1 and TP <= L["TP"] + 0.5}
rd = easyocr.Reader(["en"], gpu=False, verbose=False)
def frame(t):
    p = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(out), "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
    return cv2.imdecode(np.frombuffer(p, np.uint8), cv2.IMREAD_COLOR)
letters = lambda s: re.sub(r"[^a-z]", "", s.lower())
def read(im, a, b):
    h = im.shape[0]; return " ".join(t for _, t, c in rd.readtext(im[int(h * a):int(h * b)]) if c >= 0.3)
caps = []
for c in spec["captions"]:
    t = (c["from"] + c["to"]) / 2; im = frame(t); txt = read(im, 0.78, 0.93)
    # the lower third (first ~4 s) and the embroidery share these rows: score the best-matching run of letters of the same length
    want, got = letters(c["text"]), letters(txt); n = len(want)
    best = max((difflib.SequenceMatcher(None, want, got[i:i + n]).ratio() for i in range(0, max(1, len(got) - n + 1))), default=0)
    caps.append({"t": round(t, 2), "text": c["text"], "read": txt, "sim": round(best, 3), "ok": best >= 0.8})
rc = R["rects"]; lt, cp = rc["lower_third"], rc["caption"]
layout = {"lower_third_bottom": lt and lt["bottom"], "caption_top": cp and cp["top"], "ok": bool(lt and cp) and lt["bottom"] <= cp["top"] and lt["left"] >= 0 and cp["right"] <= 1080}
end_txt = read(frame(dur - 1.0), 0.0, 1.0)
end = {"read": end_txt, "ok": "consultation" in end_txt.lower()}
res = {"out": str(out), "format": fmt, "speed": speed, "loudness": loud, "captions": {"n": len(caps), "passed": sum(c["ok"] for c in caps), "min_sim": min(c["sim"] for c in caps), "rows": caps},
       "layout": layout, "end_card": end, "adobe_fonts": R["adobe_fonts"], "render_errors": len(R["errors"]), "captions_unfit": R["captions_unfit"]}
res["ok"] = fmt["ok"] and speed["ok"] and loud["ok"] and res["captions"]["passed"] == len(caps) and layout["ok"] and end["ok"] and R["adobe_fonts"] and not R["errors"] and not R["captions_unfit"]
json.dump(res, open(D / "check.json", "w", encoding="utf-8"), indent=1)
print("ok", res["ok"], "| format", fmt["ok"], "| speed", speed["ok"], "| loudness", I, "LUFS", TP, "dBTP", loud["ok"], "| captions", res["captions"]["passed"], "/", len(caps),
      "min", res["captions"]["min_sim"], "| layout", layout["ok"], "| end", end["ok"])
for c in caps:
    if not c["ok"]: print("FAIL", c["t"], repr(c["text"]), "->", repr(c["read"]), c["sim"])
