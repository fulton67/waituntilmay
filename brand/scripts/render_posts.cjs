// Server renderer for posts (BUILDER Phase B/C/D). Opens kit/templates/render.html in headless Chromium with the Adobe kit
// (served on http://localhost:<PORT>, a kit domain), calls window.OK.render(spec) and screenshots every .ok page.
// It serves public/ at the same paths the Next site uses (/brand/ostad/kit/...), so a spec renders the same here, in the builder
// preview and in the API route. Pass { base } to render against a running site instead (the API route passes its own origin).
// usage: NODE_PATH=node_modules node brand/scripts/render_posts.cjs jobs.json   (jobs: [{ spec, out }], out = path prefix)
// Also exported as renderJobs() for the API route.
const http = require("http"), fs = require("fs"), path = require("path");
const PUBLIC = path.resolve(__dirname, "..", "..", "public"); const PAGE = "/brand/ostad/kit/templates/render.html";
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp" };
function serve(port) {
  const server = http.createServer((req, res) => {
    const p = path.join(PUBLIC, decodeURIComponent(req.url.split("?")[0].split("#")[0]));
    if (!p.startsWith(PUBLIC) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(p).toLowerCase()] || "application/octet-stream" }); fs.createReadStream(p).pipe(res);
  });
  return new Promise((r) => server.listen(port, "127.0.0.1", () => r(server)));
}
async function renderJobs(jobs, { port = Number(process.env.PORT || 8769), chromium, base } = {}) {
  chromium = chromium || require("playwright").chromium;
  const server = base ? null : await serve(port); base = base || `http://localhost:${port}`; const browser = await chromium.launch(); const out = [];
  try {
    for (const job of jobs) {
      const page = await browser.newPage({ viewport: { width: 1200, height: 2000 }, deviceScaleFactor: 1 });
      const errors = []; page.on("pageerror", (e) => errors.push(String(e))); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      await page.goto(base + PAGE, { waitUntil: "networkidle" });
      await page.waitForFunction(() => window.__ready === true);
      const r = await page.evaluate((spec) => window.OK.render(spec), job.spec);
      const n = await page.locator("#stage > .ok").count(); const files = [];
      for (let i = 0; i < n; i++) {
        const f = n === 1 ? `${job.out}.png` : `${job.out}-${String(i + 1).padStart(2, "0")}.png`;
        if (job.out) fs.mkdirSync(path.dirname(path.resolve(f)), { recursive: true });
        const buf = await page.locator("#stage > .ok").nth(i).screenshot({ path: job.out ? path.resolve(f) : undefined });
        files.push(job.out ? f : buf);
      }
      out.push({ out: job.out, files, fonts: r.fonts, warnings: r.warnings, pages: n, w: r.w, h: r.h, errors });
      await page.close();
    }
  } finally { await browser.close(); if (server) server.close(); }
  return out;
}
module.exports = { renderJobs };
if (require.main === module) {
  const jobs = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), "utf8"));
  renderJobs(jobs).then((r) => {
    const rp = path.resolve(process.argv[2]).replace(/\.json$/, ".receipts.json"); fs.writeFileSync(rp, JSON.stringify(r, null, 1));
    console.log(`${r.length} jobs, ${r.reduce((a, x) => a + x.pages, 0)} pages, adobe fonts ${r.filter((x) => x.fonts === "adobe").length}/${r.length}, warnings ${r.reduce((a, x) => a + x.warnings.length, 0)}, errors ${r.reduce((a, x) => a + x.errors.length, 0)}`);
  }).catch((e) => { console.error(e); process.exit(1); });
}
