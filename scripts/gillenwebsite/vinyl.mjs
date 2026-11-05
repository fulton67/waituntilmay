// The record view (VinylView.tsx), measured in headed Chrome: 1440 x 900 DPR 2, and 390 x 844 DPR 3 with a 4x CPU
// throttle. On each profile:
//  - transitions: open (650 ms, three stages), the cover-state toggle both ways (400 ms), close from either state
//    (500 ms), each within 20 ms, and their fps from the view's own frame log (fps >= 55 desktop, >= 45 phone)
//  - the record's travel along the pocket from every animated frame: continuous, one way per motion, fully out
//    and spinning when open, fully in and still in the cover state, never turning while not fully out
//  - the ring's sleeve is hidden while the view is open and drawn again after it closes (rig.lifted)
//  - texels: front, back and label textures against their faces' device pixels (>= 1)
//  - type: every text element's computed family and weight (only the header's face and the informational face, all
//    400); Dylan's name in the header's face at 3x the header size; the credits' line count for every release
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

  // the sequence, twice round, throttled: open from the front sleeve, click the front cover (cover state), click it
  // again (open), Escape (close); then once more closing from the cover state
  if (p.throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.throttle });
  out.lifted = []; out.rest = [];
  const clickCover = async () => { const c = await page.evaluate(() => window.__vinyl.coverPoint()); await tap(c.x, c.y); };
  const rest = async (label) => { await page.waitForTimeout(250); const r = await page.evaluate(() => ({ s: window.__vinyl.slide(), g: window.__vinyl.gate(), a: window.__vinyl.discAngle() })); await page.waitForTimeout(400); r.spinning = (await page.evaluate(() => window.__vinyl.discAngle())) !== r.a; out.rest.push({ at: label, ...r }); };
  for (let k = 0; k < 3; k++) {
    const pt = await page.evaluate(() => window.__rolodex.frontPoint());
    await tap(pt.x, pt.y);
    await until(page, "open"); await rest("open");
    out.lifted.push(await page.evaluate(() => window.__rolodex.rig.lifted));
    await clickCover(); await until(page, "cover"); await rest("cover");
    if (k < 2) { await clickCover(); await until(page, "open"); await rest("open again"); }
    await page.keyboard.press("Escape");
    await until(page, "closed");
    await page.waitForTimeout(300);
    out.lifted.push(await page.evaluate(() => window.__rolodex.rig.lifted));
    if (k < 2) { await page.mouse.move(p.w * 0.3, p.h * 0.5); await page.mouse.wheel(0, 100); await page.waitForTimeout(1200); }
  }
  if (p.throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const log = await page.evaluate(() => window.__vinyl.log());
  out.transitions = log;
  const TARGET = { open: 650, toCover: 400, toOpen: 400, close: 500 };
  const by = (d) => log.filter((x) => x.dir === d).map((x) => x.ms);
  out.transition = { openMs: by("open"), toCoverMs: by("toCover"), toOpenMs: by("toOpen"), closeMs: by("close"), minFps: Math.min(...log.map((x) => x.fps)), worstFrameMs: Math.max(...log.map((x) => x.worstMs)), target: TARGET };
  out.transition.pass = log.length >= 10 && log.every((x) => Math.abs(x.ms - TARGET[x.dir]) <= TOL) && out.transition.minFps >= p.fpsMin;
  // the record's travel along the pocket: fully out when open (and spinning), fully in in the cover state (and still);
  // every animated frame moves it continuously (no step over a quarter of the travel), each motion one way only,
  // and the disc never turns while it is not fully out
  const trace = await page.evaluate(() => window.__vinyl.trace());
  // a pop would be the record going most of the way in or out between two frames: steps over half the travel
  let jumps = 0, reversals = 0, spinNotOut = 0, maxStep = 0;
  const slideFrames = [];
  let run = 0;
  for (let i = 1; i < trace.length; i++) {
    const a = trace[i - 1], b = trace[i];
    if (a.kind !== b.kind || b.f < a.f) { if (run) slideFrames.push(run); run = 0; continue; }
    const step = Math.abs(b.s - a.s);
    if (step > 0) run++;
    maxStep = Math.max(maxStep, step);
    if (step > 0.5) jumps++;
    const dir = { open: 1, toOpen: 1, toCover: -1, close: -1 }[b.kind];
    if ((b.s - a.s) * dir < -1e-6) reversals++;
    if (b.spin !== a.spin && (a.s < 1 || b.s < 1)) spinNotOut++;
  }
  if (run) slideFrames.push(run);
  out.travel = { frames: trace.length, pops: jumps, maxStepPerFrame: +maxStep.toFixed(3), framesPerSlide: slideFrames.filter((x) => x > 1), reversals, spinWhileNotOut: spinNotOut, rest: out.rest };
  out.travel.pass = !jumps && !reversals && !spinNotOut && out.rest.every((r) => (r.at.startsWith("open") ? r.s === 1 && r.g === 1 && r.spinning : r.s === 0 && r.g === 0 && !r.spinning));
  out.liftedPass = out.lifted.every((v, k) => (k % 2 === 0 ? v >= 0 : v === -1));

  // a click on the spinning record closes the view (the full close, its plan and 500 ms)
  {
    const pt0 = await page.evaluate(() => window.__rolodex.frontPoint());
    await tap(pt0.x, pt0.y);
    await until(page, "open"); await page.waitForTimeout(500);
    const d = await page.evaluate(() => window.__vinyl.discPoint());
    await tap(d.x, d.y);
    const closed = await until(page, "closed");
    const last = (await page.evaluate(() => window.__vinyl.log())).at(-1);
    out.recordClick = { closed, motion: last.dir, ms: last.ms, fps: last.fps, target: 500 };
    out.recordClick.pass = closed && last.dir === "close" && Math.abs(last.ms - 500) <= TOL;
    await page.waitForTimeout(400);
  }

  // open once more for the rest
  const pt = await page.evaluate(() => window.__rolodex.frontPoint());
  await tap(pt.x, pt.y);
  await until(page, "open");
  await page.waitForTimeout(1500); // the panel covers upgrade to the files their faces need
  const tx = await page.evaluate(() => window.__vinyl.texels());
  out.texels = Object.fromEntries(["front", "back", "label"].map((k) => [k, { texturePx: tx[k].texturePx, screenPx: +tx[k].screenPx.toFixed(1), ratio: +(tx[k].texturePx / tx[k].screenPx).toFixed(2) }]));
  out.texels.pass = ["front", "back", "label"].every((k) => out.texels[k].ratio >= 1);

  // type: every text element in the open view, its computed family and weight (only the header's face and the
  // informational face, all 400); Dylan's name in the header's face at 3x the header; credits lines per release
  out.type = await page.evaluate(() => {
    const view = document.querySelector("[class*=vvInfo]"), name = view.querySelector("[class*=vvDylan]"), header = document.querySelector("header [class*=name]");
    const texts = [...view.querySelectorAll("*")].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length);
    const cs = (e) => getComputedStyle(e), fam = (e) => cs(e).fontFamily.split(",")[0].trim();
    return {
      elements: texts.map((e) => ({ text: e.textContent.trim().slice(0, 28), family: fam(e), weight: cs(e).fontWeight, px: parseFloat(cs(e).fontSize) })),
      name: { family: fam(name), stretch: cs(name).fontStretch, px: parseFloat(cs(name).fontSize), weight: cs(name).fontWeight },
      header: { family: fam(header), stretch: cs(header).fontStretch, px: parseFloat(cs(header).fontSize) },
    };
  });
  out.type.families = [...new Set(out.type.elements.map((x) => x.family))];
  out.type.weights = [...new Set(out.type.elements.map((x) => x.weight))];
  out.type.panel = (await page.evaluate(() => window.__vinyl.texels())).credits;
  // the panel's faces: the name's face (Archivo) and the kit's Univers Next Pro (or the info face standing in), all 400
  out.type.panelOk = out.type.panel.type.every((t) => / 400 /.test(t) && /^(Archivo|univers-next-pro|info)/.test(t));
  // every release: the info column's credit rows and the panel's lines
  out.type.lines = [];
  for (let k = 0; k < 36; k++) {
    const row = await page.evaluate(() => ({ id: document.querySelector("[class*=vvInfo]").dataset.release, column: document.querySelectorAll("[class*=vvCredit][role=listitem]").length, columns: document.querySelectorAll("[class*=vvCreditCol]").length }));
    await page.waitForTimeout(250);
    const tx = await page.evaluate(() => window.__vinyl.texels());
    row.panelLines = tx.credits.lines; row.vinyl = tx.vinyl;
    out.type.lines.push(row);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(350);
  }
  out.type.pass = out.type.families.length <= 2 && out.type.families.every((f) => f === out.type.header.family || f === out.type.elements.find((x) => x.px === 12)?.family)
    && out.type.weights.join() === "400" && out.type.name.family === out.type.header.family && out.type.name.stretch === out.type.header.stretch
    && out.type.name.px === out.type.header.px * 3 && out.type.panelOk && out.type.lines.every((x) => x.column <= 13 && (x.column <= 8 ? x.columns <= 1 : x.columns === 2));

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
  out.discography.pass = opened && Math.abs(dlog.at(-1).ms - 650) <= TOL;
  await page.keyboard.press("Escape");
  await until(page, "closed");
  report.profiles[p.name] = out;
  console.log(p.name, JSON.stringify({ recordClick: out.recordClick, transition: out.transition, travel: { ...out.travel, rest: undefined }, lifted: out.liftedPass, texels: out.texels, type: out.type, spin: out.spin, drag: out.drag, discography: out.discography }));
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
