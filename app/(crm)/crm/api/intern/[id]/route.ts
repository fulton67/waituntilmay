import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/crm/lib/auth";
import { loadInternData } from "@/crm/lib/queries";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** An intern's page data as JSON. Interns may read only their own; interviewers may read anyone's. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await ctx.params;
  if (viewer.role === "intern" && id !== viewer.candidate.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!UUID.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data = await loadInternData(id, viewer.role);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
