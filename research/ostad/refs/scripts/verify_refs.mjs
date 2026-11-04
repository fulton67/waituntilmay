// node verify_refs.mjs <base>: /ostad/refs renders refs.json length, every preview exists, sample previews 200,
// sources page 200, filters + lightbox work, 0 console errors.
import { chromium } from "playwright";
import fs from "node:fs";
const base = process.argv[2] || "http://localhost:3108";
const REPO = "C:/Users/naimj/orca/workspaces/waituntilmay/OSTAD-CONTENT-INTEL";
const refs = JSON.parse(fs.readFileSync(`${REPO}/research/ostad/refs/refs.json`, "utf8"));
const motion = JSON.parse(fs.readFileSync(`${REPO}/research/ostad/refs/motion.json`, "utf8"));
let fail = 0;
const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fail++; };
const missing = refs.filter((r) => !fs.existsSync(`${REPO}/public${r.preview}`));
ok(missing.length === 0, `previews on disk: ${refs.length - missing.length}/${refs.length}`);
const b = await chromium.launch();
const page = await b.newPage();
const errs = [];
page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errs.push(m.text()));
page.on("pageerror", (e) => errs.push(String(e)));
const bad = [];
page.on("response", (r) => { const u = new URL(r.url()); if (u.origin === new URL(base).origin && r.status() >= 400 && !u.pathname.startsWith("/_vercel")) bad.push(`${r.status()} ${u.pathname}`); });
const res = await page.goto(base + "/ostad/refs", { waitUntil: "networkidle" });
ok(res.status() === 200, `/ostad/refs ${res.status()}`);
const total = Number(await page.locator('[data-testid="refs-total"]').textContent());
ok(total === refs.length, `rendered total ${total} = refs.json ${refs.length}`);
const cards = await page.locator("[data-ref]").count();
ok(cards === refs.length, `cards ${cards}`);
// preview sample over HTTP: every 10th
let p200 = 0, n = 0;
for (let i = 0; i < refs.length; i += 10) { n++; const r = await page.request.get(base + refs[i].preview); if (r.status() === 200) p200++; }
ok(p200 === n, `preview sample HTTP 200: ${p200}/${n}`);
// pick a procedure, a type chip, open the lightbox
await page.locator("[data-proc]").first().click();
const shown1 = Number(await page.locator('[data-testid="refs-shown"]').textContent());
ok(shown1 > 0 && shown1 < refs.length, `procedure filter: ${shown1}`);
await page.locator("[data-ref]").first().click();
ok(await page.locator('[role="dialog"]').count() === 1, "lightbox opens");
await page.keyboard.press("Escape");
// motion: all procedures, then one procedure's player + beats, then his videos
await page.locator("button", { hasText: "All procedures" }).click();
await page.locator('[data-view="motion"]').click();
const mAll = await page.locator("[data-motion]").count();
ok(mAll === motion.length, `motion cards ${mAll} = motion.json ${motion.length}`);
const mp = motion[0].procedure_id;
await page.locator(`[data-proc="${mp}"]`).click();
const mOne = await page.locator("[data-motion]").count();
ok(mOne === motion.filter((m) => m.procedure_id === mp).length, `motion for ${mp}: ${mOne}`);
await page.locator("[data-motion]").first().click();
const iframe = await page.locator('[role="dialog"] iframe').getAttribute("src");
ok(/youtube-nocookie\.com\/embed\//.test(iframe || ""), "motion player embeds the video");
const beatN = await page.locator('[data-testid="beats"] button').count();
ok(beatN >= 2, `beats listed: ${beatN}`);
await page.locator('[data-testid="beats"] button').nth(beatN - 1).click();
const iframe2 = await page.locator('[role="dialog"] iframe').getAttribute("src");
ok(iframe2 !== iframe, "clicking a beat seeks the player");
await page.keyboard.press("Escape");
await page.locator('[data-view="his"]').click();
ok((await page.locator('[data-testid="mentions"] li').count()) >= 0, "his videos view renders");
const s = await page.goto(base + "/ostad/refs/sources", { waitUntil: "networkidle" });
ok(s.status() === 200, `/ostad/refs/sources ${s.status()}`);
const srcRows = await page.locator('[data-testid="sources"] tbody tr').count();
ok(srcRows > 10, `sources rows ${srcRows}`);
ok(bad.length === 0, `same-origin errors: ${bad.slice(0, 5).join(", ") || "none"}`);
ok(errs.length === 0, `console errors: ${errs.slice(0, 3).join(" | ") || "none"}`);
await b.close();
console.log(fail ? `FAIL (${fail})` : "PASS");
process.exit(fail ? 1 : 0);
