"""Phase 2 + 3 scrape. Idempotent: every run is cached in raw/ by apify_run.run.

python scrape.py own|search|bench|ads|comments|all
"""
import sys, re
from concurrent.futures import ThreadPoolExecutor
from apify_run import run, spent

TT, IG, IGH, YT = ("clockworks/tiktok-scraper", "apify/instagram-scraper",
                   "apify/instagram-hashtag-scraper", "streamers/youtube-scraper")
TT_OFF = {"shouldDownloadSubtitles": True, "shouldDownloadCovers": False, "shouldDownloadVideos": False,
          "shouldDownloadSlideshowImages": False, "shouldDownloadAvatars": False, "shouldDownloadMusicCovers": False}

QUERIES = [
    # educational / derm-creator
    "dermatologist", "dermatologist reacts", "derm explains", "skincare dermatologist", "retinol dermatologist",
    "sunscreen myth", "tretinoin", "skin barrier", "dermatologist skincare routine", "drugstore vs medical grade skincare",
    # injectables + devices
    "botox", "baby botox", "filler before after", "filler migration", "sculptra", "skinvive", "morpheus8", "fraxel",
    "co2 laser", "emface", "thread lift", "exosomes skin", "prp face", "laser tattoo removal",
    # practice
    "med spa", "nyc dermatologist", "cosmetic dermatologist", "dermatology office", "day in the life dermatologist",
    "patient reaction",
    # skin cancer / medical
    "mohs surgery", "skin cancer check", "mole removal", "melanoma signs", "acne scars treatment", "melasma treatment",
    "rosacea",
    # trend
    "peptides skin", "glp1 face", "ozempic face", "glass skin", "skin cycling", "pdrn", "salmon sperm facial",
    "buccal fat", "prejuvenation",
    # skin of color
    "dermatologist skin of color", "hyperpigmentation dark skin", "laser dark skin",
]
HASHTAGS = ["dermatologist", "dermatologistreacts", "skincaredermatologist", "retinol", "tretinoin", "skinbarrier",
            "sunscreen", "botox", "babybotox", "fillers", "sculptra", "skinvive", "morpheus8", "fraxel", "co2laser",
            "emface", "threadlift", "exosomes", "prpfacial", "lasertattooremoval", "medspa", "nycdermatologist",
            "cosmeticdermatologist", "mohssurgery", "skincancer", "moleremoval", "melanoma", "acnescars", "melasma",
            "rosacea", "peptides", "ozempicface", "glassskin", "skincycling", "pdrn", "salmonspermfacial", "buccalfat",
            "prejuvenation", "skinofcolor", "hyperpigmentation"]
YT_QUERIES = QUERIES[:]  # every query; 4 shorts + 1 long each

slug = lambda s: re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
chunks = lambda xs, n: [xs[i:i + n] for i in range(0, len(xs), n)]


def own():
    jobs = [
        ("own__ig__drarielostad", IG, {"directUrls": ["https://www.instagram.com/drarielostad/"], "resultsType": "posts",
                                      "resultsLimit": 150}, 150),
        ("own__yt__channel", YT, {"startUrls": [{"url": "https://www.youtube.com/channel/UCZ-fo4c1If0luEAaHG6r4Ig"}],
                                  "maxResults": 60, "maxResultsShorts": 60, "maxResultStreams": 0}, 120),
        ("own__tiktok__profile", TT, {"profiles": ["drarielostad", "arielostadmd", "drostad"], "resultsPerPage": 30,
                                      "profileScrapeSections": ["videos"], **TT_OFF}, 30),
        ("own__tiktok__search", TT, {"searchQueries": ["ariel ostad", "dr ariel ostad"], "resultsPerPage": 10,
                                     "searchSection": "", **TT_OFF}, 20),
    ]
    return jobs


def search():
    jobs = []
    for i, qs in enumerate(chunks(QUERIES, 10)):
        jobs.append((f"tiktok__search-{i}-{slug(qs[0])}", TT, {"searchQueries": qs, "resultsPerPage": 9, **TT_OFF},
                     9 * len(qs)))
    for i, hs in enumerate(chunks(HASHTAGS, 10)):
        jobs.append((f"instagram__hashtags-{i}-{hs[0]}", IGH, {"hashtags": hs, "resultsLimit": 6, "resultsType": "reels"},
                     6 * len(hs)))
    for i, qs in enumerate(chunks(YT_QUERIES, 10)):
        jobs.append((f"youtube__search-{i}-{slug(qs[0])}", YT, {"searchQueries": qs, "maxResults": 1,
                                                                 "maxResultsShorts": 4, "maxResultStreams": 0},
                     5 * len(qs)))
    return jobs


BENCH_TT = [  # confirmed in search results: dermdoctor, shereeneidriss, dr.mamina, dermangelo, drabby6, aamnaadel, dermdocmalik (NYC)
    "dermdoctor", "shereeneidriss", "dr.mamina", "dermangelo", "drabby6", "aamnaadel",
    # spec names, handles unconfirmed until the run returns them
    "drdrayzday", "tonyyounmd", "drwhitneybowe", "samellismd", "skinbydrazi", "dermdocmalik"]


def bench(handles=None):
    hs = handles or BENCH_TT
    return [(f"bench__tiktok__{i}", TT, {"profiles": c, "resultsPerPage": 15, "profileScrapeSections": ["videos"], **TT_OFF},
             15 * len(c)) for i, c in enumerate(chunks(hs, 6))]


def ads():
    terms = ["dermatologist", "botox", "med spa", "morpheus8", "skin cancer"]
    url = ("https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q={}"
           "&search_type=keyword_unordered&media_type=all")
    return [(f"ads__meta__{slug(t)}", "curious_coder/facebook-ads-library-scraper",
             {"urls": [{"url": url.format(t.replace(' ', '%20'))}], "count": 20, "scrapeAdDetails": False}, 20)
            for t in terms]


def comments():
    """Reddit stand-in: comments under 30 high-comment niche TikToks, spread across topics (one per query max)."""
    import json, pathlib
    vids = json.loads((pathlib.Path(__file__).resolve().parents[1] / "data/videos.json").read_text(encoding="utf-8"))
    pick, seen_q = [], set()
    for v in sorted([v for v in vids if v["platform"] == "tiktok" and v["source"] != "own" and v["comments"] >= 40],
                    key=lambda v: -v["comments"]):
        q = (v["query_or_hashtag"] or "").split(",")[0]
        if q in seen_q:
            continue
        seen_q.add(q)
        pick.append(v["url"])
        if len(pick) == 30:
            break
    return [("questions__tiktok-comments", "clockworks/tiktok-comments-scraper",
             {"postURLs": pick, "commentsPerPost": 20, "maxRepliesPerComment": 0}, 20 * len(pick))]


def go(job):
    key, actor, inp, n = job
    try:
        items = run(key, actor, inp, est_items=n)
        return key, len(items)
    except Exception as e:  # ladder step 1: retry once
        try:
            items = run(key, actor, inp, est_items=n, force=True)
            return key, len(items)
        except Exception as e2:
            return key, f"ERR {e2}"[:300]


def main(what):
    jobs = {"own": own, "search": search, "bench": bench, "ads": ads, "comments": comments}
    todo = []
    for w in (["own", "search", "bench", "ads"] if what == "all" else [what]):
        todo += jobs[w]()
    with ThreadPoolExecutor(3) as ex:
        for key, n in ex.map(go, todo):
            print(key, n, flush=True)
    print("spent", spent())


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "all")
