# Tag every comment/story with the tools it names, its context, and a claim excerpt; write data/hn.json.
import json, re, glob, sys, collections
sys.stdout.reconfigure(encoding="utf-8")
T = {
 "tokens": {
  "Style Dictionary": r"style[- ]?dictionary", "Tokens Studio / Figma Tokens": r"tokens? studio|figma tokens", "Theo (Salesforce)": r"\btheo\b",
  "Diez": r"\bdiez\b", "Specify": r"specifyapp|specify\.app|\bspecify\b(?= (design|token))", "Supernova": r"supernova\.io|supernova (design|for)",
  "Terrazzo / Cobalt UI": r"terrazzo|cobalt[- ]ui", "W3C DTCG token format": r"\bdtcg\b|w3c (design )?tokens?|design tokens? (community group|format|spec)",
  "Figma Variables": r"figma variables", "CSS custom properties": r"css (custom properties|variables)|custom properties", "Open Props": r"open[- ]props",
  "Tailwind theme/config": r"tailwind", "Panda CSS": r"panda ?css", "Vanilla Extract": r"vanilla[- ]extract",
  "Stitches": r"\bstitches\b", "Theme UI / styled-system": r"theme[- ]ui|styled[- ]system", "Sass variables": r"\bs[ac]ss\b",
  "Radix Colors": r"radix colou?rs", "Utopia (fluid type/space)": r"utopia\.fyi|\butopia\b", "Leonardo (Adobe color)": r"leonardocolor|adobe leonardo",
 },
 "components_docs": {
  "Storybook": r"storybook", "Ladle": r"\bladle\b", "Histoire": r"histoire", "Pattern Lab": r"pattern ?lab", "Fractal": r"\bfractal\b",
  "zeroheight": r"zeroheight", "Figma": r"\bfigma\b", "Penpot": r"penpot", "Sketch": r"\bsketch( app)?\b", "Framer": r"\bframer\b(?! motion)",
  "Chromatic": r"chromatic", "shadcn/ui": r"shadcn", "Radix UI": r"\bradix\b(?! colou?rs)", "React Aria": r"react[- ]aria", "Base UI": r"base[- ]ui",
  "Headless UI": r"headless[- ]?ui", "MUI / Material UI": r"\bmui\b|material[- ]ui", "Bootstrap": r"bootstrap",
 },
 "rendering": {
  "Satori": r"satori", "@vercel/og": r"vercel/og|vercel og|og-image\.vercel", "resvg": r"resvg", "Puppeteer": r"puppeteer",
  "Playwright": r"playwright", "Headless Chrome": r"headless (chrom|browser)", "wkhtmltoimage/pdf": r"wkhtmlto", "html2canvas": r"html2canvas",
  "dom-to-image / html-to-image": r"dom-to-image|html-to-image|modern-screenshot", "node-canvas / skia-canvas": r"node-canvas|skia[- ]canvas|napi-rs/canvas",
  "Sharp": r"\bsharp\b(?= ?\(|.{0,40}(resize|libvips|node|npm))", "ImageMagick": r"imagemagick", "Cloudinary": r"cloudinary", "imgix": r"imgix",
  "Bannerbear": r"bannerbear", "Placid": r"placid\.app|\bplacid\b(?= (app|api|for|to))", "Canva": r"\bcanva\b", "Figma API": r"figma (rest )?api|figma plugin",
  "Typst": r"\btypst\b", "Pillow / PIL": r"\bpillow\b", "SVG templating": r"svg templat|templated svg",
  "Skia / CanvasKit": r"canvaskit|\bskia\b", "Browserless": r"browserless", "Cloudflare Browser Rendering": r"cloudflare.{0,30}browser rendering",
 },
 "icons": {
  "Lucide": r"lucide", "Feather": r"feather ?icons|feathericons", "Heroicons": r"heroicons", "Phosphor": r"phosphor ?icons|phosphoricons|phosphor/(react|vue|core)|phosphor(?=.{0,40}(lucide|heroicons|icon))|(lucide|heroicons|icons), phosphor", "Iconify": r"iconify",
  "Material Symbols/Icons": r"material (symbols|icons|design icons)", "Font Awesome": r"font ?awesome", "Tabler Icons": r"tabler",
  "Bootstrap Icons": r"bootstrap icons", "Remix Icon": r"remix ?icon", "Ionicons": r"ionicons", "SVG sprites": r"svg sprite|sprite sheet|svg <use",
  "Icon fonts": r"icon ?fonts?", "Streamline": r"streamline ?(icons|hq)", "Noun Project": r"noun ?project", "unplugin-icons": r"unplugin-icons",
  "IcoMoon": r"icomoon", "Fluent UI icons": r"fluent (ui )?(system )?icons", "Octicons": r"octicons", "Iconic": r"\biconic\b",
 },
 "video_motion": {
  "Lottie": r"lottie(?! dexter)", "Bodymovin": r"bodymovin", "Rive": r"\brive\b", "Remotion": r"remotion", "Motion Canvas": r"motion[- ]canvas",
  "Revideo": r"revideo", "After Effects": r"after ?effects", "Premiere / MOGRT / Essential Graphics": r"premiere pro|adobe premiere|mogrt|essential graphics",
  "ExtendScript / AE scripting": r"extendscript|after effects script", "nexrender": r"nexrender", "Lottielab": r"lottielab", "dotLottie": r"dotlottie",
  "Cavalry": r"\bcavalry\b", "GSAP": r"\bgsap\b|greensock", "Framer Motion": r"framer motion|motion\.dev",
  "Theatre.js": r"theatre\.?js", "Manim": r"\bmanim\b", "HyperFrames": r"hyperframes", "DaVinci Resolve / Fusion": r"davinci",
 },
}
RX = {(c, t): re.compile(p, re.I) for c, d in T.items() for t, p in d.items()}
BRAND = re.compile(r"\bbrand|marketing|social (media|post|image|card)|instagram|tiktok|og[: -]?image|open ?graph|poster|print|video|campaign|\bads?\b|thumbnail|banner|slides?\b|lower third|title card|motion graphic|content team|agency|logo", re.I)
PRODUCT = re.compile(r"\bcomponents?\b|\bapp\b|button|form|react|vue|angular|accessib|a11y|dropdown|modal|frontend|front-end|product (team|ui)", re.I)
POS = re.compile(r"recommend|love|great|works (well|great)|we use|i use|we used|switched to|go-to|solid|excellent|best|happy with|favou?rite|nice", re.I)
NEG = re.compile(r"avoid|hate|pain|broken|terrible|abandon|regret|bloat|slow|nightmare|clunky|overkill|\brot|don't use|do not use|stopped using|worse|awful|buggy", re.I)
CHAT = re.compile(r"video chat|remote teams|native macOS app, not Electron|Remotion raises", re.I)
def sentences(t): return re.split(r"(?<=[.!?])\s+", t)
items = {}
def add(e, title, url, points, ncom, story_id):
    text = e.get("text") or ""
    blob = (title or "") + " " + text if e["kind"] == "story" else text
    tools = sorted({f"{c}:{t}" for (c, t), r in RX.items() if r.search(blob)})
    if CHAT.search(title or ""): tools = [x for x in tools if x != "video_motion:Remotion"]
    if not tools and e["kind"] == "comment": return
    hit = [s for s in sentences(text) if any(RX[tuple(x.split(":", 1))].search(s) for x in tools)]
    hs = " ".join(hit)
    b, p = bool(BRAND.search(blob)), bool(PRODUCT.search(blob))
    items[e["id"]] = {"id": e["id"], "kind": e["kind"], "story_id": story_id, "date": (e.get("created") or "")[:10], "title": title, "url": url,
        "hn": f"https://news.ycombinator.com/item?id={e['id']}", "points": points, "comments": ncom, "tools": tools,
        "claim_excerpt": hs[:400] if hit else text[:300],
        "sentiment": "neg" if hit and NEG.search(hs) else "pos" if hit and POS.search(hs) else "neutral",
        "context": "brand/marketing/content" if b and not p else "product UI" if p and not b else "both" if b and p else "unclear"}
read_comments = 0; threads = []
for f in glob.glob("raw/threads/*.json"):
    t = json.load(open(f, encoding="utf-8")); threads.append(t)
    add({"id": t["id"], "kind": "story", "text": t.get("text"), "created": t.get("created")}, t["title"], t.get("url"), t.get("points"), len(t["comments"]), t["id"])
    for c in t["comments"]:
        read_comments += 1
        add({**c, "kind": "comment"}, t["title"], t.get("url"), None, None, t["id"])
# search-hit comments outside the fetched threads (Algolia returns them with their story title)
hits = json.load(open("raw/ontopic.json", encoding="utf-8"))
extra = 0
for h in hits.values():
    if h["type"] == "comment" and h["id"] not in items:
        n0 = len(items)
        add({"id": h["id"], "kind": "comment", "text": h["text"], "created": h["created"]}, h.get("title"), h.get("url"), None, None, str(h.get("story_id")))
        extra += len(items) > n0
json.dump(sorted(items.values(), key=lambda x: x["date"]), open("data/hn.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
dates = sorted(x["date"] for x in items.values() if x["date"])
print("threads", len(threads), "thread comments", read_comments, "tagged items", len(items), "extra search comments tagged", extra, "range", dates[0], dates[-1])
cnt = collections.defaultdict(collections.Counter)
for x in items.values():
    for tl in x["tools"]:
        c, t = tl.split(":", 1); cnt[c][t] += 1
        cnt[c + "|brand"][t] += x["context"] in ("brand/marketing/content", "both")
        cnt[c + "|pos"][t] += x["sentiment"] == "pos"; cnt[c + "|neg"][t] += x["sentiment"] == "neg"
for c in T:
    print("\n##", c)
    for t, n in cnt[c].most_common(): print(f"{n:5} brand {cnt[c+'|brand'][t]:4} +{cnt[c+'|pos'][t]:3} -{cnt[c+'|neg'][t]:3}  {t}")
