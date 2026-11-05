// /gillenwebsite/discography. Desktop 1440 x 900: each role pill's count against the rows it leaves; hovering a row
// underlines it and opens exactly one cover, inside the page; a click opens the record view. Phone 390 x 844
// (touch, DPR 3), the original About index (AboutIndex.tsx): no arrow marker and no footer index; nothing on the page
// or its ancestors sets touch-action, overscroll-behavior or scroll-snap; ten
// 400 px touch swipes up (CDP touch events, held before lifting so there is no fling), scrollY before and after each;
// (Input.synthesizeScrollGesture moves even a plain page 0 px in this emulation, so it is not used)
// after each one exactly one row active (underlined, the one nearest the middle) and exactly one cover shown in the
// corner square. A swipe that moves the page less than 300 px is reported with the element under the finger.
//   node scripts/gillenwebsite/disco.mjs [base-url] [--out file] [--shots dir]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/disco-report.json";
const SHOTS = argv.includes("--shots") ? argv[argv.indexOf("--shots") + 1] : null;
const report = { base: BASE, at: new Date().toISOString() };
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0"] });

// ---- desktop ----
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/gillenwebsite/discography`);
  await page.waitForFunction(() => window.__disco && window.__vinyl, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  const extras = await page.evaluate(() => ({ inline: document.querySelectorAll("[data-inline]").length, stamps: document.querySelectorAll("[data-stamp]").length }));
  const pills = [];
  for (const name of ["ALL", "PRODUCER", "WRITER", "ENGINEER", "MIXER", "CO-PRODUCER", "ASSISTANT"]) {
    await page.click(`[data-pill='${name}']`);
    await page.waitForTimeout(150);
    pills.push(await page.evaluate((name) => ({ pill: name, count: +document.querySelector(`[data-pill='${name}'] span`).textContent, rows: document.querySelectorAll("li[data-id]").length }), name));
  }
  await page.click("[data-pill='ALL']"); await page.waitForTimeout(150);
  report.pills = pills;
  report.pillsPass = pills.every((p) => p.count === p.rows) && pills[0].count === 36;
  const row = await page.evaluate(() => { const li = document.querySelectorAll("li[data-id]")[8]; li.scrollIntoView({ block: "center" }); const r = li.getBoundingClientRect(); return { x: r.left + 300, y: r.top + r.height / 2 }; });
  await page.waitForTimeout(300);
  await page.mouse.move(row.x, row.y); await page.waitForTimeout(500);
  const hov = await page.evaluate(() => {
    const L = document.querySelector("[data-exp-layers] > div"), r = L?.getBoundingClientRect(), li = document.querySelectorAll("li[data-id]")[8];
    return { open: window.__disco.open(), underline: getComputedStyle(li.querySelector("[class*=indexTitleText]")).textDecorationColor, layer: r ? { left: Math.round(r.left), right: Math.round(r.right) } : null, vw: document.documentElement.clientWidth };
  });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/disco-desktop.png` });
  await page.mouse.click(row.x, row.y); await page.waitForTimeout(1000);
  hov.opens = await page.evaluate(() => window.__vinyl.state());
  hov.pass = hov.open === 1 && hov.layer && hov.layer.right <= hov.vw && hov.underline === "rgb(0, 0, 0)" && hov.opens === "open";
  report.desktop = { ...extras, ...hov, pass: hov.pass && extras.inline === 0 && extras.stamps === 0 };
  console.log("desktop", JSON.stringify(report.pills.map((p) => [p.pill, p.count, p.rows])), JSON.stringify(report.desktop));
  await page.close();
}

// ---- phone ----
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/gillenwebsite/discography`);
  await page.waitForFunction(() => document.querySelector("a[data-entry]"), null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  const cdp = await ctx.newCDPSession(page);
  const audit = await page.evaluate(() => {
    const bad = [];
    for (const e of [document.documentElement, document.body, ...document.querySelectorAll("main *, main")]) {
      const cs = getComputedStyle(e);
      if (cs.touchAction !== "auto" || cs.overscrollBehaviorY !== "auto" || cs.scrollSnapType !== "none") bad.push({ el: e.tagName + "." + e.className, touchAction: cs.touchAction, overscroll: cs.overscrollBehaviorY, snap: cs.scrollSnapType });
    }
    return { bad, scrollHeight: document.documentElement.scrollHeight, viewport: innerHeight, desktopOnly: { arrows: document.querySelectorAll("[data-marker] line").length, footerIndex: document.querySelectorAll("[data-footer-index]").length } };
  });
  const swipes = [];
  const X = 195, Y = 700;
  for (let k = 0; k < 10; k++) {
    const y0 = await page.evaluate(() => scrollY);
    const under = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + "." + (e.className?.baseVal ?? e.className) : null; }, [X, Y]);
    // a finger drawn 400 px up over 320 ms, held 100 ms (no fling), then lifted
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: X, y: Y, id: 1 }] });
    for (let m = 1; m <= 20; m++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: X, y: Y - m * 20, id: 1 }] }); await page.waitForTimeout(16); }
    await page.waitForTimeout(100);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(700);
    // the original About index: the active row is the one with indexOn (underlined); its cover is the one visible
    // in the corner square; the active row is the one nearest the middle of the screen
    const s = await page.evaluate(() => {
      const rows = [...document.querySelectorAll("a[data-entry]")], act = rows.filter((a) => /indexOn/.test(a.className));
      const mid = innerHeight / 2, near = rows.reduce((b, a) => { const r = a.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - mid); return d < b.d ? { a, d } : b; }, { a: null, d: Infinity }).a;
      const shown = [...document.querySelectorAll("[class*=indexCover] img")].filter((i) => i.style.visibility === "visible");
      const sq = document.querySelector("[class*=indexCover]")?.getBoundingClientRect();
      return { scrollY, active: act[0]?.querySelector("[data-title]")?.textContent.slice(0, 30), activeRows: act.length, underlined: act[0] ? getComputedStyle(act[0].querySelector("[class*=indexTitleText]")).textDecorationLine : null, nearestIsActive: near === act[0], coversShown: shown.length, square: sq ? [Math.round(sq.width), Math.round(sq.height), Math.round(sq.right), Math.round(sq.bottom)] : null };
    });
    swipes.push({ k: k + 1, from: y0, moved: +(s.scrollY - y0).toFixed(1), under, ...s });
    // the page's end: back to the top to keep swiping through the list
    if (s.scrollY + 844 >= audit.scrollHeight - 450) { await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(400); }
  }
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/disco-phone.png` });
  const short = swipes.filter((s) => s.moved < 300);
  report.phone = {
    ...audit, swipes, consumed: short.map((s) => ({ swipe: s.k, moved: s.moved, under: s.under })),
    pass: audit.bad.length === 0 && audit.scrollHeight > audit.viewport && short.length === 0
      && swipes.every((s) => s.activeRows === 1 && s.coversShown === 1 && s.underlined === "underline" && s.nearestIsActive)
      && audit.desktopOnly.arrows === 0 && audit.desktopOnly.footerIndex === 0,
  };
  console.log("phone", JSON.stringify({ bad: audit.bad, scrollHeight: audit.scrollHeight }));
  for (const s of swipes) console.log(" ", JSON.stringify(s));
  await ctx.close();
}
await browser.close();
report.pass = report.pillsPass && report.desktop.pass && report.phone.pass;
console.log("pass", report.pass);
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
