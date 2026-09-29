/**
 * Hover audit: every interactive element in the CRM must visibly answer the cursor.
 *
 *   node crm/scripts/audit-hover.mjs [baseUrl]     (default http://localhost:3100)
 *
 * On the dashboard and in every drawer/modal it groups interactive elements by kind (tag +
 * classes + role), hovers one of each, and compares computed styles before and after:
 * background, colour, transform, shadow, underline, border, opacity, outline and filter on the
 * element itself, its icon (svg), its ::after, and the nearest hover-styled row/card.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3100";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => sessionStorage.setItem("crm-intro-seen", "1"));
await page.goto(`${BASE}/crm/sign-in`);
await page.getByLabel("Email", { exact: true }).fill("e2e@fomo.test");
await page.getByRole("button", { name: /Sign in/ }).click();
await page.waitForURL(/\/crm$/);
await page.waitForSelector(".kpis .card");
await page.evaluate(() => document.querySelectorAll(".card.reveal").forEach((c) => c.classList.add("in")));

const collect = (scope) =>
  page.evaluate((scopeSel) => {
    document.querySelectorAll("[data-hover-audit]").forEach((el) => el.removeAttribute("data-hover-audit"));
    const root = scopeSel ? document.querySelector(scopeSel) : document.querySelector("[data-crm]");
    if (!root) return [];
    const SEL = 'button, a[href], [role="button"], [role="tab"], [role="radio"], select, tr.row, label.btn-accent, label.btn-ghost';
    const inScope = scopeSel ? (el) => root.contains(el) : (el) => !el.closest(".drawer, .modal, .scrim");
    const groups = new Map();
    let i = 0;
    for (const el of root.querySelectorAll(SEL)) {
      if (!inScope(el) || el.closest("[data-crm-intro-overlay]")) continue;
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      if (!r.width || !r.height || st.visibility === "hidden" || st.display === "none" || el.disabled) continue;
      const cls = [...el.classList].filter((c) => !["on", "lit", "live", "past", "in", "today", "focus", "done", "doing"].includes(c) && !c.includes(":") && !/^(min-|max-|w-|h-|px-|py-|p-|m[trblxy]?-|flex|grid|inline|items-|justify-|gap-|text-|font-|rounded|block|truncate|whitespace|ml-|mr-|mt-|mb-|self-|disabled)/.test(c));
      const key = `${el.tagName.toLowerCase()}${cls.length ? "." + cls.sort().join(".") : ""}${el.getAttribute("role") ? `[${el.getAttribute("role")}]` : ""}`;
      // Prefer an inactive instance (a selected tab/radio legitimately looks "hovered" already).
      const active = el.classList.contains("on") || el.getAttribute("aria-selected") === "true" || el.getAttribute("aria-checked") === "true";
      if (groups.has(key)) {
        const g = groups.get(key);
        if (g.active && !active) {
          document.querySelector(`[data-hover-audit="${g.idx}"]`)?.removeAttribute("data-hover-audit");
          el.setAttribute("data-hover-audit", String(g.idx));
          g.active = false;
          g.text = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30);
        }
        continue;
      }
      el.setAttribute("data-hover-audit", String(i));
      groups.set(key, { key, idx: i++, active, text: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30) });
    }
    return [...groups.values()];
  }, scope);

const snapshot = (idx) =>
  page.evaluate((i) => {
    const el = document.querySelector(`[data-hover-audit="${i}"]`);
    if (!el) return null;
    const pick = (node, pseudo) => {
      if (!node) return "";
      const s = getComputedStyle(node, pseudo);
      return [s.backgroundColor, s.color, s.transform, s.boxShadow, s.textDecorationLine, s.borderTopColor, s.borderBottomColor, s.opacity, s.outlineStyle, s.filter, s.backgroundImage.slice(0, 40)].join("|");
    };
    const row = el.closest(".nx-row, .lb-row, .promo .row, .hist, .ev, .task, .person, tr.row, .card, .chip");
    return [pick(el), pick(el, "::after"), pick(el.querySelector("svg")), pick(el.querySelector(".thumb")), pick(el.querySelector("td")), pick(el.querySelector(".mark")), pick(row), pick(row, "::after")].join("§");
  }, idx);

async function audit(label, scope) {
  const items = await collect(scope);
  const missing = [];
  for (const it of items) {
    const el = page.locator(`[data-hover-audit="${it.idx}"]`);
    await page.mouse.move(2, 890); // park the cursor
    await page.waitForTimeout(40);
    await el.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(120); // let scroll-linked hover settle before the baseline
    const before = await snapshot(it.idx);
    await el.hover({ force: true, timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(360);
    const after = await snapshot(it.idx);
    if (before === after) missing.push(`${it.key}  "${it.text}"`);
  }
  console.log(`${missing.length ? "✗" : "✓"} ${label}: ${items.length} kinds of control, ${missing.length} without a hover state`);
  for (const m of missing) console.log(`      ${m}`);
  return missing.length;
}

let missing = 0;
missing += await audit("Dashboard");
await page.getByTestId("candidate-row").first().click();
await page.waitForSelector(".drawer .d-body");
for (const tab of ["Notes", "Interviews", "Assignments", "Resume"]) {
  await page.getByTestId("drawer").getByRole("tab", { name: new RegExp(tab) }).click();
  missing += await audit(`Candidate drawer · ${tab}`, ".drawer");
}
await page.keyboard.press("Escape");
for (const [label, open] of [
  ["Rankings drawer", () => page.locator(".rail nav").getByRole("button", { name: "Rankings & tiers" }).click()],
  ["Areas drawer", () => page.locator(".rail nav").getByRole("button", { name: "Areas & goals" }).click()],
  ["Day log drawer", () => page.getByTestId("open-daylog").click()],
  ["Next up drawer", () => page.getByTestId("next-up-count").click()],
]) {
  await open();
  await page.waitForSelector(".drawer");
  missing += await audit(label, ".drawer");
  await page.keyboard.press("Escape");
}
await page.locator(".rail").getByRole("button", { name: "Settings" }).click();
missing += await audit("Settings modal", ".modal");
await page.keyboard.press("Escape");
await page.getByTestId("assign-task").click();
missing += await audit("Assign modal", ".modal");
await page.keyboard.press("Escape");

await browser.close();
console.log(missing ? `\n${missing} control kind(s) without a hover state` : "\nEvery interactive control has a hover state.");
process.exit(missing ? 1 : 0);
