import { headers } from "next/headers";
import DownloadPage from "@/components/DownloadPage";

interface Props {
  params: Promise<{ name: string }>;
}

export default async function EssdeeNameRoute({ params }: Props) {
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
    const event = { id, type: "link_open", project: "essdee", name: decoded, ip, ua, lang, referer, createdAt: new Date().toISOString() };
    await kv.set(`event:${id}`, event);
    await kv.sadd("events", id);
  } catch {}

  return <DownloadPage name={decoded} />;
}
