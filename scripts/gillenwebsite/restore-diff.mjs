// Screenshot the Rolodex canvas of the 7170f0b build and of this build at 1440x900 and diff them pixel by pixel.
//   node scripts/gillenwebsite/restore-diff.mjs <ref-url> <new-url>
// The DOM over the canvas is hidden in both; 7170f0b's in-canvas 3D detail panel (replaced since by the DOM
// release display) is hidden in the reference. Writes docs/gillenwebsite/restore/{ref,new,diff}.png and restore-diff.json.
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "docs/gillenwebsite/restore");
const [REF, NEW] = process.argv.slice(2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"] });

async function shot(url, name) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${url}/gillenwebsite`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.firstCardTexture, null, { timeout: 120000 });
  await page.evaluate(() => { setInterval(() => dispatchEvent(new Event("touchstart")), 3000); });
  await wait(8000); // every cover painted, the camera ease finished
  const info = await page.evaluate(() => {
    const scene = window.__rolodex.house.parent, keep = new Set([window.__rolodex.house]), hidden = [];
    // the rolodex's own primitives: house, drum (holds the cards), cradle
    for (const c of scene.children) {
      const isDrum = c.children?.some((k) => k.userData?.i === 0), isLight = c.isLight, flat = c.isMesh && c.rotation.x !== 0;
      const isCradle = c.isMesh && c.geometry?.type === "ExtrudeGeometry";
      if (!(keep.has(c) || isDrum || isLight || flat || isCradle)) { c.visible = false; hidden.push(c.type + (c.name ? ":" + c.name : "")); }
    }
    const st = document.createElement("style");
    st.textContent = "html { scrollbar-width: none } body * { visibility: hidden !important } canvas { visibility: visible !important }";
    document.head.append(st);
    return { hidden, children: scene.children.map((c) => c.type), s: window.__rolodex.rig.s, az: window.__rolodex.rig.camAz, el: window.__rolodex.rig.camEl };
  });
  await wait(1500);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  await ctx.close();
  return { file, info };
}

const ref = await shot(REF, "ref-7170f0b-1440x900");
const now = await shot(NEW, "restored-1440x900");
// pixel diff in a page canvas
const ctx = await browser.newContext({ viewport: { width: 400, height: 300 } });
const page = await ctx.newPage();
const b64 = async (f) => "data:image/png;base64," + (await fs.readFile(f)).toString("base64");
const res = await page.evaluate(async ([a, b]) => {
  const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const [A, B] = await Promise.all([load(a), load(b)]);
  const W = A.width, H = A.height, c = new OffscreenCanvas(W, H), x = c.getContext("2d");
  x.drawImage(A, 0, 0); const da = x.getImageData(0, 0, W, H).data;
  x.drawImage(B, 0, 0); const db = x.getImageData(0, 0, W, H).data;
  const out = x.createImageData(W, H);
  let any = 0, over8 = 0, over32 = 0;
  for (let i = 0; i < da.length; i += 4) {
    const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
    if (d > 0) any++; if (d > 8) over8++; if (d > 32) over32++;
    const g = 255 - Math.min(255, d * 4);
    out.data[i] = 255; out.data[i + 1] = g; out.data[i + 2] = g; out.data[i + 3] = 255;
  }
  x.putImageData(out, 0, 0);
  const blob = await c.convertToBlob();
  const u8 = new Uint8Array(await blob.arrayBuffer());
  let s = ""; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  const n = W * H;
  return { size: `${W}x${H}`, pixels: n, anyDiffPct: +(100 * any / n).toFixed(3), over8Pct: +(100 * over8 / n).toFixed(3), over32Pct: +(100 * over32 / n).toFixed(3), png: btoa(s) };
}, [await b64(ref.file), await b64(now.file)]);
await fs.writeFile(path.join(OUT, "diff-1440x900.png"), Buffer.from(res.png, "base64"));
delete res.png;
const report = { ref: REF, new: NEW, at: new Date().toISOString(), refInfo: ref.info, newInfo: now.info, diff: res, pass: res.anyDiffPct < 0.5 };
await fs.writeFile(path.join(OUT, "restore-diff.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
await browser.close();
