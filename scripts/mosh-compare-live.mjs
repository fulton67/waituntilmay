/**
 * How close is the offline render to what you actually see live?
 *
 * The live loop advances one iFrame per requestVideoFrameCallback, so with no
 * dropped frames live frame n is source frame n - the same indexing the render
 * uses. The canvas is captured at five frame indices and compared against the
 * rendered file's frames at those indices.
 *
 *   node scripts/mosh-compare-live.mjs --render public/mosh-lab/shader-mosh.mp4
 */
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const RENDER = argOf("--render", "public/mosh-lab/shader-mosh.mp4");
const URL_ = argOf("--url", "http://localhost:3000/mosh-lab");
const TMP = ".mosh-compare";
const TARGETS = (argOf("--frames", "40,80,120,160,200")).split(",").map(Number);

await rm(TMP, { recursive: true, force: true });
await mkdir(TMP, { recursive: true });

const browser = await chromium.launch({
  headless: false,
  args: ["--autoplay-policy=no-user-gesture-required", "--use-angle=d3d11",
    "--ignore-gpu-blocklist", "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows"],
});
const page = await browser.newPage({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 1 });
await page.goto(URL_, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__mosh, null, { timeout: 30000 });
await page.waitForTimeout(2500);

// match the render: 640x360 canvas, shader-mosh layer, defaults, from frame 0
await page.evaluate(() => {
  document.querySelector(".ml-panel")?.remove();
  document.querySelector(".ml-toggle")?.remove();
  const v = document.querySelector("video");
  v.pause(); v.currentTime = 0;
  window.__mosh.setCanvasSize(640, 360);
});
await page.waitForTimeout(600);
// start the frame counter exactly when playback starts, so live frame n is
// video frame n (one rVFC callback per decoded frame)
await page.evaluate(async () => {
  const v = document.querySelector("video");
  await v.play();
  window.__mosh.resetFrames();
});

const canvas = await page.$("canvas");
const got = [];
for (const target of TARGETS) {
  await page.waitForFunction((t) => window.__mosh.getFrame() >= t, target, { timeout: 60000 });
  const info = await page.evaluate(() => ({ frame: window.__mosh.getFrame(), t: window.__mosh.getTime() }));
  await canvas.screenshot({ path: path.join(TMP, `live_${target}.png`) });
  got.push({ target, ...info });
}
await browser.close();

await writeFile(path.join(TMP, "captures.json"), JSON.stringify(got, null, 1));
console.log("captured live frames:");
for (const g of got) console.log(`  target ${g.target}  live frame ${g.frame}  video t=${g.t.toFixed(3)}s`);
console.log(`\nrender: ${RENDER}`);
console.log("comparing with scripts/mosh_compare_live.py ...");
execFileSync(".venv/Scripts/python.exe",
  ["scripts/mosh_compare_live.py", "--render", RENDER, "--dir", TMP],
  { stdio: "inherit" });
