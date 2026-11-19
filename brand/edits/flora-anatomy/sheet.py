import sys
from PIL import Image
out, h, cols, *fs = sys.argv[1:]; h=int(h); cols=int(cols)
ims=[Image.open(f).convert("RGB") for f in fs]
ims=[i.resize((int(i.width*h/i.height),h)) for i in ims]
rows=[ims[k:k+cols] for k in range(0,len(ims),cols)]
W=max(sum(i.width for i in r)+8*len(r) for r in rows)
S=Image.new("RGB",(W,len(rows)*(h+8)),(60,60,60))
for ri,r in enumerate(rows):
    x=0
    for i in r: S.paste(i,(x,ri*(h+8))); x+=i.width+8
S.save(out,quality=88)
