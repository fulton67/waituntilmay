// Generic scene renderer (BUILDER Phase A/B). Serves brand/ on http://localhost:8768 (a domain of Adobe kit vzz0hgt, so the
// real fonts load), opens each scene, waits for fonts, screenshots the clip, writes a receipt.
// usage: NODE_PATH=node_modules node brand/scripts/render_scenes.cjs brand/look/proof/_scenes/scenes.json
// scenes.json: [{ "html": "look/proof/_scenes/x.html", "w": 1080, "h": 1350, "clip": [x,y,w,h]|null, "out": "look/proof/_r/x.png", "omitBackground": false }]
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const BRAND = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp" };
const server = http.createServer((req, res) => {
  const p = path.join(BRAND, decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(BRAND) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(p).toLowerCase()] || "application/octet-stream" }); fs.createReadStream(p).pipe(res);
});
(async () => {
  const list = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), "utf8"));
  const port = Number(process.env.PORT || 8768);
  await new Promise((r) => server.listen(port, "127.0.0.1", r));
  const browser = await chromium.launch();
  const receipts = [];
  for (const s of list) {
    const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1 });
    const errors = []; page.on("pageerror", (e) => errors.push(String(e))); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(`http://localhost:${port}/${s.html}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    // fonts actually used on the page must be loaded: every rendered text node's computed family/weight is checked
    const fonts = await page.evaluate(() => {
      const used = new Set(); const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) { const n = w.currentNode; if (!n.textContent.trim() || !n.parentElement) continue; const cs = getComputedStyle(n.parentElement);
        used.add(`${cs.fontStyle} ${cs.fontWeight} 20px ${cs.fontFamily}`); }
      const list = [...used]; const ok = list.every((f) => document.fonts.check(f));
      const loaded = [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight}`);
      return { display: list.length ? ok : false, text: list.length > 0, used: list, loaded };
    });
    const out = path.join(BRAND, s.out); fs.mkdirSync(path.dirname(out), { recursive: true });
    const opt = { path: out, omitBackground: !!s.omitBackground };
    if (s.clip) opt.clip = { x: s.clip[0], y: s.clip[1], width: s.clip[2], height: s.clip[3] };
    await page.screenshot(opt);
    receipts.push({ out: s.out, html: s.html, fonts_loaded: fonts.display, text_on_page: fonts.text, fonts_used: fonts.used, fonts_loaded_list: fonts.loaded, errors });
    await page.close();
  }
  await browser.close(); server.close();
  const rp = path.resolve(process.argv[2]).replace(/\.json$/, ".receipts.json"); fs.writeFileSync(rp, JSON.stringify(receipts, null, 1));
  console.log(`${receipts.length} rendered, with text ${receipts.filter((r) => r.text_on_page).length}, fonts ok ${receipts.filter((r) => r.fonts_loaded).length}, errors ${receipts.reduce((a, r) => a + r.errors.length, 0)}`);
})().catch((e) => { console.error(e); process.exit(1); });
