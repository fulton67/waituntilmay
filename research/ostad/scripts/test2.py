from concurrent.futures import ThreadPoolExecutor
from apify_run import run
tests={
"test__tiktok":("clockworks/tiktok-scraper",{"searchQueries":["morpheus8"],"resultsPerPage":5,"shouldDownloadSubtitles":True,"shouldDownloadCovers":False,"shouldDownloadVideos":False},5),
"test__reddit2":("trudax/reddit-scraper-lite",{"startUrls":[{"url":"https://www.reddit.com/r/Botox/search/?q=first%20time&restrict_sr=1&sort=top&t=year"}],"skipComments":True,"skipCommunity":True,"skipUserPosts":True,"maxItems":5,"maxPostCount":5,"maxComments":0,"searchCommunities":False},5),
}
def go(kv):
    k,(a,i,n)=kv
    try: return k,run(k,a,i,est_items=n)
    except Exception as e: return k,f"ERR {e}"
with ThreadPoolExecutor(2) as ex:
    for k,items in ex.map(go,tests.items()):
        if isinstance(items,str): print(k,items[:400]);continue
        print("==",k,len(items))
        for it in items[:5]:
            if k.endswith('tiktok'): print(sorted(it.keys())); print(it.get('playCount'),it.get('diggCount'),it.get('collectCount'),it.get('videoMeta',{}).keys() if it.get('videoMeta') else None, (it.get('authorMeta') or {}).get('fans'), it.get('subtitleLinks') or it.get('videoMeta',{}).get('subtitleLinks')); break
            else: print(it.get('dataType'),it.get('title'),it.get('upVotes'),it.get('numberOfComments'),it.get('communityName'))
