// Are the covers and the card type sharp? On a 390 px phone at DPR 3 (CPU throttled 4x) and at 1440 x 900 DPR 2:
//  - the front card: its cover texture's width against the device pixels the cover plane covers, and the paper
//    canvas against the card's, as ratios (>= 1.0 passes)
//  - every DOM cover (the caption thumbnail, the cover beside the Rolodex, the release panel, the discography slices,
//    the expanded cover, the About thumbnail): the file the browser actually requested (from the network log) against
//    its rendered width x DPR (>= 1.0 passes)
//  - a crop of the front card's artist and release lines, at 3x (docs/gillenwebsite/sharp-title-<profile>.png)
//  - frames per second while a wheel notch every 300 ms turns the drum through all 36 cards (the big covers load as
//    each card settles): the lowest 1 s window and the worst frame (>= 55 desktop, >= 45 throttled phone)
//  - the covers that only exist below 1500 px (scripts/gillenwebsite/cover-sizes-report.json)
//   node scripts/gillenwebsite/sharpness.mjs [base-url] [--compare old-base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a) && argv[argv.indexOf(a) - 1] !== "--compare") || "http://localhost:3217").replace(/\/$/, "");
const COMPARE = argv.includes("--compare") ? argv[argv.indexOf("--compare") + 1].replace(/\/$/, "") : null;
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/sharpness-report.json";
const PROFILES = [
  { name: "phone", w: 390, h: 844, dpr: 3, mobile: true, throttle: 4, minFps: 45 },
  { name: "desktop", w: 1440, h: 900, dpr: 2, mobile: false, throttle: 1, minFps: 55 },
];
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"] });
const sizes = JSON.parse(await fs.readFile(path.join(import.meta.dirname, "cover-sizes-report.json"), "utf8"));
const report = { base: BASE, at: new Date().toISOString(), onlyBelow1500: sizes.onlySmall, profiles: {} };
const fileW = (u) => Number(/\/covers\/(\d+)\//.exec(u)?.[1] ?? 0);
const r2 = (x) => Math.round(x * 100) / 100;

async function open(p, url) {
  const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, isMobile: p.mobile, hasTouch: p.mobile });
  const page = await ctx.newPage();
  const requested = [];
  page.on("request", (q) => { if (q.url().includes("/covers/")) requested.push(new URL(q.url()).pathname); });
  const cdp = await ctx.newCDPSession(page);
  if (p.throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.throttle });
  await page.goto(url, { waitUntil: "load" });
  return { ctx, page, requested };
}
// a DOM cover: what it shows (currentSrc, which the network log must contain) against its rendered width x DPR
async function domCover(page, requested, sel, label, dpr) {
  const els = await page.$$eval(sel, (imgs) => imgs.filter((i) => { const b = i.getBoundingClientRect(), cs = getComputedStyle(i); return b.width > 0 && b.bottom > 0 && b.top < innerHeight && cs.visibility !== "hidden"; })
    .map((i) => ({ src: new URL(i.currentSrc).pathname, w: i.getBoundingClientRect().width, natural: i.naturalWidth })));
  return els.map((e) => ({ what: label, file: e.src, fileWidth: fileW(e.src), requested: requested.includes(e.src), renderedPx: r2(e.w), deviceNeed: Math.round(e.w * dpr), ratio: r2(fileW(e.src) / (e.w * dpr)) }));
}
const settle = (page) => page.waitForFunction(() => document.querySelectorAll("img").length && [...document.querySelectorAll("img")].every((i) => i.complete), null, { timeout: 30000 }).catch(() => null);

for (const p of PROFILES) {
  const out = (report.profiles[p.name] = { viewport: `${p.w}x${p.h} DPR ${p.dpr}`, cpuThrottle: p.throttle, dom: [] });

  // ---- home: the front card, the title crop, the caption thumbnail, the cover beside the Rolodex, the panel, fps
  {
    const { ctx, page, requested } = await open(p, `${BASE}/gillenwebsite`);
    await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.firstCardTexture, null, { timeout: 120000 });
    await page.waitForFunction(() => window.__rolodex.texels().bigLoaded.length >= 3, null, { timeout: 60000 }).catch(() => null);
    await page.waitForTimeout(2000);
    const t = await page.evaluate(() => window.__rolodex.texels());
    out.frontCard = { ...t, coverRatio: r2(t.coverTexturePx / t.coverScreenPx), paperRatio: r2(t.paperTexturePx / t.cardScreenPx) };
    out.frontCard.pass = out.frontCard.coverRatio >= 1 && out.frontCard.paperRatio >= 1;
    // the title crop, at 3x: the phone's screenshot is already 3 device px per CSS px; the desktop's 2 are scaled up 1.5x, nearest neighbour
    const rect = await page.evaluate(() => window.__rolodex.titleRect());
    const clip = { x: Math.max(0, rect.x - 8), y: Math.max(0, rect.y - 8), width: rect.w + 16, height: rect.h + 16 };
    const crop = async (pg, file) => {
      const png = await pg.screenshot({ clip });
      const img = sharp(png), m = await img.metadata();
      await img.resize({ width: Math.round((m.width * 3) / p.dpr), kernel: "nearest" }).toFile(path.join(ROOT, file));
    };
    out.titleCrop = { rectCss: Object.fromEntries(Object.entries(clip).map(([k, v]) => [k, Math.round(v)])), file: `docs/gillenwebsite/sharp-title-${p.name}.png` };
    await crop(page, out.titleCrop.file);
    out.dom.push(...(await domCover(page, requested, "[class*=capThumb] img", "caption thumbnail", p.dpr)));
    if (!p.mobile) out.dom.push(...(await domCover(page, requested, "[class*=viewInline] img", "cover beside the Rolodex", p.dpr)));

    // fps: a wheel notch (one card) every 300 ms, all the way round
    await page.mouse.move(p.w * 0.3, p.h * 0.5);
    await page.evaluate(() => { window.__frames = []; const tick = (t) => { window.__frames.push(t); if (window.__frames.length < 100000) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    const t0 = await page.evaluate(() => performance.now());
    for (let k = 0; k < 36; k++) { await page.mouse.wheel(0, 100); await page.waitForTimeout(300); }
    await page.waitForTimeout(600);
    const fr = await page.evaluate((s) => window.__frames.filter((x) => x >= s), t0);
    const gaps = fr.slice(1).map((x, k) => x - fr[k]);
    let minWin = Infinity;
    for (let a = 0; a < fr.length; a++) { let b = a; while (b < fr.length && fr[b] - fr[a] < 1000) b++; if (b >= fr.length) break; minWin = Math.min(minWin, b - a); }
    const front = await page.evaluate(() => window.__rolodex.rig.front);
    out.fps = { cards: 36, endedOn: front, frames: fr.length, avg: r2((gaps.length * 1000) / (fr.at(-1) - fr[0])), min1s: minWin, worstFrameMs: r2(Math.max(...gaps)), framesOver33ms: gaps.filter((g) => g > 33.4).length, target: p.minFps };
    out.fps.pass = out.fps.min1s >= p.minFps;
    out.bigCoversAfterSweep = (await page.evaluate(() => window.__rolodex.texels())).bigLoaded;

    // the release panel, from the caption thumbnail
    await page.click("[class*=capThumb]");
    await page.waitForTimeout(1500); await settle(page); await page.waitForTimeout(500);
    out.dom.push(...(await domCover(page, requested, "[class*=lightbox] [class*=coverBox] img", "release panel", p.dpr)));
    if (COMPARE) {
      const o = await open(p, `${COMPARE}/gillenwebsite`);
      await o.page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.firstCardTexture, null, { timeout: 120000 });
      await o.page.waitForTimeout(5000);
      out.titleCrop.before = `docs/gillenwebsite/sharp-title-${p.name}-before.png`;
      await crop(o.page, out.titleCrop.before);
      await o.ctx.close();
    }
    await ctx.close();
  }

  // ---- discography: the slices in view, then the first row expanded (the 3000 file)
  {
    const { ctx, page, requested } = await open(p, `${BASE}/gillenwebsite/discography`);
    await page.waitForTimeout(1500); await settle(page);
    out.dom.push(...(await domCover(page, requested, "[data-clip] img", "discography slice", p.dpr)));
    await page.click("li[data-id] a");
    await page.waitForTimeout(2500); await settle(page); await page.waitForTimeout(500);
    const exp = await domCover(page, requested, "[class*=discoActive] [data-clip] img", "expand panel", p.dpr);
    out.dom.push(...exp);
    // every cover expanded at this size: the largest file each has against the expanded width x DPR
    const need = (p.w < 720 ? p.w : Math.min(p.h, p.w - 360)) * p.dpr;
    out.expandAll = { deviceNeed: need, below1: sizes.rows.filter((x) => x.sizes).map((x) => ({ id: x.id, largest: x.sizes.at(-1), ratio: r2(x.sizes.at(-1) / need) })).filter((x) => x.ratio < 1) };
    await ctx.close();
  }

  // ---- About: the hover thumbnail (the 1024 file)
  {
    const { ctx, page, requested } = await open(p, `${BASE}/gillenwebsite/about`);
    await page.waitForTimeout(2000); await settle(page);
    out.dom.push(...(await domCover(page, requested, "[class*=indexCover] img", "About thumbnail", p.dpr)));
    await ctx.close();
  }

  // one line per kind: its lowest ratio
  const kinds = [...new Set(out.dom.map((d) => d.what))];
  out.domSummary = kinds.map((k) => {
    const all = out.dom.filter((d) => d.what === k), lo = all.reduce((a, b) => (b.ratio < a.ratio ? b : a));
    return { what: k, shown: all.length, lowest: `${lo.file} (${lo.fileWidth} px) for ${lo.renderedPx} css px x ${p.dpr} = ${lo.deviceNeed}: ${lo.ratio}`, allRequested: all.every((d) => d.requested), pass: all.every((d) => d.ratio >= 1 && d.requested) };
  });
  console.log(p.name, JSON.stringify({ frontCard: out.frontCard, fps: out.fps, dom: out.domSummary, expandAll: out.expandAll }, null, 1));
}
await browser.close();
await fs.writeFile(path.resolve(ROOT, OUT), JSON.stringify(report, null, 2) + "\n");
