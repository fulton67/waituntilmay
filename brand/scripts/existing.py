"""@drarielostad's last 60 posts (existing/posts.json, Apify) -> thumbnails, grid sheets, palette (k-means k=6 over the grid),
top posts by engagement. Writes existing/thumbs/, existing/sheet_*.jpg, existing/measure.json, fig/existing_palette.png."""
import json, pathlib, urllib.request
import numpy as np
from PIL import Image, ImageDraw

B = pathlib.Path(__file__).resolve().parents[1]
E = B / "existing"
(E / "thumbs").mkdir(parents=True, exist_ok=True)
(B / "fig").mkdir(exist_ok=True)
P = json.load(open(E / "posts.json", encoding="utf-8"))
P.sort(key=lambda p: p.get("timestamp") or "", reverse=True)

ok = []
for p in P:
    f = E / "thumbs" / f"{p['shortCode']}.jpg"
    if not f.exists():
        try:
            req = urllib.request.Request(p["displayUrl"], headers={"User-Agent": "Mozilla/5.0"})
            f.write_bytes(urllib.request.urlopen(req, timeout=30).read())
        except Exception as e:  # expired CDN link etc.
            print("thumb fail", p["shortCode"], e)
            continue
    ok.append((p, f))

# sheets: 15 per sheet with engagement under each
T, C = 300, 5
for s in range(0, len(ok), 15):
    ch = ok[s:s + 15]
    S = Image.new("RGB", (T * C, (T + 30) * ((len(ch) + C - 1) // C)), "white")
    d = ImageDraw.Draw(S)
    for i, (p, f) in enumerate(ch):
        im = Image.open(f).convert("RGB")
        im.thumbnail((T - 6, T - 6))
        x, y = (i % C) * T, (i // C) * (T + 30)
        S.paste(im, (x + (T - im.width) // 2, y + (T - im.height) // 2))
        d.text((x + 4, y + T + 2), f"{p['shortCode']} {p['type'][:5]} {p.get('timestamp', '')[:10]}", fill="black")
        d.text((x + 4, y + T + 14), f"likes {p.get('likesCount')} cm {p.get('commentsCount')} views {p.get('videoViewCount') or '-'}", fill="black")
    S.save(E / f"sheet_{s // 15 + 1}.jpg", quality=85)

# palette: k-means k=6 over every pixel of the grid (thumbs downsampled to 64 px)
px = np.concatenate([np.asarray(Image.open(f).convert("RGB").resize((64, 64))).reshape(-1, 3) for _, f in ok]).astype(np.float32)
rng = np.random.default_rng(0)
cent = px[rng.choice(len(px), 6, replace=False)]
for _ in range(30):
    lab = ((px[:, None, :] - cent[None]) ** 2).sum(-1).argmin(1)
    cent = np.array([px[lab == k].mean(0) if (lab == k).any() else cent[k] for k in range(6)])
share = np.bincount(lab, minlength=6) / len(lab)
order = np.argsort(-share)
pal = [{"hex": "#%02x%02x%02x" % tuple(int(v) for v in cent[k]), "share": round(float(share[k]), 3)} for k in order]
PL = Image.new("RGB", (900, 220), "white")
d = ImageDraw.Draw(PL)
x = 0
for c in pal:
    w = max(40, int(900 * c["share"]))
    d.rectangle([x, 0, x + w, 170], fill=c["hex"])
    d.text((x + 4, 178), f"{c['hex']} {c['share'] * 100:.0f}%", fill="black")
    x += w
d.text((4, 200), "@drarielostad, last 60 posts: k-means k=6 over every grid pixel", fill="black")
PL.save(B / "fig" / "existing_palette.png")

def eng(p):
    return (p.get("likesCount") or 0) + 3 * (p.get("commentsCount") or 0)
top = sorted(P, key=eng, reverse=True)[:5]
types = {}
for p in P:
    types[p["type"]] = types.get(p["type"], 0) + 1
json.dump({"n": len(P), "thumbs": len(ok), "from": P[-1].get("timestamp"), "to": P[0].get("timestamp"), "types": types, "palette": pal,
           "top": [{"shortCode": p["shortCode"], "url": p["url"], "type": p["type"], "likes": p.get("likesCount"), "comments": p.get("commentsCount"),
                    "views": p.get("videoViewCount"), "caption": (p.get("caption") or "")[:300]} for p in top],
           "median_likes": float(np.median([p.get("likesCount") or 0 for p in P]))},
          open(E / "measure.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(len(ok), "thumbs", types, pal)
