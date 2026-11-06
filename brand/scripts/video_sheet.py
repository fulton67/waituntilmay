"""Contact sheet of the video kit: each element's poster frame (60% through) on a mid-grey-green ground so alpha shows.
-> kit/video/sheet.png. brand-venv python -I."""
import json, pathlib
from PIL import Image, ImageDraw, ImageFont
V = pathlib.Path(__file__).resolve().parents[1] / "kit" / "video"; K = json.load(open(V / "video_kit.json", encoding="utf-8"))
try: F = ImageFont.truetype("arial.ttf", 16)
except OSError: F = ImageFont.load_default()
TW, TH, C = 216, 384, 7; els = K["elements"]; rows = (len(els) + C - 1) // C
S = Image.new("RGB", (C * (TW + 14) + 14, rows * (TH + 44) + 14), "#e6e2df"); d = ImageDraw.Draw(S)
for i, e in enumerate(els):
    x = 14 + (i % C) * (TW + 14); y = 14 + (i // C) * (TH + 44)
    bg = Image.new("RGB", (TW, TH), "#5d6e60"); im = Image.open(V / e["poster"]).convert("RGBA").resize((TW, TH), Image.LANCZOS); bg.paste(im, (0, 0), im); S.paste(bg, (x, y))
    d.text((x, y + TH + 6), f"{e['name']}", font=F, fill="#211b15"); d.text((x, y + TH + 24), f"{e['dur_s']:.1f} s · {e['frames']} f · {'alpha' if e['alpha'] else 'opaque'}", font=F, fill="#6b6460")
S.save(V / "sheet.png"); print(len(els), "elements")
