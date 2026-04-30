import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { project, name } = await req.json();
  const id = Date.now().toString();
  const event = { id, type: "download", project, name: name || null, createdAt: new Date().toISOString() };

  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(`notification:${id}`, event);
    await kv.sadd("notifications", id);
  } catch {}

  return NextResponse.json({ ok: true });
}
