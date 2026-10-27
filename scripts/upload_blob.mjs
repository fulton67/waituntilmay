/**
 * Upload the web-encoded renders to Vercel Blob and write the player manifest.
 *
 * The manifest is written twice: to Blob, which is what the player reads so a
 * new version needs no deploy, and locally to public/journey/manifest.json,
 * which is the fallback the player falls back to if Blob is unreachable.
 * Both hold absolute Blob URLs, so swapping hosts is a manifest change rather
 * than a code change.
 *
 *   # token is read from the environment - never pass it on the command line
 *   npx vercel env pull .env.local        # or: export BLOB_READ_WRITE_TOKEN=...
 *   node --env-file=.env.local scripts/upload_blob.mjs --prefix journey-v2
 *
 *   --dry-run    list what would be uploaded, upload nothing
 *   --prefix     blob path prefix (default: journey)
 *   --src        directory of web-encoded renders (default: renders/web)
 *   --manifest   local fallback manifest (default: public/journey/manifest.json)
 *   --no-blob-manifest   skip writing the manifest to Blob
 */
import { readdir, mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

import { requireToken, uploadRender, writeManifest, mb } from "./journey-blob.mjs";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const dryRun = args.includes("--dry-run");
const SRC = argOf("--src", "renders/web");
const MANIFEST = argOf("--manifest", "public/journey/manifest.json");
const prefix = argOf("--prefix", "journey").replace(/^\/|\/$/g, "");
const blobManifest = !args.includes("--no-blob-manifest");

const token = requireToken(dryRun);

const files = (await readdir(SRC)).filter((f) => f.endsWith(".mp4")).sort();
if (files.length === 0) {
  console.error(`no .mp4 files in ${SRC} - run scripts/build_web.py first`);
  process.exit(1);
}

const totalMb = files.reduce((n, f) => n + mb(path.join(SRC, f)), 0);
console.log(`${files.length} files, ${totalMb.toFixed(1)} MB -> blob prefix "${prefix}/"`);

if (dryRun) {
  for (const f of files) {
    console.log(`  would upload ${f} (${mb(path.join(SRC, f)).toFixed(2)} MB)`);
  }
  console.log("\ndry run - nothing uploaded");
  process.exit(0);
}

const urls = [];
for (const [i, f] of files.entries()) {
  urls.push(await uploadRender(SRC, f, prefix, token));
  console.log(`  [${String(i + 1).padStart(2)}/${files.length}] ${f} -> ${urls.at(-1)}`);
}

// --mix <renders dir>: carry each version's source mix into the manifest.
// The mp4 does not know which sources it was cut from, and the render logs
// stay on this machine, so without this there is no way for anything
// downstream - the live check especially - to pick a version that contains a
// given source and prove it plays.
const MIXDIR = argOf("--mix", null);
const extra = {};
if (MIXDIR) {
  const mixes = {};
  const seen = new Set();
  for (const f of files) {
    const seed = (/v_(\d+)\.mp4/.exec(f) || [])[1];
    if (!seed) continue;
    try {
      const log = JSON.parse(
        await readFile(path.join(MIXDIR, `v_${seed}.json`), "utf8"));
      const mix = log.source_mix ?? {};
      mixes[f] = Object.fromEntries(
        Object.entries(mix).map(([k, v]) => [k, v.pct]));
      for (const k of Object.keys(mix)) seen.add(k);
    } catch { /* a version with no log just has no mix recorded */ }
  }
  extra.sources = [...seen].sort();
  extra.mixes = mixes;
  console.log(`\nsource mixes recorded for ${Object.keys(mixes).length}`
    + `/${files.length} versions across ${extra.sources.length} sources`);
}

if (blobManifest) {
  const url = await writeManifest(prefix, urls, token, extra);
  console.log(`\nblob manifest -> ${url}  (${urls.length} versions)`);
}

await mkdir(path.dirname(MANIFEST), { recursive: true });
await writeFile(MANIFEST, JSON.stringify(
  { files: urls, count: urls.length, seconds_each: 30.0, ...extra }, null, 1));
console.log(`fallback manifest -> ${MANIFEST} with ${urls.length} absolute URLs`);
