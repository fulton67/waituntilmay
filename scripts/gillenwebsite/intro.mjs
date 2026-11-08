// The intro spin on /gillenwebsite (rig.ts INTRO, Site.tsx useIntro). Every animation frame from load: the drum's
// position (rig.s, cards), whether the intro is running, and the right knob's turn (an init script, so nothing is
// missed). From the log: when it started after the page was interactive (__intro.interactiveAt), how long it coasted
// (the frames it ran), how far it went (peak - start), where it settled (a whole card?) and when (within 0.002 card
// for good), the recoil (peak - settled), and the knob against the drum (rotation = -0.42 x s). Runs: a first visit
// at 1440 x 900 and at 390 x 844 (touch, 4x CPU throttle); a visit with the intro seen (none in 5 s); a first visit
// with a wheel notch (a tap on phones) 300 ms into the spin (it must stop at once and the drum go where the input
// sends it); and, at 1440, a seen visit left idle 92 s (one spin at 90 s).
//   node scripts/gillenwebsite/intro.mjs [base-url] [--out file] [--no-idle]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/intro-report.json";
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"] });
const report = { base: BASE, at: new Date().toISOString(), runs: {} };
const LOG = () => {
  window.__ilog = [];
  const f = (t) => {
    const r = window.__rolodex?.rig;
    if (r?.ready) { const k = r.knobs[0]; window.__ilog.push([t, r.s, r.intro ? 1 : 0, k ? k.rotation.x : 0]); }
    requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
};
const analyse = (log, introLog, interactiveAt) => {
  if (!introLog.length) return { started: false };
  const L = introLog[0], i0 = log.findIndex(([t, , on]) => on && t >= L.at - 1), run = log.slice(i0);
  const end = run.findIndex(([, , on]) => !on), active = run.slice(0, end < 0 ? run.length : end);
  const peak = Math.max(...run.slice(0, (end < 0 ? run.length : end) + 60).map((x) => x[1]));
  const final = run.at(-1)[1];
  let settledAt = null;
  for (let k = run.length - 1; k >= 0; k--) { if (Math.abs(run[k][1] - final) > 0.002) { settledAt = run[k + 1]?.[0]; break; } }
  const pk = run.find((x) => x[1] === peak);
  return {
    started: true, s0: L.s0, delayAfterInteractiveMs: Math.round(L.at - interactiveAt), coastMs: Math.round(active.at(-1)[0] - L.at), coastFrames: active.length,
    travelled: +(peak - L.s0).toFixed(3), windUp: +(Math.min(...active.map((x) => x[1])) - L.s0).toFixed(3), recoil: +(peak - final).toFixed(3), settledOn: +final.toFixed(4), settledOnWholeCard: Math.abs(final - Math.round(final)) < 0.002, cardsAdvanced: Math.round(final) - L.s0,
    settledMsAfterStart: settledAt ? Math.round(settledAt - L.at) : null, knobOverDrumAtPeak: pk ? +(pk[3] / pk[1]).toFixed(4) : null, cancelled: L.cancelled ? Math.round(L.cancelled - L.at) : null,
  };
};
const visit = async (name, p, { seen = false, waitMs = 4000, interrupt = false } = {}) => {
  const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, isMobile: p.mobile, hasTouch: p.mobile });
  await ctx.addInitScript(() => { try { localStorage.setItem("gillenwebsite:guide-seen", "1"); } catch {} });
  if (seen) await ctx.addInitScript(() => { try { localStorage.setItem("gillenwebsite:intro-seen", "1"); } catch {} });
  await ctx.addInitScript(LOG);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (p.throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.throttle });
  await page.goto(`${BASE}/gillenwebsite`);
  await page.waitForFunction(() => window.__intro, null, { timeout: 120000 });
  let hand = null;
  if (interrupt) {
    await page.waitForFunction(() => window.__rolodex.rig.intro && performance.now() - window.__rolodex.rig.intro.t0 > 300, null, { timeout: 10000 });
    const before = await page.evaluate(() => ({ s: window.__rolodex.rig.s, t: performance.now() }));
    if (p.mobile) await page.touchscreen.tap(30, p.h * 0.5); else { await page.mouse.move(p.w * 0.3, p.h * 0.5); await page.mouse.wheel(0, 100); }
    const after = await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r({ intro: !!window.__rolodex.rig.intro, s: window.__rolodex.rig.s, t: performance.now() }))));
    hand = { sAtInput: +before.s.toFixed(3), introRunningNextFrame: after.intro };
  }
  await page.waitForTimeout(waitMs);
  const [log, introLog, interactiveAt] = await page.evaluate(() => [window.__ilog, window.__intro.log(), window.__intro.interactiveAt]);
  const res = { ...analyse(log, introLog, interactiveAt), starts: introLog.length, ...(hand ? { handOver: { ...hand, settledOn: +log.at(-1)[1].toFixed(3) } } : {}) };
  if (p.throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await ctx.close();
  report.runs[name] = res;
  console.log(name, JSON.stringify(res));
  return res;
};
const D = { w: 1440, h: 900, mobile: false, throttle: 1 }, P = { w: 390, h: 844, mobile: true, throttle: 4 };
const ok = (r) => r.started && Math.abs(r.delayAfterInteractiveMs - 800) <= 50 && Math.abs(r.coastMs - 1420) <= 40 && Math.abs(r.travelled - 6.5) <= 0.02 && Math.abs(r.windUp + 0.4) <= 0.02 && Math.abs(r.recoil - 0.5) <= 0.02 && r.settledOnWholeCard && r.cardsAdvanced === 6 && Math.abs(r.knobOverDrumAtPeak + 0.42) < 0.01 && r.cancelled === null;
const a = await visit("firstVisitDesktop", D);
const b = await visit("firstVisitPhone", P, { waitMs: 5000 });
const c = await visit("seenNoIntro", D, { seen: true, waitMs: 5000 });
const d = await visit("interruptDesktop", D, { interrupt: true, waitMs: 2500 });
const e = await visit("interruptPhone", P, { interrupt: true, waitMs: 3000 });
let f = null;
if (!argv.includes("--no-idle")) f = await visit("seenIdle92s", D, { seen: true, waitMs: 92000 });
await browser.close();
report.pass = ok(a) && ok(b) && !c.started && d.cancelled !== null && !d.handOver.introRunningNextFrame && e.cancelled !== null && !e.handOver.introRunningNextFrame
  && (!f || (f.started && f.delayAfterInteractiveMs > 89500 && Math.abs(f.travelled - 6.5) <= 0.02 && f.settledOnWholeCard));
console.log("pass", report.pass);
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
