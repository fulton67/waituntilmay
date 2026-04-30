import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { kv } = await import("@vercel/kv");
    const ids = await kv.smembers("notifications");
    if (!ids || ids.length === 0) return NextResponse.json([]);
    const events = await Promise.all(ids.map((id: string) => kv.get(`notification:${id}`)));
    const sorted = events
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json(sorted);
  } catch {
    return NextResponse.json([]);
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    const { kv } = await import("@vercel/kv");
    await kv.del(`notification:${id}`);
    await kv.srem("notifications", id);
  } catch {}
  return NextResponse.json({ ok: true });
}
