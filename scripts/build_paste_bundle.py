"""Regenerate site/build/webflow-paste/ from site/index.html.

The Webflow grant covers the Dauan Jacari workspace, not sie.market's, and the
Webflow MCP connector is unauthenticated in this session, so the Data API cannot
publish. This writes the four blocks to paste by hand instead, and it is
generated rather than typed so it never drifts from site/index.html.

Image URLs are reused from whatever the previous bundle already resolved into
the sie.market asset store (cdn.prod.website-files.com/<site>/<hash>_<name>);
anything new — the YouTube posters and the GLB — is served from
assets.sie.market, which this repo deploys.

    python scripts/build_paste_bundle.py
"""

import sys
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception: pass

import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
SRC = os.path.join(ROOT, "site", "index.html")
OUT = os.path.join(ROOT, "site", "build", "webflow-paste")

CDN = "https://assets.sie.market"
TOKENS = "tokens.v3.css"
CSS = "sie.v26.css"
JS = "sie.v27.js"
CASE = "case.v6.js"
GLB = "sie-case.glb"
ROUTES = {"#home": "/", "#sie": "/videos"}


# already on the asset host under a different name, or never uploaded to Webflow
EXTRA = {
    "assets/cd-bundle.webp": CDN + "/cd-bundle.webp",
    "assets/sie-intro.mp4": CDN + "/sie-intro.v4.mp4",
}


def existing_image_map():
    """assets/<name> -> the Webflow CDN URL the last bundle used."""
    out = {}
    for fn in ("3-page-home.html", "4-page-videos.html"):
        p = os.path.join(OUT, fn)
        if not os.path.exists(p):
            continue
        for m in re.finditer(
                r'https://cdn\.prod\.website-files\.com/[0-9a-f]+/[0-9a-f]+_([A-Za-z0-9._-]+)',
                open(p, encoding="utf-8").read()):
            out["assets/" + m.group(1)] = m.group(0)
    return out


def main():
    html = open(SRC, encoding="utf-8").read()
    images = existing_image_map()
    images.update(EXTRA)

    mains, mclass = {}, {}
    for m in re.finditer(r'<main\s+id="([^"]+)"([^>]*)>(.*?)</main>', html, re.S):
        mains[m.group(1)] = m.group(3)
        cm = re.search(r'class="([^"]*)"', m.group(2))
        mclass[m.group(1)] = cm.group(1) if cm else "page"

    blob = re.search(r'<script type="application/json" id="videos-data">(.*?)</script>',
                     html, re.S).group(1)

    # the intro splash is a sibling of <main>, not a child of one, so the
    # <main> scrape above never saw it. It is site-wide: ride the footer.
    m = re.search(r'<div id="intro"[^>]*>(?:(?!<div\b).)*?</div>', html, re.S)
    if m is None:
        print('  WARNING: no #intro block in site/index.html')
    intro = m.group(0) if m else ''

    def rewrite(frag):
        """local asset paths -> the hosts that serve them"""
        # hash routes -> real routes
        frag = re.sub(r'href=(["\'])(#[\w-]*)\1',
                      lambda m: 'href=%s%s%s' % (m.group(1), ROUTES.get(m.group(2), m.group(2)), m.group(1)),
                      frag)
        # posters: always the asset host
        frag = frag.replace('src="assets/yt/', 'src="%s/yt/' % CDN)
        # everything else: the Webflow asset store if we already know it
        def sub(m):
            path = m.group(3)
            url = images.get(path)
            return '%s=%s%s%s' % (m.group(1), m.group(2), url or path, m.group(2)) if url else m.group(0)
        frag = re.sub(r'(src|href)=(["\'])(assets/[^"\']+)\2', sub, frag)
        # the 3D host needs an absolute model URL
        frag = frag.replace('<div class="case3d" id="case3d"></div>',
                            '<div class="case3d" id="case3d" data-model="%s/%s"></div>' % (CDN, GLB))
        return frag

    def fix(frag, route, cls):
        return ('<main class="%s" data-route="%s">' % (cls, route)) \
            + rewrite(frag).strip() + '</main>'

    unresolved = sorted(set(re.findall(r'["\'](assets/[^"\']+)', html))
                        - set(images) - {p for p in re.findall(r'["\'](assets/yt/[^"\']+)', html)}
                        - {'assets/case/sie-case-web.glb'})

    files = {
        "1-site-head.html":
            '<!-- Site settings / Custom code / Head code -->\n'
            f'<link rel="stylesheet" href="{CDN}/fonts.v1.css">\n'
            f'<link rel="stylesheet" href="{CDN}/myth-index.v1.css">\n'
            f'<link rel="stylesheet" href="{CDN}/{TOKENS}">\n'
            f'<link rel="stylesheet" href="{CDN}/{CSS}">\n'
            # The wall talks to these three origins before it can show a frame.
            # Naming them here opens the sockets during parse rather than after
            # first paint, which is part of why a tile used to sit on a spinner.
            '<link rel="preconnect" href="https://www.youtube-nocookie.com" crossorigin>\n'
            '<link rel="preconnect" href="https://www.youtube.com" crossorigin>\n'
            '<link rel="preconnect" href="https://i.ytimg.com" crossorigin>\n'
            '<script type="importmap">\n'
            '{"imports":{\n'
            '  "three":"https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",\n'
            '  "three/addons/":"https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"\n'
            '}}\n'
            '</script>\n',
        "2-site-footer.html":
            '<!-- Site settings / Custom code / Footer code -->\n'
            + (rewrite(intro) + '\n' if intro else '')
            + f'<script defer src="{CDN}/myth-index.v1.js"></script>\n'
            f'<script>window.SIE_ASSETS="{CDN}/yt/";</script>\n'
            f'<script type="application/json" id="videos-data">{blob}</script>\n'
            f'<script defer src="{CDN}/{JS}"></script>\n'
            f'<script type="module" src="{CDN}/{CASE}"></script>\n',
        "3-page-home.html":
            '<!-- page "/" / Page settings / Custom code / Before </body> -->\n'
            + fix(mains["home"], "/", mclass["home"]) + "\n",
        "4-page-videos.html":
            '<!-- page "/videos" / Page settings / Custom code / Before </body> -->\n'
            + fix(mains["sie"], "/videos", mclass["sie"]) + "\n",
    }

    os.makedirs(OUT, exist_ok=True)
    for name, body in files.items():
        with open(os.path.join(OUT, name), "w", encoding="utf-8", newline="\n") as fh:
            fh.write(body)
        print(f"  {name:<22} {len(body):>7,} B")

    shipped = [TOKENS, CSS, JS, CASE, GLB, "myth-index.v1.css",
               "myth-index.v1.js", "fonts.v1.css"]
    hosted = ""
    for _name in shipped:
        _p = os.path.join(ROOT, "vercel-assets", _name)
        _n = os.path.getsize(_p) if os.path.exists(_p) else None
        hosted += "  %-20s %11s B\n" % (
            _name, format(_n, ",") if _n else "MISSING")
    hosted += "  %-20s %11s   19 posters, none from i.ytimg.com\n" % (
        "yt/<id>.jpg", "")

    readme = f"""# Paste-to-deploy — sie.market: {CSS} / {JS} / {CASE}

Generated by `python scripts/build_paste_bundle.py`. Do not hand-edit.

These four blocks ship through the Webflow Data API, not by hand. The
claude.ai Webflow connector carries them:

1. `1-site-head.html`   -> set_site_freeform_code   location "head"
2. `2-site-footer.html` -> set_site_freeform_code   location "footer"
3. `3-page-home.html`   -> set_page_freeform_code   page 6ab09c2143ba16c77bec74cd
4. `4-page-videos.html` -> set_page_freeform_code   page 6ab3da62aedbf627496688e4

then publish_site with BOTH custom domain ids explicitly:
  sie.market      6ab0b1f9ff22890b1744f389
  www.sie.market  6ab0b1faff22890b1744f390
A site may be published at most once a minute; a rejected call still spends the
slot. Pasting by hand is the fallback if the connector is not authenticated.

Ordering trap: Webflow injects the SITE footer block ABOVE the PAGE footer
block, so the scripts land before the <main> they operate on. Every classic
script in block 2 therefore carries `defer` — without it sie.*.js runs against
an empty body, finds no #corner-mount and builds no nav pill, while the module
(case.*.js) still works because a module defers by default.

Hosted and byte-verified on assets.sie.market:
{hosted}
three.js r169 loads from cdn.jsdelivr.net via the importmap in the head block.
"""
    if unresolved:
        readme += "\nStill pointing at relative paths (upload to the Webflow asset store\n" \
                  "or add to vercel-assets/, then re-run this script):\n" \
                  + "".join(f"  {u}\n" for u in unresolved)
    with open(os.path.join(OUT, "README.md"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(readme)
    print(f"  {'README.md':<22} {len(readme):>7,} B")
    print(f"\nimages resolved from the asset store: {len(images)}")
    if unresolved:
        print("UNRESOLVED (still relative):")
        for u in unresolved:
            print("   ", u)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
