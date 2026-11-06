"""BUILDER Phase E: 12 demo posts from Dr. Ostad's 12 most recent captions with usable text (existing/posts.json, newest first;
captions under 120 characters or mostly prescribing boilerplate are skipped).
Each goes through brand/post.py in Auto mode, so the demo exercises exactly what the builder and the CLI ship. Rules (DECISIONS 51):
  size     cycles 4x5, 1x1, 9x16 (4 of each)
  template Auto's first candidate, unless that template already appears twice; then the first candidate used fewer than
           twice. caption-card counts too. This keeps at least 6 templates without hand-picking.
  photo    the post's own picture when OCR finds < 5% text on it (colour/treatment.json); otherwise the kit pool
-> demo/NN_template_size.png (+ -NN pages), demo/demo.json, demo/wall.png. brand-venv python -I."""
import json, pathlib, sys, tempfile
B = pathlib.Path(__file__).resolve().parents[1]; sys.path.insert(0, str(B)); sys.stdout.reconfigure(encoding="utf-8")
import post
from PIL import Image, ImageDraw, ImageFont
D = B / "demo"; D.mkdir(exist_ok=True)
for f in D.glob("*.png"): f.unlink()
posts = sorted(json.load(open(B / "existing" / "posts.json", encoding="utf-8")), key=lambda p: p["timestamp"], reverse=True)
tr = {r["image"]: r for r in json.load(open(B / "colour" / "treatment.json", encoding="utf-8"))["per_image"] if r["source"] == "instagram"}
pick = [p for p in posts if len(p.get("caption") or "") >= 120 and "prescribing information" not in (p["caption"] or "").lower()][:12]
SIZES = ["4x5", "1x1", "9x16"]; used = {}; rows = []
tmp = pathlib.Path(tempfile.mkdtemp())
for i, p in enumerate(pick):
    size = SIZES[i % 3]; cf = tmp / f"{p['shortCode']}.txt"; cf.write_text(p["caption"], encoding="utf-8")
    own = B / "existing" / "thumbs" / f"{p['shortCode']}.jpg"; t = tr.get(p["shortCode"], {})
    if (B / "kit" / "templates" / "photos" / f"{p['shortCode']}.jpg").exists(): own = B / "kit" / "templates" / "photos" / f"{p['shortCode']}.jpg"  # caption band cropped
    use_own = own.exists() and t.get("text_area_pct", 100) < 5
    # dry-run Auto (seed 0) through the bridge to read the candidates, then pick by the rule above
    probe = post.main(["--caption-file", str(cf), "--size", size, "--out", str(tmp / "probe"), "--name", "p"] + (["--image", str(own)] if use_own else []))
    cand = probe["candidates"]; choice = next((c for c in cand if used.get(c, 0) < 2), cand[0])
    name = f"{i + 1:02d}_{choice}_{size}"
    rec = post.main(["--caption-file", str(cf), "--size", size, "--template", choice, "--seed", str(i), "--out", str(D), "--name", name] + (["--image", str(own)] if use_own else []))
    used[choice] = used.get(choice, 0) + 1
    rows.append({"n": i + 1, "shortCode": p["shortCode"], "date": p["timestamp"][:10], "caption_start": p["caption"][:90], "size": size, "template": choice,
                 "auto_candidates": cand, "photo": f"own ({t.get('text_area_pct')}% text)" if use_own else "kit pool", "files": [str(pathlib.Path(f).relative_to(B)) for f in rec["files"]],
                 "pages": rec["pages"], "fonts": rec["fonts"], "warnings": rec["warnings"], "errors": rec["errors"], "accent": rec["accent"]})
summary = {"posts": len(rows), "templates": sorted(used), "template_count": len(used), "sizes": {s: sum(r["size"] == s for r in rows) for s in SIZES},
           "adobe_fonts": sum(r["fonts"] == "adobe" for r in rows), "pages": sum(r["pages"] for r in rows), "warnings": sum(len(r["warnings"]) for r in rows), "errors": sum(len(r["errors"]) for r in rows)}
json.dump({"method": __doc__.strip(), "summary": summary, "posts": rows}, open(D / "demo.json", "w", encoding="utf-8"), indent=1)
# wall: first page of each, same height, 4 per row
H = 520; GAP = 24; thumbs = []
for r in rows:
    im = Image.open(B / r["files"][0]).convert("RGB"); im = im.resize((round(im.width * H / im.height), H), Image.LANCZOS); thumbs.append((r, im))
try: F = ImageFont.truetype("arial.ttf", 18)
except OSError: F = ImageFont.load_default()
rowsw = [thumbs[k:k + 4] for k in range(0, len(thumbs), 4)]; W = max(sum(t.width for _, t in rw) + GAP * (len(rw) + 1) for rw in rowsw)
wall = Image.new("RGB", (W, len(rowsw) * (H + 60) + GAP), "#e6e2df"); d = ImageDraw.Draw(wall); y = GAP
for rw in rowsw:
    x = GAP
    for r, t in rw:
        wall.paste(t, (x, y)); d.text((x, y + H + 8), f"{r['n']:02d} {r['template']} {r['size']}" + (f" ({r['pages']}p)" if r["pages"] > 1 else ""), font=F, fill="#211b15"); x += t.width + GAP
    y += H + 60
wall.save(D / "wall.png")
print(json.dumps(summary, indent=1))
