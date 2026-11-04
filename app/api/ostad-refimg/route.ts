import { NextRequest, NextResponse } from "next/server";
import refs from "../../ostad/data/refs.json";

/**
 * The original of one /ostad/refs image, fetched server-side so the gold-picks zip can include full-size files
 * (most hosts block cross-origin reads from the browser). Only ids in refs.json resolve: this is not an open proxy.
 */
export const dynamic = "force-dynamic";
const byId = new Map((refs as { id: string; u: string }[]).map((r) => [r.id, r.u]));
const MAX = 25 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const url = byId.get(id);
  if (!url) return NextResponse.json({ error: "unknown id" }, { status: 404 });
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", Accept: "image/*" },
      signal: AbortSignal.timeout(15000),
    });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return NextResponse.json({ error: `upstream ${res.status}` }, { status: 502 });
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX) return NextResponse.json({ error: "too large" }, { status: 413 });
    return new NextResponse(buf, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=86400", "X-Robots-Tag": "noindex" } });
  } catch {
    return NextResponse.json({ error: "upstream failed" }, { status: 502 });
  }
}
