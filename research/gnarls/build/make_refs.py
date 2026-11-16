"""Reference pack for the 3D build: the guide primary mark cropped to its figure bbox on white, the pose stickers flattened on white."""
import json, os, sys
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
c = json.load(open(os.path.join(R, "measure", "construction.json")))
x0, y0, x1, y1 = c["figure_px"]["bbox"]
pg = Image.open(os.path.join(R, "crops", "guide", "p-1.png")).convert("RGB")
pad = 80
from PIL import ImageDraw
W, H = pg.size
ImageDraw.Draw(pg).rectangle((int(W * 0.70), int(H * 0.53), W, int(H * 0.74)), fill=(255, 255, 255))
m = pg.crop((x0 - pad, y0 - pad, x1 + pad, y1 + pad))
m.thumbnail((1400, 1400)); m.save(os.path.join(R, "build", "refs", "primary_mark.png"))
D = os.path.join(R, "media", "drive", "Design Resources\u2420", "Transparent Gnarls", "ILLUSTRATED transparent Gnarls\u2420")
for f, n in [("NOBG-ActionPose1.png", "pose1_sparkle"), ("NOBG-ActionPose2.png", "pose2_flex"), ("ActionPose3.png", "pose3_cheer"),
             ("ActionPose4.png", "pose4_proud_front"), ("ActionPose7.png", "pose7_lounge")]:
    im = Image.open(os.path.join(D, f)).convert("RGBA")
    bb = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    im = im.crop(bb); bg = Image.new("RGBA", (im.width + 120, im.height + 120), (255, 255, 255, 255))
    bg.alpha_composite(im, (60, 60)); bg = bg.convert("RGB"); bg.thumbnail((1400, 1400))
    bg.save(os.path.join(R, "build", "refs", n + ".png"))
print(os.listdir(os.path.join(R, "build", "refs")))
