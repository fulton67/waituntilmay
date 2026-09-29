import { expect, test, type Browser, type Page } from "@playwright/test";
import seed from "../seed.json";
import { autoTier, ranked, suggestAssignee } from "../lib/ranking";
import { seedUuid } from "../lib/seed";
import { CRM_TZ, addDays, formatDay, todayIn } from "../lib/time";
import type { Area, Candidate } from "../lib/types";

const EMAIL = "e2e@fomo.test";
const id = (seedId: string) => seedUuid(seedId);
const PRANAV = id("c1");
const GOLAM = id("c2");
const KEREM = id("c3");
const HAMMAAD = id("c4");
const ARYA = id("c5");

test.describe.configure({ timeout: 240_000 });

/** The intro splash plays once per browser session; tests skip it. */
async function skipIntro(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("crm-intro-seen", "1"));
}

test.beforeEach(async ({ page }) => skipIntro(page));

async function signIn(page: Page, email: string) {
  await page.goto("/crm/sign-in");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** Optimistic UI updates instantly; wait for the server action + refresh to finish. */
async function settled(page: Page) {
  await expect(page.getByTestId("crm-shell")).not.toHaveAttribute("data-pending", /.*/);
}

async function openRecord(page: Page, name: string, tab?: RegExp) {
  await page.keyboard.press("Escape");
  await page.getByTestId("candidate-row").filter({ hasText: name }).first().click();
  const drawer = page.getByTestId("drawer");
  await expect(drawer.getByTestId("candidate-record")).toBeVisible();
  if (tab) await drawer.getByRole("tab", { name: tab }).click();
  return drawer;
}

async function schedule(page: Page, drawer: ReturnType<Page["getByTestId"]>, date: string, start: string, length = "45 min") {
  const f = drawer.getByTestId("schedule-form");
  await f.getByLabel("Date", { exact: true }).fill(date);
  await f.getByLabel("Start", { exact: true }).fill(start);
  await f.getByRole("radio", { name: length }).click();
  await f.getByRole("button", { name: "Schedule" }).click();
  await settled(page);
  return f;
}

/** Candidates as ranking.ts sees them, rebuilt from seed.json (skills on 1–10). */
function seedCandidates(): Candidate[] {
  return seed.candidates.map((c) => ({
    id: id(c.id),
    seq: 0,
    name: c.name,
    school: c.school,
    major: c.major,
    program: c.program,
    email: c.email,
    instagramHandle: c.instagram,
    portfolioUrl: c.portfolio,
    phone: null,
    status: "inprocess",
    fit: c.fit / 10,
    tierOverride: null,
    resumeJson: c.resume,
    resumeFileUrl: null,
    createdAt: "",
    skills: c.bestAt.map((s, i) => ({ id: String(i), skill: s.skill, score: Math.max(1, Math.min(10, Math.round(s.score / 10))) })),
    areaIds: [],
  }));
}

test("smoke: interviewer + intern flows end to end", async ({ page, browser }) => {
  const name = `Test Candidate ${Date.now().toString(36)}`;
  const today = todayIn(CRM_TZ);
  const tomorrow = addDays(today, 1);
  const yesterday = addDays(today, -1);

  // ── Sign-in and allowlist ──
  await page.goto("/crm");
  await expect(page).toHaveURL(/\/crm\/sign-in/);
  await page.getByLabel("Work email").fill("stranger@example.com");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Ask Naim for access.")).toBeVisible();
  await page.getByLabel("Work email").fill(EMAIL);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/crm$/);

  // Clean, seeded state.
  await page.goto("/crm/settings");
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await page.getByTestId("confirm-reset").click();
  await expect(page.getByText("Demo data reset")).toBeVisible();

  // ── Create a candidate ──
  await page.goto("/crm/candidates");
  await page.getByRole("button", { name: "New candidate" }).click();
  const form = page.getByTestId("new-candidate-form");
  await form.locator('input[name="name"]').fill(name);
  await form.locator('input[name="school"]').fill("Cooper Union");
  await form.locator('input[name="major"]').fill("Architecture");
  await form.locator('input[name="program"]').fill("BArch, junior");
  await form.locator('input[name="instagram"]').fill("@test.handle");
  await form.getByRole("button", { name: "Create candidate" }).click();
  let drawer = page.getByTestId("drawer");
  await expect(drawer.getByTestId("candidate-record")).toBeVisible();
  await expect(drawer.getByLabel("Name", { exact: true })).toHaveValue(name);
  await expect(drawer.getByRole("link", { name: "@test.handle" })).toHaveAttribute("href", "https://instagram.com/test.handle");
  await settled(page);
  const newId = (await drawer.getByTestId("candidate-record").getAttribute("data-candidate-id"))!;

  // ── Schedule tomorrow 12:00; the overlap rule rejects 12:15 ──
  await drawer.getByRole("tab", { name: /Interviews/ }).click();
  const sched = await schedule(page, drawer, tomorrow, "12:00");
  await expect(drawer.getByTestId("interview-item")).toHaveCount(1);
  await expect(drawer.locator('[data-status="queued"]')).toBeVisible();
  await sched.getByLabel("Start", { exact: true }).fill("12:15");
  await sched.getByRole("button", { name: "Schedule" }).click();
  await expect(sched.getByTestId("schedule-error")).toContainText(`already has ${name}`);
  await expect(drawer.getByTestId("interview-item")).toHaveCount(1);

  // ── Note + area ──
  await drawer.getByRole("tab", { name: /Notes/ }).click();
  await drawer.getByLabel("New note").fill("Strong spatial sense; ask about web work.");
  await drawer.getByRole("button", { name: "Add note" }).click();
  await expect(drawer.getByTestId("notes")).toContainText("Strong spatial sense");
  await settled(page);
  await drawer.getByLabel("Attach area").selectOption({ label: "Web & creative dev" });
  await expect(drawer.getByTestId("area-chips")).toContainText("Web & creative dev");
  await settled(page);

  // ── Score two interviews; ranking order + automatic tiers match ranking.ts ──
  const score = async (candidate: string, start: string, value: string) => {
    drawer = await openRecord(page, candidate, /Interviews/);
    await schedule(page, drawer, yesterday, start);
    const item = drawer.getByTestId("interview-item").filter({ hasText: `${formatDay(yesterday)}, ${start}` });
    await item.getByLabel("Score 1–10").fill(value);
    await item.getByRole("button", { name: "Save" }).click();
    await settled(page);
  };
  await score("Hammaad S.", "10:00", "9"); // 6 and 9 → 7.5
  await score("Arya M.", "11:00", "3"); // first score → 3
  await expect(drawer.getByTestId("fit-value")).toHaveText("3.0");
  await page.keyboard.press("Escape");

  const S = { priorityAt: 8, benchAt: 4 };
  const fits = [
    { id: KEREM, name: "Kerem A.", fit: 9 },
    { id: PRANAV, name: "Pranav R.", fit: 8 },
    { id: HAMMAAD, name: "Hammaad S.", fit: 7.5 },
    { id: GOLAM, name: "Golam H.", fit: 7 },
    { id: newId, name, fit: 5 },
    { id: ARYA, name: "Arya M.", fit: 3 },
  ];
  const expectedOrder = ranked(fits).map((c) => c.id);
  await page.goto("/crm");
  const rows = page.getByTestId("leaderboard-rows").locator(".lb-row[data-candidate]");
  await expect(rows).toHaveCount(fits.length);
  expect(await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-candidate")))).toEqual(expectedOrder);

  await page.getByRole("button", { name: "Open rankings & tiers" }).click();
  const panel = page.getByTestId("panel-rankings");
  for (const c of fits) {
    await expect(panel.getByTestId(`tier-${autoTier(c.fit, S)}`).locator(`[data-candidate="${c.id}"]`)).toBeVisible();
  }

  // ── Bench Golam; he vanishes from the schedule form ──
  await panel.locator(`[data-testid="ranking-row"][data-candidate="${GOLAM}"]`).getByRole("radio", { name: "Bench" }).click();
  await settled(page);
  await expect(panel.getByTestId("tier-bench").locator(`[data-candidate="${GOLAM}"]`)).toBeVisible();
  await page.keyboard.press("Escape");
  drawer = await openRecord(page, "Kerem A.", /Interviews/);
  const options = await drawer.getByTestId("schedule-form").getByLabel("Candidate", { exact: true }).locator("option").allTextContents();
  expect(options).not.toContain("Golam H.");
  expect(options).not.toContain("Arya M.");
  expect(options).toContain("Kerem A.");
  await page.keyboard.press("Escape");

  // ── Assign a task with "Suggest by skill"; the pick matches suggestAssignee ──
  const taskTitle = `Campus page QA ${Date.now().toString(36)}`;
  const web: Area = { id: id("a1"), kind: "area", level: "core", name: "Web & creative dev", description: "Sites, 3D, Shopify builds" };
  const benchedNow = seedCandidates().map((c) => (c.id === GOLAM || c.id === ARYA ? { ...c, tierOverride: "bench" as const } : c));
  const expected = suggestAssignee(web, benchedNow, S);
  expect(expected.pick?.id).toBe(PRANAV);
  await page.getByTestId("assign-task").click();
  const assign = page.getByTestId("assign-form");
  await assign.getByLabel("Title", { exact: true }).fill(taskTitle);
  await assign.getByLabel("Area", { exact: true }).selectOption({ label: "Web & creative dev" });
  await assign.getByTestId("suggest-by-skill").click();
  await expect(assign.getByLabel("Assignee", { exact: true })).toHaveValue(expected.pick!.id);
  await assign.getByRole("button", { name: "Assign task" }).click();
  await settled(page);
  await expect(page.locator(`[data-testid="intern-row"][data-candidate="${PRANAV}"]`)).toContainText(taskTitle);

  // ── Intern: clock into one task, then another; the first session closes ──
  const intern = await internPage(browser, "pranav.r@example.edu");
  await expect(intern).toHaveURL(/\/crm\/me$/);
  await expect(intern.getByTestId("clock-card")).toContainText("Build the campus landing page"); // seeded open session
  const clockIn = async (title: string) => {
    await intern.getByTestId("intern-task").filter({ hasText: title }).getByTestId("clock-in").click();
    await expect(intern.getByTestId("clock-card")).toContainText(title);
  };
  await clockIn("Walk through the R3F configurator");
  await clockIn(taskTitle);
  const me = await (await intern.request.get(`/crm/api/intern/${PRANAV}`)).json();
  const newTask = me.tasks.find((t: { title: string }) => t.title === taskTitle);
  const openSessions = me.sessions.filter((s: { endedAt: string | null }) => !s.endedAt);
  expect(openSessions).toHaveLength(1);
  expect(openSessions[0].taskId).toBe(newTask.id);
  const r3f = me.tasks.find((t: { title: string }) => t.title === "Walk through the R3F configurator");
  expect(me.sessions.filter((s: { taskId: string; endedAt: string | null }) => s.taskId === r3f.id && s.endedAt)).toHaveLength(1);

  // Clock out with a note, then submit the day's report.
  await intern.getByTestId("clock-out").click();
  const out = intern.getByTestId("clock-out-form");
  await out.getByLabel("What did you get done?").fill("Wired the school picker");
  await out.getByLabel("Mark the task done").check();
  await out.getByRole("button", { name: "Clock out" }).click();
  await expect(intern.getByTestId("clock-card")).toContainText("Not clocked in");
  await intern.getByLabel("What did you accomplish today?").fill("Shipped the campus picker.");
  await intern.getByTestId("submit-report").click();
  await expect(intern.getByText(/Report submitted/)).toBeVisible();

  // ── Intern isolation: only their rows; 403 for anyone else's ──
  const own = await intern.request.get(`/crm/api/intern/${PRANAV}`);
  expect(own.status()).toBe(200);
  const body = await own.json();
  expect(body.tasks.every((t: { candidateId: string }) => t.candidateId === PRANAV)).toBe(true);
  expect(body.interviews).toHaveLength(seed.interviews.filter((v) => v.candidateId === "c1").length);
  const raw = JSON.stringify(body);
  for (const leak of ['"fit"', '"score"', '"tierOverride"', '"notes"', "Golam", "Kerem"]) expect(raw).not.toContain(leak);
  expect((await intern.request.get(`/crm/api/intern/${GOLAM}`)).status()).toBe(403);
  await intern.goto("/crm");
  await expect(intern).toHaveURL(/\/crm\/me$/);
  await intern.context().close();

  // ── Day log: minutes + clock-out note, and the report in the narrative ──
  await page.reload();
  await page.getByTestId("open-daylog").click();
  const log = page.getByTestId("panel-daylog");
  const pranavLog = log.locator(`[data-testid="daylog-intern"][data-candidate="${PRANAV}"]`);
  const session = pranavLog.locator("li").filter({ hasText: "Wired the school picker" });
  await expect(session).toContainText(taskTitle);
  await expect(session).toContainText(/^\d+(h \d+)?m/);
  await expect(log.getByTestId("narrative")).toContainText("Pranav: Shipped the campus picker.");
  await page.keyboard.press("Escape");

  // ── Schedule: Week shows seven rows ──
  const scheduleCard = page.locator("#schedule");
  await scheduleCard.getByRole("radio", { name: "Week" }).click();
  await expect(scheduleCard.getByTestId("schedule-week-row")).toHaveCount(7);
  await scheduleCard.getByRole("radio", { name: "Day" }).click();

  // ── Theme toggle flips data-theme on <html> and persists ──
  const before = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  await page.getByTestId("theme-toggle").first().click();
  const after = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(after).not.toBe(before);
  expect(await page.evaluate(() => localStorage.getItem("crm-theme"))).toBe(after);
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe(after);

  // ── Block geometry: window 09:00–18:00 (540 min); 12:00 → 180/540, 45 min → 45/540 ──
  await page.goto("/crm/schedule");
  await page.getByRole("button", { name: "Next day" }).click();
  await expect(page.getByTestId("schedule-day")).toHaveText(formatDay(tomorrow));
  const block = page.getByTestId("schedule-block").filter({ hasText: name });
  await expect(block).toBeVisible();
  const style = await block.evaluate((el) => ({ left: (el as HTMLElement).style.left, width: (el as HTMLElement).style.width }));
  expect(parseFloat(style.left)).toBeCloseTo((180 / 540) * 100, 2);
  expect(parseFloat(style.width)).toBeCloseTo((45 / 540) * 100, 2);
  const [trackBox, blockBox] = await Promise.all([block.locator("..").boundingBox(), block.boundingBox()]);
  expect(Math.abs(blockBox!.x - trackBox!.x - (trackBox!.width * 180) / 540)).toBeLessThan(1.5);
  expect(Math.abs(blockBox!.width - (trackBox!.width * 45) / 540)).toBeLessThan(1.5);
  await block.click();
  await expect(page.getByTestId("drawer").getByRole("tab", { name: /Interviews/ })).toHaveAttribute("aria-selected", "true");
});

async function internPage(browser: Browser, email: string) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await context.newPage();
  await skipIntro(p);
  await signIn(p, email);
  return p;
}

test("overlap rule is enforced by the server, not just the form", async ({ browser }) => {
  const day = addDays(todayIn(CRM_TZ), 2);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const a = await context.newPage();
  await skipIntro(a);
  await signIn(a, EMAIL);
  await expect(a).toHaveURL(/\/crm$/);

  // Tab B loads first, so its client-side copy of the schedule is stale.
  const b = await context.newPage();
  await skipIntro(b);
  await b.goto("/crm/candidates");

  const book = async (page: Page, start: string) => {
    await page.getByTestId("candidate-row").filter({ hasText: "Kerem A." }).click();
    const drawer = page.getByTestId("drawer");
    await drawer.getByRole("tab", { name: /Interviews/ }).click();
    const f = drawer.getByTestId("schedule-form");
    await f.getByLabel("Date", { exact: true }).fill(day);
    await f.getByLabel("Start", { exact: true }).fill(start);
    await f.getByRole("radio", { name: "60 min" }).click();
    await f.getByRole("button", { name: "Schedule" }).click();
    return f;
  };

  await a.goto("/crm/candidates");
  await book(a, "16:00");
  await expect(a.getByText("Interview scheduled").first()).toBeVisible();
  const schedB = await book(b, "16:30");
  await expect(schedB.getByTestId("schedule-error")).toContainText("already has Kerem A.");
  await context.close();
});
