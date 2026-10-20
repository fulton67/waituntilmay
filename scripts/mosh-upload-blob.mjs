/**
 * Push the generated mosh-lab layers, motion-vector overlays and preview
 * grids to the existing Vercel Blob store, and rewrite the compare manifests
 * to point at them.
 *
 * Only generated files go to Blob. The source clips stay in the repo: they
 * are small, they are the inputs rather than outputs, and keeping them local
 * means the page has something to show even if Blob is unreachable. The
 * manifest also stays local, so the compare page has no cross-origin fetch to
 * make before it can start.
 *
 *   npx vercel env pull .env.local --environment=production
 *   node --env-file=.env.local scripts/mosh-upload-blob.mjs --dry-run
 *   node --env-file=.env.local scripts/mosh-upload-blob.mjs
 */
import { put } from "@vercel/blob";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { statSync, existsSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const dryRun = args.includes("--dry-run");
const DIR = argOf("--dir", "public/mosh-lab");
const PREFIX = (argOf("--prefix", "mosh-lab")).replace(/^\/|\/$/g, "");

/** inputs, not outputs - these stay in git */
const KEEP_LOCAL = new Set(["blum-clip.mp4", "blum-clip-internet.mp4", "test-clip.mp4"]);

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token && !dryRun) {
  console.error("BLOB_READ_WRITE_TOKEN is not set.\n"
    + "  npx vercel env pull .env.local --environment=production\n"
    + "  node --env-file=.env.local scripts/mosh-upload-blob.mjs");
  process.exit(1);
}

const top = (await readdir(DIR)).filter((f) => f.endsWith(".mp4") && !KEEP_LOCAL.has(f));
const prevDir = path.join(DIR, "previews");
const prev = existsSync(prevDir)
  ? (await readdir(prevDir)).filter((f) => f.endsWith(".mp4")).map((f) => path.join("previews", f))
  : [];
const files = [...top, ...prev];
if (!files.length) { console.error(`nothing to upload in ${DIR}`); process.exit(1); }

const mb = (n) => (n / 1e6).toFixed(2);
const total = files.reduce((n, f) => n + statSync(path.join(DIR, f)).size, 0);
console.log(`${files.length} files, ${mb(total)} MB -> blob prefix "${PREFIX}/"`);
console.log(`keeping local (source clips): ${[...KEEP_LOCAL].join(", ")}`);

if (dryRun) {
  for (const f of files) {
    console.log(`  would upload ${f.padEnd(44)} ${mb(statSync(path.join(DIR, f)).size).padStart(7)} MB`);
  }
  console.log("\ndry run - nothing uploaded");
  process.exit(0);
}

const urls = new Map();
for (const [i, f] of files.entries()) {
  const body = await readFile(path.join(DIR, f));
  const { url } = await put(`${PREFIX}/${path.basename(f)}`, body, {
    access: "public",
    contentType: "video/mp4",
    addRandomSuffix: false,          // stable URLs across re-uploads
    allowOverwrite: true,
    cacheControlMaxAge: 31536000,
    token,
  });
  urls.set(path.basename(f), url);
  console.log(`  [${String(i + 1).padStart(2)}/${files.length}] ${path.basename(f).padEnd(44)} -> ${url}`);
}

// ---- rewrite every compare manifest to point at Blob
const manifests = (await readdir(DIR)).filter((f) => f.endsWith("-compare.json"));
for (const m of manifests) {
  const p = path.join(DIR, m);
  const j = JSON.parse(await readFile(p, "utf8"));
  let n = 0;
  for (const l of j.layers ?? []) {
    for (const k of ["video", "mv"]) {
      const base = path.basename(l[k] ?? "");
      if (urls.has(base)) { l[k] = urls.get(base); n++; }
    }
  }
  for (const k of Object.keys(j.previews ?? {})) {
    const base = path.basename(j.previews[k]);
    if (urls.has(base)) { j.previews[k] = urls.get(base); n++; }
  }
  j.blobPrefix = PREFIX;
  await writeFile(p, JSON.stringify(j, null, 1));
  console.log(`  rewrote ${m}: ${n} urls -> blob`);
}

console.log(`\nuploaded ${urls.size} files, ${mb(total)} MB`);
console.log("manifests stay local and committed; the layers now come from Blob.");
