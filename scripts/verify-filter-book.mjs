/**
 * Verify /mosh-lab/filters in a real browser.
 *
 * The page's whole claim is that it is readable, so the checks are about what
 * a reader sees rather than about what the JSON holds: the groups are in the
 * order the groups are supposed to be in, the plain name is the heading and
 * the ffmpeg name is beside it, a slider says what its ends mean in words,
 * and the Output command is a real ffmpeg line that changes when a dial
 * moves.
 *
 * The thumbnail check is the one that caught something: the page used to ask
 * for all 396 pictures before the index of which ones exist had arrived, and
 * answered 140 of them with a 404. A failed request is a failure here.
 *
 *   npx next build && npx next start -p 3125
 *   node scripts/verify-filter-book.mjs
 *   node scripts/verify-filter-book.mjs --url https://waituntilmay.com/mosh-lab/filters
 */
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const URL_ = argOf("--url", "http://localhost:3125/mosh-lab/filters");

const WANT_GROUPS = [
  "Color", "Blur & sharpen", "Distort & warp",
  "Time (speed, echo, repeat)", "Edges & shapes", "Glitch & noise",
  "Cut & crop", "Everything else",
];

const browser = await chromium.launch({ headless: !args.includes("--headed") });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const bad = [];
page.on("response", (r) => {
  // the insights scripts only exist on Vercel; locally they 404 and mean nothing
  if (r.status() >= 400 && !r.url().includes("/_vercel/")) {
    bad.push(`${r.status()} ${r.url()}`);
  }
});
page.on("pageerror", (e) => bad.push(`page error: ${e.message}`));

await page.goto(URL_, { waitUntil: "load", timeout: 90000 });
await page.waitForSelector(".fb-card", { timeout: 60000 });

const groups = await page.$$eval(".fb-group > h2", (hs) =>
  hs.map((h) => h.firstChild.textContent.trim()));
const cards = await page.$$eval(".fb-card", (c) => c.length);
const rough = await page.$$eval(".fb-card .fb-rough", (r) => r.length);

console.log("groups, in order:");
groups.forEach((g, i) => console.log(`  ${g === WANT_GROUPS[i] ? " " : "!"} ${g}`));
const orderOk = groups.length === WANT_GROUPS.length
  && groups.every((g, i) => g === WANT_GROUPS[i]);
console.log(`\nfilters shown: ${cards}   marked rough: ${rough}`);

// within a group, the hand-written ones come first
const firstGroup = await page.$$eval(
  ".fb-group:first-of-type .fb-card",
  (cs) => cs.slice(0, 6).map((c) => !c.classList.contains("fb-card-auto")));
const handFirst = firstGroup.indexOf(false) === -1
  || !firstGroup.slice(firstGroup.indexOf(false)).includes(true);
console.log(`hand-written first in the first group: ${handFirst}`);

/** Put one filter in the chain by its ffmpeg name. */
async function add(n) {
  await page.fill(".fb-search", n);
  await page.waitForTimeout(250);
  await page.locator(".fb-card")
    .filter({ has: page.locator(`code.fb-ff:text-is("${n}")`) }).first()
    .locator("button", { hasText: "add to chain" }).click();
}

await add("lagfun");
await page.waitForSelector(".fb-out pre");
const ends = await page.$$eval(".fb-step .fb-ends i", (xs) =>
  xs.map((x) => x.textContent));
console.log(`the first slider's ends, in words: ${JSON.stringify(ends.slice(0, 2))}`);

const before = (await page.textContent(".fb-out pre")).trim();
const slider = page.locator(".fb-step input[type=range]").first();
await slider.focus();
for (let i = 0; i < 40; i++) await page.keyboard.press("ArrowRight");
await page.waitForTimeout(150);
const after = (await page.textContent(".fb-out pre")).trim();

await add("rgbashift");
await page.waitForTimeout(150);
const r2 = page.locator(".fb-step").nth(1).locator("input[type=range]").first();
await r2.focus();
for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
await page.waitForTimeout(150);
const two = (await page.textContent(".fb-out pre")).trim();

console.log("\noutput command");
console.log(`  untouched : ${before}`);
console.log(`  one dial  : ${after}`);
console.log(`  two filters: ${two}`);

await page.fill(".fb-search", "");
await page.waitForTimeout(500);
const loaded = await page.$$eval(".fb-thumb", (is) =>
  is.filter((i) => i.complete && i.naturalWidth > 0).length);
console.log(`\nthumbnails decoded in the viewport: ${loaded}`);

await browser.close();

const checks = {
  "groups in the intended order": orderOk,
  "hand-written filters come first": handFirst,
  "the slider's ends are words, not numbers":
    ends.length >= 2 && Number.isNaN(Number(ends[0])),
  "the command changes when a dial moves": before !== after,
  "a second filter chains onto the first": two.split(",").length >= 2,
  "a thumbnail decoded": loaded > 0,
  "no failed requests, no page errors": bad.length === 0,
};
console.log("\n--- result ---");
for (const [k, v] of Object.entries(checks)) {
  console.log(`  ${v ? "PASS" : "FAIL"}  ${k}`);
}
if (bad.length) {
  console.log("\nfailures:");
  for (const b of bad.slice(0, 20)) console.log("  " + b);
  if (bad.length > 20) console.log(`  ... and ${bad.length - 20} more`);
}
const ok = Object.values(checks).every(Boolean);
console.log(ok ? "\nPASS" : "\nFAIL");
process.exit(ok ? 0 : 1);
