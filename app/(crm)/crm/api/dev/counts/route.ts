import { eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getDb, schema } from "@/crm/db";
import { getViewer } from "@/crm/lib/auth";
import { devToolsEnabled } from "@/crm/lib/env";

const TABLES = ["interviewers", "settings", "campaigns", "candidates", "candidate_skills", "candidate_areas", "areas", "interviews", "notes", "tasks", "sessions", "reports", "activity", "dismissals"] as const;

/**
 * Development-only row counts for verification scripts (deletion cascades, "delete all").
 * 404 in production and for anyone who isn't a signed-in interviewer.
 */
export async function GET(req: NextRequest) {
  const viewer = await getViewer();
  if (!devToolsEnabled() || viewer?.role !== "interviewer") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const db = await getDb();
  const tables: Record<string, number> = {};
  for (const t of TABLES) {
    const rows = await db.execute<{ n: number }>(sql.raw(`select count(*)::int as n from ${t}`));
    tables[t] = Number((Array.isArray(rows) ? rows[0] : (rows as unknown as { rows: { n: number }[] }).rows[0])?.n ?? 0);
  }
  const candidate = req.nextUrl.searchParams.get("candidate");
  let forCandidate: Record<string, number> | null = null;
  if (candidate && /^[0-9a-f-]{36}$/.test(candidate)) {
    const count = async (table: typeof schema.interviews | typeof schema.notes | typeof schema.tasks | typeof schema.sessions | typeof schema.reports) =>
      (await db.select({ n: sql<number>`count(*)::int` }).from(table).where(eq(table.candidateId, candidate)))[0].n;
    forCandidate = {
      candidates: (await db.select({ n: sql<number>`count(*)::int` }).from(schema.candidates).where(eq(schema.candidates.id, candidate)))[0].n,
      interviews: await count(schema.interviews),
      notes: await count(schema.notes),
      tasks: await count(schema.tasks),
      sessions: await count(schema.sessions),
      reports: await count(schema.reports),
    };
  }
  const [campaign] = await db.select().from(schema.campaigns).limit(1);
  return NextResponse.json({ tables, forCandidate, campaign: campaign ? { name: campaign.name, goal: campaign.goal, brief: campaign.brief, targets: campaign.targets } : null });
}
