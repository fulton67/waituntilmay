/**
 * The motion field the whole mosh runs off.
 *
 * There is one field and three things read it. The surface multiplies the
 * encoder's own vectors by a gain; the underlayer is driven by the
 * surface's amplified field rather than by any motion of its own; and the
 * exchange is the difference between how the two responded. Nothing here
 * spawns a shape, picks a lifespan or decides a spawn rate. If the footage
 * did not move, every number below is zero and stays zero.
 *
 * Units are half-pel throughout, because that is what MPEG-4 part 2 codes
 * and what ffedit exports: 2 units is one pixel.
 */

/** Deterministic per-pixel hash in [0,1). Integer in, no trig, no tables. */
export function hashPix(x, y, f) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(f, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export const EXCHANGE = {
  // SURFACE -------------------------------------------------------------
  // gain on the encoder's own vectors: calm ~1, concept words 20+
  calmGain: 1.0,
  amplify: 22,
  accum: 0.55,          // fraction of last frame's amplified field carried
  clampPx: 150,         // no single block flings content across the frame
  // UNDERLAYER ----------------------------------------------------------
  bResponse: 1.2,       // it answers the same field harder
  bAccum: 0.85,         // and remembers it far longer: a different material
  bSmooth: 1,           // blocks of blur on B's field, which is what makes
                        // it read as fluid rather than blocky
  // EXCHANGE ------------------------------------------------------------
  // Site percolation on a square lattice goes critical at p = 0.5927. Below
  // it a random per-pixel mask is scattered grain; at or above it the set
  // pixels join into one connected sheet and the fractal structure of the
  // cluster becomes the thing you see. Both are wanted, at different
  // moments: the floor sits under the threshold so the normal state is
  // grain, and a concept word pushes briefly over it so the structure
  // shows, then it settles back.
  xFloor: 0.45,          // wherever the field is doing anything at all
  xPeak: 0.74,          // brief, on a concept word: over the threshold
  dOn: 0.15,             // px of A-B disagreement where the field is awake
  dFull: 0.7,           // and where it is fully awake
  // A disagreement is not enough on its own. The underlayer's memory
  // outlasts the motion that drove it, so |A-B| stays up in a block that
  // has already gone still, and the grain bleeds off the figure and sits
  // on the background. The exchange also asks whether the ENCODER found
  // motion here - with its own short memory, so a figure that pauses for
  // three frames does not flicker clean. In a locked-off shot the
  // background has no vectors at all and never will, so it stays clean; in
  // a panning shot every block has one and the whole frame is fair game,
  // which is correct, because the whole frame did move.
  moveRef: 2.5,         // px of real motion that counts as moving
  moveDecay: 0.8,       // how long a block stays counted as moving
  moveDilate: 1,        // blocks: a figure is connected, its vectors are not
  // THE BREAKS ----------------------------------------------------------
  // Surface A on its own is the exception, not the state. It shows in the
  // quiet stretches: when the drive has been low for a while the exchange
  // is taken to zero for a second or two and the clean surface appears.
  quietThresh: 0.14,     // below this the drive counts as quiet
  quietMin: 36,         // frames of it before a break is allowed at all
  breakMax: 50,         // the longest break, about 1.7s at 30fps
  breakRamp: 9,         // frames to fall into one and climb out
  breakEvery: 8,        // seconds: at most one break per this much footage
  // the drive the gain is built from (the word envelope and damage curve)
  envTerm: 0.07, conceptPre: 4, conceptAtk: 6, conceptDec: 12,
};

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth01 = (t) => {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
};

/**
 * One gain per frame: 1 where nobody is speaking, `amplify` on a concept
 * word, everything scaled by the damage curve so a dip still goes quiet.
 */
export function makeGain({ env, curve, hits, frames, p = EXCHANGE }) {
  const envAt = (f) => (env && env.length
    ? env[Math.min(env.length - 1, f)] ?? 0 : 0);
  const curveAt = (f) => {
    if (!curve || !curve.length) return 1;
    const x = (f / Math.max(frames - 1, 1)) * (curve.length - 1);
    const i = Math.floor(x), fr = x - i;
    const a = curve[i], b = curve[Math.min(curve.length - 1, i + 1)];
    return a + (b - a) * fr;
  };
  const concept = (f) => {
    let best = 0;
    for (const h of hits || []) {
      const d = f - (h - p.conceptPre);
      if (d < 0) continue;
      const v = d < p.conceptAtk
        ? d / Math.max(p.conceptAtk, 1)
        : Math.exp(-(d - p.conceptAtk) / Math.max(p.conceptDec, 1));
      if (v > best) best = v;
    }
    return best;
  };
  const drive = new Float32Array(frames);
  const gain = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    const d = clamp01(p.envTerm * envAt(f) + concept(f)) * clamp01(curveAt(f));
    drive[f] = d;
    gain[f] = p.calmGain + (p.amplify - p.calmGain) * d;
  }
  return { gain, drive, curveAt, conceptAt: concept };
}

/**
 * Read an ffedit `-f mv -e` export into flat arrays, one pair per
 * macroblock per frame, plus the null mask. Null means the encoder coded
 * nothing there - on a layer encoded without +forcemv that is the static
 * background, and it is the thing that has to stay untouched.
 */
export function readField(doc, frames, cols, rows) {
  const n = cols * rows;
  const x = new Float32Array(frames * n);
  const y = new Float32Array(frames * n);
  const has = new Uint8Array(frames * n);
  const fr = doc.streams[0].frames;
  for (let f = 0; f < frames; f++) {
    const fwd = fr[f] && fr[f].mv && fr[f].mv.forward;
    if (!fwd) continue;
    for (let by = 0; by < rows; by++) {
      const row = fwd[by]; if (!row) continue;
      for (let bx = 0; bx < cols; bx++) {
        const v = row[bx]; if (!v) continue;
        const k = f * n + by * cols + bx;
        x[k] = v[0]; y[k] = v[1]; has[k] = 1;
      }
    }
  }
  return { x, y, has, cols, rows, n, frames };
}

/**
 * The underlayer's response to the surface's field. Same input, different
 * gain and a much longer memory, so it lags and overshoots where the
 * surface snaps - and that lag is exactly what the exchange reads.
 * An I frame resets it, the same way it resets the surface.
 */
export function respond(A, { response, accum, smooth, isKey, clamp = 1023 }) {
  const { cols, rows, n, frames } = A;
  const x = new Float32Array(frames * n);
  const y = new Float32Array(frames * n);
  const px = new Float32Array(n), py = new Float32Array(n);
  const tx = new Float32Array(n), ty = new Float32Array(n);
  for (let f = 0; f < frames; f++) {
    const off = f * n;
    if (isKey(f)) { px.fill(0); py.fill(0); }
    for (let k = 0; k < n; k++) {
      const ax = A.has[off + k] ? A.x[off + k] : 0;
      const ay = A.has[off + k] ? A.y[off + k] : 0;
      // leaky integrator, same reason as the surface: memory, not gain
      let vx = ax * response * (1 - accum) + accum * px[k];
      let vy = ay * response * (1 - accum) + accum * py[k];
      if (vx > clamp) vx = clamp; else if (vx < -clamp) vx = -clamp;
      if (vy > clamp) vy = clamp; else if (vy < -clamp) vy = -clamp;
      tx[k] = vx; ty[k] = vy;
    }
    if (smooth > 0) {
      for (let by = 0; by < rows; by++) for (let bx = 0; bx < cols; bx++) {
        let sx = 0, sy = 0, c = 0;
        for (let dy = -smooth; dy <= smooth; dy++) {
          const yy = by + dy; if (yy < 0 || yy >= rows) continue;
          for (let dx = -smooth; dx <= smooth; dx++) {
            const xx = bx + dx; if (xx < 0 || xx >= cols) continue;
            const kk = yy * cols + xx; sx += tx[kk]; sy += ty[kk]; c++;
          }
        }
        const k = by * cols + bx;
        x[off + k] = sx / c; y[off + k] = sy / c;
      }
    } else {
      for (let k = 0; k < n; k++) { x[off + k] = tx[k]; y[off + k] = ty[k]; }
    }
    for (let k = 0; k < n; k++) { px[k] = x[off + k]; py[k] = y[off + k]; }
  }
  return { x, y, cols, rows, n, frames };
}

/**
 * Where the footage itself moved, per macroblock, 0 to 1, with a short
 * memory so a pause does not read as stillness. Built from the CLEAN
 * export - what the encoder found before anything was multiplied - so it
 * is a fact about the footage and not about the glitch.
 */
export function motionField(C, { ref, decay, dilate = 0, global = true }) {
  const { n, frames } = C;
  const m = new Float32Array(frames * n);
  const prev = new Float32Array(n);
  const bufX = new Float32Array(n), bufY = new Float32Array(n);
  for (let f = 0; f < frames; f++) {
    const off = f * n;
    /**
     * Take the camera out of it first.
     *
     * When the camera pans, every block of the background carries the
     * same vector - the camera's - and a magnitude test calls the whole
     * frame moving, which is how the grain ended up over backgrounds that
     * a viewer reads as still. The figure is the thing moving DIFFERENTLY
     * from everything else. The median of the frame's vectors is the
     * camera (the background outnumbers the subject, and a median ignores
     * the subject entirely rather than being dragged by it); what is left
     * after subtracting it is the subject.
     */
    let gx = 0, gy = 0;
    if (global) {
      let c = 0;
      for (let k = 0; k < n; k++) {
        if (!C.has[off + k]) continue;
        bufX[c] = C.x[off + k]; bufY[c] = C.y[off + k]; c++;
      }
      if (c >= 8) {
        const mid = c >> 1;
        const sx = bufX.subarray(0, c).slice().sort((a, b) => a - b);
        const sy = bufY.subarray(0, c).slice().sort((a, b) => a - b);
        gx = sx[mid]; gy = sy[mid];
      }
    }
    for (let k = 0; k < n; k++) {
      const v = C.has[off + k]
        ? Math.hypot(C.x[off + k] - gx, C.y[off + k] - gy) / 2 : 0;
      // Bounded FIRST, then remembered. Across a cut the encoder searches
      // far and finds matches that mean nothing - 304 px of them on this
      // edit - and decaying a raw magnitude lets one such frame hold the
      // whole frame at "moving" for thirty frames afterwards, which is
      // precisely how the grain ended up sitting on static backgrounds.
      // What is remembered here is the 0-to-1 answer to "is this block
      // moving", so no outlier can buy more memory than any other motion.
      const held = Math.max(smooth01(v / Math.max(ref, 1e-6)), prev[k] * decay);
      prev[k] = held;
      m[off + k] = held;
    }
    /**
     * A moving figure is one connected thing; the vectors the encoder
     * found on it are not. It matches where there is texture to match and
     * gives up on the flat middle of a coat, so an undilated field reads
     * the figure as a ring. One block of max filter closes it, which is
     * the difference between the figure dissolving and the figure being
     * outlined.
     */
    if (dilate > 0) {
      const src = m.slice(off, off + n);
      for (let by = 0; by < C.rows; by++) for (let bx = 0; bx < C.cols; bx++) {
        let mx = 0;
        for (let dy = -dilate; dy <= dilate; dy++) {
          const yy = by + dy; if (yy < 0 || yy >= C.rows) continue;
          for (let dx = -dilate; dx <= dilate; dx++) {
            const xx = bx + dx; if (xx < 0 || xx >= C.cols) continue;
            const v = src[yy * C.cols + xx]; if (v > mx) mx = v;
          }
        }
        m[off + by * C.cols + bx] = mx;
      }
    }
  }
  return { m, cols: C.cols, rows: C.rows, n, frames };
}

/**
 * How far apart the two responses are, per macroblock, in pixels. This is
 * the third distortion: it is not a shape and it has no life of its own,
 * it is only the disagreement between the other two.
 */
export function differenceField(A, B) {
  const { n, frames } = A;
  const d = new Float32Array(frames * n);
  for (let f = 0; f < frames; f++) {
    const off = f * n;
    for (let k = 0; k < n; k++) {
      const ax = A.has[off + k] ? A.x[off + k] : 0;
      const ay = A.has[off + k] ? A.y[off + k] : 0;
      // half-pel to pixels
      d[off + k] = Math.hypot(ax - B.x[off + k], ay - B.y[off + k]) / 2;
    }
  }
  return { d, cols: A.cols, rows: A.rows, n, frames };
}

/**
 * Where the clean surface is allowed to show through on its own.
 *
 * Returns one multiplier per frame: 1 normally, 0 in the middle of a
 * break. A break needs a genuinely quiet run - quietMin frames under
 * quietThresh - so it lands in a lull rather than in a gap between two
 * words, and it is capped at breakMax so a long silence does not turn the
 * whole passage clean. The ramps matter more than they look: cutting the
 * exchange off in one frame reads as a dropped frame, easing it out over
 * breakRamp reads as the grain clearing.
 */
export function makeBreaks({ act, frames, fps = 30, p = EXCHANGE }) {
  const gate = new Float32Array(frames).fill(1);
  const breaks = [];
  let runStart = -1;
  const closeRun = (end) => {
    if (runStart < 0) return;
    const len = end - runStart;
    if (len >= p.quietMin) {
      // the break sits in the middle of the lull, capped
      const span = Math.min(p.breakMax, len);
      const a = runStart + Math.floor((len - span) / 2);
      let q = 0;
      for (let f = runStart; f < end; f++) q += act[f];
      breaks.push([a, a + span, q / len]);
    }
    runStart = -1;
  };
  for (let f = 0; f < frames; f++) {
    if (act[f] < p.quietThresh) { if (runStart < 0) runStart = f; }
    else closeRun(f);
  }
  closeRun(frames);
  /**
   * A break is meant to be a break. On calm footage nearly everything
   * reads as a lull, and taking every one of them cost 40% of the runtime
   * to clean surface - which inverts the thing being asked for. Keep the
   * quietest, at most one per breakEvery seconds, in order.
   */
  const most = Math.max(1, Math.round(frames / fps / Math.max(p.breakEvery, 1)));
  breaks.sort((a, b) => a[2] - b[2]);
  breaks.length = Math.min(breaks.length, most);
  breaks.sort((a, b) => a[0] - b[0]);
  const ramp = Math.max(p.breakRamp, 1);
  for (const [a, b] of breaks) {
    for (let f = a; f < b; f++) {
      // 0 at the edges of the break, 1 once fully inside it
      const depth = smooth01(Math.min(f - a, b - 1 - f) / ramp);
      gate[f] = Math.min(gate[f], 1 - depth);
    }
  }
  return { gate, breaks };
}

/**
 * The per-pixel exchange mask for one frame. Bilinear on the block field so
 * the envelope is smooth, a fresh hash per pixel so the flipping itself is
 * single-pixel. 0 or 255 only: nothing here is blended, so every edge in
 * the result is as sharp as the pixel grid.
 *
 * `pmax` is the probability a fully active pixel gets this frame - the
 * floor, lifted toward the peak by the concept pulse, and taken to zero
 * through a break. The spatial term is a smoothstep rather than a ramp:
 * the old `(d/ref)^gamma` spent most of its range in the shallows, which
 * is what kept coverage far under the floor everywhere except the very
 * centre of a drag.
 */
export function exchangeMask(diff, frame, W, H, MB, out, p = EXCHANGE,
                             pmax = p.xFloor, move = null) {
  const { cols, rows, n } = diff;
  const off = frame * n;
  const span = Math.max(p.dFull - p.dOn, 1e-6);
  let on = 0;
  for (let py = 0; py < H; py++) {
    // block centres sit at (bx + 0.5) * MB
    const gy = py / MB - 0.5;
    const by0 = Math.floor(gy), fy = gy - by0;
    const y0 = Math.min(rows - 1, Math.max(0, by0));
    const y1 = Math.min(rows - 1, Math.max(0, by0 + 1));
    for (let px = 0; px < W; px++) {
      const gx = px / MB - 0.5;
      const bx0 = Math.floor(gx), fx = gx - bx0;
      const x0 = Math.min(cols - 1, Math.max(0, bx0));
      const x1 = Math.min(cols - 1, Math.max(0, bx0 + 1));
      const d = (diff.d[off + y0 * cols + x0] * (1 - fx)
               + diff.d[off + y0 * cols + x1] * fx) * (1 - fy)
              + (diff.d[off + y1 * cols + x0] * (1 - fx)
               + diff.d[off + y1 * cols + x1] * fx) * fy;
      let prob = pmax * smooth01((d - p.dOn) / span);
      if (move) {
        const mv = (move.m[off + y0 * cols + x0] * (1 - fx)
                  + move.m[off + y0 * cols + x1] * fx) * (1 - fy)
                 + (move.m[off + y1 * cols + x0] * (1 - fx)
                  + move.m[off + y1 * cols + x1] * fx) * fy;
        prob *= mv;
      }
      const k = py * W + px;
      const flip = prob > 0 && hashPix(px, py, frame) < prob;
      out[k] = flip ? 255 : 0;
      if (flip) on++;
    }
  }
  return on;
}

/** Mean 4-connected cluster size of the set pixels in a 0/255 mask. */
export function meanCluster(mask, W, H) {
  const seen = new Uint8Array(W * H);
  const stack = new Int32Array(W * H);
  let clusters = 0, total = 0, biggest = 0;
  for (let i = 0; i < W * H; i++) {
    if (!mask[i] || seen[i]) continue;
    let sp = 0, size = 0;
    stack[sp++] = i; seen[i] = 1;
    while (sp > 0) {
      const k = stack[--sp]; size++;
      const x = k % W, y = (k - x) / W;
      if (x > 0 && mask[k - 1] && !seen[k - 1]) { seen[k - 1] = 1; stack[sp++] = k - 1; }
      if (x < W - 1 && mask[k + 1] && !seen[k + 1]) { seen[k + 1] = 1; stack[sp++] = k + 1; }
      if (y > 0 && mask[k - W] && !seen[k - W]) { seen[k - W] = 1; stack[sp++] = k - W; }
      if (y < H - 1 && mask[k + W] && !seen[k + W]) { seen[k + W] = 1; stack[sp++] = k + W; }
    }
    clusters++; total += size; if (size > biggest) biggest = size;
  }
  return { clusters, total, mean: clusters ? total / clusters : 0, biggest };
}
