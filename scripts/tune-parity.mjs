/**
 * Does the offline render match the live preview?
 *
 * Both sides run the same WebGL programs, so a difference here is not a
 * difference in the maths - it is a difference in what reached those
 * programs. Three things can do that, and the check is built to separate
 * them rather than average them into one number:
 *
 *   1. which frame        the preview reads <video> elements, and a seek
 *                         lands on the nearest decodable frame. So the live
 *                         side is asked which frame it ACTUALLY presented,
 *                         via requestVideoFrameCallback, and the offline
 *                         capture is taken at that index - not at the index
 *                         we hoped for.
 *   2. the bloom          a feedback buffer, and therefore path dependent. A
 *                         seek gives the preview no history; the offline run
 *                         arrives with 300 frames of it. Reported separately,
 *                         and measured again with the bloom disabled so the
 *                         deterministic path can be seen on its own.
 *   3. decode             a <video> is decoded by the browser's own pipeline
 *                         and a PNG is not, so even the same frame can differ
 *                         by a little chroma. That floor is measured too, by
 *                         comparing the layers themselves with no composite.
 *
 *   node scripts/tune-parity.mjs
 *   node scripts/tune-parity.mjs --timestamps 0.5,1.5,3.0
 */
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };

const NAME = argOf("--name", "blum-internet");
const DIR = argOf("--dir", "public/mosh-lab");
const CONFIG = argOf("--config", "config/composite.json");
const BASE = argOf("--url", "http://localhost:3000/mosh-lab/tune");
const WORK = argOf("--work", ".tune-parity");
const REPORT = argOf("--report", "public/mosh-lab/blum-internet-tune-parity.json");
const HEADED = !args.includes("--headless");

// read for its side effect of failing loudly if the prep has not been run
const data = JSON.parse(await readFile(path.join(DIR, `${NAME}-tune.json`), "utf8"));
if (!data.frames) throw new Error("tune data has no frames; run scripts/tune_prep.py");
const cfg = JSON.parse(await readFile(CONFIG, "utf8"));

const DEFAULT_TS = [0.40, 1.20, 2.00, 3.10, 3.60, 5.10, 5.60, 6.40, 8.20, 9.30];
const TS = (argOf("--timestamps", "") || "").split(",").filter(Boolean).map(Number);
const STAMPS = TS.length ? TS : DEFAULT_TS;

await rm(WORK, { recursive: true, force: true });
await mkdir(path.join(WORK, "live"), { recursive: true });
await mkdir(path.join(WORK, "liveNoBloom"), { recursive: true });

/** Mean absolute difference per channel, 0-255, over a decoded PNG pair. */
function meanAbsDiff(pngA, pngB) {
  const a = rawFrom(pngA), b = rawFrom(pngB);
  const n = Math.min(a.length, b.length);
  if (!n || a.length !== b.length) {
    return { mean: NaN, max: NaN, pctOver8: NaN,
      err: `size mismatch ${a.length} vs ${b.length}` };
  }
  let sum = 0, max = 0, over = 0;
  for (let i = 0; i < n; i++) {
    const d = Math.abs(a[i] - b[i]);
    sum += d;
    if (d > max) max = d;
    if (d > 8) over++;          // 8/255 is about where a difference is visible
  }
  return { mean: sum / n, max, pctOver8: (over / n) * 100 };
}

function rawFrom(png) {
  return execFileSync("ffmpeg",
    ["-v", "error", "-f", "image2pipe", "-i", "-", "-f", "rawvideo",
      "-pix_fmt", "rgb24", "-"],
    { input: png, maxBuffer: 1 << 30 });
}

/* --------------------------------------------- 1. capture the live preview */
async function captureLive(conf, outDir, label) {
  const browser = await chromium.launch({
    headless: !HEADED,
    args: ["--autoplay-policy=no-user-gesture-required", "--use-angle=d3d11",
      "--ignore-gpu-blocklist", "--disable-renderer-backgrounding"],
  });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1,
  });
  page.on("pageerror", (e) => console.error("  page error:", e.message));
  await page.goto(BASE, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction(() => window.__tune?.ready === true, null,
    { timeout: 60000 });
  await page.evaluate((c) => window.__tune.setConfig(c), conf);
  await page.waitForTimeout(1200);
  // assert, do not assume: the page also loads config/composite.json, and a
  // silent overwrite here makes every run below compare the same two files
  const got = await page.evaluate(() => window.__tune.getConfig());
  for (const k of ["squares", "reveals", "bloom", "flash", "life"]) {
    if (JSON.stringify(got[k]) !== JSON.stringify(conf[k])) {
      throw new Error(`config did not take effect for "${k}" in the ${label} `
        + `pass:
  sent ${JSON.stringify(conf[k])}
  live ${JSON.stringify(got[k])}`);
    }
  }

  const landed = [];
  for (const t of STAMPS) {
    // seek, then ask the browser which frame it really put on screen
    const info = await page.evaluate(async (tt) => {
      const vids = [...document.querySelectorAll(".mt-sources video")];
      const fps = window.__tune.fps;
      await Promise.all(vids.map((v) => new Promise((res) => {
        const done = () => { v.removeEventListener("seeked", done); res(); };
        v.addEventListener("seeked", done);
        v.currentTime = tt;
      })));
      const a = vids[0];
      const mediaTime = await new Promise((res) => {
        if (a.requestVideoFrameCallback) {
          a.requestVideoFrameCallback((_, meta) => res(meta.mediaTime));
          // a paused element may never present again; fall back to its clock
          setTimeout(() => res(a.currentTime), 600);
        } else res(a.currentTime);
      });
      return { mediaTime, frame: Math.round(mediaTime * fps),
        times: vids.map((v) => +v.currentTime.toFixed(4)) };
    }, t);

    // let the rAF loop composite this frame a few times; the mask is
    // stateless so it settles at once, the bloom gets what history it can
    await page.waitForTimeout(400);
    const png = await page.evaluate(() =>
      document.querySelector(".mt-canvas").toDataURL("image/png").slice(22));
    const cov = await page.evaluate(() => window.__tune.coverage());
    const file = path.join(outDir, `f_${String(info.frame).padStart(6, "0")}.png`);
    await writeFile(file, Buffer.from(png, "base64"));
    landed.push({ requested: t, ...info, coverage: cov, file });
    console.log(`  ${label} t=${t.toFixed(2)}s -> frame ${info.frame} `
      + `(mediaTime ${info.mediaTime.toFixed(4)}s, spread `
      + `${(Math.max(...info.times) - Math.min(...info.times)).toFixed(4)}s)  `
      + `cov ${(cov * 100).toFixed(2)}%`);
  }
  await browser.close();
  return landed;
}

console.log("=== live preview, bloom as configured ===");
const live = await captureLive(cfg, path.join(WORK, "live"), "live");

const noBloom = JSON.parse(JSON.stringify(cfg));
noBloom.bloom = { ...noBloom.bloom, mix: 0, strength: 0 };
console.log("\n=== live preview, bloom disabled ===");
const liveNB = await captureLive(noBloom, path.join(WORK, "liveNoBloom"), "noBloom");

/* ------------------------------------- 2. render offline at the SAME frames */
const frames = [...new Set(live.map((l) => l.frame))].sort((a, b) => a - b);
const framesNB = [...new Set(liveNB.map((l) => l.frame))].sort((a, b) => a - b);
console.log(`\n=== offline render, capturing frames ${frames.join(",")} ===`);
const run = (conf, capDir, caps) => {
  const tmp = path.join(WORK, "cfg.json");
  execFileSync("node", ["-e",
    `require('fs').writeFileSync(${JSON.stringify(tmp)}, ${JSON.stringify(JSON.stringify(conf))})`]);
  execFileSync("node", ["scripts/tune-render.mjs", "--config", tmp,
    "--out", path.join(WORK, "offline.mp4"),
    "--capture", caps.join(","), "--capture-dir", capDir,
    ...(HEADED ? [] : ["--headless"])], { stdio: "inherit" });
};
run(cfg, path.join(WORK, "offline"), frames);
console.log(`\n=== offline render, bloom disabled ===`);
run(noBloom, path.join(WORK, "offlineNoBloom"), framesNB);

/* ----------------------------------------------- 3. the decode-only floor */
// Composite nothing: compare layer A as the preview decodes it against layer
// A as a PNG. Whatever that costs is the floor under every number above.
console.log("\n=== decode floor (layer A only, no composite) ===");
const floorCfg = JSON.parse(JSON.stringify(cfg));
floorCfg.squares = { ...floorCfg.squares, threshold: 1e9, baseline: 0 };
floorCfg.reveals = { ...floorCfg.reveals, peak: 0, growRadius: 0, gain: 0 };
floorCfg.flash = { ...floorCfg.flash, amount: 0 };
floorCfg.bloom = { ...floorCfg.bloom, mix: 0, strength: 0 };
await mkdir(path.join(WORK, "liveFloor"), { recursive: true });
const liveFloor = await captureLive(floorCfg, path.join(WORK, "liveFloor"), "floor");
const framesF = [...new Set(liveFloor.map((l) => l.frame))].sort((a, b) => a - b);
run(floorCfg, path.join(WORK, "offlineFloor"), framesF);

/* ------------------------------------------------------------- 4. compare */
async function compare(liveList, offDir, label) {
  const rows = [];
  for (const l of liveList) {
    const offFile = path.join(offDir, `f_${String(l.frame).padStart(6, "0")}.png`);
    let d;
    try {
      d = meanAbsDiff(await readFile(l.file), await readFile(offFile));
    } catch (e) {
      d = { mean: NaN, max: NaN, pctOver8: NaN, err: String(e.message) };
    }
    rows.push({ label, requested: l.requested, frame: l.frame,
      mediaTime: +l.mediaTime.toFixed(4), coverage: +(l.coverage * 100).toFixed(2),
      ...d });
  }
  return rows;
}

const rowsFull = await compare(live, path.join(WORK, "offline"), "full");
const rowsNB = await compare(liveNB, path.join(WORK, "offlineNoBloom"), "noBloom");
const rowsFloor = await compare(liveFloor, path.join(WORK, "offlineFloor"), "floor");

const show = (rows, title) => {
  console.log(`\n${title}`);
  console.log(`  ${"t (s)".padStart(7)}${"frame".padStart(7)}`
    + `${"mediaTime".padStart(11)}${"cov %".padStart(8)}`
    + `${"mean |d|".padStart(10)}${"max |d|".padStart(9)}${"% > 8".padStart(8)}`);
  for (const r of rows) {
    console.log(`  ${r.requested.toFixed(2).padStart(7)}${String(r.frame).padStart(7)}`
      + `${r.mediaTime.toFixed(4).padStart(11)}${r.coverage.toFixed(2).padStart(8)}`
      + `${(Number.isFinite(r.mean) ? r.mean.toFixed(3) : "n/a").padStart(10)}`
      + `${(Number.isFinite(r.max) ? String(r.max) : "n/a").padStart(9)}`
      + `${(Number.isFinite(r.pctOver8) ? r.pctOver8.toFixed(2) : "n/a").padStart(8)}`);
  }
  const ok = rows.filter((r) => Number.isFinite(r.mean));
  if (ok.length) {
    const m = ok.reduce((a, r) => a + r.mean, 0) / ok.length;
    console.log(`  mean of means: ${m.toFixed(3)} / 255  (${(m / 255 * 100).toFixed(3)}%)`);
  }
};

console.log("\n" + "=".repeat(70));
console.log("PARITY: live preview vs offline render, same config, same frames");
console.log("=".repeat(70));
show(rowsFloor, "decode floor - no composite at all (layer A straight through)");
show(rowsNB, "deterministic path - mask, squares, reveals, flash; bloom OFF");
show(rowsFull, "everything, bloom ON (feedback buffer: path dependent)");

const meanOf = (rows) => {
  const ok = rows.filter((r) => Number.isFinite(r.mean));
  return ok.length ? ok.reduce((a, r) => a + r.mean, 0) / ok.length : NaN;
};
await writeFile(REPORT, JSON.stringify({
  config: cfg, timestamps: STAMPS,
  floor: rowsFloor, noBloom: rowsNB, full: rowsFull,
  summary: {
    decode_floor_mean: +meanOf(rowsFloor).toFixed(4),
    deterministic_mean: +meanOf(rowsNB).toFixed(4),
    with_bloom_mean: +meanOf(rowsFull).toFixed(4),
  },
}, null, 1));
console.log(`\nreport -> ${REPORT}`);
