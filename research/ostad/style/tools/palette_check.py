"""palette_check.py: fail highlight / markup colour outside the identity tokens, and flat fills over footage (user note 2026-11-17:
"where you highlighted in blue it isn't good because it throws off the glass cohesion"; LESSONS.md U-v2-6).

  python -I palette_check.py FILE.tsx [FILE.tsx ...]                 static check of colour literals and accent tokens
  python -I palette_check.py --pixels BARE.mp4 [--exempt a-b,c-d]    pixel check on a graphics-only render (bare pass)

Static: every colour literal (#hex, rgb(), rgba()) must be one of the glass-system tokens below; the accent tokens HL / ICE
(look.ts) may not be used at all, and BLUE only on arrow lines (the arrow system's colour). A line that draws an EXAMPLE of a named condition (a bruise, the Tyndall hue) may carry
`// lint-ok: example` and is skipped. Pixel: a frame fails when more than 400 px (at 540x960) are saturated blue (hue 190-240 deg,
S > 0.35, V > 0.25), outside the --exempt frame ranges (the example cards). Exit 1 on any failure.
"""
import re, sys
from pathlib import Path

ALLOWED = {"#1d2230", "#6b7183", "#ffffff", "#fff", "#f4f7fb", "#000", "#000000", "#c9d1db", "#373737", "#8e8e8e"}
ALLOWED_RGB = {(255, 255, 255), (0, 0, 0), (8, 12, 22), (29, 34, 48), (10, 14, 24), (238, 242, 247)}
BANNED_TOKENS = re.compile(r"\b(BLUE|HL|ICE|ICE_HL|SKY)\b")
HEX = re.compile(r"#[0-9a-fA-F]{3,8}\b")
RGB = re.compile(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)")


def static(files):
    bad = []
    for f in files:
        for n, line in enumerate(Path(f).read_text(encoding="utf-8").splitlines(), 1):
            if "lint-ok: example" in line or line.strip().startswith(("//", "import", "*")):
                continue
            for h in HEX.findall(line):
                if h.lower() not in ALLOWED:
                    bad.append(f"{f}:{n} colour {h}")
            for m in RGB.findall(line):
                if tuple(map(int, m)) not in ALLOWED_RGB:
                    bad.append(f"{f}:{n} colour rgb{m}")
            # brand blue is the arrow colour (ostad-video skill, LESSONS P4): allowed on arrow lines only
            if BANNED_TOKENS.search(line) and not ("Arrow" in line or "data-arrowhead" in line or "arrow" in line.lower() and "BLUE" in line and "Highlight" not in line):
                bad.append(f"{f}:{n} accent token {BANNED_TOKENS.search(line).group(1)}")
    return bad


def pixels(video, exempt):
    import cv2, numpy as np
    cap = cv2.VideoCapture(video)
    k, bad = 0, []
    while True:
        ok, im = cap.read()
        if not ok:
            break
        if not any(a <= k <= b for a, b in exempt):
            hsv = cv2.cvtColor(cv2.resize(im, (540, 960)), cv2.COLOR_BGR2HSV)
            h, s, v = hsv[..., 0].astype(int) * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
            n = int(((h >= 190) & (h <= 240) & (s > 0.35) & (v > 0.25)).sum())
            if n > 400:
                bad.append((k, n))
        k += 1
    return k, bad


def main():
    a = sys.argv[1:]
    if a and a[0] == "--pixels":
        ex = []
        if "--exempt" in a:
            ex = [tuple(map(int, r.split("-"))) for r in a[a.index("--exempt") + 1].split(",")]
        n, bad = pixels(a[1], ex)
        print(f"palette_check pixels: {n} frames, {len(bad)} with saturated blue outside the exempt ranges" + (f": first {bad[:5]}" if bad else ""))
        print("palette_check:", "PASS" if not bad else "FAIL")
        return 0 if not bad else 1
    bad = static(a)
    for b in bad:
        print("  FAIL", b)
    print(f"palette_check static: {len(a)} file(s), {len(bad)} violation(s)")
    print("palette_check:", "PASS" if not bad else "FAIL")
    return 0 if not bad else 1


if __name__ == "__main__":
    sys.exit(main())
