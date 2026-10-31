// Measure /gillenwebsite against BUILD.md's "Done means" and the bible rules it applies.
//   node scripts/gillenwebsite/verify.mjs [base-url] [--only direction,detent,...]   (default http://localhost:3217)
// Runs headed Chrome so WebGL uses the GPU. Writes scripts/gillenwebsite/verify-report.json.
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
// --only runs just the named sections and prints them without touching verify-report.json
const ONLY = argv.includes("--only") ? argv[argv.indexOf("--only") + 1].split(",") : null;
const want = (k) => !ONLY || ONLY.includes(k);
const URL = `${BASE}/gillenwebsite`;
const out = {};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const logs = [];
page.on("console", (m) => logs.push(`${m.type()}: ${m.text()}`));
page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
await page.goto(URL, { waitUntil: "load" });
await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.firstCardTexture, null, { timeout: 120000 });
await wait(1500);

out.gpu = await page.evaluate(() => {
  const gl = document.querySelector("canvas").getContext("webgl2");
  const ext = gl?.getExtension("WEBGL_debug_renderer_info");
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown";
});
out.glb = await page.evaluate(() => ({ meshNodes: window.__rolodex.meshes, triangles: window.__rolodex.triangles, names: window.__rolodex.nodes }));
out.cards = await page.evaluate(() => {
  const r = window.__rolodex;
  return { total: r.rig.TOTAL, built: r.rig.cards.length, releases: r.rig.N, faceOrder: r.faceIds };
});
const disco = JSON.parse(await fs.readFile(path.join(ROOT, "lib/gillenwebsite/discography.json"), "utf8"));
out.cards.orderMatches = JSON.stringify(out.cards.faceOrder) === JSON.stringify(disco.releases.map((r) => r.id));
delete out.cards.faceOrder;
out.canvas = await page.evaluate(() => !!document.querySelector("canvas"));
// Materials: which maps each housing part carries, map sizes, and how much of each metal part is worn
out.materials = await page.evaluate(() => {
  const res = {};
  window.__rolodex.house.traverse((o) => {
    if (!o.isMesh || !o.visible || res[o.name]) return;
    const m = o.material, w = o.geometry.attributes.wear;
    const map = (t) => (t ? `${t.image.width}x${t.image.height} procedural` : null);
    let worn = null;
    if (w) { let n = 0; for (let i = 0; i < w.count; i++) if (w.getX(i) > 0.35) n++; worn = n / w.count; }
    res[o.name] = { type: m.type, roughnessMap: map(m.roughnessMap), normalMap: map(m.normalMap), clearcoatRoughnessMap: map(m.clearcoatRoughnessMap), edgeWearVertexShare: worn };
  });
  const face = window.__rolodex.rig.cards[0].children[0].children[1].material;
  res.card = { normalMap: face.normalMap ? `${face.normalMap.image.width}x${face.normalMap.image.height} procedural, repeat ${face.normalMap.repeat.x}x${face.normalMap.repeat.y}` : null, map: `${face.map.image.width}x${face.map.image.height} canvas` };
  return res;
});

// world position of card k's top edge (centre of its top, before the tab)
const topEdge = (k) => page.evaluate((k) => {
  const g = window.__rolodex.rig.cards[k].children[0];
  g.updateWorldMatrix(true, false);
  const V = g.position.constructor;
  const p = g.localToWorld(new V(0, 0.3, 0));
  return { y: p.y, z: p.z };
}, k);
const perPx = () => page.evaluate(() => Math.max(140, innerHeight * 0.42));
const flipTop = () => page.evaluate(() => document.getElementById("flip").offsetTop);
const sNow = () => page.evaluate(() => window.__rolodex.rig.s);

// Direction check, scroll: put card 3 in front, scroll down exactly one `per`, wait 1 s
if (want("direction")) {
  const per = await perPx(), top = await flipTop(), k = 3;
  await page.evaluate((y) => scrollTo(0, y), top + k * per);
  await wait(1500);
  const before = await topEdge(k);
  await page.evaluate((d) => scrollBy(0, d), per);
  await wait(1000);
  const after = await topEdge(k);
  // FLIP_DIR = +1: scrolling down sends the front card's top edge down and away (Y and Z both fall)
  out.directionScroll = { card: k + 1, before, after, dY: after.y - before.y, dZ: after.z - before.z, pass: after.y < before.y && after.z < before.z };
}
// Direction check, drag: 70 px mouse drag down on the front card
if (want("direction")) {
  const per = await perPx(), top = await flipTop(), k = 8;
  await page.evaluate((y) => scrollTo(0, y), top + k * per);
  await wait(1500);
  const sp = await page.evaluate((k) => {
    const r = window.__rolodex.rig, g = r.cards[k].children[0], V = g.position.constructor;
    const p = g.localToWorld(new V(0, 0.15, 0)).project(r.camera);
    return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight };
  }, k);
  const before = await topEdge(k);
  await page.mouse.move(sp.x, sp.y);
  await page.mouse.down();
  for (let i = 1; i <= 14; i++) { await page.mouse.move(sp.x, sp.y + i * 5); await wait(16); }
  await page.mouse.up();
  await wait(1000);
  const after = await topEdge(k);
  // a drag down pulls the card face with the pointer: its top edge comes down toward the viewer
  out.directionDrag = { card: k + 1, at: sp, before, after, dY: after.y - before.y, dZ: after.z - before.z, pass: after.y < before.y && after.z > before.z };
}
// Detent: stop scrolling 40 % of the way into a card; s must land on an integer within 0.01 inside 1 s
if (want("detent")) {
  const per = await perPx(), top = await flipTop();
  await page.evaluate((y) => scrollTo(0, y), top + 12.4 * per);
  const t0 = Date.now();
  let settled = null, s = 0;
  while (Date.now() - t0 < 1500) {
    s = await sNow();
    if (Math.abs(s - Math.round(s)) < 0.01 && settled === null && Date.now() - t0 > 170) settled = Date.now() - t0;
    if (Math.abs(s - Math.round(s)) >= 0.01) settled = null;
    await wait(20);
  }
  out.detent = { stoppedAt: 12.4, s, landedOn: Math.round(s), error: Math.abs(s - Math.round(s)), settledMs: settled, pass: settled !== null && settled <= 1000 };
}
// Orbit: drag the background 360 degrees (2*PI / 0.008 px) and compare the camera azimuth
if (want("orbit")) {
  await page.evaluate(() => scrollTo(0, 0));
  await wait(1200);
  const az0 = await page.evaluate(() => window.__rolodex.rig.camAz);
  const dx = (2 * Math.PI) / 0.008, x0 = 200, y0 = 160;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 1; i <= 40; i++) { await page.mouse.move(x0 + (dx * i) / 40, y0); await wait(16); }
  await page.mouse.up();
  await wait(1500);
  const az1 = await page.evaluate(() => window.__rolodex.rig.camAz);
  const d = Math.atan2(Math.sin(az1 - az0), Math.cos(az1 - az0));
  out.orbit = { dragPx: dx, az0, az1, wrappedDifference: d, pass: Math.abs(d) < 0.01 };
}
// Frame rate: scroll through all cards with the wheel and time every frame
if (want("fps")) {
  await page.evaluate(() => scrollTo(0, 0));
  await wait(1000);
  await page.evaluate(() => {
    window.__frames = [];
    const tick = (t) => { window.__frames.push(t); if (window.__frames.length < 100000 && !window.__stop) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  const per = await perPx(), N = out.cards.releases;
  const steps = Math.ceil(((N - 1) * per) / 60);
  await page.mouse.move(700, 450);
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, 60); await wait(16); }
  await wait(600);
  const f = await page.evaluate(() => { window.__stop = true; return window.__frames; });
  const d = f.slice(1).map((t, i) => t - f[i]);
  // fps over each 500 ms window, and the single slowest frame
  const win = [];
  let start = f[0], n = 0;
  for (let i = 1; i < f.length; i++) { n++; if (f[i] - start >= 500) { win.push((n * 1000) / (f[i] - start)); start = f[i]; n = 0; } }
  out.fps = {
    frames: f.length, seconds: (f[f.length - 1] - f[0]) / 1000,
    mean: (d.length * 1000) / (f[f.length - 1] - f[0]),
    min500msWindow: Math.min(...win),
    slowestFrameMs: Math.max(...d),
    reachedCard: Math.round(await sNow()) + 1,
    pass: Math.min(...win) >= 55,
  };
}
// Bible rules, from computed styles of every element on the page (sheet opened so it is measured too)
if (want("bible")) {
  await page.evaluate(() => scrollTo(0, 0));
  await wait(800);
  await page.keyboard.press("Enter");
  await wait(500);
  out.bible = await page.evaluate(() => {
    const root = document.querySelector("[class*='root']");
    const els = [root, ...root.querySelectorAll("*")].filter((e) => !(e instanceof SVGElement) && e.tagName !== "CANVAS");
    const cs = (e) => getComputedStyle(e);
    const textEls = els.filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    const tally = (arr) => arr.reduce((m, v) => ((m[v] = (m[v] || 0) + 1), m), {});
    const radius = tally(els.map((e) => cs(e).borderRadius));
    const shadow = tally(els.map((e) => `${cs(e).boxShadow} | ${cs(e).textShadow}`));
    const transform = tally(els.map((e) => cs(e).textTransform));
    const weight = tally(textEls.map((e) => cs(e).fontWeight));
    const size = tally(textEls.map((e) => cs(e).fontSize));
    const fam = tally(textEls.map((e) => cs(e).fontFamily.split(",")[0].replace(/['"]/g, "").trim()));
    const big = textEls.filter((e) => parseFloat(cs(e).fontSize) >= 40).length;
    const pinned = els.filter((e) => ["fixed", "sticky"].includes(cs(e).position)).map((e) => `${e.tagName.toLowerCase()}.${(e.className || "").toString().split(" ")[0]} ${cs(e).position}`);
    const buttons = [...root.querySelectorAll("button")].map((b) => ({ text: b.textContent.trim(), radius: cs(b).borderRadius, border: cs(b).borderTopStyle }));
    const ink = tally(textEls.map((e) => cs(e).color));
    const uppercaseText = textEls.filter((e) => /[A-Z]{2}/.test(e.textContent)).length;
    return {
      textElements: textEls.length, elements: els.length,
      R1_ground: { body: cs(document.body).backgroundColor, root: cs(root).backgroundColor, canvasScene: "#ffffff (scene.background)" },
      R2_weight: weight,
      R3_shadows: shadow,
      R4_radius: radius,
      R5_buttons: buttons,
      R7_textTransform: transform, R7_textWithTypedCapitals: uppercaseText,
      R9_sizes: size,
      R10_displayShare: big / textEls.length,
      R11_families: fam,
      R15_pinned: pinned,
      ink,
    };
  });
  await page.keyboard.press("Escape");
}
// R16: the credit comment in the HTML as served
if (want("bible")) out.bible.R16_comment = /<!-- Site Development &(amp;)? Design; waituntilmay -->/.test(await (await fetch(URL)).text());
// S6: the A-Z order is saved in a cookie and restored after a reload
if (want("S6")) {
  await page.evaluate(() => document.getElementById("credits").scrollIntoView());
  await page.getByRole("button", { name: /A–Z/ }).click();
  const firstAfterClick = await page.evaluate(() => document.querySelector("#credits li button")?.textContent);
  await page.reload({ waitUntil: "load" });
  await wait(1500);
  const cookie = (await ctx.cookies()).find((c) => c.name === "alphabetOrdering");
  const firstAfterReload = await page.evaluate(() => document.querySelector("#credits li button")?.textContent);
  await page.getByRole("button", { name: /YEAR/ }).click();
  const firstDefault = await page.evaluate(() => document.querySelector("#credits li button")?.textContent);
  out.S6 = { cookie: cookie?.value, firstAfterClick, firstAfterReload, firstDefault, pass: cookie?.value === "alphabetical" && firstAfterClick === firstAfterReload && firstAfterClick !== firstDefault };
}
// Phone: 390 x 844, no horizontal scroll, 3D panel dropped, caption with thumbnail shown
if (want("phone")) {
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const p = await phone.newPage();
  await p.goto(URL, { waitUntil: "load" });
  await p.waitForFunction(() => window.__rolodex?.rig?.ready, null, { timeout: 120000 });
  await wait(1500);
  out.phone = await p.evaluate(() => {
    const thumb = document.querySelector("[class*='thumbBox']");
    return {
      scrollWidth: document.documentElement.scrollWidth, innerWidth,
      panelShown: window.__rolodex.rig.wide,
      thumb: thumb ? { w: thumb.getBoundingClientRect().width, h: thumb.getBoundingClientRect().height } : null,
      caption: document.querySelector("[class*='capArtist']")?.textContent,
    };
  });
  out.phone.pass = out.phone.scrollWidth === 390 && !out.phone.panelShown && out.phone.thumb?.w === 64;
  await phone.close();
}
await browser.close();

if (ONLY) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }
// Covers on disk: all 36 releases have a 2048 x 2048 file, plus the 1080 and 512 copies
out.covers = [];
for (const r of disco.releases) {
  const row = { id: r.id, exists: false, size: null, kb: null, v1080: null, v512: null };
  if (r.cover) {
    const f = path.join(ROOT, "public", r.cover);
    const m = await sharp(f).metadata().catch(() => null);
    if (m) Object.assign(row, { exists: true, size: `${m.width}x${m.height}`, kb: Math.round((await fs.stat(f)).size / 1024) });
    for (const w of [1080, 512]) {
      const v = await sharp(path.join(ROOT, "public", r.cover.replace("/covers/", `/covers/${w}/`))).metadata().catch(() => null);
      row[`v${w}`] = v ? `${v.width}x${v.height}` : null;
    }
  }
  out.covers.push(row);
}
out.coversPass = out.covers.length === disco.releases.length && out.covers.every((c) => c.exists && c.size === "2048x2048" && c.v1080 === "1080x1080" && c.v512 === "512x512");
out.errors = logs.filter((l) => /^(error|pageerror)/.test(l));
await fs.writeFile(path.join(ROOT, "scripts/gillenwebsite/verify-report.json"), JSON.stringify({ url: URL, at: new Date().toISOString(), ...out }, null, 2) + "\n");
console.log(JSON.stringify(out, null, 2));
