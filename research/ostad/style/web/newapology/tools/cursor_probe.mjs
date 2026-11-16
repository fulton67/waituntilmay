// usage: node cursor_probe.mjs <out.json>
// Video cursor probe for /work/pavlo-lotnik at 1440 (study notes only). Samples the floating cursor pill each rAF vs pointer.
import { createRequire } from "module"; import fs from "fs";
const require = createRequire("C:/Users/naimj/aa-banner-tools/node_modules/");
const { chromium } = require("playwright");
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: "C:/Users/naimj/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => { const t0 = performance.now(); const L = { f: [], m: [], on: false }; window.__c = L;
  addEventListener("pointermove", (e) => L.on && L.m.push([performance.now() - t0, e.clientX, e.clientY]), { capture: true });
  const loop = () => { if (L.on) { const c = document.querySelector('.case-video-cursor[data-cursor-floating="true"]'), ctl = document.querySelector(".case-video-control");
    if (c) { const r = c.getBoundingClientRect(), cs = getComputedStyle(c); L.f.push([performance.now() - t0, r.x + r.width / 2, r.y + r.height / 2, +cs.opacity, Math.round(r.width), Math.round(r.height), c.dataset.cursorVisible, ctl && ctl.dataset.cursorActive, c.style.cssText.slice(0, 80), c.textContent.length, document.querySelector(".case-video video") ? document.querySelector(".case-video video").paused : null]); } }
    requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
await page.goto("https://www.newapology.com/work/pavlo-lotnik", { waitUntil: "load" }); await page.waitForTimeout(3000);
const y = await page.evaluate(() => { const r = document.querySelector(".case-video-control").getBoundingClientRect(); return r.top + scrollY - (innerHeight - r.height) / 2; });
await page.evaluate((y) => window.scrollTo(0, y), y);
for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 1); await page.waitForTimeout(100); }
await page.waitForTimeout(2500);
const b = await (await page.$(".case-video-control")).boundingBox();
const marks = []; const mk = async (n) => marks.push([n, await page.evaluate(() => performance.now())]);
await page.mouse.move(b.x - 50, b.y + b.height / 2); await page.evaluate(() => (window.__c.on = true)); await page.waitForTimeout(300);
await mk("enter"); await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.5); await page.waitForTimeout(600);
await mk("jump"); await page.mouse.move(b.x + b.width * 0.7, b.y + b.height * 0.5); await page.waitForTimeout(600);
await mk("sweep"); await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.3, { steps: 20 }); await page.waitForTimeout(500);
await mk("click"); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(800);
await mk("click2"); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(800);
await mk("leave"); await page.mouse.move(b.x - 60, b.y + b.height / 2); await page.waitForTimeout(600);
const L = await page.evaluate(() => window.__c); await browser.close();
fs.writeFileSync(out, JSON.stringify({ box: b, marks, ...L })); console.log("frames", L.f.length, "moves", L.m.length);
