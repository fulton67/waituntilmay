// BUILDER Phase C check: drives /brand/ostad/make in Chromium and records each "done when" item.
//   1 every template x size renders in the browser preview (page count > 0, the template's class) and on the server (200,
//     image/png, the canvas size)
//   2 PNG text matches the preview: the preview is rendered 1:1 (wide viewport), its page is screenshotted and saved beside
//     the server PNG; scripts/make_check.py measures the pixel difference
//   3 a 7-slide carousel zip downloads (Auto + Regenerate until a carousel, then slides added to 7 if needed)
//   4 a draft survives a reload; 5 a dropped image lands in the slot; 6 zero console errors
// usage: NODE_PATH=node_modules node brand/scripts/make_check.cjs [baseURL]   -> brand/kit/templates/make_check.json
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const JSZip = require("jszip");
const BASE = process.argv[2] || "http://localhost:3107";
const TP = path.resolve(__dirname, "..", "kit", "templates"); const OUT = path.join(TP, "_proof", "make"); fs.mkdirSync(OUT, { recursive: true });
const SIZES = { "4x5": [1080, 1350], "1x1": [1080, 1080], "9x16": [1080, 1920] };
const pngSize = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];
const CAPTION = fs.readFileSync(path.join(__dirname, "make_check_caption.txt"), "utf8");

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 2600, height: 1600 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  const res = { base: BASE, browser: [], server: [], match: [], zip: null, draft: null, image: null, errors };
  await page.goto(BASE + "/brand/ostad/make", { waitUntil: "load" });
  await page.getByTestId("picker").waitFor({ timeout: 60000 });
  const frame = () => page.frameLocator('[data-testid="preview"]');
  const settle = async () => { await page.waitForTimeout(450); await page.waitForFunction(() => /page/.test(document.querySelector('[data-testid="status"]')?.textContent || "")); };
  const ids = await page.$$eval("[data-template]", (b) => b.map((x) => x.getAttribute("data-template")));

  // 1 + 2
  for (const id of ids) {
    await page.click(`[data-template="${id}"]`);
    for (const size of Object.keys(SIZES)) {
      await page.click(`[data-size="${size}"]`); await settle();
      const st = await page.getByTestId("status").textContent();
      const n = await frame().locator("#stage > .ok").count();
      const cls = n ? await frame().locator("#stage > .ok").first().getAttribute("class") : "";
      res.browser.push({ id, size, pages: n, cls, status: st.trim() });
      // preview at 1:1: screenshot the first page inside the iframe
      const prev = path.join(OUT, `${id}_${size}_preview.png`);
      if (n) await frame().locator("#stage > .ok").first().screenshot({ path: prev });
      // server render of the same draft (first slide), through the route the button uses
      const spec = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem("ostad-make-drafts-v1"))[0]; const cur = localStorage.getItem("ostad-make-current-v1"); const dd = JSON.parse(localStorage.getItem("ostad-make-drafts-v1")).find((x) => x.id === cur) || d; return { size: dd.size, accent: dd.accent, slides: [dd.slides[dd.active]] }; });
      const r = await page.request.post(BASE + "/api/brand/ostad/render", { data: { spec, format: "png", name: `${id}_${size}` }, timeout: 120000 });
      const ct = r.headers()["content-type"] || ""; let wh = null, file = null;
      if (r.ok() && ct.includes("png")) { const b = await r.body(); wh = pngSize(b); file = path.join(OUT, `${id}_${size}_server.png`); fs.writeFileSync(file, b); }
      else if (r.ok() && ct.includes("zip")) { const z = await JSZip.loadAsync(await r.body()); const first = Object.keys(z.files).sort()[0]; const b = await z.file(first).async("nodebuffer"); wh = pngSize(b); file = path.join(OUT, `${id}_${size}_server.png`); fs.writeFileSync(file, b); }
      res.server.push({ id, size, status: r.status(), type: ct, fonts: r.headers()["x-ok-fonts"], pages: Number(r.headers()["x-ok-pages"] || 0), wh, size_ok: !!wh && wh[0] === SIZES[size][0] && wh[1] === SIZES[size][1] });
      if (file && n) res.match.push({ id, size, preview: path.relative(TP, prev), server: path.relative(TP, file) });
    }
  }
  // 5 image drop: the first image slot of procedure-card takes a file
  await page.click('[data-template="procedure-card"]'); await page.click('[data-size="4x5"]');
  const photo = path.join(TP, "photos", fs.readdirSync(path.join(TP, "photos")).find((f) => f.endsWith(".jpg")));
  await page.setInputFiles('input[type=file][data-slot="image"]', photo); await settle();
  const imgSrc = await frame().locator("#stage > .ok img").first().getAttribute("src");
  res.image = { dropped: path.basename(photo), data_url: (imgSrc || "").startsWith("data:image/jpeg"), filter: await frame().locator("#stage > .ok").first().getAttribute("class") };

  // 3 carousel zip: Auto, regenerate until carousel
  await page.getByTestId("caption").fill(CAPTION);
  await page.getByTestId("auto").click(); await settle();
  for (let i = 0; i < 12 && !/picked carousel/.test(await page.getByTestId("note").textContent()); i++) { await page.getByTestId("regenerate").click(); await settle(); }
  const autoNote = await page.getByTestId("note").textContent();
  let slides = await page.$$eval('[data-testid="add-slide"]', (b) => b.length && Number((document.querySelector('[data-testid="download-zip"]').textContent.match(/\((\d+)\)/) || [])[1]));
  while (slides < 7) { await page.getByTestId("add-slide").click(); slides++; }
  await settle();
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 180000 }), page.getByTestId("download-zip").click()]);
  const zp = path.join(OUT, "carousel.zip"); await dl.saveAs(zp);
  const z = await JSZip.loadAsync(fs.readFileSync(zp)); const entries = Object.keys(z.files).sort();
  res.zip = { auto: autoNote.trim(), slides, file: path.relative(TP, zp), entries, count: entries.length, preview_pages: await frame().locator("#stage > .ok").count() };
  await page.waitForFunction(() => /Rendered/.test(document.querySelector('[data-testid="note"]')?.textContent || ""), null, { timeout: 30000 }).catch(() => {});
  res.zip.note = (await page.getByTestId("note").textContent()).trim();

  // 4 drafts survive a reload
  await page.getByTestId("duplicate").click();
  await page.fill('input[aria-label="Draft name"]', "Check draft");
  await page.click('[data-template="single-statement"]');
  await page.fill('input[data-slot="statement"]', "Drafts survive a reload.");
  await settle();
  await page.reload({ waitUntil: "load" }); await page.getByTestId("picker").waitFor(); await settle();
  res.draft = { name: await page.inputValue('input[aria-label="Draft name"]'), statement: await page.inputValue('input[data-slot="statement"]'),
    drafts: await page.$$eval('[data-testid="draft-select"] option', (o) => o.map((x) => x.textContent)), preview_text: (await frame().locator("#stage > .ok").first().innerText()).replace(/\s+/g, " ").trim() };
  res.draft.ok = res.draft.name === "Check draft" && res.draft.statement === "Drafts survive a reload." && res.draft.preview_text.includes("Drafts survive a reload.");
  await page.screenshot({ path: path.join(OUT, "maker.png"), fullPage: false });
  await browser.close();
  res.summary = {
    browser_ok: res.browser.filter((x) => x.pages > 0 && x.cls.includes("ok--" + x.size)).length + "/" + res.browser.length,
    server_ok: res.server.filter((x) => x.status === 200 && x.size_ok).length + "/" + res.server.length,
    server_adobe: res.server.filter((x) => x.fonts === "adobe").length + "/" + res.server.length,
    zip_7: res.zip.count === 7, draft_reload: res.draft.ok, image_drop: res.image.data_url, console_errors: errors.length,
  };
  fs.writeFileSync(path.join(TP, "make_check.json"), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res.summary, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
