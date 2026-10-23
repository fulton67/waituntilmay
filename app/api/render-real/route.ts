/**
 * Run the real ffgac pipeline on the settings the lab currently has.
 *
 * The preview is a WebGL composite of decoded frames, and there is one
 * thing it structurally cannot show: by the time a frame reaches WebGL its
 * motion vectors are gone, so a preview can only draw a picture of a
 * datamosh. This encodes one. The surface multiplies the vectors the
 * encoder emitted itself, the underlayer is driven by that same amplified
 * field, and single pixels exchange between the two where they disagree -
 * which is why the button is worth pressing rather than trusting the
 * preview.
 *
 * Dev only, like the config write: the deployment has no ffmpeg, no ffgac
 * and no business running either on request. On the deployed page the
 * button says so instead of failing.
 */
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const OUT_DIR = path.join(process.cwd(), "public", "mosh-lab", "real");

export async function GET() {
  return Response.json({ available: process.env.NODE_ENV !== "production" });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json(
      { error: "the real render needs ffgac, which only exists in development" },
      { status: 403 });
  }

  let body: { config?: unknown; frames?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "body must be JSON" }, { status: 400 });
  }
  if (!body.config || typeof body.config !== "object") {
    return Response.json({ error: "config must be an object" }, { status: 400 });
  }

  // NOT inside OUT_DIR: ffgac-mosh.mjs clears its output directory before it
  // starts, so a config written in there is deleted before it is read.
  await mkdir(path.dirname(OUT_DIR), { recursive: true });
  const cfgPath = path.join(path.dirname(OUT_DIR), "real-render-config.json");
  await writeFile(cfgPath, JSON.stringify(body.config, null, 2), "utf8");

  const frames = Math.max(30, Math.min(300, Number(body.frames) || 300));
  const started = Date.now();
  try {
    const { stdout } = await run("node", [
      "scripts/exchange-mosh.mjs",
      "--config", path.relative(process.cwd(), cfgPath),
      "--frames", String(frames),
      "--outdir", ".exchange-real",
      "--pubdir", path.relative(process.cwd(), OUT_DIR),
      "--name", "real",
      "--report", "public/mosh-lab/real/evidence.json",
    ], { cwd: process.cwd(), maxBuffer: 1 << 26 });
    return Response.json({
      ok: true,
      // cache-busted, because the file is overwritten in place every run
      video: `/mosh-lab/real/real.mp4?t=${Date.now()}`,
      surface: `/mosh-lab/real/real-A.mp4?t=${Date.now()}`,
      underlayer: `/mosh-lab/real/real-B.mp4?t=${Date.now()}`,
      evidence: `/mosh-lab/real/evidence.json?t=${Date.now()}`,
      seconds: (Date.now() - started) / 1000,
      log: stdout.split("\n").slice(-24).join("\n"),
    });
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    return Response.json({
      error: "ffgac pipeline failed",
      detail: (err.stderr || err.stdout || err.message || "")
        .split("\n").slice(-12).join("\n"),
    }, { status: 500 });
  }
}
