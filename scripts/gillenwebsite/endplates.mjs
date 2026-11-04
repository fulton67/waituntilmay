// The drum's end plates (Rolodex.tsx), measured in the page:
//  - gap: each plate's outer face to the nearest housing surface beyond it along x, within the plate's radius of the
//    axle (the side plate on the right, the frame's side loop on the left); target 2-4 mm
//  - clearance: every sleeve vertex, at quarter-slot steps through a full turn, against each end-plate part in the
//    drum's frame: the plates and collars as discs (x span, radius), the struts as segments with their radius
//  - a 1440 x 900 render from the left three-quarter view
//   node scripts/gillenwebsite/endplates.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/endplates-report.json";
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto(`${BASE}/gillenwebsite`);
await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.allSmall, null, { timeout: 120000 });
await page.waitForTimeout(2500);
const report = await page.evaluate(async () => {
  const { rig, house, sleeveRadius } = window.__rolodex, raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const drum = rig.cards[0].parent;
  drum.updateMatrixWorld(true);
  const inv = drum.matrixWorld.clone().invert(), V = rig.camera.position.constructor;
  // the end-plate parts in the drum's frame: x span, radius about the axle, and (struts) their offset from it
  const parts = [];
  drum.traverse((o) => {
    if (o.name !== "endplate" || !o.isMesh) return;
    o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox, m = inv.clone().multiply(o.matrixWorld), pts = [];
    for (let k = 0; k < 8; k++) pts.push(new V(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z).applyMatrix4(m));
    const x0 = Math.min(...pts.map((p) => p.x)), x1 = Math.max(...pts.map((p) => p.x));
    const cy = (Math.min(...pts.map((p) => p.y)) + Math.max(...pts.map((p) => p.y))) / 2, cz = (Math.min(...pts.map((p) => p.z)) + Math.max(...pts.map((p) => p.z))) / 2;
    const rad = (Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y))) / 2;
    const strut = Math.hypot(cy, cz) > 0.01;
    parts.push({ kind: strut ? "strut" : x1 - x0 < 0.005 ? "plate" : "collar", x0, x1, rad, cy, cz });
  });
  // gaps: each plate's outer face to the housing beyond it, within its radius of the axle
  const gaps = [];
  for (const p of parts.filter((q) => q.kind === "plate")) {
    const side = Math.sign(p.x0 + p.x1), outer = side > 0 ? p.x1 : p.x0;
    let best = Infinity, who = "";
    house.traverse((o) => {
      if (!o.isMesh || !o.visible || /knob/.test(o.name)) return;
      const pos = o.geometry.attributes.position, m = inv.clone().multiply(o.matrixWorld), v = new V();
      for (let k = 0; k < pos.count; k++) {
        v.fromBufferAttribute(pos, k).applyMatrix4(m);
        if (Math.hypot(v.y, v.z) > p.rad) continue;
        const d = (v.x - outer) * side;
        if (d > -0.02 && d < best) { best = d; who = o.name; }
      }
    });
    gaps.push({ side: side > 0 ? "right" : "left", plateCentreX: +((p.x0 + p.x1) / 2).toFixed(4), outerFaceX: +outer.toFixed(4), nearest: who, gapMm: +(best * 1000).toFixed(2) });
  }
  // clearance: the sleeves through a full turn against the parts
  const was = rig.reduce; rig.reduce = true;
  let min = Infinity, at = null;
  const segDist = (px, py, pz, s) => { const x = Math.max(s.x0, Math.min(s.x1, px)); return Math.hypot(px - x, py - s.cy, pz - s.cz) - s.rad; };
  const discDist = (px, r, s) => { const dx = px < s.x0 ? s.x0 - px : px > s.x1 ? px - s.x1 : 0, dr = Math.max(0, r - s.rad); return Math.hypot(dx, dr); };
  for (let step = 0; step <= rig.TOTAL * 4; step += 2) {
    rig.pos = step / 4; rig.lastScroll = 0; await raf();
    drum.updateMatrixWorld(true);
    for (const c of rig.cards) {
      const body = c.children[0], pos = body.geometry.attributes.position, m = inv.clone().multiply(body.matrixWorld), v = new V();
      for (let k = 0; k < pos.count; k += 3) {
        v.fromBufferAttribute(pos, k).applyMatrix4(m);
        const r = Math.hypot(v.y, v.z);
        for (const s of parts) {
          const d = s.kind === "strut" ? segDist(v.x, v.y, v.z, s) : discDist(v.x, r, s);
          if (d < min) { min = d; at = { part: s.kind, slot: c.userData.i, pos: step / 4 }; }
        }
      }
    }
  }
  rig.pos = 0; await raf(); rig.reduce = was;
  return { parts: parts.map((p) => ({ ...p, x0: +p.x0.toFixed(4), x1: +p.x1.toFixed(4), rad: +p.rad.toFixed(4) })), gaps, sleeveClearanceMm: +(min * 1000).toFixed(1), closestAt: at, sleeveMaxRadiusM: +sleeveRadius().toFixed(5) };
});
report.gapsPass = report.gaps.every((g) => g.gapMm >= 2 && g.gapMm <= 4);
report.clearancePass = report.sleeveClearanceMm > 0;
// the left three-quarter view
const url = await page.evaluate(() => {
  const { gl, rig } = window.__rolodex;
  rig.setPaused?.(true);
  let scene = rig.cards[0]; while (scene.parent) scene = scene.parent;
  const cam = new rig.camera.constructor(30, 1440 / 900, 0.1, 30), t = [0, rig.axisY - 0.08, 0], dist = 2.6, el = 0.25, az = -Math.PI / 4;
  cam.position.set(t[0] + Math.sin(az) * Math.cos(el) * dist, t[1] + Math.sin(el) * dist, t[2] + Math.cos(az) * Math.cos(el) * dist);
  cam.lookAt(...t); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  gl.setSize(1440, 900, false); gl.render(scene, cam);
  const u = gl.domElement.toDataURL("image/png"); rig.setPaused?.(false); return u;
});
await fs.writeFile("docs/gillenwebsite/drum-left-three-quarter.png", Buffer.from(url.split(",")[1], "base64"));
await browser.close();
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ gaps: report.gaps, gapsPass: report.gapsPass, sleeveClearanceMm: report.sleeveClearanceMm, closestAt: report.closestAt, parts: report.parts.length }));
