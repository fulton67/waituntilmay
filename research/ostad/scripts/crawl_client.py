"""Crawl drarielostad.com (WordPress) + drarielostadskincare.com (Shopify).

Idempotent: every fetched URL is cached under research/ostad/raw/site/.
Outputs:
  raw/site/html/<slug>.html     raw HTML
  raw/site/text/<slug>.txt      main-content text
  raw/site/pages.json           [{url, title, h1, nav, text_len, file}]
  raw/site/sitemap_urls.json    every URL from the sitemaps
  raw/site/nav.json             nav menu tree (label, url)
  raw/site/blog_posts.json      every blog post (title, date, url, categories)
  raw/site/products.json        Shopify products.json dump
  raw/site/socials.json         social links found
Run:  python research/ostad/scripts/crawl_client.py
"""
import hashlib
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse, urldefrag

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "raw" / "site"
HTML = OUT / "html"
TEXT = OUT / "text"
for d in (HTML, TEXT):
    d.mkdir(parents=True, exist_ok=True)

SITE = "https://drarielostad.com"
SHOP = "https://drarielostadskincare.com"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36")
S = requests.Session()
S.headers.update({"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})

SKIP_EXT = re.compile(r"\.(jpg|jpeg|png|gif|webp|svg|pdf|mp4|mov|zip|css|js|xml|ico)(\?|$)", re.I)


def slug(url):
    p = urlparse(url)
    s = (p.netloc + p.path).strip("/").replace("/", "__") or "root"
    if p.query:
        s += "__q" + hashlib.md5(p.query.encode()).hexdigest()[:8]
    return re.sub(r"[^A-Za-z0-9_.-]", "_", s)[:150]


def fetch(url, binary=False):
    f = HTML / (slug(url) + ".html")
    if f.exists() and f.stat().st_size > 0:
        return f.read_text(encoding="utf-8", errors="replace")
    for attempt in range(2):
        try:
            r = S.get(url, timeout=30)
            if r.status_code == 200:
                f.write_text(r.text, encoding="utf-8")
                time.sleep(0.4)
                return r.text
            print(f"  {r.status_code} {url}", file=sys.stderr)
            return None
        except requests.RequestException as e:
            print(f"  ERR {url}: {e}", file=sys.stderr)
            time.sleep(2)
    return None


def norm(url, base):
    u = urldefrag(urljoin(base, url))[0]
    p = urlparse(u)
    if p.netloc.replace("www.", "") != urlparse(SITE).netloc:
        return None
    if SKIP_EXT.search(p.path) or "/wp-" in p.path or "/feed" in p.path:
        return None
    # press / TV detail pages trip the site's WAF (403) after ~250 requests and carry
    # no extra data: outlet+date+title come from /about/in-the-media/, TV items from REST.
    if p.path.startswith(("/fresh-from-press/", "/seen-on-tv/")):
        return None
    path = p.path if p.path.endswith("/") else p.path + "/"
    return f"https://{urlparse(SITE).netloc}{path}"


def main_text(soup):
    for t in soup(["script", "style", "noscript", "svg", "iframe", "form"]):
        t.decompose()
    for sel in ["header", "footer", "nav", ".site-header", ".site-footer", "#header", "#footer"]:
        for t in soup.select(sel):
            t.decompose()
    main = soup.find("main") or soup.find("article") or soup.find(id="content") or soup.body or soup
    txt = main.get_text("\n", strip=True)
    return re.sub(r"\n{2,}", "\n", txt)


# ---------- sitemaps ----------
def sitemap_urls():
    urls, seen = [], set()
    queue = [f"{SITE}/sitemap_index.xml", f"{SITE}/wp-sitemap.xml", f"{SITE}/sitemap.xml"]
    while queue:
        sm = queue.pop(0)
        if sm in seen:
            continue
        seen.add(sm)
        f = HTML / (slug(sm) + ".xml")
        if f.exists():
            x = f.read_text(encoding="utf-8")
        else:
            try:
                r = S.get(sm, timeout=30)
            except requests.RequestException:
                continue
            if r.status_code != 200 or "<" not in r.text[:200]:
                continue
            x = r.text
            f.write_text(x, encoding="utf-8")
        locs = re.findall(r"<loc>\s*(.*?)\s*</loc>", x)
        if "<sitemapindex" in x:
            queue += [l for l in locs if l not in seen]
        else:
            for l in locs:
                urls.append({"url": l, "sitemap": sm})
    return urls


def main():
    sm = sitemap_urls()
    (OUT / "sitemap_urls.json").write_text(json.dumps(sm, indent=1), encoding="utf-8")
    print(f"sitemap urls: {len(sm)}")

    home = fetch(SITE + "/")
    soup = BeautifulSoup(home, "html.parser")

    # nav tree
    nav = []
    menus = soup.select("nav ul, ul.menu, ul[id*=menu]")
    seen_nav = set()
    for ul in menus:
        for a in ul.find_all("a", href=True):
            u = norm(a["href"], SITE)
            label = a.get_text(" ", strip=True)
            if u and (label, u) not in seen_nav:
                seen_nav.add((label, u))
                parents = [li.find("a").get_text(" ", strip=True) for li in a.find_parents("li")[1:] if li.find("a")]
                nav.append({"label": label, "url": u, "parents": parents[::-1]})
    (OUT / "nav.json").write_text(json.dumps(nav, indent=1), encoding="utf-8")
    print(f"nav links: {len(nav)}")

    # socials
    socials = {}
    for a in soup.find_all("a", href=True):
        h = a["href"]
        for k in ["instagram", "tiktok", "youtube", "facebook", "twitter", "x.com", "linkedin", "pinterest", "threads"]:
            if k in h.lower():
                socials.setdefault(k, set()).add(h)

    # crawl set: nav + sitemap (non-post pages) + BFS of on-domain links, depth-limited
    sm_pages = [norm(x["url"], SITE) for x in sm if "post-sitemap" not in x["sitemap"]
                and "posts-post" not in x["sitemap"]]
    sm_posts = [norm(x["url"], SITE) for x in sm if "post-sitemap" in x["sitemap"]
                or "posts-post" in x["sitemap"]]
    queue = [SITE + "/"] + [n["url"] for n in nav] + [u for u in sm_pages if u]
    seen, pages = set(), []
    MAX = 600
    while queue and len(seen) < MAX:
        u = queue.pop(0)
        if not u or u in seen:
            continue
        seen.add(u)
        html = fetch(u)
        if not html:
            continue
        s = BeautifulSoup(html, "html.parser")
        for a in s.find_all("a", href=True):
            h = a["href"]
            for k in ["instagram", "tiktok", "youtube", "facebook", "twitter", "x.com/", "linkedin", "pinterest", "threads"]:
                if k in h.lower():
                    socials.setdefault(k.strip("/"), set()).add(h)
            n = norm(h, u)
            # don't BFS into individual blog posts / tag / author archives; posts come from sitemap + blog list
            if n and n not in seen and not re.search(r"/(tag|author|category)/", n):
                if u == SITE + "/" or u in {x["url"] for x in nav} or "/page/" in n:
                    queue.append(n)
        title = s.title.get_text(strip=True) if s.title else ""
        h1 = s.find("h1").get_text(" ", strip=True) if s.find("h1") else ""
        meta = s.find("meta", attrs={"name": "description"})
        tf = TEXT / (slug(u) + ".txt")
        txt = main_text(s)
        tf.write_text(f"URL: {u}\nTITLE: {title}\nH1: {h1}\nMETA: {meta['content'] if meta and meta.get('content') else ''}\n\n{txt}", encoding="utf-8")
        pages.append({"url": u, "title": title, "h1": h1, "text_len": len(txt), "file": str(tf.relative_to(ROOT))})
    print(f"pages crawled: {len(pages)}")

    # blog posts via WP REST API (titles+dates+categories), fallback to sitemap
    posts = []
    page = 1
    while True:
        f = HTML / f"wp_api_posts_{page}.json"
        if f.exists():
            data = json.loads(f.read_text(encoding="utf-8"))
        else:
            r = S.get(f"{SITE}/wp-json/wp/v2/posts", params={"per_page": 100, "page": page,
                      "_fields": "id,date,link,title,categories,excerpt"}, timeout=30)
            if r.status_code != 200:
                break
            data = r.json()
            f.write_text(json.dumps(data), encoding="utf-8")
        if not data:
            break
        for p in data:
            posts.append({"title": BeautifulSoup(p["title"]["rendered"], "html.parser").get_text(),
                          "date": p["date"][:10], "url": p["link"], "categories": p.get("categories", []),
                          "excerpt": BeautifulSoup(p.get("excerpt", {}).get("rendered", ""), "html.parser").get_text(" ", strip=True)[:300]})
        if len(data) < 100:
            break
        page += 1
    cats = {}
    r = S.get(f"{SITE}/wp-json/wp/v2/categories", params={"per_page": 100}, timeout=30)
    if r.status_code == 200:
        cats = {c["id"]: c["name"] for c in r.json()}
    for p in posts:
        p["categories"] = [cats.get(c, c) for c in p["categories"]]
    # WP pages list too (catches pages not in nav)
    wp_pages = []
    page = 1
    while True:
        r = S.get(f"{SITE}/wp-json/wp/v2/pages", params={"per_page": 100, "page": page,
                  "_fields": "id,date,link,title,parent"}, timeout=30)
        if r.status_code != 200 or not r.json():
            break
        wp_pages += [{"title": BeautifulSoup(p["title"]["rendered"], "html.parser").get_text(),
                      "url": p["link"], "date": p["date"][:10], "parent": p["parent"]} for p in r.json()]
        if len(r.json()) < 100:
            break
        page += 1
    (OUT / "wp_pages.json").write_text(json.dumps(wp_pages, indent=1), encoding="utf-8")
    print(f"wp pages via API: {len(wp_pages)}")
    if not posts:
        posts = [{"title": "", "date": "", "url": u} for u in sm_posts if u]
    (OUT / "blog_posts.json").write_text(json.dumps(posts, indent=1), encoding="utf-8")
    print(f"blog posts: {len(posts)}")

    # shop
    prods = []
    pg = 1
    while True:
        f = HTML / f"shop_products_{pg}.json"
        if f.exists():
            data = json.loads(f.read_text(encoding="utf-8"))
        else:
            r = S.get(f"{SHOP}/products.json", params={"limit": 250, "page": pg}, timeout=30)
            if r.status_code != 200:
                print(f"shop products.json -> {r.status_code}")
                break
            data = r.json()
            f.write_text(json.dumps(data), encoding="utf-8")
        if not data.get("products"):
            break
        prods += data["products"]
        if len(data["products"]) < 250:
            break
        pg += 1
    (OUT / "products.json").write_text(json.dumps(prods, indent=1), encoding="utf-8")
    print(f"shop products: {len(prods)}")
    shop_home = fetch(SHOP + "/")
    if shop_home:
        s = BeautifulSoup(shop_home, "html.parser")
        (TEXT / "shop_home.txt").write_text(main_text(s), encoding="utf-8")
        for a in s.find_all("a", href=True):
            for k in ["instagram", "tiktok", "youtube", "facebook"]:
                if k in a["href"].lower():
                    socials.setdefault(k + "_shop", set()).add(a["href"])

    (OUT / "socials.json").write_text(json.dumps({k: sorted(v) for k, v in socials.items()}, indent=1), encoding="utf-8")
    (OUT / "pages.json").write_text(json.dumps(pages, indent=1), encoding="utf-8")

    extras()


def wp_api_all(rest_base, fields, cache_prefix):
    out, page = [], 1
    while True:
        f = HTML / f"{cache_prefix}_{page}.json"
        if f.exists():
            data = json.loads(f.read_text(encoding="utf-8"))
        else:
            r = S.get(f"{SITE}/wp-json/wp/v2/{rest_base}", params={"per_page": 100, "page": page,
                      "_fields": fields}, timeout=90)
            if r.status_code != 200:
                break
            data = r.json()
            f.write_text(json.dumps(data), encoding="utf-8")
        if not data:
            break
        out += data
        if len(data) < 100:
            break
        page += 1
    return out


def extras():
    import html as h
    # press list (outlet, date, title, external url) from the In the Media carousel
    s = BeautifulSoup(fetch(f"{SITE}/about/in-the-media/"), "html.parser")
    press, seen = [], set()
    for c in s.select(".fresh-from-press-content"):
        ds = c.select(".fresh-on-press-date")
        box = c.find_parent(class_="fresh-from-press-with-image")
        a = box.select_one(".fresh-from-press-button a") if box else None
        item = {"date": ds[0].get_text(strip=True) if ds else "",
                "outlet": ds[1].get_text(strip=True) if len(ds) > 1 else "",
                "title": c.find("h4").get_text(strip=True) if c.find("h4") else "",
                "url": a["href"] if a else ""}
        if item["outlet"] and item["title"] not in seen:
            seen.add(item["title"])
            press.append(item)
    (OUT / "press.json").write_text(json.dumps(press, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"press items: {len(press)}")
    # "As seen on TV" / Ostad TV items (custom post type)
    tv = wp_api_all("seenontv", "date,link,title,content", "wp_api_seenontv")
    tv = [{"date": t["date"][:10], "title": h.unescape(t["title"]["rendered"]), "url": t["link"],
           "youtube": re.findall(r"(?:youtube\.com/embed/|youtu\.be/)([\w-]{11})", t["content"]["rendered"])}
          for t in tv]
    (OUT / "seenontv.json").write_text(json.dumps(tv, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"seen-on-tv items: {len(tv)}")
    # full blog bodies, for gap analysis (does any post discuss service X?)
    posts = wp_api_all("posts", "date,link,title,content", "wp_api_posts_full")
    full = [{"date": p["date"][:10], "url": p["link"], "title": h.unescape(p["title"]["rendered"]),
             "text": re.sub(r"\s+", " ", h.unescape(re.sub(r"<[^>]+>", " ", p["content"]["rendered"])))}
            for p in posts]
    (OUT / "blog_full.json").write_text(json.dumps(full, ensure_ascii=False), encoding="utf-8")
    print(f"blog bodies: {len(full)}")


if __name__ == "__main__":
    main()
