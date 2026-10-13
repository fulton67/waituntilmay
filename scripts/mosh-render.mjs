/**
 * Deterministic offline render of the shader-mosh layer.
 *
 * The source is decoded to numbered frames by ffmpeg and each one is handed to
 * the shader as a texture. Seeking a <video> is not frame exact - the browser
 * lands on the nearest decodable frame and the error is invisible - so the
 * only way to guarantee that output frame n is source frame n is to never ask
 * the browser to seek at all.
 *
 * The shader mosh is path dependent, so the render replays the exported
 * settings (mode, scale, refresh interval, freeze, camera speed) and the
 * recorded refresh/freeze timeline from frame 0.
 *
 *   node scripts/mosh-render.mjs --src public/mosh-lab/test-clip.mp4 \
 *       --out public/mosh-lab/shader-mosh.mp4 [--settings s.json] [--frames N]
 */
import { chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { mkdir, rm, readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const has = (n) => args.includes(n);

const SRC = argOf("--src", "public/mosh-lab/test-clip.mp4");
const OUT = argOf("--out", "public/mosh-lab/shader-mosh.mp4");
const SETTINGS = argOf("--settings", null);
const URL_BASE = argOf("--url", "http://localhost:3000/mosh-lab");
const FRAME_DIR = argOf("--framedir", ".mosh-frames");
const LIMIT = argOf("--frames", null);
const KEEP = has("--keep-frames");
const INTENSITY = argOf("--intensity", null);

if (!existsSync(SRC)) { console.error(`source not found: ${SRC}`); process.exit(1); }

const sh = (cmd, a) => execFileSync(cmd, a, { encoding: "utf8", maxBuffer: 1 << 28 });

// ---------------------------------------------------------------- 1. probe
const probe = JSON.parse(sh("ffprobe", [
  "-v", "error", "-select_streams", "v:0",
  "-show_entries", "stream=width,height,r_frame_rate,nb_frames,avg_frame_rate",
  "-show_entries", "format=duration", "-of", "json", SRC]));
const vs = probe.streams[0];
const [fnum, fden] = (vs.r_frame_rate || "30/1").split("/").map(Number);
const FPS = fnum / (fden || 1);
const W = vs.width, H = vs.height;
const srcDuration = parseFloat(probe.format.duration);
console.log(`source  ${path.basename(SRC)}  ${W}x${H} @ ${FPS} fps  ${srcDuration.toFixed(3)}s`);

// ------------------------------------------------- 2. decode to exact frames
await rm(FRAME_DIR, { recursive: true, force: true });
await mkdir(FRAME_DIR, { recursive: true });
const tDecode = Date.now();
sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", SRC,
  "-vsync", "0", "-start_number", "0", path.join(FRAME_DIR, "f_%06d.png")]);
const frameFiles = (await readdir(FRAME_DIR)).filter((f) => f.endsWith(".png")).sort();
const TOTAL = LIMIT ? Math.min(Number(LIMIT), frameFiles.length) : frameFiles.length;
console.log(`decoded ${frameFiles.length} frames in ${((Date.now() - tDecode) / 1000).toFixed(1)}s`
  + (LIMIT ? ` (rendering first ${TOTAL})` : ""));

// ------------------------------------------------------------- 3. settings
let settings = {
  intensity: 0.66, mode: "faces", scale: 1, refresh: 8,
  freeze: false, camSpeed: 1, events: [],
};
if (SETTINGS) {
  settings = { ...settings, ...JSON.parse(await readFile(SETTINGS, "utf8")) };
  console.log(`settings from ${SETTINGS}: mode=${settings.mode} scale=${settings.scale} `
    + `refresh=${settings.refresh} freeze=${settings.freeze} cam=${settings.camSpeed} `
    + `events=${settings.events.length}`);
}

if (INTENSITY !== null) settings.intensity = Number(INTENSITY);
console.log(`intensity ${settings.intensity}`);

// ------------------------------------------------------------- 4. browser
const browser = await chromium.launch({
  headless: false,
  args: ["--autoplay-policy=no-user-gesture-required", "--use-angle=d3d11",
    "--ignore-gpu-blocklist", "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows"],
});
const page = await browser.newPage({
  viewport: { width: Math.max(W, 640), height: Math.max(H, 400) },
  deviceScaleFactor: 1,
});
page.on("pageerror", (e) => console.error("  page error:", e.message));

// frames are served to the page rather than inlined, so no base64 round trip
await page.route("**/__frame/**", async (route, req) => {
  const n = Number(new URL(req.url()).pathname.split("/").pop());
  const buf = await readFile(path.join(FRAME_DIR, frameFiles[n]));
  await route.fulfill({ status: 200, contentType: "image/png", body: buf });
});

await page.goto(`${URL_BASE}?render=1`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__mosh, null, { timeout: 30000 });
const env = await page.evaluate(() => ({
  renderMode: window.__mosh.renderMode,
  float: window.__mosh.renderer.float,
  visibility: document.visibilityState,
}));
if (!env.renderMode) { console.error("page did not enter render mode"); process.exit(1); }
if (!env.float.rgba32f) console.warn(`  warning: ${env.float.message}`);
console.log(`render mode on, ${env.float.message}, page ${env.visibility}`);

await page.evaluate(({ w, h }) => {
  document.querySelector("video")?.pause();
  document.querySelector(".ml-panel")?.remove();
  document.querySelector(".ml-toggle")?.remove();
  window.__mosh.setCanvasSize(w, h);
}, { w: W, h: H });

// --------------------------------------------------------------- 5. encode
await mkdir(path.dirname(OUT), { recursive: true });
const ff = spawn("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
  "-pix_fmt", "yuv420p", "-r", String(FPS), "-movflags", "+faststart", OUT],
  { stdio: ["pipe", "inherit", "inherit"] });

const canvas = await page.$("canvas");
const tRender = Date.now();
let wrote = 0;

for (let n = 0; n < TOTAL; n++) {
  await page.evaluate(async ({ n, s }) => {
    // replay every recorded event up to and including this frame
    const st = { ...s.base };
    for (const e of s.events) {
      if (e.frame > n) break;
      if (e.type === "freeze") st.freeze = !!e.value;
      else if (e.type === "refresh") st.refresh = Number(e.value);
      else if (e.type === "forceOverride") st.forceOverride = !!e.value;
    }
    const res = await fetch(`/__frame/${n}`);
    // flipY at creation, then uploaded without a second flip: deterministic,
    // and immune to the ImageBitmap/UNPACK_FLIP_Y inconsistency
    const bmp = await createImageBitmap(await res.blob(), { imageOrientation: "flipY" });
    window.__mosh.setFrameImage(bmp, false);
    window.__mosh.renderFrame({ ...st, time: n / s.fps, frame: n });
    bmp.close?.();
  }, { n, s: { base: {
    intensity: settings.intensity, stampMode: settings.mode, scale: settings.scale,
    refresh: settings.refresh, freeze: settings.freeze, camSpeed: settings.camSpeed,
    forceOverride: false,
  }, events: settings.events, fps: FPS } });

  const png = await canvas.screenshot({ type: "png" });
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
  wrote++;
  if (n % 50 === 0 || n === TOTAL - 1) {
    const el = (Date.now() - tRender) / 1000;
    process.stdout.write(`\r  frame ${n + 1}/${TOTAL}  ${(el / (n + 1) * 1000).toFixed(1)} ms/frame   `);
  }
}
process.stdout.write("\n");
ff.stdin.end();
await new Promise((res, rej) => { ff.on("close", (c) => c === 0 ? res() : rej(new Error(`ffmpeg exit ${c}`))); });
const renderMs = Date.now() - tRender;
await browser.close();

// ---------------------------------------------------------------- 6. report
const out = JSON.parse(sh("ffprobe", ["-v", "error", "-select_streams", "v:0",
  "-count_frames", "-show_entries",
  "stream=width,height,r_frame_rate,nb_read_frames", "-show_entries",
  "format=duration,size", "-of", "json", OUT]));
const os_ = out.streams[0];
console.log(`\nrendered ${wrote} frames in ${(renderMs / 1000).toFixed(1)}s `
  + `-> ${(renderMs / wrote).toFixed(1)} ms/frame`);
console.log(`output  ${OUT}`);
console.log(`  ${os_.width}x${os_.height} @ ${os_.r_frame_rate}  frames=${os_.nb_read_frames}  `
  + `dur=${parseFloat(out.format.duration).toFixed(3)}s  `
  + `${(Number(out.format.size) / 1e6).toFixed(2)} MB`);
console.log(`  source: frames=${frameFiles.length} dur=${srcDuration.toFixed(3)}s`);
const frameMatch = Number(os_.nb_read_frames) === TOTAL;
console.log(`  frame count matches render: ${frameMatch ? "yes" : "NO"}`);

if (!KEEP) await rm(FRAME_DIR, { recursive: true, force: true });
