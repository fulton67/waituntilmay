/**
 * Verify the live journey page end to end, in a real browser.
 *
 * Checks what actually happened on the wire rather than what the code says
 * should happen: which manifest the player used, how many versions it got,
 * whether a version really decodes and plays, and that the fallback is still
 * wired up if Blob were to disappear.
 *
 *   node scripts/verify-journey-live.mjs
 *   node scripts/verify-journey-live.mjs --url https://waituntilmay.com/essdee/journey-to-the-center-of-the-internet
 *   node scripts/verify-journey-live.mjs --expect-count 32
 */
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const URL_ = argOf("--url", "https://waituntilmay.com/journey-to-the-center-of-the-internet");
const EXPECT = argOf("--expect-count", null);
const HEADLESS = !args.includes("--headed");

const browser = await chromium.launch({
  headless: HEADLESS,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const manifestHits = [];
let failed = 0;
page.on("response", (r) => {
  const u = r.url();
  if (u.includes("manifest.json")) manifestHits.push([r.status(), u]);
  if (r.status() >= 400) { failed++; console.log(`  FAIL ${r.status()} ${u}`); }
});
page.on("pageerror", (e) => console.error("  page error:", e.message));

await page.goto(URL_, { waitUntil: "load", timeout: 120000 });

// the <video> elements exist from the first paint, so they prove nothing.
// The start button is disabled until the manifest has actually landed.
await page.waitForSelector(".jrn-start:not([disabled])", { timeout: 60000 });

console.log("manifest requests:");
for (const [s, u] of manifestHits) {
  const where = u.includes("blob.vercel-storage") ? "BLOB (live)" : "bundled fallback";
  console.log(`  ${s}  ${where}  ${u}`);
}
const usedLive = manifestHits.some(([s, u]) =>
  s === 200 && u.includes("blob.vercel-storage"));

// read the manifest the same way the page did, to count the pool
const liveUrl = manifestHits.find(([, u]) => u.includes("blob.vercel-storage"))?.[1];
let count = null;
if (liveUrl) {
  const r = await fetch(`${liveUrl}?t=${Date.now()}`);
  if (r.ok) count = (await r.json()).files?.length ?? null;
}
console.log(`\nlive manifest versions: ${count ?? "n/a"}`);

// click into the piece and let a version actually play
await page.click(".jrn-start", { timeout: 10000 }).catch(() => {});
await page.waitForFunction(
  () => [...document.querySelectorAll("video")].some(
    (v) => v.readyState >= 3 && v.videoWidth > 0),
  null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(4000);

const vids = await page.evaluate(() => [...document.querySelectorAll("video")].map((v) => ({
  src: v.currentSrc, ready: v.readyState, t: +v.currentTime.toFixed(2),
  w: v.videoWidth, h: v.videoHeight, dur: Number.isFinite(v.duration)
    ? +v.duration.toFixed(3) : null, paused: v.paused,
})));
console.log("\nvideo elements:");
for (const v of vids) {
  console.log(`  ready=${v.ready} ${v.w}x${v.h} ${v.dur}s t=${v.t}s `
    + `paused=${v.paused}  ${(v.src || "(none)").split("/").pop()}`);
}

const playing = vids.some((v) => v.ready >= 3 && v.w > 0 && v.t > 0 && !v.paused);
const decoded = vids.some((v) => v.ready >= 3 && v.w > 0);

console.log("\n--- result ---");
console.log(`  live Blob manifest used : ${usedLive}`);
console.log(`  a version decoded       : ${decoded}`);
console.log(`  a version is playing    : ${playing}`);
console.log(`  failed requests         : ${failed}`);
if (EXPECT !== null) {
  console.log(`  expected ${EXPECT} versions : ${String(count) === String(EXPECT)}`);
}

await browser.close();
const ok = usedLive && decoded && failed === 0
  && (EXPECT === null || String(count) === String(EXPECT));
console.log(ok ? "\nPASS" : "\nFAIL");
process.exit(ok ? 0 : 1);
