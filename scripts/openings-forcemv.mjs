/**
 * Force the datamosh motion inside organic openings, and composite through
 * the opening mask so the visible edge is the curve and not the blocks.
 *
 * This is the real bitstream, not the lab: ffgac encodes with +forcemv so
 * every macroblock carries a vector, ffedit exports them, the blocks an
 * opening touches get vectors from the drip flow instead of their own, and
 * ffedit writes them back. Blocks outside openings keep what the encoder
 * gave them.
 *
 * Two things make the motion read as one flowing mass rather than a grid of
 * independent blocks:
 *
 *   smoothing   vectors inside an opening are averaged with their
 *               neighbours, weighted by how far inside the opening each
 *               one is, so the field varies smoothly across the opening and
 *               meets the untouched blocks at its rim without a step
 *   the mask    the moshed frame is composited back through the opening's
 *               own coverage, at pixel resolution, so what you see ends on
 *               the curve even though the motion that made it was decided
 *               per block
 *
 * On 4MV: ffedit edits vectors inside the macroblock type the encoder
 * chose; it cannot turn a 1MV block into a 4MV one. Measured on this clip,
 * the encoder picks 4MV for under 1% of blocks whatever the settings, so
 * where a 4MV block does fall on an opening edge its four vectors are set
 * individually from the four 8x8 quadrants, and everywhere else the edge is
 * carried by the mask instead. The report says how many of each there were.
 *
 *   node scripts/openings-forcemv.mjs
 *   node scripts/openings-forcemv.mjs --frames 60 --out out.mp4
 */
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };

const SRC = argOf("--src", "public/mosh-lab/blum-clip-internet.mp4");
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
const SMOOTH_PASSES = Number(argOf("--smooth", "6"));
// Source: how much of an opening is the underlayer and how much is still
// the scene. A full replace is what made the openings read as holes cut to
// black - where the moshed stream had gone dark there was nothing else in
// the pixel. At 0.7 the scene is still a third of every opening, which is
// both the brief's default and the thing that keeps a dark patch legible.
const SOURCE = Number(argOf("--source", "0.7"));
const MAG_MIN = Number(argOf("--mag-min", "4"));
const MAG_MAX = Number(argOf("--mag-max", "24"));
// A drip has to be able to finish. With no keyframe the drag never resets:
// a block dragged once stays dragged, and after 150 frames the openings
// decoded 49% near-black. A GOP lets each drip build and then clear.
const GOP = Number(argOf("--gop", "48"));

const sh = (c, a, o = {}) => execFileSync(c, a,
  { encoding: "utf8", maxBuffer: 1 << 28, ...o });

if (!existsSync(`${FG}/ffgac.exe`)) throw new Error(`ffglitch missing at ${FG}`);
const cfg = JSON.parse(await readFile(CONFIG, "utf8"));
const org = cfg.organic ?? { amount: 1, scale: 0.9, wobble: 0.55, soft: 1.5 };
const seed = cfg.seed ?? 7;

const probe = JSON.parse(sh("ffprobe", ["-v", "error", "-select_streams", "v:0",
  "-count_frames", "-show_entries",
  "stream=width,height,r_frame_rate,nb_read_frames", "-of", "json", SRC]));
const vs = probe.streams[0];
const W = vs.width, H = vs.height;
const FPS = eval(vs.r_frame_rate);
const NALL = Number(vs.nb_read_frames);
const N = LIMIT ? Math.min(LIMIT, NALL) : NALL;
const COLS = Math.ceil(W / MB), ROWS = Math.ceil(H / MB);
console.log(`${path.basename(SRC)}  ${W}x${H} @ ${FPS}  ${N} of ${NALL} frames`);
console.log(`grid ${COLS}x${ROWS} macroblocks`);

/* ------------------------------------------------- the openings, in JS */
// Same hashes and the same implicit radius the lab draws, so the mask the
// bitstream is forced through is the mask the preview shows.
const fract = (x) => x - Math.floor(x);
function hash12(x, y) {
  let px = fract(x * 0.1031), py = fract(y * 0.1031), pz = fract(x * 0.1031);
  const d = px * (py + 33.33) + py * (pz + 33.33) + pz * (px + 33.33);
  px = fract(px + d); py = fract(py + d); pz = fract(pz + d);
  return fract((px + py) * pz);
}
const ORG_SOFT = Math.max(org.soft, 0.5);

/** Coverage of the opening anchored at block (bx, by) at pixel (x, y). */
function organicAt(x, y, bx, by, amt) {
  if (org.amount <= 0.001 || amt <= 0.001) return 0;
  const cx = (bx + hash12(bx * 9.13 + seed, by * 9.13 + seed)) * MB;
  const cy = (by + hash12(bx * 4.41 + seed * 2, by * 4.41 + seed * 2)) * MB;
  const dx = x - cx, dy = y - cy;
  const r = Math.hypot(dx, dy);
  const th = Math.atan2(dy, dx);
  const p1 = hash12(bx * 1.91 + seed * 5, by * 1.91 + seed * 5) * 6.2831;
  const p2 = hash12(bx * 7.33 + seed * 9, by * 7.33 + seed * 9) * 6.2831;
  const a1 = 0.55 + 0.9 * hash12(bx * 2.77 + seed * 4, by * 2.77 + seed * 4);
  const wob = 1 + org.wobble * (a1 * Math.sin(3 * th + p1)
    + (1 - a1) * Math.sin(5 * th + p2)) * 0.5;
  const R = org.scale * MB * amt * wob
    * (0.55 + 0.9 * hash12(bx * 3.19 + seed * 6, by * 3.19 + seed * 6));
  const t = (r - (R - ORG_SOFT)) / (2 * ORG_SOFT);
  const s = Math.min(1, Math.max(0, t));
  return 1 - (s * s * (3 - 2 * s));
}

/** Which blocks are open this frame, and how strongly. */
function openingField(frame) {
  // a slow cycle per block decides whether its opening exists right now
  const amt = new Float32Array(COLS * ROWS);
  const close = new Float32Array(COLS * ROWS);
  for (let by = 0; by < ROWS; by++) {
    for (let bx = 0; bx < COLS; bx++) {
      const h = hash12(bx * 1.17 + seed, by * 1.17 + seed);
      const life = 14 + h * 34;
      const rest = 10 + hash12(bx * 2.31 + seed * 3, by * 2.31 + seed * 3) * 36;
      const period = life + rest;
      const phase = hash12(bx * 0.73 + seed * 5.5, by * 0.73 + seed * 5.5);
      const t = (frame + phase * period) % period;
      amt[by * COLS + bx] = t < life
        ? Math.min(1, Math.min(t + 1, life - t) / Math.max(life * 0.3, 1)) : 0;
      // how far into its closing this opening is: 0 until the last third of
      // its life, then 1 by the time it is gone. This is what the healing
      // follows, so the scene comes back through the shape that is shutting
      // rather than being patched over the top of it.
      close[by * COLS + bx] = t < life
        ? Math.min(1, Math.max(0, (t - life * 0.62) / Math.max(life * 0.38, 1)))
        : 1;
    }
  }
  return { amt, close };
}

/** Pixel coverage of all openings, and per-block coverage, for one frame. */
function maskFor(frame) {
  const { amt, close } = openingField(frame);
  const pix = new Float32Array(W * H);
  // what the scene takes back this frame, through the same shapes
  const heal = new Float32Array(W * H);
  const quiet = 1 - (ENV[Math.min(ENV.length - 1, frame)] ?? 0.5);
  const healGain = 0.35 + 0.65 * quiet;
  const blockCov = new Float32Array(COLS * ROWS);
  for (let by = 0; by < ROWS; by++) {
    for (let bx = 0; bx < COLS; bx++) {
      const a = amt[by * COLS + bx];
      if (a <= 0.001) continue;
      // an opening can reach about two blocks out at the largest radius
      const reach = Math.ceil(org.scale * 2.4) + 1;
      const x0 = Math.max(0, (bx - reach) * MB), x1 = Math.min(W, (bx + reach + 1) * MB);
      const y0 = Math.max(0, (by - reach) * MB), y1 = Math.min(H, (by + reach + 1) * MB);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const v = organicAt(x + 0.5, y + 0.5, bx, by, a);
          if (v > pix[y * W + x]) pix[y * W + x] = v;
          // the scene returns over the closing part of the same shape
          const hv = v * close[by * COLS + bx] * healGain;
          if (hv > heal[y * W + x]) heal[y * W + x] = hv;
        }
      }
    }
  }
  // which opening owns each block, so the swirl below has a centre to turn
  // about; without this the force is just a direction and every opening
  // pulls the same way
  const owner = new Int32Array(COLS * ROWS).fill(-1);
  const ownerStr = new Float32Array(COLS * ROWS);
  for (let by = 0; by < ROWS; by++) {
    for (let bx = 0; bx < COLS; bx++) {
      let s = 0, n = 0;
      for (let y = by * MB; y < Math.min(H, (by + 1) * MB); y++) {
        for (let x = bx * MB; x < Math.min(W, (bx + 1) * MB); x++) {
          s += pix[y * W + x]; n++;
        }
      }
      blockCov[by * COLS + bx] = n ? s / n : 0;
      if (blockCov[by * COLS + bx] <= 0.02) continue;
      const cxp = (bx + 0.5) * MB, cyp = (by + 0.5) * MB;
      const reach = Math.ceil(org.scale * 2.4) + 1;
      for (let ay = Math.max(0, by - reach); ay < Math.min(ROWS, by + reach + 1); ay++) {
        for (let ax = Math.max(0, bx - reach); ax < Math.min(COLS, bx + reach + 1); ax++) {
          const a = amt[ay * COLS + ax];
          if (a <= 0.001) continue;
          const v = organicAt(cxp, cyp, ax, ay, a);
          if (v > ownerStr[by * COLS + bx]) {
            ownerStr[by * COLS + bx] = v;
            owner[by * COLS + bx] = ay * COLS + ax;
          }
        }
      }
    }
  }
  // The opening the viewer sees is what is open MINUS what has healed, so a
  // closing opening shrinks back through its own outline. That is the screen
  // shutting, not a patch laid over the damage.
  const shown = new Float32Array(W * H);
  for (let k = 0; k < W * H; k++) {
    shown[k] = Math.max(0, pix[k] * (1 - Math.min(1, heal[k]))) * SOURCE;
  }
  return { pix, shown, heal, blockCov, owner };
}

/**
 * The drip flow, as a swirl rather than a drag.
 *
 * A sustained downward force walks the reference off the bottom of the
 * frame: there is nothing below to predict from, so the opening decodes
 * black - measured at 31.27% near-black inside openings. A force that turns
 * about the opening's own centre moves the same pixels just as far, but
 * they circulate inside the opening instead of leaving it, so there is
 * always something to predict from.
 *
 * A small inward term keeps the circulation from spiralling outward over a
 * long life, and the turn direction is a per-opening hash so neighbouring
 * openings do not all rotate the same way.
 */
function swirlForce(bx, by, ownerIdx, frame) {
  if (ownerIdx < 0) return [0, 0];
  const ax = ownerIdx % COLS, ay = Math.floor(ownerIdx / COLS);
  let rx = (bx - ax) * MB, ry = (by - ay) * MB;
  const r = Math.hypot(rx, ry);
  if (r < 1e-3) { rx = 1; ry = 0; }
  const ur = r > 1e-3 ? [rx / r, ry / r] : [1, 0];
  // turn one way or the other, per opening
  const dir = hash12(ax * 5.7 + seed * 3, ay * 5.7 + seed * 3) < 0.5 ? 1 : -1;
  const tangent = [-ur[1] * dir, ur[0] * dir];
  // The magnitude OSCILLATES, and that is the point.
  //
  // A constant tangential vector does not make content orbit: each frame it
  // translates the block, and those translations compose into a long
  // polygonal walk away from where it started. Measured, that walked the
  // picture toward black monotonically, 0.8% near-black over the first
  // twenty frames and 40.5% by frame 160, with the forced motion never
  // refreshed between keyframes.
  //
  // Swinging the sign over a period means the displacement integrates back
  // to roughly zero every cycle, so the pixels really do stay where they
  // are and just churn. Each opening gets its own period so they are not
  // all breathing together.
  const period = 14 + 26 * hash12(ax * 2.9 + seed, ay * 2.9 + seed);
  const swing = Math.sin((2 * Math.PI * frame) / period);
  const n = hash12(ax * 1.3, ay * 1.3);
  const mag = (MAG_MIN + (MAG_MAX - MAG_MIN) * n) * swing;
  // the inward term rides the same swing, so it cannot accumulate either
  const inward = 0.22;
  return [(tangent[0] - ur[0] * inward) * mag,
    (tangent[1] - ur[1] * inward) * mag];
}

/* ------------------------------------------- the word envelope, for healing */
// Quiet stretches heal more, so the screen closes when nothing is being
// said and stays open through a burst. Same follower the lab uses.
let ENV = new Float32Array(NALL).fill(0.5);
try {
  const tune = JSON.parse(await readFile(
    "public/mosh-lab/blum-internet-tune.json", "utf8"));
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
  console.log(`word envelope loaded: mean ${(ENV.reduce((a, b) => a + b, 0)
    / ENV.length).toFixed(3)}`);
} catch {
  console.log("no tune data; healing uses a flat envelope");
}

/* ----------------------------------- keyframes where the damage curve dips */
// Not a fixed GOP. -pict_type_script is the documented way and is broken in
// this build, so the dips are placed with -force_key_frames at exactly n/fps.
const curve = cfg.damageCurve ?? [];
const curveAt = (f) => {
  if (!curve.length) return 1;
  // over the whole clip, not over N: rendering a subset must not squeeze
  // the curve into it and move the dips somewhere else
  const x = (f / Math.max(NALL - 1, 1)) * (curve.length - 1);
  const i = Math.floor(x), fr = x - i;
  return curve[i] + (curve[Math.min(curve.length - 1, i + 1)] - curve[i]) * fr;
};
const DIP = Number(argOf("--dip", "0.05"));
const dipFrames = [];
for (let f = 0; f < N; f++) if (curveAt(f) < DIP) dipFrames.push(f);
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
  const { amt, close } = openingField(f);
  let sum = 0;
  for (let k = 0; k < amt.length; k++) sum += amt[k] * close[k];
  closeTrack.push(sum);
}
const CLOSE_KEYS = Number(argOf("--close-keys", "10"));
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
console.log(`keyframes: ${dipFrames.length} on curve dips, `
  + `${closeFrames.length} where the screen is most closed `
  + `(${closeFrames.join(", ")})`);
const dipStamps = wantI.map((f) => Math.max(0, f / FPS - 1e-4).toFixed(6)).join(",");
console.log(`keyframes at ${wantI.length} curve dips: `
  + `${wantI.slice(0, 3).join(", ")}${wantI.length > 3 ? " ..." : ""}`);

/**
 * Keep the reference inside the picture.
 *
 * A vector says "fetch from this offset in the previous frame". If that
 * lands outside the frame there is nothing to fetch and the block decodes
 * black - which is where the stubborn 28% of near-black inside openings was
 * coming from, almost all of it in openings sitting near a border. The
 * vector is in half-pel, so it is halved to get pixels.
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
console.log("\n--- ffgac encode (+forcemv, +mv4, long GOP) ---");
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
const masks = [];
let maxNeighbourDiff = 0;
let openingLuma = null;
let healSum = 0;
let coveragePerSecond = null;
const neighbourDiffs = [];

for (let i = 0; i < Math.min(frames.length, N); i++) {
  const fwd = frames[i].mv?.forward;
  const m = maskFor(i);
  masks.push(m.shown);
  healSum += m.heal.reduce((a, b) => a + b, 0);
  if (!fwd) continue;

  // 1. the raw forced field for every open block
  const want = new Float32Array(COLS * ROWS * 2);
  const inside = new Uint8Array(COLS * ROWS);
  for (let by = 0; by < ROWS; by++) {
    for (let bx = 0; bx < COLS; bx++) {
      const cov = m.blockCov[by * COLS + bx];
      if (cov <= 0.02) continue;
      inside[by * COLS + bx] = 1;
      const [fx, fy] = swirlForce(bx, by, m.owner[by * COLS + bx], i);
      want[(by * COLS + bx) * 2] = fx * cov;
      want[(by * COLS + bx) * 2 + 1] = fy * cov;
    }
  }

  // 2. smooth across neighbours, weighted by how far inside each one is, so
  // the field reads as one mass and meets the untouched blocks without a step
  // One 3x3 pass is not enough: it measured a worst-case neighbour
  // difference of 64 half-pel, which is a 32 px step between touching
  // blocks and reads as a seam. Repeating the pass widens the kernel's
  // reach without widening the loop.
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
        // each 8x8 quadrant takes the force sampled at its own centre
        for (let q = 0; q < cell.length; q++) {
          const qx = bx + (q % 2) * 0.5 + 0.25;
          const qy = by + Math.floor(q / 2) * 0.5 + 0.25;
          const cov = organicCoverageAtBlock(m.pix, qx, qy);
          const [fx, fy] = swirlForce(bx, by, m.owner[by * COLS + bx], i);
          const [q1, q2] = clampToFrame(bx, by, (vx + fx * cov) * 0.5,
            (vy + fy * cov) * 0.5);
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

  // 4. the measurement the brief asks for: how far apart neighbouring
  // vectors are INSIDE an opening
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

/** Average opening coverage over an 8x8 quadrant, in block units. */
function organicCoverageAtBlock(pix, bxf, byf) {
  const x0 = Math.floor(bxf * MB), y0 = Math.floor(byf * MB);
  let s = 0, n = 0;
  for (let y = y0; y < Math.min(H, y0 + MB / 2); y++) {
    for (let x = x0; x < Math.min(W, x0 + MB / 2); x++) { s += pix[y * W + x]; n++; }
  }
  return n ? s / n : 0;
}

console.log(`forced ${touched} blocks inside openings  `
  + `(${forced1mv} as 1MV, ${blocks4mv} as 4MV, ${edge4mv} of those on an edge)`);

const appliedJson = path.join(TMP, "applied.json");
await writeFile(appliedJson, JSON.stringify(doc));
const applied = path.join(TMP, "applied.mpeg4");
sh(`${FG}/ffedit.exe`, ["-i", gac, "-f", "mv", "-a", appliedJson, "-o", applied],
  { stdio: "pipe" });

/* ------------------------------- composite back through the opening mask */
console.log("\n--- compositing through the opening mask ---");
const moshedMp4 = path.join(TMP, "moshed.mp4");
sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-fflags", "+genpts",
  "-r", String(FPS), "-f", "m4v", "-i", applied,
  "-frames:v", String(N), "-c:v", "libx264", "-preset", "medium",
  "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(FPS), moshedMp4]);

const maskBin = path.join(TMP, "mask.raw");
{
  const buf = Buffer.alloc(W * H * N);
  for (let i = 0; i < N; i++) {
    const m = masks[i];
    for (let k = 0; k < W * H; k++) buf[i * W * H + k] = Math.round(m[k] * 255);
  }
  await writeFile(maskBin, buf);
}
await mkdir(path.dirname(OUT), { recursive: true });
// the mask is the alpha: the moshed frame shows exactly where the opening
// covers, so the visible edge is the curve and never the block boundary
sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error",
  "-i", SRC, "-i", moshedMp4,
  "-f", "rawvideo", "-pix_fmt", "gray", "-s", `${W}x${H}`, "-r", String(FPS),
  "-i", maskBin,
  "-filter_complex",
  "[2:v]format=gray,geq=lum='p(X,Y)'[m];"
  + "[1:v][m]alphamerge[fg];[0:v][fg]overlay=format=auto[o]",
  "-map", "[o]", "-frames:v", String(N),
  "-c:v", "libx264", "-preset", "medium", "-crf", "18",
  "-pix_fmt", "yuv420p", "-r", String(FPS), "-movflags", "+faststart", OUT]);

/* ----------------------------------------- how dark did the openings go? */
// The thing to measure is not the whole frame but what is INSIDE an
// opening, against the scene around it. A drag that pulls the reference
// off-frame shows up here as near-black inside and nowhere else.
{
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", OUT, "-f", "rawvideo",
    "-pix_fmt", "gray", "-"], { maxBuffer: 1 << 30 });
  // The SAME pixels in the clean clip, because the absolute number is not
  // the question. This clip is letterboxed and a third of it is already
  // near-black before anything is done to it, so "near-black inside the
  // openings" has to be read against what those pixels were.
  const src = execFileSync("ffmpeg", ["-v", "error", "-i", SRC, "-f", "rawvideo",
    "-pix_fmt", "gray", "-"], { maxBuffer: 1 << 30 });
  let srcBlack = 0;
  let inSum = 0, inN = 0, inBlack = 0, outSum = 0, outN = 0;
  const step = Math.max(1, Math.floor(N / 60));
  for (let i = 0; i < Math.min(N, masks.length); i += step) {
    const m = masks[i];
    const off = i * W * H;
    if (off + W * H > raw.length) break;
    for (let k = 0; k < W * H; k++) {
      const v = raw[off + k];
      if (m[k] > 0.5) {
        inSum += v; inN++;
        if (v < 16) inBlack++;
        if (off + k < src.length && src[off + k] < 16) srcBlack++;
      }
      else if (m[k] < 0.05) { outSum += v; outN++; }
    }
  }
  const inMean = inN ? inSum / inN : 0;
  const outMean = outN ? outSum / outN : 0;
  const blackPct = inN ? (100 * inBlack) / inN : 0;
  const rel = outMean ? (100 * Math.abs(inMean - outMean)) / outMean : 0;
  console.log("");
  console.log("INSIDE THE OPENINGS");
  const srcBlackPct = inN ? (100 * srcBlack) / inN : 0;
  const added = blackPct - srcBlackPct;
  console.log(`  near-black (luma < 16)       ${blackPct.toFixed(2)}%`);
  console.log(`  the same pixels, unmoshed    ${srcBlackPct.toFixed(2)}%  `
    + `(this clip is letterboxed)`);
  console.log(`  black ADDED by the mosh      ${added >= 0 ? "+" : ""}`
    + `${added.toFixed(2)} points   ${added < 15 ? "PASS" : "FAIL"} `
    + `(target: under 15 points added)`);
  console.log(`  mean luma inside             ${inMean.toFixed(2)}`);
  console.log(`  mean luma of the scene       ${outMean.toFixed(2)}`);
  console.log(`  difference                   ${rel.toFixed(1)}%   `
    + `${rel < 20 ? "PASS" : "FAIL"} (target within 20%)`);
  openingLuma = { inMean, outMean, blackPct, srcBlackPct, addedBlackPts: added,
    relDiffPct: rel, pixelsInside: inN, pixelsOutside: outN };

  // coverage per second: how much of the frame the openings actually show
  const perSec = [];
  for (let sec = 0; sec * FPS < masks.length; sec++) {
    let sum = 0, cnt = 0;
    for (let f = Math.floor(sec * FPS);
      f < Math.min(masks.length, (sec + 1) * FPS); f++) {
      let c = 0;
      for (let k = 0; k < W * H; k++) c += masks[f][k];
      sum += c / (W * H); cnt++;
    }
    if (cnt) perSec.push({ second: sec, pct: (100 * sum) / cnt });
  }
  coveragePerSecond = perSec;
  console.log("");
  console.log("COVERAGE PER SECOND (share of the frame showing an opening)");
  console.log("  " + perSec.map((x) => `${x.second}:${x.pct.toFixed(1)}%`).join("  "));
  const mean = perSec.reduce((a, x) => a + x.pct, 0) / Math.max(perSec.length, 1);
  console.log(`  mean ${mean.toFixed(2)}%  min ${Math.min(...perSec.map((x) => x.pct)).toFixed(1)}%  `
    + `max ${Math.max(...perSec.map((x) => x.pct)).toFixed(1)}%`);
}

/* ------------------------------------------------------------- measure */
// How much of the VISIBLE opening edge lands on the 16 or 8 px grid. The
// edge is where the mask crosses a half: if the mask were a block mask
// every edge pixel would sit on a multiple of 16.
let edgePx = 0, on16 = 0, on8 = 0;
for (let i = 0; i < Math.min(N, masks.length); i += Math.max(1, Math.floor(N / 40))) {
  const m = masks[i];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const v = m[y * W + x] > 0.5;
      const r = m[y * W + x + 1] > 0.5, d = m[(y + 1) * W + x] > 0.5;
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
console.log(`    on the 16 px grid             ${(100 * on16 / Math.max(edgePx, 1)).toFixed(2)}%`);
console.log(`    on the 8 px grid              ${(100 * on8 / Math.max(edgePx, 1)).toFixed(2)}%`);
console.log(`\noutput -> ${OUT}`);

await writeFile(REPORT, JSON.stringify({
  src: SRC, frames: N, grid: [COLS, ROWS], organic: org,
  forced: { total: touched, oneMv: forced1mv, fourMv: blocks4mv, edge4mv },
  neighbour: { max: maxNeighbourDiff, median: med, p99, n: nd.length },
  edge: { pixels: edgePx, on16Pct: 100 * on16 / Math.max(edgePx, 1),
    on8Pct: 100 * on8 / Math.max(edgePx, 1) },
  openingLuma,
  coveragePerSecond,
}, null, 1));
console.log(`report -> ${REPORT}`);
