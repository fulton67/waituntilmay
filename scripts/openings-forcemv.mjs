/**
 * Force the datamosh motion inside organic openings, and composite through
 * the opening mask so the visible edge is the curve and not the blocks.
 *
 * This is the real bitstream, not the lab: ffgac encodes with +forcemv so
 * every macroblock carries a vector, ffedit exports them, the blocks an
 * opening touches get vectors from the swirl instead of their own, and
 * ffedit writes them back. Blocks outside openings keep what the encoder
 * gave them.
 *
 * Three things make the motion read as one flowing mass rather than a grid
 * of independent blocks:
 *
 *   smoothing   vectors inside an opening are averaged with their
 *               neighbours, weighted by how far inside the opening each
 *               one is, so the field varies smoothly across the opening and
 *               meets the untouched blocks at its rim without a step
 *   the mask    the moshed frame is composited back through the opening's
 *               own coverage, at pixel resolution, so what you see ends on
 *               the curve even though the motion that made it was decided
 *               per block
 *   the rim     the outer 15% of each opening is not the underlayer at all.
 *               It is the scene's own pixels, sampled from further out, so
 *               the picture appears to sink into the hole rather than be
 *               replaced at its edge. Deeper in, the underlayer at 0.7.
 *
 * The geometry, the spawn rule and the letterbox all live in lib/organic.mjs
 * so the healing pass in ffgac-mosh.mjs opens the same shapes.
 *
 * On 4MV: ffedit edits vectors inside the macroblock type the encoder
 * chose; it cannot turn a 1MV block into a 4MV one. Measured on this clip,
 * the encoder picks 4MV for under 1% of blocks whatever the settings, so
 * where a 4MV block does fall on an opening edge its four vectors are set
 * individually, and everywhere else the edge is carried by the mask
 * instead. The report says how many of each there were.
 *
 *   node scripts/openings-forcemv.mjs
 *   node scripts/openings-forcemv.mjs --frames 60 --out out.mp4
 */
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { GEOM, hash12, detectPicture, interestField, makeDrive, makeOpenings }
  from "./lib/organic.mjs";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const numOf = (n, d) => Number(argOf(n, String(d)));

const SRC = argOf("--src", "public/mosh-lab/blum-clip-internet.mp4");
const TUNE = argOf("--tune", "public/mosh-lab/blum-internet-tune.json");
const CONFIG = argOf("--config", "config/composite.json");
const OUT = argOf("--out", "public/mosh-lab/blum-internet-openings.mp4");
const REPORT = argOf("--report", "public/mosh-lab/openings-forcemv.json");
const LIMIT = Number(argOf("--frames", "0"));
const MB = 16;
const FG = ".tools/ffglitch-0.10.2-windows-x86_64";
const TMP = ".openings-mv";
const FCODE = 7;
// 1 pass measured max 64.34 / median 9.17 half-pel, 4 gave 40.56 / 3.62 and
// 8 gave 33.70 / 2.37. Six sits where the returns flatten, and leaves more
// variation inside an opening than eight does.
const SMOOTH_PASSES = numOf("--smooth", 6);
const MAG_MIN = numOf("--mag-min", 4);
const MAG_MAX = numOf("--mag-max", 12);
const DIP = numOf("--dip", 0.05);
const CLOSE_KEYS = numOf("--close-keys", 10);

const sh = (c, a, o = {}) => execFileSync(c, a,
  { encoding: "utf8", maxBuffer: 1 << 28, ...o });

if (!existsSync(`${FG}/ffgac.exe`)) throw new Error(`ffglitch missing at ${FG}`);
const cfg = JSON.parse(await readFile(CONFIG, "utf8"));
const org = cfg.organic ?? { amount: 1, scale: 0.9, wobble: 0.55, soft: 1.5 };
const seed = cfg.seed ?? 7;

// geometry and spawn shaping: defaults, then the config, then the flags
const geom = { ...GEOM, ...(cfg.openings ?? {}) };
for (const [flag, key] of [["--r-min", "rMin"], ["--r-max", "rMax"],
  ["--r-burst", "rBurst"], ["--life-min", "lifeMin"], ["--life-max", "lifeMax"],
  ["--p-min", "pMin"], ["--p-max", "pMax"], ["--gamma", "gamma"],
  ["--env-term", "envTerm"], ["--rim", "rim"], ["--sink", "sinkPx"],
  ["--source", "source"], ["--concept-dec", "conceptDec"]]) {
  if (args.indexOf(flag) >= 0) geom[key] = numOf(flag, geom[key]);
}

const probe = JSON.parse(sh("ffprobe", ["-v", "error", "-select_streams", "v:0",
  "-count_frames", "-show_entries",
  "stream=width,height,r_frame_rate,nb_read_frames", "-of", "json", SRC]));
const vs = probe.streams[0];
const W = vs.width, H = vs.height;
const [fnum, fden] = vs.r_frame_rate.split("/").map(Number);
const FPS = fnum / (fden || 1);
const NALL = Number(vs.nb_read_frames);
const N = LIMIT ? Math.min(LIMIT, NALL) : NALL;
const COLS = Math.ceil(W / MB), ROWS = Math.ceil(H / MB);
console.log(`${path.basename(SRC)}  ${W}x${H} @ ${FPS}  ${N} of ${NALL} frames`);
console.log(`grid ${COLS}x${ROWS} macroblocks`);

/* ------------------------------------------------------- the letterbox */
const pic = detectPicture(SRC, W, H);
console.log("");
console.log("LETTERBOX");
console.log(`  detected per frame; the commonest rect is `
  + `x ${pic.x0}..${pic.x1}  y ${pic.y0}..${pic.y1} = ${pic.w}x${pic.h}  `
  + `(${pic.pct.toFixed(1)}% of the frame)`);
console.log(`  bars on it      top ${pic.bars.top}px  bottom ${pic.bars.bottom}px  `
  + `left ${pic.bars.left}px  right ${pic.bars.right}px`);
console.log(`  any bars at all in ${(100 * pic.presentInFrames).toFixed(0)}% of frames; `
  + `mean picture ${pic.meanPct.toFixed(1)}% of the frame`);
{
  const seen = new Map();
  for (const r of pic.frames) {
    const k = `${r.x1 - r.x0}x${r.y1 - r.y0} at ${r.x0},${r.y0}`;
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  const top = [...seen].sort((a, b) => b[1] - a[1]).slice(0, 3);
  console.log(`  rects used      ${top.map(([k, c]) =>
    `${k} x${c}f`).join("   ")}`);
}
console.log("  nothing spawns in the bars and no measurement below counts them");

/* --------------------------------------- the word envelope and the drive */
let ENV = new Float32Array(NALL).fill(0.5);
let HITS = [];
let CONCEPT_WORDS = [];
try {
  const tune = JSON.parse(await readFile(TUNE, "utf8"));
  const r = cfg.reveals ?? {};
  const lw = r.loudnessWeight ?? 0.35;
  const ka = 1 - Math.exp(-1 / Math.max(r.attack ?? 3, 0.5));
  const kr = 1 - Math.exp(-1 / Math.max((r.release ?? 1.5) * FPS, 1));
  let e = 0;
  ENV = new Float32Array(tune.frames);
  for (let i = 0; i < tune.frames; i++) {
    const raw = Math.min(1, Math.max(0,
      (tune.rawNoLoudness[i] ?? 0) + lw * (tune.loudness[i] ?? 0)));
    e += (raw - e) * (raw > e ? ka : kr);
    ENV[i] = Math.min(1, Math.max(0, e * (r.gain ?? 1)));
  }
  HITS = (tune.conceptHits ?? []).map((h) => h.frame);
  CONCEPT_WORDS = (tune.conceptHits ?? []).map((h) => `${h.stem}@${h.frame}`);
  console.log("");
  console.log(`word envelope: mean ${(ENV.reduce((a, b) => a + b, 0)
    / ENV.length).toFixed(3)}`);
  console.log(`concept words land at: ${CONCEPT_WORDS.join(", ") || "none"}`);
} catch {
  console.log("no tune data; a flat envelope and no concept words");
}

// over the whole clip, not over N: rendering a subset must not squeeze the
// curve into it and move the dips somewhere else
const curve = cfg.damageCurve ?? [];
const drive = makeDrive({ env: ENV, curve, hits: HITS, frames: NALL, geom });

/* ------------------------------------------------- where the picture is */
console.log("");
console.log("SPAWN WEIGHTING");
const interest = interestField(SRC, W, H, N, COLS, ROWS, pic, geom);
console.log(`  edge energy and frame-to-frame change, mixed `
  + `${(100 * geom.edgeMix).toFixed(0)}/${(100 * (1 - geom.edgeMix)).toFixed(0)}, `
  + `smoothed over 9 frames`);
{
  let lo = Infinity, hi = 0, s = 0, n = 0;
  for (let f = 0; f < N; f++) {
    for (let k = 0; k < COLS * ROWS; k++) {
      if (!interest.inPic[f * COLS * ROWS + k]) continue;
      const v = interest.weight[f * COLS * ROWS + k];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
      s += v; n++;
    }
  }
  console.log(`  per-block weight: min ${lo.toFixed(2)}  mean ${(s / n).toFixed(2)}  `
    + `max ${hi.toFixed(2)}`);
}

const op = makeOpenings({ W, H, N, MB, org, seed, picture: pic, interest,
  drive, geom });

console.log("");
console.log("DRIVE  (what the spawn chance follows)");
console.log(`  drive = (${geom.envTerm} x word envelope + concept pulse) `
  + `x damage curve`);
console.log(`  chance = ${geom.pMin} + ${(geom.pMax - geom.pMin).toFixed(3)} `
  + `x drive^${geom.gamma}, times the per-block weight`);
{
  const perSec = [];
  for (let s = 0; s * FPS < N; s++) {
    let d = 0, p = 0, n = 0;
    for (let f = Math.floor(s * FPS); f < Math.min(N, (s + 1) * FPS); f++) {
      d += op.driveAt(f); p += op.spawnP(f); n++;
    }
    perSec.push(`${s}:${(d / n).toFixed(2)}/${(100 * p / n).toFixed(1)}%`);
  }
  console.log(`  per second (drive/chance): ${perSec.join("  ")}`);
}

/* ----------------------------------- keyframes where the damage curve dips */
// Not a fixed GOP. -pict_type_script is the documented way and is broken in
// this build, so the dips are placed with -force_key_frames at exactly n/fps.
const dipFrames = [];
for (let f = 0; f < N; f++) if (drive.curveAt(f) < DIP) dipFrames.push(f);
// The screen closing IS the refresh.
//
// Healing the composite alone does not move near-black inside an opening,
// and it cannot: it shrinks the MASK, so a closing pixel leaves the
// measurement rather than getting brighter. The damage is in the stream,
// and with +nopimb the stream never repairs itself. So the moments when
// most of the screen is shutting at once also take a keyframe - the same
// design event, carried into the encoder.
//
// The user's damage curve is untouched; these are additional to its dips.
const closeTrack = [];
for (let f = 0; f < N; f++) {
  const { amt, close } = op.field(f);
  let sum = 0;
  for (let k = 0; k < amt.length; k++) sum += amt[k] * close[k];
  closeTrack.push(sum);
}
const closeFrames = [];
{
  const order = closeTrack.map((v, f) => [v, f]).sort((a, b) => b[0] - a[0]);
  const minGap = Math.max(6, Math.floor(N / (CLOSE_KEYS * 2.5)));
  for (const [, f] of order) {
    if (closeFrames.length >= CLOSE_KEYS) break;
    if (closeFrames.every((g) => Math.abs(g - f) >= minGap)) closeFrames.push(f);
  }
  closeFrames.sort((a, b) => a - b);
}
const wantI = [...new Set([0, ...dipFrames, ...closeFrames])].sort((a, b) => a - b);
console.log("");
console.log(`keyframes: ${dipFrames.length} on curve dips, `
  + `${closeFrames.length} where the screen is most closed `
  + `(${closeFrames.join(", ")})`);
const dipStamps = wantI.map((f) => Math.max(0, f / FPS - 1e-4).toFixed(6)).join(",");

/**
 * The swirl, rather than a drag.
 *
 * A sustained downward force walks the reference off the bottom of the
 * frame: there is nothing below to predict from, so the opening decodes
 * black - measured at 31.27% near-black inside openings. A force that turns
 * about the opening's own centre moves the same pixels just as far, but
 * they circulate inside the opening instead of leaving it, so there is
 * always something to predict from.
 *
 * The magnitude OSCILLATES, and that is the point. A constant tangential
 * vector does not make content orbit: each frame it translates the block,
 * and those translations compose into a long polygonal walk away from where
 * it started. Measured, that walked the picture toward black monotonically,
 * 0.8% near-black over the first twenty frames and 40.5% by frame 160, with
 * the forced motion never refreshed between keyframes. Swinging the sign
 * over a period means the displacement integrates back to roughly zero
 * every cycle, so the pixels really do stay where they are and just churn.
 * Each opening gets its own period so they are not all breathing together.
 */
function swirlForce(bx, by, cx, cy, frame) {
  let rx = (bx + 0.5) * MB - cx, ry = (by + 0.5) * MB - cy;
  const r = Math.hypot(rx, ry);
  if (r < 1e-3) { rx = 1; ry = 0; }
  const ur = r > 1e-3 ? [rx / r, ry / r] : [1, 0];
  const dir = hash12(cx * 0.57 + seed * 3, cy * 0.57 + seed * 3) < 0.5 ? 1 : -1;
  const tangent = [-ur[1] * dir, ur[0] * dir];
  const period = 14 + 26 * hash12(cx * 0.29 + seed, cy * 0.29 + seed);
  const swing = Math.sin((2 * Math.PI * frame) / period);
  const n = hash12(cx * 0.13, cy * 0.13);
  const mag = (MAG_MIN + (MAG_MAX - MAG_MIN) * n) * swing;
  // the inward term rides the same swing, so it cannot accumulate either
  const inward = 0.22;
  return [(tangent[0] - ur[0] * inward) * mag,
    (tangent[1] - ur[1] * inward) * mag];
}

/**
 * Keep the reference inside the picture.
 *
 * A vector says "fetch from this offset in the previous frame". If that
 * lands outside the frame there is nothing to fetch and the block decodes
 * black. The vector is in half-pel, so it is halved to get pixels.
 */
function clampToFrame(bx, by, vx, vy) {
  const px = bx * MB, py = by * MB;
  const loX = -px * 2, hiX = (W - MB - px) * 2;
  const loY = -py * 2, hiY = (H - MB - py) * 2;
  return [Math.max(loX, Math.min(hiX, vx)), Math.max(loY, Math.min(hiY, vy))];
}

/* ------------------------------------------------------------- encode */
await rm(TMP, { recursive: true, force: true });
await mkdir(TMP, { recursive: true });
const gac = path.join(TMP, "src.mpeg4");
console.log("\n--- ffgac encode (+forcemv, +mv4, keyframes at the dips) ---");
sh(`${FG}/ffgac.exe`, ["-i", SRC, "-an",
  "-mpv_flags", "+nopimb+forcemv", "-flags", "+mv4",
  "-qscale:v", "6", "-g", "max", "-sc_threshold", "max",
  "-force_key_frames", dipStamps,
  "-me_range", "1023", "-fcode", String(FCODE),
  ...(LIMIT ? ["-frames:v", String(N)] : []),
  "-vcodec", "mpeg4", "-f", "rawvideo", "-y", gac], { stdio: "pipe" });

const mvJson = path.join(TMP, "mv.json");
sh(`${FG}/ffedit.exe`, ["-i", gac, "-f", "mv", "-e", mvJson], { stdio: "pipe" });
const doc = JSON.parse(await readFile(mvJson, "utf8"));
const frames = doc.streams[0].frames;
console.log(`exported ${frames.length} frames of vectors`);

/* ------------------------------------------- force, inside the openings */
const LIMITV = Math.pow(2, FCODE + 3) - 1;
const clampv = (v) => Math.max(-LIMITV, Math.min(LIMITV, Math.round(v)));
let touched = 0, blocks4mv = 0, edge4mv = 0, forced1mv = 0;
let maxNeighbourDiff = 0;
const neighbourDiffs = [];
const coverFrame = [];
const openFrame = [];
let rimPx = 0, insidePx = 0;
const FR = W * H;
const coreBuf = Buffer.alloc(FR * N);
const rimBuf = Buffer.alloc(FR * N);
const sxBuf = Buffer.alloc(FR * N);
const syBuf = Buffer.alloc(FR * N);
const sampleStep = Math.max(1, Math.floor(N / 60));
const sampled = new Map();

for (let i = 0; i < N; i++) {
  const m = op.mask(i);
  for (let k = 0; k < FR; k++) {
    coreBuf[i * FR + k] = Math.round(m.shown[k] * 255);
    rimBuf[i * FR + k] = Math.round(m.rim[k] * 255);
  }
  sxBuf.set(m.sinkX, i * FR);
  syBuf.set(m.sinkY, i * FR);
  coverFrame.push(m.coverage);
  openFrame.push(m.open);
  const ins = new Uint8Array(FR);
  for (let k = 0; k < FR; k++) {
    const v = m.pix[k] * (1 - Math.min(1, m.heal[k]));
    if (v > 0.5) {
      ins[k] = 1; insidePx++;
      if (m.rim[k] > 0.5) rimPx++;
    }
  }
  if (i % sampleStep === 0) sampled.set(i, ins);

  const fwd = frames[i]?.mv?.forward;
  if (!fwd) continue;

  // 1. the raw forced field for every open block
  const want = new Float32Array(COLS * ROWS * 2);
  const inside = new Uint8Array(COLS * ROWS);
  for (let by = 0; by < ROWS; by++) {
    for (let bx = 0; bx < COLS; bx++) {
      const k = by * COLS + bx;
      const cov = m.blockCov[k];
      if (cov <= 0.02) continue;
      inside[k] = 1;
      const [fx, fy] = swirlForce(bx, by, m.ownCx[k], m.ownCy[k], i);
      want[k * 2] = fx * cov;
      want[k * 2 + 1] = fy * cov;
    }
  }

  // 2. smooth across neighbours, weighted by how far inside each one is, so
  // the field reads as one mass and meets the untouched blocks without a step
  let sm = want;
  for (let pass = 0; pass < SMOOTH_PASSES; pass++) {
    const next = new Float32Array(want.length);
    for (let by = 0; by < ROWS; by++) {
      for (let bx = 0; bx < COLS; bx++) {
        const k = by * COLS + bx;
        if (!inside[k]) continue;
        let sx = 0, sy = 0, sw = 0;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const nx = bx + ox, ny = by + oy;
            if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
            const nk = ny * COLS + nx;
            if (!inside[nk]) continue;
            const w = (ox === 0 && oy === 0 ? 2.0 : 1.0) * m.blockCov[nk];
            sx += sm[nk * 2] * w; sy += sm[nk * 2 + 1] * w; sw += w;
          }
        }
        next[k * 2] = sw ? sx / sw : sm[k * 2];
        next[k * 2 + 1] = sw ? sy / sw : sm[k * 2 + 1];
      }
    }
    sm = next;
  }

  // 3. write them in; a 4MV block gets its four quadrants set individually
  for (let by = 0; by < Math.min(ROWS, fwd.length); by++) {
    const row = fwd[by];
    for (let bx = 0; bx < Math.min(COLS, row.length); bx++) {
      const cell = row[bx];
      if (cell === null) continue;
      const k = by * COLS + bx;
      if (!inside[k]) continue;                     // outside: leave it alone
      const vx = sm[k * 2], vy = sm[k * 2 + 1];
      const isEdge = m.blockCov[k] > 0.02 && m.blockCov[k] < 0.98;
      if (Array.isArray(cell[0])) {
        blocks4mv++;
        if (isEdge) edge4mv++;
        const [fx, fy] = swirlForce(bx, by, m.ownCx[k], m.ownCy[k], i);
        for (let q = 0; q < cell.length; q++) {
          const [q1, q2] = clampToFrame(bx, by,
            (vx + fx * m.blockCov[k]) * 0.5, (vy + fy * m.blockCov[k]) * 0.5);
          cell[q] = [clampv(q1), clampv(q2)];
        }
      } else {
        forced1mv++;
        const [cx2, cy2] = clampToFrame(bx, by, vx, vy);
        cell[0] = clampv(cx2);
        cell[1] = clampv(cy2);
      }
      touched++;
    }
  }

  // 4. how far apart neighbouring vectors are INSIDE an opening
  for (let by = 0; by < ROWS; by++) {
    for (let bx = 0; bx < COLS - 1; bx++) {
      const a = by * COLS + bx, b = a + 1;
      if (!inside[a] || !inside[b]) continue;
      const d = Math.hypot(sm[a * 2] - sm[b * 2], sm[a * 2 + 1] - sm[b * 2 + 1]);
      neighbourDiffs.push(d);
      if (d > maxNeighbourDiff) maxNeighbourDiff = d;
    }
  }
  for (let by = 0; by < ROWS - 1; by++) {
    for (let bx = 0; bx < COLS; bx++) {
      const a = by * COLS + bx, b = a + COLS;
      if (!inside[a] || !inside[b]) continue;
      const d = Math.hypot(sm[a * 2] - sm[b * 2], sm[a * 2 + 1] - sm[b * 2 + 1]);
      neighbourDiffs.push(d);
      if (d > maxNeighbourDiff) maxNeighbourDiff = d;
    }
  }
}

/* ------------- the geometry that actually spawned, counted per opening */
// Walk the spawn rule rather than the masks: a radius and a lifespan belong
// to an opening, not to a frame, so each is counted once at the frame its
// opening began.
const radSeen = [], lifeSeen = [];
let spawnWSum = 0, spawnWN = 0;
{
  const seen = new Set();
  for (let f = 0; f < N; f++) {
    const { amt, rad } = op.field(f);
    for (let by = 0; by < ROWS; by++) {
      for (let bx = 0; bx < COLS; bx++) {
        const k = by * COLS + bx;
        if (amt[k] <= 0.001) continue;
        const h = hash12(bx * 1.17 + seed, by * 1.17 + seed);
        const life = geom.lifeMin + h * (geom.lifeMax - geom.lifeMin);
        const rest = geom.restMin
          + hash12(bx * 2.31 + seed * 3, by * 2.31 + seed * 3)
          * (geom.restMax - geom.restMin);
        const period = life + rest;
        const phase = hash12(bx * 0.73 + seed * 5.5, by * 0.73 + seed * 5.5);
        const cyc = Math.floor((f + phase * period) / period);
        const id = `${k}:${cyc}`;
        if (seen.has(id)) continue;
        seen.add(id);
        radSeen.push(rad[k]);
        lifeSeen.push(life);
        spawnWSum += op.weightAt(bx, by, f); spawnWN++;
      }
    }
  }
}

console.log(`forced ${touched} blocks inside openings  `
  + `(${forced1mv} as 1MV, ${blocks4mv} as 4MV, ${edge4mv} of those on an edge)`);

const appliedJson = path.join(TMP, "applied.json");
await writeFile(appliedJson, JSON.stringify(doc));
const applied = path.join(TMP, "applied.mpeg4");
sh(`${FG}/ffedit.exe`, ["-i", gac, "-f", "mv", "-a", appliedJson, "-o", applied],
  { stdio: "pipe" });

/* ------------------------------- composite back through the opening mask */
console.log("\n--- compositing: scene, then the sinking rim, then the core ---");
const moshedMp4 = path.join(TMP, "moshed.mp4");
sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-fflags", "+genpts",
  "-r", String(FPS), "-f", "m4v", "-i", applied,
  "-frames:v", String(N), "-c:v", "libx264", "-preset", "medium",
  "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(FPS), moshedMp4]);

const coreRaw = path.join(TMP, "core.raw");
const rimRaw = path.join(TMP, "rim.raw");
const sxRaw = path.join(TMP, "sinkx.raw");
const syRaw = path.join(TMP, "sinky.raw");
await writeFile(coreRaw, coreBuf);
await writeFile(rimRaw, rimBuf);
await writeFile(sxRaw, sxBuf);
await writeFile(syRaw, syBuf);
await mkdir(path.dirname(OUT), { recursive: true });

const rawIn = (p) => ["-f", "rawvideo", "-pix_fmt", "gray",
  "-s", `${W}x${H}`, "-r", String(FPS), "-i", p];
// The scene is the base. On top of it the rim: the scene again, displaced
// outward so it reads as sinking into the hole, shown only through the outer
// ring of each opening. On top of that the core: the moshed underlayer, at
// 0.7, through the opening minus its rim.
sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error",
  "-i", SRC, "-i", moshedMp4,
  ...rawIn(coreRaw), ...rawIn(rimRaw), ...rawIn(sxRaw), ...rawIn(syRaw),
  "-filter_complex",
  "[0:v]format=gbrp,split=2[sA][sB];"
  + "[4:v]format=gbrp[xm];[5:v]format=gbrp[ym];"
  + "[sB][xm][ym]displace=edge=smear,format=yuv420p[sunk];"
  + "[3:v]format=gray[rm];[sunk][rm]alphamerge[rimfg];"
  + "[sA]format=yuv420p[base];[base][rimfg]overlay=format=auto[o1];"
  + "[2:v]format=gray[cm];[1:v][cm]alphamerge[corefg];"
  + "[o1][corefg]overlay=format=auto[o]",
  "-map", "[o]", "-frames:v", String(N),
  "-c:v", "libx264", "-preset", "medium", "-crf", "18",
  "-pix_fmt", "yuv420p", "-r", String(FPS), "-movflags", "+faststart", OUT]);

/* ----------------------------------------- how dark did the openings go? */
// Not the whole frame but what is INSIDE an opening, against the scene
// around it, and only over the picture: the bars are not the mosh's fault.
let openingLuma = null;
{
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", OUT, "-f", "rawvideo",
    "-pix_fmt", "gray", "-"], { maxBuffer: 1 << 30 });
  const src = execFileSync("ffmpeg", ["-v", "error", "-i", SRC, "-f", "rawvideo",
    "-pix_fmt", "gray", "-"], { maxBuffer: 1 << 30 });
  let srcBlack = 0;
  let inSum = 0, inN = 0, inBlack = 0, outSum = 0, outN = 0;
  for (const [i, ins] of sampled) {
    const off = i * FR;
    if (off + FR > raw.length) break;
    const R = pic.at(i);
    for (let y = R.y0; y < R.y1; y++) {
      for (let x = R.x0; x < R.x1; x++) {
        const k = y * W + x;
        const v = raw[off + k];
        if (ins[k]) {
          inSum += v; inN++;
          if (v < 16) inBlack++;
          if (off + k < src.length && src[off + k] < 16) srcBlack++;
        } else if (coreBuf[off + k] === 0 && rimBuf[off + k] === 0) {
          outSum += v; outN++;
        }
      }
    }
  }
  const inMean = inN ? inSum / inN : 0;
  const outMean = outN ? outSum / outN : 0;
  const blackPct = inN ? (100 * inBlack) / inN : 0;
  const srcBlackPct = inN ? (100 * srcBlack) / inN : 0;
  const added = blackPct - srcBlackPct;
  const rel = outMean ? (100 * Math.abs(inMean - outMean)) / outMean : 0;
  console.log("");
  console.log("INSIDE THE OPENINGS  (picture area only)");
  console.log(`  near-black (luma < 16)       ${blackPct.toFixed(2)}%`);
  console.log(`  the same pixels, unmoshed    ${srcBlackPct.toFixed(2)}%`);
  console.log(`  black ADDED by the mosh      ${added >= 0 ? "+" : ""}`
    + `${added.toFixed(2)} points   ${added < 15 ? "PASS" : "FAIL"} `
    + `(target: under 15 points added)`);
  console.log(`  mean luma inside             ${inMean.toFixed(2)}`);
  console.log(`  mean luma of the scene       ${outMean.toFixed(2)}`);
  console.log(`  difference                   ${rel.toFixed(1)}%   `
    + `${rel < 20 ? "PASS" : "FAIL"} (target within 20%)`);
  openingLuma = { inMean, outMean, blackPct, srcBlackPct, addedBlackPts: added,
    relDiffPct: rel, pixelsInside: inN, pixelsOutside: outN };
}

/* ------------------------------------------------------- the geometry */
const stat = (a) => {
  if (!a.length) return { min: 0, median: 0, p95: 0, max: 0, mean: 0, n: 0 };
  const s = a.slice().sort((x, y) => x - y);
  return { min: s[0], median: s[s.length >> 1],
    p95: s[Math.floor(s.length * 0.95)], max: s[s.length - 1],
    mean: a.reduce((x, y) => x + y, 0) / a.length, n: a.length };
};
const rs = stat(radSeen), ls = stat(lifeSeen), os = stat(openFrame);
console.log("");
console.log("OPENING GEOMETRY  (per opening, counted once at its spawn)");
console.log(`  openings spawned             ${rs.n}`);
console.log(`  radius, source px            min ${rs.min.toFixed(1)}  `
  + `median ${rs.median.toFixed(1)}  p95 ${rs.p95.toFixed(1)}  `
  + `max ${rs.max.toFixed(1)}`
  + `   ${rs.min >= geom.rMin - 0.5 && rs.max <= geom.rBurst + 0.5 ? "PASS" : "FAIL"}`
  + ` (${geom.rMin}-${geom.rMax}, up to ${geom.rBurst} on a word burst)`);
console.log(`  lifespan, frames             min ${ls.min.toFixed(0)}  `
  + `median ${ls.median.toFixed(0)}  max ${ls.max.toFixed(0)}`
  + `   ${ls.min >= geom.lifeMin - 0.5 && ls.max <= geom.lifeMax + 0.5 ? "PASS" : "FAIL"}`
  + ` (${geom.lifeMin}-${geom.lifeMax})`);
console.log(`  alive at once, per frame     min ${os.min}  median ${os.median}  `
  + `max ${os.max}  mean ${os.mean.toFixed(1)}`);
console.log(`  rim share of opening pixels  `
  + `${(100 * rimPx / Math.max(insidePx, 1)).toFixed(1)}%  `
  + `(outer ${(100 * geom.rim).toFixed(0)}% of the radius, `
  + `sinking up to ${geom.sinkPx}px inward)`);
const spawnW = spawnWN ? spawnWSum / spawnWN : 1;
console.log(`  picture weight where an opening spawned  ${spawnW.toFixed(2)}`);
console.log(`  picture weight over all picture blocks   1.00`
  + `   ${spawnW > 1.05 ? "PASS" : "FAIL"} (openings land on the image)`);

/* --------------------------------------------------- coverage per second */
const perSec = [];
for (let s = 0; s * FPS < N; s++) {
  let sum = 0, cnt = 0;
  for (let f = Math.floor(s * FPS); f < Math.min(N, (s + 1) * FPS); f++) {
    sum += coverFrame[f]; cnt++;
  }
  if (cnt) {
    perSec.push({ second: s, pct: (100 * sum) / cnt,
      drive: op.driveAt(Math.floor((s + 0.5) * FPS)) });
  }
}
console.log("");
console.log("COVERAGE PER SECOND  (share of the PICTURE showing an opening)");
for (const x of perSec) {
  console.log(`  ${String(x.second).padStart(2)}s  `
    + `${x.pct.toFixed(1).padStart(5)}%  drive ${x.drive.toFixed(2)}  `
    + "#".repeat(Math.round(x.pct / 1.2)));
}
const covMin = Math.min(...perSec.map((x) => x.pct));
const covMax = Math.max(...perSec.map((x) => x.pct));
const covMean = perSec.reduce((a, x) => a + x.pct, 0) / perSec.length;
console.log(`  min ${covMin.toFixed(1)}%  mean ${covMean.toFixed(1)}%  `
  + `max ${covMax.toFixed(1)}%  swing ${(covMax - covMin).toFixed(1)} points`);
console.log(`  baseline under 5%: ${covMin <= 5.5 ? "PASS" : "FAIL"}   `
  + `peak 30-40%: ${covMax >= 28 && covMax <= 44 ? "PASS" : "FAIL"}`);

/* ------------------------------------------------------------- measure */
// How much of the VISIBLE opening edge lands on the 16 or 8 px grid.
let edgePx = 0, on16 = 0, on8 = 0;
for (const [i, m] of sampled) {
  const R = pic.at(i);
  for (let y = Math.max(1, R.y0); y < Math.min(H - 1, R.y1); y++) {
    for (let x = Math.max(1, R.x0); x < Math.min(W - 1, R.x1); x++) {
      const v = m[y * W + x] > 0;
      const r = m[y * W + x + 1] > 0, d = m[(y + 1) * W + x] > 0;
      if (v === r && v === d) continue;
      edgePx++;
      if (v !== r && (x + 1) % 16 === 0) on16++;
      else if (v !== d && (y + 1) % 16 === 0) on16++;
      if (v !== r && (x + 1) % 8 === 0) on8++;
      else if (v !== d && (y + 1) % 8 === 0) on8++;
    }
  }
}
const nd = neighbourDiffs.slice().sort((a, b) => a - b);
const med = nd.length ? nd[nd.length >> 1] : 0;
const p99 = nd.length ? nd[Math.floor(nd.length * 0.99)] : 0;

console.log("\n" + "=".repeat(70));
console.log("OPENINGS + FORCEMV");
console.log("=".repeat(70));
console.log(`  blocks forced inside openings   ${touched}`);
console.log(`    as 1MV                        ${forced1mv}`);
console.log(`    as 4MV (8x8)                  ${blocks4mv}`
  + `  of which on an opening edge: ${edge4mv}`);
console.log(`  neighbour vector difference     max ${maxNeighbourDiff.toFixed(2)}`
  + `  median ${med.toFixed(2)}  p99 ${p99.toFixed(2)}  half-pel`);
console.log(`  visible opening edge pixels     ${edgePx}`);
console.log(`    on the 16 px grid             `
  + `${(100 * on16 / Math.max(edgePx, 1)).toFixed(2)}%`);
console.log(`    on the 8 px grid              `
  + `${(100 * on8 / Math.max(edgePx, 1)).toFixed(2)}%`);
console.log(`\noutput -> ${OUT}`);

await writeFile(REPORT, JSON.stringify({
  src: SRC, frames: N, fps: FPS, grid: [COLS, ROWS], organic: org, geom,
  picture: { commonest: { x0: pic.x0, x1: pic.x1, y0: pic.y0, y1: pic.y1 },
    bars: pic.bars, pct: pic.pct, meanPct: pic.meanPct,
    barsInFrames: pic.presentInFrames, perFrame: true },
  conceptWords: CONCEPT_WORDS,
  forced: { total: touched, oneMv: forced1mv, fourMv: blocks4mv, edge4mv },
  neighbour: { max: maxNeighbourDiff, median: med, p99, n: nd.length },
  edge: { pixels: edgePx, on16Pct: 100 * on16 / Math.max(edgePx, 1),
    on8Pct: 100 * on8 / Math.max(edgePx, 1) },
  geometry: { radius: rs, lifespan: ls, aliveAtOnce: os,
    rimSharePct: 100 * rimPx / Math.max(insidePx, 1),
    spawnWeightMean: spawnW },
  openingLuma,
  coveragePerSecond: perSec,
  coverage: { minPct: covMin, meanPct: covMean, maxPct: covMax,
    swingPts: covMax - covMin },
}, null, 1));
console.log(`report -> ${REPORT}`);
