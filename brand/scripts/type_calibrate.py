"""FIX Phase 3: letter-spacing per role, from the board/Instagram pixel measurements, not by eye.
pixels.json measures tracking as the median glyph gap / (cap/0.7). That gap includes the font's own sidebearings, so each kit
font is rendered at zero tracking (type_calibrate.cjs) and measured with the same glyph-gap code as pixel_metrics.py
(glyphs() is copied verbatim). letter-spacing (em) = (T/100 * cap/0.7 - gap0) / font_size, which is size-independent.
-> fonts/specimen/calib/tracking.json"""
import json, pathlib, statistics as st, sys
import numpy as np, cv2
sys.stdout.reconfigure(encoding="utf-8")
B = pathlib.Path(__file__).resolve().parents[1]; C = B / "fonts" / "specimen" / "calib"

def glyphs(gray):  # verbatim from pixel_metrics.py
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    if (bw > 0).mean() > 0.5:
        bw = 255 - bw
    n, lab, stats, _ = cv2.connectedComponentsWithStats(bw, 8)
    H, W = gray.shape
    out = []
    for i in range(1, n):
        x, y, w, h, a = stats[i]
        if a < 6 or h < 0.2 * H or h > 0.98 * H or w > 0.6 * W:
            continue
        out.append((int(x), int(y), int(w), int(h)))
    return sorted(out)

def gap0(path):
    g = cv2.cvtColor(cv2.imread(str(path)), cv2.COLOR_BGR2GRAY)
    ys = np.where((g < 128).any(axis=1))[0]; g = g[max(0, ys.min() - 4): ys.max() + 4]  # tight band, as the OCR boxes are
    gl = glyphs(g); hs = np.array([h for *_, h in gl]); cap = float(np.percentile(hs, 85))
    gaps = [gl[i + 1][0] - (gl[i][0] + gl[i][2]) for i in range(len(gl) - 1)]; gaps = [x for x in gaps if x > -0.2 * cap]
    med = float(np.median(gaps)); letter = [x for x in gaps if x <= max(2 * med, 0.25 * cap)]
    return cap, float(np.median(letter))

px = json.load(open(B / "metrics" / "pixels.json", encoding="utf-8"))["regions"]
T = {role: st.median([r["tracking_pct_em"] for r in px if r["role"] == role and r.get("tracking_pct_em") is not None]) for role in ("headline", "caption", "label")}
fonts = json.load(open(C / "fonts.json", encoding="utf-8")); size = fonts["font_size_px"]
out = {"targets_pct_em_from_pixels_json": T, "fonts": {}}
for f in fonts["fonts"]:
    cap, g = gap0(C / (f["id"] + ".png"))
    out["fonts"][f["id"]] = {"cap_px_at_120": cap, "zero_tracking_pct_em": round(100 * g / (cap / 0.7), 2),
                            "letter_spacing_em": {role: round((t / 100 * cap / 0.7 - g) / size, 4) for role, t in T.items()}}
json.dump(out, open(C / "tracking.json", "w", encoding="utf-8"), indent=1)
print("targets", T)
for k, v in out["fonts"].items(): print(k, v["zero_tracking_pct_em"], v["letter_spacing_em"])
