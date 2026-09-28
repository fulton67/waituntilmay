import { expect, test } from "@playwright/test";
import { CRM_TZ, addDays, todayIn } from "../lib/time";

const EMAIL = "e2e@fomo.test";

/** Optimistic UI updates instantly; wait for the server action + refresh to finish. */
async function settled(page: import("@playwright/test").Page) {
  await expect(page.getByTestId("crm-shell")).not.toHaveAttribute("data-pending", /.*/);
}

test("smoke: sign in, create, schedule, overlap, note, area, theme, schedule geometry", async ({ page }) => {
  const name = `Test Candidate ${Date.now().toString(36)}`;
  const tomorrow = addDays(todayIn(CRM_TZ), 1);

  // Signed out → sign-in.
  await page.goto("/crm");
  await expect(page).toHaveURL(/\/crm\/sign-in/);

  // A non-allowlisted email is turned away.
  await page.getByLabel("Work email").fill("stranger@example.com");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Ask Naim for access.")).toBeVisible();

  // Allowlisted sign-in.
  await page.getByLabel("Work email").fill(EMAIL);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/crm$/);

  // Start from a clean, seeded state so the slot below is free.
  await page.goto("/crm/settings");
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await page.getByTestId("confirm-reset").click();
  await expect(page.getByText("Demo data reset")).toBeVisible();

  // Create a candidate.
  await page.goto("/crm/candidates");
  await page.getByRole("button", { name: "New candidate" }).click();
  const form = page.getByTestId("new-candidate-form");
  await form.locator('input[name="name"]').fill(name);
  await form.locator('input[name="school"]').fill("Cooper Union");
  await form.locator('input[name="major"]').fill("Architecture");
  await form.locator('input[name="program"]').fill("BArch, junior");
  await form.locator('input[name="instagram"]').fill("@test.handle");
  await form.getByRole("button", { name: "Create candidate" }).click();

  const drawer = page.getByTestId("drawer");
  await expect(drawer.getByTestId("candidate-record")).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Edit name" })).toHaveText(name);
  await expect(drawer.getByRole("link", { name: "@test.handle" })).toHaveAttribute("href", "https://instagram.com/test.handle");

  // Schedule an interview tomorrow 12:00–12:45 with me.
  await drawer.getByRole("tab", { name: /Interviews/ }).click();
  const sched = drawer.getByTestId("schedule-form");
  await sched.getByLabel("Date", { exact: true }).fill(tomorrow);
  await sched.getByLabel("Start", { exact: true }).fill("12:00");
  await sched.getByRole("radio", { name: "45 min" }).click();
  await sched.getByLabel("Type", { exact: true }).selectOption("portfolio");
  await sched.getByRole("button", { name: "Schedule" }).click();
  await expect(drawer.getByTestId("interview-item")).toHaveCount(1);
  await expect(page.getByText("Interview scheduled").first()).toBeVisible();
  // Scheduling a new candidate moves them to queued.
  await expect(drawer.locator('[data-status="queued"]')).toBeVisible();

  // Overlap rule: 12:15 with the same interviewer clashes.
  await sched.getByLabel("Start", { exact: true }).fill("12:15");
  await sched.getByRole("button", { name: "Schedule" }).click();
  await expect(sched.getByTestId("schedule-error")).toContainText(`already has ${name}`);
  await expect(drawer.getByTestId("interview-item")).toHaveCount(1);

  // Add a note.
  await drawer.getByRole("tab", { name: /Notes/ }).click();
  await drawer.getByLabel("New note").fill("Strong spatial sense; ask about web work.");
  await drawer.getByRole("button", { name: "Add note" }).click();
  await expect(drawer.getByTestId("notes")).toContainText("Strong spatial sense");
  await settled(page);

  // Attach an area.
  await drawer.getByLabel("Attach area").selectOption({ label: "Web & creative dev" });
  await expect(drawer.getByTestId("area-chips")).toContainText("Web & creative dev");
  await settled(page);

  // Close the drawer and reload: everything persisted.
  await page.keyboard.press("Escape");
  await page.reload();
  const row = page.getByTestId("candidate-row").filter({ hasText: name });
  await expect(row).toContainText("Web & creative dev");
  await expect(row).toContainText("Queued");

  // Theme toggle flips data-theme on <html> and persists.
  const before = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  await page.getByTestId("theme-toggle").first().click();
  const after = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(after).not.toBe(before);
  expect(await page.evaluate(() => localStorage.getItem("crm-theme"))).toBe(after);
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe(after);

  // Schedule block geometry: window 09:00–18:00 (540 min); 12:00 → 180/540, 45 min → 45/540.
  await page.goto("/crm/schedule");
  await page.getByRole("radio", { name: "Tomorrow" }).click();
  const block = page.getByTestId("schedule-block").filter({ hasText: name });
  await expect(block).toBeVisible();
  const style = await block.evaluate((el) => ({ left: (el as HTMLElement).style.left, width: (el as HTMLElement).style.width }));
  expect(parseFloat(style.left)).toBeCloseTo((180 / 540) * 100, 2);
  expect(parseFloat(style.width)).toBeCloseTo((45 / 540) * 100, 2);

  // Rendered position matches the style within a pixel.
  const [trackBox, blockBox] = await Promise.all([block.locator("..").boundingBox(), block.boundingBox()]);
  expect(Math.abs(blockBox!.x - trackBox!.x - (trackBox!.width * 180) / 540)).toBeLessThan(1.5);
  expect(Math.abs(blockBox!.width - (trackBox!.width * 45) / 540)).toBeLessThan(1.5);

  // Clicking the block opens the drawer on the Interviews tab.
  await block.click();
  await expect(page.getByTestId("drawer").getByRole("tab", { name: /Interviews/ })).toHaveAttribute("aria-selected", "true");
});

test("overlap rule is enforced by the server, not just the form", async ({ browser }) => {
  const day = addDays(todayIn(CRM_TZ), 2);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const a = await context.newPage();
  await a.goto("/crm/sign-in");
  await a.getByLabel("Work email").fill(EMAIL);
  await a.getByRole("button", { name: "Sign in" }).click();
  await expect(a).toHaveURL(/\/crm$/);

  // Tab B loads first, so its client-side copy of the schedule is stale.
  const b = await context.newPage();
  await b.goto("/crm/candidates");

  const book = async (page: typeof a, start: string) => {
    await page.getByTestId("candidate-row").filter({ hasText: "Arya M." }).click();
    const sched = page.getByTestId("drawer").getByTestId("schedule-form");
    await page.getByTestId("drawer").getByRole("tab", { name: /Interviews/ }).click();
    await sched.getByLabel("Date", { exact: true }).fill(day);
    await sched.getByLabel("Start", { exact: true }).fill(start);
    await sched.getByRole("radio", { name: "60 min" }).click();
    await sched.getByRole("button", { name: "Schedule" }).click();
    return sched;
  };

  await a.goto("/crm/candidates");
  const slot = "11:00";
  await book(a, slot);
  await expect(a.getByText("Interview scheduled").first()).toBeVisible();

  const schedB = await book(b, slot.replace(":00", ":30"));
  await expect(schedB.getByTestId("schedule-error")).toContainText("already has Arya M.");
  await context.close();
});
