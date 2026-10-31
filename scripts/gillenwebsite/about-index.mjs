// The About index at 390 and 1440 px: every title at one computed font-size, no title box taller than one line,
// the titles that end in an ellipsis, the layout shift from navigation start, and the run of a cut title (hover on
// desktop, the active row on phones): its speed, its hold, and that it comes back to 0. Then the underline: one
// entry at a time at every scroll position, it moves when a phone scrolls 200 px, and the line drawn on screen (read
// from the pixels) is as wide as the title's text and sits above the year and role.
//   node scripts/gillenwebsite/about-index.mjs [base-url] [--out file]   (default http://localhost:3217)
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/about-index-report.json";
// headless: a headed window in the background can screenshot a frame from before the hover
const browser = await chromium.launch({ channel: "chrome" });
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
      lines: new Set([...(() => { const q = document.createRange(); q.selectNodeContents(t.querySelector("span")); return q.getClientRects(); })()].map((q) => Math.round(q.top))).size, ellipsis: rg.getBoundingClientRect().width > tb.width + 0.01,
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
  // the underline. On desktop the pointer leaves the list first, so the active row is the one at the middle.
  if (!phone) await page.mouse.move(width - 5, 5);
  // the cursor readout follows the pointer and would sit over the line it is reading
  await page.addStyleTag({ content: "[class*=cursorText] { visibility: hidden !important; }" });
  const underlined = () => page.evaluate(() => [...document.querySelectorAll("a[data-entry]")].flatMap((a, i) => getComputedStyle(a.querySelector("[data-title] span")).textDecorationLine.includes("underline") ? [i + 1] : []));
  // the longest dark run across the strip under the active title, in CSS px, and how far it sits under the text
  const drawn = async () => {
    const g = await page.evaluate(() => {
      const a = document.querySelector("a[data-entry][class*=indexOn]"), t = a.querySelector("[data-title]"), sp = t.querySelector("span");
      const rg = document.createRange(); rg.selectNodeContents(sp);
      const tr = rg.getBoundingClientRect(), tb = t.getBoundingClientRect(), mb = (() => { const q = document.createRange(); q.selectNodeContents(a.lastElementChild); return q.getBoundingClientRect(); })();
      return { n: [...a.parentNode.children].indexOf(a) + 1, x: Math.max(0, tb.left - 6), y: Math.round(tr.bottom - 10), w: Math.round(tb.width + 12), h: 14, textW: tr.width, boxW: tb.width, textLeft: tr.left, metaTop: mb.top, metaBeside: mb.left >= tb.right - 0.5, dpr: devicePixelRatio };
    });
    // two rendered frames first: the run is a main-thread animation, and a background window can hand back an old frame
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const shot = await page.screenshot({ clip: { x: g.x, y: g.y, width: g.w, height: g.h } }); if (process.env.STRIPS) await fs.writeFile(`${process.env.STRIPS}/strip-${width}-${g.n}.png`, shot);
    const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
    // below the baseline (the strip starts 10 px above the text box bottom; the baseline is a few px above that), the
    // pixel row with the most inked pixels is the underline. A 1 px line between device pixels draws as two grey rows,
    // so grey counts (a running title sits between pixels, so its line is light). It is spanned first to last inked pixel, bridging the gaps skip-ink leaves around descenders.
    const gap = 0.6 * parseFloat(await page.evaluate(() => getComputedStyle(document.querySelector("[data-title]")).fontSize)) * g.dpr;
    const dark = (x, y) => { const o = (y * info.width + x) * info.channels; return data[o] + data[o + 1] + data[o + 2] < 720; };
    let best = { len: 0, n: 0 };
    for (let y = Math.round(6 * g.dpr); y < info.height; y++) {
      let n = 0, segStart = -1, last = -1, span = { len: 0 };
      for (let x = 0; x < info.width; x++) {
        if (!dark(x, y)) continue;
        n++;
        if (segStart < 0 || x - last > gap) segStart = x;
        last = x;
        if (last - segStart + 1 > span.len) span = { len: last - segStart + 1, start: segStart };
      }
      if (n > best.n) best = { ...span, n, y };
    }
    const lineY = g.y + best.y / g.dpr;
    return { entry: g.n, lineWidthPx: +(best.len / g.dpr).toFixed(1), textWidthPx: +Math.min(g.textW, g.boxW).toFixed(1), columnPx: Math.round(g.boxW),
      lineLeftOffsetPx: +((g.x + best.start / g.dpr) - g.textLeft).toFixed(1), lineY: +lineY.toFixed(1), metaTop: +g.metaTop.toFixed(1), aboveYearRole: g.metaBeside || lineY < g.metaTop };
  };
  const steps = [];
  const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
  for (let y = 0; y <= total; y += 200) {
    await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(250);
    steps.push({ scrollY: y, underlined: await underlined(), line: await drawn() });
  }
  // desktop: the row under the pointer, for a few rows
  const hovers = [];
  if (!phone) for (const n of [1, 9, 20, 36]) {
    await page.evaluate((k) => document.querySelector(`a[data-entry]:nth-of-type(${k})`).scrollIntoView({ block: "center" }), n);
    // off the list first: a row scrolled to the same spot as the last one would not get a pointer move, so no :hover
    await page.mouse.move(width - 5, 5); await page.hover(`a[data-entry]:nth-of-type(${n})`); await page.waitForTimeout(200);
    hovers.push({ hovered: n, underlined: await underlined(), line: await drawn() });
  }
  const all = [...steps, ...hovers];
  const underline = {
    exactlyOneEverywhere: all.every((x) => x.underlined.length === 1), positions: all.length,
    movesEvery200px: phone ? steps.slice(1).every((x, i) => x.underlined[0] !== steps[i].underlined[0] || x.scrollY >= total - 200) : null,
    followsPointer: phone ? null : hovers.every((x) => x.underlined[0] === x.hovered),
    widthMatchesText: all.every((x) => Math.abs(x.line.lineWidthPx - x.line.textWidthPx) <= 1.5),
    aboveYearRole: all.every((x) => x.line.aboveYearRole),
    steps: all.map((x) => `${x.hovered ? "hover " + x.hovered : "y " + x.scrollY}: entry ${x.underlined.join(",")}, line ${x.line.lineWidthPx}px vs text ${x.line.textWidthPx}px (column ${x.line.columnPx}px)`),
  };
  const cls = await page.evaluate(() => window.__cls);
  report.widths[width] = {
    underline,
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
