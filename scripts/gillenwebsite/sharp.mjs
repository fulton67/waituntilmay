// The Rolodex's sharpness, and the covers' aspect on the sleeve face.
// 1. Pixel ratio: the stage renderer's at device pixel ratios 1, 2, 3 and 4 (must be min(DPR, 3)).
// 2. Housing atlases: every baked part's albedo on the GPU at 2048 (__rolodex.textures()).
// 3. Anisotropy: every texture on a material in the scene at the renderer's max.
// 4. The front three sleeves' covers: with the drum settled, the front release and its two neighbours at 2048
//    (front and back), and the front sleeve's texture px against its face's device px on screen (>= 1.0) at DPR 3.
// 5. Cover aspect: for five releases (Santana's Africa Speaks, the one non-square source, among them) the front sleeve
//    turned parallel to the screen for one measurement (and back): the face's UV range (0..1 on both axes), its
//    rendered width / height (the face's midlines projected through the stage camera), the texture's width / height,
//    and the rendered pixel aspect (screen px per texel across / down): 1.00 +- 0.01.
// Phone 390 x 844 and desktop 1440 x 900, both at DPR 3.
//   node scripts/gillenwebsite/sharp.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/sharp-report.json";
const RELEASES = ["01-girl-in-red-blue", "13-gossip-real-power", "20-sza-sos", "28-the-strokes-the-new-abnormal", "34-santana-africa-speaks"];
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const report = { base: BASE, at: new Date().toISOString(), pixelRatio: {}, profiles: {} };
const open = async (o) => {
  const ctx = await browser.newContext(o);
  await ctx.addInitScript(() => { try { localStorage.setItem("gillenwebsite:guide-seen", "1"); } catch {} });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite`);
  await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.allSmall, null, { timeout: 120000 });
  return { ctx, page };
};

for (const dpr of [1, 2, 3, 4]) {
  const { ctx, page } = await open({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr });
  report.pixelRatio[dpr] = await page.evaluate(() => window.__rolodex.gl.getPixelRatio());
  await ctx.close();
}
console.log("pixelRatio", JSON.stringify(report.pixelRatio));

for (const p of [{ name: "phone", w: 390, h: 844 }, { name: "desktop", w: 1440, h: 900 }]) {
  const { ctx, page } = await open({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: 3, isMobile: p.w < 720, hasTouch: p.w < 720 });
  const out = {};
  // wait for the front three's big covers: front and back of the front release and both neighbours
  const settled = (id) => page.waitForFunction((id) => {
    const r = window.__rolodex, ids = r.faceIds, k = ids.indexOf(id), N = ids.length, near = [k - 1, k, k + 1].map((i) => ids[(i + N) % N]), t = r.texels();
    return t.release === id && near.every((n) => t.bigLoaded.some((b) => b.startsWith(n + "@"))) && t.frontTexturePx >= 2048;
  }, id, { timeout: 30000 }).then(() => true, () => false);
  await settled(await page.evaluate(() => window.__rolodex.texels().release));
  out.textures = await page.evaluate(() => {
    const { max, list } = window.__rolodex.textures();
    // the baked parts' atlases (housing-maps), not the tiling materials (public/materials: enamel, chrome, bakelite; the end plates' gunmetal tile)
    const albedo = list.filter((t) => /-albedo\.jpg$/.test(t.name) && !/gunmetal|enamel|chrome|bakelite/.test(t.name));
    return { maxAnisotropy: max, count: list.length, belowMax: list.filter((t) => t.anisotropy < max).map((t) => `${t.name} ${t.w}x${t.h} @${t.anisotropy}`), housingAlbedo: albedo.map((t) => `${t.name.split(" ").pop()} ${t.w}x${t.h}`), housingAlbedoAll2048: albedo.length >= 7 && albedo.every((t) => t.w === 2048 && t.h === 2048) };
  });
  out.front = await page.evaluate(() => { const t = window.__rolodex.texels(); return { ...t, sourcePxPerScreenPx: +(t.frontTexturePx / t.faceScreenPx).toFixed(2) }; });
  out.aspect = [];
  for (const id of RELEASES) {
    await page.evaluate((id) => window.__rolodex.jumpToRelease(window.__rolodex.faceIds.indexOf(id)), id);
    const big = await settled(id);
    await page.waitForTimeout(300);
    const a = await page.evaluate(() => {
      const { rig } = window.__rolodex, cam = rig.camera, body = rig.cards[((Math.round(rig.s) % rig.TOTAL) + rig.TOTAL) % rig.TOTAL].children[0];
      const g = body.geometry, pos = g.attributes.position, uv = g.attributes.uv, front = g.groups.find((x) => x.materialIndex === 0);
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (let k = front.start; k < front.start + front.count; k++) {
        u0 = Math.min(u0, uv.getX(k)); u1 = Math.max(u1, uv.getX(k)); v0 = Math.min(v0, uv.getY(k)); v1 = Math.max(v1, uv.getY(k));
        x0 = Math.min(x0, pos.getX(k)); x1 = Math.max(x1, pos.getX(k)); y0 = Math.min(y0, pos.getY(k)); y1 = Math.max(y1, pos.getY(k));
      }
      // the body turned so its face is parallel to the screen (its world rotation the camera's), measured, put back
      const was = body.quaternion.clone(), pq = body.parent.getWorldQuaternion(was.clone());
      body.quaternion.copy(pq.invert().multiply(cam.quaternion)); body.updateMatrixWorld(true);
      const b = rig.hit.parentElement.getBoundingClientRect(), V = cam.position.constructor;
      const sc = (x, y) => { const v = new V(x, y, 0).applyMatrix4(body.matrixWorld).project(cam); return [(v.x + 1) * 0.5 * b.width, (1 - v.y) * 0.5 * b.height]; };
      const xm = (x0 + x1) / 2, ym = (y0 + y1) / 2, L = sc(x0, ym), R = sc(x1, ym), B = sc(xm, y0), T = sc(xm, y1);
      body.quaternion.copy(was); body.updateMatrixWorld(true);
      const w = Math.hypot(R[0] - L[0], R[1] - L[1]), h = Math.hypot(T[0] - B[0], T[1] - B[1]);
      const img = body.material[0].map.image, iw = img.width, ih = img.height;
      return { faceMetres: [+(x1 - x0).toFixed(4), +(y1 - y0).toFixed(4)], uv: [[+u0.toFixed(4), +u1.toFixed(4)], [+v0.toFixed(4), +v1.toFixed(4)]], renderedPx: [+w.toFixed(1), +h.toFixed(1)], renderedAspect: +(w / h).toFixed(4), texturePx: [iw, ih], pixelAspect: +((w / ((u1 - u0) * iw)) / (h / ((v1 - v0) * ih))).toFixed(4) };
    });
    out.aspect.push({ id, big2048: big, ...a });
  }
  out.pass = out.textures.belowMax.length === 0 && out.textures.housingAlbedoAll2048 && out.front.pixelRatio === 3 && out.front.sourcePxPerScreenPx >= 1
    && out.aspect.every((a) => a.big2048 && Math.abs(a.renderedAspect - 1) <= 0.01 && Math.abs(a.pixelAspect - 1) <= 0.01 && a.uv[0][0] === 0 && a.uv[0][1] === 1 && a.uv[1][0] === 0 && a.uv[1][1] === 1);
  report.profiles[p.name] = out;
  console.log(p.name, JSON.stringify(out));
  await ctx.close();
}
await browser.close();
report.pass = report.pixelRatio[1] === 1 && report.pixelRatio[2] === 2 && report.pixelRatio[3] === 3 && report.pixelRatio[4] === 3 && Object.values(report.profiles).every((x) => x.pass);
console.log("pass", report.pass);
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
