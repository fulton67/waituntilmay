// The custom cursors (public/gillenwebsite/cursors) at DPR 1, 2 and 3: the stage's computed cursor, which PNG the
// browser fetches when the pointer is over the stage (and when a drag turns it to grabbing), and that file's width
// against 32 x DPR (crisp: one image pixel per device pixel). Over the caption block, the ns-resize one.
//   node scripts/gillenwebsite/cursor.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import sharp from "sharp";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/cursor-report.json";
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const report = { base: BASE, at: new Date().toISOString(), dpr: {} };
for (const dpr of [1, 2, 3]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  const got = [];
  page.on("response", (r) => { if (r.url().includes("/cursors/")) got.push(r.url().split("/cursors/")[1]); });
  await page.goto(`${BASE}/gillenwebsite`);
  await page.waitForFunction(() => window.__rolodex?.rig?.ready, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  await page.mouse.move(300, 450);
  await page.waitForTimeout(600);
  await page.mouse.down(); await page.mouse.move(360, 470, { steps: 6 }); await page.waitForTimeout(500); await page.mouse.up();
  const cap = await page.evaluate(() => { const r = document.querySelector("[class*=capText]").getBoundingClientRect(); return { x: r.left + 20, y: r.top + 8 }; });
  await page.mouse.move(cap.x, cap.y);
  await page.waitForTimeout(600);
  const css = await page.evaluate(() => getComputedStyle(document.querySelector("[class*=stage]")).cursor);
  const files = [...new Set(got)];
  const sizes = {};
  for (const f of files) sizes[f] = (await sharp(`public/gillenwebsite/cursors/${f}`).metadata()).width;
  const want = dpr === 1 ? "" : `@${dpr}x`;
  const png = files.filter((f) => f.endsWith(".png"));
  report.dpr[dpr] = { computedCursor: css.slice(0, 160), fetched: files, widths: sizes, expectedWidth: 32 * dpr,
    pass: png.length >= 2 && png.every((f) => f.includes(`${want}.png`) && sizes[f] === 32 * dpr) };
  console.log(dpr, JSON.stringify(report.dpr[dpr]));
  await ctx.close();
}
await browser.close();
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
