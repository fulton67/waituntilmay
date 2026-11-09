/**
 * The DeepDream slot, before and after, on /mosh-lab/compare.
 *
 * Four layers of one bank clip, in the order the picture is built:
 *
 *   fold            the underlayer's picture, as ffmpeg builds it
 *   fold, dreamed   the same picture after scripts/dream_fold.py
 *   shaded          the published look over that clip
 *   shaded, dreamed the published look with the dream slot on, which is the
 *                   same thing with the dreamed fold underneath
 *
 * The third and fourth are the point: the dream is not visible as a
 * wallpaper, it is visible through the grain, because the only thing it
 * changed is the layer the exchange lets through.
 *
 *   node scripts/dream_compare.mjs --clip blum_00324115 \
 *     --plain <hash> --dream <hash>
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const CLIP = argOf("--clip", "blum_00324115");
const PLAIN = argOf("--plain", "");
const DREAM = argOf("--dream", "");
const BANK = argOf("--bankdir", "bank");
const DIR = argOf("--out", "public/mosh-lab");
const FPS = argOf("--fps", "24");
const CRF = argOf("--crf", "20");

function sh(c, a) {
  try {
    return execFileSync(c, a, { encoding: "utf8", maxBuffer: 1 << 28,
      stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    throw new Error(`${c}: ${(e.stderr || e.message).toString().trim()
      .split(/\r?\n/).slice(-4).join(" | ")}`);
  }
}

function probe(f) {
  const j = JSON.parse(sh("ffprobe", ["-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=nb_frames,width,height,r_frame_rate",
    "-show_entries", "format=duration,size", "-of", "json", f]));
  const s = j.streams[0];
  return { frames: Number(s.nb_frames), w: s.width, h: s.height,
    fps: s.r_frame_rate, duration: Number(j.format.duration),
    mb: Number(j.format.size) / 1e6 };
}

/** A directory of f_00000.jpg into an mp4 the browser will play. */
function fromFrames(dir, out) {
  const n = readdirSync(dir).filter((f) => f.endsWith(".jpg")).length;
  if (!n) throw new Error(`no frames in ${dir}`);
  sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error",
    "-framerate", FPS, "-i", path.join(dir, "f_%05d.jpg"),
    "-c:v", "libx264", "-preset", "slow", "-crf", CRF,
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
  return n;
}

function reencode(src, out) {
  sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", src,
    "-c:v", "libx264", "-preset", "slow", "-crf", CRF,
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
}

/** The same overlay every other compare layer carries. */
function overlay(src, out) {
  sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error",
    "-flags2", "+export_mvs", "-i", src,
    "-vf", "codecview=mv=pf+bf+bb",
    "-c:v", "libx264", "-preset", "slow", "-crf", CRF,
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
}

const prep = path.join(BANK, "prep", CLIP);
const dreamDirs = readdirSync(prep).filter((f) => f.startsWith("dream-"));
if (!dreamDirs.length) throw new Error(`${prep} has no dreamed fold`);
const dreamPrep = path.join(prep, dreamDirs[0]);

const want = [
  { key: "fold", label: "fold (the underlayer's picture)",
    from: path.join(prep, "fold.mp4"), kind: "video" },
  { key: "fold-dreamed", label: "fold, dreamed",
    from: path.join(dreamPrep, "fold.mp4"), kind: "video" },
  { key: "shaded", label: "the look, dream off",
    from: path.join(BANK, `look-${PLAIN}`, CLIP), kind: "frames" },
  { key: "shaded-dreamed", label: "the look, dream on",
    from: path.join(BANK, `look-${DREAM}`, CLIP), kind: "frames" },
];

const manifest = { name: "dream", clip: CLIP, look: PLAIN, lookDream: DREAM,
  layers: [] };
for (const l of want) {
  if (!existsSync(l.from)) throw new Error(`missing ${l.from}`);
  const file = `dream-${l.key}.mp4`;
  const out = path.join(DIR, file);
  console.log(`  ${l.label} <- ${l.from}`);
  if (l.kind === "frames") fromFrames(l.from, out);
  else reencode(l.from, out);
  const mvFile = `dream-${l.key}-mv.mp4`;
  overlay(out, path.join(DIR, mvFile));
  const p = probe(out);
  manifest.layers.push({
    key: l.key, label: l.label,
    video: `/mosh-lab/${file}`, mv: `/mosh-lab/${mvFile}`,
    frames: p.frames, duration: p.duration, mb: p.mb,
    width: p.w, height: p.h, fps: p.fps,
  });
}

const rep = path.join(dreamPrep, "dream.json");
if (existsSync(rep)) {
  manifest.dream = JSON.parse(sh("node", ["-e",
    `process.stdout.write(require('fs').readFileSync(${JSON.stringify(rep)}, 'utf8'))`]));
}
const dest = path.join(DIR, "dream-compare.json");
await writeFile(dest, JSON.stringify(manifest, null, 1));
console.log(`\nmanifest -> ${dest}`);
