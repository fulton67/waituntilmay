import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./crm/db/schema.ts",
  out: "./crm/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
