// Screenshots and an fps sweep for each housing look (?look=flat, ?look=photo).
//   node scripts/gillenwebsite/looks.mjs [base-url] [--no-fps]   (default http://localhost:3217)
// Writes docs/gillenwebsite/looks/<look>-1440x900.png and <look>-390.png, and looks-report.json beside them.
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = path.join(ROOT, "docs/gillenwebsite/looks");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"] });
const ready = (p) => p.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.firstCardTexture, null, { timeout: 120000 });
const report = { base: BASE, at: new Date().toISOString(), looks: {} };

for (const look of ["photo"]) {
  const r = (report.looks[look] = {});
  // desktop: screenshot at rest, then the fps sweep through all 36 cards (the same wheel as verify.mjs)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`${BASE}/gillenwebsite?look=${look}`, { waitUntil: "load" });
  await ready(page);
  await page.evaluate(() => { setInterval(() => dispatchEvent(new Event("touchstart")), 4000); });
  await wait(4000); // covers painted, accumulated shadows done
  r.desktop = path.relative(ROOT, path.join(OUT, `${look}-1440x900.png`)).replaceAll("\\", "/");
  await page.screenshot({ path: path.join(ROOT, r.desktop) });
  r.info = await page.evaluate(() => ({ look: window.__rolodex.look, photo: window.__rolodex.photo, outlineSegments: window.__rolodex.outlineSegments, shadowMap: !!document.querySelector("canvas") }));
  if (!argv.includes("--no-fps")) {
    await page.evaluate(() => scrollTo(0, 0));
    await wait(1200);
    await page.evaluate(() => { window.__f = []; const t = (x) => { window.__f.push(x); if (!window.__stop) requestAnimationFrame(t); }; requestAnimationFrame(t); });
    const per = await page.evaluate(() => Math.max(140, innerHeight * 0.42));
    await page.mouse.move(700, 450);
    for (let i = 0; i < Math.ceil((35 * per) / 60); i++) { await page.mouse.wheel(0, 60); await wait(16); }
    await wait(600);
    const f = await page.evaluate(() => { window.__stop = true; return window.__f; });
    const win = [];
    let start = f[0], n = 0;
    for (let i = 1; i < f.length; i++) { n++; if (f[i] - start >= 500) { win.push((n * 1000) / (f[i] - start)); start = f[i]; n = 0; } }
    const d = f.slice(1).map((t, i) => t - f[i]);
    r.fps = { mean: +((d.length * 1000) / (f[f.length - 1] - f[0])).toFixed(1), min500msWindow: +Math.min(...win).toFixed(1), slowestFrameMs: +Math.max(...d).toFixed(1), reachedCard: Math.round(await page.evaluate(() => window.__rolodex.rig.s)) + 1 };
  }
  r.errors = errors;
  await ctx.close();
  // phone: 390 x 844
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const p = await phone.newPage();
  await p.goto(`${BASE}/gillenwebsite?look=${look}`, { waitUntil: "load" });
  await ready(p);
  await wait(4000);
  r.phone = path.relative(ROOT, path.join(OUT, `${look}-390.png`)).replaceAll("\\", "/");
  await p.screenshot({ path: path.join(ROOT, r.phone) });
  r.phoneScrollWidth = await p.evaluate(() => document.documentElement.scrollWidth);
  await phone.close();
}
await browser.close();
await fs.writeFile(path.join(OUT, "looks-report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
