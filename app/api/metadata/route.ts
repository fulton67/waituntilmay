import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const asset = searchParams.get("asset");
  try {
    const { kv } = await import("@vercel/kv");
    if (asset) {
      const data = await kv.get(`metadata:${asset}`);
      return NextResponse.json(data ?? {});
    }
    const keys = await kv.keys("metadata:*");
    const all: Record<string, unknown> = {};
    await Promise.all(keys.map(async (k: string) => {
      all[k.replace("metadata:", "")] = await kv.get(k);
    }));
    return NextResponse.json(all);
  } catch {
    return NextResponse.json({});
  }
}

export async function POST(req: NextRequest) {
  const { asset, data } = await req.json();
  if (!asset) return NextResponse.json({ error: "missing asset" }, { status: 400 });
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(`metadata:${asset}`, { ...data, updatedAt: new Date().toISOString() });
  } catch {}
  return NextResponse.json({ ok: true });
}
