import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const { kv } = await import("@vercel/kv");
    const data = await kv.get(`collection:${slug}`);
    if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "kv error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const { kv } = await import("@vercel/kv");
    await kv.del(`collection:${slug}`);
    await kv.srem("collections", slug);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "kv error" }, { status: 500 });
  }
}
