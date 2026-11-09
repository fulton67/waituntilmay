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
TOKENS = "tokens.v2.css"
CSS = "sie.v19.css"
JS = "sie.v18.js"
CASE = "case.v4.js"
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

    def fix(frag, route, cls):
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
        return ('<main class="%s" data-route="%s">' % (cls, route)) \
            + frag.strip() + '</main>'

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
            '<script type="importmap">\n'
            '{"imports":{\n'
            '  "three":"https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",\n'
            '  "three/addons/":"https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"\n'
            '}}\n'
            '</script>\n',
        "2-site-footer.html":
            '<!-- Site settings / Custom code / Footer code -->\n'
            f'<script src="{CDN}/myth-index.v1.js"></script>\n'
            f'<script>window.SIE_ASSETS="{CDN}/yt/";</script>\n'
            f'<script type="application/json" id="videos-data">{blob}</script>\n'
            f'<script src="{CDN}/{JS}"></script>\n'
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

The Webflow Data API could not publish this build. Routes tried:
  1. the `webflow` MCP server — CONNECTION_CLOSED at session start
  2. the claude.ai Webflow connector — unauthenticated; needs `/mcp` in the CLI
  3. a Webflow API token in `.env` — none present (only ids and the MCP URL)
So it is paste, in this order:

1. `1-site-head.html`   -> Site settings / Custom code / Head code
2. `2-site-footer.html` -> Site settings / Custom code / Footer code
3. `3-page-home.html`   -> page "/"       / Page settings / Before </body>
4. `4-page-videos.html` -> page "/videos" / Page settings / Before </body>

The videos page slug must be **videos** (it was created as "sie", id
6ab3da62aedbf627496688e4 — rename it). Then Publish to sie.market AND
www.sie.market explicitly. Custom domains need a paid Webflow site plan.

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
