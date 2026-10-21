/**
 * Read and write the tuning lab's settings on disk.
 *
 * The lab has to be able to hand a preset to the offline renderer, and the
 * renderer reads config/composite.json, so the browser needs a way to put it
 * there. That is a write into the repository from an HTTP request, so it is
 * refused outside development: the site is public, and a public endpoint that
 * writes files in the deployment is not something to leave lying around.
 * On the deployed page the export button degrades to a JSON download.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const CONFIG = path.join(process.cwd(), "config", "composite.json");
const PRESETS = path.join(process.cwd(), "config", "composite-presets.json");

const devOnly = () =>
  process.env.NODE_ENV === "production"
    ? Response.json(
        { error: "disabled outside development" }, { status: 403 })
    : null;

async function readJson(p: string, fallback: unknown) {
  try {
    return JSON.parse(await readFile(p, "utf8"));
  } catch {
    return fallback;
  }
}

export async function GET() {
  return Response.json({
    config: await readJson(CONFIG, null),
    presets: await readJson(PRESETS, {}),
    writable: process.env.NODE_ENV !== "production",
  });
}

export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  let body: { what?: string; config?: unknown; presets?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "body must be JSON" }, { status: 400 });
  }

  await mkdir(path.dirname(CONFIG), { recursive: true });
  if (body.what === "config") {
    if (!body.config || typeof body.config !== "object") {
      return Response.json({ error: "config must be an object" }, { status: 400 });
    }
    await writeFile(CONFIG, JSON.stringify(body.config, null, 2) + "\n", "utf8");
    return Response.json({ ok: true, wrote: "config/composite.json" });
  }
  if (body.what === "presets") {
    if (!body.presets || typeof body.presets !== "object") {
      return Response.json({ error: "presets must be an object" }, { status: 400 });
    }
    await writeFile(PRESETS, JSON.stringify(body.presets, null, 2) + "\n", "utf8");
    return Response.json({ ok: true, wrote: "config/composite-presets.json" });
  }
  return Response.json({ error: "what must be config or presets" }, { status: 400 });
}
