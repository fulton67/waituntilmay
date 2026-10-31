// The Rolodex loops forever: wrap through 036 -> 001 both ways, frame-to-frame continuity across the seams, the
// hash picks the nearest copy, and the home page has no page scroll while About and discography still scroll.
//   node scripts/gillenwebsite/loop.mjs [base-url]   (default http://localhost:3217)
// Writes docs/gillenwebsite/loop-report.json.
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const BASE = (process.argv.slice(2).find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : "docs/gillenwebsite/loop-report.json";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const disco = JSON.parse(await fs.readFile(path.join(ROOT, "lib/gillenwebsite/discography.json"), "utf8"));
const R = disco.releases, N = R.length;
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"] });
const report = { base: BASE, at: new Date().toISOString(), N };

async function open(opts, hash = "") {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite${hash}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.firstCardTexture, null, { timeout: 120000 });
  await page.evaluate(() => { setInterval(() => dispatchEvent(new Event("touchstart")), 4000); });
  await wait(1500);
  return { ctx, page };
}
// wait until the drum is at rest on a whole card and the caption and counter have caught up
const rest = (page) => page.evaluate(() => new Promise((res) => {
  const t0 = performance.now();
  const f = () => {
    const r = window.__rolodex.rig, still = Math.abs(r.s - Math.round(r.s)) < 0.01 && Math.abs(r.v) < 0.01 && !r.fling && performance.now() - r.lastScroll > 300;
    const count = document.querySelector("[data-src='09'] span")?.textContent ?? "";
    const want = String(r.front + 1).padStart(3, "0");
    if ((still && count.startsWith(want)) || performance.now() - t0 > 6000) {
      const cap = [...document.querySelectorAll("[data-src='17'] [data-release]")].map((e) => e.getAttribute("data-release"));
      res({ s: +r.s.toFixed(4), front: r.front, counter: count, caption: cap[cap.length - 1], artist: document.querySelector("[data-src='17'] [class*=capArtist]")?.textContent, waitedMs: Math.round(performance.now() - t0) });
    } else requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
}));
// record rig.s, the front index and every card's rotation each frame until stopped
const record = (page) => page.evaluate(() => {
  window.__rec = { s: [], front: [], maxCardStep: 0, maxDs: 0 };
  let prev = null;
  const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const f = () => {
    const r = window.__rolodex.rig, rots = r.cards.map((c) => c.rotation.x);
    if (prev) {
      for (let i = 0; i < rots.length; i++) window.__rec.maxCardStep = Math.max(window.__rec.maxCardStep, Math.abs(wrapPi(rots[i] - prev.rots[i])));
      window.__rec.maxDs = Math.max(window.__rec.maxDs, Math.abs(r.s - prev.s));
    }
    const fr = window.__rec.front;
    if (fr[fr.length - 1] !== r.front) fr.push(r.front);
    window.__rec.s.push(r.s);
    prev = { s: r.s, rots };
    if (!window.__recStop) requestAnimationFrame(f);
  };
  window.__recStop = false;
  requestAnimationFrame(f);
});
const stopRec = (page) => page.evaluate(() => { window.__recStop = true; const x = window.__rec; return { frames: x.s.length, fronts: x.front, maxDsPerFrame: +x.maxDs.toFixed(4), maxCardRotStepRad: +x.maxCardStep.toFixed(4) }; });
// one card's angle: the largest angle between neighbouring slots at rest (the front card stands open)
const oneCardAngle = (page) => page.evaluate(() => {
  const r = window.__rolodex.rig, a = r.cards.map((c) => c.rotation.x), wrapPi = (x) => Math.atan2(Math.sin(x), Math.cos(x));
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(wrapPi(a[(i + 1) % a.length] - a[i])));
  return +m.toFixed(4);
});
async function stamped(cdp, from, dy, pxPerMs) {
  const n = Math.round(Math.abs(dy) / (pxPerMs * 8)), t0 = Date.now() / 1000;
  const ev = (type, i, y) => cdp.send("Input.dispatchTouchEvent", { type, timestamp: t0 + i * 0.008, touchPoints: type === "touchEnd" ? [] : [{ x: from.x, y }] });
  await ev("touchStart", 0, from.y);
  for (let i = 1; i <= n; i++) await ev("touchMove", i, from.y + (Math.sign(dy) * i * Math.abs(dy)) / n);
  await ev("touchEnd", n + 1, from.y + dy);
}

// ---------- desktop 1440 x 900 ----------
{
  const { ctx, page } = await open({ viewport: { width: 1440, height: 900 } });
  const d = (report.desktop = {});
  d.page = await page.evaluate(() => ({ scrollHeight: document.documentElement.scrollHeight, innerHeight, overflow: getComputedStyle(document.documentElement).overflow }));
  d.page.pass = d.page.scrollHeight === d.page.innerHeight;
  d.oneCardAngleRad = await oneCardAngle(page);

  // forward 50 cards from 034 with 50 mouse-wheel notches: 034 + 50 = 084 -> (33 + 50) mod 36 = 11 -> 012
  await page.evaluate(() => window.__rolodex.jumpTo(33));
  d.start = await rest(page);
  await page.mouse.move(700, 450);
  await record(page);
  for (let i = 0; i < 50; i++) { await page.mouse.wheel(0, 100); await wait(30); }
  const fwd = await rest(page);
  const rec = await stopRec(page);
  const want = (33 + 50) % N;
  d.forward50 = { ...fwd, expected: { index: want, counter: String(want + 1).padStart(3, "0"), id: R[want].id, artist: R[want].artist }, wrappedThrough: rec.fronts.includes(35) && rec.fronts.includes(0) && rec.fronts.indexOf(0) === rec.fronts.indexOf(35) + 1, frames: rec };
  d.forward50.pass = fwd.front === want && fwd.counter.startsWith(d.forward50.expected.counter) && fwd.caption === R[want].id && fwd.artist === R[want].artist && Math.abs(fwd.s - 83) < 0.01;

  // backward past 001 with held ArrowLeft, from 003: the next after 001 must be 036
  await page.evaluate(() => window.__rolodex.jumpTo(2));
  await rest(page);
  await record(page);
  await page.keyboard.down("ArrowLeft"); await wait(560); await page.keyboard.up("ArrowLeft");
  const back = await rest(page);
  const brec = await stopRec(page);
  d.backKeys = { ...back, fronts: brec.fronts, after001: brec.fronts[brec.fronts.indexOf(0) + 1], maxDsPerFrame: brec.maxDsPerFrame, maxCardRotStepRad: brec.maxCardRotStepRad };
  d.backKeys.pass = d.backKeys.after001 === N - 1 && back.counter.startsWith(String(back.front + 1).padStart(3, "0"));

  // the ring's own seam: s from 106 across 108 (slot 0 again) with wheel notches, then 0 across to -3
  for (const [from, k, key] of [[106, 4, "ringSeam"], [1, -4, "zeroSeam"]]) {
    await page.evaluate((x) => window.__rolodex.jumpTo(x), from);
    await rest(page);
    await record(page);
    for (let i = 0; i < Math.abs(k); i++) { await page.mouse.wheel(0, Math.sign(k) * 100); await wait(60); }
    const end = await rest(page);
    const r = await stopRec(page);
    d[key] = { from, to: end.s, front: end.front, counter: end.counter, ...r, landsOnWholeCard: Math.abs(end.s - Math.round(end.s)) < 0.01, noJump: r.maxDsPerFrame <= 1 && r.maxCardRotStepRad <= d.oneCardAngleRad };
  }

  // the hash brings a release up by its nearest copy: from 003, #<release 34> goes back 3 to s = -1, not on 31
  await page.evaluate(() => window.__rolodex.jumpTo(2));
  await rest(page);
  await page.evaluate((id) => { location.hash = id; }, R[N - 1].id);
  const h = await rest(page);
  d.hashNearest = { from: 2, release: N, ...h, pass: Math.abs(h.s + 1) < 0.01 && h.front === N - 1 };
  await ctx.close();
}

// ---------- fresh load with a hash, desktop ----------
{
  const { ctx, page } = await open({ viewport: { width: 1440, height: 900 } }, `#${R[N - 2].id}`);
  const h = await rest(page);
  report.hashOnLoad = { hash: R[N - 2].id, ...h, pass: Math.abs(h.s + 2) < 0.01 && h.front === N - 2 };
  await ctx.close();
}

// ---------- phone 390 x 844 ----------
{
  const { ctx, page } = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const m = (report.phone = {});
  m.page = await page.evaluate(() => ({ scrollHeight: document.documentElement.scrollHeight, innerHeight }));
  m.page.pass = m.page.scrollHeight === m.page.innerHeight;
  // a touch flick backwards on the cards from 001: the first card after 001 is 036
  const cdp = await ctx.newCDPSession(page);
  await page.evaluate(() => window.__rolodex.jumpTo(0));
  await rest(page);
  const p0 = await page.evaluate(() => window.__rolodex.frontPoint());
  await record(page);
  await stamped(cdp, { x: p0.x, y: p0.y - 40 }, 80, 0.8); // a drag down pulls the cards back (FLIP_DIR = +1)
  const end = await rest(page);
  const r = await stopRec(page);
  m.flickBack = { ...end, fronts: r.fronts, after001: r.fronts[r.fronts.indexOf(0) + 1], maxDsPerFrame: r.maxDsPerFrame, pass: r.fronts[r.fronts.indexOf(0) + 1] === N - 1 };
  // a caption swipe down from 001 goes to 036
  await page.evaluate(() => window.__rolodex.jumpTo(0));
  await rest(page);
  const cap = await page.evaluate(() => { const b = document.querySelector("[class*=capText]").getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [cap] });
  for (let i = 1; i <= 8; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cap.x, y: cap.y + i * 8 }] }); await wait(16); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const c = await rest(page);
  m.captionBack = { ...c, pass: c.front === N - 1 && c.caption === R[N - 1].id && c.counter.startsWith(String(N).padStart(3, "0")) };
  await ctx.close();
}

// ---------- the other pages still scroll ----------
report.otherPages = {};
for (const [route, vp] of [["about", { width: 390, height: 844 }], ["discography", { width: 390, height: 844 }], ["about", { width: 1440, height: 900 }], ["discography", { width: 1440, height: 900 }]]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite/${route}`, { waitUntil: "load" });
  await wait(1500);
  await page.mouse.move(vp.width / 2, vp.height / 2);
  await page.mouse.wheel(0, 400);
  await wait(800);
  report.otherPages[`${route}@${vp.width}`] = await page.evaluate(() => ({ scrollHeight: document.documentElement.scrollHeight, innerHeight, scrollY: Math.round(scrollY) }));
  await ctx.close();
}
// and after leaving home in the same tab (the home page's overflow lock must come off)
{
  const { ctx, page } = await open({ viewport: { width: 1440, height: 900 } });
  await page.click("nav a[href$='/about']");
  await page.waitForURL(/about/);
  await wait(2500);
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, 400);
  await wait(800);
  report.otherPages["about@1440 from home"] = await page.evaluate(() => ({ scrollHeight: document.documentElement.scrollHeight, innerHeight, scrollY: Math.round(scrollY), overflow: getComputedStyle(document.documentElement).overflow }));
  await ctx.close();
}
report.otherPagesPass = Object.values(report.otherPages).every((x) => x.scrollHeight > x.innerHeight && x.scrollY > 0);

await browser.close();
await fs.writeFile(path.join(ROOT, OUT), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
