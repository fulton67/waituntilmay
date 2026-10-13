/**
 * Measure the mosh-lab shader honestly.
 *
 * Runs headed on purpose: Chrome throttles rAF, media and in some cases the
 * GPU itself whenever a tab is not visible, and a hidden tab reports
 * impossible numbers (we saw 166,000 fps and a GPU time pinned at exactly
 * 11.1 ms for every configuration). A visible window is the only way to get a
 * figure that means anything.
 *
 *   node scripts/mosh-bench.mjs [--url http://localhost:3000/mosh-lab]
 */
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const URL_ = argOf("--url", "http://localhost:3000/mosh-lab");
const SHOTS = argOf("--shots", null);   // optional dir for layer screenshots

const CASES = [
  { label: "1080p  raw video      (i=0.00)", w: 1920, h: 1080, i: 0.0 },
  { label: "1080p  live faces     (i=0.33)", w: 1920, h: 1080, i: 0.33 },
  { label: "1080p  shader mosh    (i=0.66)", w: 1920, h: 1080, i: 0.66 },
  { label: "mobile live faces     (i=0.33)", w: 585, h: 1266, i: 0.33 },
  { label: "mobile shader mosh    (i=0.66)", w: 585, h: 1266, i: 0.66 },
];

const browser = await chromium.launch({
  headless: false,
  args: [
    "--autoplay-policy=no-user-gesture-required",
    "--use-angle=d3d11",
    "--ignore-gpu-blocklist",
    "--enable-gpu-rasterization",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.error("  page error:", e.message));

await page.goto(URL_, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__mosh, null, { timeout: 30000 });
await page.waitForTimeout(3000);

const env = await page.evaluate(() => {
  const c = document.createElement("canvas");
  const gl = c.getContext("webgl2");
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  const v = document.querySelector("video");
  return {
    gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "unknown",
    visibility: document.visibilityState,
    float: window.__mosh.renderer.float,
    gpuTiming: window.__mosh.renderer.gpuTimingAvailable,
    video: v ? { w: v.videoWidth, h: v.videoHeight, rs: v.readyState, t: v.currentTime } : null,
  };
});

console.log("environment");
console.log(`  gpu                : ${env.gpu}`);
console.log(`  page visibility    : ${env.visibility}`);
console.log(`  float targets      : ${env.float.message}`);
console.log(`  RGBA32F renderable : ${env.float.rgba32f}`);
console.log(`  gpu timer queries  : ${env.gpuTiming}`);
console.log(`  source video       : ${env.video ? `${env.video.w}x${env.video.h} rs=${env.video.rs}` : "none"}`);

if (env.visibility !== "visible") {
  console.error("\npage is not visible - numbers would be meaningless, aborting");
  await browser.close();
  process.exit(1);
}

// ---- live loop fps, as the page actually runs it
const live = await page.evaluate(async () => {
  const seen = [];
  let last = performance.now();
  await new Promise((res) => {
    let n = 0;
    const tick = () => {
      const now = performance.now();
      seen.push(now - last);
      last = now;
      if (++n >= 300) return res();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  seen.sort((a, b) => a - b);
  const med = seen[Math.floor(seen.length / 2)];
  return { medianFrameMs: +med.toFixed(2), fps: +(1000 / med).toFixed(1), samples: seen.length };
});
console.log(`\nlive rAF loop (page defaults, ${page.viewportSize().width}x${page.viewportSize().height} window)`);
console.log(`  median frame ${live.medianFrameMs} ms -> ${live.fps} fps over ${live.samples} frames`);

// ---- deterministic per-configuration cost
console.log("\ndeterministic benchmark (renderFrame driven directly, 100 frames each)");
console.log(`  ${"case".padEnd(32)}${"ms/frame".padStart(10)}${"fps".padStart(9)}${"gpu ms tot".padStart(12)}`);
const rows = [];
for (const c of CASES) {
  const r = await page.evaluate(async ({ w, h, i }) => {
    const m = window.__mosh;
    m.renderer.resize(w, h);
    m.renderer.reset();
    await m.bench(30, { intensity: i });
    return await m.bench(100, { intensity: i });
  }, { w: c.w, h: c.h, i: c.i });
  rows.push({ ...c, ...r });
  console.log(`  ${c.label.padEnd(32)}${String(r.msPerFrame).padStart(10)}`
    + `${String(r.fps).padStart(9)}${String(r.gpuMs ?? "-").padStart(10)}`);
}

if (SHOTS) {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(SHOTS, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(1500);
  console.log("");
  for (const [name, i] of [["raw", 0.0], ["faces", 0.33], ["mosh", 0.66], ["full", 1.0]]) {
    await page.evaluate((v) => {
      const el = document.querySelector("input[type=range]");
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, "value").set;
      setter.call(el, String(v));
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, i);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${SHOTS}/layer-${name}.png` });
    console.log(`  shot layer-${name}.png (intensity ${i})`);
  }
}

await browser.close();
console.log("\nnote: ms/frame is wall clock around renderFrame with the GPU flushed;");
console.log("gpu ms is EXT_disjoint_timer_query_webgl2 where the driver reports it.");
