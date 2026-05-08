import { NextRequest, NextResponse } from "next/server";
import { list, put, del } from "@vercel/blob";

export const dynamic = "force-dynamic";

export interface HarvestSubmission {
  id: string;
  theme: string;
  name: string;
  images: string[];
  submittedAt: string;
  visible: boolean;
}

// Themes that aggregate multiple blob sources
const THEME_SOURCES: Record<string, string[]> = {
  "im-starting-to-become-a-hoarder": ["something-to-eat", "im-starting-to-become-a-hoarder"],
};

function prefix(theme: string) {
  return `harvest/${theme}/submissions/`;
}

async function fetchFromPrefix(p: string): Promise<HarvestSubmission[]> {
  const { blobs } = await list({ prefix: p });
  const results = await Promise.all(
    blobs.map(b =>
      fetch(b.url, { cache: "no-store" })
        .then(r => r.json())
        .catch(() => null)
    )
  );
  return (results.filter(Boolean) as HarvestSubmission[]).filter(s => s.visible !== false);
}

export async function GET(req: NextRequest) {
  const theme = req.nextUrl.searchParams.get("theme") ?? "im-starting-to-become-a-hoarder";
  try {
    const sources = THEME_SOURCES[theme] ?? [theme];
    const batches = await Promise.all(sources.map(t => fetchFromPrefix(prefix(t))));
    const seen = new Set<string>();
    const merged: HarvestSubmission[] = [];
    for (const batch of batches) {
      for (const sub of batch) {
        if (!seen.has(sub.id)) { seen.add(sub.id); merged.push(sub); }
      }
    }
    merged.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
    return NextResponse.json(merged);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name   = typeof body.name   === "string" ? body.name.trim().slice(0, 100)   : "";
  const theme  = typeof body.theme  === "string" ? body.theme.trim().slice(0, 80)   : "";
  const images = Array.isArray(body.images) ? (body.images as string[]).slice(0, 6) : [];

  if (!name || !theme || !images.length) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const submission: HarvestSubmission = {
    id, theme, name, images,
    submittedAt: new Date().toISOString(),
    visible: true,
  };

  await put(
    `${prefix(theme)}${id}.json`,
    JSON.stringify(submission),
    { access: "public", contentType: "application/json", allowOverwrite: true }
  );

  return NextResponse.json({ ok: true, submission });
}

export async function PATCH(req: NextRequest) {
  const { theme, id, visible } = await req.json();
  const { blobs } = await list({ prefix: `${prefix(theme)}${id}.json` });
  if (!blobs.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  const current: HarvestSubmission = await fetch(blobs[0].url, { cache: "no-store" }).then(r => r.json());
  await put(
    `${prefix(theme)}${id}.json`,
    JSON.stringify({ ...current, visible }),
    { access: "public", contentType: "application/json", allowOverwrite: true }
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { theme, id } = await req.json();
  const { blobs } = await list({ prefix: `${prefix(theme)}${id}.json` });
  if (blobs.length) await del(blobs[0].url);
  return NextResponse.json({ ok: true });
}
