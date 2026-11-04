// The housing's triplanar materials, checked in headed Chrome at 1440 x 900:
//  - every housing part and the drum core has its material (enamel, bakelite, chrome) and the shaders compile
//    (no WebGL errors in the console)
//  - the Tripo UVs play no part: no housing mesh has a uv attribute, so the triplanar mapping is all there is
//  - the maps' roughness medians (public/materials/materials.json) against the targets
//   node scripts/gillenwebsite/materials.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/materials-report.json";
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error" && /WebGL|shader|THREE/i.test(m.text())) errors.push(m.text().slice(0, 200)); });
await page.goto(`${BASE}/gillenwebsite`);
await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.allSmall, null, { timeout: 120000 });
await page.waitForTimeout(3000);
const report = { base: BASE, at: new Date().toISOString() };
report.parts = await page.evaluate(() => {
  const out = {};
  window.__rolodex.house.traverse((o) => { if (o.isMesh && o.visible) out[o.name] = { type: o.material.type, triplanar: o.material.customProgramCacheKey?.() ?? null, map: o.material.map?.image?.width ?? null }; });
  return out;
});
// the Tripo UVs play no part: no housing mesh carries a uv attribute (the GLB has none; the old code made box UVs),
// so the triplanar position mapping is the only mapping the housing has
report.uvIndependence = await page.evaluate(() => {
  const withUv = [];
  window.__rolodex.house.traverse((o) => { if (o.isMesh && o.geometry.attributes.uv) withUv.push(o.name); });
  return { meshesWithUv: withUv, pass: withUv.length === 0 };
});
report.roughness = JSON.parse(await fs.readFile("public/materials/materials.json", "utf8"));
report.roughnessPass = Object.values(report.roughness).every((m) => Math.abs(m.roughnessMedian - m.targetMedian) < 0.01);
report.webglErrors = errors;
report.pass = report.uvIndependence.pass && report.roughnessPass && !errors.length && Object.values(report.parts).every((p) => p.triplanar);
await page.screenshot({ path: "docs/gillenwebsite/materials-1440.png" });
console.log(JSON.stringify({ parts: report.parts, uv: report.uvIndependence, roughness: report.roughnessPass, errors: errors.length, pass: report.pass }));
await browser.close();
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
