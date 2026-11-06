import json, re, html, sys
sys.stdout.reconfigure(encoding="utf-8")
hits = json.load(open("raw/hits.json", encoding="utf-8"))
TOPIC = re.compile(r"design[- ]system|design[- ]tokens?|style[- ]dictionary|tokens? studio|storybook|penpot|figma (variables|tokens|api|plugin)|brand (guidelines?|book|identity|kit|system)|style[- ]?guide|pattern library|component librar|satori|og[: -]image|open ?graph image|social (card|image)s?|html[- ]to[- ](image|png)|puppeteer|playwright screenshot|bannerbear|placid|lower[- ]thirds?|mogrt|essential graphics|lottie|\brive\b|remotion|icon (system|set|font|librar)|lucide|heroicons|phosphor|iconify|material symbols|svg sprite|open props|shadcn|radix|primer|polaris|carbon design|atlassian design|uswds|gov\.uk design|material design|fluent (ui|design)|spectrum|base web|zeroheight|supernova|tailwind (config|preset|theme)|css (custom properties|variables)|theming|\btheo\b|diez|w3c|dtcg|after effects|motion graphics|canva", re.I)
def clean(t): return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", t or ""))).strip()
keep = {}
for k, h in hits.items():
    blob = (h.get("title") or "") + " " + clean(h.get("text"))
    if TOPIC.search(blob if h["type"] == "comment" else (h.get("title") or "") + " " + clean(h.get("text"))):
        h["text"] = clean(h.get("text")); keep[k] = h
stories = [h for h in keep.values() if h["type"] == "story" and ((h.get("points") or 0) >= 20 or (h.get("num_comments") or 0) >= 10)]
# a story qualifies for a full-thread read only if its TITLE is on topic
TITLE = re.compile(TOPIC.pattern.replace("|canva", "|\bcanva\b"), re.I)
stories = [s for s in stories if TITLE.search(s.get("title") or "")]
print(len(hits), "hits;", len(keep), "on topic;", sum(h["type"]=="comment" for h in keep.values()), "comments;", len(stories), "stories to read")
json.dump(keep, open("raw/ontopic.json", "w", encoding="utf-8"))
json.dump(sorted(stories, key=lambda s: -(s.get("points") or 0)), open("raw/stories_to_read.json", "w", encoding="utf-8"))
for s in sorted(stories, key=lambda s: -(s.get("points") or 0))[:400]:
    print(s.get("points"), s.get("num_comments"), s["id"], (s.get("created") or "")[:10], (s.get("title") or "")[:90])
