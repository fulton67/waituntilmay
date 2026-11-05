// /gillenwebsite/about: answers 200 (no redirect); Dylan's information only (no release list, no cover, no index
// number); the About text's size, face and weight at 1440 and 390; contact and socials at 12 px; the nav reads
// ROLODEX / DISCOGRAPHY / ABOUT.
//   node scripts/gillenwebsite/about.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/about-report.json";
const res = await fetch(`${BASE}/gillenwebsite/about`, { redirect: "manual" });
const report = { base: BASE, at: new Date().toISOString(), status: res.status, profiles: {} };
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
for (const p of [{ name: "desktop", w: 1440, h: 900, px: 28 }, { name: "phone", w: 390, h: 844, px: 22 }]) {
  const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, isMobile: p.w < 720, hasTouch: p.w < 720 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite/about`);
  await page.waitForTimeout(2500);
  const out = await page.evaluate(() => {
    const main = document.querySelector("main"), t = document.querySelector("[data-about-text]"), cs = getComputedStyle(t);
    const links = [...main.querySelectorAll("section a, section button")].map((x) => ({ text: x.textContent, px: parseFloat(getComputedStyle(x).fontSize) }));
    return {
      url: location.pathname, textPx: parseFloat(cs.fontSize), family: cs.fontFamily.split(",")[0], weight: cs.fontWeight, headerFamily: getComputedStyle(document.querySelector("nav a[href$='/about']")).fontFamily.split(",")[0],
      releaseRows: main.querySelectorAll("li, [data-id], [data-entry], [data-inline]").length, images: main.querySelectorAll("img").length,
      nav: [...document.querySelectorAll("nav a")].map((a) => a.textContent.trim()).filter((x) => /^[A-Z]+$/.test(x)), links,
    };
  });
  out.pass = out.url === "/gillenwebsite/about" && out.textPx === p.px && out.family === out.headerFamily && out.weight === "400" && out.releaseRows === 0 && out.images === 0
    && out.nav.join("/") === "ROLODEX/DISCOGRAPHY/ABOUT" && out.links.length >= 2 && out.links.every((l) => l.px === 12);
  report.profiles[p.name] = out;
  console.log(p.name, JSON.stringify(out));
  await ctx.close();
}
await browser.close();
report.pass = report.status === 200 && Object.values(report.profiles).every((x) => x.pass);
console.log("pass", report.pass, report.status);
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
