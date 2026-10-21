/**
 * Offline render of the A x B composite from config/composite.json.
 *
 * This does NOT reimplement the composite. It loads /mosh-lab/tune in render
 * mode and drives the same WebGL programs the preview uses, handing them
 * frames it decoded itself. Two implementations of this maths would drift the
 * moment either was touched; one implementation driven two ways cannot.
 *
 * Frames are served to the page rather than seeked, for the reason
 * mosh-render.mjs already documents: seeking a <video> lands on the nearest
 * decodable frame, so output frame n would not be source frame n.
 *
 *   node scripts/tune-render.mjs
 *   node scripts/tune-render.mjs --config config/composite.json --out out.mp4
 *   node scripts/tune-render.mjs --capture 0,30,60 --capture-dir caps/
 */
import { chromium } from "@playwright/test";
import { execFileSync, spawn } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };

const CONFIG = argOf("--config", "config/composite.json");
const NAME = argOf("--name", "blum-internet");
const DIR = argOf("--dir", "public/mosh-lab");
const OUT = argOf("--out", `public/mosh-lab/${NAME}-tune-offline.mp4`);
const URL_BASE = argOf("--url", "http://localhost:3000/mosh-lab/tune");
const FRAMEDIR = argOf("--framedir", ".tune-frames");
const LIMIT = argOf("--frames", null);
const CAPTURE = (argOf("--capture", "") || "").split(",").filter(Boolean).map(Number);
const CAPDIR = argOf("--capture-dir", ".tune-caps/offline");
const CRF = argOf("--crf", "18");
const KEEP = args.includes("--keep-frames");
const PROBE = (argOf("--probe", "") || "").split(",").filter(Boolean).map(Number);
const HEADED = !args.includes("--headless");

const sh = (c, a) => execFileSync(c, a, { encoding: "utf8", maxBuffer: 1 << 28 });

const data = JSON.parse(await readFile(path.join(DIR, `${NAME}-tune.json`), "utf8"));
const cfg = JSON.parse(await readFile(CONFIG, "utf8"));
const TOTAL = LIMIT ? Math.min(Number(LIMIT), data.frames) : data.frames;
console.log(`${NAME}: ${TOTAL} of ${data.frames} frames @ ${data.fps} `
  + `${data.width}x${data.height}`);
console.log(`config ${CONFIG}  seed ${cfg.seed}  dissolve ${cfg.squares?.dissolve}`);

// ------------------------------------------------- decode A, B, C to frames
const layers = ["a", "b", "c"];
const files = {};
await rm(FRAMEDIR, { recursive: true, force: true });
for (const L of layers) {
  const src = path.join("public", data.layers[L].replace(/^\//, ""));
  if (!existsSync(src)) throw new Error(`missing layer ${L}: ${src}`);
  const dir = path.join(FRAMEDIR, L);
  await mkdir(dir, { recursive: true });
  sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", src,
    "-vsync", "0", "-start_number", "0", path.join(dir, "f_%06d.png")]);
  files[L] = (await readdir(dir)).filter((f) => f.endsWith(".png")).sort();
  console.log(`  layer ${L.toUpperCase()}: ${files[L].length} frames decoded`);
}

// ------------------------------------------------------------- the browser
const browser = await chromium.launch({
  headless: !HEADED,
  args: ["--autoplay-policy=no-user-gesture-required", "--use-angle=d3d11",
    "--ignore-gpu-blocklist", "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows"],
});
const page = await browser.newPage({
  viewport: { width: Math.max(data.width, 900), height: Math.max(data.height, 700) },
  deviceScaleFactor: 1,
});
page.on("pageerror", (e) => console.error("  page error:", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.error("  console:", m.text());
});

for (const L of layers) {
  await page.route(`**/__layer/${L}/**`, async (route, req) => {
    const n = Number(new URL(req.url()).pathname.split("/").pop());
    const i = Math.min(n, files[L].length - 1);
    await route.fulfill({
      status: 200, contentType: "image/png",
      body: await readFile(path.join(FRAMEDIR, L, files[L][i])),
    });
  });
}

await page.goto(`${URL_BASE}?render=1`, { waitUntil: "load", timeout: 120000 });
await page.waitForFunction(() => window.__tune?.ready === true, null, { timeout: 60000 });
await page.evaluate((c) => {
  // the three <video> elements must not also be driving the renderer
  document.querySelectorAll(".mt-sources video").forEach((v) => v.pause());
  window.__tune.setConfig(c);
  window.__tune.resetBloom();
}, cfg);
{
  const got = await page.evaluate(() => window.__tune.getConfig());
  for (const k of ["squares", "reveals", "bloom", "flash", "life"]) {
    if (JSON.stringify(got[k]) !== JSON.stringify(cfg[k])) {
      throw new Error(`config did not take effect for "${k}": sent `
        + `${JSON.stringify(cfg[k])}, live ${JSON.stringify(got[k])}`);
    }
  }
  console.log("config verified in the page");
}
const env = await page.evaluate(() => ({
  float: window.__tune ? true : false,
}));
void env;
console.log("render mode on");

// ------------------------------------------------------------- the encode
await mkdir(path.dirname(OUT), { recursive: true });
if (CAPTURE.length) await mkdir(CAPDIR, { recursive: true });
const ff = spawn("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(data.fps), "-i", "-",
  "-an", "-c:v", "libx264", "-preset", "medium", "-crf", String(CRF),
  "-pix_fmt", "yuv420p", "-r", String(data.fps),
  "-movflags", "+faststart", OUT], { stdio: ["pipe", "inherit", "inherit"] });

// The canvas is laid out at 100% width, so an element screenshot comes back
// at the CSS size (861x485 here) rather than the 640x360 drawing buffer, and
// x264 refuses an odd width anyway. Reading the drawing buffer in-page is
// exact and skips the compositor; preserveDrawingBuffer makes it valid after
// the draw.
const grabCanvas = async () => {
  const b64 = await page.evaluate(() =>
    document.querySelector(".mt-canvas").toDataURL("image/png").slice(22));
  return Buffer.from(b64, "base64");
};
const coverage = [];
const probes = [];
const t0 = Date.now();
for (let n = 0; n < TOTAL; n++) {
  const cov = await page.evaluate(async (i) => {
    const grab = async (L) => {
      const r = await fetch(`/__layer/${L}/${i}`);
      return createImageBitmap(await r.blob(), { imageOrientation: "flipY" });
    };
    const [a, b, c] = await Promise.all([grab("a"), grab("b"), grab("c")]);
    const v = window.__tune.renderWith(i, a, b, c);
    a.close?.(); b.close?.(); c.close?.();
    return v;
  }, n);
  coverage.push(cov);
  if (PROBE.includes(n)) {
    probes.push({ frame: n, ...(await page.evaluate(() => window.__tuneDebug())) });
  }
  const png = await grabCanvas();
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
  if (CAPTURE.includes(n)) {
    await writeFile(path.join(CAPDIR, `f_${String(n).padStart(6, "0")}.png`), png);
  }
  if (n % 25 === 0 || n === TOTAL - 1) {
    const el = (Date.now() - t0) / 1000;
    process.stdout.write(`\r  frame ${n + 1}/${TOTAL}  `
      + `${(el / (n + 1) * 1000).toFixed(0)} ms/frame  cov ${(cov * 100).toFixed(2)}%   `);
  }
}
process.stdout.write("\n");
ff.stdin.end();
await new Promise((res, rej) =>
  ff.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exit ${c}`)))));
await browser.close();

// ---------------------------------------------------------------- report
const probe = JSON.parse(sh("ffprobe", ["-v", "error", "-select_streams", "v:0",
  "-count_frames", "-show_entries",
  "stream=width,height,nb_read_frames,codec_name", "-show_entries",
  "format=duration,size", "-of", "json", OUT]));
const s = probe.streams[0];
const mean = coverage.reduce((a, b) => a + b, 0) / coverage.length;
const perSecond = [];
for (let sec = 0; sec * data.fps < coverage.length; sec++) {
  const seg = coverage.slice(sec * data.fps, (sec + 1) * data.fps);
  if (!seg.length) break;
  perSecond.push({
    second: sec,
    mean_pct: +(seg.reduce((a, b) => a + b, 0) / seg.length * 100).toFixed(2),
    max_pct: +(Math.max(...seg) * 100).toFixed(2),
  });
}
console.log(`\noutput ${OUT}`);
console.log(`  ${s.width}x${s.height} ${s.codec_name} ${s.nb_read_frames} frames `
  + `${Number(probe.format.duration).toFixed(3)}s `
  + `${(Number(probe.format.size) / 1e6).toFixed(2)} MB`);
console.log(`  coverage mean ${(mean * 100).toFixed(2)}%  `
  + `max ${(Math.max(...coverage) * 100).toFixed(2)}%  `
  + `min ${(Math.min(...coverage) * 100).toFixed(2)}%`);
console.log("\nper second:");
for (const p of perSecond) {
  console.log(`  ${String(p.second).padStart(3)}  mean ${String(p.mean_pct).padStart(6)}%`
    + `  max ${String(p.max_pct).padStart(6)}%`);
}
const statsPath = OUT.replace(/\.mp4$/, "-stats.json");
await writeFile(statsPath, JSON.stringify({
  config: cfg, frames: TOTAL, fps: data.fps,
  coverage: coverage.map((v) => +v.toFixed(6)),
  coverage_mean_pct: +(mean * 100).toFixed(3),
  coverage_max_pct: +(Math.max(...coverage) * 100).toFixed(3),
  per_second: perSecond,
}, null, 1));
console.log(`\nstats -> ${statsPath}`);
if (probes.length) {
  console.log("");
  console.log("probes (GPU-side, per frame):");
  console.log(`  ${"frame".padStart(6)}${"alphaCov".padStart(10)}`
    + `${"reduced".padStart(10)}${"diffMed".padStart(10)}${"diffP90".padStart(10)}`
    + `${"diffMax".padStart(10)}`);
  for (const q of probes) {
    console.log(`  ${String(q.frame).padStart(6)}`
      + `${(q.alphaCoverage * 100).toFixed(3).padStart(9)}%`
      + `${(q.reducedCoverage * 100).toFixed(3).padStart(9)}%`
      + `${q.diffMedian.toFixed(3).padStart(10)}${q.diffP90.toFixed(3).padStart(10)}`
      + `${q.diffMax.toFixed(3).padStart(10)}`);
  }
  await writeFile(OUT.replace(/\.mp4$/, "-probes.json"),
    JSON.stringify(probes, null, 1));
}
if (!KEEP) await rm(FRAMEDIR, { recursive: true, force: true });
