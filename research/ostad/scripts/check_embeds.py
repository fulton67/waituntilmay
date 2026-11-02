"""Which videos can be played inside the dashboard. Writes data/embeds.json {id: {emb, status, check}}.
A video gets an embed URL only if its platform's check returns 200; otherwise the panel links out.
  youtube   oEmbed  https://www.youtube.com/oembed?url=...        -> player https://www.youtube.com/embed/{id}
  tiktok    oEmbed  https://www.tiktok.com/oembed?url=...         -> player https://www.tiktok.com/player/v1/{id}
  instagram GET     https://www.instagram.com/p/{shortcode}/embed/ (is the player itself)
Re-run safe: rows already checked 200 are kept.
"""
import json, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import quote

import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "embeds.json"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36"}


def check(v):
    vid, p, url = v["id"], v["platform"], v["url"]
    raw = vid.split("_", 1)[1]
    try:
        if p == "youtube":
            chk = f"https://www.youtube.com/oembed?format=json&url={quote(url, safe='')}"
            emb = f"https://www.youtube.com/embed/{raw}"
        elif p == "tiktok":
            chk = f"https://www.tiktok.com/oembed?url={quote(url, safe='')}"
            emb = f"https://www.tiktok.com/player/v1/{raw}?music_info=0&description=0"
        else:
            chk = emb = f"https://www.instagram.com/p/{raw}/embed/"
        r = requests.get(chk, headers=UA, timeout=20)
        return vid, dict(emb=emb if r.status_code == 200 else None, status=r.status_code, check=chk)
    except requests.RequestException as e:
        return vid, dict(emb=None, status=type(e).__name__, check=None)


def main():
    vids = json.loads((ROOT / "data" / "videos.json").read_text(encoding="utf-8"))
    old = json.loads(OUT.read_text()) if OUT.exists() else {}
    todo = [v for v in vids if old.get(v["id"], {}).get("status") != 200]
    with ThreadPoolExecutor(6) as ex:
        for vid, r in ex.map(check, todo):
            old[vid] = r
    OUT.write_text(json.dumps(old, indent=0))
    from collections import Counter
    c = Counter((v["platform"], old[v["id"]]["status"]) for v in vids)
    print(json.dumps({f"{a}/{b}": n for (a, b), n in sorted(c.items(), key=str)}, indent=1))


if __name__ == "__main__":
    main()
