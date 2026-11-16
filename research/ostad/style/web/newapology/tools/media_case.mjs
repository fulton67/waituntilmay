// Media inventory of a /work/<slug> case page after every lazy block has mounted. Study notes only.
// usage: node media_case.mjs <width> <outdir> <route...>
import { createRequire } from "module";
import fs from "fs";
import path from "path";
const require = createRequire("C:/Users/naimj/aa-banner-tools/node_modules/");
const { chromium } = require("playwright");
const [widthArg, outdir, ...routes] = process.argv.slice(2);
const W = +widthArg, H = W < 800 ? 844 : 900, mobile = W < 800;
fs.mkdirSync(outdir, { recursive: true });
const browser = await chromium.launch({ executablePath: "C:/Users/naimj/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
const res = {};
for (const route of routes) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  await page.goto("https://www.newapology.com" + route, { waitUntil: "networkidle", timeout: 90000 });
  for (let y = 0; y < 30000; y += 400) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(150);
    if (await page.evaluate(() => innerHeight + scrollY >= document.scrollingElement.scrollHeight - 4)) break; }
  await page.waitForTimeout(2500);
  res[route] = await page.evaluate(() => {
    const blk = (el) => { const r = el.getBoundingClientRect();
      return { type: el.dataset.blockType || el.className.split(" ")[0], y: Math.round(r.top + scrollY), h: Math.round(r.height),
        media: [...el.querySelectorAll(".case-media")].map((m) => ({ ratio: m.style.aspectRatio, w: Math.round(m.getBoundingClientRect().width), h: Math.round(m.getBoundingClientRect().height),
          img: [...m.querySelectorAll("img")].map((i) => i.naturalWidth + "x" + i.naturalHeight + (i.currentSrc.match(/\.(\w+)(\?|$)/) || [, ""])[1]),
          video: [...m.querySelectorAll("video")].map((v) => ({ wh: v.videoWidth + "x" + v.videoHeight, dur: +(+v.duration).toFixed(2), paused: v.paused, loop: v.loop, muted: v.muted, autoplay: v.autoplay, controlled: !!m.querySelector(".case-video-control") })),
          carousel: !!m.closest(".case-carousel") })) }; };
    return { docH: document.scrollingElement.scrollHeight, hero: blk(document.querySelector(".case-hero")),
      blocks: [...document.querySelectorAll(".case-gallery-item")].map(blk),
      allVideos: document.querySelectorAll(".case-study video").length, allImgs: document.querySelectorAll(".case-study img").length,
      carousels: document.querySelectorAll(".case-carousel").length,
      nextCover: (() => { const c = document.querySelector(".case-next__cover"); return c ? { img: c.querySelectorAll("img").length, video: c.querySelectorAll("video").length, ratio: c.style.aspectRatio } : null; })() };
  });
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(outdir, `media_${routes.map((r) => r.split("/").pop()).join("+")}_${W}.json`), JSON.stringify(res, null, 1));
console.log("ok", Object.keys(res).length);
