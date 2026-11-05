// No type on the Rolodex sleeves: in the stage's scene there is no troika text object (nothing with a `text` and a
// glyph geometry), every sleeve face's map is a cover image file (an <img> or ImageBitmap from public/covers, never a
// canvas), and the plain back covers made for releases with no back (backs.mjs) are one flat colour (channel standard
// deviation under 1 at every size).
//   node scripts/gillenwebsite/notext.mjs [base-url] [--out file] [--shots dir]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import sharp from "sharp";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/notext-report.json";
const SHOTS = argv.includes("--shots") ? argv[argv.indexOf("--shots") + 1] : null;
const sleeves = JSON.parse(await fs.readFile("lib/gillenwebsite/sleeves.json", "utf8"));
const plain = [];
for (const [id, x] of Object.entries(sleeves)) {
  if (x.back.source !== "plain") continue;
  let worst = 0;
  for (const w of x.back.sizes) { const st = await sharp(`public/covers/${w}/${id}-back.jpg`).stats(); worst = Math.max(worst, ...st.channels.map((c) => c.stdev)); }
  plain.push({ id, worstStdev: +worst.toFixed(2) });
}
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => { try { localStorage.setItem("gillenwebsite:guide-seen", "1"); } catch {} });
await page.goto(`${BASE}/gillenwebsite`);
await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.allSmall, null, { timeout: 120000 });
await page.waitForTimeout(3000);
const scene = await page.evaluate(() => {
  const { rig } = window.__rolodex;
  let root = rig.cards[0]; while (root.parent) root = root.parent;
  let texts = 0, objects = 0;
  root.traverse((o) => { objects++; if (typeof o.text === "string" || o.isTroikaText || o.constructor?.name === "BatchedText") texts++; });
  const kinds = new Set();
  for (const c of rig.cards) for (const m of [].concat(c.children[0].material).slice(0, 2)) {
    const img = m.map?.image;
    kinds.add(!img ? "none" : img instanceof HTMLCanvasElement || (typeof OffscreenCanvas !== "undefined" && img instanceof OffscreenCanvas) ? "canvas" : img instanceof ImageBitmap ? "bitmap" : img instanceof HTMLImageElement ? "img" : img.constructor?.name);
  }
  return { objects, textObjects: texts, sleeveMapKinds: [...kinds], sleeveChildren: Math.max(...rig.cards.map((c) => c.children.length)) };
});
if (SHOTS) await page.screenshot({ path: `${SHOTS}/notext-home.png` });
await browser.close();
const report = { base: BASE, at: new Date().toISOString(), scene, plainBacks: plain };
report.pass = scene.textObjects === 0 && scene.sleeveChildren === 1 && scene.sleeveMapKinds.every((k) => k === "img" || k === "bitmap") && plain.every((p) => p.worstStdev < 1);
console.log(JSON.stringify(report.scene), JSON.stringify(plain.map((p) => p.worstStdev)), "pass", report.pass);
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
