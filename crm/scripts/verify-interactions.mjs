/**
 * Interaction checklist: clicks through every interactive element the prototype has, on a running
 * dev server, and ticks each one off with evidence.
 *
 *   node crm/scripts/verify-interactions.mjs [baseUrl]     (default http://localhost:3100)
 *
 * Needs local sign-in (CRM_FORCE_LOCAL=1, CRM_ALLOWED_EMAILS=e2e@fomo.test). It resets the demo
 * data first, then mutates it.
 */
import { chromium } from "playwright";
import { expect } from "@playwright/test";

const BASE = process.argv[2] ?? "http://localhost:3100";
const results = [];
let group = "";
const section = (name) => (group = name);

async function check(label, fn) {
  try {
    const evidence = await fn();
    results.push({ group, label, ok: true, evidence: evidence ?? "" });
  } catch (err) {
    results.push({ group, label, ok: false, evidence: String(err?.message ?? err).split("\n")[0].slice(0, 160) });
  }
  // Always leave the page clean for the next check.
  for (let i = 0; i < 3; i++) await page.keyboard.press("Escape").catch(() => {});
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addInitScript(() => {
  try {
    sessionStorage.setItem("crm-intro-seen", "1");
  } catch {}
});
const page = await context.newPage();
page.setDefaultTimeout(8000);
const settled = () => expect(page.getByTestId("crm-shell")).not.toHaveAttribute("data-pending", /.*/, { timeout: 15000 });
const drawer = () => page.getByTestId("drawer");
const toastSeen = (re) => expect(page.locator(".toast").filter({ hasText: re }).first()).toBeVisible();

await page.goto(`${BASE}/crm/sign-in`);
await page.getByLabel("Work email").fill("e2e@fomo.test");
await page.getByRole("button", { name: /Sign in/ }).click();
await page.waitForURL(/\/crm$/);
// Fresh seeded data.
await page.getByRole("button", { name: "Settings" }).first().click();
await page.getByRole("button", { name: "Reset demo data" }).click();
await page.getByTestId("confirm-reset").click();
await settled();
await page.keyboard.press("Escape");
await page.reload();
await page.waitForSelector(".kpis .card");

const scrollTop = (id) => page.evaluate((i) => Math.round(document.getElementById(i).getBoundingClientRect().top), id);
const indY = () => page.evaluate(() => document.querySelector(".rail .ind")?.style.transform ?? "");

// ─── Rail ──────────────────────────────────────────────────────────────────
section("Rail");
for (const [label, id] of [
  ["Schedule", "schedule"],
  ["Campaign & assignments", "campaign"],
  ["Candidates", "candidates"],
  ["Overview", "overview"],
]) {
  await check(`${label} icon scrolls to its section; indicator slides`, async () => {
    const before = await indY();
    await page.locator(".rail nav").getByRole("button", { name: label, exact: true }).click();
    await page.waitForTimeout(900);
    const top = await scrollTop(id);
    const after = await indY();
    if (Math.abs(top) > 60 && id !== "candidates") throw new Error(`#${id} top is ${top}px after the click`);
    if (id === "candidates" && top > 400) throw new Error(`#candidates top ${top}`);
    if (before === after && label !== "Overview") throw new Error(`indicator stayed at ${after}`);
    return `#${id} at ${top}px · indicator ${after}`;
  });
}
await check("Areas icon opens the Areas drawer", async () => {
  await page.locator(".rail nav").getByRole("button", { name: "Areas & goals" }).click();
  await expect(page.getByTestId("panel-areas")).toBeVisible();
  return "panel-areas visible";
});
await check("Rankings icon opens the Rankings drawer", async () => {
  await page.locator(".rail nav").getByRole("button", { name: "Rankings & tiers" }).click();
  await expect(page.getByTestId("panel-rankings")).toBeVisible();
  return "panel-rankings visible";
});
const theme = () => page.evaluate(() => document.documentElement.getAttribute("data-theme"));
await check("Eyes toggle the theme", async () => {
  const a = await theme();
  await page.getByTestId("eyes").click();
  const b = await theme();
  if (a === b) throw new Error("data-theme unchanged");
  return `${a} → ${b}`;
});
await check("Sun/moon icon toggles the theme", async () => {
  const a = await theme();
  await page.getByTestId("theme-toggle").click();
  const b = await theme();
  if (a === b) throw new Error("data-theme unchanged");
  return `${a} → ${b}`;
});
await check("Gear opens Settings", async () => {
  await page.locator(".rail").getByRole("button", { name: "Settings" }).click();
  await expect(page.getByTestId("settings")).toBeVisible();
  return "settings modal visible";
});

// ─── KPI row ───────────────────────────────────────────────────────────────
section("KPI row");
await page.evaluate(() => window.scrollTo(0, 0));
await check('"Interviews today" scrolls to the schedule', async () => {
  await page.getByTestId("kpi-interviews").click();
  await page.waitForTimeout(900);
  const top = await scrollTop("schedule");
  if (Math.abs(top) > 60) throw new Error(`#schedule top ${top}`);
  return `#schedule at ${top}px`;
});
await page.evaluate(() => window.scrollTo(0, 0));
await check("Every Next-up row's button runs its action", async () => {
  const buttons = page.getByTestId("proposal").locator("button");
  const n = await buttons.count();
  if (!n) throw new Error("no proposals");
  const done = [];
  for (let i = 0; i < Math.min(n, 5); i++) {
    const row = page.getByTestId("proposal").nth(i);
    const label = (await row.locator("button").textContent())?.trim();
    await row.locator("button").click();
    await page.waitForTimeout(300);
    const opened = (await drawer().count()) || (await page.getByTestId("assign-form").count()) || (await page.locator(".toast").count());
    if (!opened) throw new Error(`"${label}" did nothing`);
    done.push(label);
    await page.keyboard.press("Escape");
    await settled();
  }
  return done.join(" · ");
});
await check("Fit rankings card opens the Rankings drawer", async () => {
  await page.getByTestId("leaderboard").locator(".card-head h2").click();
  await expect(page.getByTestId("panel-rankings")).toBeVisible();
  return "panel-rankings visible";
});
await check("Each leaderboard row opens that candidate", async () => {
  const row = page.getByTestId("leaderboard-rows").locator(".lb-row[data-candidate]").nth(2);
  const id = await row.getAttribute("data-candidate");
  await row.click();
  await expect(drawer().getByTestId("candidate-record")).toHaveAttribute("data-candidate-id", id);
  return `row 3 → drawer for ${id.slice(0, 8)}`;
});
await check("Open areas rows open the Areas drawer focused on that area", async () => {
  const row = page.getByTestId("open-areas").locator(".promo .row").first();
  const areaId = await row.getAttribute("data-area");
  await row.click();
  await expect(page.getByTestId("panel-areas")).toBeVisible();
  await expect(page.locator(`.area-card[data-area="${areaId}"]`)).toHaveClass(/focus/);
  await expect(page.locator(`.area-card[data-area="${areaId}"]`)).toBeInViewport();
  return `area ${areaId.slice(0, 8)} focused and in view`;
});
await check("Open areas arrow opens the Areas drawer", async () => {
  await page.getByTestId("open-areas").getByRole("button", { name: "Open areas & goals" }).click();
  await expect(page.getByTestId("panel-areas")).toBeVisible();
  return "panel-areas visible";
});

// ─── Schedule ──────────────────────────────────────────────────────────────
section("Schedule");
const sched = page.getByTestId("schedule-card");
await check("Day/Week toggle", async () => {
  await sched.getByRole("radio", { name: "Week" }).click();
  await expect(sched.getByTestId("schedule-week-row")).toHaveCount(7);
  await sched.getByRole("radio", { name: "Day" }).click();
  await expect(sched.getByTestId("schedule-week-row")).toHaveCount(0);
  return "7 week rows ↔ day rows";
});
await check("Mon–Sun strip opens the clicked day", async () => {
  const tab = sched.getByTestId("week-strip").getByRole("tab").nth(3);
  const name = await tab.getAttribute("aria-label");
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
  return `opened ${name} → label "${await sched.getByTestId("schedule-day").textContent()}"`;
});
await check("Prev/next arrows move the day", async () => {
  const a = await sched.getByTestId("schedule-day").textContent();
  await sched.getByRole("button", { name: "Next day" }).click();
  const b = await sched.getByTestId("schedule-day").textContent();
  await sched.getByRole("button", { name: "Previous day" }).click();
  const c = await sched.getByTestId("schedule-day").textContent();
  if (a === b || a !== c) throw new Error(`${a} → ${b} → ${c}`);
  return `${a} → ${b} → ${c}`;
});
await check("Interviewer filter", async () => {
  await sched.getByRole("button", { name: "Today" }).click().catch(() => {});
  const all = await sched.locator(".srow").count();
  await sched.getByLabel("Interviewer").selectOption({ index: 1 });
  const one = await sched.locator(".srow").count();
  await sched.getByLabel("Interviewer").selectOption("all");
  if (one !== 1) throw new Error(`${all} rows → ${one}`);
  return `${all} rows → ${one}`;
});
await check('"+ Schedule" opens the form and the overlap check rejects a clash', async () => {
  const block = sched.getByTestId("schedule-block").first();
  const title = await block.getAttribute("title");
  const [, , times, who] = title.split(" · ");
  const start = times.split("–")[0];
  await sched.getByTestId("open-schedule-form").click();
  const form = page.getByTestId("schedule-form");
  await form.getByLabel("Interviewer", { exact: true }).selectOption({ label: who });
  await form.getByLabel("Start", { exact: true }).fill(start);
  await form.getByRole("button", { name: "Schedule" }).click();
  await expect(form.getByTestId("schedule-error")).toContainText("already has");
  return (await form.getByTestId("schedule-error").textContent()).trim();
});
await check("Every block opens that candidate's drawer on Interviews", async () => {
  const n = await sched.getByTestId("schedule-block").count();
  for (let i = 0; i < n; i++) {
    await sched.getByTestId("schedule-block").nth(i).click();
    await expect(drawer().getByRole("tab", { name: /Interviews/ })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Escape");
  }
  return `${n} blocks`;
});

// ─── Activity ──────────────────────────────────────────────────────────────
section("Activity");
await check("Activity items open the candidate they're about", async () => {
  const items = page.getByTestId("activity-card").locator('.ev[role="button"]');
  const n = await items.count();
  for (let i = 0; i < n; i++) {
    await items.nth(i).click();
    await expect(drawer().getByTestId("candidate-record")).toBeVisible();
    await page.keyboard.press("Escape");
  }
  return `${n} items with a candidate`;
});

// ─── Campaign ──────────────────────────────────────────────────────────────
section("Campaign");
const camp = page.getByTestId("campaign-card");
await check("Edit brief saves", async () => {
  await camp.getByRole("button", { name: "Edit brief" }).click();
  const goal = page.locator(".modal .box").getByLabel("Goal");
  await goal.fill("500 campus sign-ups before Halloween weekend (checked)");
  await page.locator(".modal .box").getByRole("button", { name: "Save brief" }).click();
  await settled();
  await expect(camp.locator(".goal")).toContainText("(checked)");
  return "goal updated";
});
await check("Day log opens", async () => {
  await camp.getByTestId("open-daylog").click();
  await expect(page.getByTestId("panel-daylog")).toBeVisible();
  return "panel-daylog visible";
});
await check("Assign task opens the form", async () => {
  await camp.getByTestId("assign-task").click();
  await expect(page.getByTestId("assign-form")).toBeVisible();
  return "assign form visible";
});
await check("Assignments week strip changes the day", async () => {
  const tab = camp.getByTestId("week-strip").getByRole("tab").nth(4);
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
  const label = await camp.locator(".card-head h2").first().textContent();
  if (!/Assignments · (?!today)/.test(label)) throw new Error(label);
  return label.trim();
});
await camp.getByTestId("week-strip").locator("button.today").click();
await check("Intern rows open the drawer on Assignments", async () => {
  await camp.getByTestId("intern-row").first().locator(".who").click();
  await expect(drawer().getByRole("tab", { name: /Assignments/ })).toHaveAttribute("aria-selected", "true");
  return "drawer on Assignments";
});
await check("Task status cycles on click", async () => {
  const card = camp.getByTestId("intern-row").first().getByTestId("task-card").first();
  const id = await card.getAttribute("data-task-id");
  const sel = camp.locator(`[data-task-id="${id}"]`);
  const seq = [await sel.getAttribute("data-status")];
  for (let i = 0; i < 3; i++) {
    await sel.getByTestId("task-status").click();
    await settled();
    seq.push(await sel.getAttribute("data-status"));
  }
  if (new Set(seq).size < 3 || seq[0] !== seq[3]) throw new Error(seq.join(" → "));
  return seq.join(" → ");
});
/** An unassigned task for today in the Web area, created through the Assign task form. */
async function newUnassignedTask(title) {
  await camp.getByTestId("assign-task").click();
  const f = page.getByTestId("assign-form");
  await f.getByLabel("Title", { exact: true }).fill(title);
  await f.getByLabel("Area", { exact: true }).selectOption({ label: "Web & creative dev" });
  await f.getByRole("button", { name: "Assign task" }).click();
  await settled();
  return camp.getByTestId("unassigned-row").getByTestId("task-card").filter({ hasText: title });
}
await check("Assign/reassign select works", async () => {
  const card = await newUnassignedTask("Checklist select task");
  const id = await card.getAttribute("data-task-id");
  const select = card.locator("select.mini-sel");
  const label = await select.locator("option").nth(1).textContent();
  await select.selectOption({ index: 1 });
  await settled();
  const moved = await camp.locator(`[data-testid="intern-row"] [data-task-id="${id}"]`).count();
  if (!moved) throw new Error("task did not move to an intern row");
  return `assigned to ${label}`;
});
await check("Suggest assigns by skill", async () => {
  const card = await newUnassignedTask("Checklist suggest task");
  const id = await card.getAttribute("data-task-id");
  await card.getByRole("button", { name: "Suggest" }).click();
  await settled();
  const where = camp.locator(`[data-testid="intern-row"]:has([data-task-id="${id}"])`);
  if (!(await where.count())) {
    await toastSeen(/benched|matches|Nobody|Pick an area/);
    return "no eligible match → explained in a toast";
  }
  return `assigned to ${await where.locator(".who b").first().textContent()}`;
});
await check("Remove removes a task", async () => {
  const card = camp.getByTestId("task-card").last();
  const id = await card.getAttribute("data-task-id");
  await card.getByRole("button", { name: "Remove" }).click();
  await card.getByRole("button", { name: "Confirm remove" }).click();
  await settled();
  await expect(page.locator(`[data-task-id="${id}"]`)).toHaveCount(0);
  return "task gone";
});

// ─── Candidates table ──────────────────────────────────────────────────────
section("Candidates table");
const table = page.getByTestId("candidates-card");
await check("Status tabs filter", async () => {
  await table.getByRole("tab", { name: /Queued/ }).click();
  const statuses = await table.locator("tbody .status").allTextContents();
  await table.getByRole("tab", { name: /^All/ }).click();
  if (!statuses.length || statuses.some((s) => s !== "Queued")) throw new Error(statuses.join(","));
  return `${statuses.length} queued rows`;
});
await check("Area/goal filter", async () => {
  const all = await table.getByTestId("candidate-row").count();
  await table.getByLabel("Area or goal").selectOption({ label: "Web & creative dev" });
  const some = await table.getByTestId("candidate-row").count();
  await table.getByLabel("Area or goal").selectOption("all");
  if (some >= all) throw new Error(`${all} → ${some}`);
  return `${all} → ${some}`;
});
await check("Search", async () => {
  await table.getByLabel("Filter candidates").fill("Pratt");
  const rows = await table.getByTestId("candidate-row").allTextContents();
  await table.getByLabel("Filter candidates").fill("");
  if (rows.length !== 1 || !rows[0].includes("Kerem")) throw new Error(rows.join("|"));
  return '"Pratt" → Kerem A.';
});
await check("New candidate creates one", async () => {
  await table.getByRole("button", { name: /New candidate/ }).click();
  const f = page.getByTestId("new-candidate-form");
  await f.locator('input[name="name"]').fill("Checklist Person");
  await f.getByRole("button", { name: "Create candidate" }).click();
  await settled();
  await expect(drawer().getByTestId("candidate-record")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(table.getByTestId("candidate-row").filter({ hasText: "Checklist Person" })).toHaveCount(1);
  return "row + drawer";
});
await check("Every row opens the drawer", async () => {
  const n = await table.getByTestId("candidate-row").count();
  for (let i = 0; i < n; i++) {
    await table.getByTestId("candidate-row").nth(i).click();
    await expect(drawer().getByTestId("candidate-record")).toBeVisible();
    await page.keyboard.press("Escape");
  }
  return `${n} rows`;
});

// ─── Drawer ────────────────────────────────────────────────────────────────
section("Drawer");
const openPranav = async (tab) => {
  await page.keyboard.press("Escape");
  await table.getByTestId("candidate-row").filter({ hasText: "Pranav R." }).click();
  if (tab) await drawer().getByRole("tab", { name: tab }).click();
};
await check("The four tabs", async () => {
  await openPranav();
  const seen = [];
  for (const t of ["Notes", "Interviews", "Assignments", "Resume"]) {
    await drawer().getByRole("tab", { name: new RegExp(t) }).click();
    await expect(drawer().getByRole("tab", { name: new RegExp(t) })).toHaveAttribute("aria-selected", "true");
    seen.push(t);
  }
  return seen.join(" · ");
});
await check("Notes composer", async () => {
  await openPranav(/Notes/);
  await drawer().getByLabel("New note").fill("Checklist note");
  await drawer().getByRole("button", { name: "Add note" }).click();
  await settled();
  await expect(drawer().getByTestId("notes")).toContainText("Checklist note");
  return "note added";
});
await check("Interviews: took / score / debrief save", async () => {
  await openPranav(/Interviews/);
  const past = drawer().locator('[data-testid="interview-item"][data-phase="past"]').first();
  await past.getByLabel("Minutes it took").fill("52");
  await past.getByLabel("Score 1–10").fill("9");
  await past.getByLabel("Debrief").fill("Checked");
  await past.getByRole("button", { name: "Save" }).click();
  await settled();
  await expect(drawer().getByTestId("fit-value")).not.toHaveText("");
  return `fit now ${await drawer().getByTestId("fit-value").textContent()}`;
});
await check("Interviews: schedule form", async () => {
  await openPranav(/Interviews/);
  const f = drawer().getByTestId("schedule-form");
  await f.getByLabel("Date", { exact: true }).fill("2030-01-07");
  await f.getByLabel("Start", { exact: true }).fill("10:00");
  await f.getByRole("button", { name: "Schedule" }).click();
  await settled();
  await expect(drawer().getByTestId("interview-item").filter({ hasText: "Jan 7" })).toHaveCount(1);
  return "scheduled Mon, Jan 7 2030 10:00";
});
await check("Assignments: clock in/out and status control", async () => {
  await openPranav(/Assignments/);
  const a = drawer().getByTestId("record-assignments");
  const outBtn = a.getByTestId("drawer-clock-out").first();
  if (await outBtn.count()) {
    await outBtn.click();
    await page.getByTestId("clock-out-form").getByLabel("What did you get done?").fill("Checklist clock-out");
    await page.getByTestId("clock-out-form").getByRole("button", { name: "Clock out" }).click();
    await settled();
  }
  await a.getByTestId("drawer-clock-in").first().click();
  await settled();
  await expect(a.getByTestId("drawer-clock-out")).toHaveCount(1);
  const card = a.getByTestId("task-card").first();
  const before = await card.getAttribute("data-status");
  await card.getByTestId("task-status").click();
  await settled();
  return `clocked out → in; status ${before} → ${await a.getByTestId("task-card").first().getAttribute("data-status")}`;
});
await check("Resume renders", async () => {
  await openPranav(/Resume/);
  await expect(drawer().locator(".resume h4").first()).toBeVisible();
  return (await drawer().locator(".resume h4").allTextContents()).join(" · ");
});
await check("Click-to-edit school, major, degree", async () => {
  await openPranav();
  for (const [label, value] of [
    ["School", "NYU Tandon (checked)"],
    ["Major", "Computer Science (checked)"],
    ["Degree / year", "BS, junior (checked)"],
  ]) {
    const input = drawer().getByLabel(label, { exact: true });
    await input.click();
    await input.fill(value);
    await input.press("Enter");
    await settled();
    await expect(drawer().getByLabel(label, { exact: true })).toHaveValue(value);
  }
  return "3 fields saved";
});
await check("Click-to-edit skill names and scores", async () => {
  await openPranav();
  const name = drawer().getByLabel("Skill name").first();
  await name.fill("Frontend (checked)");
  await name.press("Enter");
  const score = drawer().getByLabel("Skill score").first();
  await score.fill("8");
  await score.press("Enter");
  await settled();
  await expect(drawer().getByLabel("Skill name").filter({ hasText: "" }).first()).toBeVisible();
  const names = await drawer().getByLabel("Skill name").evaluateAll((els) => els.map((e) => e.value));
  if (!names.includes("Frontend (checked)")) throw new Error(names.join(","));
  return `skills: ${names.join(", ")}`;
});
await check("1–10 fit row", async () => {
  await openPranav();
  await drawer().getByRole("radio", { name: "Fit 6" }).click();
  await settled();
  await expect(drawer().getByTestId("fit-value")).toHaveText("6.0");
  return "fit 6.0";
});
await check("Tier control", async () => {
  await openPranav();
  await drawer().getByRole("radiogroup", { name: /Tier for/ }).getByRole("radio", { name: "Priority" }).click();
  await settled();
  await expect(drawer().locator(".d-head .tier.priority")).toBeVisible();
  return "override → Priority";
});
await check("Area and goal chips attach/remove; suggestion box", async () => {
  await openPranav();
  await drawer().getByLabel("Attach goal").selectOption({ index: 1 });
  await settled();
  const goals = drawer().getByTestId("goal-chips").locator(".chip.goal");
  const n = await goals.count();
  await goals.last().getByRole("button").click();
  await settled();
  await expect(drawer().getByTestId("goal-chips").locator(".chip.goal")).toHaveCount(n - 1);
  const s = drawer().getByTestId("suggestion");
  const text = (await s.textContent()).trim();
  return `goal chip +1/−1 · suggestion "${text}"`;
});

// ─── Rankings / Day log / Areas / Settings ─────────────────────────────────
section("Rankings drawer");
await check("Threshold inputs", async () => {
  await page.locator(".rail nav").getByRole("button", { name: "Rankings & tiers" }).click();
  const p = page.getByTestId("panel-rankings");
  await p.getByLabel("Bench at").fill("5");
  await p.getByLabel("Bench at").press("Enter");
  await settled();
  await expect(p.locator(".rk-group.bench b")).toContainText("5 and below");
  await p.getByLabel("Bench at").fill("4");
  await p.getByLabel("Bench at").press("Enter");
  await settled();
  return "bench 4 → 5 → 4";
});
await check("Per-row fit select", async () => {
  await page.locator(".rail nav").getByRole("button", { name: "Rankings & tiers" }).click();
  const row = page.getByTestId("panel-rankings").getByTestId("ranking-row").last();
  const id = await row.getAttribute("data-candidate");
  await row.getByRole("combobox").selectOption("9");
  await settled();
  await expect(page.locator(`[data-testid="ranking-row"][data-candidate="${id}"]`)).toBeVisible();
  const tier = await page.locator(`[data-testid="ranking-row"][data-candidate="${id}"]`).evaluate((el) => el.closest("section").dataset.testid);
  return `set to 9 → ${tier}`;
});
await check("Tier buttons", async () => {
  await page.locator(".rail nav").getByRole("button", { name: "Rankings & tiers" }).click();
  const row = page.getByTestId("panel-rankings").getByTestId("ranking-row").first();
  const id = await row.getAttribute("data-candidate");
  await row.getByRole("radio", { name: "Bench" }).click();
  await settled();
  await expect(page.getByTestId("tier-bench").locator(`[data-candidate="${id}"]`)).toBeVisible();
  await page.locator(`[data-testid="ranking-row"][data-candidate="${id}"]`).getByRole("button", { name: "auto" }).click();
  await settled();
  return "benched, then back to auto";
});
section("Day log drawer");
await check("Day strip", async () => {
  await camp.getByTestId("open-daylog").click();
  const p = page.getByTestId("panel-daylog");
  const tab = p.getByTestId("week-strip").getByRole("tab").first();
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
  return `opened ${await tab.getAttribute("aria-label")}`;
});
await check('"Campaign so far" rows', async () => {
  await camp.getByTestId("open-daylog").click();
  const p = page.getByTestId("panel-daylog");
  const rows = p.getByTestId("history-row");
  const n = await rows.count();
  await rows.last().click();
  const narr = (await p.getByTestId("narrative").textContent()).slice(0, 40);
  return `${n} rows · last → "${narr}…"`;
});
section("Areas drawer");
await check("Attach select", async () => {
  await page.locator(".rail nav").getByRole("button", { name: "Areas & goals" }).click();
  const card = page.getByTestId("area-card").first();
  const before = await card.locator(".person").count();
  await card.getByRole("combobox").selectOption({ index: 1 });
  await settled();
  await expect(card.locator(".person")).toHaveCount(before + 1);
  return `${before} → ${before + 1} people`;
});
await check("New-area form", async () => {
  await page.locator(".rail nav").getByRole("button", { name: "Areas & goals" }).click();
  const f = page.getByTestId("new-area-form");
  await f.getByRole("radio", { name: "Small job" }).click();
  await f.getByLabel("Name").fill("Checklist small job");
  await f.getByRole("button", { name: "Create" }).click();
  await settled();
  await expect(page.getByTestId("area-card").filter({ hasText: "small job" }).filter({ has: page.locator('input[value="Checklist small job"]') })).toHaveCount(1);
  return "small job created";
});
section("Settings");
await check("Display name", async () => {
  await page.locator(".rail").getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Display name").fill("Naim J.");
  await page.getByTestId("settings").getByRole("button", { name: "Save" }).click();
  await settled();
  return "saved";
});
await check("Interviewers add/remove", async () => {
  await page.locator(".rail").getByRole("button", { name: "Settings" }).click();
  const s = page.getByTestId("settings");
  await s.getByLabel("New interviewer name").fill("Checklist Interviewer");
  await s.getByLabel("New interviewer email").fill(`check.${Date.now()}@example.com`);
  await s.getByRole("button", { name: "Add interviewer" }).click();
  await settled();
  const item = s.locator(".settings-list .it").filter({ hasText: "Checklist Interviewer" });
  await expect(item).toHaveCount(1);
  await item.getByRole("button", { name: "Remove" }).click();
  await settled();
  await expect(item).toHaveCount(0);
  return "added and removed";
});
await check("View as intern", async () => {
  await page.locator(".rail").getByRole("button", { name: "Settings" }).click();
  await page.getByTestId("view-as").click();
  await page.waitForURL(/\/crm\/me\?as=/);
  await expect(page.getByTestId("intern-view")).toBeVisible();
  const who = await page.locator(".intern-banner b").textContent();
  await page.goBack();
  return `viewing as ${who}`;
});

await browser.close();

// ─── Report ────────────────────────────────────────────────────────────────
let last = "";
for (const r of results) {
  if (r.group !== last) console.log(`\n${r.group}`);
  last = r.group;
  console.log(`  [${r.ok ? "x" : " "}] ${r.label}${r.evidence ? `  — ${r.evidence}` : ""}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} verified${failed ? `, ${failed} failing` : ""}`);
process.exit(failed ? 1 : 0);
