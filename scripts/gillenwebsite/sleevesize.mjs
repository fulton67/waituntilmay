// The sleeve size on the Rolodex: its width (along the axle) and height, its side clearance to the end plates' inner
// faces (>= 15 mm), and the farthest point of any sleeve from the axle (drum space, metres)
// sampled through a full turn of the drum in quarter-slot steps; the slot count; the angular pitch between
// neighbouring slots at rest, in degrees (the ring away from the front, both sides, and the front fan's first step).
//   node scripts/gillenwebsite/sleevesize.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/sleevesize-report.json";
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${BASE}/gillenwebsite`);
await page.waitForFunction(() => window.__rolodex?.rig?.ready, null, { timeout: 120000 });
await page.waitForTimeout(2500);
const r = await page.evaluate(async () => {
  const { rig, sleeveRadius } = window.__rolodex, raf = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
  const body = rig.cards[0].children[0]; body.geometry.computeBoundingBox();
  const size = +(body.geometry.boundingBox.max.y - body.geometry.boundingBox.min.y).toFixed(4);
  const was = rig.reduce; rig.reduce = true;
  let max = 0;
  for (let k = 0; k <= rig.TOTAL * 4; k += 3) { rig.pos = k / 4; rig.lastScroll = 0; await raf(); max = Math.max(max, sleeveRadius()); }
  rig.pos = 0; await raf(); await raf();
  const deg = (i) => (rig.cards[i].rotation.x * 180) / Math.PI, f = Math.round(rig.s) % rig.TOTAL, T = rig.TOTAL, at = (k) => deg(((f + k) % T + T) % T);
  rig.reduce = was;
  return { clearance: window.__rolodex.clearance(), sleeveSize: size, maxRadius: +max.toFixed(4), slots: T, pitchDeg: { ringAhead: +Math.abs(at(30) - at(31)).toFixed(3), ringBehind: +Math.abs(at(-30) - at(-31)).toFixed(3), frontFirstAhead: +Math.abs(at(0) - at(1)).toFixed(3), frontFirstBehind: +Math.abs(at(0) - at(-1)).toFixed(3) } };
});
r.pass = r.maxRadius < 0.41 && r.clearance.width === 0.44 && r.clearance.left >= 0.015 && r.clearance.right >= 0.015;
console.log(JSON.stringify(r));
await browser.close();
await fs.writeFile(OUT, JSON.stringify({ base: BASE, at: new Date().toISOString(), ...r }, null, 2) + "\n");
