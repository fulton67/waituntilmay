// The record label: for the three darkest and three lightest covers, open the record view and read the label: its
// texture is its own canvas (never the cover's), its colour (the cover's lightest dominant colour), and every pixel
// lies on the line from that colour to the ink (worst distance and pixels farther than 8 of 255), so no cover
// pixels are on it. A close-up of each label is saved with --shots.
//   node scripts/gillenwebsite/label.mjs [base-url] [--out file] [--shots dir]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import sharp from "sharp";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/label-report.json";
const SHOTS = argv.includes("--shots") ? argv[argv.indexOf("--shots") + 1] : null;
const data = JSON.parse(await fs.readFile("lib/gillenwebsite/discography.json", "utf8")).releases;
const lum = [];
for (const [i, r] of data.entries()) { const s = await sharp(`public/covers/512/${r.id}.jpg`).greyscale().stats(); lum.push({ i, id: r.id, mean: s.channels[0].mean }); }
lum.sort((a, b) => a.mean - b.mean);
const pick = [...lum.slice(0, 3), ...lum.slice(-3)];
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => { try { localStorage.setItem("gillenwebsite:guide-seen", "1"); } catch {} });
await page.goto(`${BASE}/gillenwebsite/discography`);
await page.waitForFunction(() => window.__disco && window.__vinyl, null, { timeout: 120000 });
await page.waitForTimeout(1500);
const rows = [];
for (const c of pick) {
  await page.evaluate((id) => { const a = document.querySelector(`li[data-id="${CSS.escape(id)}"] a`); a.scrollIntoView({ block: "center" }); }, c.id);
  await page.waitForTimeout(200);
  await page.evaluate((id) => document.querySelector(`li[data-id="${CSS.escape(id)}"] a`).click(), c.id);
  await page.waitForFunction(() => window.__vinyl.state() === "open", null, { timeout: 10000 });
  await page.waitForTimeout(900);
  const t = await page.evaluate(() => window.__vinyl.texels().label);
  if (SHOTS) {
    const d = await page.evaluate(() => window.__vinyl.discPoint());
    if (d) await page.screenshot({ path: `${SHOTS}/label-${c.id.slice(0, 20)}.png` });
  }
  rows.push({ release: c.id, coverMean: +c.mean.toFixed(1), ...t });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => window.__vinyl.state() === "closed", null, { timeout: 10000 });
  await page.waitForTimeout(300);
}
await browser.close();
const pass = rows.every((r) => !r.isCover && r.pixelsOffLine === 0 && r.texturePx === 1024);
for (const r of rows) console.log(JSON.stringify(r));
console.log("pass", pass);
await fs.writeFile(OUT, JSON.stringify({ base: BASE, at: new Date().toISOString(), rows, pass }, null, 2) + "\n");
