/**
 * Publish a look to the piece, and report what happened to it.
 *
 * POST writes journey/look.json and queues a re-layer: the clip bank is
 * re-shaded with these settings, the live thirty are re-assembled from the
 * same seeds, and the result is uploaded under its own hash and the manifest
 * flipped to it. GET returns where that has got to, which is what
 * /mosh-lab/tune polls.
 *
 * Two deployments, two ways of queueing, because the lab is public and the
 * machine with ffglitch and a GPU on it is not:
 *
 *   development  the file is written to the repository and
 *                scripts/relayer.cmd is spawned here and now.
 *   production    there is no ffglitch and no writable repository, so the
 *                look and a job go to Blob and the nightly task's
 *                scripts/relayer.cmd picks them up. Publishing therefore
 *                means "queued", not "done", and the state says so.
 *
 * The status is read from the same two places in the same order: the local
 * file if there is one, otherwise Blob, so the lab shows real progress in
 * both deployments.
 */
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEV = process.env.NODE_ENV !== "production";
const LOOK = path.join(process.cwd(), "journey", "look.json");
const STATUS = path.join(process.cwd(), "journey", "relayer-status.json");
const BLOB_BASE =
  "https://6gou1uitbmkd2uvc.public.blob.vercel-storage.com";

async function localStatus() {
  try {
    return JSON.parse(await readFile(STATUS, "utf8"));
  } catch {
    return null;
  }
}

async function blobStatus() {
  try {
    const r = await fetch(`${BLOB_BASE}/journey/relayer-status.json?t=${Date.now()}`,
      { cache: "no-store" });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const job = (await localStatus()) ?? (await blobStatus());
  return Response.json({ job, writable: DEV }, {
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(request: Request) {
  let body: { look?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "body must be JSON" }, { status: 400 });
  }
  const look = body.look;
  if (!look || typeof look !== "object") {
    return Response.json({ error: "look must be an object" }, { status: 400 });
  }
  // One serialisation, so the hash of the bytes is the same hash the shader
  // and the assembler compute. They hash the file rather than re-serialise
  // what is in it, because JavaScript and Python do not agree on how to
  // write a float and 1.0 against 1 is enough to disagree about which look
  // is live. Written with LF only, which is also what they normalise to:
  // a checkout that rewrites line endings must not be able to rename a
  // look.
  const text = (JSON.stringify(look, null, 1) + "\n").replace(/\r\n/g, "\n");
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256",
      new TextEncoder().encode(text))))
    .map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 8);

  if (DEV) {
    // One at a time. A re-layer is minutes of work and two of them would
    // race over the same bank directory and the same renders; a second
    // press is almost always impatience rather than a second look.
    const running = await localStatus();
    const live = running && !["live", "failed"].includes(running.state)
      && Date.now() - Date.parse(running.started ?? 0) < 3 * 3600_000;
    if (live) {
      return Response.json(
        { error: `a re-layer is already ${running.state}`, job: running },
        { status: 409 });
    }
    await mkdir(path.dirname(LOOK), { recursive: true });
    await writeFile(LOOK, text, "utf8");
    const job = { state: "queued", hash, started: new Date().toISOString() };
    await writeFile(STATUS, JSON.stringify(job, null, 1), "utf8");
    // Detached: a re-layer is minutes of work and the request is not going
    // to wait for it. Progress comes back through the status file.
    const child = spawn(process.platform === "win32" ? "cmd" : "sh",
      process.platform === "win32"
        ? ["/c", "scripts\\relayer.cmd", "--job", "local"]
        : ["scripts/relayer.cmd", "--job", "local"],
      { cwd: process.cwd(), detached: true, stdio: "ignore" });
    child.unref();
    return Response.json({ ok: true, hash, where: "local", job });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return Response.json(
      { error: "no blob token in this deployment, so nothing can be queued" },
      { status: 503 });
  }
  const { put } = await import("@vercel/blob");
  const common = {
    access: "public" as const, contentType: "application/json",
    addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 5,
    token,
  };
  await put("journey/look.json", text, common);
  const job = {
    state: "queued", hash, requested: new Date().toISOString(),
    requested_by: "tune",
  };
  await put("journey/relayer-job.json", JSON.stringify(job, null, 1), common);
  await put("journey/relayer-status.json", JSON.stringify(job, null, 1),
    common);
  return Response.json({ ok: true, hash, where: "blob", job });
}
