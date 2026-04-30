import type { Metadata } from "next";
import { headers } from "next/headers";
import { getReels } from "@/lib/reels";
import ImageHarvest from "@/components/ImageHarvest";

export const metadata: Metadata = {
  title: "image harvest 1",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ name: string }>;
}

export default async function ReelsPage({ params }: Props) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);

  const hdrs = await headers();
  const ip = hdrs.get("x-real-ip") ?? hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = hdrs.get("user-agent") ?? "unknown";
  const lang = hdrs.get("accept-language")?.split(",")[0] ?? "unknown";
  const referer = hdrs.get("referer") ?? null;

  try {
    const { kv } = await import("@vercel/kv");
    const id = Date.now().toString();
    const event = { id, type: "page_view", project: "reels", name: decoded, ip, ua, lang, referer, createdAt: new Date().toISOString() };
    await kv.set(`event:${id}`, event);
    await kv.sadd("events", id);
  } catch {}

  const reels = await getReels(false);

  return <ImageHarvest reels={reels} visitorName={decoded} />;
}
