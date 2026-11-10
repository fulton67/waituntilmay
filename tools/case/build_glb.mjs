// node build_glb.mjs  ->  build/sie-case-raw.glb
// The jewel case, to real dimensions. 1 unit = 100 mm. Hinge pin on the Y axis through x=0, z=0;
// the lid opens with hinge.rotation.y = -theta and lies flat at 180 degrees.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMaterialsTransmission, KHRMaterialsIOR } from '@gltf-transform/extensions';
import fs from 'fs';

/* v9: "the bottom and top of the front are a bit too thin ... you can't really tell it's
   still the CD", and from below "I don't want to see inside". So the top and bottom edges are
   real edges now: the case is 131 mm tall instead of 125 (the booklet stays 120 and centred),
   and the walls along those two edges are 2.6 mm thick instead of 1.3. With the lid's wall
   outside and the base's wall inside it, that is a 5.4 mm band of plastic above and below
   the cover, and the viewer draws those walls as solid smoked plastic rather than clear. */
/* v10: v9 overshot -- "the bottom is too chunky now, and it looks unrealistic because it's
   not textured". So the edges come most of the way back (1.6 mm walls, 127.4 mm tall, 13 mm
   deep) and get what a real jewel case has there instead of bulk: the ribbed thumb grips
   moulded into the top and bottom edges of the lid near the opening side. */
const X0 = -0.04, X1 = 1.38, Y0 = -0.012, Y1 = 1.262; // 142 x 127.4 mm
const TW = 0.016;                                     // top and bottom walls
const ZB = -0.052, ZF = 0.052;                        // 10.4 mm
const T = 0.013;                                      // 1.3 mm walls and panels
const R = 0.004, SEG = 3;                             // 0.4 mm edge radius, 3 segments
const CX = 0.7325, CY = 0.625;                        // hub centre
const COVER_X = 0.746;                                // booklet centre (measured off photo 1)
/* v8: "it looks really thin from the top or the bottom". A real case is 10.4 mm; this one is
   drawn 14 mm deep. Every part is built at true size and then stretched along z about the
   hinge pin (z = 0), so the pin, the lid's swing and the flat 180 degree pose are unchanged. */
const DEPTH_SCALE = 13 / 10.4;

const box = (x0, x1, y0, y1, z0, z1, r = R, seg = SEG) => {
  const g = new RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, seg,
    Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g;
};
const hard = (x0, x1, y0, y1, z0, z1) => {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g;
};
const merge = gs => mergeGeometries(gs.map(g => {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
  return n;
}), false);

const parts = [];   // { name, parent, geo, mat, t }
const add = (name, geo, mat, parent = null, t = [0, 0, 0]) => parts.push({ name, geo, mat, parent, t });

/* ------------------------------------------------------------------ base */
add('base_back_clear', box(X0, X1, Y0, Y1, ZB, ZB + T), 'clear');
const WY0 = Y0 + TW + 0.002, WY1 = Y1 - TW - 0.002;     // base walls sit just inside the lid's walls
add('base_wall_top', box(X0, X1, WY1 - TW, WY1, ZB + T - R, 0.024), 'clear');
add('base_wall_bottom', box(X0, X1, WY0, WY0 + TW, ZB + T - R, 0.024), 'clear');
add('base_wall_right', box(X1 - T, X1, WY0, WY1, ZB + T - R, 0.024), 'clear');
add('base_wall_hinge', box(X0, X0 + T, WY0, WY1, ZB + T - R, 0.024), 'clear');

/* tray: a plate, the two raised cheeks either side of the disc well (the well is wider than the
   tray is tall, so it breaks through top and bottom exactly as in photo 3), and the ribbed strip
   beside the hinge that shows through the lid to the left of the booklet in photo 1. */
const TZ0 = -0.035, TZ1 = -0.022, TTOP = 0.012, WELL = 0.615;
const TX0 = -0.025, TX1 = 1.365, TY0 = WY0 + TW + 0.001, TY1 = WY1 - TW - 0.001, RIBX = 0.10;
const cheek = side => {
  const hy = (TY1 - TY0) / 2, dx = Math.sqrt(WELL * WELL - hy * hy), phi = Math.atan2(hy, dx), N = 40;
  const xe = side < 0 ? RIBX : TX1;
  const s = new THREE.Shape();
  s.moveTo(xe, TY0); s.lineTo(CX + side * dx, TY0);
  for (let i = 0; i <= N; i++) {
    const a = (Math.PI + phi) - (2 * phi) * (i / N);          // lower corner, through 180 deg, to upper
    s.lineTo(CX - side * Math.cos(a) * WELL, CY + Math.sin(a) * WELL);
  }
  s.lineTo(CX + side * dx, TY1); s.lineTo(xe, TY1); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: TTOP - TZ1 - 0.003, bevelEnabled: true,
    bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1, curveSegments: 8 });
  g.translate(0, 0, TZ1); return g;
};
const trayGeos = [hard(TX0, TX1, TY0, TY1, TZ0, TZ1), cheek(-1), cheek(1), hard(TX0, RIBX, TY0, TY1, TZ1, 0.004)];
for (let i = 0; i < 15; i++) {
  const x = TX0 + 0.006 + i * 0.008;
  trayGeos.push(hard(x, x + 0.004, TY0 + 0.01, TY1 - 0.01, 0.004, 0.010));
}
add('tray_black', merge(trayGeos), 'tray');

/* hub: a seat the disc rests on, twelve prongs round a 15.3 mm post, a low cap */
const cyl = (r, z0, z1, seg = 32) => {
  const g = new THREE.CylinderGeometry(r, r, z1 - z0, seg);
  g.rotateX(Math.PI / 2); g.translate(0, 0, (z0 + z1) / 2); return g;
};
const hubGeos = [cyl(0.17, TZ1, -0.012, 40), cyl(0.05, -0.012, 0.002, 24)];
for (let i = 0; i < 12; i++) {
  const g = new THREE.BoxGeometry(0.03, 0.026, 0.032);        // radial 3 mm, tangential 2.6 mm, 2 mm proud of the disc
  g.translate(0.0765 - 0.015, 0, -0.012 + 0.016); g.rotateZ(i / 12 * Math.PI * 2); hubGeos.push(g);
}
const hubG = merge(hubGeos); hubG.translate(CX, CY, 0); add('hub', hubG, 'tray');

/* paper in the base: one card, back panel 137 x 118 and two 6.5 mm spines folded up */
const plane = (w, h) => new THREE.PlaneGeometry(w, h);
{ const g = plane(1.37, 1.18); g.rotateY(Math.PI); g.translate((X0 + X1) / 2, CY, ZB + T + 0.0015); add('C_back_traycard', g, 'C'); }
{ const g = plane(0.065, 1.18); g.rotateY(-Math.PI / 2); g.translate(X0 + T + 0.0008, CY, ZB + T + 0.0015 + 0.0325); add('D_spine_hinge', g, 'D'); }
{ const g = plane(0.065, 1.18); g.rotateY(Math.PI / 2); g.translate(X1 - T - 0.0008, CY, ZB + T + 0.0015 + 0.0325); add('E_spine_open', g, 'E'); }

/* disc: 120 mm, 15 mm hole, 1.2 mm thick. The printed label starts at 22 mm (measured off the
   photo); inside that is the clear moulded ring every CD has. Its own node, spinning on rotation.z. */
const DZ = -0.006;
const ring = (r0, r1, z, up) => {
  const g = new THREE.RingGeometry(r0, r1, 96, 1); const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 1.2 + 0.5, p.getY(i) / 1.2 + 0.5);
  if (!up) g.rotateY(Math.PI);
  g.translate(0, 0, z); return g;
};
const tube = (r, z0, z1, inward) => {
  const g = new THREE.CylinderGeometry(r, r, z1 - z0, 96, 1, true);
  g.rotateX(Math.PI / 2); g.translate(0, 0, (z0 + z1) / 2);
  if (inward) {
    const idx = g.index.array;
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i]; idx[i] = idx[i + 1]; idx[i + 1] = t; }
    const n = g.attributes.normal.array; for (let i = 0; i < n.length; i++) n[i] = -n[i];
  }
  return g;
};
add('F_disc', null, null, null, [CX, CY, DZ]);
add('F_disc_label', ring(0.11, 0.6, 0.006, true), 'F', 'F_disc');
add('F_disc_under', merge([ring(0.075, 0.6, -0.006, false), tube(0.6, -0.006, 0.006, false), tube(0.075, -0.006, 0.006, true)]), 'disc_under', 'F_disc');
add('F_disc_inner_clear', ring(0.075, 0.11, 0.006, true), 'clear', 'F_disc');

/* ------------------------------------------------------------------- lid */
add('hinge', null, null);
const LX0 = 0.035, LZ = ZF - T;                      // LZ = underside of the lid panel
add('lid_clear', box(LX0, X1, Y0, Y1, LZ, ZF), 'clear', 'hinge');
/* the thumb grips: fourteen fine ribs standing 0.3 mm proud of each edge, by the opening side */
const grips = (yFace, dir) => {
  const out = [];
  for (let i = 0; i < 14; i++) {
    const x = 0.98 + i * 0.022;
    out.push(box(x, x + 0.010, dir > 0 ? yFace : yFace - 0.003, dir > 0 ? yFace + 0.003 : yFace, -0.016, LZ - 0.004, 0.0012, 1));
  }
  return out;
};
add('lid_wall_bottom', merge([box(0.022, X1, Y0, Y0 + TW, -0.020, LZ + R), ...grips(Y0, -1)]), 'clear', 'hinge');
add('lid_wall_top', merge([box(0.022, X1, Y1 - TW, Y1, -0.020, LZ + R), ...grips(Y1, 1)]), 'clear', 'hinge');
/* hinge arms: the lid's side walls run on past the panel and carry the pins that sit in the base walls */
const pin = (y0, y1) => { const g = new THREE.CylinderGeometry(0.012, 0.012, y1 - y0, 16); g.translate(0, (y0 + y1) / 2, 0); return g; };
add('lid_knuckle_0', merge([box(-0.03, 0.03, Y0, Y0 + TW, -0.03, 0.03, 0.006), pin(Y0 + TW, WY0 + TW)]), 'clear', 'hinge');
add('lid_knuckle_1', merge([box(-0.03, 0.03, Y1 - TW, Y1, -0.03, 0.03, 0.006), pin(WY1 - TW, Y1 - TW)]), 'clear', 'hinge');
/* four half-moon booklet tabs, two on each side wall, 4 mm radius, 0.8 mm thick, 1 mm under the panel */
let ti = 0;
for (const y of [Y0 + TW, Y1 - TW]) for (const x of [0.28, 1.15]) {
  const g = new THREE.CylinderGeometry(0.04, 0.04, 0.008, 20, 1, false, 0, Math.PI);   // half disc, axis Y, bulging +x
  g.rotateX(Math.PI / 2);                                                             // axis -> Z
  g.rotateZ(y < CY ? Math.PI / 2 : -Math.PI / 2);                                      // bulge into the case
  g.translate(x, y, LZ - 0.010 - 0.004); add('lid_tab_' + ti++, g, 'clear', 'hinge');
}
/* booklet: 120 x 120, 0.3 mm, tucked under the tabs against the panel */
{ const g = plane(1.2, 1.2); g.translate(COVER_X, CY, LZ - 0.002); add('A_front_cover', g, 'A', 'hinge'); }
{ const g = plane(1.2, 1.2); g.rotateY(Math.PI); g.translate(COVER_X, CY, LZ - 0.005); add('B_inside_cover', g, 'B', 'hinge'); }

/* ---------------------------------------------------------------- export */
const doc = new Document(); const buf = doc.createBuffer(); const scene = doc.createScene('case');
const tr = doc.createExtension(KHRMaterialsTransmission), ior = doc.createExtension(KHRMaterialsIOR);
const mats = {
  clear: doc.createMaterial('clear_plastic').setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(0.05).setMetallicFactor(0)
    .setExtension('KHR_materials_transmission', tr.createTransmission().setTransmissionFactor(1))
    .setExtension('KHR_materials_ior', ior.createIOR().setIOR(1.59)),
  tray: doc.createMaterial('tray_black').setBaseColorFactor([0.0033, 0.0033, 0.0033, 1]).setRoughnessFactor(0.35).setMetallicFactor(0),
  disc_under: doc.createMaterial('disc_under').setBaseColorFactor([0.68, 0.68, 0.68, 1]).setRoughnessFactor(0.15).setMetallicFactor(1),
};
for (const k of 'ABCDEF') {
  const tex = doc.createTexture(k).setImage(fs.readFileSync('build/tex/' + k + '.png')).setMimeType('image/png');
  mats[k] = doc.createMaterial(k === 'F' ? 'F_disc' : 'paper_' + k).setBaseColorTexture(tex)
    .setRoughnessFactor(k === 'F' ? 0.5 : 0.55).setMetallicFactor(0);
}
const nodes = {}; let tris = 0; const bounds = new THREE.Box3();
for (const p of parts) {
  const n = doc.createNode(p.name).setTranslation([p.t[0], p.t[1], p.t[2] * DEPTH_SCALE]); nodes[p.name] = n;
  if (!p.geo) continue;
  const g = p.geo;
  {
    const pos = g.attributes.position, nor = g.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, pos.getZ(i) * DEPTH_SCALE);
      /* normals transform by the inverse scale, then renormalise: keeps the bevels smooth */
      const x = nor.getX(i), y = nor.getY(i), z = nor.getZ(i) / DEPTH_SCALE, l = Math.hypot(x, y, z) || 1;
      nor.setXYZ(i, x / l, y / l, z / l);
    }
  }
  g.computeBoundingBox();
  bounds.union(g.boundingBox.clone().translate(new THREE.Vector3(...(p.parent === 'F_disc' ? [CX, CY, DZ * DEPTH_SCALE] : [p.t[0], p.t[1], p.t[2] * DEPTH_SCALE]))));
  const prim = doc.createPrimitive().setMaterial(mats[p.mat]);
  prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.attributes.position.array)).setBuffer(buf));
  prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.attributes.normal.array)).setBuffer(buf));
  if ('ABCDEF'.includes(p.mat)) {
    const uv = new Float32Array(g.attributes.uv.array);
    for (let i = 1; i < uv.length; i += 2) uv[i] = 1 - uv[i];      // glTF's v runs down
    prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(uv).setBuffer(buf));
  }
  if (g.index) prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(g.index.array)).setBuffer(buf));
  tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
  n.setMesh(doc.createMesh(p.name).addPrimitive(prim));
}
for (const p of parts) (p.parent ? nodes[p.parent].addChild(nodes[p.name]) : scene.addChild(nodes[p.name]));
fs.mkdirSync('build', { recursive: true });
await new NodeIO().registerExtensions([KHRMaterialsTransmission, KHRMaterialsIOR]).write('build/sie-case-raw.glb', doc);
const s = bounds.getSize(new THREE.Vector3());
console.log(JSON.stringify({ tris, size_mm: [s.x, s.y, s.z].map(v => +(v * 100).toFixed(2)),
  min: bounds.min.toArray().map(v => +v.toFixed(4)), max: bounds.max.toArray().map(v => +v.toFixed(4)),
  bytes: fs.statSync('build/sie-case-raw.glb').size }));
