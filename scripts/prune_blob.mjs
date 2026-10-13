/**
 * Delete Blob objects under the journey/ prefix that the current manifest
 * does not reference.
 *
 * Replacing a batch leaves the previous one orphaned but still billed. This
 * removes exactly the unreferenced objects and nothing else: anything the
 * manifest points at is kept, so it cannot break the live page.
 *
 *   node --env-file=.env.local scripts/prune_blob.mjs --dry-run
 *   node --env-file=.env.local scripts/prune_blob.mjs
 */
import { list, del } from "@vercel/blob";
import { readFile } from "node:fs/promises";

const MANIFEST = "public/journey/manifest.json";
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const pi = args.indexOf("--prefix");
const prefix = (pi >= 0 ? args[pi + 1] : "journey").replace(/^\/|\/$/g, "");

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error("BLOB_READ_WRITE_TOKEN is not set (vercel env pull .env.local)");
  process.exit(1);
}

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const keep = new Set((manifest.files ?? []).map((u) => {
  try { return new URL(u).pathname.replace(/^\//, ""); } catch { return u; }
}));
if (keep.size === 0) {
  console.error("manifest lists no files - refusing to prune");
  process.exit(1);
}

const { blobs } = await list({ prefix: `${prefix}/`, limit: 1000, token });
const stale = blobs.filter((b) => !keep.has(b.pathname));
const kept = blobs.length - stale.length;

const mb = (n) => (n / 1e6).toFixed(1);
console.log(`prefix "${prefix}/": ${blobs.length} objects, ` +
  `${mb(blobs.reduce((n, b) => n + b.size, 0))} MB`);
console.log(`  referenced by manifest : ${kept}`);
console.log(`  unreferenced (stale)   : ${stale.length} ` +
  `(${mb(stale.reduce((n, b) => n + b.size, 0))} MB)`);

if (kept !== keep.size) {
  console.error(`\nmanifest lists ${keep.size} files but only ${kept} are in the ` +
    `store - refusing to prune until that is resolved`);
  process.exit(1);
}
if (stale.length === 0) {
  console.log("\nnothing to prune");
  process.exit(0);
}
for (const b of stale) console.log(`  ${dryRun ? "would delete" : "deleting"} ${b.pathname} (${mb(b.size)} MB)`);
if (dryRun) {
  console.log("\ndry run - nothing deleted");
  process.exit(0);
}
await del(stale.map((b) => b.url), { token });
console.log(`\ndeleted ${stale.length} objects, freed ${mb(stale.reduce((n, b) => n + b.size, 0))} MB`);
