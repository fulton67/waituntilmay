/**
 * pnpm crm:seed           — load crm/seed.json (idempotent; safe to run twice)
 * pnpm crm:seed --reset   — wipe candidate data first, then load
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local — rely on the environment
}

async function main() {
  const { getDb, databaseMode } = await import("../db");
  const { seedDatabase } = await import("../lib/seed");
  const db = await getDb();
  const { today, shift } = await seedDatabase(db, { reset: process.argv.includes("--reset") });
  console.log(`Seeded ${databaseMode()} database. baseDate shifted ${shift} day(s) to ${today}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
