"""
Re-shoot the /videos page previews that sit inside the index panel.

Run by .github/workflows/videos.yml after the feed refresh, so the preview always
shows the current grid. Serves site/ on a throwaway port and screenshots it.

    python scripts/capture_videos_page.py
"""

import sys
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import contextlib
import functools
import http.server
import os
import socket
import threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
OUT = os.path.join(SITE, "assets")


def free_port():
    with contextlib.closing(socket.socket()) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def main():
    from playwright.sync_api import sync_playwright
    from PIL import Image

    port = free_port()
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    print(f"serving site/ on {port}")

    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            for w in (1280, 390):
                pg = b.new_page(viewport={"width": w, "height": 900}, device_scale_factor=2)
                pg.goto(f"http://127.0.0.1:{port}/index.html#sie", wait_until="load")
                pg.evaluate("()=>{try{sessionStorage.setItem('sie-intro','1');"
                            "sessionStorage.setItem('sie-desc','1')}catch(e){}}")
                pg.reload(wait_until="load")
                pg.wait_for_timeout(2600)
                # the preview must not contain the pill that opens it
                pg.evaluate("()=>{document.querySelectorAll('[id=\"corner-mount\"]')"
                            ".forEach(e=>e.style.visibility='hidden')}")
                png = os.path.join(OUT, f"_cap{w}.png")
                pg.screenshot(path=png, full_page=True)
                im = Image.open(png).convert("RGB")
                dest = os.path.join(OUT, f"preview-videos-{w}.webp")
                im.save(dest, "WEBP", quality=82, method=6)
                os.remove(png)
                print(f"  preview-videos-{w}.webp  {im.size[0]}x{im.size[1]}  "
                      f"{os.path.getsize(dest):,} B")
                pg.close()
            b.close()
    finally:
        srv.shutdown()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
