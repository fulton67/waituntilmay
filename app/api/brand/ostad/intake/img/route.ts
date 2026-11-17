/**
 * One clinic photo for the grid planner and renderer: the catalog preview of an iCloud asset (clinic-library\previews\<row>.jpg).
 * Local only (the photos never leave this machine): 404 on the deployment. Only a numeric catalog row resolves; no paths.
 */
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const LIB = process.env.CLINIC_LIBRARY || path.join(process.env.USERPROFILE || process.env.HOME || "", "clinic-library");
const local = () => process.env.NODE_ENV !== "production" || process.env.OSTAD_RENDERER === "on";

export async function GET(req: Request) {
  const row = new URL(req.url).searchParams.get("row") || "";
  if (!local() || !/^\d{1,6}$/.test(row)) return new Response("not found", { status: 404 });
  const f = path.join(LIB, "previews", `${row.padStart(5, "0")}.jpg`);
  if (!fs.existsSync(f)) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(f)), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600", "X-Robots-Tag": "noindex" } });
}
