"""
Refresh site/videos.json from the five sie member channels, keylessly.

Run hourly by .github/workflows/feed.yml. Writes only when the video set or any
title actually changed, so the Action's commit step is a no-op on a quiet hour.

    python scripts/refresh_feed.py
"""

import sys
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import datetime
import json
import os
import subprocess
import urllib.request

HANDLES = ["hunnakay", "kllhhr", "comeheadtapme19", "suckrballll", "ibeenhip"]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "site", "videos.json")
POSTERS = os.path.join(ROOT, "site", "assets", "yt")
YTDLP = os.environ.get("YTDLP", "yt-dlp")


def enumerate_channel(handle):
    p = subprocess.run(
        [YTDLP, "--flat-playlist", "--dump-single-json", "--no-warnings",
         f"https://www.youtube.com/@{handle}/videos"],
        capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=300)
    if p.returncode != 0:
        print(f"!! @{handle} rc={p.returncode} {p.stderr[:200]}")
        return None, []
    d = json.loads(p.stdout)
    return d.get("channel_id"), (d.get("entries") or [])


def main():
    channels, videos, seen = {}, [], set()
    failed = []
    for h in HANDLES:
        cid, entries = enumerate_channel(h)
        if cid is None:
            failed.append(h)
            continue
        channels[h] = cid
        for e in entries:
            vid = e.get("id")
            if not vid or vid in seen:
                continue
            seen.add(vid)
            videos.append({
                "id": vid,
                "title": (e.get("title") or "").strip(),
                "channel": h,
                "channelId": cid,
                "duration": e.get("duration"),
                "views": e.get("view_count"),
                "thumb": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
            })
        print(f"  @{h:<16} {len(entries):>3} uploads")

    # A channel that fails to enumerate must not silently delete its videos.
    if failed:
        print(f"!! {len(failed)} channel(s) failed: {failed}")
        if os.path.exists(OUT):
            prev = json.load(open(OUT, encoding="utf-8"))
            kept = [v for v in prev.get("videos", []) if v["channel"] in failed]
            for v in kept:
                if v["id"] not in seen:
                    seen.add(v["id"])
                    videos.append(v)
            channels.update({k: v for k, v in (prev.get("channels") or {}).items()
                             if k in failed})
            print(f"   carried {len(kept)} video(s) forward from the previous file")
        if len(failed) == len(HANDLES):
            print("all channels failed — leaving videos.json untouched")
            return 1

    # posters, so the grid does not depend on i.ytimg at render time
    os.makedirs(POSTERS, exist_ok=True)
    fetched = 0
    for v in videos:
        dest = os.path.join(POSTERS, v["id"] + ".jpg")
        if os.path.exists(dest):
            continue
        try:
            urllib.request.urlretrieve(v["thumb"], dest)
            fetched += 1
        except Exception as exc:
            print(f"   poster {v['id']} failed: {exc!r}"[:120])

    new = {"generated": datetime.datetime.now(datetime.timezone.utc)
                        .isoformat().replace("+00:00", "Z"),
           "source": "yt-dlp --flat-playlist (no API key)",
           "channels": channels, "count": len(videos), "videos": videos}

    # compare on content, not on the timestamp, or every run looks like a change
    def shape(d):
        return [(v["id"], v["title"], v["channel"]) for v in d.get("videos", [])]

    old = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}
    if shape(old) == shape(new) and fetched == 0:
        print(f"no change ({len(videos)} videos) — not rewriting")
        return 0

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(new, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    print(f"wrote {len(videos)} videos, {fetched} new poster(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
