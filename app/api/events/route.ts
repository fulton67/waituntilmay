import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  try {
    const { kv } = await import("@vercel/kv");
    const ids = await kv.smembers("events") as string[];
    if (!ids.length) return NextResponse.json([]);
    const events = await Promise.all(ids.map((id: string) => kv.get(`event:${id}`)));
    let filtered = events.filter(Boolean) as Record<string, unknown>[];
    if (type) filtered = filtered.filter(e => e.type === type);
    filtered.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
    return NextResponse.json(filtered);
  } catch {
    return NextResponse.json([]);
  }
}
