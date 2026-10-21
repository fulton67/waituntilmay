/**
 * Build the compare assets: a motion-vector overlay for every encoded layer,
 * a manifest for /mosh-lab/compare, and a preview grid MP4.
 *
 * The overlay uses ffmpeg's own decoder-side vectors
 * (-flags2 +export_mvs, codecview=mv=pf+bf+bb), so what you see is what is
 * actually coded in that file - which is the only way to tell by eye whether
 * the shader's field really landed in the bitstream.
 *
 *   node scripts/mosh-compare.mjs --name blum
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const NAME = argOf("--name", "blum");
const DIR = argOf("--dir", "public/mosh-lab");
const PREVIEW_DIR = path.join(DIR, "previews");
const SECONDS = Number(argOf("--seconds", "6"));
const SOURCE_FILE = argOf("--source", `${NAME}-clip.mp4`);

const sh = (c, a) => execFileSync(c, a, { encoding: "utf8", maxBuffer: 1 << 28 });
const probe = (p) => {
  const d = JSON.parse(sh("ffprobe", ["-v", "error", "-select_streams", "v:0",
    "-count_frames", "-show_entries",
    "stream=width,height,r_frame_rate,nb_read_frames",
    "-show_entries", "format=duration,size", "-of", "json", p]));
  const s = d.streams[0];
  return { w: s.width, h: s.height, fps: s.r_frame_rate,
    frames: Number(s.nb_read_frames), duration: Number(d.format.duration),
    mb: Number(d.format.size) / 1e6 };
};

const LAYERS = [
  { key: "source", label: "source", file: SOURCE_FILE },
  { key: "faces", label: "live faces", file: `${NAME}-faces.mp4` },
  { key: "shader", label: "shader mosh", file: `${NAME}-shader-mosh.mp4` },
  { key: "mosh-medium", label: "ffmpeg mosh medium", file: `${NAME}-ffmpeg-mosh-medium.mp4` },
  { key: "mosh-full", label: "ffmpeg mosh full", file: `${NAME}-ffmpeg-mosh-full.mp4` },
  { key: "mv-transfer", label: "mv transfer", file: `${NAME}-mv-transfer.mp4` },
  // The decay revision. All three are webReady: these are the layers being
  // judged by eye, and a second pass at the web CRF would soften the hard
  // block edges and the stepped dissolve that are the whole point of them.
  { key: "decay-a", label: "A - the live journey look",
    file: `${NAME}-decay-A.mp4`, webReady: true },
  { key: "decay-b", label: "B - mv transfer, continuous field",
    file: `${NAME}-decay-B.mp4`, webReady: true },
  { key: "decay", label: "A x B through short-lived squares",
    file: `${NAME}-decay.mp4`, webReady: true },
];

await mkdir(PREVIEW_DIR, { recursive: true });
const present = LAYERS.filter((l) => existsSync(path.join(DIR, l.file)));
console.log(`layers found: ${present.length}/${LAYERS.length}`);

const WEB_CRF = Number(argOf("--crf", "23"));
const manifest = { name: NAME, layers: [] };
for (const l of present) {
  const src = path.join(DIR, l.file);
  // re-encode the layer for the web in place; mosh output is high entropy and
  // comes out of the render at a bitrate far too high to ship
  if (l.key !== "source" && !l.webReady) {
    const tmp = path.join(DIR, ".webenc.mp4");
    sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", src,
      "-c:v", "libx264", "-preset", "slow", "-crf", String(WEB_CRF),
      "-pix_fmt", "yuv420p", "-movflags", "+faststart", tmp]);
    sh("node", ["-e", `require('fs').renameSync(${JSON.stringify(tmp)}, ${JSON.stringify(src)})`]);
  }
  const mvFile = l.file.replace(/\.mp4$/, "-mv.mp4");
  const mvPath = path.join(DIR, mvFile);
  console.log(`  ${l.label}: motion-vector overlay ...`);
  sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error",
    "-flags2", "+export_mvs", "-i", src,
    "-vf", "codecview=mv=pf+bf+bb",
    "-c:v", "libx264", "-preset", "slow", "-crf", String(WEB_CRF),
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", mvPath]);
  const p = probe(src);
  manifest.layers.push({
    key: l.key, label: l.label,
    video: `/mosh-lab/${l.file}`, mv: `/mosh-lab/${mvFile}`,
    frames: p.frames, duration: p.duration, mb: p.mb,
    width: p.w, height: p.h, fps: p.fps,
  });
}

manifest.previews = { grid: `/mosh-lab/previews/${NAME}-compare-grid.mp4`,
  gridMv: `/mosh-lab/previews/${NAME}-compare-grid-mv.mp4` };
await writeFile(path.join(DIR, `${NAME}-compare.json`), JSON.stringify(manifest, null, 1));
console.log(`\nmanifest -> ${DIR}/${NAME}-compare.json`);

// ---- preview grid: every layer tiled, labelled, as one MP4
const tiles = manifest.layers.slice(0, 9);
const cols = 3, rows = Math.ceil(tiles.length / cols);
const TW = 426, TH = 240;
const inputs = tiles.flatMap((l) => ["-t", String(SECONDS), "-i", path.join(DIR, path.basename(l.video))]);
const esc = (s) => s.replace(/:/g, "\\:").replace(/'/g, "");
const filters = tiles.map((l, i) =>
  `[${i}:v]scale=${TW}:${TH},drawtext=text='${esc(l.label)}':fontfile='C\\:/Windows/Fonts/consola.ttf'`
  + `:x=8:y=8:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.6[v${i}]`).join(";");
const layout = tiles.map((_, i) => `${(i % cols) * TW}_${Math.floor(i / cols) * TH}`).join("|");
const previewName = `${NAME}-compare-grid.mp4`;
const preview = path.join(PREVIEW_DIR, previewName);
sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...inputs,
  "-filter_complex",
  `${filters};${tiles.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${tiles.length}:layout=${layout}[out]`,
  "-map", "[out]", "-c:v", "libx264", "-preset", "medium", "-crf", String(WEB_CRF),
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", preview]);

// ---- the same grid, but of the motion-vector overlays
const mvInputs = tiles.flatMap((l) => ["-t", String(SECONDS), "-i", path.join(DIR, path.basename(l.mv))]);
const mvPreviewName = `${NAME}-compare-grid-mv.mp4`;
const mvPreview = path.join(PREVIEW_DIR, mvPreviewName);
sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...mvInputs,
  "-filter_complex",
  `${filters};${tiles.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${tiles.length}:layout=${layout}[out]`,
  "-map", "[out]", "-c:v", "libx264", "-preset", "medium", "-crf", String(WEB_CRF),
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", mvPreview]);

console.log("\n=== layers ===");
console.log(`${"layer".padEnd(22)}${"frames".padStart(8)}${"duration".padStart(10)}${"MB".padStart(8)}`);
for (const l of manifest.layers) {
  console.log(`${l.label.padEnd(22)}${String(l.frames).padStart(8)}`
    + `${l.duration.toFixed(3).padStart(10)}${l.mb.toFixed(2).padStart(8)}`);
}
const pv = probe(preview);
console.log(`\npreview grid     ${pv.w}x${pv.h}  ${pv.frames} frames  ${pv.duration.toFixed(3)}s  ${pv.mb.toFixed(2)} MB`);
console.log(`  /mosh-lab/previews/${previewName}`);
console.log(`  /mosh-lab/previews/${mvPreviewName}`);
