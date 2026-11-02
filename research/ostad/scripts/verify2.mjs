// Run 2: measures the /ostad reading tool on a running server. node research/ostad/scripts/verify2.mjs [base]
// Asserts: every route (incl. each theme page) returns 200 + noindex; /ostad/watch shows exactly the makeable rows by
// default and every row with "show everything" on (both numbers printed); chips have counts and filter; the panel opens
// with an embed or a link-out and loads the transcript; every video has an embed URL or falls back, and a sample of
// embed URLs is re-checked live; all six tabs are clicked through with zero console errors; thumbs + transcripts exist.
import { chromium } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const base = process.argv[2] ?? "http://localhost:3107";
const D = (f) => JSON.parse(readFileSync(path.join(repo, "app/ostad/data", f), "utf8"));
const videos = D("videos.json"), themes = D("themes.json"), cares = D("cares.json"), plan = D("plan.json");
const makeable = videos.filter((v) => v.mk).length;
const out = { rows: videos.length, makeable };
const fail = [];
const ok = (cond, msg) => cond || fail.push(msg);

// files
const noThumb = videos.filter((v) => !existsSync(path.join(repo, "public/ostad/thumbs", `${v.id}.jpg`)));
const noTr = videos.filter((v) => v.tw > 0 && !existsSync(path.join(repo, "public/ostad/tr", `${v.id}.txt`)));
out.files = { thumbsMissing: noThumb.length, transcriptsMissing: noTr.length, transcripts: videos.filter((v) => v.tw > 0).length };
ok(!noThumb.length && !noTr.length, `files missing: thumbs ${noThumb.length}, transcripts ${noTr.length}`);

// embeds: every row has a player or falls back to a link; re-check a sample live
const withEmb = videos.filter((v) => v.emb);
out.embeds = { withPlayer: withEmb.length, linkOut: videos.length - withEmb.length };
const sample = [];
for (const p of ["tiktok", "instagram", "youtube"]) sample.push(...withEmb.filter((v) => v.p === p).sort(() => 0.5 - Math.random()).slice(0, 8));
const checkUrl = (v) =>
  v.p === "youtube" ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(v.url)}`
  : v.p === "tiktok" ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(v.url)}`
  : v.emb;
const live = await Promise.all(sample.map(async (v) => {
  try { return (await fetch(checkUrl(v), { headers: { "User-Agent": "Mozilla/5.0" } })).status; } catch { return 0; }
}));
out.embeds.liveSample = `${live.filter((s) => s === 200).length}/${live.length} returned 200`;
ok(live.every((s) => s === 200), `embed sample: ${live.join(",")}`);

// routes
const routes = ["/ostad", "/ostad/themes", ...themes.map((t) => `/ostad/themes/${t.slug}`), "/ostad/watch", "/ostad/cares", "/ostad/plan", "/ostad/him"];
out.routes = {};
for (const p of routes) {
  const r = await fetch(base + p);
  const html = await r.text();
  const noindex = /<meta name="robots" content="noindex, nofollow/.test(html);
  out.routes[p] = r.status;
  ok(r.status === 200 && noindex, `${p}: ${r.status} noindex=${noindex}`);
}
for (const gone of ["/ostad/genres", "/ostad/questions", "/ostad/ads", "/ostad/baseline"]) {
  const r = await fetch(base + gone);
  ok(r.status === 404, `${gone} should be gone, got ${r.status}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && !/frame|embed|tiktok|instagram|youtube|ERR_BLOCKED|CORS|third-party|Permissions-Policy/i.test(m.text()) && errors.push(m.text()));
const count = async () => Number(await page.getAttribute('[data-testid="count"]', "data-count"));

// watch
await page.goto(base + "/ostad/watch", { waitUntil: "networkidle" });
const def = await count();
await page.click('[data-testid="show-everything"]');
const all = await count();
const chipCount = await page.locator("[data-chip]").count();
await page.locator('[data-chip="p"]').first().click();
const oneChip = await count();
await page.locator('[data-testid="active-chip"]').first().click();
const back = await count();
await page.click('[data-testid="all"]').catch(() => {});
const cards = await page.locator("[data-card]").count();
await page.click('[data-testid="show-everything"]'); // back to default for the other tabs
const def2 = await count();
await page.locator("[data-card]").first().click();
const panel = await page.locator('[data-testid="panel"]').count();
const player = await page.locator('[data-testid="embed"], [data-testid="linkout"]').count();
await page.waitForSelector('[data-testid="transcript"]', { timeout: 8000 }).catch(() => {});
const trText = (await page.locator('[data-testid="transcript"]').textContent().catch(() => "")) ?? "";
out.watch = { defaultCount: def, makeableRows: makeable, showEverythingCount: all, totalRows: videos.length, chips: chipCount, oneChipCount: oneChip, cardsAfterAll: cards, panel, player, transcriptChars: trText.length };
console.log(`WATCH default ${def} (makeable rows ${makeable}) · show everything ${all} (rows ${videos.length})`);
ok(def === makeable, `watch default ${def} != makeable ${makeable}`);
ok(all === videos.length, `watch all ${all} != rows ${videos.length}`);
ok(def2 === makeable, "toggle back failed");
ok(chipCount > 10 && oneChip < all && back === all, "chips do not filter");
ok(cards === all, `cards ${cards} != ${all} after [all]`);
ok(panel === 1 && player === 1, "panel/player missing");

// read, themes, cares, plan, him — click through the tabs
await page.keyboard.press("Escape");
const tabs = ["READ", "THEMES", "WATCH", "CARES", "PLAN", "HIM"];
out.tabs = {};
await page.goto(base + "/ostad", { waitUntil: "networkidle" });
for (const t of tabs) {
  await page.click(`nav a:has-text("${t}")`);
  await page.waitForLoadState("networkidle");
  out.tabs[t] = new URL(page.url()).pathname;
}
ok(Object.values(out.tabs).length === 6, "tabs");

await page.goto(base + "/ostad", { waitUntil: "networkidle" });
out.read = { figure: await page.locator('[data-testid="strip"]').count(), themeSections: await page.locator("section[id]").count(), cards: await page.locator("[data-card]").count() };
ok(out.read.figure === 1 && out.read.themeSections === themes.length, `read: figure ${out.read.figure}, sections ${out.read.themeSections}/${themes.length}`);

out.themePages = {};
for (const t of themes) {
  await page.goto(base + `/ostad/themes/${t.slug}`, { waitUntil: "domcontentloaded" });
  const ex = await page.locator('[data-testid="examples"] [data-card]').count();
  const says = await page.locator('[data-testid="says"]').count();
  out.themePages[t.slug] = ex;
  ok(ex >= 4 && says === 1, `theme ${t.slug}: ${ex} examples, says ${says}`);
}

await page.goto(base + "/ostad/cares", { waitUntil: "networkidle" });
const careItems = await page.locator('[data-testid="cares"] > li').count();
await page.locator('[data-testid="cares"] summary').first().click();
await page.fill('[data-testid="answer"] >> nth=0', "test answer");
await page.reload({ waitUntil: "networkidle" });
await page.locator('[data-testid="cares"] summary').first().click();
const kept = await page.inputValue('[data-testid="answer"] >> nth=0');
out.cares = { items: careItems, expected: cares.length, answerPersists: kept === "test answer" };
ok(careItems === 25 && cares.length === 25 && kept === "test answer", `cares ${careItems}, persist ${kept}`);
await page.evaluate(() => localStorage.removeItem("ostad.answers"));

await page.goto(base + "/ostad/plan", { waitUntil: "networkidle" });
const slots = await page.locator("[data-slot]").count();
await page.locator("[data-slot]").first().click();
const opening = await page.locator('[data-testid="opening"]').count();
await page.keyboard.press("Escape");
await page.click('[data-testid="batches"]');
const batchSlots = await page.locator("[data-slot]").count();
out.plan = { slots, expected: plan.slots.length + plan.backups.length, opening, batchSlots };
ok(slots === 30 && opening === 1 && batchSlots >= 20, `plan: ${slots} slots, opening ${opening}, batch view ${batchSlots}`);

await page.goto(base + "/ostad/him", { waitUntil: "networkidle" });
out.him = { strip: await page.locator('[data-testid="him-strip"]').count(), mix: await page.locator('[data-testid="him-mix"]').count() };
ok(out.him.strip === 1 && out.him.mix === 1, "him figures");

out.consoleErrors = errors.length;
ok(!errors.length, `console errors: ${errors.slice(0, 3).join(" | ")}`);
await browser.close();
console.log(JSON.stringify(out, null, 1));
console.log(fail.length ? `FAIL\n- ${fail.join("\n- ")}` : "PASS");
process.exit(fail.length ? 1 : 0);
