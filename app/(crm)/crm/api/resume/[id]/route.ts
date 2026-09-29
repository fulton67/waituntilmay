import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getDb, schema } from "@/crm/db";
import { getViewer } from "@/crm/lib/auth";
import { supabaseConfig } from "@/crm/lib/env";
import { supabaseServer } from "@/crm/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCAL_DIR = path.join(process.cwd(), "crm", ".uploads");
const MAX_PDF = 10 * 1024 * 1024;

async function authorised() {
  return (await getViewer())?.role === "interviewer";
}

/** Download a candidate's resume PDF. Supabase: short-lived signed URL. Local: streamed from disk. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await authorised())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const db = await getDb();
  const [c] = await db.select().from(schema.candidates).where(eq(schema.candidates.id, id));
  if (!c?.resumeFileUrl) return NextResponse.json({ error: "No resume on file" }, { status: 404 });
  const filename = `${c.name.replace(/[^\w .-]+/g, "").trim() || "resume"} resume.pdf`;

  if (supabaseConfig()) {
    const supabase = await supabaseServer();
    const { data, error } = await supabase!.storage.from("resumes").createSignedUrl(c.resumeFileUrl, 60, { download: filename });
    if (error || !data) return NextResponse.json({ error: "Couldn't sign the download" }, { status: 502 });
    return NextResponse.redirect(data.signedUrl);
  }

  try {
    const file = await readFile(path.join(LOCAL_DIR, c.resumeFileUrl));
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}

/** Local-dev upload target (production uploads go straight to Supabase Storage from the browser). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (supabaseConfig()) return NextResponse.json({ error: "Upload to Supabase Storage instead" }, { status: 400 });
  if (!(await authorised())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await ctx.params;
  const form = await req.formData();
  const file = form.get("file");
  const rel = String(form.get("path") ?? "");
  const [dir, name] = rel.split("/");
  if (!UUID.test(id) || dir !== id || !/^[0-9a-f-]{36}\.pdf$/i.test(name ?? "")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  if (!(file instanceof File) || file.type !== "application/pdf") return NextResponse.json({ error: "Resumes must be PDFs." }, { status: 400 });
  if (file.size > MAX_PDF) return NextResponse.json({ error: "That PDF is over 10 MB." }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") return NextResponse.json({ error: "That file isn't a PDF." }, { status: 400 });
  await mkdir(path.join(LOCAL_DIR, id), { recursive: true });
  await writeFile(path.join(LOCAL_DIR, id, name), bytes);
  return NextResponse.json({ ok: true, path: rel });
}
