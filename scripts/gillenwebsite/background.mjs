// The white around the Rolodex on /gillenwebsite: at 20 camera angles (elevation 0.04-1.2 rad x azimuth -1.2-2.6
// rad, set on the orbit directly), every pixel of the stage outside the Rolodex's silhouette and its shadow must be
// pure #ffffff. The page's DOM is hidden (only the canvas drawn), and three frames are captured per angle:
//  A: the stage as drawn
//  B: the floor (shadow-only plane and contact decal) hidden: what is not white is the Rolodex's silhouette
//  C: the Rolodex drawn invisibly (no colour, no depth) but still casting: what is not white is its shadow (and the
//     contact decal), kept only on the floor within SHADOW_R of the drum's foot, so a line far off on the floor counts
//  D: as C with the key light's shadow camera four times as wide and deep (the shadow map drawn again): the shadow
//     as it would be if nothing of it were cut off
// A pixel of A off #ffffff that is in neither B's silhouette (grown by 2 px for its antialiased edge) nor C's shadow
// is a fault. A pixel shadowed in D but white in C, more than 4 px from C's shadow (D's coarser map has a wider
// penumbra), is the shadow cut off by the edge of the shadow camera: a straight edge on the white. Reports per angle:
// faults, the darkest fault and where the faults are (their box), and the cut-off pixels. Also the Rolodex's extent
// in the light's view (metres), which the shadow camera must cover.
//   node scripts/gillenwebsite/background.mjs [base-url] [--out file] [--shots dir]
import { chromium } from "@playwright/test";
import sharp from "sharp";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/background-report.json";
const SHOTS = argv.includes("--shots") ? argv[argv.indexOf("--shots") + 1] : null;
// the viewport: --size WxH@dpr (default 1440x900@1)
const SIZE = (argv.includes("--size") ? argv[argv.indexOf("--size") + 1] : "1440x900@1").match(/(\d+)x(\d+)@([\d.]+)/);
const VW = +SIZE[1], VH = +SIZE[2], DPR = +SIZE[3], SHADOW_R = 1.6;
const ANGLES = [0.04, 0.15, 0.4, 0.8, 1.2].flatMap((el) => [-1.2, 0, 1.2, 2.6].map((az) => ({ az, el })));

const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"] });
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR });
await ctx.addInitScript(() => { try { localStorage.setItem("gillenwebsite:intro-seen", "1"); } catch {} });
const page = await ctx.newPage();
await page.goto(`${BASE}/gillenwebsite`);
await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.allSmall, null, { timeout: 120000 });
await page.waitForTimeout(2500);
// only the canvas: every other element hidden
await page.addStyleTag({ content: "body * { visibility: hidden !important; } canvas, canvas * { visibility: visible !important; }" });
await page.evaluate(() => {
  const rig = window.__rolodex.rig;
  let o = rig.cards[0];
  while (o.parent && o.parent.parent) o = o.parent;
  const scene = o.parent, rolodex = o;
  const floor = scene.children.filter((m) => m.isMesh && (m.material.type === "ShadowMaterial" || (m.material.map && m.material.transparent && m.geometry.type === "PlaneGeometry")));
  window.__bg = {
    scene, rolodex, floor,
    set: (az, el) => { rig.az = rig.camAz = az; rig.el = rig.camEl = el; },
    mode: (m) => {
      floor.forEach((f) => { f.visible = m !== "B"; });
      rolodex.traverse((x) => { if (!x.material) return; for (const mat of [].concat(x.material)) { mat.userData.cw ??= mat.colorWrite; mat.userData.dw ??= mat.depthWrite; mat.colorWrite = m === "C" ? false : mat.userData.cw; mat.depthWrite = m === "C" ? false : mat.userData.dw; } });
    },
    // the floor within SHADOW_R of the drum's foot, as a screen polygon (CSS px)
    footprint: (R) => {
      const cam = rig.camera, v = (x, z) => { const p = new cam.position.constructor(x, 0, z).project(cam); return [(p.x + 1) * 0.5 * innerWidth, (1 - p.y) * 0.5 * innerHeight, p.z]; };
      return Array.from({ length: 96 }, (_, k) => v(Math.cos((k / 96) * Math.PI * 2) * R, Math.sin((k / 96) * Math.PI * 2) * R));
    },
    floorInfo: () => floor.map((f) => ({ type: f.material.type, size: f.geometry.parameters, position: f.position.toArray(), transparent: f.material.transparent, opacity: f.material.opacity })),
    light: scene.children.find((x) => x.isDirectionalLight),
    // the shadow camera at k times its size; the shadow map drawn again (the drum draws it when `lifted` changes)
    shadowScale: (k) => {
      const l = window.__bg.light, c = l.shadow.camera;
      c.userData.b ??= { left: c.left, right: c.right, top: c.top, bottom: c.bottom, far: c.far };
      const b = c.userData.b;
      Object.assign(c, { left: b.left * k, right: b.right * k, top: b.top * k, bottom: b.bottom * k, far: b.far * k });
      c.updateProjectionMatrix();
      rig.lifted = rig.lifted === -1 ? -3 : -1;
    },
    // every mesh of the Rolodex (all sleeves, any turn: their bounding spheres) in the light's view: x and y extent
    lightExtent: () => {
      const l = window.__bg.light, c = l.shadow.camera;
      l.updateMatrixWorld(); c.position.copy(l.position); c.lookAt(l.target.position); c.updateMatrixWorld();
      const inv = c.matrixWorldInverse.clone().copy(c.matrixWorld).invert();
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      rolodex.updateMatrixWorld(true);
      rolodex.traverse((m) => {
        if (!m.isMesh || !m.castShadow) return;
        if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
        const sp = m.geometry.boundingSphere.clone().applyMatrix4(m.matrixWorld), p = sp.center.clone().applyMatrix4(inv);
        x0 = Math.min(x0, p.x - sp.radius); x1 = Math.max(x1, p.x + sp.radius); y0 = Math.min(y0, p.y - sp.radius); y1 = Math.max(y1, p.y + sp.radius);
      });
      const cam = l.shadow.camera;
      return { light: [+x0.toFixed(3), +x1.toFixed(3), +y0.toFixed(3), +y1.toFixed(3)], shadowCamera: [cam.left, cam.right, cam.bottom, cam.top] };
    },
  };
});
const frames = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
const grab = async (name) => {
  const png = await page.screenshot({ type: "png", scale: "css" });
  if (SHOTS) await fs.writeFile(`${SHOTS}/${name}.png`, png);
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};
const inPoly = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };

const W = VW, H = VH;
const report = { base: BASE, at: new Date().toISOString(), viewport: [VW, VH, DPR], floor: await page.evaluate(() => window.__bg.floorInfo()), lightExtent: await page.evaluate(() => window.__bg.lightExtent()), angles: [] };
console.log("floor", JSON.stringify(report.floor), "extent", JSON.stringify(report.lightExtent));
for (const [n, { az, el }] of ANGLES.entries()) {
  // (the pointer moved, so the screensaver and the idle intro never start and turn the drum between captures)
  await page.mouse.move(5 + (n % 2), VH - 5);
  await page.evaluate(([az, el]) => window.__bg.set(az, el), [az, el]);
  await page.evaluate(() => window.__bg.mode("A")); await frames();
  const tag = `az${az}_el${el}`;
  const A = await grab(`${tag}-A`);
  await page.evaluate(() => window.__bg.mode("B")); await frames();
  const B = await grab(`${tag}-B`);
  await page.evaluate(() => window.__bg.mode("C")); await frames();
  const C = await grab(`${tag}-C`);
  await page.evaluate(() => window.__bg.shadowScale(4)); await frames();
  const D = await grab(`${tag}-D`);
  await page.evaluate(() => window.__bg.shadowScale(1)); await frames();
  await page.evaluate(() => window.__bg.mode("A"));
  const poly = await page.evaluate((R) => window.__bg.footprint(R), SHADOW_R);
  const behind = poly.some((p) => p[2] > 1);
  const white = (I, k) => I.data[k] === 255 && I.data[k + 1] === 255 && I.data[k + 2] === 255;
  // the silhouette, grown 2 px
  const sil = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!white(B, (y * W + x) * 3)) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H) sil[Y * W + X] = 1; }
  let faults = 0, darkest = 255, box = null, shadowPx = 0, silPx = 0, checked = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, k = i * 3;
    if (sil[i]) { silPx++; continue; }
    if (!white(C, k) && (behind || inPoly(poly, x + 0.5, y + 0.5))) { shadowPx++; continue; }
    checked++;
    if (!white(A, k)) {
      faults++;
      darkest = Math.min(darkest, A.data[k], A.data[k + 1], A.data[k + 2]);
      box = box ? [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)] : [x, y, x, y];
    }
  }
  // the shadow cut off: shadowed in D, white in C, more than 4 px from C's shadow
  const near = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!white(C, (y * W + x) * 3)) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H) near[Y * W + X] = 1; }
  let cut = 0, cutBox = null;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, k = i * 3; if (!near[i] && !sil[i] && Math.min(D.data[k], D.data[k + 1], D.data[k + 2]) < 250) { cut++; cutBox = cutBox ? [Math.min(cutBox[0], x), Math.min(cutBox[1], y), Math.max(cutBox[2], x), Math.max(cutBox[3], y)] : [x, y, x, y]; } }
  const r = { az, el, checkedPx: checked, silhouettePx: silPx, shadowPx, faults, darkest: faults ? darkest : null, faultBox: box, shadowCutPx: cut, cutBox };
  report.angles.push(r);
  console.log(JSON.stringify(r));
}
await browser.close();
report.faultyAngles = report.angles.filter((a) => a.faults).length;
report.cutAngles = report.angles.filter((a) => a.shadowCutPx).length;
report.pass = report.faultyAngles === 0 && report.cutAngles === 0;
console.log("faulty angles", report.faultyAngles, "angles with the shadow cut off", report.cutAngles, "pass", report.pass);
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
