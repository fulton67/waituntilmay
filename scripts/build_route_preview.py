"""Write site/build/route-preview/, a servable two-route copy of the site.

site/index.html ships both pages in one document and hash-routes them, because
that is the only way to open the whole site from a file. Webflow serves them as
two real routes, / and /videos, and the paste bundle rewrites the hashes to
match. Nothing locally exercised those real routes, so "clicking the pill
navigates to /videos" could only ever be asserted against the hash build.

This writes the same two-page split onto the local filesystem, pointing at the
local css/js, so the click test runs against the shape that actually ships:

    python scripts/build_route_preview.py
    python -m http.server 8799 --directory site/build/route-preview

It is generated from site/index.html on every run, so it cannot drift.
"""

import sys
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
SRC = os.path.join(ROOT, "site", "index.html")
OUT = os.path.join(ROOT, "site", "build", "route-preview")

ROUTES = {"#home": "/", "#sie": "/videos"}


def main():
    html = open(SRC, encoding="utf-8").read()

    mains = {m.group(1): m.group(2) for m in
             re.finditer(r'<main\s+id="([^"]+)"[^>]*>(.*?)</main>', html, re.S)}
    for key in ("home", "sie"):
        if key not in mains:
            print("no <main id=%r> in site/index.html" % key)
            return 1

    blob = re.search(r'<script type="application/json" id="videos-data">(.*?)</script>',
                     html, re.S).group(1)
    css = re.findall(r'<link rel="stylesheet" href="(css/[^"]+)"', html)
    js = re.search(r'<script src="(js/sie\.v\d+\.js)"></script>', html).group(1)
    case = re.search(r'<script type="module" src="(js/case\.v\d+\.js)"></script>', html).group(1)

    def fix(frag, route):
        """the paste bundle's rewrite, left on local paths"""
        frag = re.sub(r'href=(["\'])(#[\w-]*)\1',
                      lambda m: 'href=%s%s%s' % (m.group(1),
                                                 ROUTES.get(m.group(2), m.group(2)),
                                                 m.group(1)),
                      frag)
        frag = re.sub(r'(src|href)=(["\'])assets/', r'\1=\2/assets/', frag)
        return ('<main class="page" data-route="%s">' % route) + frag.strip() + '</main>'

    head = ('<link rel="stylesheet" href="/vendor/myth-index/myth-index.css">\n'
            + "".join('<link rel="stylesheet" href="/%s">\n' % c for c in css)
            + '<script type="importmap">\n{"imports":{\n'
              '  "three":"https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",\n'
              '  "three/addons/":"https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"\n'
              '}}\n</script>')
    foot = ('<script src="/vendor/myth-index/myth-index.js"></script>\n'
            '<script>window.SIE_ASSETS="/assets/yt/";</script>\n'
            '<script type="application/json" id="videos-data">%s</script>\n'
            '<script src="/%s"></script>\n'
            '<script type="module" src="/%s"></script>' % (blob, js, case))

    pages = (("index.html", "home", "/"), ("videos/index.html", "sie", "/videos"))
    os.makedirs(os.path.join(OUT, "videos"), exist_ok=True)
    for name, key, route in pages:
        doc = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
               '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
               '<title>sie.market %s</title>\n%s\n</head>\n<body>\n%s\n%s\n</body>\n</html>\n'
               % (route, head, fix(mains[key], route), foot))
        p = os.path.join(OUT, name)
        with open(p, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(doc)
        print("  %-24s %7d B  -> %s" % (name, len(doc), route))

    # the two pages need the same siblings the real server has
    for link in ("assets", "css", "js", "vendor"):
        src = os.path.join(ROOT, "site", link)
        dst = os.path.join(OUT, link)
        if os.path.exists(dst) or not os.path.exists(src):
            continue
        try:
            os.symlink(src, dst, target_is_directory=True)
            print("  linked %s" % link)
        except OSError as e:
            print("  could not link %s (%s) — serve site/ at the same origin"
                  % (link, e.__class__.__name__))
    print("\nserve with:  python -m http.server 8799 --directory site/build/route-preview")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
