"""FIX Phase 2: k-means (k=6) per image for the 60 Instagram thumbnails and every board image, aggregated per source
(favourite board images x2). -> colour/existing.json, colour/board.json, colour/CONTRAST.md, colour/strips.png.
A measurement only; the palette decision is Phase 4. Run with ~/tools/brand-venv/Scripts/python -I."""
import json, pathlib, colorsys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageSequence
from sklearn.cluster import KMeans

B = pathlib.Path(__file__).resolve().parents[1]
O = B / "colour"; O.mkdir(exist_ok=True)
FAV = {7529470, 14664481, 41911984, 2145281}
MONO = ImageFont.truetype(str(B / "fonts" / "files" / "IBMPlexMono-Regular.ttf"), 14)
MONO_S = ImageFont.truetype(str(B / "fonts" / "files" / "IBMPlexMono-Regular.ttf"), 11)

def px(path):
    im = Image.open(path)
    if getattr(im, "is_animated", False):
        im = next(ImageSequence.Iterator(im))
    im = im.convert("RGB"); im.thumbnail((160, 160))
    return np.asarray(im).reshape(-1, 3).astype(np.float32)
hx = lambda c: "#%02x%02x%02x" % tuple(int(round(float(v))) for v in c)
def lum(c):
    c = np.array(c, float) / 255; c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return float(0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2])
def ratio(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True); return (la + 0.05) / (lb + 0.05)
def role(c):
    h, l, s = colorsys.rgb_to_hls(*(np.array(c, float) / 255)); h *= 360
    if l < 0.13: return "black / deep shadow"
    if l > 0.9 and s < 0.35: return "white / paper"
    if s < 0.15: return "light neutral" if l > 0.6 else "grey" if l > 0.3 else "dark neutral"
    if 200 <= h <= 240 and l < 0.35: return "navy"
    if 10 <= h <= 45 and s > 0.2: return "skin / warm" if l < 0.75 else "sand / cream"
    if 70 <= h <= 170: return "green / sage"
    if 170 < h < 260: return "blue"
    if h < 10 or h > 330: return "red / pink"
    return "other"

def measure(items):  # items: (id, path, weight)
    per, agg = [], []
    for iid, path, w in items:
        p = px(path)
        km = KMeans(6, n_init=4, random_state=0).fit(p)
        sh = np.bincount(km.labels_, minlength=6) / len(p)
        cs = sorted(zip(km.cluster_centers_, sh), key=lambda t: -t[1])
        per.append({"id": iid, "weight": w, "colours": [{"hex": hx(c), "share": round(float(s), 3)} for c, s in cs]})
        agg += [(c, s * w) for c, s in cs]
    C = np.array([c for c, _ in agg]); W = np.array([s for _, s in agg])
    km = KMeans(12, n_init=8, random_state=0).fit(C, sample_weight=W)
    t = np.bincount(km.labels_, weights=W, minlength=12); t /= t.sum()
    out = [{"hex": hx(c), "share": round(float(s), 3), "role_guess": role(c)} for c, s in sorted(zip(km.cluster_centers_, t), key=lambda x: -x[1])]
    return out, per

ig = [(f.stem, f, 1) for f in sorted((B / "existing" / "thumbs").glob("*.jpg"))]
api = json.load(open(B / "board" / "blocks_api.json", encoding="utf-8"))["blocks"]
bd = [(b["id"], B / "board" / b["file"], 2 if b["id"] in FAV else 1) for b in api if b.get("file")]
ex_agg, ex_per = measure(ig)
bd_agg, bd_per = measure(bd)
json.dump({"source": "60 Instagram thumbnails, @drarielostad", "k": 6, "images": len(ig), "aggregate": ex_agg, "per_image": ex_per},
          open(O / "existing.json", "w", encoding="utf-8"), indent=1)
json.dump({"source": "dr-ostad Are.na board, favourites x2", "k": 6, "images": len(bd), "aggregate": bd_agg, "per_image": bd_per},
          open(O / "board.json", "w", encoding="utf-8"), indent=1)

# contrast of every measured colour against the two grounds each source actually uses most (lightest and darkest aggregate)
L = ["# Contrast, measured colours", "", "WCAG 2.x ratio. AA body ≥ 4.5, AA large (≥ 24 px, or 18.66 px bold) ≥ 3.0. At post size (1080 px wide, viewed at about 390 px) a 30 px line on the canvas is about 11 px on screen, so body copy on posts needs 4.5.", ""]
for name, agg in (("Instagram", ex_agg), ("Board", bd_agg)):
    rgb = lambda h: [int(h[i:i + 2], 16) for i in (1, 3, 5)]
    light = max(agg, key=lambda c: lum(rgb(c["hex"]))); dark = min(agg, key=lambda c: lum(rgb(c["hex"])))
    L += [f"## {name}", "", f"| Colour | Share | Role guess | on {light['hex']} (lightest) | on {dark['hex']} (darkest) |", "|---|---|---|---|---|"]
    for c in agg:
        a, b = ratio(rgb(c["hex"]), rgb(light["hex"])), ratio(rgb(c["hex"]), rgb(dark["hex"]))
        tag = lambda r: f"{r:.2f} {'AA' if r >= 4.5 else 'AA-large' if r >= 3 else '—'}"
        L.append(f"| `{c['hex']}` | {c['share']*100:.1f}% | {c['role_guess']} | {tag(a)} | {tag(b)} |")
    L.append("")
(O / "CONTRAST.md").write_text("\n".join(L), encoding="utf-8")

im = Image.new("RGB", (1600, 560), "#ffffff"); d = ImageDraw.Draw(im)
for row, (name, agg, n) in enumerate((("INSTAGRAM @drarielostad", ex_agg, len(ig)), ("ARE.NA dr-ostad (favourites x2)", bd_agg, len(bd)))):
    y = 30 + row * 270
    d.text((40, y), f"{name}  //  k=6 per image, {n} images, re-clustered to 12", font=MONO, fill="#111111")
    x = 40
    for c in agg:
        w = max(52, int(1520 * c["share"]))
        d.rectangle([x, y + 28, x + w - 3, y + 178], fill=c["hex"])
        d.text((x, y + 184), c["hex"], font=MONO_S, fill="#111111"); d.text((x, y + 198), f"{c['share']*100:.1f}%", font=MONO_S, fill="#111111")
        x += w
im.save(O / "strips.png")
for n, a in (("IG", ex_agg), ("BOARD", bd_agg)):
    print(n, [(c["hex"], c["share"], c["role_guess"]) for c in a])
