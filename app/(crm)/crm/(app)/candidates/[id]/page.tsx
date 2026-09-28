import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/crm/db";
import { CandidateRecord } from "@/crm/ui/CandidateRecord";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function find(id: string) {
  if (!UUID.test(id)) return null;
  const db = await getDb();
  const [row] = await db.select({ id: schema.candidates.id, name: schema.candidates.name }).from(schema.candidates).where(eq(schema.candidates.id, id));
  return row ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const row = await find((await params).id);
  return { title: row?.name ?? "Candidate" };
}

export default async function CandidatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  if (!(await find(id))) notFound();
  const initialTab = tab === "interviews" || tab === "resume" ? tab : "notes";
  return <CandidateRecord candidateId={id} initialTab={initialTab} variant="page" />;
}
