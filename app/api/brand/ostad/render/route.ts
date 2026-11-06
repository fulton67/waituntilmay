/**
 * Server PNG render for the Ostad post builder (/brand/ostad/make).
 *
 * Opens this site's own /brand/ostad/kit/templates/render.html in headless Chromium through
 * brand/scripts/render_posts.cjs. brand/post.py uses the same script, so every exit renders identical template code, and the
 * Adobe Fonts kit loads because the page is on a kit domain (localhost, 127.0.0.1, waituntilmay.com).
 * One page returns image/png; more than one page, or format "zip", returns a zip of numbered PNGs.
 *
 * Local only by default, like /api/render-real: the Vercel deployment has no Chromium. Set OSTAD_RENDERER=on where a browser
 * exists. Otherwise GET reports { available: false } and the builder says so instead of failing (brand/DECISIONS.md 48).
 */
import { createRequire } from "node:module";
import path from "node:path";
import JSZip from "jszip";

export const runtime = "nodejs";
export const maxDuration = 60;

type Job = { out: string | null; files: Buffer[]; fonts: string; warnings: string[]; pages: number; errors: string[] };
type Renderer = { renderJobs: (jobs: { spec: unknown; out: null }[], opts: { base: string }) => Promise<Job[]> };

const available = () => process.env.NODE_ENV !== "production" || process.env.OSTAD_RENDERER === "on";
const SIZES = new Set(["4x5", "1x1", "9x16"]);
const KIT_HOSTS = new Set(["localhost", "127.0.0.1", "waituntilmay.com", "www.waituntilmay.com"]);
// images may only be inline data or the kit's own sample photos: the headless browser must not fetch arbitrary URLs
const okImage = (v: unknown) => typeof v !== "string" || !/^(https?:|\/\/|\/)/i.test(v) || v.startsWith("/brand/ostad/kit/");

function validate(spec: unknown): string | null {
  const s = spec as { size?: string; slides?: { template?: string; slots?: Record<string, unknown> }[] };
  if (!s || typeof s !== "object") return "spec missing";
  if (!SIZES.has(String(s.size))) return "size must be 4x5, 1x1 or 9x16";
  if (!Array.isArray(s.slides) || s.slides.length < 1 || s.slides.length > 20) return "slides: 1 to 20";
  for (const sl of s.slides) {
    if (typeof sl.template !== "string") return "slide template missing";
    for (const v of Object.values(sl.slots || {})) if (!okImage(v)) return "images must be dropped files or kit photos";
  }
  return null;
}

export async function GET() {
  return Response.json({ available: available() });
}

export async function POST(request: Request) {
  if (!available()) return Response.json({ error: "The server renderer runs locally (no Chromium on this deployment)." }, { status: 503 });
  let body: { spec?: unknown; format?: string; name?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "bad JSON" }, { status: 400 }); }
  const bad = validate(body.spec);
  if (bad) return Response.json({ error: bad }, { status: 400 });

  const url = new URL(request.url);
  const base = KIT_HOSTS.has(url.hostname) ? url.origin : `http://localhost:${process.env.PORT || 3000}`;
  const req = createRequire(path.join(process.cwd(), "package.json"));
  const { renderJobs } = req(path.join(process.cwd(), "brand", "scripts", "render_posts.cjs")) as Renderer;

  let job: Job;
  try { [job] = await renderJobs([{ spec: body.spec, out: null }], { base }); }
  catch (e) { return Response.json({ error: `render failed: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 }); }

  const name = String(body.name || "ostad-post").replace(/[^\w.-]+/g, "-").slice(0, 60) || "ostad-post";
  const headers: Record<string, string> = {
    "X-Ok-Fonts": job.fonts, "X-Ok-Pages": String(job.pages),
    "X-Ok-Warnings": encodeURIComponent(JSON.stringify(job.warnings)), "X-Ok-Errors": String(job.errors.length), "Cache-Control": "no-store",
  };
  if (job.files.length === 1 && body.format !== "zip") {
    return new Response(new Uint8Array(job.files[0]), { headers: { ...headers, "Content-Type": "image/png", "Content-Disposition": `attachment; filename="${name}.png"` } });
  }
  const zip = new JSZip();
  job.files.forEach((b, i) => zip.file(`${name}-${String(i + 1).padStart(2, "0")}.png`, b));
  const out = await zip.generateAsync({ type: "uint8array", compression: "STORE" });
  return new Response(out as BodyInit, { headers: { ...headers, "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${name}.zip"` } });
}
