/**
 * The Blob side of growing the journey pool.
 *
 *   --list                     print the seeds already in the live manifest
 *   --append --src <dir>       upload every mp4 in <dir> and append it to the
 *                              live manifest, then print before/after counts
 *
 * Appending reads the live manifest first and writes it back, so the pool
 * grows rather than being replaced: a nightly run that renders nothing still
 * leaves the rotation exactly as it found it.
 *
 *   node --env-file=.env.local scripts/pool-blob.mjs --append \
 *       --src .pool/web --prefix journey-v2
 */
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { requireToken, readManifest, writeManifest, uploadRender, mb }
  from "./journey-blob.mjs";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const prefix = argOf("--prefix", "journey-v2").replace(/^\/|\/$/g, "");
const token = requireToken();

const seedOf = (u) => {
  const m = /v_(\d+)\.mp4/.exec(u);
  return m ? Number(m[1]) : null;
};

if (args.includes("--list")) {
  const man = await readManifest(prefix, token);
  const seeds = (man?.files ?? []).map(seedOf).filter((s) => s !== null);
  console.log(JSON.stringify({ count: seeds.length, seeds }));
  process.exit(0);
}

if (!args.includes("--append")) {
  console.error("pass --list or --append");
  process.exit(1);
}

const SRC = argOf("--src", ".pool/web");
const out = argOf("--out", null);          // optional: also write a local copy

const man = await readManifest(prefix, token);
const before = man?.files ?? [];
if (!man) {
  console.error(`no live manifest at ${prefix}/manifest.json - run `
    + `upload_blob.mjs for the full batch first`);
  process.exit(1);
}

const files = (await readdir(SRC)).filter((f) => f.endsWith(".mp4")).sort();
if (!files.length) {
  console.log(`nothing to append: no mp4 in ${SRC}`);
  console.log(JSON.stringify({ before: before.length, after: before.length, added: 0 }));
  process.exit(0);
}

const known = new Set(before);
const added = [];
for (const [i, f] of files.entries()) {
  const url = await uploadRender(SRC, f, prefix, token);
  console.log(`  [${i + 1}/${files.length}] ${f} `
    + `(${mb(path.join(SRC, f)).toFixed(2)} MB) -> ${url}`);
  if (known.has(url)) console.log("      already in the manifest, not appended twice");
  else { added.push(url); known.add(url); }
}

const after = [...before, ...added];
const url = await writeManifest(prefix, after, token);
console.log(`\nmanifest ${url}`);
console.log(`  ${before.length} -> ${after.length} versions (+${added.length})`);
if (out) {
  await writeFile(out, JSON.stringify(
    { files: after, count: after.length, seconds_each: 30.0 }, null, 1));
  console.log(`  local copy -> ${out}`);
}
console.log(JSON.stringify({ before: before.length, after: after.length,
  added: added.length }));
