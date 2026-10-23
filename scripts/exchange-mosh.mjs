/**
 * Three relationships, all of them running off the footage's own motion.
 *
 * This replaces the drips, the forced vectors and the cutout openings as
 * the base look. Nothing in here spawns a shape or picks a lifespan.
 *
 *   SURFACE (A)    ffgac with +nopimb and NO +forcemv, so the encoder is
 *                  free to code a still macroblock as nothing at all. An
 *                  ffedit mv script then multiplies the vectors it did
 *                  emit by a gain built from the word envelope times the
 *                  damage curve - about 1 calm, 20+ on a concept word -
 *                  and carries a fraction of the previous frame's
 *                  amplified field into the next, which is the P-frame
 *                  bloom written as arithmetic. The static background
 *                  needs no protecting: 0 x gain is 0, and null x gain is
 *                  still null.
 *
 *   UNDERLAYER (B) the fold, driven by the SAME field. A's amplified
 *                  vectors are exported and transferred onto B with a
 *                  different gain, a much longer memory and a block of
 *                  spatial smoothing, so it answers the same motion like a
 *                  different material: more fluid, slower to let go.
 *
 *   IN-BETWEEN     no holes, no cutouts. Per macroblock, the magnitude of
 *                  the difference between A's response and B's response is
 *                  the third distortion. Where it is strong, a hashed
 *                  per-pixel threshold decides surface or underlayer, so
 *                  the two interleave at single-pixel scale along the edge
 *                  of every drag and settle back wherever the field is
 *                  calm. Binary mask, no blending, pixel-sharp.
 *
 *   node scripts/exchange-mosh.mjs
 *   node scripts/exchange-mosh.mjs --src ... --fold ... --name journey-30s
 */
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  EXCHANGE, makeGain, readField, respond, differenceField,
  exchangeMask, meanCluster,
} from "./lib/mvfield.mjs";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const numOf = (n, d) => Number(argOf(n, String(d)));

const SRC = argOf("--src", "public/mosh-lab/blum-clip-internet.mp4");
const FOLD = argOf("--fold", "public/mosh-lab/blum-internet-tune-B.mp4");
const CONFIG = argOf("--config", "config/composite.json");
const TUNE = argOf("--tune", "public/mosh-lab/blum-internet-tune.json");
const NAME = argOf("--name", "blum-internet-exchange");
const OUTDIR = argOf("--outdir", ".exchange");
const PUBDIR = argOf("--pubdir", "public/mosh-lab");
const REPORT = argOf("--report", `public/mosh-lab/${NAME}.json`);
const DIP = numOf("--dip", 0.05);
const FG = ".tools/ffglitch-0.10.2-windows-x86_64";
const FCODE = 7, FCODE_RANGE = 1023, MB = 16;

const sh = (c, a, o = {}) => execFileSync(c, a,
  { encoding: "utf8", maxBuffer: 1 << 28, ...o });
if (!existsSync(`${FG}/ffgac.exe`)) throw new Error(`ffglitch missing at ${FG}`);

/* ----------------------------------------------------------------- probe */
const probe = JSON.parse(sh("ffprobe", ["-v", "error", "-select_streams", "v:0",
  "-count_frames", "-show_entries",
  "stream=width,height,r_frame_rate,nb_read_frames", "-of", "json", SRC]));
const vs = probe.streams[0];
const W = vs.width, H = vs.height;
const [fn, fd] = vs.r_frame_rate.split("/").map(Number);
const FPS = fn / (fd || 1);
const N = Number(argOf("--frames", String(vs.nb_read_frames)));
const COLS = Math.ceil(W / MB), ROWS = Math.ceil(H / MB), NB = COLS * ROWS;

/* --------------------------------------------- the gain, frame by frame */
const cfg = JSON.parse(await readFile(CONFIG, "utf8"));
const P = { ...EXCHANGE, ...(cfg.exchange ?? {}) };
for (const k of ["amplify", "accum", "bResponse", "bAccum", "bSmooth",
  "strength", "ref", "gammaX", "calmGain", "clampPx", "envTerm",
  "conceptDec", "conceptAtk", "conceptPre"]) {
  if (args.indexOf(`--${k}`) >= 0) P[k] = numOf(`--${k}`, P[k]);
}

const curve = cfg.damageCurve ?? [];
let ENV = new Float32Array(N).fill(0), HITS = [];
try {
  const tune = JSON.parse(await readFile(TUNE, "utf8"));
  const rv = cfg.reveals ?? {};
  const lw = rv.loudnessWeight ?? 0.35;
  const ka = 1 - Math.exp(-1 / Math.max(rv.attack ?? 3, 0.5));
  const kr = 1 - Math.exp(-1 / Math.max((rv.release ?? 1.5) * FPS, 1));
  let e = 0;
  ENV = new Float32Array(tune.frames);
  for (let i = 0; i < tune.frames; i++) {
    const raw0 = Math.min(1, Math.max(0,
      (tune.rawNoLoudness[i] ?? 0) + lw * (tune.loudness[i] ?? 0)));
    e += (raw0 - e) * (raw0 > e ? ka : kr);
    ENV[i] = Math.min(1, Math.max(0, e * (rv.gain ?? 1)));
  }
  HITS = (tune.conceptHits ?? []).map((h) => h.frame).filter((f) => f < N);
} catch { /* no speech track for this source */ }
// A source with no transcript has no concept words to open on. --hits names
// the frames that should get the burst instead - on an edit, its cuts.
if (args.indexOf("--hits") >= 0) {
  HITS = argOf("--hits", "").split(",").map(Number)
    .filter((f) => Number.isFinite(f) && f < N);
}

const { gain, drive } = makeGain({ env: ENV, curve, hits: HITS, frames: N, p: P });
// half-pel, and never past what fcode 7 can actually code
const CLAMP = Math.min(FCODE_RANGE, Math.round(P.clampPx * 2));

// keyframes only where the damage curve dips
const curveAt = (f) => {
  if (!curve.length) return 1;
  const x = (f / Math.max(N - 1, 1)) * (curve.length - 1);
  const i = Math.floor(x), fr = x - i;
  const a = curve[i], b = curve[Math.min(curve.length - 1, i + 1)];
  return a + (b - a) * fr;
};
const dips = [];
for (let f = 0; f < N; f++) if (curveAt(f) < DIP) dips.push(f);
// Keyframes go where the damage curve dips. An edit that has no curve of
// its own needs them named instead: --keys is that, and it is the control
// that decides how legible the result is, because everything between two
// keyframes integrates. A 300-frame run at a sustained gain of 5 carries
// content most of the way across the frame before anything resets it.
const keyOverride = args.indexOf("--keys") >= 0
  ? argOf("--keys", "").split(",").map(Number).filter((f) => Number.isFinite(f))
  : null;
const wantI = [...new Set([0, ...(keyOverride ?? dips)])].sort((a, b) => a - b);
const isKey = (f) => wantI.includes(f);
const stamps = wantI.map((f) => Math.max(0, f / FPS - 1e-4).toFixed(6));

console.log(`${path.basename(SRC)}  ${W}x${H} @ ${FPS}  ${N} frames  grid ${COLS}x${ROWS}`);
console.log(`gain  calm ${P.calmGain}  peak ${P.amplify}  accum ${P.accum}`);
console.log(`under response ${P.bResponse}  accum ${P.bAccum}  smooth ${P.bSmooth}`);
console.log(`exchange strength ${P.strength}  ref ${P.ref}px  gamma ${P.gammaX}`);
console.log(`clamp ${P.clampPx}px (${CLAMP} half-pel of the ${FCODE_RANGE} fcode ${FCODE} allows)`);
console.log(`keyframes at curve dips: ${wantI.join(", ")}`);

/* ---------------------------------------------------------------- encode */
await rm(OUTDIR, { recursive: true, force: true });
await mkdir(OUTDIR, { recursive: true });
const p = (f) => path.join(OUTDIR, f);

/**
 * Layer A carries NO +forcemv. That is the whole reason the static
 * background survives: the encoder leaves a still macroblock null, and a
 * null has nothing to multiply.
 */
const argsA = ["-i", SRC, "-an", "-mpv_flags", "+nopimb",
  "-g", "max", "-sc_threshold", "max", "-qscale:v", "3",
  "-me_range", "1023", "-fcode", String(FCODE),
  "-force_key_frames", stamps.join(","),
  ...(N < Number(vs.nb_read_frames) ? ["-frames:v", String(N)] : []),
  "-vcodec", "mpeg4", "-f", "m4v", "-y", p("cleanA.m4v")];
sh(`${FG}/ffgac.exe`, argsA, { stdio: "pipe" });

/**
 * The fold. A source that has no fold rendered for it gets one built here:
 * the frame mirrored back into itself at three zooms with the centre
 * drifting, which is the same idea as the lab's fractal fold - the picture
 * interleaved with itself along mirror bands - done in the pixel domain so
 * it exists for any clip. --fold <file> uses a rendered fold instead, and
 * that is what the internet clip gets, since the lab already has its own.
 */
let foldSrc = FOLD;
if (FOLD === "auto") {
  foldSrc = p("fold.mp4");
  sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", SRC,
    "-filter_complex",
    `[0:v]split=4[s0][s1][s2][s3];`
    + `[s1]scale=iw*1.7:ih*1.7,crop=${W}:${H}:`
    + `'(iw-${W})/2+90*sin(t*0.63)':'(ih-${H})/2+50*cos(t*0.41)',hflip[f1];`
    + `[s2]scale=iw*2.8:ih*2.8,crop=${W}:${H}:`
    + `'(iw-${W})/2+140*sin(t*0.29+1.7)':'(ih-${H})/2+80*sin(t*0.53)',vflip[f2];`
    + `[s3]scale=iw*4.6:ih*4.6,crop=${W}:${H}:`
    + `'(iw-${W})/2+220*cos(t*0.17)':'(ih-${H})/2+120*sin(t*0.23+0.6)',`
    + `hflip,vflip[f3];`
    + `[s0][f1]blend=all_mode=average[b1];`
    + `[b1][f2]blend=all_mode=average[b2];`
    + `[b2][f3]blend=all_mode=average,format=yuv420p[fold]`,
    "-map", "[fold]", "-frames:v", String(N), "-c:v", "libx264",
    "-preset", "medium", "-crf", "14", "-pix_fmt", "yuv420p", foldSrc]);
}

/**
 * Layer B does carry +forcemv, because every macroblock of it has to be
 * able to accept a transferred vector. It is not given one unless A had
 * something to say there, so it stays just as still as A does.
 */
const argsB = ["-i", foldSrc, "-an", "-mpv_flags", "+forcemv+nopimb",
  "-g", "max", "-sc_threshold", "max", "-qscale:v", "3",
  "-me_range", "1023", "-fcode", String(FCODE),
  "-force_key_frames", stamps.join(","),
  "-frames:v", String(N),
  "-vcodec", "mpeg4", "-f", "m4v", "-y", p("cleanB.m4v")];
sh(`${FG}/ffgac.exe`, argsB, { stdio: "pipe" });

/* ---------------------------------- 1. SURFACE: multiply its own vectors */
const sp = JSON.stringify({
  gainsK: Array.from(gain, (g) => Math.round(g * 1000)),
  accumK: Math.round(P.accum * 1000),
  clamp: CLAMP,
});
sh(`${FG}/ffedit.exe`, ["-i", p("cleanA.m4v"), "-f", "mv",
  "-s", "scripts/ffedit/amplify.js", "-sp", sp, "-o", p("A.m4v"), "-y"],
  { stdio: "pipe" });

// export what the surface actually ended up carrying
sh(`${FG}/ffedit.exe`, ["-i", p("A.m4v"), "-f", "mv", "-e", p("A-mv.json")],
  { stdio: "pipe" });
const A = readField(JSON.parse(readFileSync(p("A-mv.json"), "utf8")), N, COLS, ROWS);

/* ------------------------- 2. UNDERLAYER: the same field, answered slower */
const B = respond(A, {
  response: P.bResponse, accum: P.bAccum, smooth: P.bSmooth, isKey, clamp: CLAMP,
});

// write B's field into B's own exported structure and apply it back
sh(`${FG}/ffedit.exe`, ["-i", p("cleanB.m4v"), "-f", "mv", "-e", p("B-tmpl.json")],
  { stdio: "pipe" });
const bdoc = JSON.parse(readFileSync(p("B-tmpl.json"), "utf8"));
let bSet = 0, bNull = 0;
for (let f = 0; f < N; f++) {
  const fr = bdoc.streams[0].frames[f];
  const fwd = fr?.mv?.forward;
  if (!fwd) continue;
  fr.mv.overflow = "truncate";
  const off = f * NB;
  for (let by = 0; by < ROWS; by++) {
    const row = fwd[by]; if (!row) continue;
    for (let bx = 0; bx < COLS; bx++) {
      const v = row[bx];
      if (v === null) { bNull++; continue; }
      const k = off + by * COLS + bx;
      const vx = Math.round(B.x[k]), vy = Math.round(B.y[k]);
      // a 4MV macroblock exports as four pairs; give them all the same
      // vector rather than quietly dropping three of them
      if (Array.isArray(v[0])) for (const q of v) { q[0] = vx; q[1] = vy; }
      else { v[0] = vx; v[1] = vy; }
      bSet++;
    }
  }
}
await writeFile(p("B-mv.json"), JSON.stringify(bdoc));
sh(`${FG}/ffedit.exe`, ["-i", p("cleanB.m4v"), "-f", "mv",
  "-a", p("B-mv.json"), "-o", p("B.m4v"), "-y"], { stdio: "pipe" });

/* ------------------------------------- 3. IN-BETWEEN: the per-pixel swap */
const diff = differenceField(A, B);
const maskRaw = p("exchange.raw");
const mask = new Uint8Array(W * H);
const covPerFrame = new Float64Array(N);
const clusterSamples = [];
{
  const buf = Buffer.alloc(W * H * N);
  for (let f = 0; f < N; f++) {
    const on = exchangeMask(diff, f, W, H, MB, mask, P);
    covPerFrame[f] = on / (W * H);
    buf.set(mask, f * W * H);
    if (f % 5 === 0 && on > 0) clusterSamples.push(meanCluster(mask, W, H));
  }
  await writeFile(maskRaw, buf);
}

/* ------------------------------------------------------------- composite */
await mkdir(PUBDIR, { recursive: true });
const outA = path.join(PUBDIR, `${NAME}-A.mp4`);
const outB = path.join(PUBDIR, `${NAME}-B.mp4`);
const outF = path.join(PUBDIR, `${NAME}.mp4`);
const dec = (m4v, out, crf) => sh("ffmpeg", ["-y", "-hide_banner", "-loglevel",
  "error", "-fflags", "+genpts", "-r", String(FPS), "-f", "m4v", "-i", m4v,
  "-frames:v", String(N), "-c:v", "libx264", "-preset", "medium", "-crf",
  String(crf), "-pix_fmt", "yuv420p", "-r", String(FPS),
  "-movflags", "+faststart", out]);
dec(p("A.m4v"), outA, 16);
dec(p("B.m4v"), outB, 16);

// one encode, not two: the swap happens on the decoded planes in gbrp, so
// a single exchanged pixel is never averaged with its neighbour on the way
sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error",
  "-fflags", "+genpts", "-r", String(FPS), "-f", "m4v", "-i", p("A.m4v"),
  "-fflags", "+genpts", "-r", String(FPS), "-f", "m4v", "-i", p("B.m4v"),
  "-f", "rawvideo", "-pix_fmt", "gray", "-s", `${W}x${H}`, "-r", String(FPS),
  "-i", maskRaw,
  "-filter_complex",
  "[0:v]format=gbrp[a];[1:v]format=gbrp[b];[2:v]format=gray[m];"
  + "[b][m]alphamerge[bf];[a][bf]overlay=format=gbrp:eof_action=pass[o]",
  "-map", "[o]", "-frames:v", String(N),
  "-c:v", "libx264", "-preset", "slow", "-crf", "14",
  "-pix_fmt", "yuv420p", "-r", String(FPS), "-movflags", "+faststart", outF]);

/* ------------------------------------------------------------- measuring */
const grayOf = (file, frames) => {
  const out = p(`${path.basename(file, path.extname(file))}.gray`);
  sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", file,
    "-frames:v", String(frames), "-f", "rawvideo", "-pix_fmt", "gray", out]);
  return readFileSync(out);
};
const gSrc = grayOf(SRC, N);
const gOut = grayOf(outF, N);
const px = W * H;

/**
 * 1. The static background, measured two ways, because one number on its
 *    own would be misleading either way round.
 *
 *    "still" is a pixel the SOURCE has not changed by more than 2 since
 *    the previous frame. "clean" is the output still matching the source
 *    there within codec noise.
 *
 *    The first number is every still pixel. It is pulled down by something
 *    that is not a failure of this design: once a frame is damaged, every
 *    skipped macroblock after it repeats that damage until the next
 *    keyframe, so a shot that freezes after being moshed reads as dirty
 *    for as long as it stays frozen. That is what a datamosh is.
 *
 *    The second number is the one that tests the claim actually being
 *    made - that nothing here invents motion where the footage had none.
 *    It counts only still pixels whose macroblock has carried no non-zero
 *    vector at any point since the last keyframe, so the damage of an
 *    earlier frame cannot be charged to a block that was never touched.
 */
const touched = new Uint8Array(NB);
let staticPx = 0, staticClean = 0;
let untouchedPx = 0, untouchedClean = 0;
for (let f = 1; f < N; f++) {
  if (isKey(f)) touched.fill(0);
  const off = f * NB;
  for (let k = 0; k < NB; k++) {
    if (A.has[off + k] && (A.x[off + k] !== 0 || A.y[off + k] !== 0)) touched[k] = 1;
  }
  const o = f * px, o1 = (f - 1) * px;
  for (let k = 0; k < px; k++) {
    if (Math.abs(gSrc[o + k] - gSrc[o1 + k]) > 2) continue;
    const y = (k / W) | 0, x = k - y * W;
    const blk = ((y / MB) | 0) * COLS + ((x / MB) | 0);
    const ok = Math.abs(gOut[o + k] - gSrc[o + k]) <= 6;
    staticPx++; if (ok) staticClean++;
    if (!touched[blk]) { untouchedPx++; if (ok) untouchedClean++; }
  }
}

// 2. mean |mv| per frame for each layer, in pixels
const meanMv = (F, hasMask) => {
  const out = new Float64Array(N);
  for (let f = 0; f < N; f++) {
    let s = 0, c = 0;
    const off = f * NB;
    for (let k = 0; k < NB; k++) {
      if (hasMask && !A.has[off + k]) continue;
      s += Math.hypot(F.x[off + k], F.y[off + k]) / 2; c++;
    }
    out[f] = c ? s / c : 0;
  }
  return out;
};
const mvA = meanMv(A, false), mvB = meanMv(B, false);

// 3/5. per second
const secs = Math.ceil(N / FPS);
const perSecond = [];
for (let s = 0; s < secs; s++) {
  const f0 = Math.round(s * FPS), f1 = Math.min(N, Math.round((s + 1) * FPS));
  const avg = (arr) => {
    let t = 0; for (let f = f0; f < f1; f++) t += arr[f]; return t / (f1 - f0);
  };
  perSecond.push({
    second: s,
    gain: +avg(gain).toFixed(2),
    envelope: +avg(ENV).toFixed(3),
    exchangePct: +(100 * avg(covPerFrame)).toFixed(2),
    mvA: +avg(mvA).toFixed(2),
    mvB: +avg(mvB).toFixed(2),
  });
}

// 4. cluster size of the exchanged pixels
const cl = clusterSamples.length
  ? {
    mean: clusterSamples.reduce((a, c) => a + c.mean, 0) / clusterSamples.length,
    biggest: Math.max(...clusterSamples.map((c) => c.biggest)),
    frames: clusterSamples.length,
  }
  : { mean: 0, biggest: 0, frames: 0 };

// how much of the surface the encoder left alone in the first place
let nullBlocks = 0, totalP = 0;
for (let f = 0; f < N; f++) {
  if (isKey(f)) continue;
  const off = f * NB;
  for (let k = 0; k < NB; k++) { totalP++; if (!A.has[off + k]) nullBlocks++; }
}

const covs = Array.from(covPerFrame);
const r = (v, n = 2) => +v.toFixed(n);
const pct = (a, b) => (b ? (100 * a) / b : 0);

console.log("");
console.log("=".repeat(72));
console.log("MEASUREMENTS");
console.log("=".repeat(72));
console.log(`  still pixels examined                ${staticPx}`);
console.log(`  of those, still clean in the output  ${staticClean}  `
  + `(${r(pct(staticClean, staticPx))}%)`);
console.log(`  still pixels in blocks the field never touched  ${untouchedPx}`);
console.log(`  of those, still clean in the output  ${untouchedClean}  `
  + `(${r(pct(untouchedClean, untouchedPx))}%)`);
console.log(`  surface macroblocks left null by the encoder  `
  + `${r(pct(nullBlocks, totalP))}% of P-frame blocks`);
console.log(`  underlayer blocks given a vector     ${bSet} (${bNull} left null)`);
console.log(`  gain            min ${r(Math.min(...gain))}  `
  + `max ${r(Math.max(...gain))}`);
console.log(`  mean |mv| A     min ${r(Math.min(...mvA))}  `
  + `max ${r(Math.max(...mvA))} px`);
console.log(`  mean |mv| B     min ${r(Math.min(...mvB))}  `
  + `max ${r(Math.max(...mvB))} px`);
console.log(`  exchange        min ${r(100 * Math.min(...covs))}%  `
  + `mean ${r(100 * covs.reduce((a, c) => a + c, 0) / N)}%  `
  + `max ${r(100 * Math.max(...covs))}%`);
console.log(`  exchanged pixel clusters  mean ${r(cl.mean)} px  `
  + `biggest ${cl.biggest} px  (over ${cl.frames} frames)`);
console.log("");
console.log("  s   gain   env   exchange%   |mv|A   |mv|B");
for (const s of perSecond) {
  console.log(`  ${String(s.second).padStart(2)}  `
    + `${String(s.gain).padStart(5)}  ${String(s.envelope).padStart(5)}  `
    + `${String(s.exchangePct).padStart(9)}  ${String(s.mvA).padStart(5)}  `
    + `${String(s.mvB).padStart(5)}`);
}

await mkdir(path.dirname(REPORT), { recursive: true });
await writeFile(REPORT, JSON.stringify({
  name: NAME, src: SRC, fold: foldSrc, frames: N, fps: FPS, size: [W, H],
  grid: [COLS, ROWS], params: P, keyframes: wantI, conceptHits: HITS,
  outputs: { surface: outA, underlayer: outB, composite: outF },
  measurements: {
    staticBackground: { pixels: staticPx, clean: staticClean,
      pctClean: pct(staticClean, staticPx),
      untouchedPixels: untouchedPx, untouchedClean,
      pctUntouchedClean: pct(untouchedClean, untouchedPx) },
    surfaceNullBlocksPct: pct(nullBlocks, totalP),
    underlayerBlocksSet: bSet, underlayerBlocksNull: bNull,
    gain: { min: Math.min(...gain), max: Math.max(...gain) },
    mvA: { min: Math.min(...mvA), max: Math.max(...mvA) },
    mvB: { min: Math.min(...mvB), max: Math.max(...mvB) },
    exchange: { minPct: 100 * Math.min(...covs), maxPct: 100 * Math.max(...covs),
      meanPct: 100 * covs.reduce((a, c) => a + c, 0) / N },
    clusters: cl,
  },
  perSecond,
  perFrame: Array.from({ length: N }, (_, f) => ({
    frame: f, gain: +gain[f].toFixed(3), drive: +drive[f].toFixed(3),
    env: +(ENV[f] ?? 0).toFixed(3), mvA: +mvA[f].toFixed(3), mvB: +mvB[f].toFixed(3),
    exchangePct: +(100 * covPerFrame[f]).toFixed(3),
  })),
}, null, 1));

console.log("");
console.log(`surface     -> ${outA}`);
console.log(`underlayer  -> ${outB}`);
console.log(`composite   -> ${outF}`);
console.log(`report      -> ${REPORT}`);
