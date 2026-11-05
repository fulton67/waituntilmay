"""FIX Phase 1: pull the whole dr-ostad channel from the Are.na API (public since 2026-11-05) -> board/blocks_api.json,
board/img/ (missing originals only), board/media/ (yt-dlp for Media blocks), board/connected.md.
Uses ARENA_ACCESS_TOKEN from .env as a bearer header if present (never printed). Descriptive UA: are.na 403s browser-like UAs."""
import json, os, pathlib, re, shutil, subprocess, sys, time, urllib.request, urllib.error

B = pathlib.Path(__file__).resolve().parents[1]
ROOT = B.parent
UA = "OstadBrandKit/1.0 (+https://waituntilmay.com)"
TOKEN = None
for f in (ROOT / ".env", ROOT / ".env.local"):
    if f.exists():
        for line in f.read_text(encoding="utf-8", errors="ignore").splitlines():
            if line.startswith("ARENA_ACCESS_TOKEN=") and line.split("=", 1)[1].strip():
                TOKEN = line.split("=", 1)[1].strip().strip('"')

def get(url, raw=False):
    h = {"User-Agent": UA}
    if TOKEN and "api.are.na" in url:
        h["Authorization"] = f"Bearer {TOKEN}"
    for attempt in range(12):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=60).read()
            time.sleep(1.0)
            return r if raw else json.loads(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 502, 503):
                wait = int(e.headers.get("Retry-After") or 10 * (attempt + 1)) + 1
                print(f"  {e.code}, waiting {wait}s", flush=True)
                time.sleep(wait); continue
            raise
    raise RuntimeError("gave up " + url)

ch = get("https://api.are.na/v2/channels/dr-ostad")
length = ch["length"]
contents, page = [], 1
while True:
    p = get(f"https://api.are.na/v2/channels/dr-ostad/contents?per=100&page={page}")
    items = p.get("contents", [])
    if not items:
        break
    contents += items; page += 1
print("channel length", length, "pulled", len(contents), "token", bool(TOKEN))

IMG = B / "board" / "img"; MED = B / "board" / "media"
IMG.mkdir(parents=True, exist_ok=True); MED.mkdir(exist_ok=True)
ytdlp = shutil.which("yt-dlp")
rows, conn = [], {}
for c in contents:
    bid = c["id"]
    img = (c.get("image") or {}).get("original", {}).get("url")
    file = None
    have = list(IMG.glob(f"{bid}_*")) + list(IMG.glob(f"{bid}.*"))
    if have:
        file = f"img/{have[0].name}"
    elif img:
        ext = re.sub(r"[^a-z0-9]", "", pathlib.Path(img.split("?")[0]).suffix.lower()) or "jpg"
        dst = IMG / f"{bid}.{ext}"
        dst.write_bytes(get(img, raw=True)); file = f"img/{dst.name}"
    src = (c.get("source") or {}).get("url")
    media = None
    if c.get("class") == "Media" and src and ytdlp:
        out = MED / f"{bid}.%(ext)s"
        r = subprocess.run([ytdlp, "-q", "--no-playlist", "-f", "mp4/best", "-o", str(out), src], capture_output=True, text=True, timeout=600)
        got = list(MED.glob(f"{bid}.*"))
        media = f"media/{got[0].name}" if got else f"yt-dlp failed: {r.stderr.strip()[:200]}"
    chans = []
    try:
        for x in get(f"https://api.are.na/v2/blocks/{bid}/channels?per=100").get("channels", []):
            if x.get("slug") != "dr-ostad":
                chans.append({"title": x.get("title"), "slug": x.get("slug"), "user": (x.get("user") or {}).get("slug"),
                              "url": f"https://www.are.na/{(x.get('user') or {}).get('slug')}/{x.get('slug')}", "length": x.get("length")})
                conn.setdefault(chans[-1]["url"], {**chans[-1], "via": []})["via"].append(bid)
    except Exception as e:
        chans = [{"error": str(e)[:120]}]
    rows.append({"id": bid, "class": c.get("class"), "title": c.get("title"), "description": c.get("description"),
                 "content": (c.get("content") or "")[:2000] or None, "source": src, "image_original": img, "file": file,
                 "embed": (c.get("embed") or {}).get("html"), "media": media, "connected_at": c.get("connected_at"),
                 "position": c.get("position"), "connected_channels": chans})
json.dump({"channel_length": length, "pulled": len(rows), "blocks": rows}, open(B / "board" / "blocks_api.json", "w", encoding="utf-8"),
          indent=1, ensure_ascii=False)
L = ["# Connected channels", "", f"Channels that also hold a block from `dr-ostad` ({len(conn)} channels; pulled {time.strftime('%Y-%m-%d')}).", "",
     "| Channel | Owner | Blocks | Shares these dr-ostad blocks |", "|---|---|---|---|"]
for u, x in sorted(conn.items(), key=lambda t: -len(t[1]["via"])):
    L.append(f"| [{x['title']}]({u}) | {x['user']} | {x['length']} | {', '.join(str(v) for v in x['via'])} |")
(B / "board" / "connected.md").write_text("\n".join(L) + "\n", encoding="utf-8")
from collections import Counter
print(Counter(r["class"] for r in rows), "connected channels", len(conn), "yt-dlp", bool(ytdlp))
for r in rows:
    if r["class"] != "Image":
        print(r["id"], r["class"], r["title"], r["source"], r["media"])
