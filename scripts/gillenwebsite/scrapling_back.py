# Last-resort back-cover lookup for backs.mjs, with Scrapling (github.com/D4Vinci/Scrapling), plain HTTP fetcher.
#   python -I scripts/gillenwebsite/scrapling_back.py "<artist>" "<release>"
# Finds the release on Bandcamp's album search (the artist's own page only), opens the album page and looks for
# an image there other than the album art itself: a back cover or tracklist side posted in the album's about text.
# Prints one JSON line: {"url", "page"} when there is one, otherwise {"why"}.
import json
import re
import sys
import unicodedata
from urllib.parse import quote_plus

from scrapling.fetchers import Fetcher


def first(el, sel):
    found = el.css(sel)
    return found[0] if len(found) else None


def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower().replace("&", " and ")
    s = re.sub(r"\s+(ft|feat)\.?\s.*$", "", s)
    s = re.sub(r"\s*[(\[].*?[)\]]", "", s)
    return re.sub(r"[^a-z0-9]+", " ", re.sub(r"\bthe\b", " ", s)).strip()


def same(want, got):
    w, g = norm(want), norm(got)
    return bool(w) and (w == g or g.startswith(w + " "))


artist, release = sys.argv[1], sys.argv[2]
search = f"https://bandcamp.com/search?q={quote_plus(artist + ' ' + release)}&item_type=a"
try:
    p = Fetcher.get(search, timeout=30)
    album = None
    for li in p.css("li.searchresult"):
        h = first(li, ".heading a")
        by = (first(li, ".subhead").text if first(li, ".subhead") else "").replace("by ", "").strip()
        if h and same(release, h.text.strip()) and any(norm(a) == norm(by) for a in re.split(r",|&| and ", artist) + [artist]):
            album = h.attrib["href"].split("?")[0]
            break
    if not album:
        print(json.dumps({"why": "not on Bandcamp"}))
        sys.exit(0)
    a = Fetcher.get(album, timeout=30)
    art = first(a, "#tralbumArt img")
    art_id = re.search(r"/a(\d+)_", art.attrib.get("src", "")).group(1) if art is not None and re.search(r"/a(\d+)_", art.attrib.get("src", "")) else None
    others = [im.attrib.get("src", "") for im in a.css(".tralbumData img, #tralbum-about img")]
    others = [u for u in others if u and (not art_id or art_id not in u)]
    if others:
        print(json.dumps({"url": re.sub(r"_\d+\.jpg", "_0.jpg", others[0]), "page": album}))
    else:
        print(json.dumps({"why": "album page has only the front"}))
except Exception as e:  # a page that will not load is a miss, not a stop
    print(json.dumps({"why": f"fetch failed: {str(e)[:60]}"}))
