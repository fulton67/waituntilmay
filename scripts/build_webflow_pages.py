"""
Split site/index.html into the two Webflow pages and drop the hash routing.

site/index.html ships both pages in one document, hash-routed (#home / #sie).
Webflow wants one <main> per page at real routes, so:

    #home  ->  /        (Home)
    #sie   ->  /sie     (sie)

Asset src values are rewritten from the relative `assets/...` to whatever the
Webflow CDN hands back at upload time. Until that exists the placeholders stay,
so the output is diffable against site/index.html.

    python scripts/build_webflow_pages.py                 # placeholders
    python scripts/build_webflow_pages.py --map assets.json   # real CDN URLs

assets.json is {"assets/cd-front.webp": "https://cdn.prod.website-files.com/..."}
written by the upload step.

Writes site/build/home.html and site/build/sie.html — page bodies only, no
<html>/<head>, ready to hand to the WHTML builder.
"""

import sys
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import argparse
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
SRC = os.path.join(ROOT, "site", "index.html")
OUTDIR = os.path.join(ROOT, "site", "build")

# hash route -> real route
ROUTES = {"#home": "/", "#sie": "/videos"}


def extract_mains(html):
    """Return {id: inner html of that <main>} without a DOM parser."""
    out = {}
    for m in re.finditer(r'<main\s+id="([^"]+)"[^>]*>(.*?)</main>', html, re.S):
        out[m.group(1)] = m.group(2)
    return out


def dehash(fragment):
    """#sie -> /sie, #home -> / ; leave every other href alone."""
    def sub(m):
        quote, href = m.group(1), m.group(2)
        return f'href={quote}{ROUTES.get(href, href)}{quote}'
    return re.sub(r'href=(["\'])(#[\w-]*)\1', sub, fragment)


def remap_assets(fragment, mapping):
    if not mapping:
        return fragment, []
    swapped = []

    def sub(m):
        attr, quote, path = m.group(1), m.group(2), m.group(3)
        url = mapping.get(path)
        if not url:
            return m.group(0)
        swapped.append((path, url))
        return f'{attr}={quote}{url}{quote}'

    out = re.sub(r'(src|href)=(["\'])(assets/[^"\']+)\2', sub, fragment)
    return out, swapped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--map", help="JSON of {relative asset path: CDN url}")
    args = ap.parse_args()

    mapping = {}
    if args.map:
        with open(args.map, encoding="utf-8") as fh:
            mapping = json.load(fh)

    with open(SRC, encoding="utf-8") as fh:
        html = fh.read()

    mains = extract_mains(html)
    missing = [k for k in ("home", "sie") if k not in mains]
    if missing:
        raise SystemExit(f"index.html is missing <main id='{missing[0]}'>")

    os.makedirs(OUTDIR, exist_ok=True)
    report = {}

    for page_id, route in (("home", "/"), ("sie", "/videos")):
        frag = mains[page_id]
        before = len(re.findall(r'href=["\']#', frag))
        frag = dehash(frag)
        after = len(re.findall(r'href=["\']#', frag))
        frag, swapped = remap_assets(frag, mapping)

        # the hidden attribute is hash-routing machinery; real routes don't need it
        wrapper = f'<main class="page" data-route="{route}">\n{frag.rstrip()}\n</main>\n'

        dest = os.path.join(OUTDIR, f"{page_id}.html")
        with open(dest, "w", encoding="utf-8") as fh:
            fh.write(wrapper)

        assets = sorted(set(re.findall(r'(?:src|href)=["\'](assets/[^"\']+)["\']', frag)))
        report[page_id] = {
            "route": route,
            "file": os.path.relpath(dest, ROOT).replace("\\", "/"),
            "bytes": len(wrapper),
            "hashLinksRewritten": before - after,
            "hashLinksRemaining": after,
            "assetsStillRelative": assets,
            "assetsSwapped": [{"from": a, "to": b} for a, b in swapped],
        }
        print(f"  {route:6} -> {report[page_id]['file']}  ({len(wrapper):,} B)  "
              f"hash links rewritten: {before - after}, remaining: {after}")
        for a in assets:
            print(f"           still relative: {a}")

    with open(os.path.join(OUTDIR, "build-report.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=1)
    print(f"\n  report -> site/build/build-report.json")
    if not mapping:
        print("  NOTE: no --map given, asset paths left relative. "
              "Re-run with the upload manifest before handing these to Webflow.")


if __name__ == "__main__":
    main()
