import { headers } from "next/headers";
import { notFound } from "next/navigation";
import CollectionPage from "@/components/CollectionPage";
import type { Collection } from "@/app/api/collections/route";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CollectionRoute({ params }: Props) {
  const { slug } = await params;

  let collection: Collection | null = null;
  try {
    const { kv } = await import("@vercel/kv");
    collection = await kv.get(`collection:${slug}`);
  } catch {}

  if (!collection) notFound();

  // Server-side visit tracking
  const hdrs = await headers();
  const ip = hdrs.get("x-real-ip") ?? hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = hdrs.get("user-agent") ?? "unknown";
  const lang = hdrs.get("accept-language")?.split(",")[0] ?? "unknown";
  const referer = hdrs.get("referer") ?? null;

  try {
    const { kv } = await import("@vercel/kv");
    const id = Date.now().toString();
    await kv.set(`event:${id}`, { id, type: "link_open", project: slug, name: null, ip, ua, lang, referer, createdAt: new Date().toISOString() });
    await kv.sadd("events", id);
  } catch {}

  return <CollectionPage collection={collection} />;
}
