// The Rolodex's scale on desktop, at 1440 x 900 and 1280 x 720: the front sleeve's height on screen at rest (CSS px),
// the side cover panel's width, and, through a full turn of the drum (quarter-slot steps), the screen box of the three
// sleeves nearest the front: it has to stay inside the canvas and left of the side panel.
//   node scripts/gillenwebsite/scale.mjs [base-url] [--out file] [--label before|after]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/scale-report.json";
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const report = { base: BASE, at: new Date().toISOString(), runs: [] };
for (const [w, h] of [[1440, 900], [1280, 720]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(`${BASE}/gillenwebsite`);
  await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.allSmall, null, { timeout: 120000 });
  await page.waitForTimeout(2500);
  const r = await page.evaluate(async () => {
    const { rig } = window.__rolodex, raf = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    const V = rig.camera.position.constructor, canvas = rig.hit.parentElement.getBoundingClientRect();
    const panel = document.querySelector("[class*=inlineSlot] [class*=coverBox]")?.getBoundingClientRect();
    const box = (slots) => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const i of slots) {
        const body = rig.cards[((i % rig.TOTAL) + rig.TOTAL) % rig.TOTAL].children[0];
        body.updateWorldMatrix(true, false);
        const b = body.geometry.boundingBox;
        for (let k = 0; k < 8; k++) {
          const p = new V(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z).applyMatrix4(body.matrixWorld).project(rig.camera);
          const x = canvas.left + (p.x + 1) * 0.5 * canvas.width, y = canvas.top + (1 - p.y) * 0.5 * canvas.height;
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
      }
      return { x0, y0, x1, y1 };
    };
    // the camera eases in after load: measure once the front sleeve's height holds for half a second
    let front = box([Math.round(rig.s)]), still = 0;
    while (still < 30) { await raf(); const f = box([Math.round(rig.s)]); still = Math.abs(f.y1 - f.y0 - (front.y1 - front.y0)) < 0.05 ? still + 1 : 0; front = f; }
    const was = rig.reduce; rig.reduce = true;
    let worst = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
    for (let k = 0; k <= rig.TOTAL * 4; k++) {
      rig.pos = k / 4; rig.lastScroll = 0; await raf();
      const f = Math.round(rig.s), b = box([f - 1, f, f + 1]);
      worst = { left: Math.min(worst.left, b.x0), top: Math.min(worst.top, b.y0), right: Math.max(worst.right, b.x1), bottom: Math.max(worst.bottom, b.y1) };
    }
    rig.pos = 0; await raf(); rig.reduce = was;
    return {
      frontSleeveHeightPx: +(front.y1 - front.y0).toFixed(1), panelWidthPx: panel ? +panel.width.toFixed(1) : null, panelLeftPx: panel ? +panel.left.toFixed(1) : null,
      rotationBox: Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, +v.toFixed(1)])), canvas: { left: canvas.left, top: canvas.top, right: canvas.right, bottom: canvas.bottom },
    };
  });
  r.viewport = `${w}x${h}`;
  r.inView = r.rotationBox.left >= r.canvas.left && r.rotationBox.top >= r.canvas.top && r.rotationBox.bottom <= r.canvas.bottom && r.rotationBox.right <= (r.panelLeftPx ?? r.canvas.right);
  report.runs.push(r);
  console.log(JSON.stringify(r));
  await page.close();
}
await browser.close();
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
