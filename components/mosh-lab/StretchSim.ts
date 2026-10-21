/**
 * LIVE PIXEL STRETCH - the simulation behind the glitches.
 *
 * Everything else in this lab is stateless: a block's cycle is a hash of its
 * coordinate, so a frame looks the same whether you played to it or jumped
 * there. That cannot work here, and it is worth saying why rather than
 * quietly breaking the rule.
 *
 * A stretch FALLS, CURVES and MERGES. Where it is depends on how long it has
 * been travelling and on what it has met on the way, which is an integral
 * over its own history and over every other stretch's. No hash expresses
 * that.
 *
 * So this is a real simulation, and what is kept instead is DETERMINISM.
 * Every draw comes from a counter-based generator keyed on (seed, id,
 * purpose) and the step is pure, so replaying from frame 0 reproduces any
 * frame exactly. Scrubbing re-runs it rather than guessing.
 */

export interface StretchCfg {
  amount: number;            // 0 = off: overall density
  loose: number;             // stiff <-> free
  flow: number;              // straight down <-> follows the field, curving
  together: number;          // independent <-> attracting and merging
  rate: number;              // spawns per second at full envelope
  widthMin: number;
  widthMax: number;
  headMin: number;
  headMax: number;
  gravity: number;
  wobble: number;
  stall: number;
  decay: number;
  lifeMin: number;
  lifeMax: number;
  curl: number;              // how much slow noise bends the flow
  mergeDist: number;         // multiples of the combined half-width
  splitChance: number;
  maxTrail: number;
  metal: number;
  maxLive: number;
  swell: number;             // how much the width bulges
  taper: number;
  tipRound: number;
}

export const STRETCH_DEFAULTS: StretchCfg = {
  amount: 0.95, loose: 0.55, flow: 0.5, together: 0.45, rate: 26,
  widthMin: 2, widthMax: 12, headMin: 6, headMax: 26, gravity: 0.075,
  wobble: 0.5, stall: 0.012, decay: 0.035, lifeMin: 24, lifeMax: 150,
  curl: 0.6, mergeDist: 0.75, splitChance: 0.004, maxTrail: 260,
  metal: 0.6, maxLive: 420, swell: 0.35, taper: 0.55, tipRound: 0.9,
};

interface Stretch {
  id: number;
  x: number; y: number;
  w: number; headH: number;
  vx: number; vy: number;
  dirX: number; dirY: number;      // smoothed heading
  bendX: number; bendY: number;    // accumulated curvature of the path
  srcY0: number; srcY1: number; headMix: number;
  trail: number;
  born: number; life: number;
  stallUntil: number;
  alpha: number;
  wobPhase: number; wobAmp: number; wobFreq: number;
  swell: number; taper: number; tipRound: number;
  curveSum: number; curveN: number;
}

/** Counter-based hash: same inputs, same number, no sequence to keep. */
function rnd(a: number, b: number, c: number) {
  let h = (a * 374761393 + b * 668265263 + c * 2246822519) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise, for the slow part of the flow field. */
function vnoise(x: number, y: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
  const a = rnd(seed, xi, yi), b = rnd(seed, xi + 1, yi);
  const c = rnd(seed, xi, yi + 1), d = rnd(seed, xi + 1, yi + 1);
  const top = a + (b - a) * sx;
  const bot = c + (d - c) * sx;
  return top + (bot - top) * sy;
}

export class StretchSim {
  cfg: StretchCfg = { ...STRETCH_DEFAULTS };
  seed = 7;
  w = 640; h = 360;
  frame = -1;
  live: Stretch[] = [];
  spawnTimes: number[] = [];
  merges = 0;
  splits = 0;
  private nextId = 0;
  private nextArrival = 0;
  private arrivalN = 0;
  private weights: Float32Array | null = null;
  private wCols = 0; private wRows = 0; private wTotal = 0;
  private flowData: Float32Array | null = null;
  private fCols = 0; private fRows = 0; private fFrames = 0;

  reset() {
    this.live = [];
    this.nextId = 0;
    this.nextArrival = 0;
    this.arrivalN = 0;
    this.frame = -1;
    this.spawnTimes = [];
    this.merges = 0;
    this.splits = 0;
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

  /** B's motion field: the fast part of the flow the stretches follow. */
  setFlow(mv: Float32Array, frames: number, rows: number, cols: number) {
    this.flowData = mv; this.fFrames = frames; this.fRows = rows;
    this.fCols = cols;
  }

  /** Flow at a point: B's motion, turned by slow noise so paths bend. */
  private flowAt(x: number, y: number, frame: number): [number, number] {
    const c = this.cfg;
    let fx = 0, fy = -1;
    if (this.flowData && this.fCols > 0) {
      const f = Math.max(0, Math.min(this.fFrames - 1, Math.round(frame)));
      const cx = Math.max(0, Math.min(this.fCols - 1,
        Math.floor(x / this.w * this.fCols)));
      const cy = Math.max(0, Math.min(this.fRows - 1,
        Math.floor((1 - y / this.h) * this.fRows)));
      const o = ((f * this.fRows + cy) * this.fCols + cx) * 2;
      const mx = this.flowData[o], my = this.flowData[o + 1];
      const m = Math.hypot(mx, my);
      if (m > 1e-4) { fx = -mx / m; fy = my / m; }
    }
    const s = 0.012, tt = frame * 0.01;
    const n1 = vnoise(x * s + tt, y * s, this.seed + 1);
    const n2 = vnoise(x * s, y * s - tt, this.seed + 2);
    const ang = (n1 - 0.5) * 6.283 * c.curl;
    const cs = Math.cos(ang), sn = Math.sin(ang);
    return [fx * cs - fy * sn + (n2 - 0.5) * 0.4 * c.curl,
      fx * sn + fy * cs];
  }

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

  step(frame: number, env: number, fps: number) {
    const c = this.cfg;
    if (c.amount <= 0.001) { this.live = []; this.frame = frame; return; }
    const loose = Math.min(1, Math.max(0, c.loose));
    const flow = Math.min(1, Math.max(0, c.flow));
    const tog = Math.min(1, Math.max(0, c.together));

    // ---- spawn: a real Poisson process, by exponential inter-arrivals.
    // Drawing a count per frame is not the same process and does not measure
    // the same: at this rate lambda is above one per frame, so whole-frame
    // gaps alias to 1 (CV 0.22), and spreading a frame's arrivals evenly
    // adds a regularity Poisson does not have (CV 0.60). Walking the arrival
    // time forward by -ln(u)/lambda is the definition, and gives CV 1.
    const lambda = (c.rate / Math.max(fps, 1)) * c.amount
      * (0.25 + 0.75 * Math.min(1, Math.max(0, env)));
    if (this.nextArrival < frame) this.nextArrival = frame;
    const arrivals: number[] = [];
    while (lambda > 1e-9 && this.nextArrival < frame + 1) {
      arrivals.push(this.nextArrival);
      const u = Math.max(1e-9, rnd(this.seed, this.arrivalN++, 11));
      this.nextArrival += -Math.log(u) / lambda;
    }
    const n = Math.min(arrivals.length, Math.max(0, c.maxLive - this.live.length));
    for (let i = 0; i < n; i++) {
      const k = this.nextId++;
      const [sx, sy] = this.spawnPoint(k);
      const w = c.widthMin + rnd(this.seed, k, 2) * (c.widthMax - c.widthMin);
      const hh = c.headMin + rnd(this.seed, k, 3) * (c.headMax - c.headMin);
      const [fx, fy] = this.flowAt(sx, sy, frame);
      const dx = flow * fx;
      const dy = (1 - flow) * -1 + flow * fy;
      const dm = Math.hypot(dx, dy) || 1;
      const sp = (0.2 + rnd(this.seed, k, 4) * 0.8) * (0.3 + loose);
      this.live.push({
        id: k,
        x: Math.round(sx * 4) / 4, y: sy,
        w: Math.max(1, Math.round(w * 2) / 2), headH: hh,
        vx: dx / dm * sp, vy: dy / dm * sp,
        dirX: dx / dm, dirY: dy / dm,
        bendX: 0, bendY: 0,
        srcY0: sy - hh, srcY1: sy - hh, headMix: 1,
        trail: 0,
        born: frame,
        life: c.lifeMin + rnd(this.seed, k, 9) * (c.lifeMax - c.lifeMin),
        stallUntil: -1,
        alpha: 1,
        wobPhase: rnd(this.seed, k, 6) * 6.283,
        wobAmp: c.wobble * rnd(this.seed, k, 7) * (0.4 + loose),
        wobFreq: 0.06 + rnd(this.seed, k, 8) * 0.14,
        // the outline varies per stretch, so no two tips are the same shape
        swell: c.swell * (0.3 + 1.4 * rnd(this.seed, k, 12)),
        taper: c.taper * (0.4 + 1.2 * rnd(this.seed, k, 13)),
        tipRound: c.tipRound * (0.45 + 0.9 * rnd(this.seed, k, 14)),
        curveSum: 0, curveN: 0,
      });
      this.spawnTimes.push(arrivals[i]);
    }

    // ---- interaction, through a coarse bucket grid rather than every pair
    if (tog > 0.001 && this.live.length > 1) {
      const cell = 48;
      const cols = Math.ceil(this.w / cell) + 2;
      const buckets = new Map<number, number[]>();
      for (let i = 0; i < this.live.length; i++) {
        const s = this.live[i];
        const key = Math.floor(s.x / cell) + cols * Math.floor(s.y / cell);
        const b = buckets.get(key);
        if (b) b.push(i); else buckets.set(key, [i]);
      }
      const gone = new Set<number>();
      for (let i = 0; i < this.live.length; i++) {
        if (gone.has(i)) continue;
        const a = this.live[i];
        const bx = Math.floor(a.x / cell), by = Math.floor(a.y / cell);
        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            const b = buckets.get(bx + ox + cols * (by + oy));
            if (!b) continue;
            for (const j of b) {
              if (j <= i || gone.has(j)) continue;
              const o = this.live[j];
              const dx = o.x - a.x, dy = o.y - a.y;
              const d = Math.hypot(dx, dy);
              if (d < 1e-4 || d > cell) continue;
              const touch = (a.w + o.w) * 0.5 * c.mergeDist;
              if (d < touch) {
                // coalesce, and keep BOTH heads: the trail samples two
                // source rows side by side across its width
                const tw = Math.min(a.w + o.w * 0.6, c.widthMax * 2.2);
                const sum = a.w + o.w;
                a.vx = (a.vx * a.w + o.vx * o.w) / sum;
                a.vy = (a.vy * a.w + o.vy * o.w) / sum;
                a.srcY1 = o.srcY0;
                a.headMix = a.w / Math.max(tw, 1e-6);
                a.w = tw;
                a.swell = Math.max(a.swell, o.swell) * 1.1;
                a.trail = Math.max(a.trail, o.trail);
                gone.add(j);
                this.merges++;
              } else {
                // close in they push apart, further out they draw together
                const near = touch * 2.2;
                const g = tog * 0.06 * (d < near ? -1 : 1) / Math.max(d, 4);
                a.vx += dx * g; a.vy += dy * g;
                o.vx -= dx * g; o.vy -= dy * g;
              }
            }
          }
        }
      }
      if (gone.size) this.live = this.live.filter((_, i) => !gone.has(i));
    }

    // ---- step
    const keep: Stretch[] = [];
    for (const s of this.live) {
      const age = frame - s.born;
      if (frame > s.stallUntil
          && rnd(this.seed, s.id, 200 + frame) < c.stall * (1.2 - loose)) {
        s.stallUntil = frame + 2
          + Math.floor(rnd(this.seed, s.id, 300 + frame) * 14);
      }
      const stalled = frame <= s.stallUntil;

      if (!stalled) {
        const [fx, fy] = this.flowAt(s.x, s.y, frame);
        const gx = flow * fx * c.gravity * 2.2;
        const gy = (1 - flow) * -c.gravity + flow * fy * c.gravity * 2.2;
        // each one accelerates at its own rate: no two move the same way
        const per = 0.35 + 1.65 * rnd(this.seed, s.id, 5);
        s.vx += gx * per * (0.2 + loose);
        s.vy += gy * per * (0.2 + loose);
        s.vx += Math.sin(s.wobPhase + age * s.wobFreq) * s.wobAmp * 0.08;

        const sp = Math.hypot(s.vx, s.vy) || 1e-6;
        const ndx = s.vx / sp, ndy = s.vy / sp;
        // how far the heading turned this frame, in radians: the curvature
        const dot = Math.max(-1, Math.min(1, ndx * s.dirX + ndy * s.dirY));
        s.curveSum += Math.acos(dot);
        s.curveN++;
        // the bend the trail is drawn with is the sideways part of the push
        const px = -s.dirY, py = s.dirX;
        const side = ndx * px + ndy * py;
        s.bendX += px * side * sp * 0.5;
        s.bendY += py * side * sp * 0.5;
        s.dirX = s.dirX * 0.82 + ndx * 0.18;
        s.dirY = s.dirY * 0.82 + ndy * 0.18;
        const dm = Math.hypot(s.dirX, s.dirY) || 1;
        s.dirX /= dm; s.dirY /= dm;

        s.x += s.vx; s.y += s.vy;
        s.trail = Math.min(c.maxTrail, s.trail + sp);
      }

      if (!stalled && s.trail > 24
          && this.live.length + keep.length < c.maxLive
          && rnd(this.seed, s.id, 500 + frame) < c.splitChance * (0.3 + tog)) {
        // one stretch becomes two, diverging from where they parted
        const nw = Math.max(1, s.w * 0.55);
        s.w = nw;
        const ang = 0.35 + rnd(this.seed, s.id, 600 + frame) * 0.5;
        const cs = Math.cos(ang), sn = Math.sin(ang);
        keep.push({
          ...s,
          id: this.nextId++,
          w: nw,
          vx: s.vx * cs - s.vy * sn,
          vy: s.vx * sn + s.vy * cs,
          dirX: s.dirX * cs - s.dirY * sn,
          dirY: s.dirX * sn + s.dirY * cs,
          trail: s.trail * 0.6,
          born: frame,
          headMix: 1,
          srcY1: s.srcY0,
        });
        this.splits++;
      }

      if (age > s.life) s.alpha -= c.decay;
      if (s.alpha > 0.02 && s.y > -c.maxTrail && s.y < this.h + c.maxTrail
          && s.x > -60 && s.x < this.w + 60) keep.push(s);
    }
    this.live = keep;
    this.frame = frame;
  }

  /** Replay from the beginning, so a scrub agrees with having played here. */
  seekTo(frame: number, envAt: (i: number) => number, fps: number) {
    this.reset();
    for (let i = 0; i <= frame; i++) this.step(i, envAt(i), fps);
  }

  /** Instance data: four vec4 per stretch. */
  pack(out?: Float32Array) {
    const n = this.live.length;
    const buf = out && out.length >= n * 16 ? out : new Float32Array(n * 16);
    for (let i = 0; i < n; i++) {
      const s = this.live[i];
      const o = i * 16;
      buf[o] = s.x; buf[o + 1] = s.y; buf[o + 2] = s.w; buf[o + 3] = s.headH;
      buf[o + 4] = s.trail; buf[o + 5] = s.dirX; buf[o + 6] = s.dirY;
      buf[o + 7] = Math.min(1, Math.max(0, s.alpha));
      buf[o + 8] = s.bendX; buf[o + 9] = s.bendY;
      buf[o + 10] = s.srcY0; buf[o + 11] = s.srcY1;
      buf[o + 12] = s.swell; buf[o + 13] = s.taper;
      buf[o + 14] = s.tipRound; buf[o + 15] = s.headMix;
    }
    return { buf, count: n };
  }

  stats(fps = 30) {
    const lens = this.live.map((s) => s.trail);
    const spd = this.live.map((s) => Math.hypot(s.vx, s.vy));
    const wid = this.live.map((s) => s.w);
    const gaps: number[] = [];
    const fr = [...this.spawnTimes].sort((a, b) => a - b);
    for (let i = 1; i < fr.length; i++) gaps.push(fr[i] - fr[i - 1]);
    const mean = gaps.reduce((a, b) => a + b, 0) / Math.max(gaps.length, 1);
    const sd = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0)
      / Math.max(gaps.length, 1));

    // Chance level, not zero, is what "near 0" can mean here: x is
    // continuous and the tolerance is half a pixel, so about 1 in 32 lands
    // on a multiple of 16 by luck. A grid-locked system sits near 100%.
    const onGrid = this.live.filter((s) => Math.abs(s.x % 16) < 0.5).length;

    // circular variance of the headings: 0 = all one way, 1 = no preference
    let cx = 0, cy = 0;
    for (const s of this.live) { cx += s.dirX; cy += s.dirY; }
    const R = this.live.length ? Math.hypot(cx, cy) / this.live.length : 1;

    const curv = this.live.filter((s) => s.curveN > 0)
      .map((s) => s.curveSum / s.curveN);
    const rounded = this.live.filter((s) => s.tipRound > 0.05).length;
    const frames = Math.max(1, this.frame + 1);
    return {
      live: this.live.length,
      spawns: this.spawnTimes.length,
      length: summary(lens), speed: summary(spd), width: summary(wid),
      speedMoving: summary(spd.filter((v) => v > 0.01)),
      spawnGapMean: mean, spawnGapSd: sd, spawnCV: sd / Math.max(mean, 1e-9),
      onGridPct: 100 * onGrid / Math.max(this.live.length, 1),
      roundTipPct: 100 * rounded / Math.max(this.live.length, 1),
      circVar: 1 - R,
      curvature: summary(curv),
      merges: this.merges, splits: this.splits,
      mergesPerSec: this.merges / (frames / fps),
      splitsPerSec: this.splits / (frames / fps),
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
