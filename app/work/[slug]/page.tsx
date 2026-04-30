import { notFound } from "next/navigation";
import type { WorkItem } from "@/app/api/work/route";
import { makeSlug } from "@/app/api/work/route";
import PiecePage from "@/components/PiecePage";

async function getItems(): Promise<WorkItem[]> {
  try {
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const res = await fetch(`${base}/api/work`, { cache: "no-store" });
    return res.json();
  } catch {
    return [];
  }
}

export default async function WorkPiecePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const items = await getItems();
  const item = items.find(i => makeSlug(i) === slug);
  if (!item || !item.visible) return notFound();
  return <PiecePage item={item} />;
}
