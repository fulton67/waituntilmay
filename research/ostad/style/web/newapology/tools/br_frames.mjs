// Frame study helper for bentleyrawle.com (study notes only, nothing ships).
// Records a video into its own folder and logs wall-clock marks relative to the video start, so frames can be cut
// at known moments: home hover-to-video swap (desktop), a project page load + scroll (title marquee, image stack),
// and the hamburger menu open. usage: node br_frames.mjs <width> <outdir>
import { createRequire } from "module";
import fs from "fs";
import path from "path";
const require = createRequire("C:/Users/naimj/aa-banner-tools/node_modules/");
const { chromium } = require("playwright");
const [widthArg, outdir] = process.argv.slice(2);
const W = +widthArg, H = W < 800 ? 844 : 900, mobile = W < 800;
const vdir = path.join(outdir, `video_${W}`);
fs.mkdirSync(vdir, { recursive: true });
const browser = await chromium.launch({ executablePath: "C:/Users/naimj/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile,
  recordVideo: { dir: vdir, size: { width: Math.min(W, 1280), height: Math.round(Math.min(W, 1280) * H / W) } } });
const T0 = Date.now();
const marks = [];
const mark = (name, extra = {}) => { marks.push({ name, t: (Date.now() - T0) / 1000, ...extra }); };
const page = await ctx.newPage();
await page.goto("https://bentleyrawle.com/", { waitUntil: "domcontentloaded", timeout: 120000 });
mark("home_dcl"); await page.waitForTimeout(9000); mark("home_wait_done");
if (!mobile) {
  const links = await page.$$("#desktop-homepage a[data-video]");
  for (const a of links.slice(0, 4)) {
    const b = await a.boundingBox(); if (!b) continue;
    mark("hover_in", { label: (await a.innerText()).slice(0, 40), box: [b.x, b.y, b.width, b.height].map(Math.round) });
    await page.mouse.move(b.x + 40, b.y + b.height / 2, { steps: 1 }); await page.waitForTimeout(2500);
    mark("hover_out"); await page.mouse.move(W - 20, H - 20, { steps: 1 }); await page.waitForTimeout(1200);
  }
} else { mark("m_scroll"); for (let i = 0; i < 25; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(120); } await page.waitForTimeout(1500); }
// click into a project (client-side Cargo navigation via rel=history)
const first = await page.$(mobile ? "#mobile-homepage a[href]" : "#desktop-homepage a[data-video]");
if (first) { mark("click_project", { href: await first.getAttribute("href") }); try { await first.click({ timeout: 8000 }); } catch (e) { mark("click_failed"); } await page.waitForTimeout(5000); mark("project_settled", { url: page.url() });
  for (let i = 0; i < 20; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(120); } mark("project_scrolled"); await page.waitForTimeout(1500); }
// hamburger menu
const btn = await page.$("#site_menu_button");
if (btn) { await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(800); mark("menu_click"); try { await btn.click({ timeout: 8000 }); } catch (e) { mark("menu_click_failed"); } await page.waitForTimeout(2500); mark("menu_open_done", { url: page.url() }); }
const geo = await page.evaluate(() => ({ url: location.href, title: document.title }));
await ctx.close(); await browser.close();
fs.writeFileSync(path.join(outdir, `br_frames_${W}.json`), JSON.stringify({ W, H, marks, geo }, null, 1));
console.log(JSON.stringify(marks));
