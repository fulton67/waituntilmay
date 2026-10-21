/**
 * Is the fold stateless?
 *
 * The claim is that a frame looks the same whether you scrubbed to it or
 * played to it. The only way to show that is to do both and compare the
 * pixels, so this renders each timestamp twice:
 *
 *   scrub        history cleared, then that one frame rendered
 *   playthrough  every frame from 0 rendered in order, capturing at the same
 *                timestamps on the way past
 *
 * Run twice over. With the two feedback buffers off, a stateless pipeline
 * must give byte-identical frames - anything else is state leaking in. With
 * them on, whatever difference appears is the bloom and the drag, which are
 * feedback by design and are measured here rather than explained away.
 *
 *   node scripts/fold-stateless.mjs
 *   node scripts/fold-stateless.mjs --fold-amount 1 --where whole-frame
 */
import { chromium } from "@playwright/test";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const URL_ = argOf("--url", "http://localhost:3000/mosh-lab/tune");
const CONFIG = argOf("--config", "config/composite.json");
const OUT = argOf("--report", "public/mosh-lab/fold-stateless.json");
const STAMPS = (argOf("--frames", "12,36,60,93,108,153,168,192,246,279"))
  .split(",").map(Number);

const base = JSON.parse(await readFile(CONFIG, "utf8"));
base.fold = { ...base.fold, amount: Number(argOf("--fold-amount", "1")),
  where: argOf("--where", "whole-frame") };
base.macros = { ...(base.macros || {}), foldIn: 1 };

const raw = (png) => execFileSync("ffmpeg",
  ["-v", "error", "-f", "image2pipe", "-i", "-", "-f", "rawvideo",
    "-pix_fmt", "rgb24", "-"], { input: Buffer.from(png, "base64"), maxBuffer: 1 << 30 });
const diff = (a, b) => {
  const x = raw(a), y = raw(b);
  if (x.length !== y.length) return { mean: NaN, max: NaN, identical: false };
  let s = 0, m = 0;
  for (let i = 0; i < x.length; i++) {
    const d = Math.abs(x[i] - y[i]);
    s += d; if (d > m) m = d;
  }
  return { mean: s / x.length, max: m, identical: m === 0 };
};
const h = (png) => createHash("md5").update(Buffer.from(png, "base64"))
  .digest("hex").slice(0, 10);

// ---- decode the three layers to numbered PNGs and serve them.
//
// Seeking a <video> was the first attempt and it is the wrong tool twice
// over: setting currentTime to the value it already holds fires no "seeked"
// event, so frame 0 deadlocks, and holding 280 frames x 3 layers as
// ImageBitmaps is about 750 MB. Serving decoded frames is what the offline
// renderer already does, it is frame exact, and only one frame is alive at a
// time.
const data = JSON.parse(await readFile(
  "public/mosh-lab/blum-internet-tune.json", "utf8"));
const FRAMEDIR = ".tune-frames-stateless";
const N = Math.max(...STAMPS) + 1;
await rm(FRAMEDIR, { recursive: true, force: true });
const files = {};
for (const L of ["a", "b", "c"]) {
  const ref = data.layers[L];
  const src = /^https?:\/\//.test(ref)
    ? path.join("public/mosh-lab", path.basename(new URL(ref).pathname))
    : path.join("public", ref.replace(/^\//, ""));
  const dir = path.join(FRAMEDIR, L);
  await mkdir(dir, { recursive: true });
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", src, "-vsync", "0",
    "-frames:v", String(N), "-start_number", "0",
    path.join(dir, "f_%06d.png")]);
  files[L] = (await readdir(dir)).filter((f) => f.endsWith(".png")).sort();
}
console.log(`decoded ${N} frames of each layer`);

const browser = await chromium.launch({ headless: false,
  args: ["--autoplay-policy=no-user-gesture-required", "--use-angle=d3d11",
    "--ignore-gpu-blocklist", "--disable-renderer-backgrounding"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on("pageerror", (e) => console.error("  page error:", e.message));
for (const L of ["a", "b", "c"]) {
  await page.route(`**/__layer/${L}/**`, async (route, req) => {
    const n = Number(new URL(req.url()).pathname.split("/").pop());
    await route.fulfill({ status: 200, contentType: "image/png",
      body: await readFile(path.join(FRAMEDIR, L,
        files[L][Math.min(n, files[L].length - 1)])) });
  });
}
await page.goto(`${URL_}?render=1`, { waitUntil: "load", timeout: 120000 });
await page.waitForFunction(() => window.__tune?.ready === true, null, { timeout: 60000 });
await page.evaluate(() =>
  document.querySelectorAll(".mt-sources video").forEach((v) => v.pause()));

const setCfg = async (c) => {
  await page.evaluate((cc) => window.__tune.setConfig(cc), c);
  const got = await page.evaluate(() => window.__tune.getConfig());
  if (got.fold.amount !== c.fold.amount || got.fold.where !== c.fold.where) {
    throw new Error(`config did not land: ${JSON.stringify(got.fold)}`);
  }
};

/** Render one frame from freshly fetched PNGs. */
const renderOne = (i) => page.evaluate(async (k) => {
  const grab = async (L) => {
    const r = await fetch(`/__layer/${L}/${k}`);
    return createImageBitmap(await r.blob(), { imageOrientation: "flipY" });
  };
  const [a, b, c] = await Promise.all([grab("a"), grab("b"), grab("c")]);
  window.__tune.renderWith(k, a, b, c);
  a.close?.(); b.close?.(); c.close?.();
}, i);

const grab = () => page.evaluate(() =>
  document.querySelector(".mt-canvas").toDataURL("image/png").slice(22));

async function scrubPass(stamps) {
  const out = {};
  for (const f of stamps) {
    await page.evaluate(() => window.__tune.resetBloom());
    await renderOne(f);
    out[f] = await grab();
  }
  return out;
}

async function playPass(stamps) {
  const want = new Set(stamps);
  const out = {};
  await page.evaluate(() => window.__tune.resetBloom());
  for (let i = 0; i <= Math.max(...stamps); i++) {
    await renderOne(i);
    if (want.has(i)) out[i] = await grab();
  }
  return out;
}

const report = {};
for (const mode of ["feedback-off", "feedback-on"]) {
  const cfg = JSON.parse(JSON.stringify(base));
  if (mode === "feedback-off") {
    cfg.bloom = { ...cfg.bloom, mix: 0, strength: 0 };
    cfg.drag = { ...cfg.drag, amount: 0 };
  }
  await setCfg(cfg);
  const s = await scrubPass(STAMPS);
  const pl = await playPass(STAMPS);
  const rows = STAMPS.map((f) => ({ frame: f, ...diff(s[f], pl[f]),
    scrubHash: h(s[f]), playHash: h(pl[f]) }));
  report[mode] = rows;
  console.log(`\n=== ${mode} ===  fold amount ${cfg.fold.amount}, `
    + `where ${cfg.fold.where}`);
  console.log(`  ${"frame".padStart(6)}${"mean |d|".padStart(10)}`
    + `${"max |d|".padStart(9)}${"identical".padStart(11)}  scrub / play`);
  for (const r of rows) {
    console.log(`  ${String(r.frame).padStart(6)}`
      + `${r.mean.toFixed(4).padStart(10)}${String(r.max).padStart(9)}`
      + `${String(r.identical).padStart(11)}  ${r.scrubHash} / ${r.playHash}`);
  }
  const ok = rows.filter((r) => r.identical).length;
  console.log(`  byte-identical: ${ok}/${rows.length}   `
    + `mean of means ${(rows.reduce((a, r) => a + r.mean, 0) / rows.length).toFixed(4)}`);
}

await mkdir("public/mosh-lab", { recursive: true });
await writeFile(OUT, JSON.stringify({ config: base, stamps: STAMPS, report }, null, 1));
console.log(`\nreport -> ${OUT}`);
await browser.close();
await rm(FRAMEDIR, { recursive: true, force: true });
const strict = report["feedback-off"].every((r) => r.identical);
console.log(strict
  ? "\nPASS: with the feedback buffers off, scrubbing and playing are byte-identical"
  : "\nFAIL: state is leaking into a pipeline that claims to be stateless");
process.exitCode = strict ? 0 : 1;
