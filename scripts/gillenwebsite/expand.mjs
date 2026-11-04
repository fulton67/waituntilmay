// The discography's covers expanding in place (expand.ts), measured in headed Chrome:
//  desktop 1440 x 900 DPR 2, a mouse:
//   - hover in and out: the motion (from the animation's actual start on the timeline to its end) against 180 ms in
//     and 220 ms out (+-20); also the start latency and the time from the call to the end, and the animations' own
//     durations; every animated property is transform or opacity
//   - moving down the list row by row: every frame, the largest cover on screen; it must never fall back to the
//     slice between two rows (no gap)
//   - the open cover is 60% of the viewport high
//  phone 390 x 844 DPR 3, touch:
//   - 24 scroll positions (touch drags): after each, exactly one row is expanded, and it is the row nearest the
//     middle of the screen; while the finger is still down mid-drag, the expanded row does not change
//   - a tap opens the record view
//  both: CLS over everything (layout-shift entries) = 0
//   node scripts/gillenwebsite/expand.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/expand-report.json";
const TOL = 20;
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"] });
const report = { base: BASE, at: new Date().toISOString() };
const cls = (page) => page.evaluate(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); });

// ---------- desktop ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite/discography`);
  await page.waitForFunction(() => window.__disco, null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  await cls(page);
  const out = {};
  const rowPt = (k) => page.evaluate((k) => { const r = document.querySelectorAll("li[data-id] [data-clip]")[k].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, k);
  // hover in, then out (the pointer goes to the empty right column)
  const times = [];
  for (const k of [2, 6, 10]) {
    const p = await rowPt(k);
    await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(500);
    const anims = await page.evaluate(() => [...document.querySelectorAll("[data-exp-layers] *")].flatMap((e) => e.getAnimations().map((a) => ({ ms: a.effect.getTiming().duration, props: [...new Set(a.effect.getKeyframes().flatMap((f) => Object.keys(f).filter((x) => !["offset", "easing", "composite", "computedOffset"].includes(x))))] }))));
    const size = await page.evaluate(() => { const l = document.querySelector("[data-exp-layers] > div"); return l ? l.getBoundingClientRect().height : 0; });
    await page.mouse.move(1430, 450);
    await page.waitForTimeout(500);
    times.push({ row: k, animsIn: anims, openHeight: size });
  }
  const log = await page.evaluate(() => window.__disco.log());
  const ins = log.filter((x) => x.dir === "in"), outs = log.filter((x) => x.dir === "out");
  // motionMs: the drawn motion, frame to frame; inputToEndMs: from the pointer event to the animation's end, which
  // adds the frames a compositor animation takes to start
  out.hover = { motionMs: { in: ins.map((x) => x.motionMs), out: outs.map((x) => x.motionMs) }, inputToEndMs: { in: ins.map((x) => x.ms), out: outs.map((x) => x.ms) }, startLatencyMs: [...ins, ...outs].map((x) => x.latencyMs), animationDurations: [...new Set(times.flatMap((t) => t.animsIn.map((a) => Math.round(a.ms))))], props: [...new Set(times.flatMap((t) => t.animsIn.flatMap((a) => a.props)))], openHeightPx: times.map((t) => Math.round(t.openHeight)), target: { in: 180, out: 220, height: 540 } };
  out.hover.pass = ins.length >= 3 && outs.length >= 3 && ins.every((m) => Math.abs(m.motionMs - 180) <= TOL) && outs.every((m) => Math.abs(m.motionMs - 220) <= TOL) && out.hover.props.every((p) => p === "transform" || p === "opacity") && times.every((t) => Math.abs(t.openHeight - 540) <= 1);
  // row by row down the list: the largest cover every frame
  const p0 = await rowPt(4);
  await page.mouse.move(p0.x, p0.y);
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.__big = []; window.__stopBig = false; const tick = () => { let m = 0; for (const e of document.querySelectorAll("[data-exp-layers] > div")) m = Math.max(m, e.getBoundingClientRect().height); window.__big.push(m); if (!window.__stopBig) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  for (let k = 5; k <= 14; k++) { const p = await rowPt(k); await page.mouse.move(p.x, p.y, { steps: 3 }); await page.waitForTimeout(90); }
  await page.waitForTimeout(300);
  const big = await page.evaluate(() => { window.__stopBig = true; return window.__big; });
  out.crossfade = { frames: big.length, smallestLargestCoverPx: Math.round(Math.min(...big)), sliceHeightPx: 20 };
  // no gap: between two rows the largest cover never falls back toward the slice (it stays over 3/4 of the open size)
  out.crossfade.pass = Math.min(...big) > 405;
  await page.mouse.move(1430, 450);
  await page.waitForTimeout(400);
  out.cls = await page.evaluate(() => window.__cls);
  await page.screenshot({ path: "docs/gillenwebsite/expand-1440.png" });
  report.desktop = out;
  console.log("desktop", JSON.stringify(out));
  await ctx.close();
}

// ---------- phone ----------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite/discography`);
  await page.waitForFunction(() => window.__disco, null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  await cls(page);
  const cdp = await ctx.newCDPSession(page);
  const state = () => page.evaluate(() => {
    const active = window.__disco.active();
    let best = null, bd = Infinity;
    for (const li of document.querySelectorAll("li[data-id]")) { const r = li.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - innerHeight / 2); if (d < bd) { bd = d; best = li.dataset.id; } }
    return { open: window.__disco.open(), active, nearest: best, scrollY };
  });
  const drag = async (dy, release = true) => {
    const x = 195, y0 = 600;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y0 }] });
    for (let k = 1; k <= 8; k++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y0 - (dy * k) / 8 }] }); await page.waitForTimeout(16); }
    if (release) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  const positions = [];
  for (let k = 0; k < 24; k++) {
    await drag(k < 16 ? 37 + (k % 3) * 11 : -61);
    await page.waitForTimeout(600);
    positions.push(await state());
  }
  // a drag held down: the expanded row must not change while the finger is on the glass
  const before = await state();
  await drag(90, false);
  await page.waitForTimeout(300);
  const during = await state();
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(600);
  const after = await state();
  const out = {
    positions: positions.map((s) => ({ scrollY: s.scrollY, open: s.open, active: s.active, nearest: s.nearest })),
    exactlyOneEverywhere: positions.every((s) => s.open === 1),
    activeIsNearest: positions.every((s) => s.active === s.nearest),
    fingerDown: { before: before.active, during: during.active, after: after.active, scrolled: during.scrollY !== before.scrollY },
  };
  out.fingerDown.pass = out.fingerDown.before === out.fingerDown.during && out.fingerDown.scrolled;
  out.pass = out.exactlyOneEverywhere && out.activeIsNearest && out.fingerDown.pass;
  out.cls = await page.evaluate(() => window.__cls);
  await page.screenshot({ path: "docs/gillenwebsite/expand-390.png" });
  // a tap opens the record view
  const p = await page.evaluate(() => { const r = document.querySelector(`li[data-id="${window.__disco.active()}"] a`).getBoundingClientRect(); return { x: r.left + 40, y: r.top + r.height / 2 }; });
  await page.touchscreen.tap(p.x, p.y);
  await page.waitForTimeout(900);
  out.tapOpens = await page.evaluate(() => window.__vinyl?.state());
  report.phone = out;
  console.log("phone", JSON.stringify({ exactlyOne: out.exactlyOneEverywhere, activeIsNearest: out.activeIsNearest, fingerDown: out.fingerDown, cls: out.cls, tap: out.tapOpens }));
  await ctx.close();
}
report.clsPass = report.desktop.cls === 0 && report.phone.cls === 0;
await browser.close();
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
