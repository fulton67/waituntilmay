// Per-frame sampler for newapology.com case-study pages. Study notes only, nothing ships.
// usage: node frames_case.mjs <route> <width> <outdir>   (writes frames_<slug>_<width>.json)
// Same launch settings as ref/newapology/tools/capture.mjs. Samples computed styles every rAF for the
// case-study motion targets (arrival stagger, gallery reveals, sticky title, next-project reveal, pull,
// external-link pill, video cursor) and logs Lenis scrollY per frame for a single wheel tick.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
const require = createRequire("C:/Users/naimj/aa-banner-tools/node_modules/");
const { chromium } = require("playwright");
const [route, widthArg, outdir] = process.argv.slice(2);
const W = +widthArg, H = W < 800 ? 844 : 900, mobile = W < 800;
const FULL = "https://www.newapology.com" + route;
fs.mkdirSync(outdir, { recursive: true });

const INIT = () => {
  const t0 = performance.now();
  const L = { frames: [], mouse: [], modes: {}, anims: [], url: [] };
  window.__f = L;
  const ty = (cs) => { const m = cs.transform; if (!m || m === "none") return 0; const v = m.match(/\(([^)]+)\)/)[1].split(",").map(Number); return v.length === 6 ? v[5] : v[13]; };
  const r1 = (v) => Math.round(v * 1000) / 1000;
  addEventListener("pointermove", (e) => L.mouse.push([r1(performance.now() - t0), e.clientX, e.clientY]), { capture: true, passive: true });
  const loop = () => {
    const m = L.modes, t = r1(performance.now() - t0), f = { t, y: r1(scrollY) };
    if (m.reveal) f.rv = [...document.querySelectorAll(".case-reveal")].slice(0, 12).map((e) => { const cs = getComputedStyle(e); return [r1(+cs.opacity), r1(ty(cs))]; });
    if (m.gallery) f.g = [...document.querySelectorAll(".case-gallery-item, .case-credits")].map((e) => { const cs = getComputedStyle(e), r = e.getBoundingClientRect(); return [Math.round(r.top - ty(cs)), r1(+cs.opacity), r1(ty(cs)), e.dataset.inView === "true" ? 1 : 0]; });
    if (m.sticky) { const s = document.querySelector(".case-sticky"), o = document.querySelector(".case-offerings"), slot = document.getElementById(mobileSlot() ? "nap-project-mobile-slot" : "nap-project-nav-slot");
      if (s) { const cs = getComputedStyle(s); f.st = [s.dataset.visible === "true" ? 1 : 0, r1(+cs.opacity), r1(ty(cs)), o ? Math.round(o.getBoundingClientRect().bottom) : null, slot ? r1(slot.getBoundingClientRect().width) : null, s.dataset.footerNear === "true" ? 1 : 0]; } }
    if (m.next) { const n = document.querySelector(".case-next"); if (n) { const rv = n.querySelector(".case-next__reveal"), hd = n.querySelector(".case-next__heading"), lk = n.querySelector(".case-next__link"); const a = getComputedStyle(rv), b = getComputedStyle(hd), c = getComputedStyle(lk);
      f.nx = [n.dataset.phase, n.style.getPropertyValue("--next-pull"), a.translate, a.scale, r1(+b.opacity), r1(ty(b)), r1(ty(c)), Math.round(document.documentElement.scrollHeight - scrollY - innerHeight), Math.round(rv.getBoundingClientRect().width)]; } }
    if (m.ext) { const e = document.querySelector(".case-heading .case-external__label"); if (e) { const cs = getComputedStyle(e); f.ex = [r1(e.getBoundingClientRect().width), r1(+cs.opacity)]; } }
    if (m.cursor) { const c = document.querySelector(".case-video-cursor"); if (c) { const r = c.getBoundingClientRect(), cs = getComputedStyle(c); f.cu = [r1(r.x + r.width / 2), r1(r.y + r.height / 2), r1(+cs.opacity), Math.round(r.width), cs.translate, cs.transform.slice(0, 60)]; } }
    if (Object.keys(m).some((k) => m[k])) L.frames.push(f);
    requestAnimationFrame(loop);
  };
  const mobileSlot = () => !matchMedia("(min-width: 1001px)").matches;
  requestAnimationFrame(loop);
  L.modes.reveal = true;
  setTimeout(() => { L.modes.reveal = false; }, 4000);
  // dump running animations every 50 ms when asked (page transition)
  setInterval(() => { if (!L.modes.anims) return; const t = r1(performance.now() - t0);
    for (const a of document.getAnimations()) { const e = a.effect, tg = e && e.target, tm = e && e.getTiming ? e.getTiming() : {};
      L.anims.push([t, a.animationName || a.transitionProperty || a.id || a.constructor.name, tg ? (tg.tagName + "." + (tg.getAttribute && tg.getAttribute("class") || "").split(" ").slice(0, 2).join(".")) : (e && e.pseudoElement) || "?", e && e.pseudoElement, tm.duration, tm.delay, tm.easing, r1(a.currentTime || 0), a.playState]); } }, 50);
};

const browser = await chromium.launch({ executablePath: "C:/Users/naimj/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
const page = await ctx.newPage();
await page.addInitScript(INIT);
const marks = [];
const now = () => page.evaluate(() => performance.now());
const mark = async (name, extra) => marks.push({ name, t: await now(), ...(extra || {}) });
const mode = (o) => page.evaluate((o) => Object.assign(window.__f.modes, o), o);
const wait = (ms) => page.waitForTimeout(ms);

await page.goto(FULL, { waitUntil: "load", timeout: 90000 });
await mark("load");
const nav = await page.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; const p = performance.getEntriesByType("paint"); return { dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, paint: p.map((x) => [x.name, x.startTime]) }; });
await wait(4500); await mark("settled");
const vars = await page.evaluate(() => { const cs = getComputedStyle(document.documentElement); const out = {}; for (const k of ["--nap-ease", "--nap-expand-time", "--nap-expand-ease", "--nap-gutter", "--nap-media-gap", "--nap-columns", "--nap-gap", "--nap-unit", "--nap-wide", "--nap-narrow", "--nap-pill-height", "--nap-pill-radius", "--nap-copy-leading", "--nap-leading-small", "--nap-color-glass", "--nap-ink", "--nap-color-muted"]) out[k] = cs.getPropertyValue(k).trim();
  const q = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height), font: c.fontSize + "/" + c.lineHeight + " " + c.fontWeight + " " + c.fontFamily.split(",")[0], ls: c.letterSpacing, color: c.color, pad: c.padding, margin: c.margin, gap: c.gap, radius: c.borderRadius }; };
  const sel = [".case-study", ".case-heading", ".case-heading h1", ".case-heading__caption", ".case-link-enter", ".case-offerings", ".case-offerings .nap-pill", ".case-hero", ".case-prose--intro", ".case-gallery", ".case-gallery-item", ".case-pair", ".case-credits", ".case-credits h3", ".case-credits p", ".case-next", ".case-next__stage", ".case-next__label", ".case-next__title", ".case-next__reveal", ".case-sticky", ".nap-footer"];
  const o = {}; for (const s of sel) o[s] = q(s);
  o.items = [...document.querySelectorAll(".case-gallery-item")].map((e) => { const r = e.getBoundingClientRect(); return [e.dataset.blockType, Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height), e.querySelectorAll("video").length, e.querySelectorAll("img").length]; });
  o.docH = document.documentElement.scrollHeight; o.vh = innerHeight;
  return { vars: out, geo: o, videos: [...document.querySelectorAll("video")].map((v) => ({ autoplay: v.autoplay, loop: v.loop, muted: v.muted, controls: v.controls, preload: v.preload, paused: v.paused, playsInline: v.playsInline, cls: v.parentElement && v.parentElement.className })) };
});

// 1. Lenis single wheel tick (100 px delta) from rest
await page.mouse.move(W / 2, H / 2);
await mode({ sticky: true }); await mark("tick_start"); await page.mouse.wheel(0, 100); await wait(1600); await mark("tick_end");
// 2. slow scroll to bottom: 100 px every 140 ms
await mode({ gallery: true, sticky: true, next: true }); await mark("scroll_start");
for (let i = 0; i < 400; i++) { await page.mouse.wheel(0, 100); await wait(140); const d = await page.evaluate(() => document.documentElement.scrollHeight - scrollY - innerHeight); if (d <= 1 && i > 3) break; }
await mark("bottom"); await wait(2000); await mark("bottom_settled");
// 3. scroll up 400 (next hides), then back down
await page.mouse.wheel(0, -400); await wait(1500); await mark("up_done");
for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 100); await wait(140); }
await wait(2000); await mark("down_done");
await mode({ gallery: false });
const videosLater = await page.evaluate(() => [...document.querySelectorAll("video")].map((v) => ({ autoplay: v.autoplay, loop: v.loop, muted: v.muted, controls: v.controls, preload: v.preload, paused: v.paused, playsInline: v.playsInline, src: (v.currentSrc || v.src || "").slice(0, 60), parent: v.closest(".case-gallery-item,.case-hero,.case-next") ? v.closest(".case-gallery-item,.case-hero,.case-next").className.split(" ")[0] : "" })));
// 4. back to top for hovers
await page.evaluate(() => { window.scrollTo(0, 0); }); await wait(300);
for (let i = 0; i < 60; i++) { await page.mouse.wheel(0, -2000); await wait(30); }
await wait(1500); await mark("top");
if (!mobile) {
  const ext = await page.$(".case-heading .case-external");
  if (ext) { const b = await ext.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y - 120); await mode({ ext: true }); await wait(300); await mark("ext_in");
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await wait(900); await mark("ext_out"); await page.mouse.move(b.x + b.width / 2, b.y - 120); await wait(900); await mode({ ext: false }); }
  const vc = await page.$(".case-video-control");
  if (vc) { await vc.scrollIntoViewIfNeeded(); await wait(1500); const b = await vc.boundingBox(); await page.mouse.move(b.x - 40, b.y + b.height / 2); await mode({ cursor: true }); await wait(300); await mark("cursor_in");
    await page.mouse.move(b.x + b.width * 0.25, b.y + b.height * 0.5, { steps: 1 }); await wait(700); await mark("cursor_jump");
    await page.mouse.move(b.x + b.width * 0.75, b.y + b.height * 0.5, { steps: 1 }); await wait(900); await mark("cursor_sweep");
    await page.mouse.move(b.x + b.width * 0.25, b.y + b.height * 0.3, { steps: 30 }); await wait(700); await mark("cursor_click");
    await page.mouse.down(); await page.mouse.up(); await wait(900);
    await page.mouse.move(b.x - 60, b.y + b.height / 2, { steps: 1 }); await wait(700); await mark("cursor_out"); await mode({ cursor: false }); }
}
// 5. bottom again, then pull to next project
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await wait(300);
for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 2000); await wait(30); }
await mode({ next: true, anims: true }); await wait(2500); await mark("pull_ready");
const pre = await page.evaluate(() => JSON.parse(JSON.stringify(window.__f)));
const from = page.url();
for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 12); await mark("pull_wheel", { dy: 12 }); await wait(80); if (page.url() !== from) break; }
await wait(3000); await mark("after_pull", { url: page.url() });
await mode({ next: false, anims: false, sticky: false });
let L = await page.evaluate(() => window.__f);
const spa = L.frames.length >= pre.frames.length;
if (!spa) L = { ...pre, postNav: L };
marks.push({ name: "spa_nav", value: spa });
await browser.close();
const slug = route.replace(/^\//, "").replace(/\//g, "__") + "_" + W;
fs.writeFileSync(path.join(outdir, "frames_" + slug + ".json"), JSON.stringify({ route, width: W, height: H, captured: new Date().toISOString(), nav, marks, vars, videosLater, ...L }));
console.log(slug, "frames", L.frames.length, "mouse", L.mouse.length, "anims", L.anims.length, "url", page.url());
