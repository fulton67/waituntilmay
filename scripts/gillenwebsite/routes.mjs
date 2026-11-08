// The top-level sections of /gillenwebsite/about and /gillenwebsite/discography at 1440 x 900 and 390 x 844: main's
// page section and each of its children (tag, class, data-src, how many elements, the start of its text), and the
// footer if any. About must hold only the text (with its cover squares) and the contact block, no release rows;
// Discography must hold no About text (no [data-about-text], none of its sentences) and its index of 36 rows.
//   node scripts/gillenwebsite/routes.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/routes-report.json";
const about = JSON.parse(await fs.readFile("lib/gillenwebsite/about.json", "utf8"));
const sentence = about.text.replace(/\s+/g, " ").split(/[.,]/)[0].trim();
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const report = { base: BASE, at: new Date().toISOString(), aboutSentence: sentence, routes: {} };
for (const route of ["about", "discography"]) {
  for (const p of [{ name: "desktop", w: 1440, h: 900 }, { name: "phone", w: 390, h: 844 }]) {
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, isMobile: p.w < 720, hasTouch: p.w < 720 });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/gillenwebsite/${route}`);
    await page.waitForTimeout(2500);
    const out = await page.evaluate((sentence) => {
      const sec = document.querySelector("main > section"), d = (e) => ({ tag: e.tagName.toLowerCase(), class: String(e.className).split("__").pop(), src: e.dataset.src ?? null, elements: e.querySelectorAll("*").length, text: e.textContent.replace(/\s+/g, " ").trim().slice(0, 60) });
      return {
        section: d(sec), children: [...sec.children].map(d), footer: !!document.querySelector("footer"),
        releaseRows: sec.querySelectorAll("[data-entry]").length, aboutText: !!sec.querySelector("[data-about-text]") || sec.textContent.replace(/\s+/g, " ").includes(sentence),
        coverSquares: sec.querySelectorAll("[data-about-text] img").length,
      };
    }, sentence);
    out.pass = route === "about" ? out.releaseRows === 0 && out.aboutText && out.children.length === 2 && !out.footer : !out.aboutText && out.releaseRows === 36;
    (report.routes[route] ??= {})[p.name] = out;
    console.log(route, p.name, JSON.stringify(out));
    await ctx.close();
  }
}
await browser.close();
report.pass = Object.values(report.routes).every((r) => Object.values(r).every((x) => x.pass));
console.log("pass", report.pass);
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
