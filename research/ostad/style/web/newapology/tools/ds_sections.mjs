// Interaction capture for davidshamiev.site (study notes only, nothing ships).
// The site is one route; its "pages" are overlay panels opened by clicking intro words (stack/projects/about/contact).
// capture.mjs only scrolls and hovers, so this script clicks each panel open, exercises it, and logs the same
// inline-style write stream (MutationObserver) plus document.getAnimations(), with phase marks and a video.
// usage: node ds_sections.mjs <width> <outdir>
import { createRequire } from "module";
import fs from "fs";
import path from "path";
const require = createRequire("C:/Users/naimj/aa-banner-tools/node_modules/");
const { chromium } = require("playwright");
const [widthArg, outdir] = process.argv.slice(2);
const W = +widthArg, H = W < 800 ? 844 : 900, mobile = W < 800;
fs.mkdirSync(outdir, { recursive: true });

const INIT = () => {
  const t0 = performance.now(), log = { styleWrites: [], anims: {}, raf: 0 };
  window.__cap = log; window.__t0 = t0;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { log.raf++; return raf(cb); };
  const sel = (el) => { let s = el.tagName.toLowerCase(); const c = el.getAttribute("class") || ""; if (c) s += "." + c.trim().split(/\s+/).slice(0, 3).join("."); return s; };
  window.__sel = sel;
  new MutationObserver((ms) => { const t = performance.now() - t0;
    for (const m of ms) { if (log.styleWrites.length > 80000) return; const st = m.target.getAttribute("style") || "";
      if (!/transform|opacity|filter|translate|scale|rotate|visibility/.test(st)) continue; const r = m.target.getBoundingClientRect();
      log.styleWrites.push({ t: +t.toFixed(1), el: sel(m.target), style: st.slice(0, 300), box: [r.x, r.y, r.width, r.height].map((v) => Math.round(v)) }); } })
    .observe(document, { attributes: true, attributeFilter: ["style"], subtree: true });
  setInterval(() => { for (const a of document.getAnimations()) { const e = a.effect, tg = e && e.target; const id = (a.animationName || a.transitionProperty || "anim") + "@" + (tg ? sel(tg) : "?");
    if (!log.anims[id]) { const tm = e.getTiming(); let kf = []; try { kf = e.getKeyframes(); } catch (_) {}
      log.anims[id] = { type: a.constructor.name, duration: tm.duration, delay: tm.delay, easing: tm.easing, keyframes: JSON.stringify(kf).slice(0, 500), first: +(performance.now() - t0).toFixed(0), seen: 0 }; }
    log.anims[id].seen++; } }, 50);
};

const browser = await chromium.launch({ executablePath: "C:/Users/naimj/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile,
  recordVideo: { dir: path.join(outdir, "video_sections"), size: { width: Math.min(W, 1280), height: Math.round(Math.min(W, 1280) * H / W) } } });
const page = await ctx.newPage();
await page.addInitScript(INIT);
const marks = [];
const mark = async (name) => marks.push({ name, t: await page.evaluate(() => performance.now() - window.__t0) });
await page.goto("https://davidshamiev.site/", { waitUntil: "networkidle", timeout: 90000 });
await mark("loaded"); await page.waitForTimeout(3000);
// mouse trail on the intro (canvas) and a straight sweep
if (!mobile) { await mark("sweep_start"); await page.mouse.move(200, 450); for (let i = 0; i <= 40; i++) { await page.mouse.move(200 + i * 25, 450 + Math.sin(i / 5) * 120); await page.waitForTimeout(16); } await mark("sweep_end"); await page.waitForTimeout(800); }
const click = async (cls) => { const el = await page.$(cls); if (!el) return false; const b = await el.boundingBox(); if (!b) return false;
  if (mobile) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); return true; };
const closeIt = async () => { await click(".close"); await page.waitForTimeout(1200); };

// projects panel: staggered scaleY reveal, then hover projects (cursor follower quickTo 0.6 s power3)
await mark("projects_open"); await click(".intro__sections--projects"); await page.waitForTimeout(3000); await mark("projects_settled");
if (!mobile) {
  const ps = await page.$$(".project");
  for (const p of ps.slice(0, 4)) { const b = await p.boundingBox(); if (!b) continue; await mark("proj_hover"); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 1 }); await page.waitForTimeout(1200); }
  // a step jump of the mouse inside one project, to measure the follower's step response
  const b = await ps[0].boundingBox(); await page.mouse.move(b.x + 20, b.y + 20); await page.waitForTimeout(1200); await mark("step_jump"); await page.mouse.move(b.x + 320, b.y + 20, { steps: 1 }); await page.waitForTimeout(1500); await mark("step_done");
}
await closeIt();
// about panel: images load, then each .thing tweens to a random spot (gsap.to defaults); then drag one
await mark("about_open"); await click(".intro__sections--about"); await page.waitForTimeout(4000); await mark("about_settled");
if (!mobile) { const t = await page.$(".thing"); const b = t && await t.boundingBox();
  if (b) { await mark("drag_start"); await page.mouse.move(b.x + b.width / 2, b.y + 20); await page.mouse.down(); for (let i = 0; i < 12; i++) { await page.mouse.move(b.x + b.width / 2 + i * 30, b.y + 20 + i * 8); await page.waitForTimeout(16); } await page.mouse.up(); await page.waitForTimeout(2000); await mark("drag_end"); } }
await closeIt();
// stack panel: bubbles pop on hover (CSS transition .1s ease, scale 1.5)
await mark("stack_open"); await click(".intro__sections--stack"); await page.waitForTimeout(1500);
if (!mobile) { const bs = await page.$$(".bubble"); for (const bb of bs.slice(0, 3)) { const b = await bb.boundingBox(); if (!b) continue; await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(600); } }
await mark("stack_done"); await closeIt();
// contact: staggered blur-rise of the links
await mark("contact_open"); await click(".intro__sections--contact"); await page.waitForTimeout(2500); await mark("contact_settled");
const log = await page.evaluate(() => window.__cap);
await ctx.close(); await browser.close();
const out = { site: "davidshamiev.site", width: W, height: H, marks, runtime: { ...log, styleWritesCount: log.styleWrites.length } };
fs.writeFileSync(path.join(outdir, `davidshamiev.site__sections_${W}.json`), JSON.stringify(out));
console.log(`sections ${W}: writes ${log.styleWrites.length}, anims ${Object.keys(log.anims).length}, raf ${log.raf}`);
