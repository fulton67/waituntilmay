// Motion timings on a 390 px phone profile with a 4x CPU throttle: the discography expand and close, the hover,
// the caption swipe, the card-change crossfade, plus every other animation on the way (panel, page slide).
//   node scripts/gillenwebsite/motion.mjs [base-url] [--out file]   (default http://localhost:3217)
// Durations come from the animations themselves, on the performance.now() clock: from the earliest startTime to
// the latest finish event's timelineTime, for every Animation / CSSAnimation / CSSTransition the action started.
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/motion-report.json";
const THROTTLE = 4, TOL = 20;
const TARGET = { expand: 240, close: 200, hoverIn: 120, hoverOut: 160, captionSwipe: 180, crossfade: 150 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"] });
const report = { base: BASE, at: new Date().toISOString(), profile: "390x844, 4x CPU throttle", targets: TARGET, toleranceMs: TOL };

// page-side instruments: collect every animation that starts after arm(), each frame; and the frame times
const INSTRUMENTS = () => {
  const describe = (t) => !t ? "?" : (t.tagName?.toLowerCase() ?? "") + (t.className && typeof t.className === "string" ? "." + t.className.split(" ").map((c) => c.replace(/^.*?__/, "").replace(/__.*$/, "")).filter(Boolean).join(".") : "") + (t.hasAttribute?.("data-clip") ? "[data-clip]" : "");
  window.__m = {
    arm() {
      const seen = new Map(), frames = [], t0 = performance.now();
      let stop = false;
      const tick = (t) => {
        frames.push(t);
        for (const a of document.getAnimations()) {
          if (seen.has(a)) continue;
          const kf = a.effect.getKeyframes?.() ?? [];
          const props = [...new Set(kf.flatMap((k) => Object.keys(k).filter((p) => !["offset", "easing", "composite", "computedOffset"].includes(p))))];
          const last = kf[kf.length - 1] ?? {};
          const rec = { toOpacity: last.opacity ?? null, kind: a.constructor.name, name: a.animationName ?? a.transitionProperty ?? "waapi", target: describe(a.effect.target) + (a.effect.pseudoElement ?? ""), props, start: a.startTime, end: null, timing: a.effect.getComputedTiming().activeDuration + (a.effect.getTiming().delay || 0) };
          seen.set(a, rec);
          a.addEventListener("finish", (ev) => { rec.end = ev.timelineTime ?? document.timeline.currentTime; rec.start = a.startTime ?? rec.start; });
        }
        if (!stop) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      return {
        async done(settleMs = 400) {
          await new Promise((r) => setTimeout(r, settleMs));
          stop = true;
          const anims = [...seen.values()].filter((x) => x.start !== null && x.start >= t0 - 1);
          const fin = anims.filter((x) => x.end !== null);
          const start = Math.min(...fin.map((x) => x.start)), end = Math.max(...fin.map((x) => x.end));
          // frames that fell inside the motion
          const inside = frames.filter((t) => t >= start - 1 && t <= end + 17);
          const gaps = inside.slice(1).map((t, i) => t - inside[i]);
          return {
            ms: fin.length ? +(end - start).toFixed(1) : null,
            anims: anims.map((x) => ({ ...x, ms: x.end === null ? null : +(x.end - x.start).toFixed(1), at: x.start === null || !fin.length ? null : +(x.start - start).toFixed(1), start: undefined, end: undefined })),
            props: [...new Set(anims.flatMap((x) => x.props))],
            fps: gaps.length ? +((gaps.length * 1000) / (inside[inside.length - 1] - inside[0])).toFixed(1) : null,
            worstFrameMs: gaps.length ? +Math.max(...gaps).toFixed(1) : null,
            frames: inside.length,
          };
        },
      };
    },
  };
};
const arm = (page) => page.evaluate(() => { window.__run = window.__m.arm(); });
const done = (page, settle) => page.evaluate((s) => window.__run.done(s), settle);
const ok = (ms, target) => ms !== null && Math.abs(ms - target) <= TOL;
async function phone(path, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: !opts.mouse, hasTouch: !opts.mouse, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await page.addInitScript(INSTRUMENTS);
  await page.goto(`${BASE}${path}`, { waitUntil: "load" });
  await wait(2500);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
  return { ctx, page, cdp };
}

// ---------- discography: expand and close, four ways ----------
{
  const r = (report.discography = {});
  const { ctx, page, cdp } = await phone("/gillenwebsite/discography");
  await page.evaluate(() => { window.__marker = Math.random(); window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: false }); });
  const marker = await page.evaluate(() => window.__marker);
  const navBefore = await page.evaluate(() => performance.getEntriesByType("navigation").length);
  const tapRow = async (k) => {
    const b = await page.locator("ol li a").nth(k).boundingBox();
    await page.evaluate(() => { window.__click = null; addEventListener("click", () => { window.__click = performance.now(); }, { capture: true, once: true }); });
    await arm(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x + b.width * 0.75, y: b.y + 10 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const m = await done(page, 700);
    const lastEnd = await page.evaluate(() => Math.max(...document.getAnimations().map((a) => (a.startTime ?? 0) + a.effect.getComputedTiming().endTime)));
    return { ...m, tapToEndMs: +(lastEnd - (await page.evaluate(() => window.__click))).toFixed(1) };
  };
  const state = () => page.evaluate((marker) => ({
    url: location.pathname + location.hash, sameDocument: window.__marker === marker, navigationEntries: performance.getEntriesByType("navigation").length,
    open: !!document.querySelector("[role=dialog]"), coverRect: (() => { const c = document.querySelector("[class*=discoActive] [data-clip]"); if (!c) return null; const b = c.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; })(),
    othersOpacity: getComputedStyle(document.querySelector("ol li:not([class*=discoActive])")).opacity, rowsInDom: document.querySelectorAll("ol li").length,
  }), marker);

  r.expand = await tapRow(3);
  r.afterExpand = await state();
  r.expand.pass = ok(r.expand.ms, TARGET.expand) && r.expand.fps >= 45 && r.expand.props.every((p) => p === "transform" || p === "opacity");
  r.navigation = { before: navBefore, after: r.afterExpand.navigationEntries, sameDocument: r.afterExpand.sameDocument, hash: r.afterExpand.url, pass: navBefore === 1 && r.afterExpand.navigationEntries === 1 && r.afterExpand.sameDocument && r.afterExpand.url.endsWith("#04-mike-d-thank-you") };
  r.willChangeBeforeAnimating = await page.evaluate(() => getComputedStyle(document.querySelector("[class*=discoActive] [data-clip]")).willChange);

  // close by a tap outside (on the shade, beside the info)
  const closeWith = async (how) => {
    await arm(page);
    if (how === "tapOutside") { await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 195, y: 200 }] }); await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
    if (how === "escape") await page.keyboard.press("Escape");
    if (how === "closeButton") await page.locator("[role=dialog] button").tap();
    if (how === "swipeDown") {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 195, y: 150 }] });
      for (let i = 1; i <= 6; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 195, y: 150 + i * 20 }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    }
    const m = await done(page, 600);
    const s = await state();
    return { how, ...m, closed: !s.open, url: s.url, sameDocument: s.sameDocument, navigationEntries: s.navigationEntries, pass: ok(m.ms, TARGET.close) && !s.open && s.sameDocument && s.navigationEntries === 1 && m.props.every((p) => p === "transform" || p === "opacity") };
  };
  r.close = [];
  r.close.push(await closeWith("tapOutside"));
  for (const [k, how] of [[8, "escape"], [12, "closeButton"], [20, "swipeDown"]]) {
    const e = await tapRow(k);
    r.close.push({ ...(await closeWith(how)), reopenMs: e.ms });
  }
  r.backInRow = await page.evaluate(() => { const c = document.querySelectorAll("ol li [data-clip]")[20], b = c.getBoundingClientRect(); return { h: Math.round(b.height), transform: getComputedStyle(c).transform }; });
  r.clsWhileExpanding = +(await page.evaluate(() => window.__cls)).toFixed(4);
  await ctx.close();
}

// ---------- discography on desktop (1440 x 900, throttled): a click outside, on the shade, closes ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(INSTRUMENTS);
  await page.goto(`${BASE}/gillenwebsite/discography`, { waitUntil: "load" });
  await wait(2500);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
  // the pointer is already over the row (its hover fade done), so only the click's own animations are timed
  await page.locator("ol li a").nth(3).hover({ position: { x: 40, y: 10 } });
  await wait(400);
  await arm(page);
  await page.locator("ol li a").nth(3).click({ position: { x: 40, y: 10 } });
  const e = await done(page, 700);
  const cover = await page.evaluate(() => { const b = document.querySelector("[class*=discoActive] [data-clip]").getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; });
  await arm(page);
  await page.mouse.click(1420, 880);
  const c = await done(page, 600);
  const open = await page.evaluate(() => !!document.querySelector("[role=dialog]"));
  report.desktop = { expandMs: e.ms, fps: e.fps, anims: [...new Set(e.anims.map((x) => `${x.target} ${x.name} at ${x.at} for ${x.ms}`))], cover, clickOutsideCloseMs: c.ms, closed: !open, pass: ok(e.ms, TARGET.expand) && ok(c.ms, TARGET.close) && !open && cover.h === 900 };
  await ctx.close();
}

// ---------- discography hover (a mouse on the 390 px profile, throttled) and CLS ----------
{
  const { ctx, page } = await phone("/gillenwebsite/discography", { mouse: true });
  await page.evaluate(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: false }); });
  const title = async (k) => { const b = await page.locator("ol li [class*=discoTitleText]").nth(k).boundingBox(); return { x: b.x + 10, y: b.y + b.height / 2 }; };
  const hv = (report.hover = { in: [], out: [] });
  for (const k of [2, 5, 9]) {
    const t = await title(k);
    await page.mouse.move(t.x, t.y + 200);
    await wait(400);
    await arm(page);
    await page.mouse.move(t.x, t.y);
    const a = await done(page, 400);
    const ain = a.anims.filter((x) => x.toOpacity === "1");
    hv.in.push({ row: k, ms: ain.length ? Math.max(...ain.map((x) => x.ms)) : null, props: a.props, anims: a.anims.map((x) => `${x.target} ${x.name} -> ${x.toOpacity} ${x.ms}`) });
    await arm(page);
    await page.mouse.move(t.x, t.y + 200);
    const b = await done(page, 400);
    const aout = b.anims.filter((x) => x.toOpacity === "0");
    hv.out.push({ row: k, ms: aout.length ? Math.max(...aout.map((x) => x.ms)) : null, props: b.props });
  }
  // sweep the pointer down the whole list for the CLS reading
  for (let k = 0; k < 36; k++) { const t = await title(k).catch(() => null); if (t) { await page.mouse.move(t.x, t.y); await wait(30); } }
  hv.clsDuringHover = +(await page.evaluate(() => window.__cls)).toFixed(4);
  hv.pass = hv.in.every((x) => ok(x.ms, TARGET.hoverIn)) && hv.out.every((x) => ok(x.ms, TARGET.hoverOut)) && hv.clsDuringHover === 0;
  await ctx.close();
}

// ---------- home: caption swipe, card-change crossfade, panel ----------
{
  const { ctx, page, cdp } = await phone("/gillenwebsite");
  await page.waitForFunction(() => window.__rolodex?.rig?.ready, null, { timeout: 120000 });
  await page.evaluate(() => { setInterval(() => dispatchEvent(new Event("touchstart")), 4000); });
  await wait(1500);
  const cs = (report.captionSwipe = []);
  for (const dy of [-60, -60, 60]) {
    const c = await page.evaluate(() => { const b = document.querySelector("[class*=capText]").getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    await arm(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [c] });
    for (let i = 1; i <= 6; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: c.x, y: c.y + (dy * i) / 6 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const m = await done(page, 700);
    // the caption's own slide animations, without the lean's transform transition
    const slide = m.anims.filter((x) => /cap(In|Out)/.test(x.name));
    cs.push({ dy, ms: slide.length ? Math.max(...slide.map((x) => x.ms)) : null, slides: slide.map((x) => `${x.name} ${x.ms}`), props: m.props });
  }
  // the release panel opens from the caption thumbnail; its arrows change the card (crossfade)
  await arm(page);
  await page.locator("[class*=capThumb]").first().tap();
  const panel = await done(page, 900);
  report.panelOpen = { ms: panel.ms, anims: panel.anims.map((x) => `${x.target} ${x.name} at ${x.at} for ${x.ms}`), props: panel.props, pass: panel.ms !== null && panel.ms <= 250 };
  const cf = (report.crossfade = []);
  for (let k = 0; k < 3; k++) {
    await arm(page);
    await page.locator("[role=dialog] button[aria-label='Next release']").tap();
    const m = await done(page, 600);
    cf.push({ ms: m.ms, anims: m.anims.map((x) => `${x.target} ${x.name} ${x.ms}`), props: m.props, fps: m.fps });
  }
  await ctx.close();
}
report.captionSwipePass = report.captionSwipe.every((x) => ok(x.ms, TARGET.captionSwipe) && x.props.every((p) => p === "transform" || p === "opacity"));
report.crossfadePass = report.crossfade.every((x) => ok(x.ms, TARGET.crossfade) && x.props.every((p) => p === "opacity"));

// ---------- page slide between routes (no transition may run over 250 ms) ----------
{
  const { ctx, page } = await phone("/gillenwebsite/discography");
  await arm(page);
  const t0 = await page.evaluate(() => performance.now());
  await page.locator("nav a[href$='/about']").tap();
  await page.waitForURL(/about/);
  const t1 = await page.evaluate(() => performance.now());
  const legs = await done(page, 800);
  report.pageSlide = { tapToUrlMs: +(t1 - t0).toFixed(0), legs: legs.anims.filter((x) => x.kind === "CSSTransition").map((x) => `${x.target} ${x.name} at ${x.at} for ${x.ms}`), navigationEntries: await page.evaluate(() => performance.getEntriesByType("navigation").length), note: "two 240 ms legs (out, client-side route change, in); the route change between them is not an animation" };
  await ctx.close();
}

// every animation measured above, none over 250 ms
const all = [
  report.discography.expand, ...report.discography.close, ...report.hover.in, ...report.hover.out, ...report.captionSwipe, report.panelOpen, ...report.crossfade,
].map((x) => x.ms);
report.longestMs = Math.max(...all.filter((x) => x !== null));
report.noneOver250 = report.longestMs <= 250;
report.pass = report.desktop.pass && report.discography.expand.pass && report.discography.navigation.pass && report.discography.close.every((x) => x.pass) && report.hover.pass && report.captionSwipePass && report.crossfadePass && report.panelOpen.pass && report.noneOver250;

await browser.close();
await fs.writeFile(path.join(ROOT, OUT), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
