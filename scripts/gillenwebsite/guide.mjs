// The first-load guide (Guide.tsx). On a fresh profile, desktop 1440 x 900 and phone 390 x 844 (touch): it shows by
// itself, its phases over time (drawing, holding, fading, hidden), the four labels, each dot on its target, and the
// dots following their targets as the camera turns with no input; a gesture removes its note at once; a reload in
// the same profile does not show it. Frame rate on the home page with the notes up (rAF intervals over 4 s): desktop,
// and the phone with the CPU throttled 4x.
//   node scripts/gillenwebsite/guide.mjs [base-url] [--out file] [--shots dir]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/guide-report.json";
const SHOTS = argv.includes("--shots") ? argv[argv.indexOf("--shots") + 1] : null;
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const report = { base: BASE, at: new Date().toISOString(), profiles: {} };

const fps = (page) => page.evaluate(() => new Promise((res) => {
  const t = []; const f = (now) => { t.push(now); if (now - t[0] < 4000) requestAnimationFrame(f); else { const d = t.slice(1).map((x, k) => x - t[k]); res({ fps: +((d.length * 1000) / (t.at(-1) - t[0])).toFixed(1), worstMs: +Math.max(...d).toFixed(1) }); } };
  requestAnimationFrame(f);
}));

for (const p of [{ name: "desktop", w: 1440, h: 900 }, { name: "phone", w: 390, h: 844, throttle: 4 }]) {
  const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, isMobile: p.w < 720, hasTouch: p.w < 720 });
  const page = await ctx.newPage();
  const out = {};
  await page.goto(`${BASE}/gillenwebsite`);
  await page.waitForFunction(() => window.__guide && window.__rolodex?.rig?.ready, null, { timeout: 120000 });
  // the phases, sampled every 50 ms from when it first shows
  const tl = await page.evaluate(() => new Promise((res) => {
    const seen = []; let t0 = null; const start = performance.now();
    const tick = () => {
      const s = window.__guide.state(), now = performance.now();
      if (s !== "hidden" && t0 === null) t0 = now;
      if (t0 !== null && (!seen.length || seen.at(-1).s !== s)) seen.push({ s, ms: Math.round(now - t0) });
      if (t0 !== null && s === "hidden" && seen.length > 1) return res({ waitedMs: Math.round(t0 - start), phases: seen });
      if (now - start > 9000) return res({ waitedMs: null, phases: seen });
      setTimeout(tick, 50);
    };
    tick();
  }));
  out.firstLoad = tl;
  out.firstLoadShows = await page.evaluate(() => window.__guide.shows());
  // shown again with a long hold, for the checks
  await page.evaluate(() => window.__guide.show(15000));
  await page.waitForTimeout(1700);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/guide-${p.name}.png` });
  out.labels = await page.evaluate(() => [...document.querySelectorAll("[data-guide]")].map((l) => ({ text: l.textContent, opacity: +l.style.opacity, inView: (() => { const r = l.getBoundingClientRect(); return r.left >= 0 && r.right <= document.documentElement.clientWidth && r.top >= 0 && r.bottom <= innerHeight; })(), font: getComputedStyle(l).fontVariantCaps })));
  const err = (pts) => pts.map((x) => x.target ? +Math.hypot(x.target.x - x.dot.x, x.target.y - x.dot.y).toFixed(2) : null);
  const a = await page.evaluate(() => window.__guide.points());
  // turn the camera with no input event, and the drum by one card: the dots follow
  await page.evaluate(() => { const { rig } = window.__rolodex; rig.az += 0.35; rig.pos += 1; });
  await page.waitForTimeout(1200);
  const b = await page.evaluate(() => window.__guide.points());
  out.track = { before: err(a), after: err(b), moved: a.map((x, k) => +Math.hypot(b[k].dot.x - x.dot.x, b[k].dot.y - x.dot.y).toFixed(1)) };
  out.track.pass = [...out.track.before, ...out.track.after].every((e) => e !== null && e < 1.5) && out.track.moved[1] > 5;
  // frame rate with the notes up
  if (p.throttle) { const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.throttle }); out.cpuThrottle = p.throttle; }
  out.fps = await fps(page);
  out.fpsState = await page.evaluate(() => window.__guide.state());
  if (p.throttle) { const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 }); }
  // a gesture removes its note: a wheel notch on desktop (flip), a tap on the knob (knob)
  const k = await page.evaluate(() => window.__rolodex.knobPoint());
  if (p.w < 720) await page.touchscreen.tap(k.x, k.y); else await page.mouse.click(k.x, k.y);
  await page.waitForTimeout(60);
  out.knobTapGone = await page.evaluate(() => ({ gone: window.__guide.gone(), knobOpacity: window.__guide.points()[1].opacity }));
  // a second load in the same profile: not shown
  await page.reload();
  await page.waitForFunction(() => window.__guide && window.__rolodex?.rig?.ready, null, { timeout: 120000 });
  await page.waitForTimeout(3500);
  out.secondLoad = await page.evaluate(() => ({ shows: window.__guide.shows(), state: window.__guide.state(), seen: localStorage.getItem("gillenwebsite:guide-seen") }));
  const ph = Object.fromEntries(tl.phases.map((x) => [x.s, x.ms]));
  out.pass = tl.waitedMs !== null && out.firstLoadShows === 1 && ph.holding > 1200 && ph.holding < 1500 && ph.fading - ph.holding > 2400 && ph.fading - ph.holding < 2650
    && out.labels.length === 4 && out.labels.every((l) => l.opacity > 0.99 && l.inView) && out.track.pass
    && out.knobTapGone.gone.includes(1) && out.knobTapGone.knobOpacity === 0 && out.secondLoad.shows === 0 && out.secondLoad.state === "hidden"
    && out.fps.fps >= (p.throttle ? 45 : 55);
  report.profiles[p.name] = out;
  console.log(p.name, JSON.stringify(out));
  await ctx.close();
}
await browser.close();
report.pass = Object.values(report.profiles).every((x) => x.pass);
console.log("pass", report.pass);
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
