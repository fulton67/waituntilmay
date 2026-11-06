// /gillenwebsite/discography's top and its active row. At 390 x 844 (phone, touch: the About index, AboutIndex.tsx)
// and 1440 x 900: the pinned header's height, --head, the page's padding-top (header + 24 px), and row 1's box against
// the header's bottom at scrollY 0 (wholly below it). The page must stay at scrollY 0 for 3 s after load (nothing
// scrolls it on mount). Phone only, the active row (the underlined title): at scrollY 0 (row 1), at the midpoint of
// the scroll range (nearest the middle of the screen), and at the bottom (row 36); row 1 and row 36 each reached
// and underlined (computed text-decoration-line on the title).
//   node scripts/gillenwebsite/discoscroll.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/discoscroll-report.json";
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const report = { base: BASE, at: new Date().toISOString(), profiles: {} };
for (const p of [{ name: "phone", w: 390, h: 844 }, { name: "desktop", w: 1440, h: 900 }]) {
  const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, isMobile: p.w < 720, hasTouch: p.w < 720 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite/discography`);
  await page.waitForSelector("[data-entry]");
  // scrollY sampled every 100 ms for 3 s from load
  const ys = [];
  for (let k = 0; k < 30; k++) { ys.push(await page.evaluate(() => scrollY)); await page.waitForTimeout(100); }
  const state = () => page.evaluate(() => {
    const rows = [...document.querySelectorAll("[data-entry]")];
    const under = rows.map((r, i) => [i, getComputedStyle(r.querySelector("[data-title] > span")).textDecorationLine, getComputedStyle(r.querySelector("[data-title] > span")).textDecorationColor]);
    // the underlined title (phones: .indexOn; desktop: the hovered row, whose underline colour is not transparent)
    const on = under.filter(([, l, c]) => l.includes("underline") && c !== "rgba(0, 0, 0, 0)").map(([i]) => i + 1);
    return { scrollY: Math.round(scrollY), maxScroll: document.documentElement.scrollHeight - innerHeight, active: on };
  });
  const out = await page.evaluate(() => {
    const hd = document.querySelector("header").getBoundingClientRect(), sec = document.querySelector("main > section"), r1 = document.querySelector("[data-entry]").getBoundingClientRect();
    const list = document.querySelector("[data-entry]").parentElement.getBoundingClientRect();
    return {
      headerPx: hd.height, headVar: getComputedStyle(sec).getPropertyValue("--head").trim(), sectionPaddingTop: parseFloat(getComputedStyle(sec).paddingTop),
      listTop: +list.top.toFixed(1), row1: { top: +r1.top.toFixed(1), bottom: +r1.bottom.toFixed(1) }, headerBottom: hd.bottom, row1Clear: +(r1.top - hd.bottom).toFixed(1), rows: document.querySelectorAll("[data-entry]").length,
    };
  });
  out.scrollYFirst3s = [...new Set(ys)];
  out.atTop = await state();
  if (p.w < 720) {
    const go = async (y) => { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(400); return state(); };
    out.atMid = await go(Math.round(out.atTop.maxScroll / 2));
    out.atBottom = await go(out.atTop.maxScroll);
    out.backToTop = await go(0);
    out.row1Underlined = out.atTop.active.join() === "1" && out.backToTop.active.join() === "1";
    out.row36Underlined = out.atBottom.active.join() === String(out.rows);
  }
  out.pass = out.scrollYFirst3s.join() === "0" && out.sectionPaddingTop === out.headerPx + 24 && out.headVar === `${out.headerPx}px` && out.row1Clear >= 0
    && (p.w >= 720 || (out.row1Underlined && out.row36Underlined && out.atMid.active.length === 1));
  report.profiles[p.name] = out;
  console.log(p.name, JSON.stringify(out));
  await ctx.close();
}
await browser.close();
report.pass = Object.values(report.profiles).every((x) => x.pass);
console.log("pass", report.pass);
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
