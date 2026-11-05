// The caption block (bottom left of the Rolodex) is one button: one focusable element with role="button" and no
// focusable element inside it, at least 44 px high at 390 px, the pointer cursor on desktop; a click (desktop), a tap
// (phone) or Enter opens the record view for the current release; the hint line is gone.
//   node scripts/gillenwebsite/caption.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/caption-report.json";
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });
const report = { base: BASE, at: new Date().toISOString(), profiles: {} };
for (const p of [{ name: "desktop", w: 1440, h: 900 }, { name: "phone", w: 390, h: 844 }]) {
  const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, isMobile: p.w < 720, hasTouch: p.w < 720 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite`);
  await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__vinyl, null, { timeout: 120000 });
  await page.waitForTimeout(4000);
  const out = await page.evaluate(() => {
    const cap = document.querySelector("[class*=cap][data-src='17']"), r = cap.getBoundingClientRect();
    const focusable = cap.querySelectorAll("a, button, input, select, [tabindex]");
    return { role: cap.getAttribute("role"), tabIndex: cap.tabIndex, label: cap.getAttribute("aria-label"), heightPx: +r.height.toFixed(1), focusableInside: focusable.length, cursor: getComputedStyle(cap).cursor, hint: /SCROLL TO FLIP/.test(document.body.textContent), front: window.__rolodex.rig.front, rect: { x: r.left + r.width * 0.6, y: r.top + r.height / 2 } };
  });
  // open by clicking or tapping on the block's text, not the thumbnail
  if (p.w < 720) await page.touchscreen.tap(out.rect.x, out.rect.y); else await page.mouse.click(out.rect.x, out.rect.y);
  await page.waitForTimeout(1200);
  out.opensOnClick = await page.evaluate(() => window.__vinyl.state());
  out.opensRelease = await page.evaluate(() => document.querySelector("[class*=vvInfo]")?.dataset.release);
  await page.keyboard.press("Escape"); await page.waitForTimeout(900);
  await page.focus("[class*=cap][data-src='17']"); await page.keyboard.press("Enter"); await page.waitForTimeout(1200);
  out.opensOnEnter = await page.evaluate(() => window.__vinyl.state());
  out.pass = out.role === "button" && out.tabIndex === 0 && out.focusableInside === 0 && out.heightPx >= 44 && !out.hint && out.opensOnClick === "open" && out.opensOnEnter === "open" && (p.w < 720 || out.cursor === "pointer");
  report.profiles[p.name] = out;
  console.log(p.name, JSON.stringify(out));
  await ctx.close();
}
await browser.close();
report.pass = Object.values(report.profiles).every((x) => x.pass);
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
