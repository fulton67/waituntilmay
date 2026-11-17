// Renders designed feed stills (brand/posts/POST_RULES.md): opens public/brand/ostad/stills/<page>.html in headless Chromium on
// the same local server as render_posts.cjs (localhost, an Adobe kit domain) and screenshots every .tile as <out>/<data-name>.png.
// Feed posts never go through the Remotion video compositions.
// usage: NODE_PATH=node_modules node brand/scripts/render_stills.cjs grid4 brand/posts/grid4
const path = require("path"), fs = require("fs");
const { serve } = require("./render_posts.cjs");
(async () => {
  const [page = "grid4", out = "brand/posts/grid4"] = process.argv.slice(2);
  const port = Number(process.env.PORT || 8771), server = await serve(port);
  const { chromium } = require("playwright"); const browser = await chromium.launch();
  try {
    const p = await browser.newPage({ viewport: { width: 3500, height: 4400 }, deviceScaleFactor: 1 });
    const errors = []; p.on("pageerror", (e) => errors.push(String(e))); p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await p.goto(`http://localhost:${port}/brand/ostad/stills/${page}.html`, { waitUntil: "networkidle" });
    await p.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
    const fonts = await p.evaluate(() => window.__fonts);
    fs.mkdirSync(path.resolve(out), { recursive: true });
    const tiles = p.locator(".tile"); const n = await tiles.count(); const files = [];
    for (let i = 0; i < n; i++) {
      const name = await tiles.nth(i).getAttribute("data-name"); const f = path.join(out, `${name}.png`);
      await tiles.nth(i).screenshot({ path: path.resolve(f) }); files.push(f);
    }
    console.log(JSON.stringify({ tiles: n, files, fonts: [...new Set(fonts)], errors }));
  } finally { await browser.close(); server.close(); }
})();
