"""Type-system specimen with the free fallback files (fonts/files/) -> fig/type_specimen.png (1080x1350, the post canvas).
The Adobe faces (Neue Haas Grotesk, Freight, IBM Plex Mono) are not distributable, so the plate uses the fallbacks."""
import pathlib
from PIL import Image, ImageDraw, ImageFont

B = pathlib.Path(__file__).resolve().parents[1]
F = B / "fonts" / "files"
NAVY, IVORY, SAND = "#152235", "#f5f2eb", "#d6c3a0"

def font(name, size, wght=None, opsz=None):
    f = ImageFont.truetype(str(F / name), size)
    if wght is not None:
        axes = {a["name"] if isinstance(a["name"], str) else a["name"].decode(): a for a in f.get_variation_axes()}
        vals = []
        for k, a in axes.items():
            v = {"Weight": wght, "Optical size": opsz or a["default"]}.get(k, a["default"])
            vals.append(max(a["minimum"], min(a["maximum"], v)))
        f.set_variation_by_axes(vals)
    return f

def tracked(d, xy, text, f, fill, track):  # letter-spacing in em
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + track * f.size

im = Image.new("RGB", (1080, 1350), IVORY)
d = ImageDraw.Draw(im)
G, GI, N, NI, M = "InterTight[wght].ttf", "InterTight-Italic[wght].ttf", "Newsreader[opsz,wght].ttf", "Newsreader-Italic[opsz,wght].ttf", "IBMPlexMono-Regular.ttf"
tracked(d, (72, 64), "OSTAD / TYPE SYSTEM / 01", font(M, 18), NAVY, 0.1)
tracked(d, (60, 70), "Os", font(G, 420, 250), "#e4ddcf", -0.04)  # oversized broken letterform, cut by the frame
d.text((72, 300), "Natural is", font=font(N, 104, 300, 72), fill=NAVY)
d.text((72, 410), "a technique.", font=font(NI, 104, 300, 72), fill=NAVY)
tracked(d, (72, 560), "DISPLAY SERIF  FreightBig Pro Light / Newsreader 300 opsz 72  104/1.0", font(M, 15), NAVY, 0.02)
d.line([(72, 600), (1008, 600)], fill=NAVY, width=1)
d.text((72, 630), "Under-eye hollows, treated", font=font(G, 56, 500), fill=NAVY)
d.text((72, 694), "without surgery.", font=font(G, 56, 500), fill=NAVY)
tracked(d, (72, 770), "GROTESK HEADLINE  Neue Haas Grotesk Display 65 / Inter Tight 500  56/1.05  -1%", font(M, 15), NAVY, 0.02)
body = ["Filler placed deep, on the bone, lifts the hollow", "instead of filling the skin. Two visits, two weeks", "apart. Most patients go back to work the same day."]
for i, l in enumerate(body):
    d.text((72, 820 + i * 42), l, font=font(N, 31, 400, 14), fill=NAVY)
tracked(d, (72, 960), "TEXT SERIF  FreightText Pro Book / Newsreader 400 opsz 14  31/1.35", font(M, 15), NAVY, 0.02)
d.rectangle([72, 1010, 1008, 1150], fill=NAVY)
tracked(d, (100, 1036), "TEAR TROUGH  //  HA FILLER  //  0.5 ML / SIDE", font(M, 22), IVORY, 0.06)
tracked(d, (100, 1080), "RESULT  2 WK   DOWNTIME  0-2 D   LASTS  12-18 MO", font(M, 22), SAND, 0.06)
tracked(d, (72, 1170), "MONO DATA  IBM Plex Mono Regular  22/1.3  +6%", font(M, 15), NAVY, 0.02)
tracked(d, (72, 1260), "ARIEL OSTAD MD", font(G, 24, 600), NAVY, 0.12)
tracked(d, (790, 1264), "@drarielostad", font(M, 20), NAVY, 0.02)
(B / "fig").mkdir(exist_ok=True)
im.save(B / "fig" / "type_specimen.png")
print("ok")
