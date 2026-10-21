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
    }
  }
  return amt;
}

/** Pixel coverage of all openings, and per-block coverage, for one frame. */
function maskFor(frame) {
  const amt = openingField(frame);
  const pix = new Float32Array(W * H);
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
        }
      }
    }
  }
  for (let by = 0; by < ROWS; by++) {
    for (let bx = 0; bx < COLS; bx++) {
      let s = 0, n = 0;
      for (let y = by * MB; y < Math.min(H, (by + 1) * MB); y++) {
        for (let x = bx * MB; x < Math.min(W, (bx + 1) * MB); x++) {
          s += pix[y * W + x]; n++;
        }
      }
      blockCov[by * COLS + bx] = n ? s / n : 0;
    }
  }
  return { pix, blockCov };
}

/** The drip flow that drives the forced vectors, in half-pel. */
function dripForce(bx, by, frame) {
  const s = 0.012 * MB;
  const tt = frame * 0.01;
  const n1 = hash12(bx * s + tt, by * s);
  const n2 = hash12(bx * s, by * s - tt);
  const ang = (n1 - 0.5) * 6.2831 * 0.6 + Math.PI * 0.5;  // biased downward
  // Half-pel, so this is 2-12 px a frame. It has to be small: there is no
  // keyframe in a 1000-frame GOP, so every P-frame drags the reference
  // further and the displacement accumulates. At 24-96 half-pel the
  // reference had been pulled thousands of pixels off-frame by frame 150
  // and the openings decoded black.
  const mag = MAG_MIN + (MAG_MAX - MAG_MIN) * n2;
  return [Math.cos(ang) * mag, Math.sin(ang) * mag];
}

/* ------------------------------------------------------------- encode */
await rm(TMP, { recursive: true, force: true });
await mkdir(TMP, { recursive: true });
const gac = path.join(TMP, "src.mpeg4");
console.log("\n--- ffgac encode (+forcemv, +mv4, long GOP) ---");
sh(`${FG}/ffgac.exe`, ["-i", SRC, "-an",
  "-mpv_flags", "+nopimb+forcemv", "-flags", "+mv4",
  "-qscale:v", "6", "-g", String(GOP), "-sc_threshold", "1000000000",
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
const neighbourDiffs = [];

for (let i = 0; i < Math.min(frames.length, N); i++) {
  const fwd = frames[i].mv?.forward;
  const m = maskFor(i);
  masks.push(m.pix);
  if (!fwd) continue;

  // 1. the raw forced field for every open block
  const want = new Float32Array(COLS * ROWS * 2);
  const inside = new Uint8Array(COLS * ROWS);
  for (let by = 0; by < ROWS; by++) {
    for (let bx = 0; bx < COLS; bx++) {
      const cov = m.blockCov[by * COLS + bx];
      if (cov <= 0.02) continue;
      inside[by * COLS + bx] = 1;
      const [fx, fy] = dripForce(bx, by, i);
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
          const [fx, fy] = dripForce(bx, by, i);
          cell[q] = [clampv((vx + fx * cov) * 0.5), clampv((vy + fy * cov) * 0.5)];
        }
      } else {
        forced1mv++;
        cell[0] = clampv(vx);
        cell[1] = clampv(vy);
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
}, null, 1));
console.log(`report -> ${REPORT}`);
