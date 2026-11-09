/**
 * Re-shade the bank, re-assemble the live thirty, put them live.
 *
 * This is what "publish look" in /mosh-lab/tune actually runs. The sliders
 * write journey/look.json and this does the rest, in one place, so the look
 * that is live is the look that was published rather than something a person
 * reproduced by hand afterwards:
 *
 *   1  shade     every bank clip under the new look (scripts/shade_bank.mjs)
 *   2  assemble  the same thirty seeds (assemble_bank.py)
 *   3  verify    every gate (scripts/verify_arc.py); a failure stops here
 *   4  encode    for the web (scripts/build_web.py)
 *   5  upload    to journey-arc-<hash>/ and flip journey-arc/manifest.json
 *
 * The flip is a manifest write, not a deploy. The player reads
 * journey-arc/manifest.json and that manifest holds absolute URLs, so the
 * videos can live under a prefix of their own per look while the address the
 * player knows never changes. The previous manifest is kept beside the new
 * one as manifest-<previous hash>.json, so a flip is reversible.
 *
 * Two ways in, because the lab is public and the machine that can render is
 * not:
 *
 *   --job local   use journey/look.json as it is on disk. This is what the
 *                 development server spawns when "publish look" is pressed.
 *   --job blob    look for a job on Blob, written by the deployed lab, and
 *                 run that. Exits quietly when there is nothing queued,
 *                 which is what makes it safe for the nightly task.
 *
 * Progress is written to journey/relayer-status.json after every stage, and
 * to Blob as well when there is a token, which is what the lab polls:
 * queued -> shading n/N -> assembling n/30 -> uploading -> live.
 *
 *   node --env-file=.env.local scripts/relayer.mjs
 *   node --env-file=.env.local scripts/relayer.mjs --job blob
 *   node scripts/relayer.mjs --skip-upload --seeds 1-3
 */
import { put, list, del } from "@vercel/blob";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };

const JOB_SRC = argOf("--job", "local");          // local | blob
const LOOK = argOf("--look", "journey/look.json");
const SEEDS = argOf("--seeds", "1-30");
const RENDERS = argOf("--renders", "renders_bank");
const WEB = argOf("--web", "renders_bank/web");
// The shipped geometry, which is not the render's own. The footage is 360p
// and upscaling adds no detail, but the browser would upscale it anyway on
// any screen worth looking at, and it would do it smoothly - which rounds
// off the hard 16-pixel edges the whole look is made of. Nearest-neighbour
// to 720p keeps them square. crf 31 rather than the 24 the look-less pool
// used, because the look is grain and grain is expensive, and the feather
// is more grain: measured over the whole batch at 720p, crf 29 came to
// 212.2 MB with three of the thirty over the 8 MB budget (max 8.44), and
// 31 to 164.0 MB with a maximum of 6.54. Before the feather the same
// batch fitted at 29, which is the size of what the skirt adds.
const HEIGHT = argOf("--height", "720");
const CRF = argOf("--crf", "31");
const BASE_PREFIX = argOf("--prefix-base", "journey-arc");
const LIVE_PREFIX = argOf("--live-prefix", "journey-arc");
const SKIP_UPLOAD = has("--skip-upload");
const SKIP_SHADE = has("--skip-shade");
const PY = existsSync(".venv/Scripts/python.exe")
  ? ".venv/Scripts/python.exe" : "python";
// -u, because the status is parsed out of the child's stdout and Python
// buffers stdout when it is a pipe rather than a terminal: without it the
// whole assemble stage arrives in one burst at the end and "assembling
// n/30" never counts.
const PYARGS = ["-u"];
const STATUS = path.join("journey", "relayer-status.json");
const JOB = "journey/relayer-job.json";
const LOOK_BLOB = "journey/look.json";

const token = process.env.BLOB_READ_WRITE_TOKEN || null;

/* ---------------------------------------------------------------- status */
let job = { state: "queued", started: new Date().toISOString() };
const t0 = Date.now();

async function say(patch) {
  job = { ...job, ...patch, seconds: +((Date.now() - t0) / 1000).toFixed(1) };
  await mkdir("journey", { recursive: true });
  await writeFile(STATUS, JSON.stringify(job, null, 1));
  if (token) {
    try {
      await put("journey/relayer-status.json", JSON.stringify(job, null, 1), {
        access: "public", contentType: "application/json",
        addRandomSuffix: false, allowOverwrite: true,
        cacheControlMaxAge: 5, token,
      });
    } catch (e) {
      console.error(`  (status not published: ${e.message})`);
    }
  }
  console.log(`[${job.state}] ` + JSON.stringify(
    Object.fromEntries(Object.entries(job).filter(
      ([k]) => !["started", "state"].includes(k)))));
}

/** Run a child, streaming its output, and let a matcher update the status. */
function run(cmd, argv, onLine) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, argv, { stdio: ["ignore", "pipe", "pipe"] });
    let tail = "";
    const feed = (buf) => {
      const text = tail + buf.toString("utf8");
      const lines = text.split(/\r?\n/);
      tail = lines.pop() ?? "";
      for (const l of lines) {
        console.log(`    ${l}`);
        if (onLine) onLine(l);
      }
    };
    p.stdout.on("data", feed);
    p.stderr.on("data", feed);
    p.on("close", (code) => (code === 0 ? res()
      : rej(new Error(`${path.basename(cmd)} ${argv[0] ?? ""} exited ${code}`))));
  });
}

/* ------------------------------------------------------------- the job in */
async function pullJob() {
  if (JOB_SRC !== "blob") return { hash: hashOf(LOOK), from: "local" };
  if (!token) throw new Error("--job blob needs BLOB_READ_WRITE_TOKEN");
  const { blobs } = await list({ prefix: "journey/relayer-", token });
  const hit = blobs.find((b) => b.pathname === JOB);
  if (!hit) return null;
  const q = await (await fetch(`${hit.url}?t=${Date.now()}`,
    { cache: "no-store" })).json();
  const lk = await list({ prefix: LOOK_BLOB, token });
  const lb = lk.blobs.find((b) => b.pathname === LOOK_BLOB);
  if (!lb) throw new Error(`${JOB} is queued but ${LOOK_BLOB} is not there`);
  // Write it to disk under its own name first and only then over the live
  // one, so a half-downloaded look cannot become the look.
  const body = Buffer.from(await (await fetch(`${lb.url}?t=${Date.now()}`,
    { cache: "no-store" })).arrayBuffer());
  await mkdir("journey", { recursive: true });
  await writeFile(LOOK, body);
  return { hash: hashOf(LOOK), from: "blob", queued: q.requested ?? null,
    blob: hit.url };
}

/** The same hash pipeline/bank.py computes: bytes, line endings normalised. */
function hashOf(p) {
  const raw = readFileSync(p).toString("binary").split("\r\n").join("\n");
  return createHash("sha256").update(Buffer.from(raw, "binary"))
    .digest("hex").slice(0, 8);
}

/* ------------------------------------------------------------------ main */
const q = await pullJob();
if (!q) {
  console.log("nothing queued");
  process.exit(0);
}
const HASH = q.hash;
const look = JSON.parse(await readFile(LOOK, "utf8"));
const PREFIX = `${BASE_PREFIX}-${HASH}`;
const clips = JSON.parse(await readFile("bank/bank.json", "utf8")).clips.length;
const seeds = (() => {
  const out = [];
  for (const part of SEEDS.split(",")) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number);
      for (let i = a; i <= b; i++) out.push(i);
    } else out.push(Number(part));
  }
  return out;
})();

console.log(`look ${HASH} (${q.from})  fold ${look.fold?.amount} `
  + `${look.fold?.where}  underlayer ${look.underlayer?.strength}`);
console.log(`${clips} bank clips, ${seeds.length} versions -> ${PREFIX}/`);

await say({ state: "queued", hash: HASH, shadeTotal: clips,
  assembleTotal: seeds.length });

try {
  /* ---- 1. shade */
  if (!SKIP_SHADE) {
    await say({ state: "shading", shaded: 0 });
    let n = 0;
    await run("node", ["scripts/shade_bank.mjs", "--look", LOOK], (l) => {
      const m = /^\s*(\d+)\/(\d+)\s+\S+\s+\d+f/.exec(l);
      if (m && Number(m[1]) > n) {
        n = Number(m[1]);
        if (n % 5 === 0 || n === clips) say({ state: "shading", shaded: n });
      }
    });
    await say({ state: "shading", shaded: clips });
  }

  /* ---- 2. assemble */
  await say({ state: "assembling", assembled: 0 });
  let done = 0;
  await run(PY, [...PYARGS, "assemble_bank.py", "--seeds", SEEDS,
    "--outdir", RENDERS, "--look", HASH], (l) => {
    if (/^\s*seed\s+\d+\s+\d+ phrases/.test(l)) {
      done += 1;
      if (done % 3 === 0 || done === seeds.length) {
        say({ state: "assembling", assembled: done });
      }
    }
  });
  await say({ state: "assembling", assembled: seeds.length });

  /* ---- 3. verify. A look that does not pass does not go live. */
  await say({ state: "verifying" });
  await run(PY, [...PYARGS, "scripts/verify_arc.py", "--dir", RENDERS,
    "--no-text"]);

  /* ---- 4. the web encode */
  await say({ state: "encoding" });
  await run(PY, [...PYARGS, "scripts/build_web.py", "--src", RENDERS,
    "--out", WEB, "--height", HEIGHT, "--crf", CRF, "--budget-mb", "8.0"]);

  /* ---- 5. upload and flip */
  if (SKIP_UPLOAD) {
    await say({ state: "live", prefix: `${PREFIX} (not uploaded)` });
  } else {
    await say({ state: "uploading", prefix: PREFIX });
    // The previous manifest is kept beside the new one, so the flip can be
    // undone by copying one object back.
    const prev = await (async () => {
      const { blobs } = await list({
        prefix: `${LIVE_PREFIX}/manifest.json`, token });
      const hit = blobs.find((b) => b.pathname === `${LIVE_PREFIX}/manifest.json`);
      if (!hit) return null;
      const body = await (await fetch(`${hit.url}?t=${Date.now()}`,
        { cache: "no-store" })).text();
      let tag = "previous";
      try { tag = JSON.parse(body).look || tag; } catch { /* unnamed */ }
      await put(`${LIVE_PREFIX}/manifest-${tag}.json`, body, {
        access: "public", contentType: "application/json",
        addRandomSuffix: false, allowOverwrite: true,
        cacheControlMaxAge: 60, token,
      });
      return tag;
    })();
    if (prev) console.log(`    kept the old manifest as manifest-${prev}.json`);

    await run("node", ["scripts/upload_blob.mjs", "--src", WEB,
      "--prefix", PREFIX, "--also-prefix", LIVE_PREFIX,
      "--mix", RENDERS, "--look", HASH]);
    await say({ state: "live", prefix: PREFIX, replaced: prev });
  }

  /* ---- the job is done; take it off the queue so the nightly task does
          not run it again */
  if (q.from === "blob" && token) {
    try { await del(q.blob, { token }); } catch { /* already gone */ }
  }
  console.log(`\nlive: ${PREFIX}/  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
} catch (e) {
  await say({ state: "failed", message: e.message });
  console.error(`\nFAILED: ${e.message}`);
  process.exit(1);
}
