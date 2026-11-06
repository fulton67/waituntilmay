// BUILDER Phase G: check /brand/ostad on the dev server. Section order must be Make · Demo wall · Templates · Look · Icons · Type;
// every image loads, the reel decodes, the builder link resolves, no console errors, no horizontal scroll at 390 and 1440 px.
// usage: NODE_PATH=node_modules node brand/scripts/page_check.cjs [base=http://localhost:3107]  -> brand/kit/page_check.json + _page/*.png (local)
const fs = require("fs"), path = require("path"); const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:3107"; const OUT = path.resolve(__dirname, "..", "kit"); const SH = path.join(OUT, "_page"); fs.mkdirSync(SH, { recursive: true });
const WANT = ["make", "demo-wall", "templates", "look", "icons", "type"];
(async () => {
  const browser = await chromium.launch(); const res = { base: BASE, widths: {} };
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } }); const errors = [];
    page.on("pageerror", (e) => errors.push(String(e))); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(BASE + "/brand/ostad", { waitUntil: "load", timeout: 120000 });
    // scroll through so lazy images load
    const H = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < H; y += 700) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(120); }
    await page.waitForLoadState("networkidle").catch(() => {});
    const r = await page.evaluate(async () => {
      const imgs = [...document.querySelectorAll("main img")]; await Promise.all(imgs.map((i) => i.decode().catch(() => {})));
      const v = document.querySelector("video"); v.preload = "auto"; v.load(); await new Promise((ok) => { v.onloadeddata = ok; setTimeout(ok, 15000); });
      return { order: [...document.querySelectorAll("main section")].map((s) => s.id), images: imgs.length, broken: imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute("src")),
        video: { ready: v.readyState, w: v.videoWidth, h: v.videoHeight, dur: v.duration }, overflow_px: document.documentElement.scrollWidth - window.innerWidth,
        h1: document.querySelectorAll("h1").length, make_href: document.querySelector("#make a")?.getAttribute("href") };
    });
    await page.screenshot({ path: path.join(SH, `page_${width}.png`), fullPage: width === 1440 ? false : false });
    res.widths[width] = { ...r, errors };
    await page.close();
  }
  const mk = await (await browser.newPage()).goto(BASE + "/brand/ostad/make", { waitUntil: "load", timeout: 120000 }); res.make_status = mk.status();
  await browser.close();
  const w = Object.values(res.widths);
  res.ok = w.every((x) => JSON.stringify(x.order) === JSON.stringify(WANT) && x.broken.length === 0 && x.video.ready >= 2 && x.overflow_px <= 0 && x.errors.length === 0 && x.h1 === 1) && res.make_status === 200;
  fs.writeFileSync(path.join(OUT, "page_check.json"), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
