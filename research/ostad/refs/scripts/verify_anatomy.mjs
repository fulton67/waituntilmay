// node verify_anatomy.mjs <base>: /ostad/anatomy loads, every manifest node is in the GLB, all five presets switch and
// animate, layer toggle + cutaway respond, background toggles, PNG export keeps alpha (transparent) and is opaque on
// black/white, noindex, 0 console errors. Screenshots go to the scratch dir given as argv[3] (optional).
import { chromium } from "playwright";
import fs from "node:fs";
import { PNG } from "pngjs";
const base = process.argv[2] || "http://localhost:3108";
const shots = process.argv[3];
let fail = 0;
const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fail++; };
const man = JSON.parse(fs.readFileSync(new URL("../../../../app/ostad/data/anatomy.json", import.meta.url), "utf8"));
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();
const errs = [];
page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errs.push(m.text()));
page.on("pageerror", (e) => errs.push(String(e)));
const res = await page.goto(base + "/ostad/anatomy", { waitUntil: "domcontentloaded" });
ok(res.status() === 200, `status ${res.status()}`);
const robots = await page.locator('meta[name="robots"]').getAttribute("content");
ok(/noindex/.test(robots || ""), `noindex (${robots})`);
const nodeCount = () => page.locator('[data-testid="node-count"]').textContent();
await page.waitForFunction(() => /\d+\/\d+/.test(document.querySelector('[data-testid="node-count"]')?.textContent || ""), null, { timeout: 90000 });
ok((await nodeCount()) === `${man.face.node_count}/${man.face.node_count}`, `face nodes ${await nodeCount()} (manifest ${man.face.node_count})`);

const alphaStats = (buf) => {
  const png = PNG.sync.read(buf);
  let zero = 0, full = 0;
  for (let i = 3; i < png.data.length; i += 4) { if (png.data[i] === 0) zero++; else if (png.data[i] === 255) full++; }
  const n = png.data.length / 4;
  return { w: png.width, h: png.height, zero: zero / n, full: full / n, corner: png.data[3] };
};
const exportPng = async () => {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator('[data-testid="export-png"]').click()]);
  return { name: dl.suggestedFilename(), buf: fs.readFileSync(await dl.path()) };
};

// free orbit: background toggles and alpha export
let e = await exportPng();
let a = alphaStats(e.buf);
ok(a.corner === 0 && a.zero > 0.3 && a.full > 0.02, `transparent export has alpha: corner ${a.corner}, ${(a.zero * 100).toFixed(0)}% clear, ${(a.full * 100).toFixed(0)}% solid (${e.name}, ${a.w}x${a.h})`);
for (const bg of ["black", "white"]) {
  await page.locator(`[data-bg="${bg}"]`).click();
  await page.waitForTimeout(300);
  e = await exportPng(); a = alphaStats(e.buf);
  ok(a.zero === 0 && a.corner === 255, `${bg} export is opaque (${e.name})`);
}
await page.locator('[data-bg="transparent"]').click();

// layer toggle changes the frame
const frame = async () => { await page.waitForTimeout(400); return (await exportPng()).buf; };
const f0 = await frame();
await page.locator('[data-layer="epidermis"]').click();
const f1 = await frame();
ok(!f0.equals(f1), "toggling the epidermis changes the render");
await page.locator('[data-layer="epidermis"]').click();
await page.locator('[data-testid="cut"]').fill("0.9");
const f2 = await frame();
ok(!f0.equals(f2), "the cutaway slider changes the render");

// presets
const want = { botox: "face", filler: "face", morpheus8: "skin", fraxel: "skin", mohs: "skin" };
for (const [k, model] of Object.entries(want)) {
  await page.locator(`[data-preset="${k}"]`).click();
  await page.waitForFunction((n) => document.querySelector('[data-testid="node-count"]')?.textContent === `${n}/${n}`, man[model].node_count, { timeout: 90000 });
  await page.waitForSelector('[data-testid="phase"]', { timeout: 20000 });
  const p1 = await page.locator('[data-testid="phase"]').textContent();
  const g1 = await frame();
  await page.waitForTimeout(2600);
  const p2 = await page.locator('[data-testid="phase"]').textContent();
  const g2 = await frame();
  const label = await page.locator('[data-testid="preset-active"]').textContent();
  const st = alphaStats(g2);
  ok(!g1.equals(g2) && st.zero > 0.2, `${k}: ${label} on ${model} (${await nodeCount()}), animates (${p1.trim()} → ${p2.trim()}), alpha ${(st.zero * 100).toFixed(0)}% clear`);
  // pause + scrub: frames at fixed points of the cycle are deterministic and differ from each other
  await page.locator('[data-testid="play"]').click();
  const at = async (v) => { await page.locator('[data-testid="scrub"]').fill(String(v)); await page.waitForTimeout(500); return [await frame(), (await page.locator('[data-testid="phase"]').textContent()).trim()]; };
  const [s1, ph1] = await at(0.3), [s2, ph2] = await at(0.62);
  ok(!s1.equals(s2) && ph1 !== ph2, `${k}: scrub 30% "${ph1}" vs 62% "${ph2}"`);
  if (shots) { fs.writeFileSync(`${shots}/anatomy_${k}_30.png`, s1); fs.writeFileSync(`${shots}/anatomy_${k}_62.png`, s2); }
  await page.locator('[data-testid="play"]').click();
}
ok(errs.length === 0, `console errors: ${errs.slice(0, 3).join(" | ") || "none"}`);
await b.close();
console.log(fail ? `FAIL (${fail})` : "PASS");
process.exit(fail ? 1 : 0);
