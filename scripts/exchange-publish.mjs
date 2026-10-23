/**
 * Build the motion-vector overlays and the compare manifest for a render.
 *
 * The compare page reads a manifest per clip and plays every layer in it
 * on one clock, with a toggle that swaps each for its motion-vector
 * overlay. Both sides of that have to exist for every column, so this
 * makes the overlays and writes the manifest together rather than leaving
 * the page to find out at runtime which half is missing.
 *
 *   node scripts/exchange-publish.mjs --name journey-30s \
 *     --source journey-30s --gens 2,3,5
 */
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const DIR = argOf("--dir", "public/mosh-lab");
const NAME = argOf("--name", "journey-30s");
const SOURCE = argOf("--source", "journey-30s");
const BASE = argOf("--base", "journey-30s-exchange");
const GENS = argOf("--gens", "2,3,5").split(",").map(Number).filter(Boolean);
const MANIFEST = path.join(DIR, `${NAME}-compare.json`);

const sh = (c, a) => execFileSync(c, a, { encoding: "utf8", maxBuffer: 1 << 28 });
const probe = (f) => {
  const d = JSON.parse(sh("ffprobe", ["-v", "error", "-select_streams", "v:0",
    "-count_frames", "-show_entries",
    "stream=width,height,r_frame_rate,nb_read_frames",
    "-show_entries", "format=duration,size", "-of", "json", f]));
  const s = d.streams[0];
  return { frames: Number(s.nb_read_frames), duration: Number(d.format.duration),
    mb: Number(d.format.size) / 1e6, width: s.width, height: s.height,
    fps: s.r_frame_rate };
};

/** codecview on an export_mvs decode: the vectors the file actually carries */
function overlay(file) {
  const src = path.join(DIR, `${file}.mp4`);
  const mv = path.join(DIR, `${file}-mv.mp4`);
  if (!existsSync(src)) return null;
  sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error",
    "-flags2", "+export_mvs", "-i", src, "-vf", "codecview=mv=pf+bf+bb",
    // the overlay is a diagnostic laid over dense grain, which is close to
    // incompressible: at crf 20 a 30s one is 70 MB. It only has to show
    // where the vectors are, so it does not get a picture budget.
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "30",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", mv]);
  console.log(`  ${path.basename(mv)}`);
  return mv;
}

const want = [
  { key: "source", label: "source · 30s edit, 10 cuts", file: SOURCE },
  { key: "exchange-a", label: "surface (A)", file: `${BASE}-A` },
  { key: "exchange-b", label: "underlayer (B)", file: `${BASE}-B` },
  { key: "exchange", label: "final · gen 1", file: BASE },
  ...GENS.map((g) => ({ key: `gen${g}`, label: `gen ${g}`,
    file: `${BASE}-gen${g}` })),
];

const layers = [];
console.log("motion-vector overlays:");
for (const l of want) {
  const src = path.join(DIR, `${l.file}.mp4`);
  if (!existsSync(src)) { console.log(`  (missing ${l.file}.mp4, skipped)`); continue; }
  overlay(l.file);
  layers.push({ key: l.key, label: l.label,
    video: `/mosh-lab/${l.file}.mp4`, mv: `/mosh-lab/${l.file}-mv.mp4`,
    ...probe(src) });
}

await writeFile(MANIFEST, JSON.stringify({ name: NAME, layers }, null, 1));
console.log(`\n${MANIFEST}`);
for (const l of layers) console.log(`  ${l.key.padEnd(12)} ${l.label}`);
