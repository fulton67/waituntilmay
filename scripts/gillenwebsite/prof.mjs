// Profiles /gillenwebsite for 20 s a view: the home page (the Rolodex) and the open record view, at 1440 x 900 DPR 2
// and at 390 x 844 DPR 3 (touch) with a 4x CPU throttle, each under the same scripted input (below). Two passes per
// view and profile:
//  A (clean, nothing attached but page-side counters): every animation frame's time (frames over 33 ms, fps), long
//    tasks over 50 ms (PerformanceObserver), WebGL texture uploads (texImage2D / texSubImage2D / compressed*, wrapped:
//    each call's time and size, and whether it fell in an input gesture), and React commits (a stand-in
//    __REACT_DEVTOOLS_GLOBAL_HOOK__ counts onCommitFiberRoot; commits per frame).
//  B (Chrome trace + V8 sampling profiler): each renderer main-thread task over 50 ms, with what took its time: the
//    trace's event kinds by self time (script, GC, layout, paint, image decode...) and the profiler's functions by
//    self time, mapped through the build's source maps when it serves them (a local build with
//    productionBrowserSourceMaps), else minified names.
// Input. Home: 12 wheel notches (touch: swipes), 3 drags on the sleeves, 2 orbit drags off them, then idle with two more
// steps. Open view (the three states, VinylView.tsx): the front release opened, idle, a horizontal drag on it (it shuts,
// then turns) and back, a tap on the shut sleeve (it opens again), Escape (back to the ring), a second release opened,
// a long drag (shut and turned past 90 degrees) and back, idle. Each drag starts on the sleeve's middle.
//   node scripts/gillenwebsite/prof.mjs [base-url] [--out file] [--seconds 20] [--only desktop|phone] [--views home,open] [--no-trace] [--task-ms 50]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import sm from "source-map";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/prof-report.json";
const SECS = argv.includes("--seconds") ? +argv[argv.indexOf("--seconds") + 1] : 20;
const ONLY = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;
const VIEWS = argv.includes("--views") ? argv[argv.indexOf("--views") + 1].split(",") : ["home", "open"];
const TRACE = !argv.includes("--no-trace");
// the traced pass looks into main-thread tasks over TASK_MS (50: the long tasks)
const TASK_MS = argv.includes("--task-ms") ? +argv[argv.indexOf("--task-ms") + 1] : 50;
const PROFILES = [
  { name: "desktop", w: 1440, h: 900, dpr: 2, mobile: false, throttle: 1 },
  { name: "phone", w: 390, h: 844, dpr: 3, mobile: true, throttle: 4 },
].filter((p) => !ONLY || p.name === ONLY);

// page-side counters, installed before any of the page's code
const COUNTERS = () => {
  window.__frames = []; window.__commits = []; window.__uploads = []; window.__longtasks = []; window.__gesture = 0;
  const f = (t) => { window.__frames.push(t); requestAnimationFrame(f); };
  requestAnimationFrame(f);
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__longtasks.push({ t: e.startTime, ms: e.duration }); }).observe({ type: "longtask", buffered: true }); } catch {}
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { supportsFiber: true, renderers: new Map(), isDisabled: false, inject() { return 1; }, onCommitFiberRoot() { window.__commits.push(performance.now()); }, onCommitFiberUnmount() {}, onPostCommitFiberRoot() {}, checkDCE() {}, onScheduleFiberRoot() {} };
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!C) continue;
    for (const m of ["texImage2D", "texSubImage2D", "compressedTexImage2D", "compressedTexSubImage2D", "texImage3D", "texSubImage3D"]) {
      const o = C.prototype[m];
      if (!o || o.__wrapped) continue;
      const w = function (...a) {
        const t0 = performance.now();
        const r = o.apply(this, a);
        const src = a.find((x) => x && typeof x === "object" && "width" in x && !(x instanceof ArrayBuffer) && !ArrayBuffer.isView(x));
        const nums = a.filter((x) => typeof x === "number");
        window.__uploads.push({ t: t0, ms: performance.now() - t0, m, w: src?.width ?? nums[3] ?? 0, h: src?.height ?? nums[4] ?? 0, kind: src ? src.constructor.name : "data", gesture: window.__gesture > 0 });
        return r;
      };
      w.__wrapped = true;
      C.prototype[m] = w;
    }
  }
};

const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"] });
const maps = new Map();
const consumer = async (url) => {
  if (maps.has(url)) return maps.get(url);
  let c = null;
  // the chunk names its map (Turbopack's map files are not <chunk>.map)
  try {
    const js = await (await fetch(url)).text(), m = js.match(/sourceMappingURL=(\S+)\s*$/);
    const r = m ? await fetch(new URL(m[1], url)) : null;
    if (r?.ok) c = new sm.SourceMapConsumer(await r.json());
  } catch {}
  maps.set(url, c);
  return c;
};
const nameOf = async (cf) => {
  if (!cf.url) return cf.functionName || "(native)";
  const c = /\/_next\//.test(cf.url) ? await consumer(cf.url) : null;
  const o = c?.originalPositionFor({ line: cf.lineNumber + 1, column: cf.columnNumber });
  if (o?.source) return `${o.name || cf.functionName || "(anon)"} ${o.source.replace(/^.*?(components|node_modules|app)\//, "$1/")}:${o.line}`;
  return `${cf.functionName || "(anon)"} ${cf.url.split("/").pop()}:${cf.lineNumber + 1}`;
};

const touchDrag = async (cdp, x0, y0, x1, y1, ms, steps = 16) => {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
  for (let k = 1; k <= steps; k++) {
    await new Promise((r) => setTimeout(r, ms / steps));
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + ((x1 - x0) * k) / steps, y: y0 + ((y1 - y0) * k) / steps }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
};
const mouseDrag = async (page, x0, y0, x1, y1, ms, steps = 16) => {
  await page.mouse.move(x0, y0); await page.mouse.down();
  for (let k = 1; k <= steps; k++) { await page.waitForTimeout(ms / steps); await page.mouse.move(x0 + ((x1 - x0) * k) / steps, y0 + ((y1 - y0) * k) / steps); }
  await page.mouse.up();
};

async function script(page, cdp, p, view, t0) {
  const at = async (s) => { const d = t0 + s * 1000 - Date.now(); if (d > 0) await page.waitForTimeout(d); };
  const gesture = (on) => page.evaluate((on) => { window.__gesture += on ? 1 : -1; }, on);
  const drag = async (x0, y0, x1, y1, ms) => { await gesture(true); if (p.mobile) await touchDrag(cdp, x0, y0, x1, y1, ms); else await mouseDrag(page, x0, y0, x1, y1, ms); await gesture(false); };
  const tap = async (x, y) => { await gesture(true); if (p.mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await gesture(false); };
  const hit = await page.evaluate(() => { const r = window.__rolodex.rig.hit.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height }; });
  if (view === "home") {
    for (let k = 0; k < 12; k++) {
      await at(k * 0.5);
      if (p.mobile) await drag(p.w * 0.85, p.h * 0.55, p.w * 0.85, p.h * 0.55 - 160, 180);
      else { await gesture(true); await page.mouse.move(hit.x, hit.y); await page.mouse.wheel(0, 100); await gesture(false); }
    }
    for (let k = 0; k < 3; k++) { await at(6.5 + k * 1.2); await drag(hit.x, hit.y - hit.h * 0.2, hit.x, hit.y + hit.h * 0.1, 400); }
    for (let k = 0; k < 2; k++) { await at(10.5 + k * 1.8); await drag(p.w * 0.12, p.h * 0.5, p.w * 0.12 + (k ? -1 : 1) * p.w * 0.3, p.h * 0.5, 600); }
    for (const s of [16, 18]) { await at(s); if (p.mobile) await drag(p.w * 0.85, p.h * 0.55, p.w * 0.85, p.h * 0.55 - 160, 180); else { await page.mouse.move(hit.x, hit.y); await page.mouse.wheel(0, 100); } }
  } else {
    const open = () => page.evaluate(() => window.__site.openFront());
    const mid = () => page.evaluate(() => window.__vinyl.coverPoint());
    const span = p.mobile ? 120 : 200, long = p.mobile ? 150 : 320;
    await at(0); await open();
    await at(3); { const m = await mid(); await drag(m.x, m.y, m.x + span, m.y, 600); }
    await at(5); { const m = await mid(); await drag(m.x, m.y, m.x - span, m.y, 600); }
    await at(7); { const m = await mid(); await tap(m.x, m.y); }
    await at(8.5); await page.keyboard.press("Escape");
    await at(9.5); await page.evaluate(() => window.__rolodex.jumpToRelease((window.__rolodex.rig.front + 5) % window.__rolodex.rig.N));
    await at(11); await open();
    await at(13); { const m = await mid(); await drag(m.x, m.y, m.x + long, m.y, 900); }
    await at(16); { const m = await mid(); await drag(m.x, m.y, m.x - long, m.y, 900); }
  }
  await at(SECS);
}

async function run(p, view, traced) {
  const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, isMobile: p.mobile, hasTouch: p.mobile });
  await ctx.addInitScript(() => { try { localStorage.setItem("gillenwebsite:guide-seen", "1"); localStorage.setItem("gillenwebsite:intro-seen", "1"); } catch {} });
  await ctx.addInitScript(COUNTERS);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`${BASE}/gillenwebsite`);
  await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.allSmall && window.__site, null, { timeout: 120000 });
  await page.waitForTimeout(2500);
  if (p.throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.throttle });
  if (traced) {
    await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 500 }); await cdp.send("Profiler.start");
    await browser.startTracing(page, { categories: ["devtools.timeline", "disabled-by-default-devtools.timeline", "v8", "v8.execute", "blink", "gpu"] });
  }
  const pt0 = await page.evaluate(() => performance.now());
  const t0 = Date.now();
  await script(page, cdp, p, view, t0);
  const pt1 = await page.evaluate(() => performance.now());
  let out;
  if (!traced) {
    out = await page.evaluate(([a, b]) => {
      const fr = window.__frames.filter((t) => t >= a && t <= b), d = fr.slice(1).map((t, k) => t - fr[k]);
      const up = window.__uploads.filter((u) => u.t >= a && u.t <= b), lt = window.__longtasks.filter((x) => x.t >= a && x.t <= b), cm = window.__commits.filter((t) => t >= a && t <= b);
      return {
        frames: d.length, over33: d.filter((x) => x > 33.4).length, over33Pct: +((100 * d.filter((x) => x > 33.4).length) / d.length).toFixed(2), fps: +((d.length * 1000) / (fr.at(-1) - fr[0])).toFixed(1), worstFrameMs: +Math.max(...d).toFixed(1),
        longTasks: lt.length, longTaskMs: lt.map((x) => Math.round(x.ms)),
        uploads: { count: up.length, inGesture: up.filter((u) => u.gesture).length, totalMs: +up.reduce((s, u) => s + u.ms, 0).toFixed(1), over4ms: up.filter((u) => u.ms > 4).map((u) => `${u.m} ${u.w}x${u.h} ${u.kind} ${u.ms.toFixed(1)}ms${u.gesture ? " (gesture)" : ""}`) },
        reactCommits: cm.length, commitsPerFrame: +(cm.length / d.length).toFixed(3),
        // each frame over 33 ms: when (s into the window), how long, and what ran in it (uploads, React commits)
        slowFrames: d.map((x, k) => [x, fr[k], fr[k + 1]]).filter(([x]) => x > 33.4).map(([x, s0, s1]) => ({ atS: +((s0 - a) / 1000).toFixed(2), ms: +x.toFixed(1), uploads: up.filter((u) => u.t >= s0 && u.t < s1).map((u) => `${u.w}x${u.h} ${u.ms.toFixed(1)}`), commits: cm.filter((t) => t >= s0 && t < s1).length, gesture: up.some((u) => u.t >= s0 && u.t < s1 && u.gesture) })),
      };
    }, [pt0, pt1]);
  } else {
    const { profile } = await cdp.send("Profiler.stop");
    const buf = await browser.stopTracing();
    const ev = JSON.parse(buf.toString()).traceEvents ?? JSON.parse(buf.toString());
    const names = new Map(ev.filter((e) => e.name === "thread_name").map((e) => [`${e.pid}:${e.tid}`, e.args.name]));
    const main = ev.filter((e) => e.ph === "X" && names.get(`${e.pid}:${e.tid}`) === "CrRendererMain");
    // the renderer that ran the page: the one with the most main-thread time
    const byPid = new Map(); for (const e of main) byPid.set(e.pid, (byPid.get(e.pid) ?? 0) + (e.dur ?? 0));
    const pid = [...byPid.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const mine = main.filter((e) => e.pid === pid).sort((a, b) => a.ts - b.ts || b.dur - a.dur);
    const tasks = mine.filter((e) => (e.name === "RunTask" || e.name === "ThreadControllerImpl::RunTask") && e.dur > TASK_MS * 1000);
    // profiler samples: absolute times
    const t = []; let acc = profile.startTime; for (const d of profile.timeDeltas) { acc += d; t.push(acc); }
    const node = new Map(profile.nodes.map((n) => [n.id, n]));
    const long = [];
    for (const k of tasks) {
      const inside = mine.filter((e) => e !== k && e.ts >= k.ts && e.ts + (e.dur ?? 0) <= k.ts + k.dur);
      // self time by event kind: each event's time less its directly nested events'
      const self = new Map();
      const stack = [];
      for (const e of inside) {
        while (stack.length && stack.at(-1).ts + stack.at(-1).dur <= e.ts) stack.pop();
        const parent = stack.at(-1);
        const label = e.name === "FunctionCall" ? `FunctionCall ${e.args?.data?.functionName || ""}` : e.name === "EventDispatch" ? `EventDispatch ${e.args?.data?.type}` : e.name;
        self.set(label, (self.get(label) ?? 0) + e.dur);
        if (parent) self.set(parent.label, (self.get(parent.label) ?? 0) - e.dur);
        e.label = label; stack.push(e);
      }
      const kinds = [...self.entries()].filter(([, v]) => v > 1000).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n, v]) => `${n} ${(v / 1000).toFixed(1)}ms`);
      const fn = new Map();
      for (let i = 0; i < t.length; i++) if (t[i] >= k.ts && t[i] <= k.ts + k.dur) { const n = node.get(profile.samples[i]); const key = n.callFrame; const id = `${key.url}|${key.lineNumber}|${key.columnNumber}|${key.functionName}`; fn.set(id, { cf: key, n: (fn.get(id)?.n ?? 0) + 1 }); }
      const top = [...fn.values()].sort((a, b) => b.n - a.n).slice(0, 4);
      const fns = []; for (const x of top) fns.push(`${await nameOf(x.cf)} ${(x.n * 0.5).toFixed(1)}ms`);
      long.push({ atS: +((k.ts - (t[0] ?? k.ts)) / 1e6).toFixed(2), ms: +(k.dur / 1000).toFixed(1), kinds, functions: fns });
    }
    // where all main-thread time in the window went, by function (self samples)
    const all = new Map();
    for (let i = 0; i < t.length; i++) { const n = node.get(profile.samples[i]); const cf = n.callFrame; if (["(idle)", "(program)", "(root)"].includes(cf.functionName)) continue; const id = `${cf.url}|${cf.lineNumber}|${cf.columnNumber}|${cf.functionName}`; all.set(id, { cf, n: (all.get(id)?.n ?? 0) + 1 }); }
    const topAll = []; for (const x of [...all.values()].sort((a, b) => b.n - a.n).slice(0, 12)) topAll.push(`${await nameOf(x.cf)} ${(x.n * 0.5).toFixed(0)}ms`);
    // garbage collection on the page's main thread over the window: count, total and longest pause, by kind
    const gcs = mine.filter((e) => /^(MinorGC|MajorGC|V8\.GC_SCAVENGER$|V8\.GC_MARK_COMPACTOR$|V8\.GCScavenger|V8\.GCCompactor)/.test(e.name));
    const gc = {}; for (const e of gcs) { const g = (gc[e.name] ??= { n: 0, ms: 0, maxMs: 0 }); g.n++; g.ms = +(g.ms + e.dur / 1000).toFixed(1); g.maxMs = Math.max(g.maxMs, +(e.dur / 1000).toFixed(1)); }
    out = { tracedLongTasks: long.length, longTasks: long, topFunctions: topAll, gc };
  }
  if (p.throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await ctx.close();
  return out;
}

const report = { base: BASE, at: new Date().toISOString(), seconds: SECS, profiles: {} };
for (const p of PROFILES) {
  report.profiles[p.name] = {};
  for (const v of VIEWS) {
    const clean = await run(p, v, false);
    const traced = TRACE ? await run(p, v, true) : null;
    report.profiles[p.name][v] = { ...clean, traced };
    console.log(p.name, v, JSON.stringify(clean));
    if (traced) console.log("  traced", JSON.stringify(traced).slice(0, 3000));
  }
}
await browser.close();
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
