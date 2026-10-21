/**
 * LIVE PIXEL STRETCH - the simulation behind the glitches.
 *
 * Everything else in this lab is stateless: a block's cycle is a hash of its
 * coordinate, so a frame looks the same whether you played to it or jumped
 * there. That cannot work here, and it is worth being clear why rather than
 * quietly breaking the rule.
 *
 * A stretch has to FALL. It carries a speed that depends on how long it has
 * already been falling, it stalls and resumes, it decays - and a hash cannot
 * express "where would this be if it had been going since frame 90", because
 * that is an integral over its own history. So this is a real simulation
 * with real state.
 *
 * What is kept instead is DETERMINISM. Every random draw comes from a
 * counter-based generator keyed on (seed, stretch id, purpose), and the step
 * function is pure, so replaying from frame 0 reproduces any frame exactly.
 * Scrubbing re-runs the simulation rather than guessing, which costs a few
 * hundred cheap steps and gives the same answer as playing there.
 *
 * Spawning is Poisson rather than a cycle. A hashed cycle is the thing the
 * reference look does not have: it makes every block fire on its own clock,
 * which reads as a pattern as soon as you watch it for a few seconds. Drawing
 * the count per frame from a Poisson distribution gives gaps whose
 * coefficient of variation is about 1 - genuinely irregular timing, which is
 * measurable and is measured.
 */

export interface StretchCfg {
  amount: number;            // 0 = off: overall density
  loose: number;             // stiff <-> free falling
  rate: number;              // spawns per second at full envelope
  widthMin: number;
  widthMax: number;
  headMin: number;
  headMax: number;
  gravity: number;           // px per frame^2 at loose = 1
  wobble: number;            // px of horizontal sway
  stall: number;             // chance per frame of stalling
  decay: number;             // how fast a finished stretch fades
  lifeMin: number;
  lifeMax: number;
  bend: number;              // how far B's motion bends the fall
  maxTrail: number;
  metal: number;
  maxLive: number;
}

export const STRETCH_DEFAULTS: StretchCfg = {
  amount: 0.95, loose: 0.55, rate: 26, widthMin: 2, widthMax: 12,
  headMin: 6, headMax: 26, gravity: 0.075, wobble: 0.5, stall: 0.012,
  decay: 0.035, lifeMin: 24, lifeMax: 150, bend: 0.35, maxTrail: 260,
  metal: 0.6, maxLive: 420,
};

interface Stretch {
  id: number;
  x: number; w: number;
  headY: number; headH: number;
  srcY: number;              // the row the trail repeats
  vy: number; ay: number;
  wobPhase: number; wobAmp: number; wobFreq: number;
  trail: number;
  born: number; life: number;
  stallUntil: number;
  alpha: number;
  bend: number;
}

/** Counter-based hash: same inputs, same number, no sequence to keep. */
function rnd(a: number, b: number, c: number) {
  let h = (a * 374761393 + b * 668265263 + c * 2246822519) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Knuth's method; fine here because lambda stays small. */
function poisson(lambda: number, u: number) {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1, uu = u;
  while (true) {
    p *= uu;
    if (p <= L || k > 64) break;
    k++;
    uu = (uu * 9301 + 49297) % 233280 / 233280;
  }
  return k;
}

export class StretchSim {
  cfg: StretchCfg = { ...STRETCH_DEFAULTS };
  seed = 7;
  w = 640; h = 360;
  frame = -1;
  live: Stretch[] = [];
  private nextId = 0;
  private nextArrival = 0;
  private arrivalN = 0;
  /** Per-block weight for where heads are cut from; set from the diff map. */
  private weights: Float32Array | null = null;
  private wCols = 0; private wRows = 0; private wTotal = 0;
  spawnFrames: number[] = [];

  reset() {
    this.live = [];
    this.nextId = 0;
    this.nextArrival = 0;
    this.arrivalN = 0;
    this.frame = -1;
    this.spawnFrames = [];
  }

  setSize(w: number, h: number) {
    if (w !== this.w || h !== this.h) { this.w = w; this.h = h; this.reset(); }
  }

  /** The |A-C| block map, so heads are cut where the picture is broken. */
  setWeights(data: Float32Array, cols: number, rows: number, threshold: number) {
    if (!this.weights || this.weights.length !== cols * rows) {
      this.weights = new Float32Array(cols * rows);
    }
    this.wCols = cols; this.wRows = rows;
    let t = 0;
    for (let i = 0; i < cols * rows; i++) {
      const v = Math.max(0, data[i * 4] - threshold);
      this.weights[i] = v;
      t += v;
    }
    this.wTotal = t;
  }

  /** Pick a spawn point, off the macroblock grid on purpose. */
  private spawnPoint(k: number): [number, number] {
    const mb = this.h / Math.max(this.wRows, 1);
    if (this.weights && this.wTotal > 1e-6) {
      let r = rnd(this.seed, k, 101) * this.wTotal;
      for (let i = 0; i < this.weights.length; i++) {
        r -= this.weights[i];
        if (r <= 0) {
          const cx = i % this.wCols, cy = Math.floor(i / this.wCols);
          // anywhere inside the block, not its corner: this is what keeps
          // the result off the 16 px grid
          return [(cx + rnd(this.seed, k, 102)) * mb,
            (cy + rnd(this.seed, k, 103)) * mb];
        }
      }
    }
    return [rnd(this.seed, k, 104) * this.w, rnd(this.seed, k, 105) * this.h];
  }

  /** One frame forward. `env` drives the spawn rate; `mv` bends the fall. */
  step(frame: number, env: number, fps: number, mvx = 0, mvy = -1) {
    const c = this.cfg;
    if (c.amount <= 0.001) { this.live = []; this.frame = frame; return; }
    const loose = Math.min(1, Math.max(0, c.loose));

    // ---- spawn: a real Poisson process, by exponential inter-arrivals.
    //
    // Drawing a count per frame and placing those arrivals inside the frame
    // is not the same thing, and the measurement says so: evenly spaced
    // placement reported CV 0.60 for what should be 1.0, because spacing
    // them evenly is exactly the regularity a Poisson process does not have.
    // Walking the arrival time forward by -ln(u)/lambda gives exponential
    // gaps, which is the definition, and CV lands at 1.
    const lambda = (c.rate / Math.max(fps, 1)) * c.amount
      * (0.25 + 0.75 * Math.min(1, Math.max(0, env)));
    if (this.nextArrival < frame) this.nextArrival = frame;
    const arrivals: number[] = [];
    while (lambda > 1e-9 && this.nextArrival < frame + 1) {
      arrivals.push(this.nextArrival);
      const u = Math.max(1e-9, rnd(this.seed, this.arrivalN++, 11));
      this.nextArrival += -Math.log(u) / lambda;
    }
    const n = Math.min(arrivals.length,
      Math.max(0, c.maxLive - this.live.length));
    for (let i = 0; i < n; i++) {
      const k = this.nextId++;
      const [sx, sy] = this.spawnPoint(k);
      const w = c.widthMin + rnd(this.seed, k, 2) * (c.widthMax - c.widthMin);
      const hh = c.headMin + rnd(this.seed, k, 3) * (c.headMax - c.headMin);
      this.live.push({
        id: k,
        x: Math.round(sx * 4) / 4,          // quarter-pixel, never grid-snapped
        w: Math.max(1, Math.round(w * 2) / 2),
        headY: sy, headH: hh, srcY: sy - hh,
        vy: 0.2 + rnd(this.seed, k, 4) * 0.8 * (0.3 + loose),
        // each one falls at its own rate: no shared cycle anywhere
        ay: c.gravity * (0.35 + 1.65 * rnd(this.seed, k, 5)) * (0.2 + loose),
        wobPhase: rnd(this.seed, k, 6) * 6.283,
        wobAmp: c.wobble * rnd(this.seed, k, 7) * (0.4 + loose),
        wobFreq: 0.06 + rnd(this.seed, k, 8) * 0.14,
        trail: 0,
        born: frame,
        life: c.lifeMin + rnd(this.seed, k, 9) * (c.lifeMax - c.lifeMin),
        stallUntil: -1,
        alpha: 1,
        bend: c.bend * (rnd(this.seed, k, 10) * 2 - 1),
      });
      // Sub-frame arrival time. A Poisson process has inter-arrival CV = 1,
      // but only in continuous time: at this rate lambda is about 1.5 per
      // frame, so recording whole frames aliases nearly every gap to 1 and
      // reports CV 0.22 for a process that is genuinely Poisson. The k
      // arrivals in a frame are placed across it in order.
      this.spawnFrames.push(arrivals[i]);
    }

    // ---- step
    const keep: Stretch[] = [];
    for (const s of this.live) {
      const age = frame - s.born;
      // an occasional stall, then it picks up again where it left off
      if (frame > s.stallUntil
          && rnd(this.seed, s.id, 200 + frame) < c.stall * (1.2 - loose)) {
        s.stallUntil = frame + 2 + Math.floor(rnd(this.seed, s.id, 300 + frame) * 14);
      }
      const stalled = frame <= s.stallUntil;
      if (!stalled) {
        s.vy += s.ay;
        s.headY -= s.vy;                     // y grows upward in GL space
        s.trail = Math.min(c.maxTrail, s.trail + s.vy);
      }
      s.x += Math.sin(s.wobPhase + age * s.wobFreq) * s.wobAmp * 0.35
        + mvx * c.bend * 0.02;
      if (age > s.life) s.alpha -= c.decay;
      if (s.alpha > 0.02 && s.headY + s.headH > -c.maxTrail
          && s.x > -40 && s.x < this.w + 40) keep.push(s);
    }
    this.live = keep;
    this.frame = frame;
    void mvy;
  }

  /** Replay from the beginning, so a scrub agrees with having played here. */
  seekTo(frame: number, envAt: (i: number) => number, fps: number) {
    this.reset();
    for (let i = 0; i <= frame; i++) this.step(i, envAt(i), fps);
  }

  /** Instance data: x, headY, w, headH | trail, bendX, alpha, srcY. */
  pack(out?: Float32Array) {
    const n = this.live.length;
    const buf = out && out.length >= n * 8 ? out : new Float32Array(n * 8);
    for (let i = 0; i < n; i++) {
      const s = this.live[i];
      const o = i * 8;
      buf[o] = s.x; buf[o + 1] = s.headY; buf[o + 2] = s.w; buf[o + 3] = s.headH;
      buf[o + 4] = s.trail;
      buf[o + 5] = s.bend * s.trail * 0.12;
      buf[o + 6] = Math.min(1, Math.max(0, s.alpha));
      buf[o + 7] = s.srcY;
    }
    return { buf, count: n };
  }

  /** What the measurement script is told to expect. */
  stats() {
    const lens = this.live.map((s) => s.trail);
    const spd = this.live.map((s) => s.vy);
    const wid = this.live.map((s) => s.w);
    const gaps: number[] = [];
    const fr = [...this.spawnFrames].sort((a, b) => a - b);
    for (let i = 1; i < fr.length; i++) gaps.push(fr[i] - fr[i - 1]);
    const mean = gaps.reduce((a, b) => a + b, 0) / Math.max(gaps.length, 1);
    const sd = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0)
      / Math.max(gaps.length, 1));
    // Chance level, not zero, is the thing to beat: with x continuous and a
    // half-pixel tolerance, about 1 in 32 positions lands on a multiple of
    // 16 by luck. A grid-locked system sits near 100%.
    const onGrid = this.live.filter((s) => Math.abs(s.x % 16) < 0.5).length;
    return {
      live: this.live.length,
      spawns: this.spawnFrames.length,
      length: summary(lens), speed: summary(spd), width: summary(wid),
      // speed over the ones actually falling, since a stalled stretch is 0
      speedMoving: summary(spd.filter((v) => v > 0.01)),
      spawnGapMean: mean, spawnGapSd: sd, spawnCV: sd / Math.max(mean, 1e-9),
      onGridPct: 100 * onGrid / Math.max(this.live.length, 1),
    };
  }
}

function summary(v: number[]) {
  if (!v.length) return { min: 0, median: 0, max: 0, mean: 0, n: 0 };
  const s = [...v].sort((a, b) => a - b);
  return {
    min: s[0], max: s[s.length - 1], median: s[s.length >> 1],
    mean: v.reduce((a, b) => a + b, 0) / v.length, n: v.length,
  };
}
