/**
 * The ffgac glitch-encoding pass, and the evidence that it did what it says.
 *
 * Every MPEG-4 intermediate here is encoded by ffgac with
 *
 *   -mpv_flags +forcemv+nopimb -g max -sc_threshold max
 *
 * +forcemv makes the encoder emit a motion vector for every macroblock even
 * where it would rather code one as intra, which is what gives a datamosh
 * something to push. +nopimb stops it inserting intra macroblocks into P
 * frames to repair error, which is what lets the error persist. -g max and
 * -sc_threshold max between them mean the encoder never decides on its own
 * to start a new GOP, so the only I frames in the file are the ones asked
 * for by name.
 *
 * KEYFRAMES. -pict_type_script is the documented way to place them and it
 * does not work in this build: the docs' own example fails after frame 1
 * with an empty exception, and the mb_type one additionally trips a QuickJS
 * GC assertion. So the I frames are placed with -force_key_frames instead,
 * at the exact frames where the damage curve dips, and the evidence below
 * checks that the file's I frames are exactly those and nothing else.
 *
 *   node scripts/ffgac-mosh.mjs
 *   node scripts/ffgac-mosh.mjs --dip 0.05 --frames 300
 */
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { openingMask } from "./lib/organic.mjs";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };

const SRC = argOf("--src", "public/mosh-lab/blum-clip-internet.mp4");
const CONFIG = argOf("--config", "config/composite.json");
const DIP = Number(argOf("--dip", "0.05"));
const OUTDIR = argOf("--outdir", ".ffgac-mosh");
const REPORT = argOf("--report", "public/mosh-lab/ffgac-evidence.json");
const FG = ".tools/ffglitch-0.10.2-windows-x86_64";
const FCODE = 7;

const sh = (c, a, o = {}) => execFileSync(c, a,
  { encoding: "utf8", maxBuffer: 1 << 28, ...o });
if (!existsSync(`${FG}/ffgac.exe`)) throw new Error(`ffglitch missing at ${FG}`);

const probe = JSON.parse(sh("ffprobe", ["-v", "error", "-select_streams", "v:0",
  "-count_frames", "-show_entries",
  "stream=width,height,r_frame_rate,nb_read_frames", "-of", "json", SRC]));
const vs = probe.streams[0];
const W = vs.width, H = vs.height;
const [fn, fd] = vs.r_frame_rate.split("/").map(Number);
const FPS = fn / (fd || 1);
const N = Number(argOf("--frames", String(vs.nb_read_frames)));
const COLS = Math.ceil(W / 16), ROWS = Math.ceil(H / 16);

/* ------------------------------------------- where the curve dips to zero */
const cfg = JSON.parse(await readFile(CONFIG, "utf8"));
const curve = cfg.damageCurve ?? [];
const curveAt = (f) => {
  if (!curve.length) return 1;
  const x = (f / Math.max(N - 1, 1)) * (curve.length - 1);
  const i = Math.floor(x), fr = x - i;
  const a = curve[i], b = curve[Math.min(curve.length - 1, i + 1)];
  return a + (b - a) * fr;
};
const dipFrames = [];
for (let f = 0; f < N; f++) if (curveAt(f) < DIP) dipFrames.push(f);
// frame 0 has to be an I frame whatever the curve says: a file has to start
// somewhere, and the encoder will make one regardless
const wantI = [...new Set([0, ...dipFrames])].sort((a, b) => a - b);
const runs = [];
for (const f of dipFrames) {
  if (runs.length && f === runs[runs.length - 1][1] + 1) runs[runs.length - 1][1] = f;
  else runs.push([f, f]);
}
console.log(`${path.basename(SRC)}  ${W}x${H} @ ${FPS}  ${N} frames  `
  + `grid ${COLS}x${ROWS}`);
console.log(`damage curve dips below ${DIP} at ${dipFrames.length} frames, `
  + `in ${runs.length} runs: ${runs.map(([a, b]) => `${a}-${b}`).join(", ")}`);

// -force_key_frames takes timestamps, and marks the first frame whose pts
// is at or past each one. Frame f sits at exactly f/fps, so that is the
// timestamp to give: a half-frame nudge forward lands on f+1 instead, which
// is what the first run of this measured - every keyframe one frame late,
// and an extra one at frame 1. A hair under the exact time absorbs the
// float rounding without reaching the frame before.
const stamps = wantI.map((f) => Math.max(0, f / FPS - 1e-4).toFixed(6));

/* ----------------------------------------------------------------- encode */
await rm(OUTDIR, { recursive: true, force: true });
await mkdir(OUTDIR, { recursive: true });
const m4v = path.join(OUTDIR, "clean.m4v");

/** Every MPEG-4 intermediate goes through here, so the flags cannot drift. */
export function ffgacArgs(input, output, extra = []) {
  return ["-i", input, "-an",
    "-mpv_flags", "+forcemv+nopimb",
    "-g", "max", "-sc_threshold", "max",
    "-qscale:v", "3", "-me_range", "1023", "-fcode", String(FCODE),
    ...extra,
    "-vcodec", "mpeg4", "-f", "m4v", "-y", output];
}

const extra = ["-force_key_frames", stamps.join(","),
  ...(N < Number(vs.nb_read_frames) ? ["-frames:v", String(N)] : [])];
const cmdArgs = ffgacArgs(SRC, m4v, extra);
const cmdLine = `${FG}/ffgac.exe ` + cmdArgs.map(
  (a) => (/[ ,]/.test(a) ? `"${a}"` : a)).join(" ");
console.log(`\n--- ffgac ---\n${cmdLine}\n`);
sh(`${FG}/ffgac.exe`, cmdArgs, { stdio: "pipe" });

/* --------------------------------------------------------------- evidence */
// 1. the frame type of every frame, straight from ffprobe
const types = sh("ffprobe", ["-v", "error", "-select_streams", "v:0",
  "-show_entries", "frame=pict_type", "-of", "csv=p=0", m4v])
  .trim().split(/\r?\n/).filter(Boolean);
const gotI = types.map((t, i) => (t === "I" ? i : -1)).filter((i) => i >= 0);

console.log("=".repeat(72));
console.log("EVIDENCE 1 - frame types against the curve dips");
console.log("=".repeat(72));
console.log(`  frames in file            ${types.length}`);
console.log(`  I frames in file          ${gotI.length}: ${gotI.join(", ")}`);
console.log(`  frames the curve asked for ${wantI.length}: ${wantI.join(", ")}`);
const missing = wantI.filter((f) => !gotI.includes(f));
const extraI = gotI.filter((f) => !wantI.includes(f));
console.log(`  asked for but not I       ${missing.length ? missing.join(", ") : "none"}`);
console.log(`  I but not asked for       ${extraI.length ? extraI.join(", ") : "none"}`);
const typesMatch = missing.length === 0 && extraI.length === 0;
console.log(`  ${typesMatch ? "MATCH" : "MISMATCH"}`);

// 2 and 3. per P frame: intra macroblocks, and how many carry a vector
const mvJson = path.join(OUTDIR, "mv.json");
sh(`${FG}/ffedit.exe`, ["-i", m4v, "-f", "mv", "-e", mvJson], { stdio: "pipe" });
const doc = JSON.parse(await readFile(mvJson, "utf8"));
const perFrame = [];
doc.streams[0].frames.forEach((fr, i) => {
  const fwd = fr.mv?.forward;
  if (!fwd) { perFrame.push({ frame: i, type: types[i], intra: null, mvPct: null }); return; }
  let intra = 0, total = 0, withMv = 0;
  const intraAt = [];
  for (let y = 0; y < fwd.length; y++) {
    for (let x = 0; x < fwd[y].length; x++) {
      total++;
      // ffedit reports null for a macroblock with no forward vector, which
      // in a P frame means it was coded intra
      if (fwd[y][x] === null) { intra++; intraAt.push([x, y]); } else withMv++;
    }
  }
  perFrame.push({ frame: i, type: types[i], intra, total,
    mvPct: total ? (withMv / total) * 100 : 0, intraAt: intraAt.slice(0, 12) });
});

const pFrames = perFrame.filter((f) => f.type === "P" && f.intra !== null);
const withIntra = pFrames.filter((f) => f.intra > 0);
console.log("\n" + "=".repeat(72));
console.log("EVIDENCE 2 - intra macroblocks inside P frames");
console.log("=".repeat(72));
console.log(`  P frames examined         ${pFrames.length}`);
console.log(`  with zero intra MBs       ${pFrames.length - withIntra.length}`);
console.log(`  with any intra MBs        ${withIntra.length}`);
if (withIntra.length) {
  for (const f of withIntra.slice(0, 20)) {
    console.log(`    frame ${String(f.frame).padStart(3)}  ${f.intra} intra  `
      + `at ${f.intraAt.map(([x, y]) => `(${x},${y})`).join(" ")}`
      + (f.intra > f.intraAt.length ? " ..." : ""));
  }
}

const mvPcts = pFrames.map((f) => f.mvPct);
const minMv = Math.min(...mvPcts), maxMv = Math.max(...mvPcts);
const allHundred = pFrames.every((f) => f.mvPct === 100);
console.log("\n" + "=".repeat(72));
console.log("EVIDENCE 3 - macroblocks carrying a motion vector, per P frame");
console.log("=".repeat(72));
console.log(`  min ${minMv.toFixed(2)}%   max ${maxMv.toFixed(2)}%   `
  + `every P frame at 100%: ${allHundred}`);
const below = pFrames.filter((f) => f.mvPct < 100).slice(0, 10);
for (const f of below) {
  console.log(`    frame ${String(f.frame).padStart(3)}  ${f.mvPct.toFixed(2)}%  `
    + `(${f.intra} of ${f.total} coded intra)`);
}

/* ------------------------------------------------- healing, in the pixels */
/**
 * -mb_type_script is the documented way to place intra macroblocks inside a
 * P frame, and it does not work in this build - the docs' own example trips
 * a QuickJS GC assertion. So the healing is done in the pixel domain
 * instead: where the curve calls for it, the clean layer C is restored
 * through the organic shapes of the damage map.
 *
 * This is not the same thing as intra macroblocks. An intra macroblock
 * heals inside the codec, on the block grid, and persists as a new
 * reference for everything after it. This heals after decode, on the
 * organic shape, and does not change what later frames predict from. It
 * looks close and it is honest about being a different mechanism.
 */
const healDir = path.join(OUTDIR, "heal");
await mkdir(healDir, { recursive: true });
const org = cfg.organic ?? { amount: 1, scale: 0.9, wobble: 0.55, soft: 1.5 };
const seed = cfg.seed ?? 7;
const moshedMp4 = path.join(OUTDIR, "moshed.mp4");
sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-fflags", "+genpts",
  "-r", String(FPS), "-f", "m4v", "-i", m4v, "-frames:v", String(N),
  "-c:v", "libx264", "-preset", "medium", "-crf", "16",
  "-pix_fmt", "yuv420p", "-r", String(FPS), moshedMp4]);

// heal strength follows the curve: full where it is at zero, nothing where
// the curve is up
const healAt = (f) => Math.max(0, Math.min(1, 1 - curveAt(f) / DIP));
const maskRaw = path.join(healDir, "heal.raw");
let healedPx = 0, healFrames = 0;
{
  const buf = Buffer.alloc(W * H * N);
  for (let f = 0; f < N; f++) {
    const hv = healAt(f);
    if (hv <= 0.001) continue;
    healFrames++;
    const m = openingMask(f, W, H, org, seed);
    for (let k = 0; k < W * H; k++) {
      const v = Math.round(m[k] * hv * 255);
      buf[f * W * H + k] = v;
      if (v > 127) healedPx++;
    }
  }
  await writeFile(maskRaw, buf);
}
const healed = path.join(OUTDIR, "healed.mp4");
sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error",
  "-i", moshedMp4, "-i", SRC,
  "-f", "rawvideo", "-pix_fmt", "gray", "-s", `${W}x${H}`, "-r", String(FPS),
  "-i", maskRaw,
  "-filter_complex",
  "[2:v]format=gray[m];[1:v][m]alphamerge[clean];[0:v][clean]overlay=format=auto[o]",
  "-map", "[o]", "-frames:v", String(N),
  "-c:v", "libx264", "-preset", "medium", "-crf", "18",
  "-pix_fmt", "yuv420p", "-r", String(FPS), "-movflags", "+faststart", healed]);

console.log("");
console.log("=".repeat(72));
console.log("HEALING - pixel domain, because -mb_type_script is broken here");
console.log("=".repeat(72));
console.log(`  frames the curve calls for healing   ${healFrames}`);
console.log(`  those frames                         ${
  Array.from({ length: N }, (_, f) => f).filter((f) => healAt(f) > 0.001)
    .join(", ")}`);
console.log(`  pixels restored from the clean layer ${healedPx}  `
  + `(${(100 * healedPx / (W * H * Math.max(healFrames, 1))).toFixed(2)}% of `
  + `those frames)`);
console.log(`  healed -> ${healed}`);

await mkdir(path.dirname(REPORT), { recursive: true });
await writeFile(REPORT, JSON.stringify({
  src: SRC, frames: N, fps: FPS, grid: [COLS, ROWS], dipThreshold: DIP,
  command: cmdLine,
  dipRuns: runs, wantI, gotI, typesMatch, missing, extraI,
  pFrames: pFrames.length,
  pFramesWithIntra: withIntra.map((f) => ({ frame: f.frame, intra: f.intra,
    at: f.intraAt })),
  mvPct: { min: minMv, max: maxMv, allHundred },
  healing: { frames: healFrames, pixels: healedPx, output: healed,
    note: "pixel domain; -mb_type_script is broken in this build" },
  perFrame: perFrame.map((f) => ({ frame: f.frame, type: f.type,
    intra: f.intra, mvPct: f.mvPct })),
}, null, 1));
console.log(`\nm4v     -> ${m4v}`);
console.log(`report  -> ${REPORT}`);
