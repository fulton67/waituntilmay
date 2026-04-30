import { NextRequest, NextResponse } from "next/server";
import { getReels, setReelOrder, updateReel } from "@/lib/reels";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = req.nextUrl.searchParams.get("admin") === "1";
  try {
    const reels = await getReels(admin);
    return NextResponse.json(reels);
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as
      | { action: "reorder"; ids: string[] }
      | { action: "update"; id: string; weight?: 1 | 2 | 3; hidden?: boolean };

    if (body.action === "reorder") {
      if (!Array.isArray(body.ids)) return NextResponse.json({ error: "ids must be an array" }, { status: 400 });
      await setReelOrder(body.ids);
    } else if (body.action === "update") {
      const patch: { weight?: 1 | 2 | 3; hidden?: boolean } = {};
      if (body.weight !== undefined) patch.weight = body.weight;
      if (body.hidden !== undefined) patch.hidden = body.hidden;
      if (Object.keys(patch).length === 0) return NextResponse.json({ error: "no fields to update" }, { status: 400 });
      const found = await updateReel(body.id, patch);
      if (!found) return NextResponse.json({ error: "not found" }, { status: 404 });
    } else {
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
