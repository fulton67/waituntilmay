"""strip.py OUT.jpg a.png b.png ... : side-by-side at equal height, label burned in."""
import sys, os
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
h = 800
ims = []
for f in files:
    i = Image.open(f).convert("RGB"); i = i.resize((int(i.width * h / i.height), h))
    ImageDraw.Draw(i).text((10, 10), os.path.basename(f), fill=(0, 0, 0)); ims.append(i)
s = Image.new("RGB", (sum(i.width for i in ims), h), "white"); x = 0
for i in ims: s.paste(i, (x, 0)); x += i.width
s.save(out, quality=88)
