// The pill buttons (SOURCES #32) against dauanjacari.com's /blog filter pills, as computed in Chrome: padding,
// height, radius, border, ground at rest / hovered / chosen, chosen type colour, type size and tracking,
// transition. The reference values are read off dauanjacari.com live (or, offline, the ones recorded 2026-11-04).
// On the site: a ROLE pill, YEAR and A-Z on the discography, CLOSE in the record view.
//   node scripts/gillenwebsite/pills.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/pills-report.json";
const KEYS = ["height", "padding", "borderRadius", "border", "fontSize", "letterSpacing", "transition", "rest", "hover", "chosen", "chosenColor"];
const RECORDED = { height: 31, padding: "10px 12px 9px", borderRadius: "100px", border: "0px none rgb(0, 0, 0)", fontSize: "12px", letterSpacing: "0.48px", transition: "all 0.3s", rest: "rgba(0, 0, 0, 0.1)", hover: "rgba(0, 0, 0, 0.3)", chosen: "rgba(0, 0, 0, 0.5)", chosenColor: "rgb(250, 250, 250)" };
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
// the box and type of one element, and its ground; the label's type for size, tracking and colour
const read = (h, label) => page.evaluate(([e, l]) => { const cs = getComputedStyle(e), t = getComputedStyle(l || e), r = e.getBoundingClientRect(); return { height: Math.round(r.height), padding: cs.padding, borderRadius: cs.borderRadius, border: cs.border, fontSize: t.fontSize, letterSpacing: t.letterSpacing, transition: cs.transition, bg: cs.backgroundColor, color: t.color }; }, [h, label]);
const states = async (h, label, choose) => {
  await page.mouse.move(5, 5); await page.waitForTimeout(500);
  const rest = await read(h, label);
  await h.hover(); await page.waitForTimeout(500);
  const hover = await read(h, label);
  await choose(); await page.mouse.move(5, 5); await page.waitForTimeout(500);
  const chosen = await read(h, label);
  return { height: rest.height, padding: rest.padding, borderRadius: rest.borderRadius, border: rest.border, fontSize: rest.fontSize, letterSpacing: rest.letterSpacing, transition: rest.transition, rest: rest.bg, hover: hover.bg, chosen: chosen.bg, chosenColor: chosen.color };
};

// the reference, live
let ref = RECORDED, refFrom = "recorded 2026-11-04";
try {
  await page.goto("https://dauanjacari.com/blog", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);
  const labels = await page.$$('form[fs-list-element="filters"] label.w-radio');
  const l = labels[1], span = await l.$(".w-form-label");
  ref = await states(l, span, () => l.click());
  refFrom = "dauanjacari.com/blog, live";
} catch (e) { console.log("dauanjacari.com unreachable, using the recorded values:", e.message.slice(0, 80)); }

const site = {};
await page.goto(`${BASE}/gillenwebsite/discography`);
await page.waitForTimeout(2500);
const role = page.locator("[role=radiogroup] [role=radio]").nth(1);
site.role = await states(await role.elementHandle(), null, () => role.click());
const az = page.getByRole("button", { name: "A–Z" });
site.az = await states(await az.elementHandle(), null, () => az.click());
await page.getByRole("button", { name: "YEAR" }).click();

const cmp = (a) => Object.fromEntries(KEYS.map((k) => [k, { site: a[k], dauanjacari: ref[k], same: String(a[k]) === String(ref[k]) }]));
const report = { base: BASE, at: new Date().toISOString(), reference: refFrom, role: cmp(site.role), az: cmp(site.az) };
report.pass = [report.role, report.az].every((c) => Object.values(c).every((x) => x.same));
await page.screenshot({ path: "docs/gillenwebsite/pills-1440.png", clip: { x: 960, y: 40, width: 480, height: 420 } });
await browser.close();
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(refFrom, JSON.stringify({ role: Object.fromEntries(Object.entries(report.role).map(([k, v]) => [k, `${v.site}${v.same ? "" : " ≠ " + v.dauanjacari}`])), pass: report.pass }));
