from apify_run import run
it=run("test__reddit4","trudax/reddit-scraper-lite",{"searches":["first time"],"searchCommunityName":"Botox","searchPosts":True,"searchComments":False,"searchCommunities":False,"searchUsers":False,"skipComments":True,"skipCommunity":True,"sort":"top","time":"all","maxItems":5,"maxPostCount":5,"maxComments":0,"proxy":{"useApifyProxy":True}},est_items=5)
for x in it: print(x.get('dataType'),x.get('upVotes'),x.get('numberOfComments'),x.get('communityName'),(x.get('title') or '')[:70])
