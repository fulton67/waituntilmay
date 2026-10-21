/**
 * WebGL2 engine for the A x B tuning lab.
 *
 * Owns the passes in tune-shaders.ts and nothing else: no React, no DOM
 * beyond its canvas, and no notion of where the frames came from. The live
 * page feeds it <video> elements; the offline renderer feeds it ImageBitmaps
 * decoded from PNG. Both call renderFrame() with the same config, which is
 * what makes the offline render and the preview the same picture.
 *
 * The only frame-to-frame state is the bloom feedback pair. resetBloom()
 * exists so a scrub can declare the history void rather than carry a smear
 * from wherever the playhead used to be.
 */
import {
  FRAG_BLOOM, FRAG_COMP, FRAG_DIFF, FRAG_DILATE, FRAG_DRAG, FRAG_INSIDE,
  FRAG_REDUCE, FRAG_SEED, VERT,
} from "./tune-shaders";

export type Dissolve = "stepped" | "half-filled" | "broken-edges";
export type DragDir = "motion-vectors" | "vertical-melt" | "mixed";
export type DragTrigger = "envelope" | "concept-words" | "random";
export type InsideLook = "current" | "crystal";

/** The one hash the CPU-side gates use. Only implementation, so any is fine. */
function hash11(p: number) {
  let x = (p * 0.1031) % 1;
  if (x < 0) x += 1;
  x *= x + 33.33;
  x *= x + x;
  return x - Math.floor(x);
}

/** The drag gate for one frame, 0-1, from whichever trigger is selected. */
export function dragFireAt(cfg: TuneConfig, frame: number, shaped: number,
                           framesSinceOnset: number) {
  const d = cfg.drag;
  if (d.amount <= 0) return 0;
  let g = 0;
  if (d.trigger === "envelope") {
    g = shaped;
  } else if (d.trigger === "concept-words") {
    g = Math.min(1, Math.max(0, 1 - framesSinceOnset / Math.max(d.hold, 1)));
  } else {
    const hold = Math.max(d.hold, 1);
    const bucket = Math.floor(frame / hold);
    g = hash11(bucket * 5.21 + cfg.seed * 11) < d.rate / 100 * hold
      ? Math.min(1, Math.max(0, 1 - (frame % hold) / hold)) : 0;
  }
  return Math.min(1, g * d.amount);
}

export interface TuneConfig {
  seed: number;
  squares: {
    weight16: number; weight8: number; weight4: number;
    threshold: number;          // |A-C| luma units, 0-255
    baseline: number;           // share of eligible blocks, 0-1
    lifeMin: number; lifeMax: number;
    fadeRatio: number;          // fade as a share of life
    dissolve: Dissolve;
    steps: number;
  };
  reveals: {
    attack: number;             // frames
    release: number;            // seconds
    gain: number;
    loudnessWeight: number;
    knee: number;
    peak: number;               // peak coverage share, 0-1
    growRadius: number;         // blocks
    onset: number;              // leading-edge exponent
  };
  bloom: { lead: number; strength: number; decay: number; scale: number; mix: number };
  drag: {
    amount: number;            // 0 = off
    coverage: number;          // share of streaks that drag
    direction: DragDir;
    melt: number;              // melt weight when direction is mixed
    length: number;            // streak length, px
    width: number;             // streak width, px
    gap: number;               // gap between streaks, px - where B shows
    persistence: number;
    decay: number;
    trigger: DragTrigger;
    hold: number;              // frames a trigger stays up
    rate: number;              // random triggers per 100 frames
  };
  inside: {
    look: InsideLook;
    hueShift: number; saturation: number; bands: number;
    filament: number; filScale: number; stretch: number;
    edge: number; black: number;
  };
  life: { timeJitter: number; spaceJitter: number };
  b: { speed: number; dupP: number };
  /** The six plain-language dials, kept so the lab can reload them. */
  macros?: Macros;
  /**
   * "Damage over time", drawn by hand. 101 samples across the clip whatever
   * its length, so the same curve transfers to a render of a different
   * duration. Travels inside the config so one setConfig carries it to the
   * offline renderer along with everything else.
   */
  damageCurve?: number[];
  curveEnabled?: boolean;
  curveBlend?: boolean;
}

export const CURVE_SAMPLES = 101;

/** Read the hand-drawn curve at a frame, linearly between its samples. */
export function curveAt(curve: number[] | undefined, frame: number,
                        frames: number) {
  if (!curve || !curve.length) return 0;
  const t = frames > 1 ? frame / (frames - 1) : 0;
  const x = Math.min(1, Math.max(0, t)) * (curve.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = curve[i] ?? 0;
  const b = curve[Math.min(curve.length - 1, i + 1)] ?? a;
  return a + (b - a) * f;
}

/**
 * The knee, on its own, so an envelope from any source can be shaped the
 * same way the word-driven one is.
 */
export function shapeEnvelope(env: ArrayLike<number>, knee: number) {
  const k = Math.min(0.99, Math.max(0, knee));
  const out = new Float32Array(env.length);
  for (let i = 0; i < env.length; i++) {
    const v = Math.min(1, Math.max(0, env[i]));
    out[i] = Math.pow(Math.min(1, Math.max(0, (v - k) / (1 - k))), 1.6);
  }
  return out;
}

/** Simple mode. Every value 0-1; resolveMacros turns these into a config. */
export interface Macros {
  damage: number;
  squareSize: number;
  alive: number;
  drag: number;
  inside: number;
  followsWords: number;
  look: InsideLook;
}

export const DEFAULT_MACROS: Macros = {
  damage: 0.5, squareSize: 0.5, alive: 0.5, drag: 0.55, inside: 0.5,
  followsWords: 0.6, look: "current",
};

export const DEFAULTS: TuneConfig = {
  seed: 7,
  squares: {
    weight16: 0.34, weight8: 0.33, weight4: 0.33,
    // 2.0, not the 2.465 noise floor: the |A-C| distribution is bimodal
    // (p50 0.84, p99 110), and at 2.465 fifty-two of three hundred frames
    // have no eligible block at all, so the lab opens on a dead picture
    threshold: 2.0, baseline: 0.9, lifeMin: 6, lifeMax: 20,
    fadeRatio: 0.45, dissolve: "broken-edges", steps: 5,
  },
  reveals: {
    attack: 3, release: 1.5, gain: 1.0, loudnessWeight: 0.35,
    knee: 0.6, peak: 0.45, growRadius: 12, onset: 1.6,
  },
  bloom: { lead: 6, strength: 0.65, decay: 0.85, scale: 0.35, mix: 0.6 },
  drag: {
    amount: 0.8, coverage: 0.7, direction: "mixed", melt: 0.45,
    length: 42, width: 5, gap: 4, persistence: 0.5, decay: 0.8,
    trigger: "envelope", hold: 10, rate: 8,
  },
  inside: {
    // bands and black were solved by measuring the hue histogram of the
    // crystal layer on its own: at 1.0 there is no orange at all, at 2.5 it
    // is 57% orange, and 2.0 lands every family in the palette at once
    look: "current", hueShift: 0.0, saturation: 1.0, bands: 2.0,
    filament: 0.9, filScale: 30, stretch: 9.0, edge: 0.9, black: 0.72,
  },
  life: { timeJitter: 0.15, spaceJitter: 0.1 },
  b: { speed: 1.0, dupP: 4 },
};

const LOOK_ID: Record<InsideLook, number> = { current: 0, crystal: 1 };

/* ------------------------------------------------------------- macros */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The six dials, expanded into the full parameter set.
 *
 * This is the only place the mapping lives, so simple mode, the variations
 * generator, the export and the offline render all agree by construction.
 * Each dial is chosen to move one thing you can see and not to fight the
 * others:
 *
 *   damage        how much of the surface is broken at all. Drops the
 *                 detection threshold and widens how far a reveal grows.
 *   squareSize    the 16/8/4 mix, from all-small to all-chunky.
 *   alive         how fast damage turns over: short lives and high jitter at
 *                 the frantic end, long and steady at the calm end.
 *   drag          the drag module from off to melting.
 *   inside        how completely an opened square commits to B - the ramp
 *                 length, how many steps it arrives in, and how wide the
 *                 gaps between drag streaks are.
 *   followsWords  how much the speech drives it: gain and knee at one end,
 *                 a flat always-on envelope at the other.
 */
export function resolveMacros(m: Macros, base: TuneConfig = DEFAULTS): TuneConfig {
  const c = JSON.parse(JSON.stringify(base)) as TuneConfig;
  const d = clamp01(m.damage), sz = clamp01(m.squareSize);
  const al = clamp01(m.alive), dr = clamp01(m.drag);
  const ins = clamp01(m.inside), fw = clamp01(m.followsWords);

  // ---- damage: the |A-C| gate is bimodal, so this end of the range is the
  // one that matters - 2.6 leaves whole seconds with nothing eligible, 1.5
  // makes most of the moving picture eligible
  c.squares.threshold = lerp(2.6, 1.5, d);
  c.squares.baseline = lerp(0.25, 1.0, d);
  c.reveals.growRadius = Math.round(lerp(3, 20, d));
  c.reveals.peak = lerp(0.12, 0.75, d);

  // ---- square size: a weight triple, normalised by the shader anyway
  c.squares.weight16 = lerp(0.05, 0.75, sz);
  c.squares.weight8 = lerp(0.25, 0.22, sz);
  c.squares.weight4 = lerp(0.70, 0.03, sz);

  // ---- alive
  c.squares.lifeMin = Math.round(lerp(14, 3, al));
  c.squares.lifeMax = Math.round(lerp(44, 11, al));
  c.life.timeJitter = lerp(0.03, 0.55, al);
  c.life.spaceJitter = lerp(0.02, 0.4, al);

  // ---- drag
  c.drag.amount = dr <= 0.02 ? 0 : lerp(0.15, 1.0, dr);
  c.drag.coverage = lerp(0.3, 0.95, dr);
  c.drag.length = Math.round(lerp(10, 90, dr));
  c.drag.persistence = lerp(0.15, 0.85, dr);
  c.drag.decay = lerp(0.6, 0.92, dr);

  // ---- inside
  c.squares.fadeRatio = lerp(0.48, 0.1, ins);   // shorter ramp = commits faster
  c.squares.steps = Math.round(lerp(9, 2, ins)); // fewer steps = more fully on
  c.drag.gap = Math.round(lerp(1, 14, ins));     // wider gaps = more B between
  c.bloom.mix = lerp(0.25, 0.9, ins);

  // ---- follows words
  c.reveals.gain = lerp(0.55, 2.0, fw);
  c.reveals.knee = lerp(0.9, 0.3, fw);
  c.reveals.attack = lerp(10, 2, fw);
  c.reveals.release = lerp(3.0, 0.8, fw);
  c.reveals.onset = lerp(3.0, 0.8, fw);
  c.drag.trigger = fw > 0.75 ? "concept-words" : fw < 0.25 ? "random" : "envelope";

  c.inside.look = m.look;
  c.macros = JSON.parse(JSON.stringify(m));
  return c;
}

/**
 * Keep only the groups this build knows about.
 *
 * Presets and config/composite.json on disk still carry a `flash` block from
 * when that module existed. Spreading one of those over the defaults would
 * drag the dead key back in, and a stricter reader would throw on it. This
 * drops anything unrecognised instead, so an old preset loads and simply
 * loses the part that no longer exists.
 */
export function sanitizeConfig(c: unknown): TuneConfig {
  const inc = (c ?? {}) as Record<string, unknown>;
  const out = JSON.parse(JSON.stringify(DEFAULTS)) as TuneConfig;
  if (typeof inc.seed === "number") out.seed = inc.seed;
  if (inc.macros && typeof inc.macros === "object") {
    out.macros = { ...DEFAULT_MACROS, ...(inc.macros as Macros) };
  }
  if (Array.isArray(inc.damageCurve)) {
    out.damageCurve = (inc.damageCurve as unknown[])
      .map((v) => Math.min(1, Math.max(0, Number(v) || 0)));
  }
  if (typeof inc.curveEnabled === "boolean") out.curveEnabled = inc.curveEnabled;
  if (typeof inc.curveBlend === "boolean") out.curveBlend = inc.curveBlend;
  for (const k of ["squares", "reveals", "bloom", "drag", "inside",
                   "life", "b"] as const) {
    const g = inc[k];
    if (g && typeof g === "object") {
      // only keys the group already has, so a stale field cannot sneak in
      const target = out[k] as Record<string, unknown>;
      for (const [kk, vv] of Object.entries(g as Record<string, unknown>)) {
        if (kk in target) target[kk] = vv;
      }
    }
  }
  return out;
}

const DIR_ID: Record<DragDir, number> = {
  "motion-vectors": 0, "vertical-melt": 1, mixed: 2,
};

const DISSOLVE_ID: Record<Dissolve, number> = {
  stepped: 0, "half-filled": 1, "broken-edges": 2,
};

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s) || "";
    // the line numbers in the log are worthless without the source beside them
    const lines = src.split("\n").map((l, i) => `${i + 1}: ${l}`).join("\n");
    throw new Error(`shader compile failed: ${log}\n--- source ---\n${lines}`);
  }
  return s;
}

function program(gl: WebGL2RenderingContext, frag: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`link failed: ${gl.getProgramInfoLog(p)}`);
  }
  return p;
}

interface Target { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number }

export class TuneRenderer {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  private progs: Record<string, WebGLProgram> = {};
  private vao: WebGLVertexArrayObject;
  private texA: WebGLTexture; private texB: WebGLTexture; private texC: WebGLTexture;
  private texMv: WebGLTexture;
  private diff!: Target; private distA!: Target; private distB!: Target;
  // One pair of feedback buffers PER SLOT. The variation tiles all render
  // through this one context, and bloom and drag are feedback buffers, so
  // sharing a pair would have each tile inheriting the previous tile's smear
  // - six previews that differ for the wrong reason.
  private bloomA: Target[] = []; private bloomB: Target[] = [];
  private dragA: Target[] = []; private dragB: Target[] = [];
  private inside!: Target;
  private comp!: Target;
  private reduce: Target[] = [];
  private w = 0; private h = 0; private cols = 0; private rows = 0;
  private mb = 16;
  private mvFrames = 0; private mvRows = 0; private mvCols = 0;
  private mv: Float32Array | null = null;
  private bloomPrimed: boolean[] = [];
  private dragPrimed: boolean[] = [];
  readonly slots: number;
  lastDragFire = 0;
  float: { ok: boolean; message: string };
  lastCoverage = 0;

  constructor(canvas: HTMLCanvasElement, slots = 1) {
    this.canvas = canvas;
    this.slots = Math.max(1, slots);
    this.bloomPrimed = new Array(this.slots).fill(false);
    this.dragPrimed = new Array(this.slots).fill(false);
    const gl = canvas.getContext("webgl2", {
      antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: false,
    });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    const ext = gl.getExtension("EXT_color_buffer_float");
    this.float = ext
      ? { ok: true, message: "float render targets OK" }
      : { ok: false, message: "no EXT_color_buffer_float: mask may band" };

    for (const [k, f] of Object.entries({
      diff: FRAG_DIFF, seed: FRAG_SEED, dilate: FRAG_DILATE,
      bloom: FRAG_BLOOM, inside: FRAG_INSIDE, comp: FRAG_COMP,
      drag: FRAG_DRAG, reduce: FRAG_REDUCE,
    })) this.progs[k] = program(gl, f);

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.texA = this.videoTex();
    this.texB = this.videoTex();
    this.texC = this.videoTex();
    this.texMv = gl.createTexture()!;
  }

  private videoTex() {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  private target(w: number, h: number, float = true, nearest = true): Target {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, float ? gl.RGBA32F : gl.RGBA8,
      w, h, 0, gl.RGBA, float ? gl.FLOAT : gl.UNSIGNED_BYTE, null);
    const f = nearest ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb, tex, w, h };
  }

  setSize(w: number, h: number, mb = 16) {
    if (this.w === w && this.h === h && this.mb === mb) return;
    this.w = w; this.h = h; this.mb = mb;
    this.cols = Math.ceil(w / mb);
    this.rows = Math.ceil(h / mb);
    this.canvas.width = w;
    this.canvas.height = h;
    this.diff = this.target(this.cols, this.rows);
    this.distA = this.target(this.cols, this.rows);
    this.distB = this.target(this.cols, this.rows);
    this.bloomA = []; this.bloomB = []; this.dragA = []; this.dragB = [];
    for (let i = 0; i < this.slots; i++) {
      this.bloomA.push(this.target(w, h, false, false));
      this.bloomB.push(this.target(w, h, false, false));
      this.dragA.push(this.target(w, h, false, false));
      this.dragB.push(this.target(w, h, false, false));
    }
    this.inside = this.target(w, h, false, false);
    this.comp = this.target(w, h, false, false);
    // a reduction chain down to 1x1 so coverage comes back as one pixel
    this.reduce = [];
    let rw = Math.ceil(w / 2), rh = Math.ceil(h / 2);
    while (true) {
      this.reduce.push(this.target(rw, rh));
      if (rw === 1 && rh === 1) break;
      rw = Math.max(1, Math.ceil(rw / 2));
      rh = Math.max(1, Math.ceil(rh / 2));
    }
    // reallocating the targets throws away whatever history they held
    this.resetBloom();
  }

  /** The motion field, as produced by scripts/tune_prep.py. */
  setMotion(buf: ArrayBuffer) {
    const head = new Int32Array(buf, 0, 4);
    this.mvFrames = head[0]; this.mvRows = head[1]; this.mvCols = head[2];
    this.mv = new Float32Array(buf, 16);
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texMv);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private uploadMv(frame: number) {
    if (!this.mv) return;
    const gl = this.gl;
    const f = Math.max(0, Math.min(this.mvFrames - 1, Math.round(frame)));
    const per = this.mvRows * this.mvCols * 2;
    const slice = this.mv.subarray(f * per, (f + 1) * per);
    const rg = new Float32Array(this.mvRows * this.mvCols * 2);
    rg.set(slice);
    gl.bindTexture(gl.TEXTURE_2D, this.texMv);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, this.mvCols, this.mvRows, 0,
      gl.RG, gl.FLOAT, rg);
  }

  setLayer(which: "a" | "b" | "c", src: TexImageSource) {
    const gl = this.gl;
    const t = which === "a" ? this.texA : which === "b" ? this.texB : this.texC;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  }

  /** Both feedback buffers, every slot: a scrub has no history for any. */
  resetBloom() {
    this.bloomPrimed = new Array(this.slots).fill(false);
    this.dragPrimed = new Array(this.slots).fill(false);
  }

  private use(name: string) {
    const gl = this.gl;
    gl.useProgram(this.progs[name]);
    gl.bindVertexArray(this.vao);
    return this.progs[name];
  }

  private u(p: WebGLProgram, n: string) { return this.gl.getUniformLocation(p, n); }

  private bind(p: WebGLProgram, name: string, unit: number, tex: WebGLTexture) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(this.u(p, name), unit);
  }

  private draw(t: Target | null) {
    const gl = this.gl;
    if (t) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
      gl.viewport(0, 0, t.w, t.h);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /**
   * One frame. `env` and `shaped` are computed by the caller because the
   * follower runs over the whole track, not per frame.
   */
  renderFrame(cfg: TuneConfig, frame: number, env: number, shaped: number,
              framesSinceOnset: number, slot = 0) {
    const gl = this.gl;
    const grid: [number, number] = [this.cols, this.rows];
    const sl = Math.min(Math.max(slot, 0), this.slots - 1);
    const mvGrid: [number, number] = [this.mvCols || this.cols,
      this.mvRows || this.rows];

    // ---- |A - C| per block
    {
      const p = this.use("diff");
      this.bind(p, "uA", 0, this.texA);
      this.bind(p, "uC", 1, this.texC);
      gl.uniform2f(this.u(p, "uRes"), this.w, this.h);
      gl.uniform1f(this.u(p, "uMb"), this.mb);
      this.draw(this.diff);
    }

    // ---- distance to glitch, grown one block per pass
    {
      const p = this.use("seed");
      this.bind(p, "uDiff", 0, this.diff.tex);
      gl.uniform1f(this.u(p, "uThreshold"), cfg.squares.threshold);
      this.draw(this.distA);
    }
    const steps = Math.max(0, Math.min(24, Math.ceil(cfg.reveals.growRadius)));
    let src = this.distA, dst = this.distB;
    for (let s = 1; s <= steps; s++) {
      const p = this.use("dilate");
      this.bind(p, "uSrc", 0, src.tex);
      gl.uniform2f(this.u(p, "uGrid"), grid[0], grid[1]);
      gl.uniform1f(this.u(p, "uStep"), s);
      this.draw(dst);
      const t = src; src = dst; dst = t;
    }
    const dist = src;

    // ---- the inside look: restyle B before anything reads it, so the
    // composite, the bloom and the drag all see the same B
    this.uploadMv(frame);
    {
      const ic = cfg.inside;
      const p = this.use("inside");
      this.bind(p, "uB", 0, this.texB);
      this.bind(p, "uMv", 1, this.texMv);
      gl.uniform2f(this.u(p, "uRes"), this.w, this.h);
      gl.uniform2f(this.u(p, "uGrid"), mvGrid[0], mvGrid[1]);
      gl.uniform1f(this.u(p, "uFrame"), frame);
      gl.uniform1f(this.u(p, "uSeed"), cfg.seed);
      gl.uniform1i(this.u(p, "uLook"), LOOK_ID[ic.look] ?? 0);
      gl.uniform1f(this.u(p, "uHueShift"), ic.hueShift);
      gl.uniform1f(this.u(p, "uSat"), ic.saturation);
      gl.uniform1f(this.u(p, "uBandScale"), ic.bands);
      gl.uniform1f(this.u(p, "uFilament"), ic.filament);
      gl.uniform1f(this.u(p, "uFilScale"), ic.filScale);
      gl.uniform1f(this.u(p, "uStretch"), ic.stretch);
      gl.uniform1f(this.u(p, "uEdge"), ic.edge);
      gl.uniform1f(this.u(p, "uBlack"), ic.black);
      this.draw(this.inside);
    }
    const bTex = this.inside.tex;

    // ---- bloom feedback
    {
      const p = this.use("bloom");
      this.bind(p, "uPrev", 0, this.bloomA[sl].tex);
      this.bind(p, "uB", 1, bTex);
      this.bind(p, "uMv", 2, this.texMv);
      gl.uniform2f(this.u(p, "uRes"), this.w, this.h);
      gl.uniform2f(this.u(p, "uGrid"), mvGrid[0], mvGrid[1]);
      gl.uniform1f(this.u(p, "uStrength"), cfg.bloom.strength);
      gl.uniform1f(this.u(p, "uDecay"), cfg.bloom.decay);
      gl.uniform1f(this.u(p, "uScale"), cfg.bloom.scale);
      gl.uniform1i(this.u(p, "uReset"), this.bloomPrimed[sl] ? 0 : 1);
      this.draw(this.bloomB[sl]);
      const t = this.bloomA[sl];
      this.bloomA[sl] = this.bloomB[sl]; this.bloomB[sl] = t;
      this.bloomPrimed[sl] = true;
    }

    // ---- the composite
    {
      const p = this.use("comp");
      this.bind(p, "uA", 0, this.texA);
      this.bind(p, "uB", 1, bTex);
      this.bind(p, "uC", 2, this.texC);
      this.bind(p, "uDiff", 3, this.diff.tex);
      this.bind(p, "uDist", 4, dist.tex);
      this.bind(p, "uBloom", 5, this.bloomA[sl].tex);
      gl.uniform2f(this.u(p, "uRes"), this.w, this.h);
      gl.uniform2f(this.u(p, "uGrid"), grid[0], grid[1]);
      gl.uniform1f(this.u(p, "uMb"), this.mb);
      gl.uniform1f(this.u(p, "uFrame"), frame);
      gl.uniform1f(this.u(p, "uSeed"), cfg.seed);

      const s = cfg.squares;
      gl.uniform3f(this.u(p, "uSizeW"), s.weight16, s.weight8, s.weight4);
      gl.uniform1f(this.u(p, "uThreshold"), s.threshold);
      gl.uniform1f(this.u(p, "uBaseline"), s.baseline);
      gl.uniform1f(this.u(p, "uLifeMin"), s.lifeMin);
      gl.uniform1f(this.u(p, "uLifeMax"), Math.max(s.lifeMax, s.lifeMin + 1));
      gl.uniform1f(this.u(p, "uFadeRatio"), s.fadeRatio);
      gl.uniform1i(this.u(p, "uDissolve"), DISSOLVE_ID[s.dissolve] ?? 2);
      gl.uniform1f(this.u(p, "uSteps"), Math.max(1, s.steps));

      const r = cfg.reveals;
      gl.uniform1f(this.u(p, "uEnv"), env);
      gl.uniform1f(this.u(p, "uShaped"), shaped);
      gl.uniform1f(this.u(p, "uPeak"), r.peak);
      gl.uniform1f(this.u(p, "uGrowRadius"), r.growRadius);
      gl.uniform1f(this.u(p, "uOnset"), r.onset);

      gl.uniform1f(this.u(p, "uBloomMix"), cfg.bloom.mix);
      gl.uniform1f(this.u(p, "uBloomLead"), cfg.bloom.lead);
      gl.uniform1f(this.u(p, "uTJitter"), cfg.life.timeJitter);
      gl.uniform1f(this.u(p, "uSJitter"), cfg.life.spaceJitter);

      // to an offscreen target first, so coverage can be reduced from its
      // alpha before the same texture is blitted to the canvas
      this.draw(this.comp);
    }

    // ---- drag: grab the surface and pull it out of the squares
    const dcfg = cfg.drag;
    const dragFire = dragFireAt(cfg, frame, shaped, framesSinceOnset);
    this.lastDragFire = dragFire;
    {
      const p = this.use("drag");
      this.bind(p, "uComp", 0, this.comp.tex);
      this.bind(p, "uB", 1, bTex);
      this.bind(p, "uPrevDrag", 2, this.dragA[sl].tex);
      this.bind(p, "uMv", 3, this.texMv);
      gl.uniform2f(this.u(p, "uRes"), this.w, this.h);
      gl.uniform2f(this.u(p, "uGrid"), mvGrid[0], mvGrid[1]);
      gl.uniform1f(this.u(p, "uFire"), dragFire);
      gl.uniform1f(this.u(p, "uCoverage"), dcfg.coverage);
      gl.uniform1i(this.u(p, "uDirMode"), DIR_ID[dcfg.direction] ?? 2);
      gl.uniform1f(this.u(p, "uMelt"), dcfg.melt);
      gl.uniform1f(this.u(p, "uLength"), dcfg.length);
      gl.uniform1f(this.u(p, "uWidth"), dcfg.width);
      gl.uniform1f(this.u(p, "uGap"), dcfg.gap);
      gl.uniform1f(this.u(p, "uPersist"), dcfg.persistence);
      gl.uniform1f(this.u(p, "uDecay"), dcfg.decay);
      gl.uniform1f(this.u(p, "uSeed"), cfg.seed);
      gl.uniform1f(this.u(p, "uFrame"), frame);
      gl.uniform1i(this.u(p, "uReset"), this.dragPrimed[sl] ? 0 : 1);
      this.draw(this.dragB[sl]);
      const t = this.dragA[sl];
      this.dragA[sl] = this.dragB[sl]; this.dragB[sl] = t;
      this.dragPrimed[sl] = true;
    }
    // what reaches the screen, and what coverage is measured from
    const final = this.dragA[sl];

    // ---- coverage, by reducing the final alpha to one pixel
    let rsrc: Target = final;
    for (let s = 0; s < this.reduce.length; s++) {
      const t = this.reduce[s];
      const p = this.use("reduce");
      this.bind(p, "uSrc", 0, rsrc.tex);
      gl.uniform2f(this.u(p, "uSrcSize"), rsrc.w, rsrc.h);
      gl.uniform1i(this.u(p, "uFromAlpha"), s === 0 ? 1 : 0);
      this.draw(t);
      rsrc = t;
    }
    const px = new Float32Array(4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.reduce[this.reduce.length - 1].fb);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, px);
    this.lastCoverage = px[1] > 0 ? px[0] / px[1] : 0;

    // ---- to the canvas
    this.blit(final);
  }

  /**
   * Ground truth for the panels and for debugging: pull the composite and the
   * block textures back and summarise them on the CPU. Slow on purpose - this
   * is not in the per-frame path.
   */
  debug() {
    const gl = this.gl;
    const shown = this.dragPrimed[0] ? this.dragA[0] : this.comp;
    const px = new Uint8Array(shown.w * shown.h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, shown.fb);
    gl.readPixels(0, 0, shown.w, shown.h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let on = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] > 127) on++;
    const nblk = this.diff.w * this.diff.h;
    const d = new Float32Array(nblk * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.diff.fb);
    gl.readPixels(0, 0, this.diff.w, this.diff.h, gl.RGBA, gl.FLOAT, d);
    const diffs: number[] = [];
    for (let i = 0; i < nblk; i++) diffs.push(d[i * 4]);
    diffs.sort((a, b) => a - b);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return {
      alphaCoverage: on / (shown.w * shown.h),
      reducedCoverage: this.lastCoverage,
      dragFire: this.lastDragFire,
      diffMin: diffs[0], diffMedian: diffs[nblk >> 1],
      diffP90: diffs[Math.floor(nblk * 0.9)], diffMax: diffs[nblk - 1],
      blocks: nblk,
    };
  }

  /**
   * Put the restyled B on the canvas on its own.
   *
   * The composite is mostly layer A, which is warm stage footage, so a hue
   * histogram of a composited frame measures the talk and not the look. This
   * exposes the inside pass by itself so the palette can be measured as the
   * palette rather than as a blend.
   */
  blitInside() { this.blit(this.inside); }

  /** Straight copy of a target to the canvas, no resampling. */
  private blit(t: Target) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, t.fb);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.blitFramebuffer(0, 0, t.w, t.h, 0, 0, this.canvas.width,
      this.canvas.height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}

/* ------------------------------------------------------------ envelope */
/**
 * The follower, in one place, because the preview and the offline render must
 * agree on it exactly. Runs over the whole track at once: attack and release
 * are per-frame recursions, so a per-frame call could not reproduce them.
 */
export function followEnvelope(
  rawNoLoud: number[], loudness: number[], cfg: TuneConfig, fps: number,
  triggers: number[] = [],
): { env: Float32Array; shaped: Float32Array } {
  const n = rawNoLoud.length;
  const r = cfg.reveals;
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    raw[i] = Math.min(1, Math.max(0,
      rawNoLoud[i] + r.loudnessWeight * (loudness[i] ?? 0)));
  }
  for (const t of triggers) if (t >= 0 && t < n) raw[t] = 1;

  const ka = 1 - Math.exp(-1 / Math.max(r.attack, 0.5));
  const kr = 1 - Math.exp(-1 / Math.max(r.release * fps, 1));
  const env = new Float32Array(n);
  const shaped = new Float32Array(n);
  let e = 0;
  for (let i = 0; i < n; i++) {
    const tgt = raw[i];
    e += (tgt - e) * (tgt > e ? ka : kr);
    const g = Math.min(1, Math.max(0, e * r.gain));
    env[i] = g;
    const k = Math.min(0.99, Math.max(0, r.knee));
    shaped[i] = Math.pow(Math.min(1, Math.max(0, (g - k) / (1 - k))), 1.6);
  }
  return { env, shaped };
}
