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
  // Site percolation on a square lattice goes critical at p = 0.5927: at or
  // above that a random per-pixel mask stops being scattered pixels and
  // becomes one connected sheet. Measured on this footage at 0.6 it did
  // exactly that - mean cluster 4.2 px but a single cluster of 106403. The
  // ceiling stays well under it so the exchange reads as grain, not as a
  // region, which is the whole point of doing it per pixel.
  strength: 0.3,        // most a pixel can be asked to flip
  ref: 14,              // px of A-B disagreement that counts as "strong"
  gammaX: 1.1,
  // the drive the gain is built from (the word envelope and damage curve)
  envTerm: 0.07, conceptPre: 4, conceptAtk: 6, conceptDec: 12,
};

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

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
 * The per-pixel exchange mask for one frame. Bilinear on the block field so
 * the envelope is smooth, a fresh hash per pixel so the flipping itself is
 * single-pixel. 0 or 255 only: nothing here is blended, so every edge in
 * the result is as sharp as the pixel grid.
 */
export function exchangeMask(diff, frame, W, H, MB, out, p = EXCHANGE) {
  const { cols, rows, n } = diff;
  const off = frame * n;
  const inv = 1 / Math.max(p.ref, 1e-6);
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
      const u = clamp01(d * inv);
      const prob = p.strength * Math.pow(u, p.gammaX);
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
