// The discography's role pills on phones (site.module.css .disco > .pills, Discography.tsx): an even grid between the
// 20 px gutters, 3 equal columns (2 where a label would not fit), 8 px gaps, every pill 36 px high with its text centred
// on one line, ALL a row of its own when the count is odd. Per width: the columns, each pill's box, whether its text
// fits, the gutters and gaps; and at 1440 the desktop pills as they were (inline, 31 px).
//   node scripts/gillenwebsite/pillgrid.mjs [base-url] [--out file]
import { chromium } from "playwright";
import fs from "node:fs/promises";
const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : null;
const WIDTHS = [320, 360, 375, 390, 414, 430, 600, 719];
const b = await chromium.launch({ channel: "chrome" });
const report = { base: BASE, at: new Date().toISOString(), phones: {}, desktop: null };
const read = (page) => page.evaluate(() => {
  const box = document.querySelector("[role=radiogroup][aria-label=Role]"), r = (e) => e.getBoundingClientRect();
  const pills = [...box.querySelectorAll("button")].map((e) => {
    const q = r(e), t = document.createRange(); t.selectNodeContents(e); const tr = t.getBoundingClientRect();
    return { label: e.textContent.replace(/\s+/g, " ").trim(), x: +q.left.toFixed(2), y: +q.top.toFixed(2), w: +q.width.toFixed(2), h: +q.height.toFixed(2),
      fits: e.scrollWidth <= e.clientWidth + 0.5, lines: Math.round(tr.height / parseFloat(getComputedStyle(e).lineHeight || "12")),
      textOffX: +((tr.left + tr.width / 2) - (q.left + q.width / 2)).toFixed(2), textOffY: +((tr.top + tr.height / 2) - (q.top + q.height / 2)).toFixed(2),
      padding: getComputedStyle(e).padding, radius: getComputedStyle(e).borderRadius, border: getComputedStyle(e).borderWidth, size: getComputedStyle(e).fontSize };
  });
  return { cols: box.dataset.cols ?? null, display: getComputedStyle(box).display, W: innerWidth, pills };
});
for (const w of WIDTHS) {
  const page = await (await b.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })).newPage();
  await page.goto(`${BASE}/gillenwebsite/discography`); await page.waitForSelector("[role=radiogroup] button"); await page.waitForTimeout(800);
  const d = await read(page), [all, ...roles] = d.pills, n = +d.cols;
  const rows = [...new Set(roles.map((p) => p.y))];
  const left = Math.min(...d.pills.map((p) => p.x)), right = Math.max(...d.pills.map((p) => p.x + p.w));
  const xs = [...new Set(roles.map((p) => p.x))].sort((a, c) => a - c);
  const res = { cols: n, gutters: [+left.toFixed(2), +(d.W - right).toFixed(2)], roleWidths: [...new Set(roles.map((p) => p.w))], heights: [...new Set(d.pills.map((p) => p.h))],
    colGap: xs.length > 1 ? +(xs[1] - (xs[0] + roles[0].w)).toFixed(2) : null, rowGap: rows.length > 1 ? +(rows[1] - (rows[0] + 36)).toFixed(2) : null,
    allRow: { own: !roles.some((p) => p.y === all.y), w: all.w }, rowsFull: roles.length % n === 0 && rows.length === roles.length / n,
    allFit: d.pills.every((p) => p.fits && p.lines === 1), maxTextOff: Math.max(...d.pills.map((p) => Math.max(Math.abs(p.textOffX), Math.abs(p.textOffY)))),
    style: [...new Set(d.pills.map((p) => `${p.padding} | ${p.radius} | ${p.border} | ${p.size}`))] };
  // would 3 columns have fitted? (the widest label against a third of the row)
  res.pass = d.display === "grid" && Math.abs(res.gutters[0] - 20) < 0.6 && Math.abs(res.gutters[1] - 20) < 0.6 && res.roleWidths.length === 1 && res.heights.length === 1 && res.heights[0] === 36
    && Math.abs(res.colGap - 8) < 0.6 && (res.rowGap === null || Math.abs(res.rowGap - 8) < 0.6) && res.allRow.own && Math.abs(res.allRow.w - (d.W - 40)) < 0.6 && res.rowsFull && res.allFit && res.maxTextOff <= 1 && res.style.length === 1;
  report.phones[w] = res;
  console.log(w, JSON.stringify(res));
}
{
  const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(`${BASE}/gillenwebsite/discography`); await page.waitForSelector("[role=radiogroup] button"); await page.waitForTimeout(800);
  const d = await read(page);
  report.desktop = { display: d.display, cols: d.cols, heights: [...new Set(d.pills.map((p) => p.h))], widths: d.pills.map((p) => p.w), y: [...new Set(d.pills.map((p) => p.y))], x: d.pills.map((p) => p.x) };
  console.log(1440, JSON.stringify(report.desktop));
}
report.pass = Object.values(report.phones).every((r) => r.pass) && report.desktop.display === "flex" && report.desktop.cols === null;
console.log("pass", report.pass);
if (OUT) await fs.writeFile(OUT, JSON.stringify(report, null, 2));
await b.close();
