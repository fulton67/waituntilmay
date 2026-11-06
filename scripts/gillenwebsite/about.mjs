// /gillenwebsite/about at 1440 and 390: answers 200 (no redirect); nav ROLODEX / DISCOGRAPHY / ABOUT; the About text's
// computed size (56 / 30 px), leading (1.05), face (the header's), weight and colour, left-aligned, its lines (words
// per line, at most 22); the page holds only the text and the contact block (12 px): no grey credit layer (no
// [data-about-grey], no element in light grey), no release list and no site footer; one cover square after each artist named in the
// text who is in the discography (names found in the text against discography.json's credited artists).
//   node scripts/gillenwebsite/about.mjs [base-url] [--out file] [--shots dir]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/about-report.json";
const SHOTS = argv.includes("--shots") ? argv[argv.indexOf("--shots") + 1] : null;
const res = await fetch(`${BASE}/gillenwebsite/about`, { redirect: "manual" });
const about = JSON.parse(await fs.readFile("lib/gillenwebsite/about.json", "utf8"));
const releases = JSON.parse(await fs.readFile("lib/gillenwebsite/discography.json", "utf8")).releases;
const artists = [...new Set(releases.flatMap((r) => r.artist.split(/,|&/).map((x) => x.trim().replace(/^the /i, ""))).filter(Boolean))];
const named = artists.filter((a) => new RegExp(`(?:The )?${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w'])`).test(about.text.replace(/\s+/g, " ")));
const report = { base: BASE, at: new Date().toISOString(), status: res.status, artistsNamedInDiscography: named, profiles: {} };
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
for (const p of [{ name: "desktop", w: 1440, h: 900, px: 56 }, { name: "phone", w: 390, h: 844, px: 30 }]) {
  const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, isMobile: p.w < 720, hasTouch: p.w < 720 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite/about`);
  await page.waitForTimeout(2500);
  const out = await page.evaluate(() => {
    const main = document.querySelector("main"), t = document.querySelector("[data-about-text]"), cs = getComputedStyle(t);
    const contact = document.querySelector("[data-about-contact]");
    // every element in main that is not the text (and its lines and squares) or the contact block (and its links)
    const other = [...main.querySelectorAll("*")].filter((e) => !t.contains(e) && !contact.contains(e) && !e.contains(t) && !e.contains(contact));
    const lines = [...t.children].map((l) => l.textContent.trim());
    return {
      url: location.pathname, textPx: parseFloat(cs.fontSize), leading: +(parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)).toFixed(3), family: cs.fontFamily.split(",")[0], weight: cs.fontWeight, color: cs.color, align: cs.textAlign,
      headerFamily: getComputedStyle(document.querySelector("nav a[href$='/about']")).fontFamily.split(",")[0],
      lines: lines.length, maxWordsPerLine: Math.max(...lines.map((l) => l.split(/\s+/).length)),
      greyLayer: document.querySelectorAll("[data-about-grey], [class*=aboutGrey]").length, greyText: [...main.querySelectorAll("*")].filter((e) => /rgb\((2\d\d|1[5-9]\d), , \)/.test(getComputedStyle(e).color) || getComputedStyle(e).color === "rgb(200, 200, 200)").length, ariaHidden: main.querySelectorAll("[aria-hidden=true]").length,
      squares: t.querySelectorAll("img").length, squareAfter: [...t.querySelectorAll("img")].map((i) => i.closest("[class*=aboutName]")?.textContent.trim()), squareSameLine: [...t.querySelectorAll("img")].every((i) => { const n = i.closest("[class*=aboutName]"), g = document.createRange(); g.selectNodeContents(n.firstChild); const last = [...g.getClientRects()].at(-1), b = i.getBoundingClientRect(); return Math.abs(last.bottom - b.bottom) < parseFloat(cs.lineHeight) / 2 && b.left >= last.right - 1; }),
      squarePx: (() => { const i = t.querySelector("img")?.getBoundingClientRect(); return i ? [Math.round(i.width), Math.round(i.height)] : null; })(),
      releaseRows: main.querySelectorAll("li, [data-id], [data-entry], [data-inline], [data-footer-index]").length,
      otherElements: other.map((e) => e.tagName + "." + e.className),
      footer: !!document.querySelector("footer"),
      nav: [...document.querySelectorAll("nav a")].map((a) => a.textContent.trim()).filter((x) => /^[A-Z]+$/.test(x)),
      contactPx: [...contact.querySelectorAll("a, button")].map((x) => parseFloat(getComputedStyle(x).fontSize)),
    };
  });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/about-${p.name}.png`, fullPage: true });
  out.pass = out.url === "/gillenwebsite/about" && out.textPx === p.px && Math.abs(out.leading - 1.05) < 0.01 && out.family === out.headerFamily && out.weight === "400" && out.color === "rgb(0, 0, 0)" && out.align === "left"
    && out.maxWordsPerLine <= 22 && out.greyLayer === 0 && out.greyText === 0 && out.ariaHidden === 0
    && out.squares === named.length && out.squareSameLine && out.releaseRows === 0 && out.otherElements.length === 0 && !out.footer
    && out.nav.join("/") === "ROLODEX/DISCOGRAPHY/ABOUT" && out.contactPx.length >= 2 && out.contactPx.every((x) => x === 12);
  report.profiles[p.name] = out;
  console.log(p.name, JSON.stringify(out));
  await ctx.close();
}
await browser.close();
report.pass = report.status === 200 && Object.values(report.profiles).every((x) => x.pass);
console.log("named", named.length, named.join(", "), "| pass", report.pass);
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
