import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") ?? "";
  const rest = new URLSearchParams();
  searchParams.forEach((v, k) => { if (k !== "path") rest.set(k, v); });
  const qs = rest.toString();
  const url = `https://api.are.na/v2${path}${qs ? `?${qs}` : ""}`;
  try {
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "arena api error" }, { status: 500 });
  }
}
