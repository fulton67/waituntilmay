// The record view (VinylView.tsx), measured in headed Chrome: 1440 x 900 DPR 2, and 390 x 844 DPR 3 with a 4x CPU
// throttle. On each profile:
//  - transition: the front sleeve clicked three times (open, then Escape); each opening and closing's duration and
//    fps from the view's own frame log (every rAF it drew); targets 450 ms (+-20), fps >= 55 desktop, >= 45 phone
//  - the ring's sleeve is hidden while the view is open and drawn again after it closes (rig.lifted)
//  - texels: front, back and label textures against their faces' device pixels (>= 1)
//  - type: computed font sizes in the open view (artist 48/32, release 24/20, the rest 16/15) and that every element
//    in it has one family and weight 400
//  - spin: the record turns at 33 1/3 rpm (measured over 1 s); drag turns the whole record; with
//    prefers-reduced-motion the record does not spin
//  - discography: a row click opens the view from the row's cover
//   node scripts/gillenwebsite/vinyl.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/vinyl-report.json";
const PROFILES = [
  { name: "desktop", w: 1440, h: 900, dpr: 2, mobile: false, throttle: 1, fpsMin: 55, sizes: { artist: 48, release: 24, small: 16 } },
  { name: "phone", w: 390, h: 844, dpr: 3, mobile: true, throttle: 4, fpsMin: 45, sizes: { artist: 32, release: 20, small: 15 } },
];
const TOL = 20;
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"] });
const report = { base: BASE, at: new Date().toISOString(), profiles: {} };
const ready = (page) => page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.allSmall && window.__vinyl, null, { timeout: 120000 });
const state = (page) => page.evaluate(() => window.__vinyl.state());
const until = async (page, s, ms = 6000) => { const t = Date.now(); while (Date.now() - t < ms) { if ((await state(page)) === s) return true; await page.waitForTimeout(30); } return false; };

for (const p of PROFILES) {
  const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, isMobile: p.mobile, hasTouch: p.mobile });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite`);
  await ready(page);
  await page.waitForTimeout(4000); // the view's engine builds while the page is idle
  const out = { viewport: `${p.w}x${p.h}@${p.dpr}`, throttle: p.throttle };
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x, y) => (p.mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));

  // transitions, three times round, throttled
  if (p.throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.throttle });
  out.lifted = [];
  for (let k = 0; k < 3; k++) {
    const pt = await page.evaluate(() => window.__rolodex.frontPoint());
    await tap(pt.x, pt.y);
    await until(page, "open");
    await page.waitForTimeout(400);
    out.lifted.push(await page.evaluate(() => window.__rolodex.rig.lifted));
    await page.keyboard.press("Escape");
    await until(page, "closed");
    await page.waitForTimeout(300);
    out.lifted.push(await page.evaluate(() => window.__rolodex.rig.lifted));
    if (k < 2) { await page.mouse.move(p.w * 0.3, p.h * 0.5); await page.mouse.wheel(0, 100); await page.waitForTimeout(1200); }
  }
  if (p.throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const log = await page.evaluate(() => window.__vinyl.log());
  out.transitions = log;
  const opens = log.filter((x) => x.dir === "opening"), closes = log.filter((x) => x.dir === "closing");
  out.transition = {
    openMs: opens.map((x) => x.ms), closeMs: closes.map((x) => x.ms), minFps: Math.min(...log.map((x) => x.fps)), worstFrameMs: Math.max(...log.map((x) => x.worstMs)),
  };
  out.transition.pass = log.every((x) => Math.abs(x.ms - 450) <= TOL) && out.transition.minFps >= p.fpsMin;
  // while open the ring's slot is lifted; after closing it is back (-1)
  out.liftedPass = out.lifted.every((v, k) => (k % 2 === 0 ? v >= 0 : v === -1));

  // open once more for the rest
  const pt = await page.evaluate(() => window.__rolodex.frontPoint());
  await tap(pt.x, pt.y);
  await until(page, "open");
  await page.waitForTimeout(1500); // the panel covers upgrade to the files their faces need
  const tx = await page.evaluate(() => window.__vinyl.texels());
  out.texels = Object.fromEntries(["front", "back", "label"].map((k) => [k, { texturePx: tx[k].texturePx, screenPx: +tx[k].screenPx.toFixed(1), ratio: +(tx[k].texturePx / tx[k].screenPx).toFixed(2) }]));
  out.texels.pass = ["front", "back", "label"].every((k) => out.texels[k].ratio >= 1);

  out.type = await page.evaluate(() => {
    const info = document.querySelector("[class*=vvInfo]"), px = (sel) => parseFloat(getComputedStyle(info.querySelector(sel)).fontSize);
    const all = [...info.querySelectorAll("*")].filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    return {
      artist: px("[class*=vvArtist]"), release: px("[class*=vvRelease]"), small: px("[class*=vvSmall]"), track: px("[class*=vvTrack]"),
      families: [...new Set(all.map((e) => getComputedStyle(e).fontFamily))], weights: [...new Set(all.map((e) => getComputedStyle(e).fontWeight))],
    };
  });
  out.type.pass = out.type.artist === p.sizes.artist && out.type.release === p.sizes.release && out.type.small === p.sizes.small && out.type.track === p.sizes.small && out.type.families.length === 1 && out.type.weights.join() === "400";

  // spin: radians in one second against 33 1/3 rpm (3.49 rad/s)
  const spin = await page.evaluate(async () => {
    const disc = () => window.__vinyl.discAngle();
    const a = disc(), t = performance.now();
    await new Promise((r) => setTimeout(r, 1000));
    return Math.abs(disc() - a) / ((performance.now() - t) / 1000);
  });
  out.spin = { radPerS: +spin.toFixed(3), target: +((100 / 3) * 2 * Math.PI / 60).toFixed(3) };
  out.spin.pass = Math.abs(out.spin.radPerS - out.spin.target) < 0.1;
  // drag turns the whole record
  const yaw0 = await page.evaluate(() => window.__vinyl.yaw());
  const R = p.w >= 720 ? { x: (p.w - 420) / 2, y: p.h / 2 } : { x: p.w / 2, y: 44 + p.w * 0.31 };
  if (p.mobile) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: R.x, y: R.y }] });
    for (let k = 1; k <= 10; k++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: R.x + k * 8, y: R.y }] }); await page.waitForTimeout(16); }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await page.mouse.move(R.x, R.y); await page.mouse.down(); await page.mouse.move(R.x + 80, R.y, { steps: 10 }); await page.mouse.up();
  }
  out.drag = { yawBefore: yaw0, yawAfter: +(await page.evaluate(() => window.__vinyl.yaw())).toFixed(3) };
  out.drag.pass = Math.abs(out.drag.yawAfter - out.drag.yawBefore) > 0.3;
  await page.screenshot({ path: `docs/gillenwebsite/vinyl-${p.w}.png` });
  await page.keyboard.press("Escape");
  await until(page, "closed");

  // discography: a row opens the view from its cover
  await page.goto(`${BASE}/gillenwebsite/discography`);
  await page.waitForFunction(() => window.__vinyl, null, { timeout: 60000 });
  await page.waitForTimeout(4000);
  const row = await page.$("li[data-id] a");
  await row.click();
  const opened = await until(page, "open");
  const dlog = await page.evaluate(() => window.__vinyl.log());
  out.discography = { opened, opening: dlog.at(-1) };
  out.discography.pass = opened && Math.abs(dlog.at(-1).ms - 450) <= TOL;
  await page.keyboard.press("Escape");
  await until(page, "closed");
  report.profiles[p.name] = out;
  console.log(p.name, JSON.stringify({ transition: out.transition, lifted: out.liftedPass, texels: out.texels, type: out.type, spin: out.spin, drag: out.drag, discography: out.discography }));
  await ctx.close();
}

// reduced motion: the record does not spin
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite`);
  await ready(page);
  await page.waitForTimeout(4000);
  const pt = await page.evaluate(() => window.__rolodex.frontPoint());
  await page.mouse.click(pt.x, pt.y);
  await until(page, "open");
  const a = await page.evaluate(() => window.__vinyl.discAngle());
  await page.waitForTimeout(1000);
  const b = await page.evaluate(() => window.__vinyl.discAngle());
  report.reducedMotion = { angleBefore: a, angleAfter: b, pass: a === b };
  console.log("reduced motion", JSON.stringify(report.reducedMotion));
  await ctx.close();
}
await browser.close();
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
