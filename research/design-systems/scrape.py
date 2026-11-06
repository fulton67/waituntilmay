# Pull HN stories + comments for design-system queries from the Algolia HN API.
import json, time, urllib.request, urllib.parse, sys, os
sys.stdout.reconfigure(encoding="utf-8")
SINCE = int(time.time()) - 730 * 86400  # last 24 months, for search_by_date
Q = sys.argv[1:] or [
 "design system","design tokens","style dictionary","tokens studio","storybook","penpot","figma tokens",
 "brand guidelines","open design system","Ask HN design system","Show HN design system","satori og image",
 "html to image","programmatic image generation brand","lower thirds template","mogrt","lottie","icon system",
 "tailwind preset tokens","w3c design tokens","radix ui","radix themes","primer design system","polaris design system",
 "carbon design system","atlassian design system",
]
def get(url):
    for i in range(4):
        try: return json.load(urllib.request.urlopen(url, timeout=40))
        except Exception: time.sleep(2 + 3 * i)
    return {}
os.makedirs("raw", exist_ok=True)
hits = json.load(open("raw/hits.json", encoding="utf-8")) if os.path.exists("raw/hits.json") else {}
for q in Q:
    for ep, extra in (("search", {}), ("search_by_date", {"numericFilters": f"created_at_i>{SINCE}"})):
        for tag in ("story", "comment"):
            for page in range(3):
                p = {"query": q, "tags": tag, "hitsPerPage": 200, "page": page, **extra}
                j = get(f"https://hn.algolia.com/api/v1/{ep}?" + urllib.parse.urlencode(p))
                for h in j.get("hits", []):
                    k = h["objectID"]
                    e = hits.setdefault(k, {"id": k, "type": tag, "queries": []})
                    if q not in e["queries"]: e["queries"].append(q)
                    e.update(created=h.get("created_at"), author=h.get("author"), points=h.get("points"),
                             num_comments=h.get("num_comments"), title=h.get("title") or h.get("story_title"),
                             url=h.get("url") or h.get("story_url"), story_id=h.get("story_id") or (int(k) if tag == "story" else None),
                             text=h.get("comment_text") or h.get("story_text") or "")
                if page + 1 >= j.get("nbPages", 0): break
                time.sleep(0.2)
    print(q, len(hits), flush=True)
json.dump(hits, open("raw/hits.json", "w", encoding="utf-8"))
