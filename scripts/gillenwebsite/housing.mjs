// The housing textured from the painted part sheets (kit/bake), checked in headed Chrome:
//  - renders of the Rolodex from the four cardinal angles and from the two sheet views (orthographic, along
//    (1, 0.8, 1.6) and (-1, 0.6, -1.6)) at 1440 x 900, into docs/gillenwebsite/housing-*.png and a contact sheet
//  - the fit (IoU per part per view) and the atlas coverage (projection vs tile) from kit/work, and which parts were
//    left on their previous material
//  - the texture memory the baked parts and the paper add (RGBA8 with mips)
//  - fps through every sleeve: run scripts/gillenwebsite/sleeves.mjs for that (its numbers are copied in with --fps)
//   node scripts/gillenwebsite/housing.mjs [base-url] [--fps docs/gillenwebsite/sleeves-report.json]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import sharp from "sharp";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const FPS = argv.includes("--fps") ? argv[argv.indexOf("--fps") + 1] : null;
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto(`${BASE}/gillenwebsite`);
await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.allSmall, null, { timeout: 120000 });
await page.waitForTimeout(3000);
const VIEWS = [
  { name: "north", az: 0 }, { name: "east", az: Math.PI / 2 }, { name: "south", az: Math.PI }, { name: "west", az: -Math.PI / 2 },
  { name: "sheet-front", dir: [1, 0.8, 1.6] }, { name: "sheet-back", dir: [-1, 0.6, -1.6] },
  { name: "front-three-quarter", az: Math.PI / 4 },
];
const shots = [];
for (const v of VIEWS) {
  const url = await page.evaluate((v) => {
    const { gl, rig } = window.__rolodex;
    rig.setPaused?.(true);
    let scene = rig.cards[0];
    while (scene.parent) scene = scene.parent;
    const T = scene.children[0].constructor; // any Object3D; reach three's classes through the camera
    const C = rig.camera.constructor;
    const target = [0, rig.axisY - 0.12, 0];
    let cam;
    if (v.dir) {
      // orthographic like the kit's sheets, framed on the whole housing
      const O = Object.getPrototypeOf(rig.camera).constructor;
      const n = Math.hypot(...v.dir), d = v.dir.map((x) => x / n), half = 0.62;
      cam = new C(30, 1440 / 900, 0.1, 30);
      cam.isPerspectiveCamera = true;
      // a long lens far away is as good as orthographic for a screenshot: fov small, distance large
      cam.fov = 3; cam.position.set(target[0] + d[0] * 26, target[1] + d[1] * 26, target[2] + d[2] * 26);
      cam.zoom = (0.7 / half) * 1.0;
    } else {
      cam = new C(30, 1440 / 900, 0.1, 30);
      const dist = 3.1, el = 0.22;
      cam.position.set(target[0] + Math.sin(v.az) * Math.cos(el) * dist, target[1] + Math.sin(el) * dist, target[2] + Math.cos(v.az) * Math.cos(el) * dist);
    }
    cam.lookAt(...target);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    gl.setSize(1440, 900, false);
    gl.render(scene, cam);
    const out = gl.domElement.toDataURL("image/png");
    rig.setPaused?.(false);
    return out;
  }, v);
  const buf = Buffer.from(url.split(",")[1], "base64");
  const file = `docs/gillenwebsite/housing-${v.name}.png`;
  await fs.writeFile(file, buf);
  shots.push({ name: v.name, file });
}
const mem = await page.evaluate(() => window.__rolodex.bakedTextureMB());
// the sleeves against the cradle through a full turn: every sleeve vertex's distance from the drum axis, against the
// nearest the cradle's inside comes to the axis, at quarter-slot steps
const cradle = await page.evaluate(async () => {
  const { rig, cradle, sleeveRadius } = window.__rolodex, raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  // the cradle's vertices in world space (through every transform above it), its box, and the arc's lowest point
  cradle.updateWorldMatrix(true, false);
  const p = cradle.geometry.attributes.position, e = cradle.matrixWorld.elements, AY = 0.585, AZ = 0.005;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  let inner = Infinity, bottom = null;
  for (let k = 0; k < p.count; k++) {
    const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
    const w = [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]];
    for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], w[i]); hi[i] = Math.max(hi[i], w[i]); }
    const r = Math.hypot(w[1] - AY, w[2] - AZ);
    inner = Math.min(inner, r);
    if (!bottom || w[1] < bottom[1]) bottom = w;
  }
  const box = { min: lo.map((v) => +v.toFixed(4)), max: hi.map((v) => +v.toFixed(4)) };
  const want = { min: [-0.256, 0.095, -0.37], max: [0.256, 0.279, 0.38] };
  const boxPass = [0, 1, 2].every((i) => Math.abs(box.min[i] - want.min[i]) <= 0.002 && Math.abs(box.max[i] - want.max[i]) <= 0.002);
  const bottomFromAxis = { distanceM: +Math.hypot(bottom[1] - AY, bottom[2] - AZ).toFixed(4), zOffsetMm: +((bottom[2] - AZ) * 1000).toFixed(2), y: +bottom[1].toFixed(4) };
  const identity = [cradle, ...(() => { const a = []; let o = cradle.parent; while (o) { a.push(o); o = o.parent; } return a; })()].every((o) => o.position.length() === 0 && o.quaternion.w === 1 && o.scale.x === 1 && o.scale.y === 1 && o.scale.z === 1);
  const was = rig.reduce; rig.reduce = true;
  let max = 0;
  for (let k = 0; k <= rig.TOTAL * 4; k++) { rig.pos = k / 4; rig.lastScroll = 0; await raf(); max = Math.max(max, sleeveRadius()); }
  rig.pos = 0; await raf(); rig.reduce = was;
  return { worldBox: box, expected: want, boxPass, bottomOfArc: bottomFromAxis, identityTransforms: identity, cradleInnerRadiusM: +inner.toFixed(5), sleeveMaxRadiusM: +max.toFixed(5), minClearanceMm: +((inner - max) * 1000).toFixed(1) };
});
await browser.close();

// contact sheet: 3 x 2 at 720 x 450 (the three-quarter view is its own screenshot)
const tiles = await Promise.all(shots.slice(0, 6).map(async (s, k) => ({ input: await sharp(s.file).resize(720, 450).toBuffer(), left: (k % 3) * 720, top: Math.floor(k / 3) * 450 })));
await sharp({ create: { width: 2160, height: 900, channels: 3, background: "#fff" } }).composite(tiles).png().toFile("docs/gillenwebsite/housing-views.png");

const fit = JSON.parse(await fs.readFile("kit/work/fit.json", "utf8"));
const bake = JSON.parse(await fs.readFile("kit/work/bake.json", "utf8"));
const pbr = JSON.parse(await fs.readFile("kit/work/pbr.json", "utf8"));
const report = {
  base: BASE, at: new Date().toISOString(),
  iou: Object.values(fit).map((f) => ({ part: f.part, view: f.view, iou: f.iou, pass: f.pass })),
  coverage: Object.values(bake).map((b) => (b.baked ? { part: b.part, views: b.views, projectedPct: b.projectedPct, tilePct: b.tilePct } : { part: b.part, baked: false, why: b.why })),
  pbr,
  textureMBAdded: { measuredInPage: mem, computed: pbr.gpuMBAdded, target: 40, pass: mem < 40 },
  cradle: { ...cradle, bake: JSON.parse(await fs.readFile("kit/work/cradle.json", "utf8")) },
  screenshots: shots.map((s) => s.file).concat("docs/gillenwebsite/housing-views.png"),
};
if (FPS) {
  const f = JSON.parse(await fs.readFile(FPS, "utf8"));
  report.fps = Object.fromEntries(Object.entries(f.profiles).map(([k, v]) => [k, v.fps]));
}
await fs.writeFile("docs/gillenwebsite/housing-report.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ iou: report.iou, coverage: report.coverage, textureMBAdded: report.textureMBAdded, cradle, fps: report.fps }, null, 1));
