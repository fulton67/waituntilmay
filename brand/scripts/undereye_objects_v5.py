"""Under-eye reel v5: the REAL OBJECTS bank for the cannula-vs-needle beat (memory ostad-real-objects). Never AI-generated instruments.

Sources (brand/edits/undereye-filler/objects/BANK.md has the full record):
  needle  Wikimedia Commons "Beveled tip of a hypodermic needle 20090714 001.JPG", Politikaner, CC BY-SA 3.0 (a real photograph)
  cannula NO usable source: his own cannula exists only in his gloved hand inside procedure footage; the only licensed photos are an
          open-ended dental blunt tube (Politikaner, no rounded tip, no side port: the wrong instrument) and a watermarked liposuction set.
          -> SHOT_REQUESTS.md #16 + a clearly MARKED PLACEHOLDER of the same size (RealObject draws "PLACEHOLDER" over it).
Cut-out: rembg (birefnet-general, local ONNX, CPU); no image leaves this PC.
usage (brand venv): python -I brand/scripts/undereye_objects_v5.py
writes brand/remotion/public/objects/{needle.png, needle_tip.png, cannula.PLACEHOLDER.png, cannula_tip.PLACEHOLDER.png}
"""
import math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "brand/edits/undereye-filler/objects/src"
OUT = ROOT / "brand/remotion/public/objects"
OUT.mkdir(parents=True, exist_ok=True)
ASPECT = 5  # every object PNG in this pair is 5:1 (RealObject aspect)

# ---- the needle: the bevel tip at the left, the shaft running right; rotated level
im = Image.open(SRC / "commons_needle_bevel_Politikaner_20090714_001.jpg").convert("RGB")
TIP = (1709, 1358); END = (4272, 1679)
ang = math.degrees(math.atan2(END[1] - TIP[1], END[0] - TIP[0]))
rot = im.rotate(ang, resample=Image.BICUBIC, center=TIP, expand=False)
L = 2000; H = L // ASPECT
box = (TIP[0] - 60, TIP[1] - H // 2, TIP[0] - 60 + L, TIP[1] + H // 2)
crop = rot.crop(box)
sess = new_session("birefnet-general")
cut = remove(crop, session=sess)  # RGBA
a = np.array(cut)
# keep only the needle (the largest opaque body), feather 1 px
alpha = a[..., 3].astype(np.float32) / 255
alpha = np.where(alpha > 0.5, alpha, 0)
a[..., 3] = (np.array(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1))))
Image.fromarray(a).resize((1200, 240), Image.LANCZOS).save(OUT / "needle.png")
# the tip close-up: a square of the PHOTO (its own plain background, as a macro loupe)
t = rot.crop((TIP[0] - 150, TIP[1] - 300, TIP[0] + 450, TIP[1] + 300)).resize((600, 600), Image.LANCZOS)
t.save(OUT / "needle_tip.png")
print("needle angle", round(ang, 2), "crop", box)

# ---- the cannula: a MARKED placeholder of the same size (SHOT_REQUESTS #16)
def font(px):
    for f in ("C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/arial.ttf"):
        try:
            return ImageFont.truetype(f, px)
        except OSError:
            pass
    return ImageFont.load_default()

ph = Image.new("RGBA", (1200, 240), (0, 0, 0, 0))
d = ImageDraw.Draw(ph)
d.rounded_rectangle((40, 95, 1160, 145), radius=25, fill=(200, 200, 205, 235), outline=(150, 150, 158, 255), width=3)
d.text((600, 50), "CANNULA PHOTO REQUESTED · SHOT_REQUESTS #16", font=font(34), fill=(255, 255, 255, 255), anchor="mm", stroke_width=3, stroke_fill=(60, 60, 70, 255))
ph.save(OUT / "cannula.PLACEHOLDER.png")
tp = Image.new("RGB", (600, 600), (236, 233, 228))
d = ImageDraw.Draw(tp)
d.rounded_rectangle((-200, 250, 420, 350), radius=50, fill=(200, 200, 205), outline=(150, 150, 158), width=4)
d.text((300, 120), "PLACEHOLDER", font=font(48), fill=(220, 60, 60), anchor="mm")
d.text((300, 470), "tip + side port\nphoto requested", font=font(40), fill=(60, 60, 70), anchor="mm", align="center")
tp.save(OUT / "cannula_tip.PLACEHOLDER.png")
print("wrote", sorted(p.name for p in OUT.iterdir()))
