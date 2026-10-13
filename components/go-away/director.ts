// Turns an analyser spectrum into eased shader parameters.
// Pure (no DOM / Web Audio) so it can be run offline against any track.

export type Uniforms = {
  uScroll: number;
  uSpin: number;
  uKick: number;
  uSnare: number;
  uBass: number;
  uMid: number;
  uHigh: number;
  uIntensity: number;
  uMorph: [number, number, number, number];
  uTwist: [number, number, number];
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
// deterministic pseudo-random 0..1 from an integer
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Band level normalised against its own recent peak, so loud and quiet masters behave the same. */
class Band {
  db = -100;
  ceil = -60;
  norm = 0;
  constructor(readonly lo: number, readonly hi: number) {}
  update(spec: Float32Array, binHz: number, dt: number) {
    const a = Math.max(1, Math.floor(this.lo / binHz));
    const b = Math.min(spec.length, Math.max(a + 1, Math.ceil(this.hi / binHz)));
    let s = 0;
    for (let i = a; i < b; i++) s += Math.pow(10, spec[i] / 10);
    this.db = 10 * Math.log10(s / (b - a) + 1e-12);
    this.ceil = Math.max(this.db, this.ceil - 2 * dt); // peak falls 2 dB/s
    this.norm = clamp01((this.db - (this.ceil - 24)) / 24);
  }
}

/** Onset detector: rise in band dB compared with that band's own recent rises. */
class Onset {
  prev = -100;
  mean = 0;
  sq = 0;
  last = -1e9;
  constructor(readonly k: number, readonly minGap: number, readonly minRise: number) {}
  update(db: number, t: number) {
    const flux = Math.max(0, db - this.prev);
    this.prev = db;
    const std = Math.sqrt(Math.max(0, this.sq - this.mean * this.mean));
    const hit = t - this.last > this.minGap && flux > this.minRise && flux > this.mean + this.k * std;
    this.mean += (flux - this.mean) * 0.03;
    this.sq += (flux * flux - this.sq) * 0.03;
    if (hit) this.last = t;
    return hit;
  }
}

export class Director {
  // analysis
  private kickBand = new Band(40, 120);
  private midBand = new Band(300, 3000);
  private snareBand = new Band(1500, 6000);
  private highBand = new Band(6000, 14000);
  private allBand = new Band(40, 14000);
  private kickOn = new Onset(2.5, 0.2, 1.5);
  private snareOn = new Onset(2.8, 0.15, 1.2);

  // counters for tests / debugging
  kicks = 0;
  snares = 0;

  // smoothed state
  private bass = 0;
  private mid = 0;
  private high = 0;
  private level = 0;
  private energyLong = 0.5;
  private intensity = 0.1;
  private intensityPeak = 0.1;
  private kick = 0;
  private snare = 0;
  private scroll = 0;
  private scrollKick = 0;
  private spin = 0;
  private spinKick = 0;
  private ringRot = 0;
  private ringKick = 0;
  private morph: [number, number, number, number] = [3, 0.7, 0.9, 1.55];
  private morphTarget: [number, number, number, number] = [3, 0.7, 0.9, 1.55];
  private morphMid: [number, number, number, number] = [3, 0.7, 0.9, 1.55];
  private twist: [number, number, number] = [0, 0, 0.2];

  private retarget(major: boolean) {
    const n = this.kicks;
    const I = this.intensity;
    const t = this.morphTarget;
    if (major) {
      t[0] = 2.6 + 2.4 * hash(n);                              // ring depth
      t[1] = 0.7 + (0.8 + 2.2 * I) * hash(n + 1);              // box spread grows with intensity
      t[3] = 1.55 + 1.6 * I * hash(n + 3);                     // p-norm: round → squarer
    }
    t[2] = 0.85 + (0.3 + 0.5 * I) * hash(n + 2);               // blob size moves every kick
  }

  /** spec: analyser float dB data. progress: 0..1 through the track. */
  update(spec: Float32Array, binHz: number, t: number, dt: number, progress: number) {
    for (const b of [this.kickBand, this.midBand, this.snareBand, this.highBand, this.allBand]) b.update(spec, binHz, dt);

    const kickHit = this.kickOn.update(this.kickBand.db, t);
    const snareHit = !kickHit && this.snareOn.update(this.snareBand.db, t);

    this.bass = ease(this.bass, this.kickBand.norm, 12, dt);
    this.mid = ease(this.mid, this.midBand.norm, 8, dt);
    this.high = ease(this.high, this.highBand.norm, 10, dt);
    this.level = ease(this.level, this.allBand.norm, 6, dt);

    // Intensity keeps climbing through the track, breathes with long-term energy,
    // and never falls more than 0.3 below where it has already been.
    this.energyLong = ease(this.energyLong, this.level, 0.35, dt);
    const target = clamp01(0.08 + 0.7 * progress + 0.6 * (this.energyLong - 0.45));
    this.intensityPeak = Math.max(this.intensityPeak, this.intensity);
    this.intensity = ease(this.intensity, Math.max(target, this.intensityPeak - 0.3), 0.5, dt);

    if (kickHit) {
      this.kicks++;
      this.kick = 1;
      this.scrollKick += 2.5 + 3 * this.intensity;
      this.retarget(this.kicks % 4 === 0);
    }
    if (snareHit) {
      this.snares++;
      this.snare = 1;
      this.spinKick += 1.5 + 2 * this.intensity;
      this.ringKick += (hash(this.snares) > 0.5 ? 1 : -1) * (0.6 + 0.8 * this.intensity);
    }
    this.advance(dt);
  }

  /** No audio: drift gently so the page is alive before play. */
  idle(t: number, dt: number) {
    this.bass = ease(this.bass, 0.25 + 0.1 * Math.sin(t), 2, dt);
    this.mid = ease(this.mid, 0.2, 2, dt);
    this.high = ease(this.high, 0.2, 2, dt);
    this.level = ease(this.level, 0.2, 2, dt);
    this.intensity = ease(this.intensity, 0.12, 1, dt);
    if (Math.floor(t / 1.2) !== Math.floor((t - dt) / 1.2)) {
      this.kicks++;
      this.kick = 0.5;
      this.retarget(this.kicks % 3 === 0);
    }
    this.advance(dt);
  }

  private advance(dt: number) {
    const I = this.intensity;
    this.kick *= Math.exp(-dt * 6);
    this.snare *= Math.exp(-dt * 9);

    // impulses bleed into velocity so hits accelerate motion rather than teleport it
    const scrollRelease = this.scrollKick * (1 - Math.exp(-dt * 4));
    this.scrollKick -= scrollRelease;
    this.scroll += dt * (0.5 + 1.5 * I + 1.2 * this.bass) + scrollRelease;

    const spinRelease = this.spinKick * (1 - Math.exp(-dt * 5));
    this.spinKick -= spinRelease;
    this.spin += dt * (0.4 + 2 * this.level * (0.4 + I)) + spinRelease;

    const ringRelease = this.ringKick * (1 - Math.exp(-dt * 3));
    this.ringKick -= ringRelease;
    this.ringRot += dt * 0.15 * (1 + I) + ringRelease;

    const rate = 3 + 5 * I;
    // two cascaded eases = S-curve: each new shape glides in and settles, no snap at the start
    for (let i = 0; i < 4; i++) {
      this.morphMid[i] = ease(this.morphMid[i], this.morphTarget[i], rate, dt);
      this.morph[i] = ease(this.morph[i], this.morphMid[i], rate, dt);
    }
    this.twist[0] = ease(this.twist[0], 0.2 * this.mid * I, 3, dt);
    this.twist[1] = this.ringRot;
    this.twist[2] = ease(this.twist[2], 0.15 + 1.1 * I, 0.8, dt);
  }

  uniforms(): Uniforms {
    return {
      uScroll: this.scroll,
      uSpin: this.spin,
      uKick: this.kick,
      uSnare: this.snare,
      uBass: this.bass,
      uMid: this.mid,
      uHigh: this.high,
      uIntensity: this.intensity,
      uMorph: [...this.morph],
      uTwist: [...this.twist],
    };
  }
}
