// How the Rolodex drives: scroll per card, drag per card, flick carry, drag lag, detent, wheel notch, held arrow keys.
//   node scripts/gillenwebsite/feel.mjs [base-url]   (default http://localhost:3217)
// Writes docs/gillenwebsite/feel-report.json.
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const BASE = (process.argv.slice(2).find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const r2 = (x) => Math.round(x * 100) / 100;
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"] });
const report = { base: BASE, at: new Date().toISOString() };

async function open(ctxOpts) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.firstCardTexture, null, { timeout: 120000 });
  await page.evaluate(() => { setInterval(() => dispatchEvent(new Event("touchstart")), 4000); });
  await wait(2500);
  return { ctx, page };
}
const S = (page) => page.evaluate(() => window.__rolodex.rig.s);
const home = async (page, k = 0) => { await page.evaluate((k) => { window.__rolodex.rig.fling = null; scrollTo({ top: document.getElementById("flip").offsetTop + k * window.__rolodex.per(), behavior: "instant" }); }, k); await wait(700); };
// time from now until rig.s stays within 0.01 of an integer, sampled every frame in the page
const settle = (page) => page.evaluate(() => new Promise((res) => {
  const t0 = performance.now(); let last = t0, coast = null, v0 = window.__rolodex.rig.fling;
  const f = () => {
    const s = window.__rolodex.rig.s, now = performance.now();
    if (window.__rolodex.rig.fling !== null) coast = now;
    if (Math.abs(s - Math.round(s)) >= 0.01 || window.__rolodex.rig.fling !== null) last = now;
    if (now - t0 > 3000 || now - last > 500) res({ ms: Math.round(last - t0), ...(coast !== null && { flingCardsPerS: v0 === null ? null : +(v0.v0 * v0.dir).toFixed(1), aimedAt: v0?.to, coastMs: Math.round(coast - t0), detentMsAfterCoast: Math.round(last - coast) }), s: window.__rolodex.rig.s }); else requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
}));
const hitRect = (page) => page.evaluate(() => { const b = window.__rolodex.rig.hit.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
// a pointer drag paced by the clock: the position is a function of elapsed time, so the velocity is what we ask for
async function paced(move, from, dy, pxPerMs) {
  const ms = Math.abs(dy) / pxPerMs, t0 = performance.now();
  for (;;) {
    const t = Math.min(ms, performance.now() - t0);
    await move(from.x, from.y + Math.sign(dy) * t * pxPerMs);
    if (t >= ms) break;
    const next = t0 + Math.min(ms, t + 8);
    while (performance.now() < next) await new Promise((r) => setImmediate(r));
  }
}

// an exact-velocity flick: CDP events stamped 8 ms apart, so the page sees exactly pxPerMs whatever the CDP latency
async function stamped(cdp, kind, from, dy, pxPerMs) {
  const n = Math.round(Math.abs(dy) / (pxPerMs * 8)), t0 = Date.now() / 1000;
  const ev = (type, i, y) => kind === "touch"
    ? cdp.send("Input.dispatchTouchEvent", { type, timestamp: t0 + i * 0.008, touchPoints: type === "touchEnd" ? [] : [{ x: from.x, y }] })
    : cdp.send("Input.dispatchMouseEvent", { type, timestamp: t0 + i * 0.008, x: from.x, y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1 });
  await ev(kind === "touch" ? "touchStart" : "mousePressed", 0, from.y);
  for (let i = 1; i <= n; i++) await ev(kind === "touch" ? "touchMove" : "mouseMoved", i, from.y + (Math.sign(dy) * i * Math.abs(dy)) / n);
  await ev(kind === "touch" ? "touchEnd" : "mouseReleased", n + 1, from.y + dy);
}
const seen = (page) => page.evaluate(() => { window.__pm = []; addEventListener("pointermove", (e) => window.__pm.push([e.timeStamp, e.clientY]), true); });
const seenV = (page) => page.evaluate(() => { const p = window.__pm, n = p.length, a = p.find((q) => q[0] >= p[n - 1][0] - 80); return { moves: n, pxPerMsLast80: +Math.abs((p[n - 1][1] - a[1]) / (p[n - 1][0] - a[0])).toFixed(2) }; });

// ---------- desktop 1440 x 900 ----------
{
  const { ctx, page } = await open({ viewport: { width: 1440, height: 900 } });
  const d = (report.desktop = {});
  const dcdp = await ctx.newCDPSession(page);
  d.scrollPxPerCard = await page.evaluate(() => window.__rolodex.per());
  await home(page, 5);
  const p0 = await page.evaluate(() => window.__rolodex.frontPoint());
  d.frontPoint = { x: Math.round(p0.x), y: Math.round(p0.y) };
  // drag px per card: drag 3 x 36 px slowly, read rig.s while the button is still down
  await page.mouse.move(p0.x, p0.y);
  await page.mouse.down();
  const s0 = await S(page);
  await page.evaluate(() => { window.__rolodex.rig.lag.length = 0; });
  await paced((x, y) => page.mouse.move(x, y), p0, 108, 0.15);
  await wait(120);
  const s1 = await S(page);
  d.lag = await page.evaluate(() => { const l = [...window.__rolodex.rig.lag].sort((a, b) => a - b); return { samples: l.length, medianMs: +l[l.length >> 1].toFixed(2), p95Ms: +l[Math.floor(l.length * 0.95)].toFixed(2), maxMs: +l[l.length - 1].toFixed(2) }; });
  await page.mouse.up();
  d.drag = { px: 108, cards: r2(Math.abs(s1 - s0)), dragPxPerCard: r2(108 / Math.abs(s1 - s0)) };
  await wait(800);
  // detent: release half a card off (18 px past the 3-card mark, held still so there is no flick)
  await home(page, 5);
  await page.mouse.move(p0.x, p0.y); await page.mouse.down();
  await paced((x, y) => page.mouse.move(x, y), p0, 90, 0.15);
  await wait(150);
  const atRelease = await S(page);
  await page.mouse.up();
  d.detentHalfCard = { releasedAt: r2(atRelease), ...(await settle(page)) };
  // flicks at 1.5, 0.6 and 0.45 px/ms over 120 px
  d.flicks = [];
  for (const v of [1.5, 2.5, 0.6, 0.45]) {
    await home(page, v >= 1.5 ? 2 : 5);
    const a = await S(page);
    await seen(page);
    await stamped(dcdp, "mouse", p0, -120, v);
    const st = await settle(page);
    const b = await S(page);
    d.flicks.push({ pxPerMs: v, pageSaw: await seenV(page), dragCards: r2(120 / 36), carriedCards: r2(Math.abs(b - a) - 120 / 36), totalCards: Math.round(Math.abs(b - a)), landsOnInteger: Math.abs(b - Math.round(b)) < 0.01, settleMsAfterRelease: st.ms, ...st });
  }
  // a tap while it spins stops it on the nearest card
  await home(page, 2);
  await stamped(dcdp, "mouse", p0, -120, 1.5);
  await wait(150);
  const spinning = await page.evaluate(() => ({ s: window.__rolodex.rig.s, fling: window.__rolodex.rig.fling }));
  await page.mouse.down(); await page.mouse.up();
  const stop = await settle(page);
  d.tapStop = { at: r2(spinning.s), wasSpinning: spinning.fling !== null, stoppedOn: r2(stop.s), nearest: Math.round(spinning.s), ...stop, panelOpened: await page.evaluate(() => !!document.querySelector("[role=dialog]")) };
  // wheel: one notch (deltaY 100) = one card; trackpad-like small deltas scroll per()
  await home(page, 5);
  await page.mouse.move(p0.x, p0.y);
  const w0 = await S(page);
  await page.mouse.wheel(0, 100); await wait(500);
  const w1 = await S(page);
  await page.mouse.wheel(0, 100); await page.mouse.wheel(0, 100); await wait(500);
  const w2 = await S(page);
  const steps = Math.round(d.scrollPxPerCard / 4.5);
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, 4.5); await wait(10); }
  await wait(900);
  const w3 = await S(page);
  d.wheel = { oneNotchCards: r2(w1 - w0), threeNotchesCards: r2(w2 - w0), trackpadPx: r2(steps * 4.5), trackpadCards: r2(w3 - w2) };
  // keys: tap -> one card; hold 1 s -> 1 + 8 cards
  await home(page, 2);
  const k0 = await S(page);
  await page.keyboard.press("ArrowRight"); await wait(500);
  const k1 = await S(page);
  const t0 = Date.now();
  await page.keyboard.down("ArrowRight"); await wait(1000); await page.keyboard.up("ArrowRight");
  const held = Date.now() - t0;
  await wait(500);
  const k2 = await S(page);
  d.keys = { tapCards: r2(k1 - k0), heldMs: held, heldCards: r2(k2 - k1), cardsPerSecond: r2((k2 - k1 - 1) / ((held - 0) / 1000)) };
  await ctx.close();
}

// ---------- phone 390 x 844, touch ----------
{
  const { ctx, page } = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const m = (report.phone = {});
  m.scrollPxPerCard = await page.evaluate(() => window.__rolodex.per());
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  await page.evaluate(() => { window.__cancel = 0; addEventListener("pointercancel", () => window.__cancel++, true); });
  await home(page, 5);
  const hr = await hitRect(page);
  m.hitArea = { x: Math.round(hr.x), y: Math.round(hr.y), w: Math.round(hr.w), h: Math.round(hr.h), touchAction: await page.evaluate(() => getComputedStyle(window.__rolodex.rig.hit).touchAction) };
  const p0 = await page.evaluate(() => window.__rolodex.frontPoint());
  // drag on the cards: 108 px -> 3 cards, no pointercancel (the page did not take the gesture)
  const s0 = await S(page);
  await touch("touchStart", p0.x, p0.y);
  await paced((x, y) => touch("touchMove", x, y), p0, 108, 0.15);
  await wait(120);
  const s1 = await S(page);
  await touch("touchEnd");
  await wait(600);
  m.drag = { px: 108, cards: r2(Math.abs(s1 - s0)), dragPxPerCard: r2(108 / Math.abs(s1 - s0)), pointercancel: await page.evaluate(() => window.__cancel) };
  // flick 1.5 px/ms on touch
  await home(page, 2);
  const a = await S(page);
  await seen(page);
  await stamped(cdp, "touch", { x: p0.x, y: p0.y + 60 }, -120, 1.5);
  const st = await settle(page);
  const b = await S(page);
  m.flickSeen = await seenV(page);
  m.flick = { pxPerMs: 1.5, carriedCards: r2(Math.abs(b - a) - 120 / 36), totalCards: Math.round(Math.abs(b - a)), landsOnInteger: Math.abs(b - Math.round(b)) < 0.01, settleMsAfterRelease: st.ms, ...st };
  // outside the cards' hit area (the stage below it) a vertical drag still scrolls the page
  await home(page, 5);
  const below = { x: 20, y: Math.min(hr.y + hr.h + 20, 844 - 200) };
  const inHit = below.y >= hr.y && below.y <= hr.y + hr.h && below.x >= hr.x && below.x <= hr.x + hr.w;
  const y0 = await page.evaluate(() => scrollY);
  await touch("touchStart", below.x, below.y);
  for (let i = 1; i <= 10; i++) { await touch("touchMove", below.x, below.y - i * 10); await wait(16); }
  await touch("touchEnd");
  await wait(800);
  m.outsideScroll = { at: below, insideHitArea: inHit, pageScrolledPx: Math.round((await page.evaluate(() => scrollY)) - y0) };
  await ctx.close();
}

await browser.close();
await fs.writeFile(path.join(ROOT, "docs/gillenwebsite/feel-report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
