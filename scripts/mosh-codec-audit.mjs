/**
 * Codec audit: every video the site actually serves.
 *
 * The mosh pipeline encodes to MPEG-4 Part 2 on purpose - that is the only way
 * to reach the VOP headers and the motion vectors - so the risk is shipping an
 * intermediate by mistake. Browsers do not decode MPEG-4 Part 2 in an MP4
 * container, so any such file is a silently black player. This walks the real
 * manifests and probes the real URLs, local and Blob alike.
 *
 *   node scripts/mosh-codec-audit.mjs
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const run = promisify(execFile);
const OK = new Set(["h264"]);

async function probe(target) {
  const local = target.startsWith("/") ? path.join("public", target.slice(1)) : target;
  const src = target.startsWith("http") ? target : local;
  try {
    const { stdout } = await run("ffprobe", ["-v", "error", "-select_streams", "v:0",
      "-show_entries", "stream=codec_name,codec_tag_string,profile,width,height",
      "-show_entries", "format=format_name,duration,size", "-of", "json", src],
      { maxBuffer: 1 << 26 });
    const d = JSON.parse(stdout);
    const s = d.streams?.[0] ?? {};
    return { codec: s.codec_name, tag: s.codec_tag_string, profile: s.profile,
      dim: `${s.width}x${s.height}`, container: d.format?.format_name,
      mb: Number(d.format?.size ?? 0) / 1e6 };
  } catch (e) {
    return { error: String(e.stderr ?? e.message).trim().split("\n").pop() };
  }
}

// ---- collect every URL the site serves, from the manifests themselves
const targets = new Map();   // url -> where it came from
const add = (u, from) => { if (u && !targets.has(u)) targets.set(u, from); };

const MOSH = "public/mosh-lab";
for (const m of (await readdir(MOSH)).filter((f) => f.endsWith("-compare.json"))) {
  const j = JSON.parse(await readFile(path.join(MOSH, m), "utf8"));
  for (const l of j.layers ?? []) { add(l.video, `${m}:${l.key}`); add(l.mv, `${m}:${l.key}-mv`); }
  for (const [k, v] of Object.entries(j.previews ?? {})) add(v, `${m}:previews.${k}`);
}
// anything still sitting in public/ is served statically whether a manifest
// names it or not
for (const f of (await readdir(MOSH)).filter((f) => f.endsWith(".mp4"))) {
  add(`/mosh-lab/${f}`, "public/mosh-lab (static)");
}
const JOURNEY = "public/journey/manifest.json";
if (existsSync(JOURNEY)) {
  const j = JSON.parse(await readFile(JOURNEY, "utf8"));
  for (const v of j.files ?? j.versions ?? j.videos ?? []) {
    add(typeof v === "string" ? v : (v.url ?? v.video ?? v.src), "journey/manifest.json (fallback)");
  }
}

// The live pool is whatever the player resolves, which is a Blob manifest and
// not the bundled fallback. Auditing only the fallback would have passed a
// pool of unplayable files, so the pool name is read out of the player and
// its manifest fetched - the same one line that switches the pool.
const player = await readFile("components/JourneyPlayer.tsx", "utf8");
const POOL = (player.match(/NEXT_PUBLIC_JOURNEY_POOL \?\? "([\w-]+)"/) || [])[1];
const HOST = (player.match(/https:\/\/[\w.]+\.public\.blob\.vercel-storage\.com/) || [])[0];
if (POOL && HOST) {
  const live = `${HOST}/${POOL}/manifest.json`;
  try {
    const r = await fetch(`${live}?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) throw new Error(`manifest ${r.status}`);
    const j = await r.json();
    const files = j.files ?? j.versions ?? j.videos ?? [];
    for (const v of files) {
      add(typeof v === "string" ? v : (v.url ?? v.video ?? v.src),
        `LIVE ${POOL}/manifest.json`);
    }
    console.log(`live pool: ${POOL}/  (${files.length} versions)`);
  } catch (e) {
    console.log(`live pool: ${POOL}/  UNREACHABLE - ${e.message}`);
  }
}

console.log(`probing ${targets.size} served files\n`);
const rows = [];
const LIMIT = 6;
const entries = [...targets.entries()];
for (let i = 0; i < entries.length; i += LIMIT) {
  const batch = entries.slice(i, i + LIMIT);
  const got = await Promise.all(batch.map(([u]) => probe(u)));
  batch.forEach(([u, from], k) => rows.push({ url: u, from, ...got[k] }));
  process.stdout.write(`\r  ${Math.min(i + LIMIT, entries.length)}/${entries.length}   `);
}
process.stdout.write("\n\n");

const name = (u) => (u.startsWith("http") ? `blob:${u.split("/").pop()}` : u);
console.log(`${"file".padEnd(46)}${"codec".padEnd(9)}${"tag".padEnd(7)}${"profile".padEnd(12)}${"MB".padStart(7)}  origin`);
let bad = 0;
for (const r of rows) {
  const ok = OK.has(r.codec);
  if (!ok) bad++;
  console.log(`${name(r.url).slice(0, 45).padEnd(46)}${(r.codec ?? "ERR").padEnd(9)}`
    + `${(r.tag ?? "-").padEnd(7)}${(r.profile ?? "-").slice(0, 11).padEnd(12)}`
    + `${(r.mb ?? 0).toFixed(2).padStart(7)}  ${r.from}${ok ? "" : "   <-- NOT H.264"}`
    + (r.error ? `  ${r.error}` : ""));
}
const counts = rows.reduce((a, r) => { a[r.codec ?? "error"] = (a[r.codec ?? "error"] ?? 0) + 1; return a; }, {});
console.log(`\ncodecs: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join("  ")}`);
console.log(bad === 0
  ? `all ${rows.length} served files are H.264`
  : `${bad}/${rows.length} served files are NOT H.264`);
process.exit(bad === 0 ? 0 : 1);
