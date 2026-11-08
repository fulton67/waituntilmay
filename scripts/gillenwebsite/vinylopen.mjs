// Superseded 2026-11-08 by recordview.mjs: the open view is now the object alone (no panel type, no column).
// The open record view (VinylView.tsx), at 1440 x 900 DPR 2 and 390 x 844 DPR 3 (touch, 4x CPU throttle):
//  - the caption block under the drum: there before opening, gone while open, back after the close
//  - the gatefold panel's type (__vinyl.panel(): troika SDF text): each block's text, face file, size in metres and
//    its em on screen in the open pose (CSS px), against the header's 12 px: the name 3x = 36 (or capped by the
//    panel's width), his line half the name (1.5x the 12 px interface = 18); the side column's elements, computed
//  - names: every artist and collaborator in the discography looked for in all the text the open view draws (the
//    side column, the panel, the record's label); only DYLAN NEUSTADTER may be there. No [CLOSE] button.
//  - the slide: __vinyl.travel() (the record's travel, its near edge past the pocket's mouth when out), and the
//    trace: out to 1 on opening, spinning only when fully out, back to 0 on closing
//  - close targets: five points (the record, the sleeve's front cover, the panel's type, the white ground past the
//    record, the dimmed Rolodex at the bottom left; on phones the side column's name instead of the ground right
//    of the record), each opened afresh and clicked (a tap on phones): the view runs the full close (the log's
//    "close", 350 ms) and the sleeve is back on the ring (rig.lifted -1). Then a nav link while open: the page changes.
//  - fps of each open and close from the view's own frame log
//   node scripts/gillenwebsite/vinylopen.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/vinylopen-report.json";
const disco = JSON.parse(await fs.readFile("lib/gillenwebsite/discography.json", "utf8")).releases;
const sleeves = JSON.parse(await fs.readFile("lib/gillenwebsite/sleeves.json", "utf8"));
const NAMES = [...new Set([...disco.flatMap((r) => r.artist.split(/,|&/).map((x) => x.trim())), ...Object.values(sleeves).flatMap((s) => (s.collaborators ?? []).map((c) => c.name))])]
  .filter((n) => n && !/neustadter/i.test(n) && n.length > 2);
const PROFILES = [
  { name: "desktop", w: 1440, h: 900, dpr: 2, mobile: false, throttle: 1, fpsMin: 55 },
  { name: "phone", w: 390, h: 844, dpr: 3, mobile: true, throttle: 4, fpsMin: 45 },
];
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"] });
const report = { base: BASE, at: new Date().toISOString(), namesChecked: NAMES.length, profiles: {} };
const until = async (page, f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(f)) return true; await page.waitForTimeout(25); } return false; };
const caption = (page) => page.evaluate(() => { const c = document.querySelector("[data-src='17'][role=button]"); return !!c && c.getBoundingClientRect().height > 0 && getComputedStyle(c).visibility !== "hidden"; });

for (const p of PROFILES) {
  const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, isMobile: p.mobile, hasTouch: p.mobile });
  await ctx.addInitScript(() => { try { localStorage.setItem("gillenwebsite:guide-seen", "1"); } catch {} });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`${BASE}/gillenwebsite`);
  await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.allSmall && window.__vinyl, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  if (p.throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.throttle });
  const tap = async (x, y) => { if (p.mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
  const open = async () => {
    await page.evaluate(() => window.__site.openFront());
    return until(page, () => window.__vinyl.state() === "open");
  };
  const out = { captionBefore: await caption(page) };
  await open();
  await page.waitForTimeout(400);
  out.captionWhileOpen = await caption(page);
  out.panel = await page.evaluate(() => window.__vinyl.panel());
  out.side = await page.evaluate(() => [...document.querySelectorAll("[role=dialog] *")].filter((e) => e.children.length === 0 && e.textContent.trim()).map((e) => { const c = getComputedStyle(e); return { text: e.textContent.trim(), px: parseFloat(c.fontSize), family: c.fontFamily.split(",")[0].replace(/"/g, ""), stretch: c.fontStretch, weight: c.fontWeight }; }));
  out.headerNamePx = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("nav a")).fontSize));
  out.closeButton = await page.evaluate(() => [...document.querySelectorAll("button")].some((b) => /close/i.test(b.textContent)));
  out.labelText = await page.evaluate(() => window.__vinyl.labelText());
  const allText = [out.panel.map((x) => x.text).join(" "), out.side.map((x) => x.text).join(" "), out.labelText].join(" ").replace(/\s+/g, " ");
  out.namesRendered = ["DYLAN NEUSTADTER"].filter((n) => allText.includes(n)).concat(NAMES.filter((n) => new RegExp(`(^|[^\\w])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\w])`, "i").test(allText)));
  out.travel = await page.evaluate(() => window.__vinyl.travel());
  // close targets
  const points = await page.evaluate((mobile) => {
    const v = window.__vinyl, d = document.querySelector("[role=dialog]")?.querySelector("h2")?.getBoundingClientRect();
    return [
      ["record", v.discPoint("vinyl")],
      ["sleeve (front cover)", v.coverPoint()],
      ["panel text", v.panelPoint()],
      mobile ? ["side column name", d && { x: d.left + 20, y: d.top + d.height / 2 }] : ["white ground", { x: innerWidth - 440 - 30, y: innerHeight - 30 }],
      ["dimmed Rolodex", { x: Math.round(innerWidth * 0.1), y: innerHeight - 120 }],
    ];
  }, p.mobile);
  out.closeTargets = [];
  for (const [what, at] of points) {
    if ((await page.evaluate(() => window.__vinyl.state())) !== "open") await open();
    await page.waitForTimeout(300);
    const pt = what === "panel text" ? await page.evaluate(() => window.__vinyl.panelPoint()) : what === "record" ? await page.evaluate(() => window.__vinyl.discPoint("vinyl")) : what === "sleeve (front cover)" ? await page.evaluate(() => window.__vinyl.coverPoint()) : at;
    const n0 = await page.evaluate(() => window.__vinyl.log().length);
    await tap(pt.x, pt.y);
    const closed = await until(page, () => window.__vinyl.state() === "closed" && window.__rolodex.rig.lifted === -1, 4000);
    const last = await page.evaluate((n0) => window.__vinyl.log().slice(n0), n0);
    out.closeTargets.push({ what, x: Math.round(pt.x), y: Math.round(pt.y), closed, ran: last.map((l) => `${l.dir} ${l.ms}ms ${l.fps}fps`).join(", "), backOnRing: closed });
    await page.waitForTimeout(400);
  }
  out.captionAfterClose = await caption(page);
  // the trace of the last open and close
  const tr = await page.evaluate(() => window.__vinyl.trace());
  const opens = tr.filter((x) => x.kind === "open"), closes = tr.filter((x) => x.kind === "close");
  out.slide = { openMaxS: Math.max(...opens.map((x) => x.s)), closeEndS: closes.at(-1)?.s, spinNotOut: (await page.evaluate(() => window.__vinyl.spin())).notOut };
  const log = await page.evaluate(() => window.__vinyl.log());
  out.fps = { open: Math.min(...log.filter((l) => l.dir === "open").map((l) => l.fps)), close: Math.min(...log.filter((l) => l.dir === "close").map((l) => l.fps)), openMs: [...new Set(log.filter((l) => l.dir === "open").map((l) => l.ms))], closeMs: [...new Set(log.filter((l) => l.dir === "close").map((l) => l.ms))] };
  // a nav link while open: it navigates
  await open();
  await page.waitForTimeout(300);
  const nav = await page.evaluate(() => { const a = [...document.querySelectorAll("nav a")].find((x) => x.textContent.trim() === "DISCOGRAPHY").getBoundingClientRect(); return { x: a.left + a.width / 2, y: a.top + a.height / 2 }; });
  await tap(nav.x, nav.y);
  await page.waitForURL(/discography/, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  out.navLink = { url: new URL(page.url()).pathname, viewState: await page.evaluate(() => window.__vinyl?.state()) };
  if (p.throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const name = out.panel.find((x) => /NEUSTADTER/.test(x.text)), line = out.panel.filter((x) => x !== name);
  out.pass = out.captionBefore && !out.captionWhileOpen && out.captionAfterClose && !out.closeButton
    && out.namesRendered.join() === "DYLAN NEUSTADTER" && name && (name.capped || Math.abs(name.screenEmPx - 3 * out.headerNamePx) < 1) && line.length === 1 && Math.abs(line[0].fontSizeM / name.fontSizeM - 0.5) < 0.01
    && out.side.every((x) => x.family === "Archivo" && x.weight === "400" && (/NEUSTADTER/.test(x.text) ? x.px === 36 : x.px === 18))
    && out.travel.clearMm > 0 && out.slide.openMaxS === 1 && out.slide.closeEndS === 0 && out.slide.spinNotOut === 0
    && out.closeTargets.every((c) => c.closed && /close/.test(c.ran)) && out.navLink.url.endsWith("/discography")
    && out.fps.open >= p.fpsMin && out.fps.close >= p.fpsMin;
  report.profiles[p.name] = out;
  console.log(p.name, JSON.stringify(out));
  await ctx.close();
}
await browser.close();
report.pass = Object.values(report.profiles).every((x) => x.pass);
console.log("pass", report.pass);
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
