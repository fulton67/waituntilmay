// The header clock: the viewer's local time (h:mm:ss AM, the string toLocaleTimeString("en-US") gives in the page
// this second or the last) and date (DD.MM.YYYY) from the device clock, in three time zones; centred in the header on
// desktop (on phones it sits right of the name, the nav on the row below) and clear of the name and the nav, at
// 1440, 1280 and 390 px.
//   node scripts/gillenwebsite/header.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/header-report.json";
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const report = { base: BASE, at: new Date().toISOString(), runs: [] };
for (const [w, h, tz] of [[1440, 900, "America/Los_Angeles"], [1280, 720, "Asia/Karachi"], [390, 844, "Europe/London"]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, timezoneId: tz, isMobile: w < 720, hasTouch: w < 720 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite/discography`);
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const spans = [...document.querySelectorAll("[class*=timer] span")], [t, d] = spans.map((s) => s.textContent);
    const now = new Date(), [DD, MM, YYYY] = d.split(".").map(Number);
    const matches = [now, new Date(+now - 1000)].some((x) => x.toLocaleTimeString("en-US") === t);
    const day = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
    const timer = document.querySelector("[class*=timer]").getBoundingClientRect(), name = document.querySelector("header [class*=name]").getBoundingClientRect(), words = document.querySelector("header [class*=words]").getBoundingClientRect();
    const ov = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
    return { time: t, date: d, expected: now.toLocaleTimeString("en-US"), matchesLocale: matches, dateMatches: day === d && YYYY > 2000, offsetMin: -now.getTimezoneOffset(), font: `${getComputedStyle(spans[0]).fontFamily.split(",")[0]} ${getComputedStyle(spans[0]).fontSize}`,
      centreOffPx: +Math.abs((timer.left + timer.right) / 2 - document.documentElement.clientWidth / 2).toFixed(1), overlapsName: ov(timer, name), overlapsNav: ov(timer, words) };
  });
  r.viewport = `${w}x${h}`; r.timezone = tz;
  r.pass = r.matchesLocale && r.dateMatches && /^\d{1,2}:\d\d:\d\d\s[AP]M$/.test(r.time) && (w < 720 || r.centreOffPx <= 1) && !r.overlapsName && !r.overlapsNav && /^\d\d\.\d\d\.\d{4}$/.test(r.date);
  report.runs.push(r);
  console.log(JSON.stringify(r));
  await ctx.close();
}
await browser.close();
report.pass = report.runs.every((r) => r.pass);
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
