/**
 * Does the fold actually follow the damage map, or still just the squares?
 *
 * The map carries three kinds of damage in three channels. If the fold is
 * reading the map, the way its attention divides between those three should
 * match the way the map itself divides. If it were still reading a block
 * mask, the fold would sit almost entirely in the block channel no matter
 * what the other two were doing - which is exactly the bug this replaces.
 *
 * Both sums are taken on the GPU over every pixel and reduced to one, so
 * this is the whole frame and not a sample.
 */
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const CONFIG = argOf("--config", "config/composite.json");
const FRAMES = (argOf("--frames", "108,153,168,192,246")).split(",").map(Number);
const STILL = argOf("--still", "public/mosh-lab/refs/fold-everywhere.png");
const OUT = argOf("--report", "public/mosh-lab/fold-everywhere.json");

const cfg = JSON.parse(await readFile(CONFIG, "utf8"));
// max fold, over the whole frame, with stretches and organic openings both
// well up so there is something of each kind to fold
cfg.fold = { ...cfg.fold, amount: 1, where: "inside-reveals", center: "motion" };
cfg.macros = { ...(cfg.macros || {}), foldIn: 1 };
// these force the test case by default, but must stay overridable or a
// diagnostic that turns one of them off silently gets it turned back on
const num = (n, d) => (args.indexOf(n) >= 0 ? Number(argOf(n, d)) : d);
cfg.stretch = { ...cfg.stretch, amount: num("--stretch", 1), rate: 46 };
cfg.organic = { ...cfg.organic, amount: num("--organic", 1) };

const data = JSON.parse(await readFile(
  "public/mosh-lab/blum-internet-tune.json", "utf8"));
const DIR = ".tune-frames-fold";
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
    "-frames:v", String(Math.max(...FRAMES) + 1), "-start_number", "0",
    path.join(d, "f_%06d.png")]);
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
const got = await page.evaluate(() => window.__tune.getConfig());
if (got.fold.amount !== cfg.fold.amount
    || got.organic.amount !== cfg.organic.amount
    || got.stretch.amount !== cfg.stretch.amount) {
  throw new Error("config did not land: "
    + JSON.stringify({ fold: got.fold.amount, organic: got.organic.amount,
      stretch: got.stretch.amount }));
}
console.log(`fold ${got.fold.amount}  organic ${got.organic.amount}  `
  + `stretch ${got.stretch.amount}`);

const render = (i) => page.evaluate(async (k) => {
  const grab = async (L) => {
    const r = await fetch(`/__layer/${L}/${k}`);
    return createImageBitmap(await r.blob(), { imageOrientation: "flipY" });
  };
  const [a, b, c] = await Promise.all([grab("a"), grab("b"), grab("c")]);
  window.__tune.renderWith(k, a, b, c);
  a.close?.(); b.close?.(); c.close?.();
  return window.__tune.damageSplit();
}, i);

const NAMES = ["block", "organic", "stretch"];
const rows = [];
await page.evaluate(() => window.__tune.resetBloom());
for (let i = 0; i <= Math.max(...FRAMES); i++) {
  const sp = await render(i);
  if (FRAMES.includes(i) && sp) rows.push({ frame: i, ...sp });
}

console.log("=".repeat(76));
console.log("FOLD EVERYWHERE - how the fold divides vs how the damage map divides");
console.log("=".repeat(76));
console.log(`  ${"frame".padStart(6)}  ${"".padEnd(10)}`
  + NAMES.map((n) => n.padStart(10)).join("") + "   non-square");
for (const r of rows) {
  const fs = r.fold.map((v) => v / Math.max(r.foldTotal, 1e-9) * 100);
  const ms = r.map.map((v) => v / Math.max(r.mapTotal, 1e-9) * 100);
  const fNon = fs[1] + fs[2], mNon = ms[1] + ms[2];
  console.log(`  ${String(r.frame).padStart(6)}  ${"fold".padEnd(10)}`
    + fs.map((v) => `${v.toFixed(1)}%`.padStart(10)).join("")
    + `${fNon.toFixed(1)}%`.padStart(13));
  console.log(`  ${"".padStart(6)}  ${"map".padEnd(10)}`
    + ms.map((v) => `${v.toFixed(1)}%`.padStart(10)).join("")
    + `${mNon.toFixed(1)}%`.padStart(13));
  console.log(`  ${"".padStart(6)}  ${"diff".padEnd(10)}`
    + fs.map((v, k) => `${(v - ms[k]).toFixed(1)}`.padStart(10)).join("")
    + `${(fNon - mNon).toFixed(1)}`.padStart(13));
}
const avg = (sel) => rows.reduce((a, r) => {
  const t = sel === "fold" ? r.foldTotal : r.mapTotal;
  const v = sel === "fold" ? r.fold : r.map;
  return a + (v[1] + v[2]) / Math.max(t, 1e-9);
}, 0) / Math.max(rows.length, 1) * 100;
const fA = avg("fold"), mA = avg("map");
console.log(`\n  mean non-square share: fold ${fA.toFixed(1)}%  `
  + `map ${mA.toFixed(1)}%  difference ${(fA - mA).toFixed(1)} points`);
console.log(`  ${Math.abs(fA - mA) < 8 ? "PASS" : "FAIL"}: the fold follows `
  + `the map rather than the block mask`);

// the still: one frame with a stretch trail and an organic opening both folding
const best = FRAMES[Math.floor(FRAMES.length / 2)];
await page.evaluate(() => window.__tune.resetBloom());
for (let i = 0; i <= best; i++) await render(i);
const png = await page.evaluate(() =>
  document.querySelector(".mt-canvas").toDataURL("image/png").slice(22));
await mkdir(path.dirname(STILL), { recursive: true });
await writeFile(STILL, Buffer.from(png, "base64"));
console.log(`\nstill (frame ${best}) -> ${STILL}`);

await writeFile(OUT, JSON.stringify({ config: cfg, rows,
  meanFoldNonSquare: fA, meanMapNonSquare: mA }, null, 1));
console.log(`report -> ${OUT}`);
await browser.close();
await rm(DIR, { recursive: true, force: true });
