// Measures /ostad on a running server. node research/ostad/scripts/verify.mjs [base]
// Checks: every tab returns 200 and has robots noindex; the library renders one card per row in videos.json with
// every filter off; filters change the count; every thumbnail the data points at exists in public/.
import { chromium } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const base = process.argv[2] ?? "http://localhost:3107";
const videos = JSON.parse(readFileSync(path.join(repo, "app/ostad/data/videos.json"), "utf8"));
const own = JSON.parse(readFileSync(path.join(repo, "app/ostad/data/own.json"), "utf8"));
const plan = JSON.parse(readFileSync(path.join(repo, "app/ostad/data/plan.json"), "utf8"));
const out = {};
const fail = [];

// thumbnails
const ids = new Set([...videos.map((v) => v.id), ...own.posts.map((p) => p.id)]);
const missing = [...ids].filter((id) => !existsSync(path.join(repo, "public/ostad/thumbs", `${id}.jpg`)));
out.thumbs = { referenced: ids.size, missing: missing.length };
if (missing.length) fail.push(`missing thumbs: ${missing.slice(0, 5).join(", ")}`);

// status + robots
for (const p of ["/ostad", "/ostad/genres", "/ostad/baseline", "/ostad/plan", "/ostad/questions", "/ostad/ads"]) {
  const r = await fetch(base + p);
  const html = await r.text();
  const noindex = /<meta name="robots" content="noindex, nofollow/.test(html);
  out[p] = { status: r.status, noindex, kb: Math.round(html.length / 1024) };
  if (r.status !== 200 || !noindex) fail.push(`${p}: ${r.status} noindex=${noindex}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(base + "/ostad", { waitUntil: "networkidle" });
const count = async () => Number(await page.getAttribute('[data-testid="count"]', "data-count"));
const winning = await count();
await page.click('button[aria-pressed="true"]:has-text("winning only")');
await page.selectOption('select[aria-label="relevant"]', "all");
const all = await count();
await page.click('[data-testid="more"]').catch(() => {});
const cards = await page.locator("[data-card]").count();
await page.selectOption('select[aria-label="platform"]', "youtube");
const yt = await count();
await page.selectOption('select[aria-label="platform"]', "all");
await page.fill('input[type="search"]', "mohs");
const mohs = await count();
await page.fill('input[type="search"]', "");
await page.locator("[data-card]").first().click();
const panel = await page.locator('[data-testid="panel"]').count();
out.library = { rows: videos.length, winningDefault: winning, allFiltersOff: all, cardsRendered: cards, youtubeOnly: yt, searchMohs: mohs, panelOpens: panel === 1 };
if (all !== videos.length || cards !== videos.length) fail.push(`library: rows ${videos.length} count ${all} cards ${cards}`);
if (!(winning < all && yt < all && mohs < all)) fail.push("filters do not change the count");
if (panel !== 1) fail.push("panel did not open");

await page.goto(base + "/ostad/plan", { waitUntil: "networkidle" });
const slots = await page.locator("[data-slot]").count();
await page.locator("[data-slot]").first().click();
const refImgs = await page.locator('[data-testid="slot"] img').count();
out.plan = { slotsRendered: slots, expected: plan.slots.length + plan.backups.length, refThumbsInFirstSlot: refImgs };
if (slots !== plan.slots.length + plan.backups.length) fail.push("plan slot count");

for (const p of ["/ostad/genres", "/ostad/baseline", "/ostad/questions", "/ostad/ads"]) {
  await page.goto(base + p, { waitUntil: "networkidle" });
  out[p].tableRows = await page.locator("tbody tr").count();
}
out.pageErrors = errors.length;
if (errors.length) fail.push(`page errors: ${errors.slice(0, 3).join(" | ")}`);
await browser.close();
console.log(JSON.stringify(out, null, 1));
console.log(fail.length ? `FAIL\n- ${fail.join("\n- ")}` : "PASS");
process.exit(fail.length ? 1 : 0);
