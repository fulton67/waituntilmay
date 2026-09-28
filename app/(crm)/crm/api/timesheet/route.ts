import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/crm/lib/auth";
import { timesheetRows } from "@/crm/lib/queries";
import { dayOf, sessionMinutes } from "@/crm/lib/ranking";
import { CRM_TZ } from "@/crm/lib/time";

const csv = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const time = (d: Date) => d.toLocaleTimeString("en-GB", { timeZone: CRM_TZ, hour: "2-digit", minute: "2-digit" });

/** Per-day timesheet: intern, task, start, end, minutes, note. Time only — no rates or amounts. */
export async function GET(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (viewer.role !== "interviewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const day = req.nextUrl.searchParams.get("day") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return NextResponse.json({ error: "Pass ?day=YYYY-MM-DD" }, { status: 400 });

  const now = Date.now();
  const rows = (await timesheetRows()).filter((r) => dayOf(r.startedAt.toISOString(), CRM_TZ) === day);
  const lines = [
    "intern,task,start,end,minutes,note",
    ...rows.map((r) =>
      [
        r.intern,
        r.task,
        time(r.startedAt),
        r.endedAt ? time(r.endedAt) : "",
        String(sessionMinutes({ startedAt: r.startedAt.toISOString(), endedAt: r.endedAt?.toISOString() ?? null }, now)),
        r.note ?? "",
      ]
        .map(csv)
        .join(","),
    ),
  ];
  return new NextResponse(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="timesheet-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
