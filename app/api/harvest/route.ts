import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

export const dynamic = "force-dynamic";

const DATA_PATH = "data/harvest.json";

export interface HarvestImage {
  id: string;
  url: string;
  caption?: string;
}

async function readImages(): Promise<HarvestImage[]> {
  try {
    const { blobs } = await list({ prefix: DATA_PATH, limit: 1 });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    return res.json();
  } catch {
    return [];
  }
}

async function writeImages(images: HarvestImage[]): Promise<void> {
  await put(DATA_PATH, JSON.stringify(images), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
  });
}

export async function GET() {
  const images = await readImages();
  return NextResponse.json(images);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, url, caption, id } = body;
  try {
    if (action === "add") {
      const current = await readImages();
      const newImage: HarvestImage = { id: Date.now().toString(), url, caption };
      await writeImages([...current, newImage]);
      return NextResponse.json({ ok: true, image: newImage });
    }
    if (action === "remove") {
      const current = await readImages();
      await writeImages(current.filter(i => i.id !== id));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
