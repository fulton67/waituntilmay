// POST_GRID verify (measured, no screenshots judged by eye). Needs the dev server (default http://localhost:3107).
//  1. every tile template renders at 4:5 and 1:1 through the server route (PNG of the right size)          -> templates
//  2. on the 4:5 canvas, meta / label / headline boxes sit inside the centred 1080 x 1080 crop (y 135..1215)  -> crop
//  3. the before/after export refuses without both fields (403), and renders with both = yes                -> gate
//  4. the rhythm check fires on a known bad grid and passes the demo grid                                    -> rhythm
//  5. /brand/ostad/grid returns 200, renders 9 tiles, and logs no console errors                             -> page
//  6. lint on the nine demo tiles: colours are kit tokens only, text/ground contrast pairs                   -> lint
// usage: NODE_PATH=node_modules node brand/scripts/grid_check.cjs [base]  -> brand/kit/templates/grid/grid_check.json
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:3107";
const ROOT = path.resolve(__dirname, "..", "..");
const TILES = ["product", "before-after", "statement", "notice", "diagram", "ruled", "procedure", "quote", "graphic"];
const VARIANTS = { product: ["photo", "line", "ingredients"], diagram: ["radial", "list", "two-column", "callouts"], graphic: ["clock", "number", "ring", "timeline", "icon"] };
const P = (f) => `/brand/ostad/kit/templates/photos/${f}.jpg`;
const YES = { patient_consent: "yes", approved_by_ostad: "yes", before: P("p_texture-trio"), after: P("p_luma-texture") };
const post = (spec) => fetch(BASE + "/api/brand/ostad/render", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spec, format: "png" }) });
const pngSize = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];

(async () => {
  const out = { base: BASE, at: new Date().toISOString(), templates: [], crop: [], gate: {}, rhythm: {}, page: {}, lint: [] };
  // 1. every template x variant x size through the export route
  for (const t of TILES) for (const v of VARIANTS[t] || [null]) for (const size of ["4x5", "1x1"]) {
    const slots = { ...(v ? { variant: v } : {}), ...(t === "before-after" ? YES : {}), ...(t === "quote" ? { meta: "NewBeauty" } : {}) };
    const r = await post({ size, accent: "accent-1", slides: [{ template: t, slots }] }); const b = Buffer.from(await r.arrayBuffer());
    const [w, h] = r.ok ? pngSize(b) : [0, 0];
    out.templates.push({ template: t, variant: v, size, status: r.status, w, h, fonts: r.headers.get("x-ok-fonts"), pass: r.ok && w === 1080 && h === (size === "4x5" ? 1350 : 1080) });
  }
  // 3. gate
  const g0 = await post({ size: "4x5", accent: "accent-1", slides: [{ template: "before-after", slots: { patient_consent: "yes" } }] });
  const g1 = await post({ size: "4x5", accent: "accent-1", slides: [{ template: "before-after", slots: { approved_by_ostad: "yes" } }] });
  const g2 = await post({ size: "4x5", accent: "accent-1", slides: [{ template: "before-after", slots: YES }] });
  out.gate = { consent_only: g0.status, approval_only: g1.status, both_yes: g2.status, pass: g0.status === 403 && g1.status === 403 && g2.status === 200 };

  const browser = await chromium.launch();
  try {
    // 2. crop positions + 4. rhythm, inside the kit page itself
    const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
    await page.goto(BASE + "/brand/ostad/kit/templates/render.html", { waitUntil: "networkidle" }); await page.waitForFunction(() => window.__ready === true);
    for (const t of TILES) for (const v of VARIANTS[t] || [null]) {
      const slots = { ...(v ? { variant: v } : {}), ...(t === "quote" ? { meta: "NewBeauty" } : {}) };
      await page.evaluate((spec) => window.OK.render(spec), { size: "4x5", accent: "accent-1", slides: [{ template: t, slots }] });
      const boxes = await page.evaluate(() => {
        const ok = document.querySelector("#stage > .ok"), o = ok.getBoundingClientRect();
        return [...ok.querySelectorAll(".tl-meta, .tl-label, .tl-head, .tl-bottom, .tl-dhead, .tl-ruled-in, .tl-word, .tl-mixed, .tl-tline, .tl-num, .tl-cards, .ok-safe .q")].filter((e) => e.textContent.trim()).map((e) => {
          const r = e.getBoundingClientRect(); return { cls: e.className.baseVal ?? e.className, top: Math.round(r.top - o.top), bottom: Math.round(r.bottom - o.top), left: Math.round(r.left - o.left), right: Math.round(r.right - o.left) };
        });
      });
      const bad = boxes.filter((b) => b.top < 135 || b.bottom > 1215 || b.left < 0 || b.right > 1080);
      out.crop.push({ template: t, variant: v, boxes: boxes.length, outside: bad, pass: boxes.length > 0 && bad.length === 0 });
    }
    const demo = JSON.parse(fs.readFileSync(path.join(ROOT, "brand/kit/templates/grid/demo.grid.json"), "utf8"));
    const bad = [{ template: "statement" }, { template: "notice" }, { template: "product" }, { template: "statement" }, { template: "product" }, { template: "product" }, { template: "procedure" }, { template: "product" }, { template: "product" }];
    out.rhythm = await page.evaluate(([d, b]) => ({ demo: window.OK.rhythm(d.posts), bad: window.OK.rhythm(b).map((w) => w.rule), fill9: window.OK.rhythm(window.OK.fill9("product: A\nnotice: B", { products: [], pairs: [] })) }), [demo, bad]);
    out.rhythm.pass = out.rhythm.demo.length === 0 && out.rhythm.fill9.length === 0 && ["text-side", "text-stacked", "photo-run", "template-repeat"].every((r) => out.rhythm.bad.includes(r));

    // 6. lint the nine demo tiles: every computed colour on visible text/rules/fills must be a kit token (palette roles, their
    //    rgba forms, white, transparent), and every text node's ink vs the ground it sits on must reach 4.5:1 (3:1 for >= 24 px)
    const tok = JSON.parse(fs.readFileSync(path.join(ROOT, "brand/kit/palette.json"), "utf8")).roles;
    const allowed = Object.values(tok).map((r) => r.hex.toLowerCase()).concat(["#ffffff", "#000000"]);
    for (const p of demo.posts) {
      const slots = { ...p.slots }; for (const k of ["before", "after", "image"]) if (String(slots[k] || "").startsWith("/api/")) slots[k] = P("p_texture-trio"); // lint the layout, not patient photos
      await page.evaluate((spec) => window.OK.render(spec), { size: "4x5", accent: demo.accent, slides: [{ template: p.template, slots }] });
      const r = await page.evaluate(([allowed]) => {
        const hex = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(",").map((x) => parseFloat(x)); return { h: "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join(""), a: +a }; };
        const lum = (h) => { const v = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
        const ok = document.querySelector("#stage > .ok"); const off = []; const pairs = [];
        const ground = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { if (e.querySelector(":scope > img.ok-bg, :scope > .tl-pair, :scope > img.ok-treated, :scope > .tl-card-ph")) return "photo"; const b = hex(getComputedStyle(e).backgroundColor); if (b && b.a > 0.5) return b.h; } return "#ffffff"; };
        for (const el of ok.querySelectorAll("*")) {
          const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none") continue;
          for (const prop of ["color", "backgroundColor", "borderTopColor"]) { const c = hex(cs[prop]); if (c && c.a > 0 && !allowed.includes(c.h) && !(prop === "borderTopColor" && cs.borderTopStyle === "none")) off.push(`${el.className} ${prop} ${c.h}`); }
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
          if (own) { const g = ground(el); const c = hex(cs.color); if (g !== "photo" && c) { const L1 = lum(c.h), L2 = lum(g); const cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); const big = parseFloat(cs.fontSize) >= 24; pairs.push({ text: el.textContent.trim().slice(0, 24), ink: c.h, ground: g, ratio: +cr.toFixed(2), need: big ? 3 : 4.5, pass: cr >= (big ? 3 : 4.5) }); } }
        }
        return { off: [...new Set(off)], pairs };
      }, [allowed]);
      out.lint.push({ id: p.id, template: p.template, off_token: r.off, contrast_fail: r.pairs.filter((x) => !x.pass), pairs: r.pairs.length, pass: r.off.length === 0 && r.pairs.every((x) => x.pass) });
    }
    await page.close();

    // 5. the planner page
    const pg = await browser.newPage({ viewport: { width: 1440, height: 1200 } }); const errs = [];
    pg.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); }); pg.on("pageerror", (e) => errs.push(String(e)));
    const resp = await pg.goto(BASE + "/brand/ostad/grid", { waitUntil: "networkidle" });
    await pg.waitForSelector('[data-testid="tile"]', { timeout: 60000 }); await pg.waitForTimeout(4000);
    const tiles = await pg.locator('[data-testid="tile"]').count(); const rhythmText = await pg.locator('[data-testid="rhythm"]').innerText();
    out.page = { status: resp.status(), tiles, rhythm: rhythmText.replace(/\s+/g, " ").slice(0, 160), console_errors: errs, pass: resp.status() === 200 && tiles === 9 && errs.length === 0 };
  } finally { await browser.close(); }
  out.pass = { templates: out.templates.every((x) => x.pass), crop: out.crop.every((x) => x.pass), gate: out.gate.pass, rhythm: out.rhythm.pass, page: out.page.pass, lint: out.lint.every((x) => x.pass) };
  fs.writeFileSync(path.join(ROOT, "brand/kit/templates/grid/grid_check.json"), JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ pass: out.pass, templates: `${out.templates.filter((x) => x.pass).length}/${out.templates.length}`, crop_fail: out.crop.filter((x) => !x.pass).map((x) => `${x.template}/${x.variant}: ${JSON.stringify(x.outside)}`), gate: out.gate, rhythm_bad: out.rhythm.bad, rhythm_demo: out.rhythm.demo, page: out.page, lint_fail: out.lint.filter((x) => !x.pass) }, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
