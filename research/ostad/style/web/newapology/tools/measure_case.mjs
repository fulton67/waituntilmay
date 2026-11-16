// Per-frame measurement of a /work/<slug> case-study page. Study notes only: nothing from the site ships.
// usage: node measure_case.mjs <route> <width> <outdir> [pull]
// Same browser/launch settings as capture.mjs. Records, every requestAnimationFrame:
//   A. load: opacity + translateY of every .case-reveal element and every .case-gallery-item for 3 s
//   B. slow wheel scroll (120 px / 90 ms, as capture.mjs): scrollY, and for gallery items / credits / sticky / case-next:
//      opacity, transform/translate/scale, viewport top, data-in-view / data-visible / data-phase (only when changed)
//   C. (pull) at the bottom: wait, then wheel 30 px / 50 ms to drive the next-project pull, sampling --next-pull,
//      the link transform and document.getAnimations() (incl. view-transition pseudos) for 2.5 s
// Plus a geometry dump (document-y, height, width of every structural block) after load.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
const require = createRequire("C:/Users/naimj/aa-banner-tools/node_modules/");
const { chromium } = require("playwright");

const [route, widthArg, outdir, pullArg] = process.argv.slice(2);
const W = +widthArg, H = W < 800 ? 844 : 900, mobile = W < 800;
const FULL = "https://www.newapology.com" + route;
const slug = route.replace(/^\//, "").replace(/\//g, "__") + `_${W}`;
fs.mkdirSync(outdir, { recursive: true });

const INIT = () => {
  const t0 = performance.now();
  const S = { frames: [], track: [], on: false, until: 0, mode: "" };
  window.__m = S;
  const sel = (el) => { let s = el.tagName.toLowerCase(); const c = el.getAttribute("class") || ""; if (c) s += "." + c.trim().split(/\s+/).slice(0, 2).join("."); return s; };
  const ty = (cs) => { const m = cs.transform; if (!m || m === "none") return 0; const v = m.match(/matrix\(([^)]+)\)/); if (v) return +v[1].split(",")[5]; const v3 = m.match(/matrix3d\(([^)]+)\)/); return v3 ? +v3[1].split(",")[13] : 0; };
  const last = new Map();
  function frame() {
    if (!S.on) return;
    const t = +(performance.now() - t0).toFixed(1);
    const row = { t, y: Math.round(scrollY * 10) / 10, e: {} };
    S.track.forEach((el, i) => {
      if (!el.isConnected) return;
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      const v = [ +(+cs.opacity).toFixed(4), +ty(cs).toFixed(3), cs.translate, cs.scale, Math.round(r.top), Math.round(r.width * 10) / 10,
        el.dataset.inView || "", el.dataset.visible || "", el.dataset.phase || "", cs.visibility, el.style.getPropertyValue("--next-pull") || "" ];
      const k = JSON.stringify(v.filter((_, j) => j !== 4));
      if (last.get(i) !== k || S.mode === "all") { row.e[i] = v; last.set(i, k); }
    });
    if (S.anims) row.a = document.getAnimations().map((a) => { const e = a.effect, ct = e.getComputedTiming(); return [a.animationName || a.transitionProperty || "anim", e.pseudoElement || (e.target ? sel(e.target) : ""), +(ct.progress ?? -1).toFixed(4), Math.round(a.currentTime || 0)]; });
    S.frames.push(row);
    if (performance.now() - t0 < S.until) requestAnimationFrame(frame); else S.on = false;
  }
  S.start = (selectors, ms, mode) => {
    S.track = [...document.querySelectorAll(selectors)]; S.names = S.track.map(sel); S.mode = mode || ""; last.clear();
    S.until = performance.now() - t0 + ms; if (!S.on) { S.on = true; requestAnimationFrame(frame); }
  };
  S.t = () => performance.now() - t0;
  document.addEventListener("DOMContentLoaded", () => S.start(".case-reveal, .case-gallery-item, .case-credits", 3000, "all"));
};

const browser = await chromium.launch({ executablePath: "C:/Users/naimj/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
const page = await ctx.newPage();
await page.addInitScript(INIT);
const out = { route, width: W, height: H, captured: new Date().toISOString(), phases: {} };
await page.goto(FULL, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(3200);
out.phases.load = await page.evaluate(() => ({ names: __m.names, frames: __m.frames.splice(0) }));
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(800);

out.geometry = await page.evaluate(() => {
  const g = (el) => { const r = el.getBoundingClientRect(); return { el: el.tagName.toLowerCase() + "." + (el.getAttribute("class") || "").split(/\s+/).slice(0, 2).join("."), type: el.dataset.blockType || null, y: Math.round(r.top + scrollY), h: Math.round(r.height), x: Math.round(r.left), w: Math.round(r.width) }; };
  const q = ".case-heading, .case-heading h1, .case-heading__caption, .case-link-enter, .case-offerings, .case-offerings .nap-pill, .case-hero, .case-prose, .case-gallery-item, .case-gallery-item .case-media, .case-credits, .case-credits__list > div, .case-next, .case-next__stage, .case-next__reveal, .case-next__cover, .case-next__heading, footer, .nap-footer, header.nap-header, .case-sticky";
  return { docH: document.scrollingElement.scrollHeight, vh: innerHeight, blocks: [...document.querySelectorAll(q)].map(g),
    videos: [...document.querySelectorAll("video")].map((v) => ({ src: (v.currentSrc || v.src || "").slice(0, 120), autoplay: v.autoplay, loop: v.loop, muted: v.muted, paused: v.paused, w: v.videoWidth, h: v.videoHeight, dur: v.duration, poster: !!v.poster, cls: v.parentElement.className })),
    imgs: [...document.querySelectorAll(".case-study img")].map((i) => ({ w: i.naturalWidth, h: i.naturalHeight, loading: i.loading, src: (i.currentSrc || "").replace(/\?.*/, "").slice(-40) })) };
});

// B. scroll
await page.evaluate(() => __m.start(".case-gallery-item, .case-credits, .case-sticky, #nap-project-nav-slot, #nap-project-mobile-slot, .nap-header-actions, .case-next, .case-next__reveal, .case-next__heading, .case-next__link, .case-prose", 600000));
const tScroll = await page.evaluate(() => __m.t());
const wheels = [];
for (let i = 0; i < 400; i++) {
  await page.mouse.move(W / 2, H / 2); wheels.push(await page.evaluate(() => __m.t())); await page.mouse.wheel(0, 120); await page.waitForTimeout(90);
  const done = await page.evaluate(() => innerHeight + scrollY >= document.scrollingElement.scrollHeight - 4);
  if (done && i > 3) break;
}
await page.waitForTimeout(2500);
out.phases.scroll = await page.evaluate(() => ({ names: __m.names, frames: __m.frames.splice(0) }));
out.phases.scroll.tStart = tScroll; out.phases.scroll.wheels = wheels;

// C. pull to next project
if (pullArg) {
  await page.evaluate(() => { __m.anims = true; __m.start(".case-next, .case-next__link, .case-next__reveal, .case-study", 6000); });
  const t = [];
  await page.waitForTimeout(600);
  for (let i = 0; i < 6; i++) { t.push(await page.evaluate(() => __m.t())); await page.mouse.wheel(0, 30); await page.waitForTimeout(50); }
  await page.waitForTimeout(3000);
  out.phases.pull = await page.evaluate(() => ({ names: __m.names, frames: (__m.frames || []).splice(0), url: location.href }));
  out.phases.pull.wheels = t;
}
await ctx.close(); await browser.close();
fs.writeFileSync(path.join(outdir, "measure_" + slug + ".json"), JSON.stringify(out));
console.log(slug, "load", out.phases.load.frames.length, "scroll", out.phases.scroll.frames.length, "pull", out.phases.pull ? out.phases.pull.frames.length + " " + out.phases.pull.url : "-");
