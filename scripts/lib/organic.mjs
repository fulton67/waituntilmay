/**
 * The organic openings: one shape, one spawn rule, one letterbox.
 *
 * Everything offline that needs an opening imports it from here, so the mask
 * the bitstream is forced through, the mask the healing restores through and
 * the mask the preview draws are the same mask. The maths follows
 * components/mosh-lab/damage-shaders.ts line for line.
 *
 * Four things live here that used to be spread around or absent:
 *
 *   geometry    an opening's radius is in PIXELS now, 8-26 at rest and up to
 *               40 while a concept word is landing, and it lives 30-90
 *               frames. It used to be a multiple of the macroblock size,
 *               which tied the look to the block grid for no reason.
 *
 *   spawning    an opening is not a block's turn in a fixed cycle any more.
 *               Each cycle the block gets a CHANCE to open, and the chance
 *               follows the word envelope, the concept words and the damage
 *               curve. That is what makes coverage rise and fall instead of
 *               sitting flat: with every block always cycling, coverage is
 *               the duty cycle of the cycle and nothing else, which measured
 *               38% at every second of the clip.
 *
 *   weighting   the chance is also multiplied by how interesting the picture
 *               is at that block - how much edge it holds and how much it
 *               changed since the frame before - so openings land on the
 *               image rather than uniformly over it.
 *
 *   letterbox   the clip is pillarboxed top and bottom for most of its
 *               length. Those rows are not picture: nothing spawns there and
 *               no measurement counts them.
 */
import { execFileSync } from "node:child_process";

const fract = (x) => x - Math.floor(x);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

export function hash12(x, y) {
  let px = fract(x * 0.1031), py = fract(y * 0.1031), pz = fract(x * 0.1031);
  const d = px * (py + 33.33) + py * (pz + 33.33) + pz * (px + 33.33);
  px = fract(px + d); py = fract(py + d); pz = fract(pz + d);
  return fract((px + py) * pz);
}

/** Defaults for everything the geometry and the spawn rule need. */
export const GEOM = {
  // radius in SOURCE PIXELS, not macroblocks. The radius follows the drive
  // as well as the spawn chance, because the two targets pull against each
  // other otherwise: at rest the brief wants MANY glitches on only 1-5% of
  // the picture, which is only possible if the ones at rest are the small
  // end of the range. rDriveMix is the share of the range available with no
  // drive at all, rDriveRef the drive at which the whole range is.
  rMin: 8, rMax: 26, rBurst: 40, rDriveMix: 0.3, rDriveRef: 0.6,
  lifeMin: 30, lifeMax: 90,
  restMin: 10, restMax: 46,
  // The chance a block takes its turn, as a function of drive. Measured on
  // the internet clip, this lands coverage at 3.1-4.6% per second at rest,
  // 34.4% at the peak, with a median of 30 openings alive at once at rest.
  pMin: 0.022, pMax: 0.6, gamma: 2.3,
  // drive = (envTerm * word envelope + concept pulse) * damage curve
  envTerm: 0.18, conceptPre: 4, conceptAtk: 6, conceptDec: 28,
  // spawn weighting: edge energy and frame-to-frame change, mixed
  edgeMix: 0.6, interestBase: 0.2, interestMin: 0.15, interestMax: 2.2,
  // the rim, as a fraction of the radius, and how far the scene sinks in
  rim: 0.15, sinkPx: 4, sinkPeriod: 22,
  // healing: an opening closing over the last closeFrac of its life
  closeFrac: 0.38, healBase: 0.35, healQuiet: 0.65,
  // how much of an opening is underlayer rather than scene
  source: 0.7,
};

/* ------------------------------------------------------------- letterbox */

/**
 * Find the picture inside the frame, FRAME BY FRAME.
 *
 * Two cheap decodes: one 64 columns wide at full height to judge rows, one
 * 64 rows tall at full width to judge columns. Within a frame a row is a bar
 * if it is dark right across and contiguous with the frame edge - a dark row
 * in the middle is a dark scene, not a bar - and the four edges are then
 * median-filtered over nine frames so a dark cut does not flicker the rect.
 *
 * Per frame and not once for the clip, because this clip is two shots. One
 * is a 4:3 image pillarboxed and letterboxed into 16:9, 444x334 inside
 * 640x360, and the other fills the frame. A single rect for both would stop
 * anything from ever opening in a third of the picture of the second shot.
 *
 * It also settles what the near-black argument was really about: with the
 * bars excluded the clean clip is 6.96% near-black inside its own picture,
 * not the 31.50% that counting the bars gave.
 */
export function detectPicture(src, W, H, { thresh = 20, med = 9 } = {}) {
  const dec = (vf, w, h) => {
    const buf = execFileSync("ffmpeg", ["-v", "error", "-i", src,
      "-vf", vf, "-f", "rawvideo", "-pix_fmt", "gray", "-"],
      { maxBuffer: 1 << 29 });
    return { buf, w, h, n: Math.floor(buf.length / (w * h)) };
  };
  const rowDec = dec(`scale=64:${H}`, 64, H);
  const colDec = dec(`scale=${W}:64`, W, 64);
  const n = Math.min(rowDec.n, colDec.n);
  const y0s = [], y1s = [], x0s = [], x1s = [];
  for (let f = 0; f < n; f++) {
    const rowDark = (y) => {
      let m = 0;
      for (let x = 0; x < 64; x++) {
        const v = rowDec.buf[f * 64 * H + y * 64 + x];
        if (v > m) m = v;
      }
      return m < thresh;
    };
    const colDark = (x) => {
      let m = 0;
      for (let y = 0; y < 64; y++) {
        const v = colDec.buf[f * W * 64 + y * W + x];
        if (v > m) m = v;
      }
      return m < thresh;
    };
    let y0 = 0; while (y0 < H && rowDark(y0)) y0++;
    let y1 = H; while (y1 > y0 && rowDark(y1 - 1)) y1--;
    let x0 = 0; while (x0 < W && colDark(x0)) x0++;
    let x1 = W; while (x1 > x0 && colDark(x1 - 1)) x1--;
    y0s.push(y0); y1s.push(y1); x0s.push(x0); x1s.push(x1);
  }
  const medianOf = (a, i) => {
    const lo = Math.max(0, i - (med >> 1)), hi = Math.min(a.length - 1, i + (med >> 1));
    const s = a.slice(lo, hi + 1).sort((p, q) => p - q);
    return s[s.length >> 1];
  };
  const frames = [];
  for (let f = 0; f < n; f++) {
    const x0 = medianOf(x0s, f), x1 = medianOf(x1s, f);
    const y0 = medianOf(y0s, f), y1 = medianOf(y1s, f);
    frames.push({ x0, x1, y0, y1, px: Math.max(1, (x1 - x0) * (y1 - y0)) });
  }
  // the most common rect, for reporting and as the fallback past the end
  const tally = new Map();
  for (const r of frames) {
    const k = `${r.x0},${r.x1},${r.y0},${r.y1}`;
    tally.set(k, (tally.get(k) ?? 0) + 1);
  }
  let bestK = null, bestN = 0;
  for (const [k, c] of tally) if (c > bestN) { bestN = c; bestK = k; }
  const [bx0, bx1, by0, by1] = (bestK ?? `0,${W},0,${H}`).split(",").map(Number);
  const barred = frames.filter((r) => r.x0 > 0 || r.y0 > 0 || r.x1 < W || r.y1 < H);
  const meanPct = frames.reduce((a, r) => a + r.px, 0) / Math.max(frames.length, 1)
    / (W * H) * 100;
  return { frames, n,
    x0: bx0, x1: bx1, y0: by0, y1: by1, w: bx1 - bx0, h: by1 - by0,
    pct: (100 * (bx1 - bx0) * (by1 - by0)) / (W * H),
    meanPct,
    bars: { top: by0, bottom: H - by1, left: bx0, right: W - bx1 },
    presentInFrames: barred.length / Math.max(frames.length, 1),
    at(f) {
      return frames.length
        ? frames[Math.min(frames.length - 1, Math.max(0, f))]
        : { x0: 0, x1: W, y0: 0, y1: H, px: W * H };
    } };
}

/* ------------------------------------------------- where the picture lives */

/**
 * Per block, per frame: how much the picture there is worth opening.
 *
 * Edge energy says "there is a boundary here" and frame-to-frame change says
 * "something just happened here". Both come off one decode at twice the
 * block grid, box-smoothed over nine frames so the weighting does not
 * flicker, and normalised so the mean over picture blocks is 1 - which keeps
 * the spawn probability meaning the same thing it meant before weighting.
 */
export function interestField(src, W, H, N, COLS, ROWS, picture, geom = GEOM) {
  const sw = COLS * 2, sh = ROWS * 2;
  const buf = execFileSync("ffmpeg", ["-v", "error", "-i", src,
    "-vf", `scale=${sw}:${sh}`, "-f", "rawvideo", "-pix_fmt", "gray", "-"],
    { maxBuffer: 1 << 29 });
  const nf = Math.min(N, Math.floor(buf.length / (sw * sh)));
  const at = (f, x, y) => buf[f * sw * sh
    + Math.min(sh - 1, Math.max(0, y)) * sw + Math.min(sw - 1, Math.max(0, x))];
  const raw = new Float32Array(N * COLS * ROWS);
  for (let f = 0; f < nf; f++) {
    for (let by = 0; by < ROWS; by++) {
      for (let bx = 0; bx < COLS; bx++) {
        let edge = 0, tmp = 0;
        for (let q = 0; q < 4; q++) {
          const sx = bx * 2 + (q % 2), sy = by * 2 + (q >> 1);
          const gx = at(f, sx + 1, sy) - at(f, sx - 1, sy);
          const gy = at(f, sx, sy + 1) - at(f, sx, sy - 1);
          edge += Math.hypot(gx, gy);
          tmp += f > 0 ? Math.abs(at(f, sx, sy) - at(f - 1, sx, sy)) : 0;
        }
        raw[f * COLS * ROWS + by * COLS + bx] = (edge / 4) * geom.edgeMix
          + (tmp / 4) * (1 - geom.edgeMix) * 2;
      }
    }
  }
  for (let f = nf; f < N; f++) {
    raw.set(raw.subarray((nf - 1) * COLS * ROWS, nf * COLS * ROWS),
      f * COLS * ROWS);
  }
  // nine-frame box smooth in time
  const sm = new Float32Array(raw.length);
  for (let f = 0; f < N; f++) {
    const a = Math.max(0, f - 4), b = Math.min(N - 1, f + 4);
    for (let k = 0; k < COLS * ROWS; k++) {
      let s = 0;
      for (let g = a; g <= b; g++) s += raw[g * COLS * ROWS + k];
      sm[f * COLS * ROWS + k] = s / (b - a + 1);
    }
  }
  // normalise over picture blocks only, so the bars cannot drag the mean -
  // and the picture moves, so this is per frame
  const inPic = new Uint8Array(N * COLS * ROWS);
  for (let f = 0; f < N; f++) {
    const r = picture.at ? picture.at(f) : picture;
    for (let by = 0; by < ROWS; by++) {
      for (let bx = 0; bx < COLS; bx++) {
        const cx = (bx + 0.5) * 16, cy = (by + 0.5) * 16;
        inPic[f * COLS * ROWS + by * COLS + bx] =
          cx >= r.x0 && cx < r.x1 && cy >= r.y0 && cy < r.y1 ? 1 : 0;
      }
    }
  }
  let sum = 0, cnt = 0;
  for (let f = 0; f < N; f++) {
    for (let k = 0; k < COLS * ROWS; k++) {
      if (!inPic[f * COLS * ROWS + k]) continue;
      sum += sm[f * COLS * ROWS + k]; cnt++;
    }
  }
  const mean = cnt ? sum / cnt : 1;
  const w = new Float32Array(raw.length);
  for (let i = 0; i < sm.length; i++) {
    const r = mean > 1e-6 ? sm[i] / mean : 1;
    w[i] = Math.min(geom.interestMax, Math.max(geom.interestMin,
      geom.interestBase + (1 - geom.interestBase) * r));
  }
  return { weight: w, inPic, mean };
}

/* ------------------------------------------------------------- the drive */

/**
 * How hard the clip is pushing right now, in 0..1.
 *
 * The word envelope is the floor, a concept word is a pulse on top of it,
 * and the damage curve multiplies the whole thing so the user's curve still
 * governs when nothing is allowed to happen.
 */
export function makeDrive({ env, curve, hits, frames, geom = GEOM }) {
  const curveAt = (f) => {
    if (!curve || !curve.length) return 1;
    const x = (f / Math.max(frames - 1, 1)) * (curve.length - 1);
    const i = Math.floor(x), fr = x - i;
    return curve[i] + (curve[Math.min(curve.length - 1, i + 1)] - curve[i]) * fr;
  };
  const concept = (f) => {
    let m = 0;
    for (const h of hits || []) {
      const d = f - (h - geom.conceptPre);
      if (d < 0) continue;
      const v = d < geom.conceptAtk ? d / geom.conceptAtk
        : Math.exp(-(d - geom.conceptAtk) / geom.conceptDec);
      if (v > m) m = v;
    }
    return m;
  };
  const envAt = (f) => (env && env.length
    ? env[Math.min(env.length - 1, Math.max(0, f))] : 0.5);
  const drive = (f) => clamp01(geom.envTerm * envAt(f) + concept(f))
    * clamp01(curveAt(f));
  return { drive, concept, curveAt, envAt };
}

/* --------------------------------------------------------- the openings */

const S = new Float64Array(5);   // scratch: v, r, R, cx, cy

/**
 * Coverage of the opening anchored at block (bx, by) at pixel (x, y), with
 * the radius given in pixels. Fills the scratch with the radial terms so the
 * rim can be found without recomputing them.
 */
function sample(x, y, bx, by, amt, r0, org, seed, MB) {
  if (org.amount <= 0.001 || amt <= 0.001) { S[0] = 0; return 0; }
  const soft = Math.max(org.soft, 0.5);
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
  const R = r0 * amt * wob;
  const t = (r - (R - soft)) / (2 * soft);
  const s = clamp01(t);
  S[0] = 1 - (s * s * (3 - 2 * s));
  S[1] = r; S[2] = R; S[3] = cx; S[4] = cy;
  return S[0];
}

/** Back-compatible single-shape coverage, radius in pixels. */
export function organicAt(x, y, bx, by, amt, r0, org, seed, MB = 16) {
  return sample(x, y, bx, by, amt, r0, org, seed, MB);
}

/**
 * Build the openings for one clip.
 *
 *   field(frame)  per block: how far open, how far into closing, its radius
 *   mask(frame)   per pixel: the whole composite's worth of masks
 */
export function makeOpenings({ W, H, N, MB = 16, org, seed, picture,
  interest, drive, env, geom = GEOM }) {
  const G = { ...GEOM, ...geom };
  const COLS = Math.ceil(W / MB), ROWS = Math.ceil(H / MB);
  const pic = picture ?? { x0: 0, x1: W, y0: 0, y1: H };
  const rectAt = (f) => (pic.at ? pic.at(f)
    : { x0: pic.x0, x1: pic.x1, y0: pic.y0, y1: pic.y1,
      px: (pic.x1 - pic.x0) * (pic.y1 - pic.y0) });
  const inPicAt = (bx, by, f) => {
    const r = rectAt(f);
    const cx = (bx + 0.5) * MB, cy = (by + 0.5) * MB;
    return cx >= r.x0 && cx < r.x1 && cy >= r.y0 && cy < r.y1;
  };
  const weightAt = (bx, by, f) => {
    if (!interest) return 1;
    const g = Math.min(N - 1, Math.max(0, f));
    return interest.weight[g * COLS * ROWS + by * COLS + bx];
  };
  const inPicFlags = (f) => {
    const a = new Uint8Array(COLS * ROWS);
    for (let by = 0; by < ROWS; by++) {
      for (let bx = 0; bx < COLS; bx++) a[by * COLS + bx] = inPicAt(bx, by, f) ? 1 : 0;
    }
    return a;
  };
  const driveAt = (f) => (drive ? drive.drive(Math.min(N - 1, Math.max(0, f))) : 1);
  const conceptAt = (f) => (drive && drive.concept
    ? drive.concept(Math.min(N - 1, Math.max(0, f))) : 0);
  const spawnP = (f) => G.pMin
    + (G.pMax - G.pMin) * Math.pow(clamp01(driveAt(f)), G.gamma);

  const amt = new Float32Array(COLS * ROWS);
  const close = new Float32Array(COLS * ROWS);
  const rad = new Float32Array(COLS * ROWS);

  /** Which blocks are open this frame, how far open, and how big. */
  function field(frame) {
    amt.fill(0); close.fill(1); rad.fill(0);
    let open = 0;
    for (let by = 0; by < ROWS; by++) {
      for (let bx = 0; bx < COLS; bx++) {
        const k = by * COLS + bx;
        if (!inPicAt(bx, by, frame)) continue;      // the bars are not picture
        const h = hash12(bx * 1.17 + seed, by * 1.17 + seed);
        const life = G.lifeMin + h * (G.lifeMax - G.lifeMin);
        const rest = G.restMin + hash12(bx * 2.31 + seed * 3, by * 2.31 + seed * 3)
          * (G.restMax - G.restMin);
        const period = life + rest;
        const phase = hash12(bx * 0.73 + seed * 5.5, by * 0.73 + seed * 5.5);
        const tAbs = frame + phase * period;
        const cyc = Math.floor(tAbs / period);
        const t = tAbs - cyc * period;
        if (t >= life) continue;                    // resting between turns
        // Its turn came round - but a turn is only a CHANCE to open now, and
        // the chance was decided at the frame the turn began, so an opening
        // that spawned in a burst lives its whole life out afterwards.
        const start = Math.max(0, Math.round(frame - t));
        const g = hash12(bx * 3.71 + seed + cyc * 13.1,
          by * 3.71 + seed * 2 + cyc * 13.1);
        if (g >= Math.min(1, spawnP(start) * weightAt(bx, by, start))) continue;
        amt[k] = Math.min(1, Math.min(t + 1, life - t) / Math.max(life * 0.3, 1));
        close[k] = clamp01((t - life * (1 - G.closeFrac))
          / Math.max(life * G.closeFrac, 1));
        // small at rest, the whole 8-26 under drive, reaching rBurst while a
        // concept word is actually landing
        const rh = hash12(bx * 3.19 + seed * 6, by * 3.19 + seed * 6);
        const dn = clamp01(driveAt(start) / G.rDriveRef);
        const span = G.rDriveMix + (1 - G.rDriveMix) * dn;
        const base = G.rMin + (G.rMax - G.rMin) * rh * span;
        rad[k] = base + (G.rBurst - base) * clamp01(conceptAt(start)) * rh;
        open++;
      }
    }
    return { amt, close, rad, open };
  }

  // one set of buffers, reused: these are 640x360 here but there is no
  // reason to allocate nine of them per frame
  const pix = new Float32Array(W * H);
  const inner = new Float32Array(W * H);
  const heal = new Float32Array(W * H);
  const shown = new Float32Array(W * H);
  const rim = new Float32Array(W * H);
  const ocx = new Float32Array(W * H);
  const ocy = new Float32Array(W * H);
  const orr = new Float32Array(W * H);
  const oRn = new Float32Array(W * H);
  const blockCov = new Float32Array(COLS * ROWS);
  const ownCx = new Float32Array(COLS * ROWS);
  const ownCy = new Float32Array(COLS * ROWS);
  const sinkX = new Uint8Array(W * H);
  const sinkY = new Uint8Array(W * H);

  /**
   * The masks for one frame.
   *
   *   pix     the whole opening
   *   inner   the opening minus its rim, which is what shows the underlayer
   *   rim     the outer G.rim of the radius, which shows the scene sinking in
   *   shown   inner, healed, at G.source - the alpha the underlayer gets
   *   sinkX/Y a displace map, 128 for no shift, that pulls the scene inward
   */
  function mask(frame) {
    const { open } = field(frame);
    const R = rectAt(frame);
    pix.fill(0); inner.fill(0); heal.fill(0);
    // 128 is "no shift". The bars are never visited below, so without this
    // they keep last frame's values - or zero, which asks displace to fetch
    // from 128px away for every pixel outside the picture.
    sinkX.fill(128); sinkY.fill(128);
    const quiet = 1 - clamp01(drive && drive.envAt ? drive.envAt(frame) : 0.5);
    const healGain = G.healBase + G.healQuiet * quiet;
    for (let by = 0; by < ROWS; by++) {
      for (let bx = 0; bx < COLS; bx++) {
        const k = by * COLS + bx;
        const a = amt[k];
        if (a <= 0.001) continue;
        const r0 = rad[k];
        // its own reach, not the largest possible one: a small opening has
        // no business being scanned over five blocks in each direction
        const reach = Math.ceil((r0 * (1 + org.wobble)) / MB) + 1;
        const x0 = Math.max(R.x0, (bx - reach) * MB);
        const x1 = Math.min(R.x1, (bx + reach + 1) * MB);
        const y0 = Math.max(R.y0, (by - reach) * MB);
        const y1 = Math.min(R.y1, (by + reach + 1) * MB);
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = y * W + x;
            const v = sample(x + 0.5, y + 0.5, bx, by, a, r0, org, seed, MB);
            if (v > pix[i]) {
              pix[i] = v;
              ocx[i] = S[3]; ocy[i] = S[4]; orr[i] = S[1]; oRn[i] = S[2];
            }
            if (v <= 0.001) continue;
            const hv = v * close[k] * healGain;
            if (hv > heal[i]) heal[i] = hv;
            const vi = sample(x + 0.5, y + 0.5, bx, by, a * (1 - G.rim), r0,
              org, seed, MB);
            if (vi > inner[i]) inner[i] = vi;
          }
        }
      }
    }
    let cov = 0;
    for (let y = R.y0; y < R.y1; y++) {
      for (let x = R.x0; x < R.x1; x++) {
        const i = y * W + x;
        const p = pix[i];
        if (p <= 0.001) { shown[i] = 0; rim[i] = 0; sinkX[i] = 128; sinkY[i] = 128; continue; }
        const keep = 1 - Math.min(1, heal[i]);
        shown[i] = Math.max(0, inner[i] * keep) * G.source;
        rim[i] = Math.max(0, (p - inner[i]) * keep);
        cov += p * keep;
        if (rim[i] <= 0.02) { sinkX[i] = 128; sinkY[i] = 128; continue; }
        // the scene sinking in: sample from further out, so what is there
        // slides toward the centre as the rim deepens
        const Rn = oRn[i], r = orr[i];
        const band = Math.max(G.rim * Rn, 0.5);
        const depth = clamp01((Rn - r) / band);
        const ir = Math.max(r, 1e-3);
        const ux = (x + 0.5 - ocx[i]) / ir, uy = (y + 0.5 - ocy[i]) / ir;
        const ph = hash12(ocx[i] * 0.31 + seed, ocy[i] * 0.31 + seed);
        const pulse = 0.55 + 0.45 * Math.sin(2 * Math.PI
          * (frame / G.sinkPeriod + ph));
        const s = G.sinkPx * depth * pulse;
        sinkX[i] = Math.max(0, Math.min(255, Math.round(128 + ux * s)));
        sinkY[i] = Math.max(0, Math.min(255, Math.round(128 + uy * s)));
      }
    }
    blockCov.fill(0); ownCx.fill(0); ownCy.fill(0);
    for (let by = 0; by < ROWS; by++) {
      for (let bx = 0; bx < COLS; bx++) {
        let s = 0, n = 0, best = 0, bcx = 0, bcy = 0;
        const yEnd = Math.min(H, (by + 1) * MB), xEnd = Math.min(W, (bx + 1) * MB);
        for (let y = by * MB; y < yEnd; y++) {
          for (let x = bx * MB; x < xEnd; x++) {
            const i = y * W + x;
            const p = pix[i] * (1 - Math.min(1, heal[i]));
            s += p; n++;
            if (pix[i] > best) { best = pix[i]; bcx = ocx[i]; bcy = ocy[i]; }
          }
        }
        const k = by * COLS + bx;
        blockCov[k] = n ? s / n : 0;
        ownCx[k] = bcx; ownCy[k] = bcy;
      }
    }
    return { pix, inner, heal, shown, rim, sinkX, sinkY,
      blockCov, ownCx, ownCy, open, rect: R, coverage: cov / R.px };
  }

  return { field, mask, geom: G, picture: pic, rectAt, inPicAt, inPicFlags,
    COLS, ROWS, spawnP, driveAt, conceptAt, weightAt };
}

/**
 * Full-frame pixel coverage of every opening at one frame.
 *
 * Kept for the healing pass in ffgac-mosh.mjs, which only wants the shape.
 * It builds its own openings from the same defaults, so the shapes it heals
 * through are the shapes the composite opened.
 */
export function openingMask(frame, W, H, org, seed, MB = 16, opts = {}) {
  const key = `${W}x${H}:${seed}:${MB}:${JSON.stringify(org)}`;
  if (openingMask._key !== key || openingMask._opts !== JSON.stringify(opts)) {
    openingMask._key = key;
    openingMask._opts = JSON.stringify(opts);
    openingMask._o = makeOpenings({ W, H, N: opts.N ?? 300, MB, org, seed,
      picture: opts.picture, interest: opts.interest, drive: opts.drive,
      geom: opts.geom });
  }
  return openingMask._o.mask(frame).pix;
}
