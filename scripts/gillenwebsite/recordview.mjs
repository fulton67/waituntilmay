// The open record view (VinylView.tsx), at 1440 x 900 DPR 2 and 390 x 844 DPR 3 (touch, 4x CPU throttle):
//  - only the object: no text node in the view's DOM, every object under the open record's group listed (no text
//    meshes), the caption block gone while open and back after; the sleeve's square on screen against 80% of the
//    viewport's shorter side and its centre against the viewport's; the record half out and spinning
//  - the flip: a horizontal drag of 240 px (about 110°): the flip to the back logged as it passes 90°, the record in
//    (travel 0) within 300 ms, and let go it settles back on (180°) without spinning; dragged back 240 px: the flip
//    to the front past 90° the other way, the record half out again, settled face on (0°) and spinning
//  - tap to close from five points (the sleeve's middle, the record, the ground at the bottom left, the right edge,
//    and the sleeve's middle while it is turned back on), each opened afresh: the full close runs and the sleeve is
//    back on the ring (rig.lifted -1); then a nav link while open still navigates
//  - fps: each open and close from the view's frame log, and the page's frames over a drag-and-flip (>= 55
//    desktop, >= 45 phone)
//   node scripts/gillenwebsite/recordview.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/recordview-report.json";
const PROFILES = [
  { name: "desktop", w: 1440, h: 900, dpr: 2, mobile: false, throttle: 1, fpsMin: 55 },
  { name: "phone", w: 390, h: 844, dpr: 3, mobile: true, throttle: 4, fpsMin: 45 },
];
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"] });
const report = { base: BASE, at: new Date().toISOString(), profiles: {} };
const until = async (page, f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(f)) return true; await page.waitForTimeout(20); } return false; };

for (const p of PROFILES) {
  const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, isMobile: p.mobile, hasTouch: p.mobile });
  await ctx.addInitScript(() => { try { localStorage.setItem("gillenwebsite:guide-seen", "1"); localStorage.setItem("gillenwebsite:intro-seen", "1"); } catch {} });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`${BASE}/gillenwebsite`);
  await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.allSmall && window.__vinyl && window.__site, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  if (p.throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.throttle });
  const caption = () => page.evaluate(() => { const c = document.querySelector("[data-src='17'][role=button]"); return !!c && c.getBoundingClientRect().height > 0; });
  const open = async () => { await page.evaluate(() => window.__site.openFront()); return until(page, () => window.__vinyl.state() === "open"); };
  const tap = async (x, y) => { if (p.mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
  // a horizontal drag in 20 steps over 600 ms; the page's frame times over it
  const drag = async (dx) => {
    const c = await page.evaluate(() => window.__vinyl.coverPoint());
    await page.evaluate(() => { window.__df = []; const f = (t) => { if (!window.__df) return; window.__df.push(t); requestAnimationFrame(f); }; requestAnimationFrame(f); });
    if (p.mobile) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: c.x, y: c.y }] });
      for (let k = 1; k <= 20; k++) { await page.waitForTimeout(30); await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: c.x + (dx * k) / 20, y: c.y }] }); }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await page.mouse.move(c.x, c.y); await page.mouse.down();
      for (let k = 1; k <= 20; k++) { await page.waitForTimeout(30); await page.mouse.move(c.x + (dx * k) / 20, c.y); }
      await page.mouse.up();
    }
    await page.waitForTimeout(900);
    return page.evaluate(() => { const f = window.__df; window.__df = null; const d = f.slice(1).map((t, k) => t - f[k]); return { fps: +((d.length * 1000) / (f.at(-1) - f[0])).toFixed(1), over33: d.filter((x) => x > 33.4).length, frames: d.length }; });
  };
  const out = { captionBefore: await caption() };
  await open();
  await page.waitForTimeout(500);
  out.captionWhileOpen = await caption();
  out.textNodes = await page.evaluate(() => window.__vinyl.textNodes());
  out.dialogText = await page.evaluate(() => document.querySelector("[data-src='12']").innerText.trim());
  out.objects = await page.evaluate(() => window.__vinyl.objects());
  out.textObjects = out.objects.filter((o) => /text/i.test(o.type + o.name)).length;
  out.sleeve = await page.evaluate(() => window.__vinyl.sleevePx());
  out.sleeve.ratio = +(out.sleeve.w / out.sleeve.shorter).toFixed(3);
  const a0 = await page.evaluate(() => window.__vinyl.discAngle()); await page.waitForTimeout(500);
  out.halfOut = { slide: +(await page.evaluate(() => window.__vinyl.slide())).toFixed(4), half: +(await page.evaluate(() => window.__vinyl.half)).toFixed(4), spinningRadIn500ms: +Math.abs((await page.evaluate(() => window.__vinyl.discAngle())) - a0).toFixed(3) };
  // the flip both ways
  const f0 = await page.evaluate(() => window.__vinyl.flips().length);
  out.toBack = await drag(240);
  out.toBackState = await page.evaluate((f0) => { const v = window.__vinyl; return { flips: v.flips().slice(f0), yawDeg: +(v.yaw() * 180 / Math.PI).toFixed(1), goalDeg: +(v.goal() * 180 / Math.PI).toFixed(1), slide: +v.slide().toFixed(4) }; }, f0);
  // when the record was all the way in after the flip to the back (ms after the flip)
  const tr = await page.evaluate(() => window.__vinyl.trace());
  const b0 = await page.evaluate(() => window.__vinyl.discAngle()); await page.waitForTimeout(400);
  out.toBackState.spinningWhileBack = (await page.evaluate(() => window.__vinyl.discAngle())) !== b0;
  out.toBackState.inAfterTurnFrames = tr.filter((x) => x.kind === "turn").findIndex((x, k, arr) => k > 0 && x.s === 0 && arr[k - 1].s > 0);
  const f1 = await page.evaluate(() => window.__vinyl.flips().length);
  out.toFront = await drag(-240);
  out.toFrontState = await page.evaluate((f1) => { const v = window.__vinyl; return { flips: v.flips().slice(f1), yawDeg: +(v.yaw() * 180 / Math.PI).toFixed(1), goalDeg: +(v.goal() * 180 / Math.PI).toFixed(1), slide: +v.slide().toFixed(4) }; }, f1);
  const c0 = await page.evaluate(() => window.__vinyl.discAngle()); await page.waitForTimeout(400);
  out.toFrontState.spinning = (await page.evaluate(() => window.__vinyl.discAngle())) !== c0;
  // tap to close
  out.closeTargets = [];
  const points = [
    ["sleeve middle", () => page.evaluate(() => window.__vinyl.coverPoint())],
    ["record", () => page.evaluate(() => window.__vinyl.discPoint())],
    ["ground, bottom left", async () => ({ x: 30, y: p.h - 30 })],
    ["right edge", async () => ({ x: p.w - 12, y: p.h * 0.75 })],
    ["sleeve middle, turned back on", () => page.evaluate(() => window.__vinyl.coverPoint())],
  ];
  for (const [what, where] of points) {
    if ((await page.evaluate(() => window.__vinyl.state())) !== "open") await open();
    await page.waitForTimeout(300);
    if (/back on/.test(what)) await drag(240);
    const pt = await where();
    const n0 = await page.evaluate(() => window.__vinyl.log().length);
    await tap(pt.x, pt.y);
    const closed = await until(page, () => window.__vinyl.state() === "closed" && window.__rolodex.rig.lifted === -1, 4000);
    const ran = await page.evaluate((n0) => window.__vinyl.log().slice(n0).map((l) => `${l.dir} ${l.ms}ms ${l.fps}fps`).join(", "), n0);
    out.closeTargets.push({ what, x: Math.round(pt.x), y: Math.round(pt.y), closed, ran });
    await page.waitForTimeout(400);
  }
  out.captionAfterClose = await caption();
  const log = await page.evaluate(() => window.__vinyl.log());
  out.fps = { open: Math.min(...log.filter((l) => l.dir === "open").map((l) => l.fps)), close: Math.min(...log.filter((l) => l.dir === "close").map((l) => l.fps)), turn: Math.min(out.toBack.fps, out.toFront.fps) };
  out.spin = await page.evaluate(() => window.__vinyl.spin());
  // a nav link while open
  await open(); await page.waitForTimeout(300);
  const nav = await page.evaluate(() => { const a = [...document.querySelectorAll("nav a")].find((x) => x.textContent.trim() === "DISCOGRAPHY").getBoundingClientRect(); return { x: a.left + a.width / 2, y: a.top + a.height / 2 }; });
  await tap(nav.x, nav.y);
  await page.waitForURL(/discography/, { timeout: 5000 }).catch(() => {});
  out.navLink = new URL(page.url()).pathname;
  if (p.throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const s = out.sleeve;
  out.pass = out.captionBefore && !out.captionWhileOpen && out.captionAfterClose && out.textNodes === 0 && out.dialogText === "" && out.textObjects === 0
    && Math.abs(s.ratio - 0.8) <= 0.012 && Math.abs(s.cx - p.w / 2) <= 2 && Math.abs(s.cy - p.h / 2) <= 2 && Math.abs(out.halfOut.slide - out.halfOut.half) < 1e-3 && out.halfOut.spinningRadIn500ms > 0.5
    && out.toBackState.flips.length === 1 && out.toBackState.flips[0].to === "back" && Math.abs(out.toBackState.flips[0].yawDeg - 90) < 6 && out.toBackState.slide === 0 && Math.abs(out.toBackState.goalDeg - 180) < 0.1 && Math.abs(out.toBackState.yawDeg - 180) < 3 && !out.toBackState.spinningWhileBack
    && out.toFrontState.flips.length === 1 && out.toFrontState.flips[0].to === "front" && Math.abs(out.toFrontState.flips[0].yawDeg - 90) < 6 && Math.abs(out.toFrontState.slide - out.halfOut.half) < 1e-3 && Math.abs(out.toFrontState.goalDeg) < 0.1 && Math.abs(out.toFrontState.yawDeg) < 3 && out.toFrontState.spinning
    && out.closeTargets.every((c) => c.closed && /close/.test(c.ran)) && out.navLink.endsWith("/discography")
    && out.fps.open >= p.fpsMin && out.fps.close >= p.fpsMin && out.fps.turn >= p.fpsMin && out.spin.notOut === 0;
  report.profiles[p.name] = out;
  console.log(p.name, JSON.stringify({ ...out, objects: out.objects.length }));
  await ctx.close();
}
await browser.close();
report.pass = Object.values(report.profiles).every((x) => x.pass);
console.log("pass", report.pass);
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
