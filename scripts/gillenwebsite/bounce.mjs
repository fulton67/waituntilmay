// The "you can tap this" bounce on /gillenwebsite. Every animation frame from load, the front sleeve's lift off the
// ring (rig.lift, metres, the distance its body has moved along its own height from its rest on the ring) and the
// guide's state are logged (an init script, so nothing is missed). From the log: each bounce (lift leaves 0 until it
// is back at 0), its length, its peak (mm), its overshoot below the ring (mm), the gap between the two, and whether
// the hints were up with it. Three runs: a first visit (no localStorage) at 1440 x 900 and 390 x 844 (touch); a
// visit with the guide already seen (no bounce in 5 s); and, at 1440, the same visit left without input for 92 s
// (one bounce pair, with the hints, at 90 s).
//   node scripts/gillenwebsite/bounce.mjs [base-url] [--out file] [--no-idle]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/bounce-report.json";
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const report = { base: BASE, at: new Date().toISOString(), runs: {} };

const LOG = () => {
  window.__bounceLog = [];
  const f = () => {
    const r = window.__rolodex?.rig;
    if (r?.ready) window.__bounceLog.push([performance.now(), r.lift, window.__guide?.state?.() ?? "none"]);
    requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
};
// the bounces in a log: runs of frames with lift != 0, each ended by the first frame back at 0 (its time is the end);
// also the longest frame gap inside a bounce
const bounces = (log) => {
  const out = [];
  let cur = null;
  for (const [t, l, g] of log) {
    if (l !== 0) {
      if (cur) { cur.worst = Math.max(cur.worst, t - cur.last); cur.last = t; cur.peak = Math.max(cur.peak, l); cur.min = Math.min(cur.min, l); cur.hints ||= g === "holding"; }
      else { cur = { start: t, last: t, end: t, worst: 0, peak: l, min: l, hints: g === "holding" }; out.push(cur); }
    } else if (cur) { cur.end = t; cur = null; }
  }
  return out.map((b, k) => ({ startMs: Math.round(b.start - out[0].start), lengthMs: Math.round(b.end - b.start), peakMm: +(b.peak * 1000).toFixed(2), overshootMm: +(b.min * 1000).toFixed(2), hintsUp: b.hints, worstFrameMs: Math.round(b.worst), gapBeforeMs: k ? Math.round(b.start - out[k - 1].end) : null }));
};
const visit = async (name, o, { seen = false, waitMs = 6000 } = {}) => {
  const ctx = await browser.newContext(o);
  if (seen) await ctx.addInitScript(() => { try { localStorage.setItem("gillenwebsite:guide-seen", "1"); } catch {} });
  await ctx.addInitScript(LOG);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite`);
  await page.waitForFunction(() => window.__rolodex?.rig?.ready, null, { timeout: 120000 });
  await page.waitForTimeout(waitMs);
  const log = await page.evaluate(() => window.__bounceLog);
  const b = bounces(log);
  const readyAt = log[0]?.[0] ?? 0;
  const firstAt = b.length ? Math.round(log.find(([, l]) => l !== 0)[0] - readyAt) : null;
  const res = { frames: log.length, bounces: b, firstBounceAfterReadyMs: firstAt, seenAfter: await page.evaluate(() => localStorage.getItem("gillenwebsite:guide-seen")) };
  await ctx.close();
  report.runs[name] = res;
  console.log(name, JSON.stringify(res));
  return res;
};
const ok = (b) => b.length === 2 && b.every((x) => Math.abs(x.peakMm - 12) < 0.3 && x.overshootMm < 0 && x.overshootMm > -3 && Math.abs(x.lengthMs - 350) <= 34 && x.hintsUp) && Math.abs(b[1].gapBeforeMs - 200) <= 34;

const first = await visit("firstVisitDesktop", { viewport: { width: 1440, height: 900 } });
const phone = await visit("firstVisitPhone", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const seen = await visit("seenNoIdle", { viewport: { width: 1440, height: 900 } }, { seen: true, waitMs: 5000 });
let idle = null;
if (!argv.includes("--no-idle")) idle = await visit("seenIdle92s", { viewport: { width: 1440, height: 900 } }, { seen: true, waitMs: 92000 });
await browser.close();
report.pass = ok(first.bounces) && ok(phone.bounces) && seen.bounces.length === 0 && (!idle || (ok(idle.bounces) && idle.firstBounceAfterReadyMs > 89000));
console.log("pass", report.pass);
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
