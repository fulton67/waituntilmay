"use client";
/**
 * /mosh-lab/tune - the live tuning lab for the A x B composite.
 *
 * A, B and C play as three muted <video> elements on one master clock, the
 * same arrangement the compare page uses, and every frame is composited in
 * WebGL by TuneRenderer. Nothing here is pre-rendered: move a slider and the
 * next frame already has it, because the mask is computed from scratch per
 * frame rather than looked up.
 *
 * A render-mode hook (?render=1) exposes window.__tune so the offline
 * renderer can drive the exact same programs with frames it supplies itself.
 * That is the whole parity story: there is one implementation.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULTS, followEnvelope, TuneRenderer, type Dissolve, type TuneConfig,
} from "./TuneRenderer";
import "./mosh-tune.css";

const DATA = "/mosh-lab/blum-internet-tune.json";

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

const clone = (c: TuneConfig): TuneConfig => JSON.parse(JSON.stringify(c));

/* ----------------------------------------------------------- the controls */
type Spec = { key: string; label: string; min: number; max: number; step: number };

const GROUPS: { name: string; path: keyof TuneConfig | "seed"; specs: Spec[] }[] = [
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
    name: "bloom", path: "bloom", specs: [
      { key: "lead", label: "lead (frames)", min: 0, max: 30, step: 1 },
      { key: "strength", label: "strength", min: 0, max: 1, step: 0.01 },
      { key: "decay", label: "decay", min: 0, max: 0.995, step: 0.005 },
      { key: "scale", label: "mv scale", min: 0, max: 2, step: 0.01 },
      { key: "mix", label: "mix into B", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    name: "flash / attack", path: "flash", specs: [
      { key: "amount", label: "amount", min: 0, max: 1, step: 0.01 },
      { key: "duration", label: "duration (frames)", min: 1, max: 30, step: 1 },
      { key: "frequency", label: "per 100 frames", min: 0, max: 40, step: 0.5 },
      { key: "randomness", label: "randomness", min: 0, max: 1, step: 0.01 },
      { key: "brightness", label: "brightness spike", min: 0, max: 1, step: 0.01 },
      { key: "invert", label: "inversion", min: 0, max: 1, step: 0.01 },
      { key: "chroma", label: "chroma split (px)", min: 0, max: 12, step: 0.1 },
      { key: "hold", label: "hold / stutter", min: 0, max: 1, step: 0.01 },
      { key: "concept", label: "on concept words", min: 0, max: 1, step: 0.01 },
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

export default function MoshTune() {
  const [data, setData] = useState<TuneData | null>(null);
  const [cfg, setCfg] = useState<TuneConfig>(DEFAULTS);
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

  // In render mode the offline renderer owns the canvas: it hands over its
  // own frames and reads the result back. The live rAF loop must not run,
  // because it would redraw the canvas from the <video> elements between the
  // render call and the read, and the capture would silently be a different
  // frame. That failure is intermittent and looks like a parity problem.
  const renderMode = useMemo(
    () => typeof location !== "undefined"
      && new URLSearchParams(location.search).has("render"), []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const aRef = useRef<HTMLVideoElement | null>(null);
  const bRef = useRef<HTMLVideoElement | null>(null);
  const cRef = useRef<HTMLVideoElement | null>(null);
  const tlRef = useRef<HTMLCanvasElement | null>(null);
  const rendRef = useRef<TuneRenderer | null>(null);
  const cfgRef = useRef(cfg);
  const frameRef = useRef(0);
  const baseline = useRef<TuneConfig>(DEFAULTS);
  // Set once an external caller has pushed a config in through window.__tune.
  // The page also loads config/composite.json on mount, and that fetch can
  // land AFTER the caller's setConfig and quietly overwrite it - which makes
  // every offline render and every parity capture silently use the file on
  // disk instead of the config it was handed.
  const overridden = useRef(false);
  cfgRef.current = cfg;

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
          const merged = { ...DEFAULTS, ...s.config } as TuneConfig;
          baseline.current = clone(merged);
          if (!overridden.current) setCfg(merged);
        }
      } catch { /* the lab still works with its built-in defaults */ }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!canvasRef.current || rendRef.current) return;
    try {
      rendRef.current = new TuneRenderer(canvasRef.current);
      if (data) rendRef.current.setSize(data.width, data.height, data.mb);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    }
  }, [data]);

  /* ------------------------------------------------------- the envelope */
  const envelope = useMemo(() => {
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
    r.renderFrame(cfgRef.current, i, envelope.env[i], envelope.shaped[i],
      onsetDistance[i]);
    setCoverage(r.lastCoverage);
  }, [data, envelope, onsetDistance]);

  /* ------------------------------------------------- the transport clock */
  useEffect(() => {
    if (!data || renderMode) return;
    const a = aRef.current, b = bRef.current, c = cRef.current;
    if (!a || !b || !c) return;
    for (const v of [a, b, c]) {
      v.playbackRate = rate;
      v.muted = true;
    }
    b.playbackRate = rate * cfg.b.speed;
    if (playing) { a.play().catch(() => {}); b.play().catch(() => {}); c.play().catch(() => {}); }
    else { a.pause(); b.pause(); c.pause(); }
  }, [playing, rate, data, cfg.b.speed, renderMode]);

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
        frameRef.current = f;
        setFrame(f);
        drawFrame(f);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, drawFrame, loopOn, loop, renderMode]);

  const seekAll = useCallback((t: number) => {
    for (const r of [aRef, bRef, cRef]) {
      const v = r.current;
      if (v) v.currentTime = t;
    }
    rendRef.current?.resetBloom();
  }, []);

  /* ------------------------------------------------------------ timeline */
  // coverage is sampled as it plays, so the timeline shows what really
  // happened rather than what the envelope asked for
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

  useEffect(() => {
    const cv = tlRef.current, d = data;
    if (!cv || !d || !envelope) return;
    const W = cv.clientWidth, H = 128;
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

    // words, with the concept vocabulary picked out
    g.font = "9px ui-monospace, monospace";
    const concept = new Set(d.conceptWords);
    for (const w of d.words) {
      const isC = concept.has(w.stem);
      g.fillStyle = isC ? "#ffd200" : "#3a3a3a";
      g.fillRect(x(w.f0), 2, Math.max(1, x(w.f1) - x(w.f0)), 7);
      if (isC) {
        g.fillStyle = "#ffd200";
        g.fillText(w.w, Math.min(W - 42, x(w.f0)), 20);
      }
    }
    // concept markers, full height
    for (const h of d.conceptHits) {
      g.strokeStyle = "rgba(255,210,0,0.55)";
      g.beginPath(); g.moveTo(x(h.frame), 0); g.lineTo(x(h.frame), H); g.stroke();
    }
    // triggers
    for (const t of d.triggers) {
      g.strokeStyle = "rgba(255,90,90,0.8)";
      g.beginPath(); g.moveTo(x(t), 24); g.lineTo(x(t), H); g.stroke();
    }

    const plot = (arr: ArrayLike<number>, col: string, y0: number, hh: number,
                  scale = 1) => {
      g.strokeStyle = col; g.lineWidth = 1; g.beginPath();
      for (let f = 0; f < d.frames; f++) {
        const v = Math.min(1, (arr[f] ?? 0) * scale);
        const px = x(f), py = y0 + hh - v * hh;
        if (f === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.stroke();
    };
    // envelope, and the live coverage history
    plot(envelope.env, "#4aa3ff", 26, 46);
    plot(covHist.current, "#5bd75b", 74, 46, 1 / Math.max(cfg.reveals.peak, 0.05));

    // playhead
    g.strokeStyle = "#fff";
    g.beginPath(); g.moveTo(x(frame), 0); g.lineTo(x(frame), H); g.stroke();

    g.fillStyle = "#4aa3ff"; g.fillText("envelope", 4, 36);
    g.fillStyle = "#5bd75b";
    g.fillText(`coverage (full = ${(cfg.reveals.peak * 100).toFixed(0)}%)`, 4, 84);
  }, [data, envelope, frame, loopOn, loop, cfg.reveals.peak]);

  /* ------------------------------------------------------------- setters */
  const setIn = (group: string, key: string, v: number) =>
    setCfg((c) => {
      const n = clone(c);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (n as any)[group][key] = v;
      return n;
    });

  const randomizeAll = () => setCfg((c) => {
    const n = clone(c);
    const rnd = (s: Spec) => {
      const v = s.min + Math.random() * (s.max - s.min);
      return s.step >= 1 ? Math.round(v) : Math.round(v / s.step) * s.step;
    };
    for (const grp of GROUPS) {
      if (grp.path === "seed") continue;
      for (const s of grp.specs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (n as any)[grp.path][s.key] = rnd(s);
      }
    }
    n.squares.lifeMax = Math.max(n.squares.lifeMax, n.squares.lifeMin + 1);
    const styles: Dissolve[] = ["stepped", "half-filled", "broken-edges"];
    n.squares.dissolve = styles[Math.floor(Math.random() * 3)];
    n.seed = Math.floor(Math.random() * 1e6);
    return n;
  });

  const save = async (what: "config" | "presets", payload: unknown) => {
    try {
      const r = await fetch("/api/tune", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ what, [what]: payload }),
      });
      const j = await r.json();
      setStatus(r.ok ? `wrote ${j.wrote}` : `failed: ${j.error}`);
    } catch (e) {
      setStatus(`failed: ${(e as Error).message}`);
    }
    setTimeout(() => setStatus(""), 4000);
  };

  const exportConfig = () => {
    if (writable) { save("config", cfg); return; }
    // on the deployed page there is nothing to write to, so hand over a file
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
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
    const render = renderMode;
    // Installed in live mode too, not just render mode: the parity check has
    // to set the same config on the preview it is capturing, and reading the
    // envelope from the page is the only way to be sure both sides used it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__tune = {
      ready: true,
      mode: render ? "render" : "live",
      frames: data.frames, fps: data.fps, width: data.width, height: data.height,
      setConfig: (c: Partial<TuneConfig>) => {
        const merged = { ...DEFAULTS, ...c } as TuneConfig;
        overridden.current = true;
        cfgRef.current = merged;
        setCfg(merged);
      },
      // so a caller can assert the config it pushed is the one in effect
      getConfig: () => JSON.parse(JSON.stringify(cfgRef.current)),
      resetBloom: () => rendRef.current?.resetBloom(),
      envelopeAt: (i: number) => ({
        env: envelope.env[i], shaped: envelope.shaped[i],
        onset: onsetDistance[i],
      }),
      /** Composite one frame from bitmaps the caller decoded itself. */
      renderWith: (i: number, a: ImageBitmap, b: ImageBitmap, c: ImageBitmap) => {
        const r = rendRef.current;
        if (!r) throw new Error("renderer not ready");
        r.setLayer("a", a); r.setLayer("b", b); r.setLayer("c", c);
        r.renderFrame(cfgRef.current, i, envelope.env[i], envelope.shaped[i],
          onsetDistance[i]);
        return r.lastCoverage;
      },
      coverage: () => rendRef.current?.lastCoverage ?? 0,
      debug: () => rendRef.current?.debug() ?? null,
    };
  }, [data, envelope, onsetDistance, renderMode]);

  // a debug handle that is always present: the panels above are derived
  // numbers, and there has to be a way to check them against the pixels
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__tuneDebug = () => rendRef.current?.debug() ?? null;
  }, []);

  /* ---------------------------------------------------------------- view */
  if (err) return <main className="mt-root"><p className="mt-err">{err}</p></main>;
  if (!data) return <main className="mt-root"><p className="mt-err">loading&hellip;</p></main>;

  return (
    <main className="mt-root">
      <header className="mt-bar">
        <strong>tune</strong>
        <span className="mt-dim">{data.name}</span>
        <button onClick={() => setPlaying((p) => !p)}>{playing ? "pause" : "play"}</button>
        <button onClick={() => { setRate(rate === 1 ? 0.5 : 1); }}>
          {rate === 1 ? "0.5x" : "1x"}
        </button>
        <button onClick={() => setLoopOn((v) => !v)} aria-pressed={loopOn}>
          loop {loopOn ? "on" : "off"}
        </button>
        <button onClick={() => setLoop([Math.round(frame), loop[1]])}>loop in</button>
        <button onClick={() => setLoop([loop[0], Math.round(frame)])}>loop out</button>
        <span className="mt-time">
          f {Math.round(frame)}/{data.frames - 1} &nbsp;
          {(frame / data.fps).toFixed(2)}s &nbsp;
          cov <b>{(coverage * 100).toFixed(2)}%</b>
        </span>
      </header>

      <div className="mt-stage">
        <canvas ref={canvasRef} className="mt-canvas" />
        {/* crossOrigin is not optional: the layers are served from Blob, and
            texImage2D from a cross-origin video throws rather than degrading,
            which takes the whole composite down. Blob answers with
            Access-Control-Allow-Origin: *, so the request is honoured and the
            canvas stays untainted - which toDataURL also needs. */}
        <div className="mt-sources">
          <video ref={aRef} src={data.layers.a} crossOrigin="anonymous"
                 muted playsInline preload="auto" />
          <video ref={bRef} src={data.layers.b} crossOrigin="anonymous"
                 muted playsInline preload="auto" />
          <video ref={cRef} src={data.layers.c} crossOrigin="anonymous"
                 muted playsInline preload="auto" />
        </div>
      </div>

      <input
        className="mt-scrub" type="range" min={0} max={data.frames - 1} step={1}
        value={Math.round(frame)}
        onChange={(e) => {
          const f = Number(e.target.value);
          setFrame(f);
          seekAll(f / data.fps);
        }}
      />
      <canvas ref={tlRef} className="mt-timeline" />

      <section className="mt-presets">
        <input placeholder="preset name" value={presetName}
               onChange={(e) => setPresetName(e.target.value)} />
        <button disabled={!presetName} onClick={() => {
          const next = { ...presets, [presetName]: clone(cfg) };
          setPresets(next); save("presets", next);
        }}>save preset</button>
        <select value="" onChange={(e) => {
          const p = presets[e.target.value];
          if (p) setCfg({ ...DEFAULTS, ...p });
        }}>
          <option value="">load preset&hellip;</option>
          {Object.keys(presets).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <button onClick={randomizeAll}>randomize all</button>
        <button onClick={() => setCfg(clone(baseline.current))}>reset to current</button>
        <button onClick={exportConfig}>export settings</button>
        <button onClick={() => setCfg((c) => ({ ...clone(c), seed: Math.floor(Math.random() * 1e6) }))}>
          reroll seed ({cfg.seed})
        </button>
        {status && <span className="mt-ok">{status}</span>}
      </section>

      <section className="mt-groups">
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
            {grp.specs.map((s) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const v = (cfg as any)[grp.path][s.key] as number;
              return (
                <label key={s.key} className="mt-slider">
                  <span>{s.label}</span>
                  <input type="range" min={s.min} max={s.max} step={s.step}
                         value={v}
                         onChange={(e) => setIn(grp.path as string, s.key,
                           Number(e.target.value))} />
                  <b>{s.step >= 1 ? v : v.toFixed(2)}</b>
                </label>
              );
            })}
          </fieldset>
        ))}
      </section>

      <p className="mt-note">
        The mask is stateless: every block&rsquo;s cycle is a hash of its own
        coordinate, so frame 240 looks the same whether you played to it or
        jumped to it. The bloom is a feedback buffer and genuinely path
        dependent, so a scrub reconverges over its decay time rather than
        matching instantly &mdash; that is why the parity check reports it
        separately. Layer B&rsquo;s P-frame dup interval is baked into the B
        video, so changing it here records the intent for the offline render
        and does not alter the preview.
      </p>
    </main>
  );
}
