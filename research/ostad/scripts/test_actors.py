import json, sys
from concurrent.futures import ThreadPoolExecutor
from apify_run import run
ads_url = "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=botox&search_type=keyword_unordered&media_type=all"
tests = {
 "test__tiktok": ("clockworks/tiktok-scraper", {"searchQueries": ["morpheus8"], "resultsPerPage": 5, "shouldDownloadSubtitles": True, "shouldDownloadCovers": False, "shouldDownloadVideos": False}),
 "test__ig_hashtag": ("apify/instagram-hashtag-scraper", {"hashtags": ["morpheus8"], "resultsLimit": 5, "resultsType": "reels"}),
 "test__ig_profile": ("apify/instagram-scraper", {"directUrls": ["https://www.instagram.com/drarielostad/"], "resultsType": "posts", "resultsLimit": 5}),
 "test__yt": ("streamers/youtube-scraper", {"searchQueries": ["morpheus8"], "maxResults": 2, "maxResultsShorts": 3, "maxResultStreams": 0}),
 "test__reddit": ("trudax/reddit-scraper-lite", {"searches": ["morpheus8"], "maxItems": 5, "maxPostCount": 5, "maxComments": 0, "skipComments": True, "searchPosts": True, "searchComments": False, "searchCommunities": False, "searchUsers": False}),
 "test__ads": ("curious_coder/facebook-ads-library-scraper", {"urls": [{"url": ads_url}], "count": 5}),
}
def go(kv):
    k,(a,i)=kv
    try: return k, run(k,a,i,est_items=5)
    except Exception as e: return k, f"ERR {e}"
with ThreadPoolExecutor(6) as ex:
    for k,items in ex.map(go, tests.items()):
        if isinstance(items,str): print(k, items[:500]); continue
        print("==",k,len(items))
        if items: print("  keys:", sorted(items[0].keys())[:80])
