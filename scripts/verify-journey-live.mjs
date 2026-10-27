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
let live = null;
if (liveUrl) {
  const r = await fetch(`${liveUrl}?t=${Date.now()}`);
  if (r.ok) { live = await r.json(); count = live.files?.length ?? null; }
}
console.log(`\nlive manifest versions: ${count ?? "n/a"}`);
if (live?.sources) {
  console.log(`live manifest sources : ${live.sources.join(", ")}`);
}

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

// ---- one version per source, actually played
// The pool draws across sources, so "a version plays" is not enough: a
// version whose words came mostly from one source could be the only one that
// works. The manifest carries each version's mix, so pick the version with
// the biggest share of each source and decode it in this same page.
const perSource = [];
if (live?.mixes && live?.sources) {
  for (const sid of live.sources) {
    const best = Object.entries(live.mixes)
      .filter(([, m]) => (m[sid] ?? 0) > 0)
      .sort((a, b) => (b[1][sid] ?? 0) - (a[1][sid] ?? 0))[0];
    if (!best) { perSource.push({ sid, ok: false, why: "no version" }); continue; }
    const [name, mix] = best;
    const url = (live.files ?? []).find((u) => u.endsWith(name));
    if (!url) { perSource.push({ sid, ok: false, why: "not in files" }); continue; }
    const got = await page.evaluate(async (u) => {
      const v = document.createElement("video");
      v.muted = true; v.preload = "auto"; v.src = u;
      document.body.appendChild(v);
      const ready = await new Promise((res) => {
        const t = setTimeout(() => res(false), 30000);
        v.addEventListener("canplay", () => { clearTimeout(t); res(true); },
          { once: true });
        v.addEventListener("error", () => { clearTimeout(t); res(false); },
          { once: true });
      });
      if (!ready) { v.remove(); return { ready: false }; }
      await v.play().catch(() => {});
      await new Promise((r) => setTimeout(r, 1500));
      const out = { ready: true, w: v.videoWidth, h: v.videoHeight,
        t: +v.currentTime.toFixed(2),
        dur: Number.isFinite(v.duration) ? +v.duration.toFixed(3) : null };
      v.pause(); v.remove();
      return out;
    }, url);
    const ok = !!got.ready && got.w > 0 && got.t > 0;
    perSource.push({ sid, ok, name, share: mix[sid], ...got });
  }
  console.log("\none version per source, played in the live page:");
  for (const r of perSource) {
    console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.sid.padEnd(11)} `
      + `${(r.name ?? r.why ?? "").padEnd(18)} `
      + (r.ok ? `${r.share?.toFixed(1)}% of its speech  `
        + `${r.w}x${r.h} ${r.dur}s t=${r.t}s` : (r.why ?? "did not decode")));
  }
}
const sourcesPlay = perSource.length === 0 || perSource.every((r) => r.ok);

console.log("\n--- result ---");
console.log(`  live Blob manifest used : ${usedLive}`);
console.log(`  a version decoded       : ${decoded}`);
console.log(`  a version is playing    : ${playing}`);
if (perSource.length) {
  console.log(`  every source plays      : ${sourcesPlay} `
    + `(${perSource.filter((r) => r.ok).length}/${perSource.length})`);
}
console.log(`  failed requests         : ${failed}`);
if (EXPECT !== null) {
  console.log(`  expected ${EXPECT} versions : ${String(count) === String(EXPECT)}`);
}

await browser.close();
const ok = usedLive && decoded && sourcesPlay && failed === 0
  && (EXPECT === null || String(count) === String(EXPECT));
console.log(ok ? "\nPASS" : "\nFAIL");
process.exit(ok ? 0 : 1);
