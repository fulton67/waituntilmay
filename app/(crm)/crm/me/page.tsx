import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireViewer } from "@/crm/lib/auth";
import { loadInternData } from "@/crm/lib/queries";
import { InternView } from "@/crm/ui/InternView";

export const metadata: Metadata = { title: "Your day" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Interns see their own page. Interviewers can pass ?as=<candidateId> to see exactly what that
 * intern sees (read-only). An intern's ?as= is ignored — they only ever get their own rows.
 */
export default async function MePage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const viewer = await requireViewer();
  const { as } = await searchParams;
  if (viewer.role === "intern") {
    if (as && as !== viewer.candidate.id) redirect("/crm/me");
    const data = await loadInternData(viewer.candidate.id, "intern");
    if (!data) notFound();
    return <InternView data={data} />;
  }
  if (!as || !UUID.test(as)) redirect("/crm/settings");
  const data = await loadInternData(as, "interviewer");
  if (!data) notFound();
  return <InternView data={data} />;
}
