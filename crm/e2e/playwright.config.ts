import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.CRM_E2E_PORT ?? 3100);

/**
 * Runs against `next dev` with an embedded PGlite database and local sign-in, so it needs no
 * Supabase project. The test user is the only allowlisted email.
 */
export default defineConfig({
  testDir: ".",
  outputDir: "./.results",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } }],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    cwd: "../..",
    url: `http://localhost:${PORT}/crm/sign-in`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: "pglite:crm/.pglite-e2e",
      CRM_ALLOWED_EMAILS: "e2e@fomo.test",
      // .env.local may hold real Supabase keys; this forces local sign-in and PGlite.
      CRM_FORCE_LOCAL: "1",
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
