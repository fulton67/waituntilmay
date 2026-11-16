"""Composite the face-rig frames (blender/render_faces_video.py) on white, label each state, encode an MP4.
python -I faces_video.py FRAMEDIR OUT.mp4 [CONTOUR_PX]
The figure gets the guide's die-cut contour (C7: #100f0d, 2.0% of figure height; the frame shows ~0.56 of the figure,
so ~1.1% of the frame by default) by dilating its alpha.
"""
import json, os, subprocess, sys
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont

D, OUT = sys.argv[1], sys.argv[2]
CPX = int(sys.argv[3]) if len(sys.argv) > 3 else 12
KER = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * CPX + 1, 2 * CPX + 1))
labels = json.load(open(os.path.join(D, "labels.json")))
comp = os.path.join(D, "comp"); os.makedirs(comp, exist_ok=True)
try: font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 40); small = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 26)
except OSError: font = small = ImageFont.load_default()
for L in labels:
    im = Image.open(os.path.join(D, f"f_{L['frame']:04d}.png")).convert("RGBA")
    a = np.array(im)[..., 3]
    cut = cv2.GaussianBlur(cv2.dilate((a > 8).astype(np.uint8) * 255, KER), (0, 0), 0.8)  # anti-aliased contour edge
    ink = Image.new("RGBA", im.size, (16, 15, 13, 255)); ink.putalpha(Image.fromarray(cut))
    fill = Image.new("RGBA", im.size, (255, 255, 255, 255)); fill.putalpha(Image.fromarray(((a > 8) * 255).astype(np.uint8)))
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255)); bg.alpha_composite(ink); bg.alpha_composite(fill)  # white under see-through lenses
    bg.alpha_composite(im)
    d = ImageDraw.Draw(bg)
    name = L["eyes"].replace("_", " ") if L["eyes"] == L["mouth"] else f"{L['eyes'].replace('_', ' ')} eyes + {L['mouth'].replace('_', ' ')} mouth"
    d.text((48, im.height - 92), name, fill=(16, 15, 13), font=font)
    d.text((48, im.height - 44), f"eyes = {L['eyes']}   mouth = {L['mouth']}", fill=(120, 120, 120), font=small)
    bg.convert("RGB").save(os.path.join(comp, f"c_{L['frame']:04d}.png"))
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "24", "-i", os.path.join(comp, "c_%04d.png"),
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-movflags", "+faststart", OUT], check=True)
print("wrote", OUT, len(labels), "frames", round(len(labels) / 24, 1), "s")
