// The first-load guide (Guide.tsx), drafting callouts. On a fresh profile, desktop 1440 x 900 and phone 390 x 844
// (touch): it shows by itself; whole at once (every leader at full opacity within 60 ms of showing: no draw-in); its
// phases (holding 2.5 s, fading 0.4 s); the four labels' text, size and face (the header's); each label's left edge
// on the grid (the caption block's or the info column's); each leader one or two segments, every segment horizontal
// or vertical, ending at its arrow; the arrow glyph pointing along the last segment, its box on the target; no dots;
// the leaders following their targets as the camera turns with no input (still axis-aligned, still on target); a
// knob tap removes its callout; a reload in the same profile does not show it. Frame rate on the home page with the
// callouts up (rAF intervals over 4 s): desktop, and the phone with the CPU throttled 4x.
//   node scripts/gillenwebsite/guide.mjs [base-url] [--out file] [--shots dir]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/guide-report.json";
const SHOTS = argv.includes("--shots") ? argv[argv.indexOf("--shots") + 1] : null;
const LABELS = ["SCROLL TO FLIP", "TAP KNOB TO SPIN FASTER", "DRAG TO TURN", "OPEN"];
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const report = { base: BASE, at: new Date().toISOString(), profiles: {} };

const fps = (page) => page.evaluate(() => new Promise((res) => {
  const t = []; const f = (now) => { t.push(now); if (now - t[0] < 4000) requestAnimationFrame(f); else { const d = t.slice(1).map((x, k) => x - t[k]); res({ fps: +((d.length * 1000) / (t.at(-1) - t[0])).toFixed(1), worstMs: +Math.max(...d).toFixed(1) }); } };
  requestAnimationFrame(f);
}));
// every callout's geometry checked: segments, axis alignment, arrow direction and place, label grid
const check = (pts, grid) => pts.map((c) => {
  const P = c.route.pts, segs = P.slice(1).map((q, k) => [P[k], q]);
  const axis = segs.every(([a, b]) => a[0] === b[0] || a[1] === b[1]);
  const [a, b] = segs.at(-1) ?? [[0, 0], [0, 0]];
  const dir = a[0] === b[0] ? (b[1] > a[1] ? "↓" : "↑") : (b[0] > a[0] ? "→" : "←");
  const t = c.target, A = c.arrow, pad = 6;
  const onTarget = !!t && t.x >= A.left - pad && t.x <= A.right + pad && t.y >= A.top - pad && t.y <= A.bottom + pad;
  const end = P.at(-1), touches = !!end && end[0] >= A.left - 5 && end[0] <= A.right + 5 && end[1] >= A.top - 5 && end[1] <= A.bottom + 5;
  const onGrid = grid.some((g) => Math.abs(c.labelRect.left - g) <= 1);
  return { act: c.act, label: c.label, segments: segs.length, axisAligned: axis, arrow: A.glyph, arrowMatches: A.glyph === dir, arrowPx: A.px, arrowOnTarget: onTarget, leaderReachesArrow: touches, labelLeft: Math.round(c.labelRect.left), onGrid, target: t && { x: Math.round(t.x), y: Math.round(t.y) } };
});
const geomOk = (g) => g.every((c) => c.segments >= 1 && c.segments <= 2 && c.axisAligned && c.arrowMatches && c.arrowOnTarget && c.leaderReachesArrow && c.onGrid && c.arrowPx === 12);

for (const p of [{ name: "desktop", w: 1440, h: 900 }, { name: "phone", w: 390, h: 844, throttle: 4 }]) {
  const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, isMobile: p.w < 720, hasTouch: p.w < 720 });
  const page = await ctx.newPage();
  const out = {};
  await page.goto(`${BASE}/gillenwebsite`);
  await page.waitForFunction(() => window.__guide && window.__rolodex?.rig?.ready, null, { timeout: 120000 });
  // the phases from when it first shows, and whether every leader is whole on the first frames
  const tl = await page.evaluate(() => new Promise((res) => {
    const seen = []; let t0 = null, whole = null; const start = performance.now();
    const tick = () => {
      const s = window.__guide.state(), now = performance.now();
      if (s !== "hidden" && t0 === null) t0 = now;
      if (t0 !== null && whole === null && now - t0 >= 60) whole = window.__guide.points().every((c) => c.opacity === 1);
      if (t0 !== null && (!seen.length || seen.at(-1).s !== s)) seen.push({ s, ms: Math.round(now - t0) });
      if (t0 !== null && s === "hidden" && seen.length > 1) return res({ waitedMs: Math.round(t0 - start), phases: seen, wholeWithin60ms: whole });
      if (now - start > 9000) return res({ waitedMs: null, phases: seen, wholeWithin60ms: whole });
      setTimeout(tick, 20);
    };
    tick();
  }));
  out.firstLoad = tl;
  out.firstLoadShows = await page.evaluate(() => window.__guide.shows());
  await page.evaluate(() => { window.__shownAt = performance.now(); window.__guide.show(15000); });
  await page.waitForTimeout(300);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/guide-${p.name}.png` });
  const grid = await page.evaluate(() => [document.querySelector("[data-src='17'][role=button]"), document.querySelector("[class*=inlineSlot] [class*=info]")].filter(Boolean).map((e) => e.getBoundingClientRect().left));
  out.type = await page.evaluate(() => { const l = document.querySelector("[data-guide]"), c = getComputedStyle(l), hdr = getComputedStyle(document.querySelector("nav a[href$='/about']")); return { px: parseFloat(c.fontSize), family: c.fontFamily.split(",")[0], header: hdr.fontFamily.split(",")[0], weight: c.fontWeight, dots: document.querySelectorAll("[class*=guide] circle").length }; });
  out.callouts = check(await page.evaluate(() => window.__guide.points()), grid);
  out.labels = out.callouts.map((c) => c.label);
  // turn the camera with no input event, and the drum by one card: the leaders follow, still square and on target
  await page.evaluate(() => { const { rig } = window.__rolodex; rig.az += 0.3; rig.pos += 1; });
  await page.waitForTimeout(1200);
  out.afterTurnAtMs = await page.evaluate(() => Math.round(performance.now() - window.__shownAt));
  out.afterTurn = check(await page.evaluate(() => window.__guide.points()), grid);
  out.moved = out.callouts.map((c, k) => c.target && out.afterTurn[k].target ? Math.round(Math.hypot(c.target.x - out.afterTurn[k].target.x, c.target.y - out.afterTurn[k].target.y)) : null);
  if (p.throttle) { const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.throttle }); out.cpuThrottle = p.throttle; }
  out.fps = await fps(page);
  if (p.throttle) { const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 }); }
  // a knob tap removes its callout
  const k = await page.evaluate(() => window.__rolodex.knobPoint());
  if (p.w < 720) await page.touchscreen.tap(k.x, k.y); else await page.mouse.click(k.x, k.y);
  await page.waitForTimeout(60);
  out.knobTapGone = await page.evaluate(() => ({ atMs: Math.round(performance.now() - window.__shownAt), state: window.__guide.state(), gone: window.__guide.gone(), knobOpacity: window.__guide.points()[1].opacity }));
  await page.reload();
  await page.waitForFunction(() => window.__guide && window.__rolodex?.rig?.ready, null, { timeout: 120000 });
  await page.waitForTimeout(3500);
  out.secondLoad = await page.evaluate(() => ({ shows: window.__guide.shows(), state: window.__guide.state() }));
  const ph = Object.fromEntries(tl.phases.map((x) => [x.s, x.ms]));
  out.pass = tl.waitedMs !== null && tl.wholeWithin60ms === true && out.firstLoadShows === 1 && ph.fading > 2400 && ph.fading < 2600 && ph.hidden - ph.fading > 350 && ph.hidden - ph.fading < 480
    && out.labels.join("|") === LABELS.join("|") && out.type.px === 12 && out.type.family === out.type.header && out.type.weight === "400" && out.type.dots === 0
    && geomOk(out.callouts) && geomOk(out.afterTurn) && out.moved[0] > 0
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
