// The About index: every entry on one line at 390, 430, 768 and 1440 px. Lists the lines that were scaled (and
// to what font-size), the ones ellipsised, and the layout shift from navigation start.
//   node scripts/gillenwebsite/about-fit.mjs [base-url] [--out file]   (default http://localhost:3217)
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/about-fit-report.json";
const browser = await chromium.launch({ channel: "chrome", headless: false });
const report = { base: BASE, at: new Date().toISOString(), widths: {} };

for (const width of [390, 430, 768, 1440]) {
  const phone = width < 720;
  const ctx = await browser.newContext({ viewport: { width, height: phone ? 844 : 900 }, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 3 : 1 });
  const page = await ctx.newPage();
  // every layout shift since navigation start
  await page.addInitScript(() => { window.__cls = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__cls.push({ v: e.value, t: Math.round(e.startTime), input: e.hadRecentInput }); }).observe({ type: "layout-shift", buffered: true }); });
  await page.goto(`${BASE}/gillenwebsite/about`, { waitUntil: "load" });
  await page.waitForSelector("[data-src='20'][data-fitted]");
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("a[data-entry]")];
    const lh = parseFloat(getComputedStyle(rows[0]).lineHeight), base = parseFloat(getComputedStyle(rows[0]).fontSize);
    const col = rows[0].clientWidth;
    const clips = (e) => { const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect().width > e.getBoundingClientRect().width + 0.01; };
    const lines = rows.map((a, i) => {
      const t = a.querySelector("[data-title]");
      const spans = [...a.children];
      return {
        n: i + 1, text: t.textContent, h: +a.getBoundingClientRect().height.toFixed(2),
        boxesPerSpan: Math.max(...spans.map((s) => s.getClientRects().length)),
        overColumn: a.scrollWidth > a.clientWidth + 0.5,
        fontPx: parseFloat(getComputedStyle(t).fontSize), ellipsis: clips(t), hoverTitle: a.title || null,
        titleShare: +(t.clientWidth / a.clientWidth).toFixed(2), roleEllipsis: (() => { const r = a.querySelector("[data-role]"); return clips(r) ? `${r.clientWidth}/${r.scrollWidth}px` : null; })(),
        metaPx: [...a.querySelectorAll("[class*=indexMeta], [class*=indexNo]")].map((s) => parseFloat(getComputedStyle(s).fontSize)),
        metaVisible: [...a.querySelectorAll("[class*=indexMeta]")].every((s) => { const b = s.getBoundingClientRect(), c = a.getBoundingClientRect(); return b.width > 0 && b.right <= c.right + 0.5; }),
      };
    });
    return { columnPx: col, basePx: base, lineHeightPx: lh, lines };
  });
  const cls = await page.evaluate(() => window.__cls);
  const multi = r.lines.filter((x) => x.h > r.lineHeightPx + 0.5 || x.boxesPerSpan > 1 || x.overColumn);
  report.widths[width] = {
    columnPx: r.columnPx, basePx: r.basePx, lineHeightPx: r.lineHeightPx, entries: r.lines.length,
    overOneLine: multi.map((x) => `${x.n} ${x.text} (${x.h}px)`),
    scaled: r.lines.filter((x) => x.fontPx < r.basePx).map((x) => `${String(x.n).padStart(3, "0")} ${x.text}: ${x.fontPx}px`),
    ellipsised: r.lines.filter((x) => x.ellipsis).map((x) => `${String(x.n).padStart(3, "0")} ${x.text} at ${x.fontPx}px, title shows ${Math.round(x.titleShare * 100)}% of the line${x.roleEllipsis ? `, role cut to ${x.roleEllipsis}` : ""}`),
    roleCut: r.lines.filter((x) => x.roleEllipsis).map((x) => `${String(x.n).padStart(3, "0")} ${x.text}: role cut to ${x.roleEllipsis}, title at ${x.fontPx}px${x.ellipsis ? " (ellipsised)" : " (whole)"}`),
    hoverTitles: r.lines.filter((x) => x.hoverTitle).map((x) => x.hoverTitle),
    belowFloor: r.lines.filter((x) => x.fontPx < 13).length,
    metaAlways12px: r.lines.every((x) => x.metaPx.every((p) => p === 12)), yearAndRoleVisible: r.lines.every((x) => x.metaVisible),
    cls: +cls.reduce((s, e) => s + e.v, 0).toFixed(4), shifts: cls,
  };
  const w = report.widths[width];
  // refit on resize: from this width to 390 and back, still one line each
  const check = () => page.evaluate(() => [...document.querySelectorAll("a[data-entry]")].filter((a) => a.getBoundingClientRect().height > parseFloat(getComputedStyle(a).lineHeight) + 0.5 || a.scrollWidth > a.clientWidth + 0.5 || [...a.children].some((c) => c.getClientRects().length > 1)).length);
  await page.setViewportSize({ width: width === 390 ? 1440 : 390, height: 844 }); await page.waitForTimeout(300);
  const afterResize = await check();
  await page.setViewportSize({ width, height: phone ? 844 : 900 }); await page.waitForTimeout(300);
  w.resize = { overOneLineAfterResize: afterResize, overOneLineAfterBack: await check() };
  await page.screenshot({ path: path.join(ROOT, `docs/gillenwebsite/about-fit-${width}.png`) });
  w.pass = w.resize.overOneLineAfterResize === 0 && w.resize.overOneLineAfterBack === 0 && w.overOneLine.length === 0 && w.belowFloor === 0 && w.metaAlways12px && w.yearAndRoleVisible && w.cls === 0 && r.lines.filter((x) => x.ellipsis || x.roleEllipsis).every((x) => x.hoverTitle?.startsWith(x.text));
  await ctx.close();
}
report.pass = Object.values(report.widths).every((w) => w.pass);
await browser.close();
await fs.writeFile(path.join(ROOT, OUT), JSON.stringify(report, null, 2) + "\n");
for (const [k, w] of Object.entries(report.widths)) console.log(k, JSON.stringify({ col: w.columnPx, base: w.basePx, over: w.overOneLine, scaled: w.scaled, ellipsised: w.ellipsised, cls: w.cls, pass: w.pass }, null, 1));
console.log("pass", report.pass);
