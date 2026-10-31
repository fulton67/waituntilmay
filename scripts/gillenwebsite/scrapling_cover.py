# Last-resort cover lookup for covers.mjs, with Scrapling's stealth fetcher (github.com/D4Vinci/Scrapling).
#   python -I scripts/gillenwebsite/scrapling_cover.py "<artist>" "<release>"
# Tries Bandcamp's album search, then Apple Music's web search. Prints one JSON line:
# {"site", "url", "page", "how"} for a match on both artist and title, or {} when neither page has one.
import json
import re
import sys
import unicodedata
from urllib.parse import quote_plus

from scrapling.fetchers import StealthyFetcher


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


def artist_ok(want, got):
    g = norm(got)
    return any(a and (a in g or g in a) for a in (norm(x) for x in re.split(r",|&| and ", want)))


NOT_OFFICIAL = re.compile(r"cover|tribute|karaoke|instrumental|remix|lullaby|piano|re-?imagined", re.I)


def bandcamp(artist, release):
    page = f"https://bandcamp.com/search?q={quote_plus(artist + ' ' + release)}&item_type=a"
    p = StealthyFetcher.fetch(page, headless=True, network_idle=True)
    for li in p.css("li.searchresult"):
        title = (first(li, ".heading a") or first(li, ".heading")).text.strip()
        by = (first(li, ".subhead").text if first(li, ".subhead") else "").replace("by ", "").strip()
        img = first(li, ".art img")
        # Bandcamp takes uploads from anyone: only the artist's own page, never a cover version or tribute
        if img and same(release, title) and not NOT_OFFICIAL.search(title) and any(norm(a) == norm(by) for a in re.split(r",|&| and ", artist) + [artist]):
            # _0 is the original upload
            return {"site": "Bandcamp", "url": re.sub(r"_\d+\.jpg", "_0.jpg", img.attrib["src"]), "page": page, "how": f'"{title}" by {by}'}
    return None


def apple_music(artist, release):
    page = f"https://music.apple.com/us/search?term={quote_plus(artist + ' ' + release)}"
    p = StealthyFetcher.fetch(page, headless=True, network_idle=True)
    for a in p.css("a[href*='/album/']"):
        label = " ".join(a.get_all_text().split())
        src = first(a, "source[srcset]") or first(a, "img[src]")
        if not src or not same(release, label.split(" · ")[0]) or not artist_ok(artist, label):
            continue
        u = (src.attrib.get("srcset") or src.attrib.get("src")).split(" ")[0]
        return {"site": "Apple Music web", "url": re.sub(r"/\d+x\d+[a-z]*\.(webp|jpg|png)$", "/3000x3000bb.jpg", u), "page": page, "how": label[:120]}
    return None


artist, release = sys.argv[1], sys.argv[2]
hit = None
for find in (bandcamp, apple_music):
    try:
        hit = find(artist, release)
    except Exception as e:  # a page that will not load is a miss, not a stop
        print(f"{find.__name__}: {e}", file=sys.stderr)
    if hit:
        break
print(json.dumps(hit or {}))
