/**
 * Play the clip through and report what the stretch simulation actually did.
 *
 * The simulation is the authority on its own numbers: a detector run over the
 * encoded video finds vertically-uniform tubes in layer A as well, and it
 * samples spawn timing at frame granularity, which aliases a Poisson process
 * whose rate is above one per frame. Both are reported, and which is which is
 * said plainly.
 */
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const CONFIG = argOf("--config", "config/composite.json");
const N = Number(argOf("--frames", "200"));
const OUT = argOf("--report", "public/mosh-lab/stretch-report.json");

const cfg = JSON.parse(await readFile(CONFIG, "utf8"));
const data = JSON.parse(await readFile(
  "public/mosh-lab/blum-internet-tune.json", "utf8"));

const DIR = ".tune-frames-stretch";
await rm(DIR, { recursive: true, force: true });
const files = {};
for (const L of ["a", "b", "c"]) {
  const ref = data.layers[L];
  const src = /^https?:\/\//.test(ref)
    ? path.join("public/mosh-lab", path.basename(new URL(ref).pathname))
    : path.join("public", ref.replace(/^\//, ""));
  const d = path.join(DIR, L);
  await mkdir(d, { recursive: true });
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", src, "-vsync", "0",
    "-frames:v", String(N), "-start_number", "0", path.join(d, "f_%06d.png")]);
  files[L] = (await readdir(d)).filter((f) => f.endsWith(".png")).sort();
}

const browser = await chromium.launch({ headless: false,
  args: ["--autoplay-policy=no-user-gesture-required", "--use-angle=d3d11",
    "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on("pageerror", (e) => console.error("  page error:", e.message));
for (const L of ["a", "b", "c"]) {
  await page.route(`**/__layer/${L}/**`, async (route, req) => {
    const n = Number(new URL(req.url()).pathname.split("/").pop());
    await route.fulfill({ status: 200, contentType: "image/png",
      body: await readFile(path.join(DIR, L,
        files[L][Math.min(n, files[L].length - 1)])) });
  });
}
await page.goto("http://localhost:3000/mosh-lab/tune?render=1",
  { waitUntil: "load", timeout: 120000 });
await page.waitForFunction(() => window.__tune?.ready === true, null, { timeout: 60000 });
await page.evaluate((c) => window.__tune.setConfig(c), cfg);
const got = await page.evaluate(() => window.__tune.getConfig().stretch);
if (got.amount !== cfg.stretch.amount) {
  throw new Error(`config did not land: ${JSON.stringify(got)}`);
}
console.log(`stretch amount ${got.amount}  loose ${got.loose}  rate ${got.rate}/s`);

const perFrame = [];
for (let i = 0; i < N; i++) {
  const st = await page.evaluate(async (k) => {
    const grab = async (L) => {
      const r = await fetch(`/__layer/${L}/${k}`);
      return createImageBitmap(await r.blob(), { imageOrientation: "flipY" });
    };
    const [a, b, c] = await Promise.all([grab("a"), grab("b"), grab("c")]);
    window.__tune.renderWith(k, a, b, c);
    a.close?.(); b.close?.(); c.close?.();
    return window.__tune.stretchStats();
  }, i);
  perFrame.push(st);
}
const last = perFrame[perFrame.length - 1];
const live = perFrame.map((s) => s.live);
const f = (v) => (v ?? 0).toFixed(2);

console.log("\n" + "=".repeat(68));
console.log("LIVE PIXEL STRETCH - from the simulation itself");
console.log("=".repeat(68));
console.log(`  frames stepped          ${N}`);
console.log(`  spawns total            ${last.spawns}`);
console.log(`  live at once            min ${Math.min(...live)}  `
  + `median ${live.slice().sort((a, b) => a - b)[live.length >> 1]}  `
  + `max ${Math.max(...live)}`);
console.log(`  trail length (px)       min ${f(last.length.min)}  `
  + `median ${f(last.length.median)}  max ${f(last.length.max)}`);
console.log(`  fall speed (px/frame)   min ${f(last.speed.min)}  `
  + `median ${f(last.speed.median)}  max ${f(last.speed.max)}`);
console.log(`    of the ones moving    min ${f(last.speedMoving.min)}  `
  + `median ${f(last.speedMoving.median)}  max ${f(last.speedMoving.max)}`);
console.log(`  width (px)              min ${f(last.width.min)}  `
  + `median ${f(last.width.median)}  max ${f(last.width.max)}`);
console.log(`  spawn interval          mean ${f(last.spawnGapMean)} frames  `
  + `sd ${f(last.spawnGapSd)}  CV ${f(last.spawnCV)}`);
console.log(`  on the 16 px grid       ${f(last.onGridPct)}%`);
// Chance level, not zero, is what "near 0" has to mean: x is continuous and
// the tolerance is half a pixel, so about 1 in 32 lands on a multiple of 16
// by luck. A grid-locked system sits near 100%.
const CHANCE = 100 / 32;
console.log("");
console.log("  gates:");
console.log(`    spawn CV >= 1        ${f(last.spawnCV)}  `
  + `${last.spawnCV >= 0.95 ? "PASS" : "FAIL"}`);
console.log(`    not grid locked      ${f(last.onGridPct)}% on the grid; `
  + `chance ${CHANCE.toFixed(2)}%, grid-locked ~100%  `
  + `${last.onGridPct < 2 * CHANCE ? "PASS" : "FAIL"}`);

await mkdir("public/mosh-lab", { recursive: true });
await writeFile(OUT, JSON.stringify({ config: cfg.stretch, frames: N,
  final: last, live }, null, 1));
console.log(`\nreport -> ${OUT}`);
await browser.close();
await rm(DIR, { recursive: true, force: true });
