// Do the covers flicker as the cards flip? Two checks, at 390 px DPR 3 and 1440 x 900 DPR 2:
//  - depth: the drum is stepped through two flips (s from 0.5 to 2.5 in 1/40 steps) with every cover drawn flat
//    magenta. On a 7 x 7 grid inside each cover in view, a point where the cover shows once its own card's paper is
//    hidden must show it with the paper there too; if not, the paper won the depth test (z-fighting). And at each of
//    those points, how many depth-buffer steps lie between the cover and the paper under it: this GPU may resolve a
//    gap of one or two steps, a phone's may not, so the gap has to be at least 16 steps everywhere.
//  - texture swap: while a wheel notch every 300 ms turns the drum through all 36 cards (big covers loading as cards
//    settle), every frame, for every cover drawn: does it have a texture, and is that texture already on the GPU?
//   node scripts/gillenwebsite/flicker.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/flicker-report.json";
const PROFILES = [
  { name: "phone", w: 390, h: 844, dpr: 3, mobile: true },
  { name: "desktop", w: 1440, h: 900, dpr: 2, mobile: false },
];
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"] });
const report = { base: BASE, at: new Date().toISOString(), profiles: {} };

for (const p of PROFILES) {
  const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, isMobile: p.mobile, hasTouch: p.mobile });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite`);
  await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.firstCardTexture, null, { timeout: 120000 });
  await page.waitForTimeout(4000);
  const out = { viewport: `${p.w}x${p.h}@${p.dpr}` };

  // texture swap: hook every cover mesh's onBeforeRender
  await page.evaluate(() => {
    const { gl, rig } = window.__rolodex;
    const s = (window.__swap = { draws: 0, blank: 0, notUploaded: 0, frames: 0, examples: [] });
    const props = gl.properties;
    for (const card of rig.cards) {
      const cover = card.children[0].children[2];
      cover.onBeforeRender = () => {
        const m = cover.material;
        if (!m.visible) return;
        s.draws++;
        if (!m.map) { s.blank++; if (s.examples.length < 5) s.examples.push(`blank card ${card.userData.i}`); return; }
        const tp = props.get(m.map);
        if (!tp.__webglTexture || tp.__version !== m.map.version) { s.notUploaded++; if (s.examples.length < 5) s.examples.push(`not uploaded card ${card.userData.i} ${m.map.image?.width}`); }
      };
    }
    const tick = () => { s.frames++; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await page.mouse.move(p.w * 0.3, p.h * 0.5);
  for (let k = 0; k < 36; k++) { await page.mouse.wheel(0, 100); await page.waitForTimeout(300); }
  await page.waitForTimeout(800);
  out.swap = await page.evaluate(() => window.__swap);
  out.swap.pass = out.swap.blank === 0 && out.swap.notUploaded === 0;

  // depth: step the drum through the flip. Render A is the scene as it is, with the covers flat magenta. For each card
  // in view, render B hides that card's own body and paper: a grid point that is magenta in B (nothing else is in
  // front of the cover there) but not in A is the card's own paper drawn over its cover.
  out.depth = await page.evaluate(async () => {
    const { gl, rig } = window.__rolodex;
    const raf = () => new Promise((r) => requestAnimationFrame(r));
    let scene = rig.cards[0]; while (scene.parent) scene = scene.parent;
    const cam = rig.camera, c3 = gl.getContext();
    const parts = rig.cards.map((c) => c.children[0].children); // body, face, cover
    const saved = parts.map((p) => p[2].material);
    const flat = saved.map((m) => {
      const f = m.clone();
      f.map = null; f.normalMap = null; f.color.set(0x000000); f.emissive.set(0xff00ff); f.envMapIntensity = 0; f.toneMapped = false; f.visible = true;
      return f;
    });
    const types = []; scene.traverse((o) => { if (o.isMesh && o._members) types.push(o); });
    const W = c3.drawingBufferWidth, H = c3.drawingBufferHeight;
    // the cover, lit or in shadow, has blue well above green; the paper (~239,232,216) has blue below green
    const magenta = (b, o) => b[o + 2] - b[o + 1] > 25;
    const bits = c3.getParameter(c3.DEPTH_BITS) || 24;
    const res = { depthBits: bits, minDepthSteps: Infinity, steps: 0, cardsChecked: 0, samples: 0, wrong: 0, worst: [] };
    rig.reduce = true;
    for (let k = 0; k <= 80; k++) {
      const x = 0.5 + k / 40;
      rig.pos = x; rig.lastScroll = performance.now(); rig.fling = null;
      await raf(); await raf();
      const tv = types.map((t) => t.visible); types.forEach((t) => { t.visible = false; });
      parts.forEach((p, i) => { p[2].material = flat[i]; });
      // grid points of every cover in view, in drawing-buffer pixels
      const grids = [];
      parts.forEach((p, i) => {
        const c = p[2]; c.updateWorldMatrix(true, false);
        const b = (c.geometry.computeBoundingBox(), c.geometry.boundingBox), pts = [];
        const fb = (p[1].geometry.computeBoundingBox(), p[1].geometry.boundingBox);
        for (let a = 0; a < 7; a++) for (let d = 0; d < 7; d++) {
          const lx = b.min.x + (b.max.x - b.min.x) * (0.1 + (0.8 * a) / 6), ly = b.min.y + (b.max.y - b.min.y) * (0.1 + (0.8 * d) / 6);
          const v = c.localToWorld(new cam.position.constructor(lx, ly, b.max.z)).project(cam);
          if (!(Math.abs(v.x) < 0.98 && Math.abs(v.y) < 0.98 && v.z > -1 && v.z < 1)) continue;
          // and where the camera ray through it meets the paper's plane: how many depth-buffer steps separate the two
          // in that pixel (polygon offset aside)
          const V = cam.position.constructor, P = c.localToWorld(new V(lx, ly, b.max.z)), Q = c.localToWorld(new V(lx, ly, fb.max.z));
          const n = c.localToWorld(new V(lx, ly, b.max.z + 1)).sub(P).normalize(), C = cam.getWorldPosition(new V()), dir = P.clone().sub(C);
          const u = C.clone().addScaledVector(dir, n.dot(Q.clone().sub(C)) / n.dot(dir)).project(cam);
          pts.push([Math.round((v.x + 1) * 0.5 * (W - 1)), Math.round((v.y + 1) * 0.5 * (H - 1)), ((u.z - v.z) / 2) * 2 ** bits]);
        }
        if (pts.length) grids.push({ i, pts });
      });
      const read = (pts) => pts.map(([px, py]) => { const b = new Uint8Array(4); c3.readPixels(px, py, 1, 1, c3.RGBA, c3.UNSIGNED_BYTE, b); return b; });
      gl.render(scene, cam);
      const A = grids.map((g) => read(g.pts));
      grids.forEach((g, gi) => {
        const [body, face] = parts[g.i];
        body.visible = face.visible = false;
        gl.render(scene, cam);
        const B = read(g.pts);
        body.visible = face.visible = true;
        let seen = 0;
        B.forEach((pb, j) => {
          if (!(pb[0] - pb[1] > 60 && pb[2] - pb[1] > 60)) return;
          seen++; res.samples++;
          res.minDepthSteps = Math.min(res.minDepthSteps, g.pts[j][2]);
          if (!magenta(A[gi][j], 0)) { res.wrong++; if (res.worst.length < 8) res.worst.push({ s: x, card: g.i, at: g.pts[j].slice(0, 2), rgb: [...A[gi][j].slice(0, 3)] }); }
        });
        if (seen) res.cardsChecked++;
      });
      parts.forEach((p, i) => { p[2].material = saved[i]; });
      types.forEach((t, i) => { t.visible = tv[i]; });
      res.steps++;
    }
    rig.reduce = false; rig.pos = 0; rig.lastScroll = 0;
    res.minDepthSteps = Math.round(res.minDepthSteps * 10) / 10;
    return res;
  });
  // the settings as drawn: camera planes; cover and type materials (the type's is troika's derived copy)
  out.materials = await page.evaluate(() => {
    const { rig } = window.__rolodex;
    let scene = rig.cards[0]; while (scene.parent) scene = scene.parent;
    const [body, face, cover] = rig.cards[0].children[0].children, cm = cover.material;
    const batch = []; scene.traverse((o) => { if (o._members) batch.push(o); });
    const tm = batch[0]?.material, flags = (m) => m && { transparent: m.transparent, alphaTest: m.alphaTest, depthWrite: m.depthWrite, polygonOffset: m.polygonOffset, factor: m.polygonOffsetFactor, units: m.polygonOffsetUnits };
    const others = [body, face].map((m) => m.material).filter((m) => m.transparent || m.alphaTest > 0).length;
    return { near: rig.camera.near, far: rig.camera.far, order: { body: body.renderOrder, face: face.renderOrder, cover: cover.renderOrder, type: batch[0]?.renderOrder }, coverAboveFace: +((cover.geometry.boundingBox?.max.z ?? 0) - (face.geometry.boundingBox?.max.z ?? 0)).toFixed(5), cover: flags(cm), type: flags(Array.isArray(tm) ? tm[0] : tm), transparentOnCardBodyOrFace: others };
  });
  const m = out.materials;
  m.pass = m.near === 0.1 && m.far === 20 && m.order.cover > m.order.body && m.order.type > m.order.cover && m.coverAboveFace >= 0.0015 &&
    !m.cover.transparent && m.cover.alphaTest === 0 && m.cover.polygonOffset && m.cover.factor === -1 && m.cover.units === -1 &&
    m.type.depthWrite === false && m.type.polygonOffset && m.transparentOnCardBodyOrFace === 0;
  out.depth.pass =out.depth.samples > 2000 && out.depth.wrong === 0 && out.depth.minDepthSteps >= 16;
  report.profiles[p.name] = out;
  console.log(p.name, JSON.stringify(out));
  await ctx.close();
}
await browser.close();
await fs.writeFile(path.resolve(ROOT, OUT), JSON.stringify(report, null, 2) + "\n");
