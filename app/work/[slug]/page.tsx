import { notFound } from "next/navigation";
import { makeSlug, readItems } from "@/app/api/work/route";
import PiecePage from "@/components/PiecePage";

export default async function WorkPiecePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const items = await readItems();
  const item = items.find(i => makeSlug(i) === slug);
  if (!item || !item.visible) return notFound();
  return <PiecePage item={item} />;
}
