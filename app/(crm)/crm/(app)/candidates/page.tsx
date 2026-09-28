import type { Metadata } from "next";
import { CandidatesTable } from "@/crm/ui/CandidatesTable";

export const metadata: Metadata = { title: "Candidates" };

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  return <CandidatesTable key={q} initialQuery={q} />;
}
