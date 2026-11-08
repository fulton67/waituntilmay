// The front sleeve on screen once the drum has settled, at 390 x 844 (phone, touch) and 1440 x 900: its projected
// box (the body's bounding box, 8 corners, CSS px), its height, and on desktop how far its right edge is from the
// release display beside the drum (>= 0: clear of it). Run on two builds to compare.
//   node scripts/gillenwebsite/sleevescreen.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/sleevescreen-report.json";
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const report = { base: BASE, at: new Date().toISOString(), profiles: {} };
for (const [n, w, h] of [["phone", 390, 844], ["desktop", 1440, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 720, hasTouch: w < 720 });
  await ctx.addInitScript(() => { try { localStorage.setItem("gillenwebsite:guide-seen", "1"); localStorage.setItem("gillenwebsite:intro-seen", "1"); } catch {} });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite`);
  await page.waitForFunction(() => window.__rolodex?.rig?.ready, null, { timeout: 120000 });
  await page.waitForTimeout(2500);
  const out = await page.evaluate(() => {
    const { rig } = window.__rolodex, cam = rig.camera, body = rig.cards[((Math.round(rig.s) % rig.TOTAL) + rig.TOTAL) % rig.TOTAL].children[0], st = rig.hit.parentElement.getBoundingClientRect();
    body.geometry.computeBoundingBox();
    const bb = body.geometry.boundingBox, V = cam.position.constructor;
    body.updateWorldMatrix(true, false);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let k = 0; k < 8; k++) {
      const v = new V(k & 1 ? bb.max.x : bb.min.x, k & 2 ? bb.max.y : bb.min.y, k & 4 ? bb.max.z : bb.min.z).applyMatrix4(body.matrixWorld).project(cam);
      const x = st.left + ((v.x + 1) / 2) * st.width, y = st.top + ((1 - v.y) / 2) * st.height;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    const panel = document.querySelector("[class*=inlineSlot]")?.getBoundingClientRect();
    return { sleeveMetres: +(bb.max.y - bb.min.y).toFixed(3), box: [x0, x1, y0, y1].map((v) => +v.toFixed(1)), heightPx: +(y1 - y0).toFixed(1), widthPx: +(x1 - x0).toFixed(1), clearOfPanelPx: panel ? +(panel.left - x1).toFixed(1) : null };
  });
  report.profiles[n] = out;
  console.log(n, JSON.stringify(out));
  await ctx.close();
}
await browser.close();
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
