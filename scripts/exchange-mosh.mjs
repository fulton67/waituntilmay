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
import { execFileSync, spawnSync } from "node:child_process";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  EXCHANGE, makeGain, makeBreaks, readField, respond, differenceField,
  motionField, exchangeMask, meanCluster,
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
// Recursion is an option, never the default. At 1 this is the current look.
let GENS = 1, GEN_DECAY = 0.7;
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
  "xFloor", "xPeak", "dOn", "dFull", "calmGain", "clampPx", "envTerm",
  "conceptDec", "conceptAtk", "conceptPre",
  "quietThresh", "quietMin", "breakMax", "breakRamp", "breakEvery",
  "moveRef", "moveDecay", "moveDilate"]) {
  if (args.indexOf(`--${k}`) >= 0) P[k] = numOf(`--${k}`, P[k]);
}

GENS = Math.max(1, Math.min(5, Math.round(
  args.indexOf("--generations") >= 0 ? numOf("--generations", 1)
    : (cfg.exchange?.generations ?? 1))));
GEN_DECAY = args.indexOf("--gen-decay") >= 0 ? numOf("--gen-decay", 0.7)
  : (cfg.exchange?.genDecay ?? 0.7);

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

const { gain, conceptAt } =
  makeGain({ env: ENV, curve, hits: HITS, frames: N, p: P });
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
console.log(`exchange floor ${P.xFloor}  peak ${P.xPeak}  active ${P.dOn}-${P.dFull}px`);
console.log(`clamp ${P.clampPx}px (${CLAMP} half-pel of the ${FCODE_RANGE} fcode ${FCODE} allows)`);
console.log(`keyframes at curve dips: ${wantI.join(", ")}`);
console.log(`generations ${GENS}, gain decay ${GEN_DECAY} per generation`);

/* ----------------------------------- shared across every generation ---- */
await rm(OUTDIR, { recursive: true, force: true });
await mkdir(OUTDIR, { recursive: true });
await mkdir(PUBDIR, { recursive: true });

/**
 * The ORIGINAL clip in grey. Every generation is measured against this
 * one, not against whatever it was handed: "the background stayed clean"
 * has to mean clean relative to the footage, or generation five would be
 * scored against generation four and a steady slide would read as perfect.
 */
const ORIGINAL = SRC;
const GSRC = (() => {
  const out = path.join(OUTDIR, "source.gray");
  sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", SRC,
    "-frames:v", String(N), "-f", "rawvideo", "-pix_fmt", "gray", out]);
  return readFileSync(out);
})();

/** ffmpeg writes the psnr summary to stderr, success or not. */
function psnrAgainst(a, b, frames) {
  // execFileSync hands back stdout only, and ffmpeg reports psnr on
  // stderr whether or not it succeeded, so this has to be spawnSync
  const r2 = spawnSync("ffmpeg", ["-hide_banner", "-i", a, "-i", b,
    "-lavfi", "[0:v][1:v]psnr", "-frames:v", String(frames), "-f", "null", "-"],
    { encoding: "utf8", maxBuffer: 1 << 26 });
  const txt = String(r2.stderr ?? "") + String(r2.stdout ?? "");
  const m = /average:([0-9.]+)/.exec(txt);
  return m ? Number(m[1]) : null;
}

/* ------------------------------------------------------------ generation */
/**
 * One whole pass of the three relationships.
 *
 * At Generations 1 this runs once and nothing about the look has changed.
 * Above 1, the composite it returns becomes the next generation's SOURCE:
 * re-encoded from scratch, so the encoder meets the previous generation's
 * drag and grain as if they were footage and finds its own motion in them.
 * That is the whole recursion - nothing is carried forward but pixels.
 *
 * The still parts of the room survive it, and not by being protected. A
 * region the encoder found nothing in stays null, a null has nothing to
 * multiply, and the next generation re-encodes a region that still has not
 * changed. 0 x gain is 0 however many times you apply it.
 */
async function runGeneration(gen, srcPath, foldPath, genGain) {
/* ---------------------------------------------------------------- encode */
const dir = path.join(OUTDIR, `g${gen}`);
await mkdir(dir, { recursive: true });
const p = (f) => path.join(dir, f);
const suffix = gen > 1 ? `-gen${gen}` : "";

/**
 * Layer A carries NO +forcemv. That is the whole reason the static
 * background survives: the encoder leaves a still macroblock null, and a
 * null has nothing to multiply.
 */
const argsA = ["-i", srcPath, "-an", "-mpv_flags", "+nopimb",
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
let foldSrc = foldPath;
if (foldPath === "auto") {
  foldSrc = p("fold.mp4");
  sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", srcPath,
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

// what the encoder said before anything touched it. On a source with no
// transcript this is the only envelope there is: the footage's own motion.
sh(`${FG}/ffedit.exe`, ["-i", p("cleanA.m4v"), "-f", "mv",
  "-e", p("cleanA-mv.json")], { stdio: "pipe" });
const CLEAN = readField(
  JSON.parse(readFileSync(p("cleanA-mv.json"), "utf8")), N, COLS, ROWS);

/* ---------------------------------- 1. SURFACE: multiply its own vectors */
const sp = JSON.stringify({
  gainsK: Array.from(genGain, (g) => Math.round(g * 1000)),
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
const move = motionField(CLEAN,
  { ref: P.moveRef, decay: P.moveDecay, dilate: P.moveDilate });
const px = W * H;

// the source in grey, which both the exchange measurements and the static
// background measurement read
const grayOf = (file, frames) => {
  const out = p(`${path.basename(file, path.extname(file))}.gray`);
  sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", file,
    "-frames:v", String(frames), "-f", "rawvideo", "-pix_fmt", "gray", out]);
  return readFileSync(out);
};
const gSrc = GSRC;

/**
 * The moving region, as the eye would pick it out: anywhere the source
 * changed in the last MOVE_WIN frames, not only since the last one. A
 * figure that pauses for three frames is still the figure, and the
 * underlayer's memory outlasts the motion that drove it by about ten
 * frames anyway, so an instantaneous test would score the tail of every
 * drag as background.
 */
const MOVE_WIN = 8, MOVE_T = 6, STILL_T = 2, MOVE_CLOSE = 6;
const moveHist = [];
const moving = new Uint8Array(px), still = new Uint8Array(px);
const tmpA = new Uint8Array(px), tmpB = new Uint8Array(px);

/**
 * Separable 1D max (dilate) or min (erode) of a 0/1 mask, radius r.
 * A dilate followed by an erode of the same radius is a morphological
 * close: it fills the inside of a shape without growing its outside.
 */
const morph = (src, dst, r, grow) => {
  for (let y = 0; y < H; y++) {
    const row = y * W;
    for (let x = 0; x < W; x++) {
      let v = grow ? 0 : 1;
      for (let d = -r; d <= r; d++) {
        const xx = x + d; if (xx < 0 || xx >= W) continue;
        const s2 = src[row + xx];
        if (grow) { if (s2) { v = 1; break; } } else if (!s2) { v = 0; break; }
      }
      tmpA[row + x] = v;
    }
  }
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      let v = grow ? 0 : 1;
      for (let d = -r; d <= r; d++) {
        const yy = y + d; if (yy < 0 || yy >= H) continue;
        const s2 = tmpA[yy * W + x];
        if (grow) { if (s2) { v = 1; break; } } else if (!s2) { v = 0; break; }
      }
      dst[y * W + x] = v;
    }
  }
};

/**
 * How open the exchange is this frame. The floor is what it does wherever
 * the field is awake; a concept word lifts it toward the peak, which is
 * deliberately over the percolation threshold so the grain briefly joins
 * up into structure; a break takes it to zero and the clean surface shows.
 */
const act = new Float32Array(N);
{
  const envHot = ENV.length && Math.max(...ENV) > 0.05;
  if (envHot) {
    for (let f = 0; f < N; f++) act[f] = Math.min(1, ENV[Math.min(ENV.length - 1, f)]);
  } else {
    // no transcript: the footage's own motion, smoothed, is the envelope
    const raw = new Float32Array(N);
    for (let f = 0; f < N; f++) {
      let t = 0; const off = f * NB;
      for (let k = 0; k < NB; k++) {
        if (CLEAN.has[off + k]) t += Math.hypot(CLEAN.x[off + k], CLEAN.y[off + k]) / 2;
      }
      raw[f] = t / NB;
    }
    const hi = Math.max(...raw) || 1;
    let e = 0;
    for (let f = 0; f < N; f++) {
      const v = Math.min(1, raw[f] / (hi * 0.35));
      e += (v - e) * (v > e ? 0.5 : 0.06);     // fast up, slow down
      act[f] = Math.min(1, e);
    }
  }
}
const { gate, breaks } = makeBreaks({ act, frames: N, fps: FPS, p: P });
const pmaxAt = new Float32Array(N);
for (let f = 0; f < N; f++) {
  const c = Math.min(1, Math.max(0, conceptAt(f)));
  pmaxAt[f] = gate[f] * (P.xFloor + (P.xPeak - P.xFloor) * c);
}

const maskRaw = p("exchange.raw");
const mask = new Uint8Array(W * H);
const covPerFrame = new Float64Array(N);
const movShare = new Float64Array(N), bgShare = new Float64Array(N);
const movPix = new Float64Array(N), bgPix = new Float64Array(N);
const clusterSamples = [];
{
  const buf = Buffer.alloc(W * H * N);
  for (let f = 0; f < N; f++) {
    const on = exchangeMask(diff, f, W, H, MB, mask, P, pmaxAt[f], move);
    covPerFrame[f] = on / px;
    buf.set(mask, f * px);
    if (f % 5 === 0 && on > 0) clusterSamples.push(meanCluster(mask, W, H));

    // moving region vs still background, and what each got
    const d = new Uint8Array(px);
    if (f > 0) {
      const o = f * px, o1 = (f - 1) * px;
      for (let k = 0; k < px; k++) if (Math.abs(gSrc[o + k] - gSrc[o1 + k]) > MOVE_T) d[k] = 1;
    }
    moveHist.push(d);
    if (moveHist.length > MOVE_WIN) moveHist.shift();
    moving.fill(0);
    for (const h of moveHist) for (let k = 0; k < px; k++) if (h[k]) moving[k] = 1;
    // The figure, not its outline. A luma difference finds the textured
    // parts of something that moved and misses the flat middle of it, so
    // without this the inside of a coat is scored as background while the
    // eye plainly reads it as the figure. Close, do not dilate: the
    // outside edge of the region is where it was.
    morph(moving, tmpB, MOVE_CLOSE, true);
    morph(tmpB, moving, MOVE_CLOSE, false);
    still.fill(0);
    if (f > 0) {
      const o = f * px, o1 = (f - 1) * px;
      for (let k = 0; k < px; k++) {
        if (!moving[k] && Math.abs(gSrc[o + k] - gSrc[o1 + k]) <= STILL_T) still[k] = 1;
      }
    }
    let mN = 0, mX = 0, bN = 0, bX = 0;
    for (let k = 0; k < px; k++) {
      if (moving[k]) { mN++; if (mask[k]) mX++; }
      else if (still[k]) { bN++; if (mask[k]) bX++; }
    }
    movPix[f] = mN; bgPix[f] = bN;
    movShare[f] = mN ? mX / mN : 0;
    bgShare[f] = bN ? bX / bN : 0;
  }
  await writeFile(maskRaw, buf);
}

/* ------------------------------------------------------------- composite */
await mkdir(PUBDIR, { recursive: true });
const outA = path.join(PUBDIR, `${NAME}${suffix}-A.mp4`);
const outB = path.join(PUBDIR, `${NAME}${suffix}-B.mp4`);
const outF = path.join(PUBDIR, `${NAME}${suffix}.mp4`);
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
const gOut = grayOf(outF, N);

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
  // weighted by how many pixels each region actually had that second, so
  // a frame with almost no moving pixels cannot swing the share
  const share = (num, den) => {
    let a = 0, b = 0;
    for (let f = f0; f < f1; f++) { a += num[f] * den[f]; b += den[f]; }
    return b ? a / b : 0;
  };
  let camSum = 0, camN = 0;
  for (let f = f0; f < f1; f++) {
    const off = f * NB;
    for (let k = 0; k < NB; k++) { camSum += move.m[off + k]; camN++; }
  }
  perSecond.push({
    second: s,
    cameraPct: +(100 * (camN ? camSum / camN : 0)).toFixed(1),
    gain: +avg(genGain).toFixed(2),
    envelope: +avg(ENV).toFixed(3),
    activity: +avg(act).toFixed(3),
    gate: +avg(gate).toFixed(2),
    exchangePct: +(100 * avg(covPerFrame)).toFixed(2),
    movingPct: +(100 * share(movShare, movPix)).toFixed(2),
    backgroundPct: +(100 * share(bgShare, bgPix)).toFixed(2),
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
console.log(`MEASUREMENTS - generation ${gen} of ${GENS}`);
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
console.log(`  gain            min ${r(Math.min(...genGain))}  `
  + `max ${r(Math.max(...genGain))}`);
console.log(`  mean |mv| A     min ${r(Math.min(...mvA))}  `
  + `max ${r(Math.max(...mvA))} px`);
console.log(`  mean |mv| B     min ${r(Math.min(...mvB))}  `
  + `max ${r(Math.max(...mvB))} px`);
console.log(`  exchange        min ${r(100 * Math.min(...covs))}%  `
  + `mean ${r(100 * covs.reduce((a, c) => a + c, 0) / N)}%  `
  + `max ${r(100 * Math.max(...covs))}%`);
console.log(`  exchanged pixel clusters  mean ${r(cl.mean)} px  `
  + `biggest ${cl.biggest} px  (over ${cl.frames} frames)`);
const movAll = perSecond.filter((x) => x.movingPct > 0);
const okMov = movAll.filter((x) => x.movingPct >= 35).length;
// "background" only means something where there IS one. A second whose
// camera is moving has no still background to keep clean - every block of
// it moved - so scoring it against a 5% target would be scoring the wrong
// thing. cameraPct is the share of the frame the footage itself moved.
const LOCKED = 45;
const locked = perSecond.filter((x) => x.cameraPct < LOCKED);
const okBg = locked.filter((x) => x.backgroundPct < 5).length;
const okBgAll = perSecond.filter((x) => x.backgroundPct < 5).length;
console.log(`  breaks (clean surface)   ${breaks.length}: `
  + `${breaks.map(([a, b]) => `${a}-${b} (${((b - a) / FPS).toFixed(1)}s)`).join(", ") || "none"}`);
console.log(`  seconds with a moving region         ${movAll.length}`);
console.log(`  of those, moving region over 35%     ${okMov}  `
  + `(${r(pct(okMov, movAll.length))}%)`);
console.log(`  seconds on a locked-off camera       ${locked.length} `
  + `(under ${LOCKED}% of the frame moving)`);
console.log(`  of those, background under 5%        ${okBg}  `
  + `(${r(pct(okBg, locked.length))}%)`);
console.log(`  background under 5% over all seconds ${okBgAll}  `
  + `(${r(pct(okBgAll, perSecond.length))}%)`);
console.log("");
console.log("  s   cam%  gain  gate   exch%   moving%    bg%   |mv|A  |mv|B");
for (const s of perSecond) {
  console.log(`  ${String(s.second).padStart(2)}  `
    + `${String(s.cameraPct).padStart(5)} ${String(s.gain).padStart(5)}  `
    + `${String(s.gate).padStart(4)}  ${String(s.exchangePct).padStart(6)}  `
    + `${String(s.movingPct).padStart(7)}  ${String(s.backgroundPct).padStart(5)}  `
    + `${String(s.mvA).padStart(5)}  ${String(s.mvB).padStart(5)}`);
}


/**
 * How far the picture has travelled from the one it started as. Rising
 * generations trade structure for noise, and this is where that shows:
 * PSNR falls while the thing still has shape, then collapses.
 */
const psnr = psnrAgainst(outF, ORIGINAL, N);
console.log(`  PSNR vs the clean clip               ${
  psnr === null ? "n/a" : psnr.toFixed(2) + " dB"}`);

return {
  generation: gen,
  source: srcPath, fold: foldSrc,
  outputs: { surface: outA, underlayer: outB, composite: outF },
  gain: { min: Math.min(...genGain), max: Math.max(...genGain) },
  psnr,
  staticBackground: { pixels: staticPx, clean: staticClean,
    pctClean: pct(staticClean, staticPx),
    untouchedPixels: untouchedPx, untouchedClean,
    pctUntouchedClean: pct(untouchedClean, untouchedPx) },
  surfaceNullBlocksPct: pct(nullBlocks, totalP),
  underlayerBlocksSet: bSet, underlayerBlocksNull: bNull,
  mvA: { min: Math.min(...mvA), max: Math.max(...mvA),
    mean: mvA.reduce((a, c) => a + c, 0) / N },
  mvB: { min: Math.min(...mvB), max: Math.max(...mvB),
    mean: mvB.reduce((a, c) => a + c, 0) / N },
  exchange: { minPct: 100 * Math.min(...covs), maxPct: 100 * Math.max(...covs),
    meanPct: 100 * covs.reduce((a, c) => a + c, 0) / N },
  clusters: cl,
  movingRegion: { secondsWithMotion: movAll.length, secondsOver35: okMov,
    pctOver35: pct(okMov, movAll.length) },
  background: { lockedSeconds: locked.length, lockedUnder5: okBg,
    pctLockedUnder5: pct(okBg, locked.length),
    allUnder5: okBgAll, pctAllUnder5: pct(okBgAll, perSecond.length),
    lockedThresholdPct: LOCKED },
  breaks: breaks.map(([a, b]) => ({ from: a, to: b, seconds: (b - a) / FPS })),
  perSecond,
};
}

/* --------------------------------------------------- run the generations */
const gens = [];
let src = SRC;
for (let g = 1; g <= GENS; g++) {
  // every generation reads the same words and the same curve. Only the
  // gain it is allowed decays, so a fifth pass adds detail to what the
  // fourth left rather than another full-strength throw on top of it.
  const decay = Math.pow(GEN_DECAY, g - 1);
  const gg = new Float32Array(N);
  for (let f = 0; f < N; f++) gg[f] = 1 + (gain[f] - 1) * decay;
  // and the fold of each generation is a fold of THAT generation's source,
  // so its structure lands inside the grain the last one left
  const res = await runGeneration(g, src, g === 1 ? FOLD : "auto", gg);
  gens.push(res);
  src = res.outputs.composite;
}

console.log("");
console.log("=".repeat(72));
console.log("GENERATIONS");
console.log("=".repeat(72));
console.log("  gen   gain  still%  untouched%  mean|mv|A  mean|mv|B  "
  + " exch%  cluster   PSNR");
for (const x of gens) {
  console.log(`  ${String(x.generation).padStart(3)}  `
    + `${x.gain.max.toFixed(1).padStart(5)}  `
    + `${x.staticBackground.pctClean.toFixed(1).padStart(6)}  `
    + `${x.staticBackground.pctUntouchedClean.toFixed(1).padStart(10)}  `
    + `${x.mvA.mean.toFixed(2).padStart(9)}  `
    + `${x.mvB.mean.toFixed(2).padStart(9)}  `
    + `${x.exchange.meanPct.toFixed(1).padStart(6)}  `
    + `${x.clusters.mean.toFixed(2).padStart(7)}  `
    + `${x.psnr === null ? "    n/a" : (x.psnr.toFixed(2) + " dB").padStart(8)}`);
}

const last = gens[gens.length - 1];
await mkdir(path.dirname(REPORT), { recursive: true });
await writeFile(REPORT, JSON.stringify({
  name: NAME, src: SRC, fold: FOLD, frames: N, fps: FPS, size: [W, H],
  generations: GENS, genDecay: GEN_DECAY,
  grid: [COLS, ROWS], params: P, keyframes: wantI, conceptHits: HITS,
  outputs: last.outputs,
  byGeneration: gens,
  measurements: {
    staticBackground: last.staticBackground,
    surfaceNullBlocksPct: last.surfaceNullBlocksPct,
    gain: last.gain,
    mvA: last.mvA, mvB: last.mvB,
    exchange: last.exchange,
    movingRegion: last.movingRegion,
    background: last.background,
    breaks: last.breaks,
    clusters: last.clusters,
    psnr: last.psnr,
  },
  perSecond: last.perSecond,
}, null, 1));

console.log("");
for (const x of gens) {
  console.log(`gen ${x.generation}      -> ${x.outputs.composite}`);
}
console.log(`report      -> ${REPORT}`);
