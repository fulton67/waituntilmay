"""
Join site/videos.json (yt-dlp enumeration) with reference/artist-map.json
(human-authored artist + title per video) and emit the /sie grid markup.

Tile label is "artist — title", lowercase, body size. The YouTube channel
handle is NEVER rendered — it is only the enumeration key.

A video present in videos.json but absent from artist-map.json is still
rendered, using channelDefaults[handle] for the artist and the cleaned
upload title, and is reported in the Action summary so a human can name it.

    python scripts/build_video_grid.py
"""

import sys
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import html
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))

VIDEOS = os.path.join(ROOT, "site", "videos.json")
ARTISTS = os.path.join(ROOT, "reference", "artist-map.json")
OUT_HTML = os.path.join(ROOT, "site", "build", "sie-grid.html")

TRAILING = re.compile(r"\s*\((?:official\s+)?(?:music\s+)?video\)\s*$", re.I)


def clean_title(raw, artist, channel=None):
    t = TRAILING.sub("", raw or "").strip()
    # Strip a leading "<name> -" prefix for either the mapped artist OR the channel
    # handle: an upload titled "ibeenhip - onestopshop" on a channel mapped to
    # "tazparis" would otherwise keep the handle and read "tazparis — ibeenhip - ...".
    for name in [n for n in (artist, channel) if n]:
        lead = re.compile(r"^\s*" + re.escape(name) + r"\s*[-–—:]\s*", re.I)
        t = lead.sub("", t)
    return re.sub(r"\s+", " ", t).strip().lower()


def main():
    vids = json.load(open(VIDEOS, encoding="utf-8"))
    amap = json.load(open(ARTISTS, encoding="utf-8"))
    mapped = amap["videos"]
    defaults = amap["channelDefaults"]

    rows, unmapped = [], []
    for v in vids["videos"]:
        vid = v["id"]
        if vid in mapped:
            artist = mapped[vid]["artist"]
            title = mapped[vid]["title"]
        else:
            artist = defaults.get(v["channel"], v["channel"])
            title = clean_title(v["title"], artist, v["channel"])
            unmapped.append((vid, v["channel"], artist, title, v["title"]))
        rows.append({"id": vid, "artist": artist.lower(), "title": title.lower(),
                     "dur": v.get("duration")})

    tiles = []
    for r in rows:
        label = f"{r['artist']} — {r['title']}"
        tiles.append(
            f'      <a class="vid" data-yt="{r["id"]}"\n'
            f'         href="https://www.youtube.com/watch?v={r["id"]}"\n'
            f'         target="_blank" rel="noopener" aria-label="{html.escape(label, quote=True)}">\n'
            f'        <span class="vid-thumb">'
            f'<img src="https://i.ytimg.com/vi/{r["id"]}/hqdefault.jpg" alt="" loading="lazy"'
            f' width="480" height="360"></span>\n'
            f'        <span class="vid-label">{html.escape(label)}</span>\n'
            f'      </a>'
        )

    # channel links, above the wall. The artist name is shown, never the handle.
    order, seen_ch = [], set()
    for v in vids["videos"]:
        if v["channel"] not in seen_ch:
            seen_ch.add(v["channel"])
            order.append(v["channel"])
    links = [
        f'      <a href="https://www.youtube.com/@{ch}" target="_blank" rel="noopener">'
        f'{html.escape(defaults.get(ch, ch).lower())} (youtube)</a>'
        for ch in order
    ]
    links.append('      <a href="#home">the cd, $80 (shop)</a>')

    frag = (
        '    <nav class="sentences" aria-label="channels">\n'
        + "\n".join(links)
        + '\n    </nav>\n\n'
        + '    <div class="vids" id="vids">\n' + "\n".join(tiles) + "\n    </div>\n"
    )
    os.makedirs(os.path.dirname(OUT_HTML), exist_ok=True)
    with open(OUT_HTML, "w", encoding="utf-8") as fh:
        fh.write(frag)

    # ---- Action summary ----
    print(f"tiles           {len(rows)}")
    print(f"mapped          {len(rows) - len(unmapped)}")
    print(f"unmapped        {len(unmapped)}")
    print(f"wrote           {os.path.relpath(OUT_HTML, ROOT)}  ({len(frag):,} B)")
    print()
    print(f"{'id':<12} {'label'}")
    for r in rows:
        print(f"{r['id']:<12} {r['artist']} — {r['title']}")
    if unmapped:
        print()
        print("!! UNMAPPED NEW UPLOADS — artist taken from channelDefaults, title auto-cleaned.")
        print("!! Add these to reference/artist-map.json to control the label:")
        for vid, ch, artist, title, raw in unmapped:
            print(f"   {vid:<12} @{ch:<16} -> {artist} — {title}    (raw: {raw!r})")
    return 1 if unmapped else 0


if __name__ == "__main__":
    raise SystemExit(main())
