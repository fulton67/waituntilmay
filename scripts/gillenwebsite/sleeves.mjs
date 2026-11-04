// The record sleeves on the Rolodex, measured in headed Chrome at 1440 x 900 DPR 2 and 390 x 844 DPR 3:
//  - radius: the farthest point of any sleeve from the drum axis while the drum steps through a full turn (TOTAL
//    slots, quarter-slot steps); the frame clears 0.419 m, the sleeves have to stay under 0.41 m
//  - flicker: for each of 12 releases brought to the front by a wheel notch, the front sleeve's mean luminance on a
//    5 x 5 grid over its face, every frame for 1.6 s, read straight after each render. Frames while the drum moves
//    are the change; once it has settled, a jump of more than 6/255 between frames is a flicker (a blank or an
//    undecoded texture would read as one), and the count has to be 0. The 512 -> 2048 swap happens in this window.
//  - texels: once settled, each cover texture's width against its face's device pixels on screen (>= 1)
//  - fps: rAF over a wheel through every release (mean, worst 500 ms window, slowest frame); the phone profile with
//    a 4x CPU throttle
//   node scripts/gillenwebsite/sleeves.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/sleeves-report.json";
const PROFILES = [
  { name: "desktop", w: 1440, h: 900, dpr: 2, mobile: false, throttle: 1, fpsMin: 55 },
  { name: "phone", w: 390, h: 844, dpr: 3, mobile: true, throttle: 4, fpsMin: 45 },
];
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows", "--ignore-gpu-blocklist"] });
const report = { base: BASE, at: new Date().toISOString(), profiles: {} };

for (const p of PROFILES) {
  const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, isMobile: p.mobile, hasTouch: p.mobile });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite`);
  await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.allSmall, null, { timeout: 120000 });
  await page.waitForTimeout(2500);
  const out = { viewport: `${p.w}x${p.h}@${p.dpr}` };

  if (p.name === "desktop") {
    // radius through a full turn: with reduced motion the drum lands on each position in the next frame
    out.radius = await page.evaluate(async () => {
      const { rig, sleeveRadius } = window.__rolodex, raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const was = rig.reduce;
      rig.reduce = true;
      let max = 0, at = 0;
      for (let k = 0; k <= rig.TOTAL * 4; k++) { rig.pos = k / 4; rig.lastScroll = 0; await raf(); const r = sleeveRadius(); if (r > max) { max = r; at = k / 4; } }
      rig.pos = 0; await raf();
      rig.reduce = was;
      return { maxM: +max.toFixed(5), atSlot: at, steps: rig.TOTAL * 4 + 1, limitM: 0.41, frameClearanceM: 0.419 };
    });
    out.radius.pass = out.radius.maxM < 0.41;
  }

  // flicker on the front sleeve's face
  await page.evaluate(() => {
    const { gl, rig } = window.__rolodex, ctx = gl.getContext(), px = new Uint8Array(4);
    const s = (window.__lum = { rows: [], on: false });
    const render = gl.render.bind(gl);
    gl.render = (scene, cam) => {
      render(scene, cam);
      if (!s.on) return;
      const slot = ((Math.round(rig.s) % rig.TOTAL) + rig.TOTAL) % rig.TOTAL, body = rig.cards[slot].children[0];
      const w = ctx.drawingBufferWidth, h = ctx.drawingBufferHeight, g = body.geometry.boundingBox;
      let sum = 0, n = 0;
      for (let i = 1; i <= 5; i++) for (let j = 1; j <= 5; j++) {
        const v = body.localToWorld(new cam.position.constructor(g.min.x + ((g.max.x - g.min.x) * i) / 6, g.min.y + ((g.max.y - g.min.y) * j) / 6, g.max.z)).project(cam);
        const x = Math.round((v.x + 1) * 0.5 * w), y = Math.round((v.y + 1) * 0.5 * h);
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        ctx.readPixels(x, y, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px);
        sum += 0.2126 * px[0] + 0.7152 * px[1] + 0.0722 * px[2]; n++;
      }
      s.rows.push({ t: performance.now(), slot, s: rig.s, moving: Math.abs(rig.s - Math.round(rig.s)) > 0.002 || Math.abs(rig.v) > 0.01, lum: n ? sum / n : null });
    };
  });
  await page.mouse.move(p.w * 0.3, p.h * 0.5);
  out.flicker = { releases: [], jumps: 0 };
  for (let k = 0; k < 12; k++) {
    await page.evaluate(() => { window.__lum.rows = []; window.__lum.on = true; });
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(1600);
    const rows = await page.evaluate(() => { window.__lum.on = false; return window.__lum.rows; });
    const still = rows.filter((r) => !r.moving && r.lum !== null);
    let jumps = 0, worst = 0;
    for (let i = 1; i < still.length; i++) {
      if (still[i].slot !== still[i - 1].slot) continue;
      const d = Math.abs(still[i].lum - still[i - 1].lum);
      worst = Math.max(worst, d);
      if (d > 6) jumps++;
    }
    out.flicker.releases.push({ slot: still.at(-1)?.slot, frames: rows.length, stillFrames: still.length, worstStep: +worst.toFixed(2), jumps });
    out.flicker.jumps += jumps;
  }
  out.flicker.pass = out.flicker.jumps === 0;
  await page.evaluate(() => { const { gl } = window.__rolodex; delete gl.render; });

  // texels, settled on the front
  await page.waitForTimeout(1500);
  const tx = await page.evaluate(() => window.__rolodex.texels());
  out.texels = { ...tx, frontRatio: +(tx.frontTexturePx / tx.faceScreenPx).toFixed(2), backRatio: +(tx.backTexturePx / tx.faceScreenPx).toFixed(2) };
  out.texels.pass = out.texels.frontRatio >= 1 && out.texels.backRatio >= 1;

  // fps through every release
  const cdp = await ctx.newCDPSession(page);
  if (p.throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.throttle });
  await page.evaluate(() => { window.__frames = []; window.__stop = false; const tick = (t) => { window.__frames.push(t); if (!window.__stop) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  for (let k = 0; k < 36; k++) { await page.mouse.wheel(0, 100); await page.waitForTimeout(160); }
  await page.waitForTimeout(500);
  const f = await page.evaluate(() => { window.__stop = true; return window.__frames; });
  if (p.throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const d = f.slice(1).map((t, i) => t - f[i]), win = [];
  let start = f[0], n = 0;
  for (let i = 1; i < f.length; i++) { n++; if (f[i] - start >= 500) { win.push((n * 1000) / (f[i] - start)); start = f[i]; n = 0; } }
  out.fps = { throttle: p.throttle, mean: +((d.length * 1000) / (f.at(-1) - f[0])).toFixed(1), min500msWindow: +Math.min(...win).toFixed(1), slowestFrameMs: +Math.max(...d).toFixed(1) };
  out.fps.pass = out.fps.min500msWindow >= p.fpsMin;
  if (p.name === "desktop") await page.screenshot({ path: "docs/gillenwebsite/sleeves-1440.png" });
  else await page.screenshot({ path: "docs/gillenwebsite/sleeves-390.png" });
  report.profiles[p.name] = out;
  console.log(p.name, JSON.stringify(out, null, 1));
  await ctx.close();
}
await browser.close();
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
