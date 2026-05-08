import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const path = form.get("path") as string | null;

    if (!file || !path) {
      return NextResponse.json({ error: "missing file or path" }, { status: 400 });
    }
    if (!path.startsWith("harvest/")) {
      return NextResponse.json({ error: "invalid path" }, { status: 400 });
    }

    const blob = await put(path, file, {
      access: "public",
      allowOverwrite: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
