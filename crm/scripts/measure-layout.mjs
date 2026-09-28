/**
 * Layout verification against docs/crm-prototype-styles.css — by measurement, not screenshots.
 *
 *   node crm/scripts/measure-layout.mjs [baseUrl]      (default http://localhost:3100)
 *
 * Needs a dev server with local sign-in (CRM_FORCE_LOCAL=1, CRM_ALLOWED_EMAILS=e2e@fomo.test).
 * 1. At 1440×900, reads computed styles / getBoundingClientRect for every value in the spec and
 *    prints it next to the prototype's target.
 * 2. At 1440, 1280, 1024, 768 and 390 wide, asserts no element's box extends past its card (and
 *    the rail, the open drawer and the rankings drawer), and that the page never scrolls sideways.
 *    Scroll containers (.sched-wrap, .tbl-wrap, .d-tabs, weekstrip) count as one box: their
 *    content is meant to scroll.
 * Exits non-zero on any mismatch or overflow.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3100";
const EMAIL = "e2e@fomo.test";
const WIDTHS = [1440, 1280, 1024, 768, 390];
let failures = 0;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => {
  try {
    sessionStorage.setItem("crm-intro-seen", "1");
    localStorage.setItem("crm-theme", "light");
  } catch {}
});
await page.goto(`${BASE}/crm/sign-in`);
await page.getByLabel("Work email").fill(EMAIL);
await page.getByRole("button", { name: /Sign in/ }).click();
await page.waitForURL(/\/crm$/);
await page.emulateMedia({ reducedMotion: "reduce" }); // reveal/pulse animations settle instantly
await page.reload();
await page.waitForSelector(".kpis .card");

// ─── 1. Values vs the prototype ────────────────────────────────────────────

const px = (v) => Math.round(parseFloat(v) * 100) / 100;
const m = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const cs = (s) => getComputedStyle(q(s));
  const r = (s) => q(s).getBoundingClientRect();
  const cols = (s) => cs(s).gridTemplateColumns.split(" ").map(parseFloat);
  const crm = getComputedStyle(q("[data-crm]"));
  return {
    appPadTop: cs(".app").paddingTop,
    appPadLeft: cs(".app").paddingLeft,
    railWidth: r(".rail").width,
    railGap: r(".content").left - r(".rail").right,
    appColGap: cs(".app").columnGap,
    cardRadius: cs(".kpis .card:nth-child(2)").borderTopLeftRadius,
    cardPadTB: cs(".kpis .card:nth-child(2)").paddingTop,
    cardPadLR: cs(".kpis .card:nth-child(2)").paddingLeft,
    contentGap: cs(".content").rowGap,
    kpiGap: cs(".kpis").columnGap,
    kpiCols: cols(".kpis"),
    midCols: cols(".mid"),
    midGap: cs(".mid").columnGap,
    baseSize: crm.fontSize,
    baseLine: crm.lineHeight,
    h2Size: cs(".card h2").fontSize,
    h2Weight: cs(".card h2").fontWeight,
    kpiNumSize: cs(".kpi .big").fontSize,
    kpiNumWeight: cs(".kpi .big").fontWeight,
    kpiNumTrack: cs(".kpi .big").letterSpacing,
    vw: window.innerWidth,
    tableMinWidth: cs("table").minWidth,
    tdPadTop: cs("td").paddingTop,
    tdPadLeft: cs("td").paddingLeft,
    tdSize: cs("td").fontSize,
    axisCol: cols(".axis")[0],
    axisSize: cs(".axis").fontSize,
    srowCol: cols(".srow")[0],
    laneH: r(".lane").height,
    blkTop: cs(".blk").top,
    blkH: r(".blk").height,
    blkRadius: cs(".blk").borderTopLeftRadius,
  };
});

await page.getByTestId("candidate-row").first().click();
await page.waitForSelector(".drawer .d-body");
const d = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  return {
    drawerW: q(".drawer").getBoundingClientRect().width,
    attrCol: parseFloat(getComputedStyle(q(".d-body")).gridTemplateColumns.split(" ")[0]),
    attrsW: q(".d-attrs").getBoundingClientRect().width,
  };
});
await page.keyboard.press("Escape");

const kpiUnit = m.kpiCols[0];
const rows = [
  ["Page padding (top / sides)", `${m.appPadTop} / ${m.appPadLeft}`, "28px / 24px", m.appPadTop === "28px" && m.appPadLeft === "24px"],
  ["Rail width", `${px(m.railWidth)}px`, "72px", Math.abs(m.railWidth - 72) < 0.5],
  ["Rail → content gap", `${px(m.railGap)}px (column-gap ${m.appColGap})`, "18px", Math.abs(m.railGap - 18) < 0.5],
  ["Card radius", m.cardRadius, "22px", m.cardRadius === "22px"],
  ["Card padding", `${m.cardPadTB} ${m.cardPadLR}`, "22px 24px", m.cardPadTB === "22px" && m.cardPadLR === "24px"],
  ["Gap between cards (content / KPI row)", `${m.contentGap} / ${m.kpiGap}`, "14px / 14px", m.contentGap === "14px" && m.kpiGap === "14px"],
  [
    "KPI grid ratios",
    m.kpiCols.map((c) => (c / kpiUnit).toFixed(3)).join(" : ") + `  (${m.kpiCols.map(px).join("px ")}px)`,
    "1 : 1.45 : 1.35 : 1",
    [1, 1.45, 1.35, 1].every((t, i) => Math.abs(m.kpiCols[i] / kpiUnit - t) < 0.005),
  ],
  ["Schedule + activity grid", `${m.midCols.map(px).join("px ")}px (gap ${m.midGap})`, "1fr 372px", Math.abs(m.midCols[1] - 372) < 0.5],
  ["Base type", `${m.baseSize} / ${m.baseLine}`, "14px / 1.4 (19.6px)", m.baseSize === "14px" && Math.abs(parseFloat(m.baseLine) - 19.6) < 0.05],
  ["Card title", `${m.h2Size} ${m.h2Weight}`, "17px 700", m.h2Size === "17px" && m.h2Weight === "700"],
  [
    "KPI numeral",
    `${m.kpiNumSize} ${m.kpiNumWeight} ${m.kpiNumTrack}`,
    `clamp(40px,3.4vw,52px) = ${px(Math.min(52, Math.max(40, m.vw * 0.034)))}px 700 -0.03em (${px(-0.03 * Math.min(52, Math.max(40, m.vw * 0.034)))}px)`,
    Math.abs(parseFloat(m.kpiNumSize) - Math.min(52, Math.max(40, m.vw * 0.034))) < 0.05 &&
      m.kpiNumWeight === "700" &&
      Math.abs(parseFloat(m.kpiNumTrack) + 0.03 * parseFloat(m.kpiNumSize)) < 0.02,
  ],
  ["Table min-width", m.tableMinWidth, "980px", m.tableMinWidth === "980px"],
  ["Table cell padding / size", `${m.tdPadTop} ${m.tdPadLeft} / ${m.tdSize}`, "11px 10px / 13px", m.tdPadTop === "11px" && m.tdPadLeft === "10px" && m.tdSize === "13px"],
  ["Drawer width", `${px(d.drawerW)}px`, "760px", Math.abs(d.drawerW - 760) < 0.5],
  ["Drawer attribute column", `${px(d.attrCol)}px (box ${px(d.attrsW)}px)`, "290px", Math.abs(d.attrCol - 290) < 0.5],
  ["Schedule label column (axis / row)", `${px(m.axisCol)}px / ${px(m.srowCol)}px`, "104px / 104px", Math.abs(m.axisCol - 104) < 0.5 && Math.abs(m.srowCol - 104) < 0.5],
  ["Schedule lane height", `${px(m.laneH)}px`, "66px", Math.abs(m.laneH - 66) < 0.5],
  ["Schedule block top / height / radius", `${m.blkTop} / ${px(m.blkH)}px / ${m.blkRadius}`, "8px / 50px / 12px", m.blkTop === "8px" && Math.abs(m.blkH - 50) < 0.5 && m.blkRadius === "12px"],
  ["Schedule axis labels", m.axisSize, "12px", m.axisSize === "12px"],
];
console.log("\n1. Measured at 1440×900 vs docs/crm-prototype-styles.css\n");
const w1 = Math.max(...rows.map((r) => r[0].length));
const w2 = Math.max(...rows.map((r) => r[1].length));
for (const [label, got, want, ok] of rows) {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label.padEnd(w1)}  ${got.padEnd(w2)}  target ${want}`);
}

// ─── 2. Nothing outside its card, at five widths ───────────────────────────

const overflowScan = () =>
  page.evaluate(() => {
    const SCROLLERS = ".sched-wrap, .tbl-wrap, .d-tabs, .weekstrip, .d-body, .d-main, .modal .box";
    const out = [];
    const check = (container, label) => {
      const c = container.getBoundingClientRect();
      if (!c.width || !c.height) return;
      const walk = (el) => {
        for (const child of el.children) {
          const st = getComputedStyle(child);
          if (st.display === "none" || st.visibility === "hidden" || st.position === "fixed") continue;
          const r = child.getBoundingClientRect();
          if (r.width && r.height && (r.left < c.left - 1 || r.right > c.right + 1)) {
            const name = child.className && typeof child.className === "string" ? `.${child.className.trim().split(/\s+/).slice(0, 2).join(".")}` : child.tagName.toLowerCase();
            out.push(`${label}: <${child.tagName.toLowerCase()}${name ? ` ${name}` : ""}> "${(child.textContent || "").trim().slice(0, 32)}" spans ${Math.round(r.left)}–${Math.round(r.right)} outside ${Math.round(c.left)}–${Math.round(c.right)}`);
          }
          // Text that spills without clipping (nowrap text wider than its box, overflow visible).
          if (child.children.length === 0 && child.scrollWidth > child.clientWidth + 1 && st.overflowX === "visible" && st.whiteSpace === "nowrap" && child.clientWidth > 0) {
            out.push(`${label}: text spills from <${child.tagName.toLowerCase()}> "${(child.textContent || "").trim().slice(0, 32)}"`);
          }
          // A single word broken across lines (e.g. "8." / "0" or "edi" / "t") wraps, so the bounds
          // test above can't see it: count the text's own line boxes.
          const words = (child.textContent || "").trim();
          if (child.children.length === 0 && words && !/\s/.test(words) && child.firstChild?.nodeType === 3) {
            const range = document.createRange();
            range.selectNodeContents(child);
            const tops = new Set([...range.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top)));
            if (tops.size > 1) out.push(`${label}: "${words}" breaks across ${tops.size} lines`);
          }
          if (!child.matches(SCROLLERS)) walk(child);
        }
      };
      walk(container);
    };
    document.querySelectorAll(".content .card, .content > .top").forEach((card, i) => check(card, card.dataset.testid || card.querySelector("h2")?.textContent?.trim() || `card ${i}`));
    const rail = document.querySelector(".rail");
    if (rail) check(rail, "rail");
    document.querySelectorAll(".drawer").forEach((dr) => check(dr, "drawer"));
    const sw = document.scrollingElement.scrollWidth;
    if (sw > window.innerWidth + 1) out.push(`page scrolls sideways: scrollWidth ${sw} > ${window.innerWidth}`);
    return out;
  });

console.log("\n2. Overflow scan (cards, rail, candidate drawer, rankings drawer)\n");
for (const w of WIDTHS) {
  await page.setViewportSize({ width: w, height: w === 390 ? 844 : w === 768 ? 1024 : 900 });
  await page.waitForTimeout(250);
  const problems = [...(await overflowScan())];
  await page.getByTestId("candidate-row").first().click();
  await page.waitForSelector(".drawer .d-body");
  problems.push(...(await overflowScan()).filter((p) => p.startsWith("drawer")).map((p) => `candidate ${p}`));
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open rankings & tiers" }).click();
  await page.waitForSelector('[data-testid="panel-rankings"]');
  problems.push(...(await overflowScan()).filter((p) => p.startsWith("drawer")).map((p) => `rankings ${p}`));
  await page.keyboard.press("Escape");
  const cards = await page.locator(".content .card").count();
  if (problems.length) failures += problems.length;
  console.log(`${problems.length ? "✗" : "✓"} ${String(w).padStart(4)}px  ${cards} cards + rail + 2 drawers checked, ${problems.length} overflow${problems.length === 1 ? "" : "s"}`);
  for (const p of problems.slice(0, 12)) console.log(`      ${p}`);
  if (problems.length > 12) console.log(`      … ${problems.length - 12} more`);
}

await browser.close();
console.log(failures ? `\n${failures} problem(s)` : "\nAll values match the prototype; nothing leaves its card at any width.");
process.exit(failures ? 1 : 0);
