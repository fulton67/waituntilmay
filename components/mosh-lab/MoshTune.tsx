"use client";
/**
 * /mosh-lab/tune - tune the A x B composite by eye.
 *
 * Simple mode is six plain dials. Each moves a handful of internal
 * parameters together through resolveMacros() in TuneRenderer, which is the
 * only place that mapping exists - so the dials, the variations generator,
 * the export and the offline render cannot disagree about what "damage 70"
 * means. The old panels are still here, collapsed, and an advanced edit
 * survives a dial move unless that dial owns the same parameter.
 *
 * Nothing is pre-rendered. A, B and C play as three muted videos on one
 * clock and every frame is composited in WebGL, so a dial lands on the next
 * frame. The variation tiles go through the same single context on separate
 * feedback slots, which is what keeps six live previews affordable.
 *
 * A render-mode hook (?render=1) exposes window.__tune so the offline
 * renderer drives these same programs with frames it supplies itself.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CURVE_SAMPLES, curveAt, DEFAULT_MACROS, DEFAULTS,
  followEnvelope, resolveMacros, sanitizeConfig, shapeEnvelope, TuneRenderer,
  type CPath, type Dissolve, type FoldCenter,
  type FoldWhere, type InsideLook, type Macros, type TuneConfig,
} from "./TuneRenderer";
import "./mosh-tune.css";

const DATA = "/mosh-lab/blum-internet-tune.json";
const TILES = 6;
const PREVIEW_SECONDS = 2.5;

interface TuneData {
  name: string; frames: number; fps: number; width: number; height: number;
  clipStart: number; mb: number; triggers: number[];
  conceptWords: string[];
  conceptHits: { stem: string; frame: number }[];
  words: { w: string; f0: number; f1: number; stem: string }[];
  rawNoLoudness: number[]; loudness: number[]; drift: number[];
  layers: { a: string; b: string; c: string };
  mvBin: string;
}

const clone = <T,>(c: T): T => JSON.parse(JSON.stringify(c));

/* --------------------------------------------------------- simple mode */
/**
 * Five dials, one per relationship plus the fold. The drip, stretch and
 * opening-shape dials are not here any more - they spawned things, and
 * nothing in the base look spawns anything now. They are still live and
 * still saved, one fold down under "older dials", so a look built on them
 * keeps working.
 */
const MACROS: { key: keyof Macros; label: string; hint: string }[] = [
  { key: "amplify", label: "Amplify",
    hint: "How hard the picture's own motion is multiplied. Left leaves the footage alone, right throws anything that moved across the frame. Anything that was still stays still at either end." },
  { key: "accumulate", label: "Accumulate",
    hint: "How long a push keeps going after the motion that caused it has stopped. Left stops with the movement, right drags on for a second or more." },
  { key: "underResponse", label: "Underlayer response",
    hint: "How the layer underneath answers the same motion. Right makes it softer, slower and more fluid, so it lags behind the surface instead of matching it." },
  { key: "exchange", label: "Exchange",
    hint: "How readily single pixels flip between the surface and the layer underneath, where the two disagree about where the picture went. It is per pixel, so it reads as grain rather than as holes." },
  { key: "foldIn", label: "Fold in",
    hint: "Folds the picture into a fractal, so the surface and the layer underneath interleave along its bands. Past about 85 it takes the whole frame instead of just the holes." },
];

/** Still here, still saved, just not in the way. */
const OLDER_MACROS: { key: keyof Macros; label: string; hint: string }[] = [
  { key: "damage", label: "Damage",
    hint: "How broken the picture gets. Left leaves it clean, right tears most of it apart." },
  { key: "squareSize", label: "Square size",
    hint: "The size of the broken blocks. Left is fine grit, right is big chunky tiles." },
  { key: "alive", label: "Alive",
    hint: "How fast the damage moves around. Left sits still, right flickers and churns." },
  { key: "drag", label: "Pixel stretch",
    hint: "How much of the picture is pulled into falling metal tubes. Each one is a block of glitch with its edge row smeared down behind it." },
  { key: "loose", label: "Loose",
    hint: "Stiff holds the stretches almost still and makes them stall often. Free lets them accelerate, sway and fall right out of frame." },
  { key: "flow", label: "Flow",
    hint: "Left sends every stretch straight down. Right lets each one follow the motion in the picture, so paths curve and bend apart." },
  { key: "together", label: "Together",
    hint: "Left leaves each stretch alone. Right makes them pull on each other, deflect, run into one another and merge into one." },
  { key: "inside", label: "Inside",
    hint: "How much of the layer underneath shows through a hole, instead of staying half-closed." },
  { key: "followsWords", label: "Follows words",
    hint: "How much the speech drives it. Left ignores the talk, right bursts open on words like “internet”." },
];

const LOOKS: { v: InsideLook; label: string; hint: string }[] = [
  { v: "current", label: "Current",
    hint: "The motion-vector layer as it is." },
  { v: "crystal", label: "Crystal",
    hint: "Polarized light through a crystal: oil-slick colour on near-black, feathery streaks following the motion." },
];

/* ------------------------------------------------------------ advanced */
type Spec = { key: string; label: string; min: number; max: number; step: number };

const GROUPS: { name: string; path: keyof TuneConfig; specs: Spec[] }[] = [
  {
    name: "squares", path: "squares", specs: [
      { key: "weight16", label: "16 px weight", min: 0, max: 1, step: 0.01 },
      { key: "weight8", label: "8 px weight", min: 0, max: 1, step: 0.01 },
      { key: "weight4", label: "4 px weight", min: 0, max: 1, step: 0.01 },
      { key: "threshold", label: "detect |A-C|", min: 0, max: 24, step: 0.05 },
      { key: "baseline", label: "baseline coverage", min: 0, max: 1, step: 0.01 },
      { key: "lifeMin", label: "life min (frames)", min: 2, max: 60, step: 1 },
      { key: "lifeMax", label: "life max (frames)", min: 3, max: 90, step: 1 },
      { key: "fadeRatio", label: "fade ratio of life", min: 0.02, max: 0.5, step: 0.01 },
      { key: "steps", label: "dissolve steps", min: 1, max: 16, step: 1 },
    ],
  },
  {
    name: "reveals", path: "reveals", specs: [
      { key: "attack", label: "attack (frames)", min: 0.5, max: 30, step: 0.5 },
      { key: "release", label: "release (s)", min: 0.1, max: 6, step: 0.05 },
      { key: "gain", label: "gain", min: 0.1, max: 3, step: 0.01 },
      { key: "loudnessWeight", label: "loudness weight", min: 0, max: 1, step: 0.01 },
      { key: "knee", label: "knee", min: 0, max: 0.95, step: 0.01 },
      { key: "peak", label: "peak coverage", min: 0.02, max: 1, step: 0.01 },
      { key: "growRadius", label: "growth radius (blocks)", min: 0, max: 24, step: 1 },
      { key: "onset", label: "onset sharpness", min: 0.1, max: 6, step: 0.05 },
    ],
  },
  {
    name: "the three relationships", path: "exchange", specs: [
      { key: "calmGain", label: "gain when calm", min: 0.5, max: 4, step: 0.05 },
      { key: "amplify", label: "gain on a concept word", min: 1, max: 60, step: 0.5 },
      { key: "accum", label: "accumulate (surface)", min: 0, max: 0.95, step: 0.01 },
      { key: "clampPx", label: "longest throw (px)", min: 16, max: 511, step: 1 },
      { key: "bResponse", label: "underlayer gain", min: 0, max: 3, step: 0.05 },
      { key: "bAccum", label: "underlayer memory", min: 0, max: 0.97, step: 0.01 },
      { key: "bSmooth", label: "underlayer smooth (blocks)", min: 0, max: 4, step: 1 },
      { key: "xFloor", label: "exchange floor", min: 0, max: 0.55, step: 0.01 },
      { key: "xPeak", label: "exchange peak on a word", min: 0, max: 0.8, step: 0.01 },
      { key: "dOn", label: "A-B difference that wakes it (px)", min: 0.02, max: 4, step: 0.02 },
      { key: "dFull", label: "...and that opens it fully (px)", min: 0.1, max: 12, step: 0.1 },
      { key: "moveRef", label: "real motion that counts (px)", min: 0.2, max: 12, step: 0.1 },
      { key: "moveDecay", label: "motion memory", min: 0, max: 0.97, step: 0.01 },
      { key: "moveDilate", label: "motion dilate (blocks)", min: 0, max: 3, step: 1 },
      { key: "quietThresh", label: "quiet below", min: 0, max: 0.6, step: 0.01 },
      { key: "breakMax", label: "longest break (frames)", min: 10, max: 120, step: 1 },
      { key: "breakEvery", label: "at most one break per (s)", min: 2, max: 30, step: 1 },
      { key: "genDecay", label: "gain kept per generation", min: 0.2, max: 1, step: 0.01 },
      { key: "envTerm", label: "envelope term", min: 0, max: 1, step: 0.01 },
      { key: "conceptAtk", label: "word attack (frames)", min: 1, max: 30, step: 1 },
      { key: "conceptDec", label: "word decay (frames)", min: 1, max: 90, step: 1 },
    ],
  },
  {
    name: "bloom", path: "bloom", specs: [
      { key: "lead", label: "lead (frames)", min: 0, max: 30, step: 1 },
      { key: "strength", label: "strength", min: 0, max: 1, step: 0.01 },
      { key: "decay", label: "decay", min: 0, max: 0.995, step: 0.005 },
      { key: "scale", label: "mv scale", min: 0, max: 2, step: 0.01 },
      { key: "mix", label: "mix into B", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    name: "pixel stretch", path: "stretch", specs: [
      { key: "amount", label: "amount", min: 0, max: 1, step: 0.01 },
      { key: "loose", label: "loose", min: 0, max: 1, step: 0.01 },
      { key: "flow", label: "flow", min: 0, max: 1, step: 0.01 },
      { key: "together", label: "together", min: 0, max: 1, step: 0.01 },
      { key: "curl", label: "path curl", min: 0, max: 2, step: 0.02 },
      { key: "mergeDist", label: "merge distance", min: 0, max: 2, step: 0.02 },
      { key: "splitChance", label: "split chance", min: 0, max: 0.05, step: 0.001 },
      { key: "swell", label: "tip swell", min: 0, max: 1.5, step: 0.02 },
      { key: "taper", label: "tip taper", min: 0, max: 1.2, step: 0.02 },
      { key: "tipRound", label: "tip roundness", min: 0, max: 2, step: 0.02 },
      { key: "rate", label: "spawns per second", min: 0, max: 90, step: 1 },
      { key: "widthMin", label: "width min (px)", min: 1, max: 20, step: 0.5 },
      { key: "widthMax", label: "width max (px)", min: 2, max: 40, step: 0.5 },
      { key: "headMin", label: "head height min", min: 2, max: 40, step: 1 },
      { key: "headMax", label: "head height max", min: 4, max: 90, step: 1 },
      { key: "gravity", label: "gravity", min: 0, max: 0.4, step: 0.005 },
      { key: "wobble", label: "horizontal wobble", min: 0, max: 3, step: 0.02 },
      { key: "stall", label: "stall chance", min: 0, max: 0.12, step: 0.001 },
      { key: "decay", label: "decay", min: 0.002, max: 0.2, step: 0.002 },
      { key: "lifeMin", label: "life min (frames)", min: 4, max: 120, step: 1 },
      { key: "lifeMax", label: "life max (frames)", min: 10, max: 400, step: 5 },
      { key: "maxTrail", label: "max trail (px)", min: 10, max: 400, step: 5 },
      { key: "metal", label: "metallic shading", min: 0, max: 1.5, step: 0.02 },
      { key: "maxLive", label: "max at once", min: 20, max: 900, step: 10 },
    ],
  },
  {
    name: "organic openings", path: "organic", specs: [
      { key: "amount", label: "amount", min: 0, max: 1, step: 0.01 },
      { key: "scale", label: "radius (blocks)", min: 0.1, max: 4, step: 0.05 },
      { key: "wobble", label: "outline wobble", min: 0, max: 1.5, step: 0.02 },
      { key: "soft", label: "edge softness (px)", min: 0.5, max: 12, step: 0.5 },
    ],
  },
  {
    name: "inside look", path: "inside", specs: [
      { key: "hueShift", label: "hue shift", min: 0, max: 1, step: 0.01 },
      { key: "saturation", label: "saturation", min: 0, max: 2, step: 0.01 },
      { key: "bands", label: "interference bands", min: 0.2, max: 6, step: 0.05 },
      { key: "filament", label: "dendrite strength", min: 0, max: 3, step: 0.02 },
      { key: "filScale", label: "dendrite scale", min: 4, max: 90, step: 1 },
      { key: "stretch", label: "stretch along motion", min: 1, max: 24, step: 0.5 },
      { key: "edge", label: "bright edges", min: 0, max: 3, step: 0.02 },
      { key: "black", label: "black floor", min: 0, max: 0.9, step: 0.01 },
    ],
  },
  {
    name: "fold", path: "fold", specs: [
      { key: "amount", label: "amount", min: 0, max: 1, step: 0.01 },
      { key: "cSpeed", label: "c path speed", min: 0, max: 2, step: 0.01 },
      { key: "cPush", label: "c push from words", min: 0, max: 2, step: 0.01 },
      { key: "cRadius", label: "c radius", min: 0.1, max: 1.2, step: 0.005 },
      { key: "iterations", label: "iterations", min: 8, max: 400, step: 1 },
      { key: "bandDensity", label: "band density", min: 0.5, max: 40, step: 0.5 },
      { key: "field", label: "field-line strength", min: 0.1, max: 16, step: 0.1 },
      { key: "zoom", label: "zoom", min: 0.05, max: 4, step: 0.01 },
      { key: "followZoom", label: "zoom follows region", min: 0, max: 1, step: 0.01 },
      { key: "alternate", label: "A/B alternation", min: 0, max: 1, step: 0.01 },
      { key: "edge", label: "edge width (px)", min: 1, max: 40, step: 1 },
      { key: "soft", label: "rim softness (px)", min: 1, max: 40, step: 1 },
    ],
  },
  {
    name: "life", path: "life", specs: [
      { key: "timeJitter", label: "temporal jitter", min: 0, max: 1, step: 0.01 },
      { key: "spaceJitter", label: "spatial jitter", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    name: "layer B", path: "b", specs: [
      { key: "speed", label: "playback speed", min: 0.1, max: 2, step: 0.05 },
      { key: "dupP", label: "P-frame dup interval", min: 0, max: 16, step: 1 },
    ],
  },
];

const jitter = (v: number, spread: number) =>
  Math.min(1, Math.max(0, v + (Math.random() * 2 - 1) * spread));

function varyMacros(m: Macros, spread: number): Macros {
  const out = clone(m);
  for (const { key } of MACROS) {
    (out as unknown as Record<string, number>)[key] = jitter(m[key] as number, spread);
  }
  // the look only flips when the variations are meant to stray a long way
  if (Math.random() < spread * 0.5) {
    out.look = out.look === "crystal" ? "current" : "crystal";
  }
  return out;
}

export default function MoshTune() {
  const [data, setData] = useState<TuneData | null>(null);
  const [cfg, setCfg] = useState<TuneConfig>(DEFAULTS);
  const [macros, setMacros] = useState<Macros>(DEFAULT_MACROS);
  const [err, setErr] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const [rate, setRate] = useState(1);
  const [loopOn, setLoopOn] = useState(false);
  const [loop, setLoop] = useState<[number, number]>([0, 0]);
  const [coverage, setCoverage] = useState(0);
  const [presets, setPresets] = useState<Record<string, TuneConfig>>({});
  const [presetName, setPresetName] = useState("");
  const [status, setStatus] = useState("");
  const [writable, setWritable] = useState(false);
  const [realOk, setRealOk] = useState(false);
  const [realBusy, setRealBusy] = useState(false);
  const [realUrl, setRealUrl] = useState<string | null>(null);
  const [realMsg, setRealMsg] = useState("");

  const [curve, setCurve] = useState<number[]>(
    () => new Array(CURVE_SAMPLES).fill(0.25));
  const [curveOn, setCurveOn] = useState(false);
  const [curveBlend, setCurveBlend] = useState(true);
  const drawing = useRef(false);

  const [variants, setVariants] = useState<{ m: Macros; c: TuneConfig }[]>([]);
  const [spread, setSpread] = useState(0.22);
  const [history, setHistory] =
    useState<{ m: Macros; c: TuneConfig; thumb: string }[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const aRef = useRef<HTMLVideoElement | null>(null);
  const bRef = useRef<HTMLVideoElement | null>(null);
  const cRef = useRef<HTMLVideoElement | null>(null);
  const tlRef = useRef<HTMLCanvasElement | null>(null);
  const tileRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const rendRef = useRef<TuneRenderer | null>(null);
  const cfgRef = useRef(cfg);
  const varRef = useRef(variants);
  const baseline = useRef<TuneConfig>(DEFAULTS);
  const overridden = useRef(false);
  cfgRef.current = cfg;
  varRef.current = variants;

  const renderMode = useMemo(
    () => typeof location !== "undefined"
      && new URLSearchParams(location.search).has("render"), []);

  /* ------------------------------------------------------------- loading */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d: TuneData = await (await fetch(DATA, { cache: "no-store" })).json();
        if (!alive) return;
        setData(d);
        setLoop([0, d.frames - 1]);
        const mv = await (await fetch(d.mvBin, { cache: "no-store" })).arrayBuffer();
        if (!alive) return;
        const r = rendRef.current;
        if (r) { r.setSize(d.width, d.height, d.mb); r.setMotion(mv); }
      } catch (e) {
        if (alive) setErr(String((e as Error).message ?? e));
      }
      try {
        const s = await (await fetch("/api/tune", { cache: "no-store" })).json();
        if (!alive) return;
        setWritable(!!s.writable);
        if (s.presets && typeof s.presets === "object") setPresets(s.presets);
        if (s.config) {
          const merged = sanitizeConfig(s.config);
          baseline.current = clone(merged);
          if (!overridden.current) {
            setCfg(merged);
            if (merged.macros) setMacros(merged.macros);
            if (merged.damageCurve?.length) setCurve(merged.damageCurve);
            if (typeof merged.curveEnabled === "boolean") setCurveOn(merged.curveEnabled);
            if (typeof merged.curveBlend === "boolean") setCurveBlend(merged.curveBlend);
          }
        }
      } catch { /* the lab still works on its built-in defaults */ }
      try {
        const r = await (await fetch("/api/render-real", { cache: "no-store" })).json();
        if (alive) setRealOk(!!r.available);
      } catch { /* the button just stays disabled */ }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!canvasRef.current || rendRef.current) return;
    try {
      // one slot for the main picture, one per variation tile
      rendRef.current = new TuneRenderer(canvasRef.current, TILES + 1);
      if (data) rendRef.current.setSize(data.width, data.height, data.mb);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    }
  }, [data]);

  /* ------------------------------------------------------- the envelope */
  const wordEnv = useMemo(() => {
    if (!data) return null;
    return followEnvelope(data.rawNoLoudness, data.loudness, cfg, data.fps,
      data.triggers);
  }, [data, cfg]);

  const onsetDistance = useMemo(() => {
    if (!data) return null;
    const d = new Float32Array(data.frames).fill(9999);
    for (const h of data.conceptHits) {
      for (let i = h.frame; i < data.frames; i++) {
        const v = i - h.frame;
        if (v < d[i]) d[i] = v; else break;
      }
    }
    return d;
  }, [data]);

  /**
   * What the picture actually follows. The hand-drawn curve replaces the word
   * envelope, or is averaged with it, so "quiet here" can override the
   * transcript without throwing the transcript away.
   */
  const envelope = useMemo(() => {
    if (!data || !wordEnv) return null;
    if (!curveOn) return wordEnv;
    const n = data.frames;
    const env = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const drawn = curveAt(curve, i, n);
      env[i] = curveBlend ? (drawn + wordEnv.env[i]) * 0.5 : drawn;
    }
    return { env, shaped: shapeEnvelope(env, cfg.reveals.knee) };
  }, [data, wordEnv, curve, curveOn, curveBlend, cfg.reveals.knee]);

  // How hard the stretch system is spawning: exactly the factor that scales
  // the Poisson rate, so the band shows what the simulation is actually told.
  const dragTrack = useMemo(() => {
    if (!data || !envelope) return null;
    const t = new Float32Array(data.frames);
    for (let i = 0; i < data.frames; i++) {
      t[i] = cfg.stretch.amount
        * (0.25 + 0.75 * Math.min(1, Math.max(0, envelope.shaped[i])));
    }
    return t;
  }, [data, cfg.stretch.amount, envelope]);

  /* ----------------------------------------------------------- one frame */
  const drawFrame = useCallback((f: number) => {
    const r = rendRef.current, d = data;
    if (!r || !d || !envelope || !onsetDistance) return;
    const a = aRef.current, b = bRef.current, c = cRef.current;
    if (!a || !b || !c) return;
    if (a.readyState < 2 || b.readyState < 2 || c.readyState < 2) return;
    r.setLayer("a", a);
    r.setLayer("b", b);
    r.setLayer("c", c);
    const i = Math.max(0, Math.min(d.frames - 1, Math.round(f)));
    const e = envelope.env[i], sh = envelope.shaped[i], on = onsetDistance[i];

    const vs = varRef.current;
    for (let k = 0; k < vs.length; k++) {
      const tile = tileRefs.current[k];
      if (!tile) continue;
      r.renderFrame(vs[k].c, i, e, sh, on, k + 1);
      const g = tile.getContext("2d");
      if (!g) continue;
      if (tile.width !== r.canvas.width) {
        tile.width = r.canvas.width;
        tile.height = r.canvas.height;
      }
      g.drawImage(r.canvas, 0, 0);
    }

    // the main picture goes last, so it is what is left on the canvas
    r.renderFrame(cfgRef.current, i, e, sh, on, 0);
    setCoverage(r.lastCoverage);
  }, [data, envelope, onsetDistance]);

  /* ------------------------------------------------- the transport clock */
  useEffect(() => {
    if (!data || renderMode) return;
    const a = aRef.current, b = bRef.current, c = cRef.current;
    if (!a || !b || !c) return;
    for (const v of [a, b, c]) { v.playbackRate = rate; v.muted = true; }
    b.playbackRate = rate * cfg.b.speed;
    if (playing) {
      a.play().catch(() => {}); b.play().catch(() => {}); c.play().catch(() => {});
    } else { a.pause(); b.pause(); c.pause(); }
  }, [playing, rate, data, cfg.b.speed, renderMode]);

  const seekAll = useCallback((t: number) => {
    for (const r of [aRef, bRef, cRef]) {
      const v = r.current;
      if (v) v.currentTime = t;
    }
    rendRef.current?.resetBloom();
  }, []);

  useEffect(() => {
    if (!data || renderMode) return;
    let raf = 0;
    const tick = () => {
      const a = aRef.current;
      if (a && data) {
        let f = a.currentTime * data.fps;
        if (loopOn && (f < loop[0] || f > loop[1])) {
          f = loop[0];
          seekAll(loop[0] / data.fps);
        }
        setFrame(f);
        drawFrame(f);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data, drawFrame, loopOn, loop, renderMode, seekAll]);

  /* -------------------------------------------------- the damage curve */
  const covHist = useRef<Float32Array>(new Float32Array(0));
  useEffect(() => {
    if (data && covHist.current.length !== data.frames) {
      covHist.current = new Float32Array(data.frames);
    }
  }, [data]);
  useEffect(() => {
    if (!data) return;
    const i = Math.round(frame);
    if (i >= 0 && i < covHist.current.length) covHist.current[i] = coverage;
  }, [coverage, frame, data]);

  const paintCurve = useCallback((clientX: number, clientY: number) => {
    const cv = tlRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, 1 - (clientY - r.top) / r.height));
    setCurve((prev) => {
      const next = prev.slice();
      const at = x * (CURVE_SAMPLES - 1);
      const lo = Math.max(0, Math.floor(at) - 1);
      const hi = Math.min(CURVE_SAMPLES - 1, Math.ceil(at) + 1);
      // a soft brush, so one drag does not leave a staircase
      for (let i = lo; i <= hi; i++) {
        const w = 1 - Math.min(1, Math.abs(i - at) / 2);
        next[i] = next[i] * (1 - w) + y * w;
      }
      return next;
    });
    setCurveOn(true);
  }, []);

  useEffect(() => {
    const cv = tlRef.current, d = data;
    if (!cv || !d || !envelope || !wordEnv) return;
    const W = cv.clientWidth || 900, H = 150;
    if (cv.width !== W) cv.width = W;
    cv.height = H;
    const g = cv.getContext("2d");
    if (!g) return;
    const x = (f: number) => (f / (d.frames - 1)) * W;
    g.clearRect(0, 0, W, H);
    g.fillStyle = "#0b0b0b";
    g.fillRect(0, 0, W, H);

    if (loopOn) {
      g.fillStyle = "rgba(255,210,0,0.10)";
      g.fillRect(x(loop[0]), 0, Math.max(1, x(loop[1]) - x(loop[0])), H);
    }

    g.font = "9px ui-monospace, monospace";
    const concept = new Set(d.conceptWords);
    for (const w of d.words) {
      const isC = concept.has(w.stem);
      g.fillStyle = isC ? "#ffd200" : "#3a3a3a";
      g.fillRect(x(w.f0), 2, Math.max(1, x(w.f1) - x(w.f0)), 6);
      if (isC) {
        g.fillStyle = "#ffd200";
        g.fillText(w.w, Math.min(W - 44, x(w.f0)), 19);
      }
    }
    for (const h of d.conceptHits) {
      g.strokeStyle = "rgba(255,210,0,0.5)";
      g.beginPath(); g.moveTo(x(h.frame), 0); g.lineTo(x(h.frame), H); g.stroke();
    }

    const plot = (arr: ArrayLike<number>, col: string, width = 1,
                  scale = 1, dash: number[] = []) => {
      g.strokeStyle = col; g.lineWidth = width; g.setLineDash(dash);
      g.beginPath();
      for (let f = 0; f < d.frames; f++) {
        const v = Math.min(1, (arr[f] ?? 0) * scale);
        const px = x(f), py = 24 + (H - 34) - v * (H - 34);
        if (f === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.stroke();
      g.setLineDash([]);
    };

    plot(covHist.current, "#4b7f4b", 1, 1 / Math.max(cfg.reveals.peak, 0.05));
    plot(wordEnv.env, "rgba(74,163,255,0.45)", 1, 1, [3, 3]);
    const drawn = new Float32Array(d.frames);
    for (let f = 0; f < d.frames; f++) drawn[f] = curveAt(curve, f, d.frames);
    plot(curveOn ? envelope.env : drawn,
      curveOn ? "#ff5aa8" : "rgba(255,90,168,0.35)", 2);

    if (dragTrack) {
      for (let f = 0; f < d.frames; f++) {
        const v = dragTrack[f];
        if (v <= 0) continue;
        g.fillStyle = `rgba(255,120,220,${0.2 + 0.7 * v})`;
        g.fillRect(x(f), H - 9, Math.max(1, W / d.frames), 8);
      }
    }

    g.strokeStyle = "#fff";
    g.beginPath(); g.moveTo(x(frame), 0); g.lineTo(x(frame), H); g.stroke();
  }, [data, envelope, wordEnv, frame, loopOn, loop, cfg.reveals.peak, curve,
    curveOn, dragTrack]);

  /* ------------------------------------------------------------- setters */
  const applyMacros = (next: Macros) => {
    setMacros(next);
    setCfg((c) => resolveMacros(next, c));
  };

  const setIn = (group: string, key: string, v: number) =>
    setCfg((c) => {
      const n = clone(c);
      (n as unknown as Record<string, Record<string, number>>)[group][key] = v;
      return n;
    });

  /* --------------------------------------------------------- variations */
  const makeVariants = (from: Macros, sp: number) => {
    const next = [];
    for (let i = 0; i < TILES; i++) {
      const m = varyMacros(from, sp);
      next.push({ m, c: resolveMacros(m, cfgRef.current) });
    }
    setVariants(next);
    // previews read best as a short loop around where you already are
    if (data) {
      const f0 = Math.round(frame);
      const f1 = Math.min(data.frames - 1,
        f0 + Math.round(PREVIEW_SECONDS * data.fps));
      setLoop([f0, f1]);
      setLoopOn(true);
      setPlaying(true);
    }
  };

  const chooseVariant = (k: number) => {
    const v = variants[k];
    if (!v) return;
    let thumb = "";
    try {
      const t = tileRefs.current[k];
      thumb = t ? t.toDataURL("image/jpeg", 0.5) : "";
    } catch { thumb = ""; }
    setHistory((h) => [{ m: macros, c: cfgRef.current, thumb }, ...h].slice(0, 12));
    setMacros(v.m);
    setCfg(v.c);
    makeVariants(v.m, spread);
  };

  const goBack = (k: number) => {
    const h = history[k];
    if (!h) return;
    setMacros(h.m);
    setCfg(h.c);
    setHistory((prev) => prev.slice(k + 1));
  };

  /* ------------------------------------------------------- save / export */
  const resolved = (): TuneConfig => ({
    ...clone(cfg),
    macros: clone(macros),
    damageCurve: curve.map((v) => Math.round(v * 1000) / 1000),
    curveEnabled: curveOn,
    curveBlend,
  });

  const save = async (what: "config" | "presets", payload: unknown) => {
    try {
      const r = await fetch("/api/tune", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ what, [what]: payload }),
      });
      const j = await r.json();
      setStatus(r.ok ? `wrote ${j.wrote}` : `failed: ${j.error}`);
    } catch (e) { setStatus(`failed: ${(e as Error).message}`); }
    setTimeout(() => setStatus(""), 4000);
  };

  /**
   * Run the real thing: ffgac encodes an MPEG-4 stream with +forcemv+nopimb
   * and keyframes where the curve dips, and the result plays beside the
   * preview. It is a different pipeline, not a higher-quality version of
   * this one, so the two are not expected to match pixel for pixel.
   */
  const renderReal = async () => {
    setRealBusy(true);
    setRealMsg("encoding with ffgac…");
    try {
      const r = await fetch("/api/render-real", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ config: resolved(), frames: data?.frames ?? 300 }),
      });
      const j = await r.json();
      if (!r.ok) { setRealMsg(`failed: ${j.error ?? r.status}`); return; }
      setRealUrl(j.video);
      setRealMsg(`rendered in ${Number(j.seconds).toFixed(1)}s`);
    } catch (e) {
      setRealMsg(`failed: ${(e as Error).message}`);
    } finally {
      setRealBusy(false);
    }
  };

  const exportConfig = () => {
    const out = resolved();
    if (writable) { save("config", out); return; }
    const blob = new Blob([JSON.stringify(out, null, 2)],
      { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "composite.json";
    a.click();
    setStatus("downloaded composite.json (read-only deployment)");
    setTimeout(() => setStatus(""), 4000);
  };

  /* --------------------------------------------------- the render hook */
  useEffect(() => {
    if (!data || !envelope || !onsetDistance) return;
    (window as unknown as Record<string, unknown>).__tune = {
      ready: true,
      mode: renderMode ? "render" : "live",
      frames: data.frames, fps: data.fps, width: data.width, height: data.height,
      setConfig: (c: Partial<TuneConfig>) => {
        const merged = sanitizeConfig(c);
        overridden.current = true;
        cfgRef.current = merged;
        setCfg(merged);
        if (merged.macros) setMacros(merged.macros);
        if (merged.damageCurve?.length) setCurve(merged.damageCurve);
        setCurveOn(!!merged.curveEnabled);
        setCurveBlend(merged.curveBlend !== false);
      },
      getConfig: () => JSON.parse(JSON.stringify(cfgRef.current)),
      setMacros: (m: Macros) => {
        const c = resolveMacros(m, cfgRef.current);
        overridden.current = true;
        cfgRef.current = c;
        setMacros(m);
        setCfg(c);
      },
      resetBloom: () => rendRef.current?.resetBloom(),
      envelopeAt: (i: number) => ({
        env: envelope.env[i], shaped: envelope.shaped[i], onset: onsetDistance[i],
      }),
      renderWith: (i: number, a: ImageBitmap, b: ImageBitmap, c: ImageBitmap) => {
        const r = rendRef.current;
        if (!r) throw new Error("renderer not ready");
        r.setLayer("a", a); r.setLayer("b", b); r.setLayer("c", c);
        r.renderFrame(cfgRef.current, i, envelope.env[i], envelope.shaped[i],
          onsetDistance[i], 0);
        return r.lastCoverage;
      },
      coverage: () => rendRef.current?.lastCoverage ?? 0,
      debug: () => rendRef.current?.debug() ?? null,
      showInside: () => rendRef.current?.blitInside(),
      stretchStats: () => rendRef.current?.sims?.[0]?.stats() ?? null,
      damageSplit: () => rendRef.current?.lastSplit ?? null,
      foldState: () => {
        const r = rendRef.current;
        if (!r) return null;
        const f = r.lastFold;
        return f ? { ...f, center: f.center, spread: f.spread } : null;
      },
    };
  }, [data, envelope, onsetDistance, renderMode]);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__tuneDebug =
      () => rendRef.current?.debug() ?? null;
  }, []);

  /* ---------------------------------------------------------------- view */
  if (err) return <main className="mt-root"><p className="mt-err">{err}</p></main>;
  if (!data) {
    return <main className="mt-root"><p className="mt-err">loading&hellip;</p></main>;
  }

  return (
    <main className="mt-root">
      <header className="mt-bar">
        <strong>tune</strong>
        <button onClick={() => setPlaying((p) => !p)}>
          {playing ? "pause" : "play"}
        </button>
        <button onClick={() => setRate(rate === 1 ? 0.5 : 1)}>
          {rate === 1 ? "half speed" : "full speed"}
        </button>
        <button onClick={() => setLoopOn((v) => !v)} aria-pressed={loopOn}>
          loop {loopOn ? "on" : "off"}
        </button>
        <button onClick={() => setLoop([Math.round(frame), loop[1]])}>loop in</button>
        <button onClick={() => setLoop([loop[0], Math.round(frame)])}>loop out</button>
        <span className="mt-time">
          {(frame / data.fps).toFixed(2)}s &nbsp; showing through{" "}
          <b>{(coverage * 100).toFixed(1)}%</b>
        </span>
      </header>

      <div className="mt-stage">
        <div className="mt-pair">
          <figure>
            <canvas ref={canvasRef} className="mt-canvas" />
            <figcaption>preview &mdash; composited live in WebGL</figcaption>
          </figure>
          {realUrl && (
            <figure>
              <video className="mt-canvas" src={realUrl} controls loop muted
                     playsInline autoPlay />
              <figcaption>
                real &mdash; ffgac, +forcemv+nopimb, keyframes on the dips
              </figcaption>
            </figure>
          )}
        </div>
        {/* crossOrigin is not optional: the layers come from Blob, and
            texImage2D on a cross-origin video throws rather than degrading. */}
        <div className="mt-sources">
          <video ref={aRef} src={data.layers.a} crossOrigin="anonymous"
                 muted playsInline preload="auto" />
          <video ref={bRef} src={data.layers.b} crossOrigin="anonymous"
                 muted playsInline preload="auto" />
          <video ref={cRef} src={data.layers.c} crossOrigin="anonymous"
                 muted playsInline preload="auto" />
        </div>
      </div>

      <input className="mt-scrub" type="range" min={0} max={data.frames - 1}
             step={1} value={Math.round(frame)}
             onChange={(e) => {
               const f = Number(e.target.value);
               setFrame(f);
               seekAll(f / data.fps);
             }} />

      <section className="mt-simple">
        <div className="mt-look">
          <span className="mt-look-label">Inside look</span>
          {LOOKS.map((l) => (
            <button key={l.v} aria-pressed={macros.look === l.v} title={l.hint}
                    onClick={() => applyMacros({ ...macros, look: l.v })}>
              {l.label}
            </button>
          ))}
          <span className="mt-hint">
            {LOOKS.find((l) => l.v === macros.look)?.hint}
          </span>
        </div>
        {MACROS.map((m) => (
          <label key={m.key} className="mt-macro">
            <span className="mt-macro-name">{m.label}</span>
            <input type="range" min={0} max={1} step={0.01}
                   value={macros[m.key] as number}
                   onChange={(e) => applyMacros({
                     ...macros, [m.key]: Number(e.target.value),
                   } as Macros)} />
            <b>{Math.round((macros[m.key] as number) * 100)}</b>
            <span className="mt-hint">{m.hint}</span>
          </label>
        ))}
        <label className="mt-macro mt-gens">
          <span className="mt-macro-name">Generations</span>
          <input type="range" min={1} max={5} step={1}
                 value={Math.round(macros.generations ?? 1)}
                 onChange={(e) => applyMacros({
                   ...macros, generations: Number(e.target.value),
                 } as Macros)} />
          <b>{Math.round(macros.generations ?? 1)}</b>
          <span className="mt-hint">
            How many times the finished result is fed back in as the source
            and run again. 1 is the look as it stands and changes nothing.
            Above 1 the encoder meets the last pass&rsquo;s drag and grain as
            if it were footage and finds its own motion inside it, so the
            fold lands within the grain instead of beside it. Later passes
            keep less of the gain, so they add structure rather than noise.
            The still parts of the room stay still at any setting.
            Takes the real render, not the preview.
          </span>
        </label>
        <details className="mt-older">
          <summary>older dials &mdash; drips, stretches and opening shapes</summary>
          <p className="mt-hint">
            These drove the look this one replaces. They still work and they
            are still saved with a preset; they just do not describe what the
            base mosh does any more.
          </p>
          {OLDER_MACROS.map((m) => (
            <label key={m.key} className="mt-macro">
              <span className="mt-macro-name">{m.label}</span>
              <input type="range" min={0} max={1} step={0.01}
                     value={macros[m.key] as number}
                     onChange={(e) => applyMacros({
                       ...macros, [m.key]: Number(e.target.value),
                     } as Macros)} />
              <b>{Math.round((macros[m.key] as number) * 100)}</b>
              <span className="mt-hint">{m.hint}</span>
            </label>
          ))}
        </details>
      </section>

      <section className="mt-variations">
        <div className="mt-var-head">
          <button onClick={() => makeVariants(macros, spread)}>
            {variants.length ? "new variations" : "show me variations"}
          </button>
          <button disabled={!variants.length}
                  onClick={() => setSpread((s) => Math.max(0.04, s - 0.08))}>
            more similar
          </button>
          <button disabled={!variants.length}
                  onClick={() => setSpread((s) => Math.min(0.6, s + 0.08))}>
            more different
          </button>
          {variants.length > 0 && (
            <button onClick={() => setVariants([])}>close</button>
          )}
          <span className="mt-hint">
            spread {Math.round(spread * 100)}% &mdash; six live variations of
            the current look over a {PREVIEW_SECONDS}s loop. Click one to keep
            it and get six more around it.
          </span>
        </div>
        {variants.length > 0 && (
          <div className="mt-var-grid">
            {variants.map((v, k) => (
              <button key={k} className="mt-var" onClick={() => chooseVariant(k)}>
                <canvas ref={(el) => { tileRefs.current[k] = el; }} />
                <span>
                  dmg {Math.round(v.m.damage * 100)} &middot;
                  size {Math.round(v.m.squareSize * 100)} &middot;
                  alive {Math.round(v.m.alive * 100)} &middot;
                  drag {Math.round(v.m.drag * 100)}
                  {v.m.look === "crystal" ? " · crystal" : ""}
                </span>
              </button>
            ))}
          </div>
        )}
        {history.length > 0 && (
          <div className="mt-history">
            <span className="mt-hint">been here:</span>
            {history.map((h, k) => (
              <button key={k} className="mt-hist" onClick={() => goBack(k)}
                      title={`back to damage ${Math.round(h.m.damage * 100)}`}>
                {h.thumb
                  ? <img src={h.thumb} alt="" />
                  : <span>{Math.round(h.m.damage * 100)}</span>}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-curve">
        <div className="mt-curve-head">
          <strong>Damage over time</strong>
          <span className="mt-hint">
            Draw on the line to say how broken the picture should be at each
            moment. Yellow marks are the words. The dashed blue line is what
            the speech alone would ask for; the green line behind is what
            actually happened.
          </span>
        </div>
        <canvas ref={tlRef} className="mt-timeline"
                onPointerDown={(e) => {
                  drawing.current = true;
                  (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
                  paintCurve(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (drawing.current) paintCurve(e.clientX, e.clientY);
                }}
                onPointerUp={() => { drawing.current = false; }}
                onPointerCancel={() => { drawing.current = false; }} />
        <div className="mt-curve-foot">
          <button onClick={() => setCurveOn((v) => !v)} aria-pressed={curveOn}>
            {curveOn ? "using my line" : "using the words"}
          </button>
          <button onClick={() => setCurveBlend((v) => !v)} aria-pressed={curveBlend}
                  disabled={!curveOn}>
            {curveBlend ? "blended with words" : "my line only"}
          </button>
          <button onClick={() => {
            if (!wordEnv) return;
            setCurve(Array.from({ length: CURVE_SAMPLES }, (_, i) =>
              wordEnv.env[Math.round(i / (CURVE_SAMPLES - 1) * (data.frames - 1))] ?? 0));
          }}>trace the words</button>
          <button onClick={() => setCurve(new Array(CURVE_SAMPLES).fill(0.25))}>
            flatten
          </button>
        </div>
      </section>

      <section className="mt-presets">
        <input placeholder="name this look" value={presetName}
               onChange={(e) => setPresetName(e.target.value)} />
        <button disabled={!presetName} onClick={() => {
          const next = { ...presets, [presetName]: resolved() };
          setPresets(next);
          save("presets", next);
        }}>save</button>
        <select value="" onChange={(e) => {
          const p = presets[e.target.value];
          if (!p) return;
          const c = sanitizeConfig(p);
          setCfg(c);
          if (c.macros) setMacros(c.macros);
          if (c.damageCurve?.length) setCurve(c.damageCurve);
          setCurveOn(!!c.curveEnabled);
        }}>
          <option value="">load a saved look&hellip;</option>
          {Object.keys(presets).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <button onClick={() => applyMacros({
          damage: Math.random(), squareSize: Math.random(), alive: Math.random(),
          drag: Math.random(), inside: Math.random(), followsWords: Math.random(),
          foldIn: Math.random() < 0.5 ? 0 : Math.random(),
          loose: Math.random(), flow: Math.random(), together: Math.random(),
          look: Math.random() < 0.5 ? "current" : "crystal",
        })}>randomize all</button>
        <button onClick={() => {
          const b = clone(baseline.current);
          setCfg(b);
          setMacros(b.macros ?? DEFAULT_MACROS);
        }}>reset</button>
        <button onClick={exportConfig}>export settings</button>
        <button onClick={renderReal} disabled={!realOk || realBusy}
                title={realOk ? "run the ffgac pipeline on these settings"
                  : "needs ffgac, which only exists in development"}>
          {realBusy ? "rendering…" : "render real"}
        </button>
        {realMsg && <span className="mt-ok">{realMsg}</span>}
        <button onClick={() => setCfg((c) => ({
          ...clone(c), seed: Math.floor(Math.random() * 1e6),
        }))}>reroll ({cfg.seed})</button>
        {status && <span className="mt-ok">{status}</span>}
      </section>

      <details className="mt-adv">
        <summary>advanced &mdash; every individual parameter</summary>
        <p className="mt-hint">
          The dials above write into these. Changing one here keeps it until a
          dial that owns the same parameter moves.
        </p>
        <div className="mt-groups">
          {GROUPS.map((grp) => (
            <fieldset key={grp.name} className="mt-group">
              <legend>{grp.name}</legend>
              {grp.name === "squares" && (
                <label className="mt-sel">
                  <span>dissolve style</span>
                  <select value={cfg.squares.dissolve} onChange={(e) =>
                    setCfg((c) => {
                      const n = clone(c);
                      n.squares.dissolve = e.target.value as Dissolve;
                      return n;
                    })}>
                    <option value="stepped">stepped</option>
                    <option value="half-filled">half-filled</option>
                    <option value="broken-edges">broken edges</option>
                  </select>
                </label>
              )}
              {grp.name === "inside look" && (
                <label className="mt-sel">
                  <span>look</span>
                  <select value={cfg.inside.look} onChange={(e) =>
                    setCfg((c) => {
                      const n = clone(c);
                      n.inside.look = e.target.value as InsideLook;
                      return n;
                    })}>
                    <option value="current">current</option>
                    <option value="crystal">crystal</option>
                  </select>
                </label>
              )}
              {grp.name === "fold" && (
                <>
                  <label className="mt-sel">
                    <span>where</span>
                    <select value={cfg.fold.where} onChange={(e) =>
                      setCfg((c) => {
                        const n = clone(c);
                        n.fold.where = e.target.value as FoldWhere;
                        return n;
                      })}>
                      <option value="reveal-edges">reveal edges</option>
                      <option value="inside-reveals">inside reveals</option>
                      <option value="whole-frame">whole frame</option>
                    </select>
                  </label>
                  <label className="mt-sel">
                    <span>centre on</span>
                    <select value={cfg.fold.center} onChange={(e) =>
                      setCfg((c) => {
                        const n = clone(c);
                        n.fold.center = e.target.value as FoldCenter;
                        return n;
                      })}>
                      <option value="damage">centroid of the damage</option>
                      <option value="motion">strongest motion</option>
                      <option value="face">face (skin chroma)</option>
                      <option value="frame">frame centre</option>
                    </select>
                  </label>
                  <label className="mt-sel">
                    <span>c path</span>
                    <select value={cfg.fold.cPath} onChange={(e) =>
                      setCfg((c) => {
                        const n = clone(c);
                        n.fold.cPath = e.target.value as CPath;
                        return n;
                      })}>
                      <option value="circle">circle</option>
                      <option value="cardioid">cardioid edge</option>
                      <option value="lissajous">lissajous</option>
                      <option value="spiral">spiral</option>
                    </select>
                  </label>
                </>
              )}
              {grp.specs.map((sp) => {
                const v = (cfg as unknown as
                  Record<string, Record<string, number>>)[grp.path as string][sp.key];
                return (
                  <label key={sp.key} className="mt-slider">
                    <span>{sp.label}</span>
                    <input type="range" min={sp.min} max={sp.max} step={sp.step}
                           value={v}
                           onChange={(e) => setIn(grp.path as string, sp.key,
                             Number(e.target.value))} />
                    <b>{sp.step >= 1 ? v : v.toFixed(2)}</b>
                  </label>
                );
              })}
            </fieldset>
          ))}
        </div>
      </details>

      <p className="mt-note">
        The mask is stateless, so a moment looks the same whether you played to
        it or jumped there. The bloom and the drag are feedback buffers and
        genuinely path dependent, so a jump reconverges over their own decay
        rather than matching instantly. Layer B&rsquo;s P-frame dup interval is
        baked into the B video, so that control records intent for the offline
        render and does not change the preview.
      </p>
    </main>
  );
}
