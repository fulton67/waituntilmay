import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface Collection {
  slug: string;
  title: string;
  description: string;
  format: "download" | "pitch-deck";
  images: string[];
  brand: {
    name: string;
    tagline: string;
    description: string;
    audience: string;
    colors: string;
  };
  createdAt: string;
}

export async function GET() {
  try {
    const { kv } = await import("@vercel/kv");
    const slugs = await kv.smembers("collections") as string[];
    if (!slugs.length) return NextResponse.json([]);
    const all = await Promise.all(slugs.map((s: string) => kv.get(`collection:${s}`)));
    return NextResponse.json(all.filter(Boolean));
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const body: Collection = await req.json();
  if (!body.slug || !body.title) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(`collection:${body.slug}`, { ...body, createdAt: new Date().toISOString() });
    await kv.sadd("collections", body.slug);
    return NextResponse.json({ ok: true, url: `/w/${body.slug}` });
  } catch {
    return NextResponse.json({ error: "kv error" }, { status: 500 });
  }
}
