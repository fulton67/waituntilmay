// /gillenwebsite/discography, About and the discography on one page: /about answers 308 to it; the three timestamps
// (the now line within a second of the clock, each with the zone's offset); each role pill's count against the
// releases it leaves in the inline numbers and in the list; desktop hover opens exactly one cover. At 390 x 844
// (touch): the page is taller than the screen and scrolls as a page (nothing in the list or above it sets
// touch-action: none); after each of several wheel scrolls, the time from the last scrollend to the active row's
// last change (negative: it changed first, on the 80 ms rest that stands in for scrollend),
// exactly one row expanded, its cover a 40vw square inside its own row (the next row starts below it).
//   node scripts/gillenwebsite/merged.mjs [base-url] [--out file] [--shots dir]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/merged-report.json";
const SHOTS = argv.includes("--shots") ? argv[argv.indexOf("--shots") + 1] : null;
const report = { base: BASE, at: new Date().toISOString() };

const res = await fetch(`${BASE}/gillenwebsite/about`, { redirect: "manual" });
report.about = { status: res.status, location: res.headers.get("location") };
report.about.pass = res.status === 308 && /\/gillenwebsite\/discography$/.test(report.about.location ?? "");
console.log("about", JSON.stringify(report.about));

const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });

// ---- desktop ----
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/gillenwebsite/discography`);
  await page.waitForFunction(() => window.__disco && document.querySelector("[data-stamp='2']")?.textContent, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  const st = await page.evaluate(() => {
    const t = [...document.querySelectorAll("[data-stamp]")].map((x) => x.textContent);
    const d = new Date(), p = (n) => String(n).padStart(2, "0");
    const m = t[2].match(/^(\d\d)\.(\d\d)\.(\d{4}) (\d\d):(\d\d):(\d\d) UTC([+−])(\d\d):(\d\d)$/);
    const shown = new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]);
    const off = (m[7] === "−" ? -1 : 1) * (+m[8] * 60 + +m[9]);
    return { stamps: t, nowDriftMs: Math.abs(d - shown), offsetShown: off, offsetClock: -d.getTimezoneOffset(), oneLine: [...document.querySelectorAll("[data-stamp]")].every((x) => x.getBoundingClientRect().height < parseFloat(getComputedStyle(x).fontSize) * 1.3), _p: p(1) };
  });
  delete st._p;
  st.pass = st.nowDriftMs < 1000 && st.offsetShown === st.offsetClock && st.oneLine && /^09\.11\.2018 00:00:00 UTC/.test(st.stamps[0]) && /^09\.10\.2026 00:00:00 UTC/.test(st.stamps[1]);
  report.timestamps = st;
  console.log("stamps", JSON.stringify(st));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/merged-desktop.png` });
  // the pills
  const pills = [];
  for (const name of ["ALL", "PRODUCER", "WRITER", "ENGINEER", "MIXER", "CO-PRODUCER", "ASSISTANT"]) {
    await page.click(`[data-pill='${name}']`);
    await page.waitForTimeout(150);
    pills.push(await page.evaluate((name) => ({
      pill: name, count: +document.querySelector(`[data-pill='${name}'] span`).textContent,
      inline: document.querySelectorAll("[data-inline]").length, rows: document.querySelectorAll("li[data-id]").length,
      pressed: document.querySelector(`[data-pill='${name}']`).getAttribute("aria-checked") === "true",
    }), name));
  }
  await page.click("[data-pill='ALL']"); await page.waitForTimeout(150);
  report.pills = pills;
  report.pillsPass = pills.every((p) => p.count === p.inline && p.count === p.rows && p.pressed);
  console.log("pills", JSON.stringify(pills.map((p) => [p.pill, p.count, p.inline, p.rows])));
  // hover a row: one cover open, inside the page
  const row = await page.evaluate(() => { const li = document.querySelectorAll("li[data-id]")[8]; li.scrollIntoView({ block: "center" }); const r = li.getBoundingClientRect(); return { x: r.left + 200, y: r.top + r.height / 2 }; });
  await page.waitForTimeout(300);
  await page.mouse.move(row.x, row.y); await page.waitForTimeout(500);
  const hov = await page.evaluate(() => {
    const L = document.querySelector("[data-exp-layers] > div"), r = L?.getBoundingClientRect();
    return { open: window.__disco.open(), layer: r ? { left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) } : null, vw: document.documentElement.clientWidth };
  });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/merged-desktop-hover.png` });
  hov.pass = hov.open === 1 && hov.layer && hov.layer.right <= hov.vw;
  report.desktopHover = hov;
  console.log("hover", JSON.stringify(hov));
  await page.close();
}

// ---- phone ----
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite/discography`);
  await page.waitForFunction(() => window.__disco, null, { timeout: 120000 });
  await page.waitForTimeout(1200);
  const base = await page.evaluate(() => {
    const list = document.querySelector("ol[data-src='22']");
    const ta = []; for (let e = list; e; e = e.parentElement) ta.push(getComputedStyle(e).touchAction);
    for (const li of list.querySelectorAll("li")) ta.push(getComputedStyle(li).touchAction);
    return { scrollHeight: document.documentElement.scrollHeight, viewport: innerHeight, touchActionNone: ta.includes("none") };
  });
  // the active row across the list: log each scrollend and each data-active change
  await page.evaluate(() => {
    window.__ends = []; window.__changes = [];
    addEventListener("scrollend", () => window.__ends.push(performance.now()));
    new MutationObserver((ms) => { if (ms.some((m) => m.target.hasAttribute?.("data-active"))) window.__changes.push(performance.now()); }).observe(document.querySelector("ol[data-src='22']"), { attributes: true, subtree: true, attributeFilter: ["data-active"] });
  });
  // bring the list to the middle of the screen first
  await page.evaluate(() => { const l = document.querySelector("ol[data-src='22']"); scrollTo(0, l.getBoundingClientRect().top + scrollY - innerHeight / 2 + 40); });
  await page.waitForTimeout(600);
  const steps = [];
  for (let k = 0; k < 6; k++) {
    await page.evaluate(() => { window.__ends = []; window.__changes = []; });
    const before = await page.evaluate(() => window.__disco.active());
    await page.mouse.move(195, 500);
    await page.mouse.wheel(0, 90 + k * 17);
    await page.waitForTimeout(900);
    const s = await page.evaluate(() => {
      const act = [...document.querySelectorAll("li[data-active]")], a = act[0], r = a?.getBoundingClientRect(), next = a?.nextElementSibling?.getBoundingClientRect();
      const clip = a?.querySelector("[data-clip]")?.getBoundingClientRect();
      const end = window.__ends.at(-1), ch = window.__changes.at(-1);
      return { active: window.__disco.active(), expanded: act.length, coverW: clip && +clip.width.toFixed(1), coverH: clip && +clip.height.toFixed(1), vw40: +(innerWidth * 0.4).toFixed(1), coverInRow: clip && r && clip.top >= r.top - 0.5 && clip.bottom <= r.bottom + 0.5, noOverlap: !next || next.top >= r.bottom - 0.5, ends: window.__ends.length, msAfterScrollend: end != null && ch != null ? +(ch - end).toFixed(1) : null, changes: window.__changes.length };
    });
    s.changed = s.active !== before;
    steps.push(s);
  }
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/merged-phone.png` });
  const top = await page.evaluate(() => { scrollTo(0, 0); return null; });
  await page.waitForTimeout(400);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/merged-phone-top.png` });
  const changed = steps.filter((s) => s.changed);
  report.phone = { ...base, steps, pass: base.scrollHeight > base.viewport && !base.touchActionNone && changed.length >= 3 && changed.every((s) => s.msAfterScrollend != null && s.msAfterScrollend <= 100) && steps.every((s) => s.expanded === 1 && s.coverInRow && s.noOverlap && Math.abs(s.coverW - s.vw40) < 1 && Math.abs(s.coverH - s.vw40) < 1) };
  console.log("phone", JSON.stringify(report.phone));
  await ctx.close();
  void top;
}
await browser.close();
report.pass = report.about.pass && report.timestamps.pass && report.pillsPass && report.desktopHover.pass && report.phone.pass;
console.log("pass", report.pass);
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
