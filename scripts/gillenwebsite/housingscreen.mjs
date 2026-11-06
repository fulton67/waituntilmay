// The housing's size on screen: every vertex of the housing GLB and the cradle projected through the stage camera
// once it has settled, min to max in CSS px, at 390 x 844 (phone, touch) and 1440 x 900; the front sleeve's cover
// square on screen beside it. Run on two builds to compare (the housing scale and camera change, section 2).
//   node scripts/gillenwebsite/housingscreen.mjs [base-url] [--out file] [--shots dir --tag name]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/housingscreen-report.json";
const SHOTS = argv.includes("--shots") ? argv[argv.indexOf("--shots") + 1] : null;
const TAG = argv.includes("--tag") ? argv[argv.indexOf("--tag") + 1] : "now";
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const report = { base: BASE, at: new Date().toISOString(), profiles: {} };
for (const p of [{ name: "phone", w: 390, h: 844 }, { name: "desktop", w: 1440, h: 900 }]) {
  const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, isMobile: p.w < 720, hasTouch: p.w < 720 });
  await ctx.addInitScript(() => { try { localStorage.setItem("gillenwebsite:guide-seen", "1"); } catch {} });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite`);
  await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.camera, null, { timeout: 120000 });
  await page.waitForTimeout(2500);
  const out = await page.evaluate(() => {
    const { house, cradle, rig } = window.__rolodex, cam = rig.camera, b = rig.hit.parentElement.getBoundingClientRect();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const v = new cam.position.constructor();
    for (const root of [house, cradle]) root.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      o.updateWorldMatrix(true, false);
      const a = o.geometry.attributes.position;
      for (let k = 0; k < a.count; k++) {
        v.fromBufferAttribute(a, k).applyMatrix4(o.matrixWorld).project(cam);
        const x = b.left + (v.x + 1) * 0.5 * b.width, y = b.top + (1 - v.y) * 0.5 * b.height;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
    });
    const t = window.__rolodex.texels();
    return { housingWidthPx: +(x1 - x0).toFixed(1), housingHeightPx: +(y1 - y0).toFixed(1), housingLeft: +x0.toFixed(1), housingTop: +y0.toFixed(1), coverFaceDevicePx: +t.faceScreenPx.toFixed(1), pixelRatio: t.pixelRatio };
  });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/housing-${TAG}-${p.name}.png` });
  report.profiles[p.name] = out;
  console.log(p.name, JSON.stringify(out));
  await ctx.close();
}
await browser.close();
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
