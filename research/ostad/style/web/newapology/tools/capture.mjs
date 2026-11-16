// Runtime ground truth for one route of newapology.com at one width. Study notes only: nothing from the site ships.
// usage: node capture.mjs <route> <width> <outdir>      e.g. node capture.mjs /work/auro 1440 ../runtime
// Records: every animation the page runs while it loads, scrolls slowly to the bottom, hovers each link/media element, and
// (on /work) clicks into a project. Sources:
//   - document.getAnimations() sampled every 50 ms (CSS animations/transitions + WAAPI: keyframes, timing, target)
//   - instrumented requestAnimationFrame / Element.animate / IntersectionObserver / scroll listeners (call counts)
//   - MutationObserver on inline style: every transform/opacity/clip/filter write with a timestamp, per element (rAF-driven
//     libraries such as GSAP / Lenis / framer-motion animate this way, so this yields their per-frame curves)
//   - computed geometry, spacing and type for visible elements; CSS @keyframes and declared transitions from the stylesheets
//   - a video of the session (Playwright, 25 fps) for visual reference
import { createRequire } from "module";
import fs from "fs";
import path from "path";
const require = createRequire("C:/Users/naimj/aa-banner-tools/node_modules/");
const { chromium } = require("playwright");

const [route, widthArg, outdir] = process.argv.slice(2);
const W = +widthArg, H = W < 800 ? 844 : 900, mobile = W < 800;
// route is a newapology.com path ("/work/auro") or a full URL of a linked live site ("https://march2004.com/about")
const FULL = /^https?:\/\//.test(route) ? route : "https://www.newapology.com" + route;
const U = new URL(FULL);
const slug = (/^https?:/.test(route) ? U.hostname.replace(/^www\./, "") + (U.pathname === "/" ? "" : U.pathname.replace(/\/$/, "").replace(/\//g, "__"))
  : (route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "__"))) + `_${W}`;
fs.mkdirSync(outdir, { recursive: true });

const INIT = () => {
  const t0 = performance.now(), log = { raf: 0, animate: [], io: 0, scrollListeners: 0, styleWrites: [], anims: {}, samples: 0 };
  window.__cap = log;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { log.raf++; return raf(cb); };
  const anim = Element.prototype.animate;
  Element.prototype.animate = function (k, o) { log.animate.push({ t: performance.now() - t0, el: sel(this), k: JSON.stringify(k).slice(0, 600), o: JSON.stringify(o) }); return anim.call(this, k, o); };
  const IO = window.IntersectionObserver;
  window.IntersectionObserver = function (cb, opt) { log.io++; log.ioOpts = (log.ioOpts || []).concat([JSON.stringify(opt || {})]).slice(0, 20); return new IO(cb, opt); };
  window.IntersectionObserver.prototype = IO.prototype;
  const ael = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, o) { if (type === "scroll" || type === "wheel") log.scrollListeners++; return ael.call(this, type, fn, o); };
  function sel(el) {
    if (!el || !el.tagName) return String(el);
    let s = el.tagName.toLowerCase(); if (el.id) s += "#" + el.id;
    const c = (el.getAttribute && el.getAttribute("class")) || ""; if (c) s += "." + c.trim().split(/\s+/).slice(0, 3).join(".");
    return s;
  }
  window.__sel = sel;
  const KEYS = /transform|opacity|clip-path|filter|translate|scale|rotate|width|height|top|left/;
  new MutationObserver((ms) => {
    const t = performance.now() - t0;
    for (const m of ms) {
      if (log.styleWrites.length > 60000) return;
      const st = m.target.getAttribute("style") || "";
      if (!KEYS.test(st)) continue;
      const r = m.target.getBoundingClientRect();
      log.styleWrites.push({ t: +t.toFixed(1), el: sel(m.target), style: st.slice(0, 300), box: [r.x, r.y, r.width, r.height].map((v) => Math.round(v)) });
    }
  }).observe(document, { attributes: true, attributeFilter: ["style"], subtree: true });
  setInterval(() => {
    log.samples++;
    for (const a of document.getAnimations()) {
      const e = a.effect, tgt = e && e.target, id = (a.animationName || a.transitionProperty || a.id || "anim") + "@" + (tgt ? sel(tgt) : "?");
      if (!log.anims[id]) {
        const tm = e && e.getTiming ? e.getTiming() : {};
        let kf = []; try { kf = e.getKeyframes(); } catch (_) {}
        log.anims[id] = { type: a.constructor.name, name: a.animationName || null, prop: a.transitionProperty || null, timeline: a.timeline && a.timeline.constructor.name,
          duration: tm.duration, delay: tm.delay, easing: tm.easing, iterations: tm.iterations, fill: tm.fill, keyframes: JSON.stringify(kf).slice(0, 800), first: +(performance.now() - t0).toFixed(0), seen: 0 };
      }
      log.anims[id].seen++;
    }
  }, 50);
};

const browser = await chromium.launch({ executablePath: "C:/Users/naimj/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile,
  recordVideo: { dir: path.join(outdir, "video"), size: { width: Math.min(W, 1280), height: Math.round(Math.min(W, 1280) * H / W) } } });
const page = await ctx.newPage();
await page.addInitScript(INIT);
const marks = [];
const mark = async (name) => marks.push({ name, t: await page.evaluate(() => performance.now()) });
await page.goto(FULL, { waitUntil: "networkidle", timeout: 90000 });
await mark("loaded"); await page.waitForTimeout(3500); await mark("settled");

// static facts: keyframes, transitions, spacing and type
const facts = await page.evaluate(() => {
  const kf = [], trans = new Set(), anims = new Set();
  for (const ss of document.styleSheets) { let rules; try { rules = ss.cssRules; } catch (_) { continue; }
    const walk = (rs) => { for (const r of rs) {
      if (r.type === 7) kf.push({ name: r.name, text: r.cssText.slice(0, 1200) });
      else if (r.cssRules) walk(r.cssRules);
      if (r.style) { if (r.style.transition) trans.add(r.selectorText + " { transition: " + r.style.transition + " }"); if (r.style.animation) anims.add(r.selectorText + " { animation: " + r.style.animation + " }"); }
    } }; walk(rules); }
  const els = [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const type = {}, spacing = {};
  for (const e of els) {
    const cs = getComputedStyle(e);
    if ([...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
      const k = `${cs.fontFamily.split(",")[0]} ${cs.fontSize}/${cs.lineHeight} ${cs.fontWeight} ls:${cs.letterSpacing} ${cs.textTransform} ${cs.color}`; type[k] = (type[k] || 0) + 1; }
    for (const p of ["paddingTop", "paddingLeft", "marginTop", "marginBottom", "gap", "rowGap", "columnGap", "borderRadius"]) {
      const v = cs[p]; if (v && v !== "0px" && v !== "normal") { spacing[p] = spacing[p] || {}; spacing[p][v] = (spacing[p][v] || 0) + 1; } }
  }
  const grid = els.filter((e) => /grid/.test(getComputedStyle(e).display)).slice(0, 15).map((e) => ({ el: window.__sel(e), cols: getComputedStyle(e).gridTemplateColumns, gap: getComputedStyle(e).gap, w: Math.round(e.getBoundingClientRect().width) }));
  const de = document.scrollingElement;
  return { title: document.title, url: location.href, docH: de.scrollHeight, vw: innerWidth, vh: innerHeight, elements: els.length,
    bodyBg: getComputedStyle(document.body).backgroundColor, scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    sticky: els.filter((e) => getComputedStyle(e).position === "sticky").length, fixed: els.filter((e) => getComputedStyle(e).position === "fixed").map((e) => window.__sel(e)).slice(0, 10),
    keyframes: kf, transitions: [...trans].slice(0, 80), animations: [...anims].slice(0, 80),
    type: Object.entries(type).sort((a, b) => b[1] - a[1]).slice(0, 25), spacing, grid,
    media: { img: document.images.length, video: document.querySelectorAll("video").length, canvas: document.querySelectorAll("canvas").length },
    links: [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).filter((v, i, s) => s.indexOf(v) === i) };
});

// slow scroll to the bottom (wheel, so scroll-jacking libraries respond), then back to top
await mark("scroll_start");
for (let i = 0; i < 400; i++) {
  await page.mouse.move(W / 2, H / 2); await page.mouse.wheel(0, 120); await page.waitForTimeout(90);
  const done = await page.evaluate(() => innerHeight + scrollY >= document.scrollingElement.scrollHeight - 4);
  if (done && i > 3) break;
}
await page.waitForTimeout(2000); await mark("scroll_end");
// hover links and media (desktop only)
if (!mobile) {
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(1500); await mark("hover_start");
  const targets = await page.$$("a, img, video, button");
  let n = 0;
  for (const t of targets) { if (n >= 30) break; const b = await t.boundingBox(); if (!b || b.y > H || b.width < 8) continue;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 }); await page.waitForTimeout(700); n++; }
  await mark("hover_end");
}
// page transition: from /work click the first project
if (route === "/work" || process.env.CLICK_FIRST) {
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(1000); await mark("click_start");
  const a = await page.$('a[href^="/work/"]'); if (a) { await a.click(); await page.waitForTimeout(4000); } await mark("click_end");
}
const log = await page.evaluate(() => window.__cap);
await ctx.close(); await browser.close();
const out = { route, width: W, height: H, captured: new Date().toISOString(), marks, facts, runtime: { ...log, styleWritesCount: log.styleWrites.length } };
fs.writeFileSync(path.join(outdir, slug + ".json"), JSON.stringify(out));
console.log(`${slug}: anims ${Object.keys(log.anims).length}, raf ${log.raf}, animate ${log.animate.length}, styleWrites ${log.styleWrites.length}, io ${log.io}, docH ${facts.docH}, keyframes ${facts.keyframes.length}`);
