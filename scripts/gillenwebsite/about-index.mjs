// The About index at 390 and 1440 px: every title at one computed font-size, no title box taller than one line,
// the titles that end in an ellipsis, the layout shift from navigation start, and the run of a cut title (hover on
// desktop, the active row on phones): its speed, its hold, and that it comes back to 0.
//   node scripts/gillenwebsite/about-index.mjs [base-url] [--out file]   (default http://localhost:3217)
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/about-index-report.json";
const browser = await chromium.launch({ channel: "chrome", headless: false });
const report = { base: BASE, at: new Date().toISOString(), widths: {} };
const no3 = (n) => String(n).padStart(3, "0");

for (const width of [390, 1440]) {
  const phone = width < 720;
  const ctx = await browser.newContext({ viewport: { width, height: phone ? 844 : 900 }, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 3 : 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__cls = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__cls.push({ v: e.value, t: Math.round(e.startTime) }); }).observe({ type: "layout-shift", buffered: true }); });
  await page.goto(`${BASE}/gillenwebsite/about`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => [...document.querySelectorAll("a[data-entry]")].map((a, i) => {
    const t = a.querySelector("[data-title]"), cs = getComputedStyle(t), meta = a.lastElementChild;
    const rg = document.createRange(); rg.selectNodeContents(t);
    const tb = t.getBoundingClientRect(), mb = meta.getBoundingClientRect();
    return {
      n: i + 1, text: t.textContent, fontPx: parseFloat(cs.fontSize), lh: parseFloat(cs.lineHeight), h: +tb.height.toFixed(2),
      // distinct line tops of the text: 1 when it sits on one line
      lines: new Set([...(() => { const q = document.createRange(); q.selectNodeContents(t.querySelector("span").firstChild); return q.getClientRects(); })()].map((q) => Math.round(q.top))).size, ellipsis: rg.getBoundingClientRect().width > tb.width + 0.01,
      overBy: Math.round(rg.getBoundingClientRect().width - tb.width), metaPx: parseFloat(getComputedStyle(meta).fontSize),
      collides: !(mb.top >= tb.bottom - 0.5 || mb.left >= tb.right - 0.5), metaBelow: mb.top >= tb.bottom - 0.5,
    };
  }));
  const sizes = [...new Set(r.map((x) => x.fontPx))];
  const cut = r.filter((x) => x.ellipsis);
  // the run: the longest cut title, sampled every frame
  const target = cut.sort((a, b) => b.overBy - a.overBy)[0] ?? null;
  let run = null;
  if (target) {
    const sel = `a[data-entry]:nth-of-type(${target.n})`;
    if (phone) await page.evaluate((s) => { const a = document.querySelector(s); scrollBy(0, a.getBoundingClientRect().top + a.offsetHeight / 2 - innerHeight / 2); }, sel);
    else await page.hover(sel);
    run = await page.evaluate((s) => new Promise((done) => {
      const el = document.querySelector(`${s} [data-title] span`), out = [], t0 = performance.now();
      const tick = () => {
        const m = new DOMMatrix(getComputedStyle(el).transform === "none" ? undefined : getComputedStyle(el).transform);
        out.push([performance.now() - t0, -m.m41]);
        if (performance.now() - t0 < 30000 && !(out.length > 30 && out.at(-1)[1] === 0 && out.at(-20)[1] === 0 && Math.max(...out.map((o) => o[1])) > 0)) requestAnimationFrame(tick); else done(out);
      };
      requestAnimationFrame(tick);
    }), sel);
    const peak = Math.max(...run.map((o) => o[1]));
    const start = run.find((o) => o[1] > 0)?.[0] ?? 0, reach = run.find((o) => o[1] >= peak - 0.01)[0];
    const leave = [...run].reverse().find((o) => o[1] >= peak - 0.01)[0], back = run.find((o) => o[0] > leave && o[1] === 0)?.[0];
    run = { title: `${no3(target.n)} ${target.text}`, overflowPx: target.overBy, peakPx: +peak.toFixed(1), outPxPerS: +(peak / ((reach - start) / 1000)).toFixed(1),
      holdMs: Math.round(leave - reach), backPxPerS: back ? +(peak / ((back - leave) / 1000)).toFixed(1) : null, endsAt0: run.at(-1)[1] === 0, totalMs: Math.round(run.at(-1)[0]) };
  }
  const cls = await page.evaluate(() => window.__cls);
  report.widths[width] = {
    entries: r.length, titleFontSizes: sizes, sameFontSize: sizes.length === 1,
    tallerThanOneLine: r.filter((x) => x.h > x.lh + 0.5 || x.lines > 1).map((x) => `${no3(x.n)} ${x.text} (${x.h}px)`),
    ellipsised: cut.sort((a, b) => a.n - b.n).map((x) => `${no3(x.n)} ${x.text} (over by ${x.overBy}px)`),
    metaPx: [...new Set(r.map((x) => x.metaPx))], metaCollides: r.filter((x) => x.collides).length, metaOnOwnLine: r.every((x) => x.metaBelow),
    run, cls: +cls.reduce((s, e) => s + e.v, 0).toFixed(4), shifts: cls,
  };
  console.log(width, JSON.stringify(report.widths[width], null, 1));
  await page.screenshot({ path: path.join(ROOT, `docs/gillenwebsite/about-index-${width}.png`) });
  await ctx.close();
}
await browser.close();
await fs.writeFile(path.join(ROOT, OUT), JSON.stringify(report, null, 2));
