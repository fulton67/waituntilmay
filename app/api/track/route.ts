import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const ua = req.headers.get("user-agent") ?? "unknown";
  const lang = req.headers.get("accept-language")?.split(",")[0] ?? "unknown";
  const referer = req.headers.get("referer") ?? null;

  const event = {
    id: Date.now().toString(),
    type: body.type ?? "event",
    project: body.project ?? null,
    name: body.name ?? null,
    action: body.action ?? null,
    page: body.page ?? null,
    // server-scraped
    ip,
    ua,
    lang,
    referer,
    // client-scraped (passed from browser)
    timezone: body.timezone ?? null,
    screen: body.screen ?? null,
    device: body.device ?? null,
    os: body.os ?? null,
    browser: body.browser ?? null,
    createdAt: new Date().toISOString(),
  };

  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(`event:${event.id}`, event);
    await kv.sadd("events", event.id);
    // keep only latest 500 events to avoid unbounded growth
    const all = await kv.smembers("events") as string[];
    if (all.length > 500) {
      const oldest = all.sort()[0];
      await kv.del(`event:${oldest}`);
      await kv.srem("events", oldest);
    }
  } catch {}

  return NextResponse.json({ ok: true });
}
