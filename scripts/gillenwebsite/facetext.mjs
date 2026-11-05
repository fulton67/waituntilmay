// The sleeve face's text over its cover: for the three darkest and three lightest covers (mean luminance of the 512
// file), the release is brought to the front and the frame is drawn twice, with its text and without. Glyph pixels are
// those the text made much brighter; their surround is the pixels within 2 device px of a glyph that are not glyph
// (the halo, or the cover where the halo is faint). Contrast = (L glyph + 0.05) / (L surround + 0.05), WCAG relative
// luminance, medians. Also: the text draws after the cover (renderOrder) with no depth test. At 1440 x 900 DPR 2 and
// 390 x 844 DPR 3.
//   node scripts/gillenwebsite/facetext.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import sharp from "sharp";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/facetext-report.json";
const data = JSON.parse(await fs.readFile("lib/gillenwebsite/discography.json", "utf8")).releases;
const lum = [];
for (const [i, r] of data.entries()) { const s = await sharp(`public/covers/512/${r.id}.jpg`).greyscale().stats(); lum.push({ i, id: r.id, mean: s.channels[0].mean }); }
lum.sort((a, b) => a.mean - b.mean);
const pick = [...lum.slice(0, 3).map((x) => ({ ...x, kind: "dark" })), ...lum.slice(-3).map((x) => ({ ...x, kind: "light" }))];
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const report = { base: BASE, at: new Date().toISOString(), profiles: {} };
for (const p of [{ name: "desktop", w: 1440, h: 900, dpr: 2 }, { name: "phone", w: 390, h: 844, dpr: 3 }]) {
  const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, isMobile: p.w < 720, hasTouch: p.w < 720 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite`);
  await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.allSmall, null, { timeout: 120000 });
  await page.waitForTimeout(2500);
  const rows = [];
  for (const c of pick) {
    await page.evaluate((i) => window.__rolodex.jumpToRelease(i), c.i);
    await page.waitForTimeout(2200);
    const m = await page.evaluate((i) => {
      const { gl, rig, faceText } = window.__rolodex, t = faceText[i];
      let scene = rig.cards[0]; while (scene.parent) scene = scene.parent;
      const ctx = gl.getContext(), W = ctx.drawingBufferWidth, H = ctx.drawingBufferHeight;
      // the text's box on screen, in device px (WebGL rows bottom-up)
      t.updateWorldMatrix(true, false);
      const g = t.geometry; g.computeBoundingBox();
      const b = g.boundingBox, V = rig.camera.position.constructor;
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (let k = 0; k < 8; k++) {
        const v = new V(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z).applyMatrix4(t.matrixWorld).project(rig.camera);
        const x = (v.x + 1) * 0.5 * W, y = (v.y + 1) * 0.5 * H;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      x0 = Math.max(0, Math.floor(x0) - 4); y0 = Math.max(0, Math.floor(y0) - 4); x1 = Math.min(W, Math.ceil(x1) + 4); y1 = Math.min(H, Math.ceil(y1) + 4);
      const w = x1 - x0, h = y1 - y0, read = () => { const px = new Uint8Array(w * h * 4); ctx.readPixels(x0, y0, w, h, ctx.RGBA, ctx.UNSIGNED_BYTE, px); return px; };
      const visible = t.visible;
      gl.render(scene, rig.camera); const A = read();
      t.visible = false; gl.render(scene, rig.camera); const B = read(); t.visible = visible;
      const L = (a, k) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(a[k]) + 0.7152 * f(a[k + 1]) + 0.0722 * f(a[k + 2]); };
      const glyph = new Uint8Array(w * h);
      for (let k = 0; k < w * h; k++) if (L(A, k * 4) - L(B, k * 4) > 0.25 && L(A, k * 4) > 0.5) glyph[k] = 1;
      const gl_ = [], sur = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const k = y * w + x;
        if (glyph[k]) { gl_.push(L(A, k * 4)); continue; }
        let near = false;
        for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < h && xx >= 0 && xx < w && glyph[yy * w + xx]) { near = true; break; } }
        if (near) sur.push(L(A, k * 4));
      }
      const med = (a) => { a.sort((p, q) => p - q); return a[Math.floor(a.length / 2)] ?? NaN; };
      const mat = t.material;
      return { glyphPx: gl_.length, surroundPx: sur.length, Lglyph: +med(gl_).toFixed(3), Lsurround: +med(sur).toFixed(3), renderOrder: t.renderOrder, depthTest: Array.isArray(mat) ? mat.map((x) => x.depthTest) : mat.depthTest, box: [x0, y0, w, h] };
    }, c.i);
    m.contrast = +((m.Lglyph + 0.05) / (m.Lsurround + 0.05)).toFixed(2);
    rows.push({ release: c.id, kind: c.kind, coverMeanLuminance: +c.mean.toFixed(1), ...m });
  }
  report.profiles[p.name] = { rows, pass: rows.every((r) => r.contrast >= 4.5 && r.glyphPx > 50 && r.depthTest === false) };
  console.log(p.name, JSON.stringify(rows.map((r) => [r.kind, r.release.slice(0, 18), r.contrast, r.glyphPx, r.depthTest, r.renderOrder])));
  await ctx.close();
}
await browser.close();
report.pass = Object.values(report.profiles).every((x) => x.pass);
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
