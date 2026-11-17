"""Lay the action reel frames (blender/actions.py) on white and encode an MP4.
python -I actions_video.py FRAMEDIR OUT.mp4
The renders are transparent with the floor's contact shadow in the alpha; composited on white the shadow stays. A
small caption names the current action."""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

D, OUT = sys.argv[1], sys.argv[2]
meta = json.load(open(os.path.join(D, "labels.json")))
comp = os.path.join(D, "comp"); os.makedirs(comp, exist_ok=True)
try: font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 34)
except OSError: font = ImageFont.load_default()
for L in meta["labels"]:
    im = Image.open(os.path.join(D, f"f_{L['frame']:04d}.png")).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    ImageDraw.Draw(bg).text((44, im.height - 76), L["action"], fill=(150, 150, 150), font=font)
    bg.convert("RGB").save(os.path.join(comp, f"c_{L['frame']:04d}.png"))
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "24", "-i", os.path.join(comp, "c_%04d.png"),
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-movflags", "+faststart", OUT], check=True)
print("wrote", OUT, len(meta["labels"]), "frames", round(len(meta["labels"]) / 24, 1), "s")
