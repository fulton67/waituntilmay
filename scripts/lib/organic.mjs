/**
 * The organic opening shape, ported from the lab's damage shader.
 *
 * One copy, imported by everything offline that needs it, so the mask the
 * bitstream is forced through and the mask the healing restores through are
 * the same mask the preview draws. The source of truth for the maths is
 * components/mosh-lab/damage-shaders.ts; this follows it line for line.
 */

const fract = (x) => x - Math.floor(x);

export function hash12(x, y) {
  let px = fract(x * 0.1031), py = fract(y * 0.1031), pz = fract(x * 0.1031);
  const d = px * (py + 33.33) + py * (pz + 33.33) + pz * (px + 33.33);
  px = fract(px + d); py = fract(py + d); pz = fract(pz + d);
  return fract((px + py) * pz);
}

/** Coverage of the opening anchored at block (bx, by), at pixel (x, y). */
export function organicAt(x, y, bx, by, amt, org, seed, MB = 16) {
  if (org.amount <= 0.001 || amt <= 0.001) return 0;
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
  const R = org.scale * MB * amt * wob
    * (0.55 + 0.9 * hash12(bx * 3.19 + seed * 6, by * 3.19 + seed * 6));
  const t = (r - (R - soft)) / (2 * soft);
  const s = Math.min(1, Math.max(0, t));
  return 1 - (s * s * (3 - 2 * s));
}

/** Which blocks have an opening at this frame, and how far open. */
export function openingField(frame, cols, rows, seed) {
  const amt = new Float32Array(cols * rows);
  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const h = hash12(bx * 1.17 + seed, by * 1.17 + seed);
      const life = 14 + h * 34;
      const rest = 10 + hash12(bx * 2.31 + seed * 3, by * 2.31 + seed * 3) * 36;
      const period = life + rest;
      const phase = hash12(bx * 0.73 + seed * 5.5, by * 0.73 + seed * 5.5);
      const t = (frame + phase * period) % period;
      amt[by * cols + bx] = t < life
        ? Math.min(1, Math.min(t + 1, life - t) / Math.max(life * 0.3, 1)) : 0;
    }
  }
  return amt;
}

/** Full-frame pixel coverage of every opening at this frame. */
export function openingMask(frame, W, H, org, seed, MB = 16) {
  const cols = Math.ceil(W / MB), rows = Math.ceil(H / MB);
  const amt = openingField(frame, cols, rows, seed);
  const pix = new Float32Array(W * H);
  const reach = Math.ceil(org.scale * 2.4) + 1;
  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const a = amt[by * cols + bx];
      if (a <= 0.001) continue;
      const x0 = Math.max(0, (bx - reach) * MB);
      const x1 = Math.min(W, (bx + reach + 1) * MB);
      const y0 = Math.max(0, (by - reach) * MB);
      const y1 = Math.min(H, (by + reach + 1) * MB);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const v = organicAt(x + 0.5, y + 0.5, bx, by, a, org, seed, MB);
          if (v > pix[y * W + x]) pix[y * W + x] = v;
        }
      }
    }
  }
  return pix;
}
