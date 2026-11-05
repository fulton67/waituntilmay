// The knobs: the pointer cursor over one; a tap at rest moves one card on in the direction the drum last moved
// (stepped back first, so -1); a tap while the drum coasts after a flick doubles its speed, capped at the momentum
// maximum (rig.lastBoost: the speed before and the speed asked for, cards/s, and the speed coasting right after).
//   node scripts/gillenwebsite/knob.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/knob-report.json";
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${BASE}/gillenwebsite`);
await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.allSmall, null, { timeout: 120000 });
await page.waitForTimeout(3000);
const out = {};
const k = await page.evaluate(() => window.__rolodex.knobPoint());
await page.mouse.move(k.x, k.y); await page.waitForTimeout(300);
out.cursorOverKnob = await page.evaluate(() => document.querySelector("[class*=stage]").style.cursor || getComputedStyle(document.querySelector("[class*=stage]")).cursor);
// at rest: step back one card (lastDir -1), let it settle, tap the knob
await page.mouse.move(700, 450); await page.mouse.wheel(0, -100); await page.waitForTimeout(900);
const before = await page.evaluate(() => ({ front: window.__rolodex.rig.front, pos: window.__rolodex.rig.pos, lastDir: window.__rolodex.rig.lastDir }));
await page.mouse.click(k.x, k.y); await page.waitForTimeout(900);
const after = await page.evaluate(() => ({ front: window.__rolodex.rig.front, pos: window.__rolodex.rig.pos, boost: window.__rolodex.rig.lastBoost }));
out.atRest = { lastDir: before.lastDir, posBefore: before.pos, posAfter: after.pos, moved: after.pos - before.pos, frontBefore: before.front, frontAfter: after.front };
out.atRest.pass = out.atRest.moved === before.lastDir;
// turning: a flick on the front sleeve (a quick drag up), then the knob while it coasts
const results = [];
for (let n = 0; n < 3; n++) {
  const f = await page.evaluate(() => window.__rolodex.frontPoint());
  await page.mouse.move(f.x, f.y); await page.mouse.down();
  for (let s = 1; s <= 4; s++) { await page.mouse.move(f.x, f.y - s * 22); await page.waitForTimeout(8); }
  await page.mouse.up();
  await page.waitForTimeout(80);
  const coasting = await page.evaluate(() => window.__rolodex.rig.fling !== null);
  await page.mouse.click(k.x, k.y);
  await page.waitForTimeout(40);
  const r = await page.evaluate(() => { const { rig } = window.__rolodex; return { boost: rig.lastBoost, speedNow: +Math.abs(rig.v).toFixed(3), coasting: rig.fling !== null }; });
  results.push({ coastingAtTap: coasting, before: r.boost.before, asked: r.boost.after, capped: r.boost.capped, ratio: +(r.boost.after / r.boost.before).toFixed(2), speedRightAfter: r.speedNow });
  await page.waitForTimeout(2500);
}
out.turning = results;
out.turning.pass = results.every((x) => x.coastingAtTap && (x.capped ? x.asked >= x.before : Math.abs(x.ratio - 2) < 0.01) && x.speedRightAfter > x.before * 1.5);
out.pass = out.cursorOverKnob === "pointer" && out.atRest.pass && out.turning.pass;
console.log(JSON.stringify(out, null, 1));
await browser.close();
await fs.writeFile(OUT, JSON.stringify({ base: BASE, at: new Date().toISOString(), ...out, turningPass: out.turning.pass }, null, 2) + "\n");
