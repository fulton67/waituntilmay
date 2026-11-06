# Fetch full comment trees for the stories to read.
import json, re, sys, os, html, time, urllib.request, concurrent.futures as cf
sys.stdout.reconfigure(encoding="utf-8")
NOISE = re.compile(r"system design|spectrum developer|spectrum designer|storybooks?\b(?! [0-9])(?!.*(component|ui|react|front))|goodnight moon|lottie dexter|video chat|remote teams|Remotion raises|Material Files|home automation|Twitter Brand Guidelines", re.I)
EXTRA = [x.split()[2] for x in """593 116 7343956|575 60 46665411|182 99 24991908|177 138 42445834|65 14 21566635|63 18 48395648|40 5 40855962|38 10 33155829|34 8 24335060|25 4 35709648|23 2 27030537|22 16 4869881|18 7 20058891|17 4 41615563|16 8 17462159|15 12 42097886|13 15 21696173|12 4 25504704|9 6 20685519|9 1 48468095|8 4 46732672|5 3 41785777|4 3 44289669|4 8 34367139|4 8 26805181|3 10 49399851|3 4 41336093|2 6 34184175|2 3 24198215|11 0 29984077|8 0 42604616|7 0 39133031|7 0 34889057|5 0 49347951|6 1 26190362|9 0 26067498|6 0 47984509""".split("|")]
stories = json.load(open("raw/stories_to_read.json", encoding="utf-8"))
ids = [s["id"] for s in stories if not NOISE.search(s.get("title") or "")]
ids += [i for i in EXTRA if i not in ids]
def clean(t): return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", t or ""))).strip()
def flat(n, depth, out, sid):
    for c in n.get("children", []):
        if c.get("text"):
            out.append({"id": str(c["id"]), "story_id": sid, "parent_id": str(c.get("parent_id")), "depth": depth, "author": c.get("author"), "created": c.get("created_at"), "text": clean(c["text"])})
        flat(c, depth + 1, out, sid)
def get(i):
    p = f"raw/threads/{i}.json"
    if os.path.exists(p): return i, json.load(open(p, encoding="utf-8"))
    for k in range(4):
        try:
            j = json.load(urllib.request.urlopen(f"https://hn.algolia.com/api/v1/items/{i}", timeout=60)); break
        except Exception: time.sleep(3 + 4 * k)
    else: return i, None
    out = []; flat(j, 0, out, str(i))
    t = {"id": str(i), "title": j.get("title"), "url": j.get("url"), "points": j.get("points"), "created": j.get("created_at"), "author": j.get("author"), "text": clean(j.get("text")), "comments": out}
    json.dump(t, open(p, "w", encoding="utf-8")); return i, t
os.makedirs("raw/threads", exist_ok=True)
n = c = 0
with cf.ThreadPoolExecutor(6) as ex:
    for i, t in ex.map(get, ids):
        if t: n += 1; c += len(t["comments"])
        else: print("FAIL", i)
print(len(ids), "ids;", n, "threads;", c, "comments")
