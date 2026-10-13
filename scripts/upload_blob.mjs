/**
 * Upload the web-encoded renders to Vercel Blob and write the player manifest.
 *
 * The manifest is written LOCALLY to public/journey/manifest.json and holds
 * absolute Blob URLs. Only the videos live on Blob, so the page has no
 * cross-origin fetch to make before it can start, and swapping hosts later is
 * a manifest change rather than a code change.
 *
 *   # token is read from the environment - never pass it on the command line
 *   npx vercel env pull .env.local        # or: export BLOB_READ_WRITE_TOKEN=...
 *   node --env-file=.env.local scripts/upload_blob.mjs
 *
 *   --dry-run   list what would be uploaded, upload nothing
 *   --prefix    blob path prefix (default: journey)
 */
import { put } from "@vercel/blob";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { statSync } from "node:fs";
import path from "node:path";

const SRC = "renders/web";
const MANIFEST = "public/journey/manifest.json";
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const pi = args.indexOf("--prefix");
const prefix = (pi >= 0 ? args[pi + 1] : "journey").replace(/^\/|\/$/g, "");

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token && !dryRun) {
  console.error(
    "BLOB_READ_WRITE_TOKEN is not set.\n" +
    "  npx vercel env pull .env.local\n" +
    "  node --env-file=.env.local scripts/upload_blob.mjs"
  );
  process.exit(1);
}

const files = (await readdir(SRC))
  .filter((f) => f.endsWith(".mp4"))
  .sort();
if (files.length === 0) {
  console.error(`no .mp4 files in ${SRC} - run scripts/build_web.py first`);
  process.exit(1);
}

const totalMb = files.reduce(
  (n, f) => n + statSync(path.join(SRC, f)).size / 1e6, 0);
console.log(`${files.length} files, ${totalMb.toFixed(1)} MB -> blob prefix "${prefix}/"`);

if (dryRun) {
  for (const f of files) {
    console.log(`  would upload ${f} ` +
      `(${(statSync(path.join(SRC, f)).size / 1e6).toFixed(2)} MB)`);
  }
  console.log("\ndry run - nothing uploaded");
  process.exit(0);
}

const urls = [];
for (const [i, f] of files.entries()) {
  const body = await readFile(path.join(SRC, f));
  const { url } = await put(`${prefix}/${f}`, body, {
    access: "public",
    contentType: "video/mp4",
    addRandomSuffix: false,      // keeps URLs stable across re-uploads
    allowOverwrite: true,
    cacheControlMaxAge: 31536000,
    token,
  });
  urls.push(url);
  console.log(`  [${String(i + 1).padStart(2)}/${files.length}] ${f} -> ${url}`);
}

await mkdir(path.dirname(MANIFEST), { recursive: true });
await writeFile(MANIFEST, JSON.stringify(
  { files: urls, count: urls.length, seconds_each: 30.0 }, null, 1));
console.log(`\nwrote ${MANIFEST} with ${urls.length} absolute URLs`);
console.log("commit that file and deploy; no env var needed.");
