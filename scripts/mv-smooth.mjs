/**
 * Make the shader's motion field continuous.
 *
 * The lattice rebases its reference time every `uRefresh` frames and stamps
 * freshly disoccluded pixels, so the raw field it exports is not continuous:
 * on a rebase frame most macroblocks reproject from a brand-new reference and
 * the frame's mean magnitude collapses. Transferred straight into the
 * bitstream that reads as a stall followed by a lurch, and because the camera
 * path is periodic the same stall lands in the same place every cycle.
 *
 * Three things happen here, in order:
 *
 *   1. blend  - a centred triangular kernel over +/-R frames. Centred, so the
 *               field does not lag the picture it came from.
 *   2. level  - each frame is rescaled to a smooth target magnitude. This is
 *               what actually removes the stalls: blending alone narrows a
 *               collapse, it does not remove it, because the collapse is most
 *               of the frame at once. The target is the field's own median
 *               with a gentle wander, so the motion keeps breathing.
 *   3. drift  - a slow vector added on top, built from two incommensurate
 *               periods so the sum has no finite period: the cycle cannot
 *               visibly repeat however long the render runs.
 *
 * Rescaling is a scalar per frame, so the field's spatial shape and direction
 * are untouched - only how far it moves.
 *
 * motionStats() reports what the brief asks for and is the check on all of
 * the above: mean |mv| per frame as a share of the median, and the
 * frame-to-frame change.
 */

/** Mean magnitude of one frame's field. */
function frameMean(field) {
  let s = 0, n = 0;
  for (const row of field) for (const v of row) {
    if (!v) continue;
    s += Math.hypot(v[0], v[1]); n++;
  }
  return n ? s / n : 0;
}

function median(xs) {
  const a = xs.filter(Number.isFinite).slice().sort((p, q) => p - q);
  if (!a.length) return 0;
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/**
 * @param frames  [frame][row][col] = [x, y] in pixels
 * @returns a new array, same shape
 */
export function smoothField(frames, opts = {}) {
  const R = opts.radius ?? 3;              // blend radius in frames
  const WANDER = opts.wander ?? 0.10;      // +/- share around the median level
  const DRIFT = opts.drift ?? 0.6;         // drift amplitude, pixels
  const P1 = opts.p1 ?? 97;                // two periods with an irrational
  const P2 = opts.p2 ?? 97 * Math.SQRT2;   // ratio -> the sum never repeats
  const n = frames.length;
  if (!n) return frames;
  const rows = frames[0].length, cols = frames[0][0].length;

  // ---- 0. fill the frames with no direction to scale
  // The lattice starts at rest: at t=0 the reference time IS the current
  // time, so there is no displacement to reproject, and the field ramps up
  // from exactly zero over roughly a second (measured: 30 frames below a
  // quarter of the median, the first three exactly 0). That ramp is the
  // shader warming up, not motion, and it has to go.
  //
  // A frame that still has a direction keeps its own spatial shape and is
  // scaled up by the level step below. Only a frame with nothing to scale is
  // replaced, by the nearest frame that does have motion.
  const DEAD_REL = opts.deadRel ?? 0.05;
  const rawMeans = frames.map(frameMean);
  const rawMed = median(rawMeans) || 1;
  const alive = rawMeans.map((m) => m > DEAD_REL * rawMed);
  const src = new Array(n);
  let last = -1;
  for (let i = 0; i < n; i++) { if (alive[i]) last = i; src[i] = last; }
  let next = -1;
  for (let i = n - 1; i >= 0; i--) {
    if (alive[i]) next = i;
    if (src[i] < 0 || (!alive[i] && next >= 0
        && (i - src[i]) > (next - i))) src[i] = next;
  }
  const filled = frames.map((f, i) => (alive[i] || src[i] < 0) ? f : frames[src[i]]);
  const deadCount = alive.filter((a) => !a).length;
  if (deadCount && opts.verbose !== false) {
    console.log(`  motion field: ${deadCount} frame(s) with no direction to `
      + `scale, filled from the nearest frame that has one`);
  }
  frames = filled;

  // ---- 1. centred triangular blend
  const w = [];
  for (let d = -R; d <= R; d++) w.push(R + 1 - Math.abs(d));
  const wsum = w.reduce((a, b) => a + b, 0);

  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const f = new Array(rows);
    for (let r = 0; r < rows; r++) {
      const row = new Array(cols);
      for (let c = 0; c < cols; c++) {
        let sx = 0, sy = 0, sw = 0;
        for (let d = -R, k = 0; d <= R; d++, k++) {
          const j = i + d;
          if (j < 0 || j >= n) continue;
          const v = frames[j][r]?.[c];
          if (!v) continue;
          sx += v[0] * w[k]; sy += v[1] * w[k]; sw += w[k];
        }
        row[c] = sw ? [sx / sw, sy / sw] : [0, 0];
      }
      f[r] = row;
    }
    out[i] = f;
    void wsum;
  }

  // ---- 2. level each frame onto a smooth target
  const means = out.map(frameMean);
  const med = median(means) || 1;
  for (let i = 0; i < n; i++) {
    // a slow, smooth breath around the median rather than a flat line
    const target = med * (1 + WANDER * Math.sin((2 * Math.PI * i) / P1));
    const m = means[i];
    // the warm-up frames need a large gain to reach the median - frame 6
    // measures 5.9 px against a median of 71 - so the ceiling has to be well
    // above the 4x that a steady-state correction needs
    const g = m > 1e-4 ? target / m : 1;
    const gc = Math.max(0.25, Math.min(opts.gainMax ?? 48.0, g));
    if (Math.abs(gc - 1) < 1e-6) continue;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = out[i][r][c];
        v[0] *= gc; v[1] *= gc;
      }
    }
  }

  // ---- 3. slow non-repeating drift
  if (DRIFT > 0) {
    for (let i = 0; i < n; i++) {
      const dx = DRIFT * Math.cos((2 * Math.PI * i) / P1);
      const dy = DRIFT * Math.sin((2 * Math.PI * i) / P2);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = out[i][r][c];
          v[0] += dx; v[1] += dy;
        }
      }
    }
  }
  return out;
}

/**
 * The brief's two motion gates, measured on whatever field is handed over.
 *   mean |mv| never below 50% of its median
 *   frame-to-frame change under 15%
 */
export function motionStats(frames) {
  const means = frames.map(frameMean);
  const med = median(means) || 0;
  let lowI = 0, lowV = Infinity;
  for (let i = 0; i < means.length; i++) {
    if (means[i] < lowV) { lowV = means[i]; lowI = i; }
  }
  const rel = med ? means.map((m) => m / med) : means.map(() => 0);

  const deltas = [];
  for (let i = 1; i < means.length; i++) {
    const base = Math.max(means[i - 1], 1e-6);
    deltas.push(Math.abs(means[i] - means[i - 1]) / base);
  }
  let wI = 0, wV = 0;
  for (let i = 0; i < deltas.length; i++) if (deltas[i] > wV) { wV = deltas[i]; wI = i + 1; }

  return {
    frames: means.length,
    medianMean: med,
    meanOfMeans: means.reduce((a, b) => a + b, 0) / Math.max(means.length, 1),
    minMean: Math.min(...means),
    maxMean: Math.max(...means),
    minRelToMedian: Math.min(...rel),
    maxRelToMedian: Math.max(...rel),
    worstLowFrame: lowI,
    maxFrameDelta: wV,
    maxFrameDeltaFrame: wI,
    meanFrameDelta: deltas.reduce((a, b) => a + b, 0) / Math.max(deltas.length, 1),
    okLevel: Math.min(...rel) >= 0.5,
    okContinuity: wV < 0.15,
    perFrameMean: means,
  };
}

export function printMotionStats(label, st) {
  console.log(`\n=== layer B motion: ${label} ===`);
  console.log(`  frames                     ${st.frames}`);
  console.log(`  mean |mv| (px)             median ${st.medianMean.toFixed(3)}  `
    + `mean ${st.meanOfMeans.toFixed(3)}  min ${st.minMean.toFixed(3)}  max ${st.maxMean.toFixed(3)}`);
  console.log(`  min as share of median     ${(st.minRelToMedian * 100).toFixed(1)}%  `
    + `(frame ${st.worstLowFrame})   gate >= 50%  ${st.okLevel ? "PASS" : "FAIL"}`);
  console.log(`  max as share of median     ${(st.maxRelToMedian * 100).toFixed(1)}%`);
  console.log(`  frame-to-frame change      max ${(st.maxFrameDelta * 100).toFixed(2)}%  `
    + `(frame ${st.maxFrameDeltaFrame})   mean ${(st.meanFrameDelta * 100).toFixed(2)}%   `
    + `gate < 15%  ${st.okContinuity ? "PASS" : "FAIL"}`);
}
