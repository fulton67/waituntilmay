/**
 * One still with Fold in at maximum, for comparing against the reference.
 *
 * Whole frame rather than inside the reveals: the reference is a full-frame
 * image mapping, so anything less would be comparing a detail against a
 * composition.
 *
 *   node scripts/fold-still.mjs
 *   node scripts/fold-still.mjs --frame 153 --out public/mosh-lab/refs/fold-test.png
 */
import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const URL_ = argOf("--url", "http://localhost:3000/mosh-lab/tune");
const FRAME = Number(argOf("--frame", "153"));
const OUT = argOf("--out", "public/mosh-lab/refs/fold-test.png");
const CONFIG = argOf("--config", "config/composite.json");

const cfg = JSON.parse(await readFile(CONFIG, "utf8"));
cfg.fold = { ...cfg.fold, amount: 1, where: argOf("--where", "whole-frame"),
  bandDensity: Number(argOf("--bands", "4")),
  iterations: Number(argOf("--iter", "160")),
  zoom: Number(argOf("--zoom", "0.42")),
  center: argOf("--center", "face") };
cfg.macros = { ...(cfg.macros || {}), foldIn: 1 };

const browser = await chromium.launch({ headless: false,
  args: ["--autoplay-policy=no-user-gesture-required", "--use-angle=d3d11",
    "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on("pageerror", (e) => console.error("  page error:", e.message));
await page.goto(`${URL_}?render=1`, { waitUntil: "load", timeout: 120000 });
await page.waitForFunction(() => window.__tune?.ready === true, null, { timeout: 60000 });
await page.evaluate((c) => window.__tune.setConfig(c), cfg);
const got = await page.evaluate(() => window.__tune.getConfig().fold);
if (got.amount !== 1) throw new Error(`fold did not land: ${JSON.stringify(got)}`);

const out = await page.evaluate(async (i) => {
  const vs = [...document.querySelectorAll(".mt-sources video")];
  const fps = window.__tune.fps;
  await Promise.all(vs.map((v) => new Promise((res) => {
    const d = () => { v.removeEventListener("seeked", d); res(); };
    v.addEventListener("seeked", d); v.currentTime = i / fps;
  })));
  const bm = await Promise.all(vs.map((v) =>
    createImageBitmap(v, { imageOrientation: "flipY" })));
  window.__tune.resetBloom();
  // the fold is stateless, but the drag behind it is not: let it settle
  for (let k = 0; k < 10; k++) window.__tune.renderWith(i, bm[0], bm[1], bm[2]);
  bm.forEach((x) => x.close?.());
  return { png: document.querySelector(".mt-canvas").toDataURL("image/png").slice(22),
    fold: window.__tune.foldState?.() ?? null };
}, FRAME);

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, Buffer.from(out.png, "base64"));
console.log(`frame ${FRAME} -> ${OUT}`);
console.log(`  fold: c=[${out.fold.c.map((v) => v.toFixed(4)).join(", ")}]  `
  + `zoom ${out.fold.zoom.toFixed(3)}  `
  + `centre [${out.fold.center.map((v) => v.toFixed(3)).join(", ")}]  `
  + `spread ${out.fold.spread.toFixed(3)}`);
console.log(`  where ${cfg.fold.where}  bands ${cfg.fold.bandDensity}  `
  + `iterations ${cfg.fold.iterations}  centre-on ${cfg.fold.center}`);
await browser.close();
