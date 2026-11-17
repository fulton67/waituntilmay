/**
 * Photo intake for the grid planner (POST_GRID §3b). Reads brand/intake/intake.json (made by brand/scripts/intake.py from the
 * local iCloud catalog) and saves answers typed in the planner's Needs info panel back into it. Local only: the file holds
 * clinic and patient metadata and is gitignored, so the deployment answers { available: false }.
 */
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const FILE = path.join(process.cwd(), "brand", "intake", "intake.json");
const local = () => process.env.NODE_ENV !== "production" || process.env.OSTAD_RENDERER === "on";
type Item = { id: string; row?: number; category?: string; status: string; missing: string[]; answers: Record<string, string>; [k: string]: unknown };
type Doc = { generated: string; counts: Record<string, number>; skipped: Record<string, number>; scanned: number; kept: number; items: Item[]; pairs: Item[] };
const read = (): Doc | null => (fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : null);

export async function GET(req: Request) {
  if (!local()) return Response.json({ available: false });
  const doc = read();
  if (!doc) return Response.json({ available: false, error: "Run brand/scripts/intake.py first." });
  const u = new URL(req.url); const cat = u.searchParams.get("category"); const limit = Math.min(500, Number(u.searchParams.get("limit") || 120));
  const items = doc.items.filter((i) => !cat || i.category === cat);
  return Response.json({
    available: true, generated: doc.generated, scanned: doc.scanned, kept: doc.kept, counts: doc.counts, skipped: doc.skipped,
    pairs: doc.pairs, needsInfo: items.filter((i) => i.status === "needs info").slice(0, limit), drafts: items.filter((i) => i.status === "draft").slice(0, limit),
  });
}

export async function POST(req: Request) {
  if (!local()) return Response.json({ error: "local only" }, { status: 503 });
  let body: { id?: string; answers?: Record<string, string> };
  try { body = await req.json(); } catch { return Response.json({ error: "bad JSON" }, { status: 400 }); }
  const doc = read(); if (!doc) return Response.json({ error: "no intake.json" }, { status: 404 });
  const it = [...doc.items, ...doc.pairs].find((x) => x.id === body.id);
  if (!it || !body.answers || typeof body.answers !== "object") return Response.json({ error: "unknown id" }, { status: 404 });
  for (const [k, v] of Object.entries(body.answers)) if (typeof v === "string" && k.length < 80 && v.length < 300) it.answers[k] = v.trim();
  // an item stops needing info once every missing field has a non-empty answer; consent stays exactly as typed
  it.status = it.missing.every((m) => (it.answers[m] || "").length > 0) ? "draft" : "needs info";
  fs.writeFileSync(FILE, JSON.stringify(doc, null, 1));
  return Response.json({ ok: true, id: it.id, status: it.status, answers: it.answers });
}
