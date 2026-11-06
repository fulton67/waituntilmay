"""BUILDER Phase F: check the demo reel's captions by OCR, the same reader and settings as motion.py (easyocr, 540 px wide, conf >= 0.4).
Every 0.5 s of footage, read the band rows 70-90% of height in the rendered reel frame and in the treated source frame under it.
Pass: our caption line is read in the reel, and no burnt-in word read in the source band (that is not also a word of our line) is
readable anywhere in the reel band. Our lower third and the embroidered "Ostad M.D." on his scrubs are in these rows too, so the test
compares against the source's words rather than whitelisting ours. "armed" samples are those where the source has such words. -> kit/video/reel_check.json. brand-venv python -I."""
import json, pathlib, re
import cv2, easyocr
B = pathlib.Path(__file__).resolve().parents[1]; V = B / "kit" / "video"; R = json.load(open(V / "reel.json", encoding="utf-8"))
FPS = R["fps"]; rd = easyocr.Reader(["en"], gpu=False, verbose=False)
norm = lambda s: re.sub(r"[^a-z]", " ", s.lower()).split()
def read(p, rows=None):
    """text read in rows 70-90% of height; rows=(a, b) keeps only boxes whose centre is between a and b (fractions of full height)"""
    im = cv2.imread(str(p)); h, w = im.shape[:2]; band = im[int(h * 0.70):int(h * 0.90)]
    s = cv2.resize(band, (540, int(540 * band.shape[0] / w))); sh = s.shape[0]
    cy = lambda bx: 0.70 + (sum(pt[1] for pt in bx) / 4) / sh * 0.20
    return [t for bx, t, c in rd.readtext(s) if c >= 0.4 and len(re.sub(r"\W", "", t)) >= 3 and (rows is None or rows[0] <= cy(bx) <= rows[1])]
rows = []; t = 0.25
while t < R["footage_s"] - R["spec"]["end"]["dissolve"]:
    i = round(t * FPS); line = next(c["text"] for c in R["spec"]["captions"] if c["from"] <= t < c["to"])
    reel = read(V / "_frames" / "reel" / f"{i:04d}.png"); src = read(V / "_frames" / "reel_bg" / f"{i + 1:04d}.png", (0.74, 0.82))  # burnt-in caption rows (motion.json ocr boxes 0.75-0.80); excludes the embroidery at 0.85-0.88
    letters = lambda xs: re.sub(r"[^a-z]", "", " ".join(xs).lower())
    reel_j, line_j = letters(reel), letters([line])
    burnt = sorted({w for x in src for w in norm(x) if len(w) >= 4 and w not in line_j})  # burnt-in words that are not our caption's words
    leaked = [w for w in burnt if w in reel_j]
    rows.append({"t": t, "line": line, "reel_text": reel, "source_text": src, "burnt_not_in_line": burnt, "leaked": leaked, "caption_read": line_j[:12] in reel_j or reel_j.find(line_j[:8]) >= 0,
                 "ok": not leaked and (line_j[:8] in reel_j)})
    t += 0.5
out = {"samples": len(rows), "passed": sum(r["ok"] for r in rows), "source_samples_with_burnt_text": sum(bool(r["source_text"]) for r in rows), "armed_samples": sum(bool(r["burnt_not_in_line"]) for r in rows), "rows": rows}
json.dump(out, open(V / "reel_check.json", "w", encoding="utf-8"), indent=1)
print(out["passed"], "/", out["samples"], "reel samples show only our caption;", out["source_samples_with_burnt_text"], "source samples have burnt-in text;", out["armed_samples"], "samples have burnt words outside our line")
for r in rows:
    if not r["ok"]: print("FAIL", r["t"], r["line"], r["reel_text"], r["leaked"])
