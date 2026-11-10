"""Headless render harness for the case viewer.

    from harness import Harness
    with Harness() as h:              # serves site/ and opens the page at 390x844 @2x
        h.js("window.__case.pose({theta:0})")
        img = h.shot()                # numpy BGR of the canvas, device pixels
"""
import http.server, socketserver, threading, os, functools, io, json, sys
import numpy as np, cv2
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, '..', '..', 'site'))
OUT = os.path.abspath(os.path.join(HERE, '..', '..', '..', 'case-check'))

class _Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()

class Harness:
    def __init__(self, page='index.html', query='casedebug=1', vw=390, vh=844, dpr=2, gpu=True, headless=True):
        self.page, self.query, self.vw, self.vh, self.dpr, self.gpu, self.headless = page, query, vw, vh, dpr, gpu, headless
    def __enter__(self):
        socketserver.TCPServer.allow_reuse_address = True
        self.srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(_Q, directory=SITE))
        self.port = self.srv.server_address[1]
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()
        self.pw = sync_playwright().start()
        args = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl',
                '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows'] if self.gpu else []
        self.browser = self.pw.chromium.launch(headless=self.headless, args=args)
        self.ctx = self.browser.new_context(viewport={'width': self.vw, 'height': self.vh},
                                            device_scale_factor=self.dpr, has_touch=True, is_mobile=False)
        self.p = self.ctx.new_page()
        self.console = []
        self.p.on('console', lambda m: self.console.append(m.type + ': ' + m.text[:300]))
        self.p.on('pageerror', lambda e: self.console.append('pageerror: ' + str(e)[:300]))
        self.url = f'http://127.0.0.1:{self.port}/{self.page}?{self.query}#home'
        self.p.add_init_script("try{sessionStorage.setItem('sie-intro','1');sessionStorage.setItem('sieIntro','1')}catch(e){}")
        self.p.goto(self.url)
        self.p.wait_for_function('window.__case && (window.__case.ok || window.__case.error)', timeout=60000)
        if self.js('window.__case.error || null'): raise RuntimeError(self.js('window.__case.error'))
        self.p.wait_for_timeout(600)
        if self.js("!!document.querySelector('#intro') && getComputedStyle(document.querySelector('#intro')).display!=='none'"):
            self.p.mouse.click(10, 10); self.p.wait_for_timeout(1500)
        self.p.wait_for_function("document.querySelector('#case3d canvas').width > 100", timeout=20000)
        return self
    def __exit__(self, *a):
        try: self.browser.close(); self.pw.stop()
        finally: self.srv.shutdown()
    def js(self, expr): return self.p.evaluate(expr)
    def gl(self):
        return self.js("""(()=>{const c=document.createElement('canvas');const g=c.getContext('webgl2');
          const e=g.getExtension('WEBGL_debug_renderer_info');
          return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'unknown'})()""")
    def shot(self, bg=(0, 0, 0)):
        """the case canvas, composited over the page (black), device px, BGR"""
        import base64
        url = self.js("(()=>{const d=window.__case; d.renderOnce(); return document.querySelector('#case3d canvas').toDataURL('image/png')})()")
        rgba = cv2.imdecode(np.frombuffer(base64.b64decode(url.split(',')[1]), np.uint8), cv2.IMREAD_UNCHANGED)
        a = rgba[:, :, 3:4].astype(np.float32) / 255.0   # canvas is premultiplied-composited over black page
        return (rgba[:, :, :3].astype(np.float32) * a).round().astype(np.uint8)
        return cv2.imdecode(np.frombuffer(png, np.uint8), cv2.IMREAD_COLOR)
    def save(self, name, img=None):
        img = self.shot() if img is None else img
        path = os.path.join(OUT, name); os.makedirs(os.path.dirname(path), exist_ok=True)
        cv2.imwrite(path, img); return path

if __name__ == '__main__':
    with Harness() as h:
        print('gl:', h.gl()); print(json.dumps(h.js('window.__case.state ? window.__case.state() : null')))
        print(h.save('renders/probe.png')); print(h.console[-5:])
