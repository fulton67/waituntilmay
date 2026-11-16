// Study-only measurement of newapology.com: Lenis wheel response and /work -> project transition. Nothing ships.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
const require = createRequire("C:/Users/naimj/aa-banner-tools/node_modules/");
const { chromium } = require("playwright");
const [mode, widthArg, outdir] = process.argv.slice(2);
const W = +widthArg, H = W < 800 ? 844 : 900, mobile = W < 800;
fs.mkdirSync(outdir, { recursive: true });
const INIT = () => {
  const t0 = 0; const S = { frames: [], wheels: [], anims: [], clicks: [], vtStart: null };
  window.__m = S;
  const sel = (el) => { if (!el || !el.tagName) return String(el); let s = el.tagName.toLowerCase(); const c = el.getAttribute("class") || ""; if (c) s += "." + c.trim().split(/\s+/).slice(0, 3).join("."); return s; };
  const seen = new WeakSet();
  addEventListener("wheel", (e) => S.wheels.push({ t: performance.now(), dy: e.deltaY, ts: e.timeStamp }), { capture: true, passive: true });
  addEventListener("click", (e) => S.clicks.push({ t: performance.now(), el: sel(e.target) }), { capture: true });
  const loop = (now) => {
    const f = { t: now, y: scrollY, mode: document.documentElement.dataset.projectTransitionMode || null, vt: document.documentElement.dataset.projectTransition || null, path: location.pathname };
    try {
      for (const a of document.getAnimations()) {
        if (!seen.has(a)) { seen.add(a); const e = a.effect; let kf = []; try { kf = e.getKeyframes(); } catch (_) {}
          const tm = e.getTiming();
          S.anims.push({ seen: now, startTime: a.startTime, name: a.animationName || a.transitionProperty || a.id || a.constructor.name, pseudo: e.pseudoElement || null, target: sel(e.target), duration: tm.duration, delay: tm.delay, easing: tm.easing, kf: JSON.stringify(kf).slice(0, 1500) }); }
      }
      const ov = [...document.body.children].filter((c) => c.style && c.style.position === "fixed" && (c.style.zIndex === "200" || c.style.zIndex === "201"));
      if (ov.length) f.ov = ov.map((c) => { const r = c.getBoundingClientRect(); return { z: c.style.zIndex, tf: getComputedStyle(c).transform, r: [r.x, r.y, r.width, r.height].map((v) => +v.toFixed(2)), br: getComputedStyle(c).borderRadius }; });
      const hero = document.querySelector(".case-hero"); if (hero) { const r = hero.getBoundingClientRect(); f.hero = [r.x, r.y, r.width, r.height].map((v) => +v.toFixed(1)); f.heroOp = getComputedStyle(hero).opacity; }
    } catch (_) {}
    S.frames.push(f);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};
const browser = await chromium.launch({ executablePath: "C:/Users/naimj/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
const page = await ctx.newPage();
await page.addInitScript(INIT);
const cdp = await ctx.newCDPSession(page);
const shots = []; let shooting = false;
cdp.on("Page.screencastFrame", async (f) => { if (shooting) shots.push({ ts: f.metadata.timestamp, data: f.data }); try { await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch (_) {} });
const now = () => page.evaluate(() => performance.now());
const marks = [];
const mark = async (n) => marks.push({ n, t: await now(), wall: Date.now() / 1000 });
if (mode === "lenis") {
  await page.goto("https://www.newapology.com/about", { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(4000);
  await page.mouse.move(W / 2, H / 2);
  await mark("single"); await page.mouse.wheel(0, 100); await page.waitForTimeout(1800);
  await mark("single2"); await page.mouse.wheel(0, 300); await page.waitForTimeout(1800);
  await mark("train"); for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 100); await page.waitForTimeout(50); } await page.waitForTimeout(2000);
  await mark("end");
} else if (mode === "click") {
  await page.goto("https://www.newapology.com/work", { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(4000);
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 70, everyNthFrame: 1 });
  shooting = true;
  const a = await page.$('a[href^="/work/"]');
  const b = await a.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 }); await page.waitForTimeout(600);
  await mark("click"); 
  if (mobile) await page.tap(`a[href="${await a.getAttribute("href")}"]`); else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(3500); await mark("end");
  shooting = false; await cdp.send("Page.stopScreencast");
  marks.push({ n: "cardbox", box: b, href: await page.evaluate(() => location.pathname) });
} else if (mode === "next") {
  await page.goto("https://www.newapology.com/work/et-al", { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(3000); await page.mouse.move(W / 2, H / 2);
  for (let i = 0; i < 300; i++) { await page.mouse.wheel(0, 400); await page.waitForTimeout(60);
    if (await page.evaluate(() => innerHeight + scrollY >= document.scrollingElement.scrollHeight - 4) && i > 3) break; }
  await page.waitForTimeout(1500);
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 70, everyNthFrame: 1 }); shooting = true;
  await mark("pull");
  for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, 30); await page.waitForTimeout(40); }
  await page.waitForTimeout(3500); await mark("end"); shooting = false; await cdp.send("Page.stopScreencast");
  marks.push({ n: "where", href: await page.evaluate(() => location.pathname) });
} else if (mode === "load") {
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 70, everyNthFrame: 1 }); shooting = true;
  await page.goto("https://www.newapology.com/", { waitUntil: "commit", timeout: 90000 });
  await page.waitForTimeout(6000); await mark("end"); shooting = false; await cdp.send("Page.stopScreencast");
}
const m = await page.evaluate(() => window.__m);
const navStart = await page.evaluate(() => performance.timeOrigin / 1000);
fs.mkdirSync(path.join(outdir, `${mode}_${W}_frames`), { recursive: true });
shots.forEach((s, i) => fs.writeFileSync(path.join(outdir, `${mode}_${W}_frames`, `f${String(i).padStart(4, "0")}_${((s.ts - navStart) * 1000).toFixed(0)}.jpg`), Buffer.from(s.data, "base64")));
fs.writeFileSync(path.join(outdir, `${mode}_${W}.json`), JSON.stringify({ mode, W, H, marks, navStart, shots: shots.map((s) => +((s.ts - navStart) * 1000).toFixed(1)), m }));
await browser.close();
console.log(mode, W, "frames", m.frames.length, "anims", m.anims.length, "shots", shots.length, "wheels", m.wheels.length);
