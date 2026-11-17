"""Render the feed posts (brand/remotion/src/posts) as stills and measure them.

For every post in POSTS: one PNG per key frame (the carousel = the moments its motion lands; the last key is the cover), a 3x3 grid
of the covers in feed order, and a check that the photos are NOT graded: the photo box in the cover is compared with the same cover
crop of the source file, per channel (a tint shows up as a channel shift; overlays such as rings and chips only add small noise).

usage (from the repo root):  python brand/scripts/posts_render.py  ->  brand/remotion/out/posts/, brand/posts/posts_check.json
"""
import json, subprocess, sys
from pathlib import Path
from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[2]
RM = ROOT / "brand" / "remotion"
OUT = RM / "out" / "posts"
W, H = 1080, 1350
UP = json.loads((RM / "src/posts/up.json").read_text())

# id, frames, keys, photo check: (source id, box x, y, w, h, fx, fy) -- same numbers as Posts.tsx
POSTS = [
    ("FillerScale", [36, 58, 95], ("07640", 0, 0, W, H, 0.5, 0.0)),
    ("LayerOrder", [48, 72, 95], None),
    ("CegFerulic", [50, 100, 119], ("00374", 0, 0, 500, H, 0.2, 0.5)),
    ("BccFacts", [46, 82, 119], None),
    ("QuotePodium", [44, 80, 109], ("08710", 560, 0, W - 560, H, 0.05, 0.5)),
    ("Reapply", [44, 80, 109], ("09677", 0, 0, W, H, 1.0, 0.5, 1.4, (0, 0, 520, H))),  # measured left of the glass card
    ("FifteenYears", [50, 82, 109], ("06354", 0, 0, W, 800, 0.5, 0.28)),
    ("EmsculptBars", [70, 92, 119], ("02204", 600, 0, W - 600, H, 0.75, 0.5)),
    ("Office", [40, 72, 95], ("09035", 0, 0, W, 820, 0.5, 0.5)),
]


def cover_crop(src, x, y, w, h, fx, fy, zoom=1.0):
    im = Image.open(src).convert("RGB")
    iw, ih = im.size
    s = max(w / iw, h / ih) * zoom
    dw, dh = iw * s, ih * s
    ox, oy = (w - dw) * fx, (h - dh) * fy
    return im.crop((round(-ox / s), round(-oy / s), round((-ox + w) / s), round((-oy + h) / s))).resize((w, h))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    report = {"posts": []}
    # one bundle for every still (scripts/posts_stills.mjs)
    jobs = json.dumps([[pid, keys] for pid, keys, _ in POSTS])
    subprocess.run(["node", "scripts/posts_stills.mjs", jobs], cwd=RM, check=True)
    for pid, keys, chk in POSTS:
        files = [f"{pid}_{i + 1}.png" if i < len(keys) - 1 else f"{pid}.png" for i in range(len(keys))]
        row = {"id": pid, "stills": files}
        if chk:
            sid, x, y, w, h, fx, fy, *rest = chk
            zoom = rest[0] if rest else 1.0
            mx, my, mw, mh = rest[1] if len(rest) > 1 else (x, y, w, h)  # the part of the photo no card covers
            src = RM / "public/posts/src" / f"{sid}{'_up' if sid in UP else ''}.jpg"
            ref = cover_crop(src, x, y, w, h, fx, fy, zoom).crop((mx - x, my - y, mx - x + mw, my - y + mh))
            got = Image.open(OUT / files[-1]).convert("RGB").crop((mx, my, mx + mw, my + mh))
            m_ref, m_got = ImageStat.Stat(ref).mean, ImageStat.Stat(got).mean
            d = [round(b - a, 2) for a, b in zip(m_ref, m_got)]
            # a grade/tint moves channels apart; overlays move them together. tint = spread of the per-channel shift
            row["photo"] = {"source": f"clinic-library row {int(sid)}", "mean_shift_rgb": d, "tint_spread": round(max(d) - min(d), 2),
                            "pass": max(d) - min(d) <= 3.0}
        report["posts"].append(row)
    # the grid, in feed order
    T = (360, 450)
    g = Image.new("RGB", (T[0] * 3 + 8, T[1] * 3 + 8), "white")
    for i, (pid, _, _) in enumerate(POSTS):
        g.paste(Image.open(OUT / f"{pid}.png").convert("RGB").resize(T), ((i % 3) * (T[0] + 4), (i // 3) * (T[1] + 4)))
    g.save(OUT / "_grid.jpg", quality=90)
    report["pass"] = all(r.get("photo", {}).get("pass", True) for r in report["posts"])
    report["stills"] = sum(len(r["stills"]) for r in report["posts"])
    (ROOT / "brand/posts").mkdir(exist_ok=True)
    (ROOT / "brand/posts/posts_check.json").write_text(json.dumps(report, indent=1))
    print(json.dumps({"pass": report["pass"], "stills": report["stills"], "tint": {r["id"]: r["photo"]["tint_spread"] for r in report["posts"] if "photo" in r}}))


if __name__ == "__main__":
    main()
