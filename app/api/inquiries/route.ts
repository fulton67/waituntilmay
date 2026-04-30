import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { kv } = await import("@vercel/kv");
    const ids = await kv.smembers<string[]>("inquiries");
    if (!ids || ids.length === 0) return NextResponse.json([]);
    const items = await Promise.all(ids.map((id) => kv.get(`inquiry:${id}`)));
    const sorted = items
      .filter(Boolean)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json(sorted);
  } catch {
    return NextResponse.json([]);
  }
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  try {
    const { kv } = await import("@vercel/kv");
    await kv.del(`inquiry:${id}`);
    await kv.srem("inquiries", id);
  } catch {}
  return NextResponse.json({ ok: true });
}
