"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { MoshRenderer, type FrameParams, type StampMode } from "./MoshRenderer";
import "./mosh-lab.css";

const DEFAULT_SRC = "/mosh-lab/test-clip.mp4";
const DPR_CAP = 1.5;

/** rVFC is widely but not universally available, so it is probed at runtime. */
type MaybeVfc = {
  requestVideoFrameCallback?: (cb: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

export interface MoshStats {
  fps: number;
  frameMs: number;
  gpuMs: number;
  frames: number;
  width: number;
  height: number;
  dpr: number;
}

export default function MoshLab() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rendererRef = useRef<MoshRenderer | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const frameRef = useRef(0);
  const startRef = useRef(0);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [floatMsg, setFloatMsg] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [stats, setStats] = useState<MoshStats>({
    fps: 0, frameMs: 0, gpuMs: 0, frames: 0, width: 0, height: 0, dpr: 1,
  });

  const [intensity, setIntensity] = useState(0.66);
  const [stampMode, setStampMode] = useState<StampMode>("faces");
  const [refresh, setRefresh] = useState(8);
  const [freeze, setFreeze] = useState(false);
  const [camSpeed, setCamSpeed] = useState(1);
  const [scale, setScale] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [srcLabel, setSrcLabel] = useState("test clip");

  // live values for the rAF loop, so it never re-subscribes
  const params = useRef<FrameParams>({
    time: 0, frame: 0, intensity: 0.66, stampMode: "faces", refresh: 8,
    freeze: false, camSpeed: 1, scale: 1, forceOverride: false,
  });
  useEffect(() => {
    params.current.intensity = intensity;
    params.current.stampMode = stampMode;
    params.current.refresh = refresh;
    params.current.freeze = freeze;
    params.current.camSpeed = camSpeed;
    params.current.scale = scale;
  }, [intensity, stampMode, refresh, freeze, camSpeed, scale]);

  const setForce = useCallback((on: boolean) => {
    params.current.forceOverride = on;
  }, []);

  // ---------------------------------------------------------------- setup
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    // State set from here is deferred to a microtask: setting it synchronously
    // in an effect body triggers cascading renders (react-hooks lint).
    let renderer: MoshRenderer;
    try {
      renderer = new MoshRenderer(canvas);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      queueMicrotask(() => setError(msg));
      return;
    }
    rendererRef.current = renderer;
    renderer.setVideo(video);
    if (!renderer.float.rgba32f) {
      const msg = renderer.float.message;
      queueMicrotask(() => setFloatMsg(msg));
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (w < 1 || h < 1) return;
      canvas.width = w;
      canvas.height = h;
      renderer.resize(w, h);
      frameRef.current = 0;          // buffers hold resolution-tied coords
      renderer.reset();
      queueMicrotask(() => setStats((s) => ({ ...s, width: w, height: h, dpr })));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ---- driving the clock from the video keeps every layer in sync
    let rafId = 0;
    let vfcId = 0;
    let alive = true;
    let fpsCount = 0;
    let fpsT0 = performance.now();
    startRef.current = fpsT0;

    const draw = () => {
      if (!alive) return;
      const now = performance.now();

      const p = params.current;
      p.time = video.currentTime || (now - startRef.current) / 1000;
      p.frame = frameRef.current++;
      renderer.renderFrame(p);

      // Publishing state once per window instead of per frame: a setState on
      // every frame forced a React render per frame and dominated the budget.
      fpsCount += 1;
      const elapsed = now - fpsT0;
      if (elapsed >= 500) {
        const fps = (fpsCount * 1000) / elapsed;
        const cpuMs = renderer.lastFrameMs;
        const gpuMs = renderer.lastGpuMs;
        const n = frameRef.current;
        const t = video.currentTime;
        fpsCount = 0;
        fpsT0 = now;
        setStats((s) => ({
          ...s,
          fps: Math.round(fps),
          frameMs: Math.round(cpuMs * 100) / 100,
          gpuMs: Math.round(gpuMs * 100) / 100,
          frames: n,
        }));
        setCurrent(t);
      }
    };

    const vv = video as unknown as MaybeVfc;
    const useVfc = typeof vv.requestVideoFrameCallback === "function";
    const loopRaf = () => { draw(); rafId = requestAnimationFrame(loopRaf); };
    const loopVfc = () => {
      draw();
      vfcId = vv.requestVideoFrameCallback!(loopVfc);
    };
    if (useVfc) loopVfc(); else rafId = requestAnimationFrame(loopRaf);
    // a paused video stops firing rVFC, so keep a rAF heartbeat as well
    const heartbeat = useVfc
      ? window.setInterval(() => { if (video.paused) draw(); }, 1000 / 30)
      : 0;

    // Measurement hook. rAF and media are throttled whenever the tab is not
    // visible, so a benchmark that drives renderFrame directly is the only way
    // to get a shader cost that is not really a scheduling measurement.
    const w = window as unknown as Record<string, unknown>;
    w.__mosh = {
      renderer,
      video,
      bench: (frames = 120, opts: Partial<FrameParams> = {}) =>
        renderer.benchmark(frames, { ...params.current, ...opts }),
    };

    queueMicrotask(() => setReady(true));
    return () => {
      delete w.__mosh;
      alive = false;
      cancelAnimationFrame(rafId);
      if (vfcId && vv.cancelVideoFrameCallback) vv.cancelVideoFrameCallback(vfcId);
      if (heartbeat) clearInterval(heartbeat);
      ro.disconnect();
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  // ---------------------------------------------------------------- source
  const loadSrc = useCallback((src: string, label: string) => {
    const v = videoRef.current;
    if (!v) return;
    v.src = src;
    v.load();
    setSrcLabel(label);
    frameRef.current = 0;
    rendererRef.current?.reset();
    void v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const src = qs.get("src");
    loadSrc(src || DEFAULT_SRC, src ? src : "test clip");
  }, [loadSrc]);

  const onFile = useCallback((file: File) => {
    loadSrc(URL.createObjectURL(file), file.name);
  }, [loadSrc]);

  useEffect(() => {
    const stop = (e: DragEvent) => { e.preventDefault(); };
    const drop = (e: DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer?.files?.[0];
      if (f && f.type.startsWith("video/")) onFile(f);
    };
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", drop);
    };
  }, [onFile]);

  // ---------------------------------------------------------------- keys
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.code === "Space") { e.preventDefault(); setForce(true); }
      if (e.key === "f" || e.key === "F") setFreeze((v) => !v);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setForce(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [setForce]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { void v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const layerName = intensity < 1 / 6 ? "raw video"
    : intensity < 1 / 2 ? "raw -> live faces"
      : intensity < 5 / 6 ? "live faces -> shader mosh"
        : "shader mosh -> ffmpeg mosh";

  return (
    <main className="ml-root">
      <canvas ref={canvasRef} className="ml-canvas" />
      <video
        ref={videoRef}
        className="ml-video"
        muted
        playsInline
        loop
        crossOrigin="anonymous"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
      />

      {error && <div className="ml-banner ml-error">{error}</div>}
      {floatMsg && <div className="ml-banner ml-warn">{floatMsg}</div>}

      <button
        className="ml-toggle"
        onClick={() => setPanelOpen((v) => !v)}
        aria-expanded={panelOpen}
      >
        {panelOpen ? "hide" : "controls"}
      </button>

      <section className={`ml-panel${panelOpen ? "" : " ml-panel-closed"}`}>
        <div className="ml-stats">
          <span>{stats.fps} fps</span>
          <span>cpu {stats.frameMs.toFixed(2)}ms</span>
          <span>gpu {stats.gpuMs > 0 ? `${stats.gpuMs.toFixed(2)}ms` : "n/a"}</span>
          <span>{stats.width}&times;{stats.height} @{stats.dpr.toFixed(2)}x</span>
          <span>{ready ? "ready" : "init"}</span>
        </div>

        <label className="ml-row">
          <span>intensity <b>{intensity.toFixed(2)}</b></span>
          <input type="range" min={0} max={1} step={0.01} value={intensity}
            onChange={(e) => setIntensity(parseFloat(e.target.value))} />
          <small>{layerName}</small>
        </label>

        <div className="ml-row ml-inline">
          <button onClick={() => setStampMode(stampMode === "faces" ? "screen" : "faces")}>
            mode: {stampMode}
          </button>
          <button
            onPointerDown={() => setForce(true)}
            onPointerUp={() => setForce(false)}
            onPointerLeave={() => setForce(false)}
          >hold to refresh</button>
          <button onClick={() => setFreeze((v) => !v)} aria-pressed={freeze}>
            freeze ref: {freeze ? "on" : "off"}
          </button>
        </div>

        <label className="ml-row">
          <span>refresh every <b>{refresh}</b> frames</span>
          <input type="range" min={1} max={60} step={1} value={refresh}
            onChange={(e) => setRefresh(parseInt(e.target.value, 10))} />
        </label>

        <label className="ml-row">
          <span>camera speed <b>{camSpeed.toFixed(2)}</b></span>
          <input type="range" min={0} max={3} step={0.01} value={camSpeed}
            onChange={(e) => setCamSpeed(parseFloat(e.target.value))} />
        </label>

        <label className="ml-row">
          <span>face scale <b>{scale.toFixed(2)}</b></span>
          <input type="range" min={0.25} max={6} step={0.05} value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))} />
        </label>

        <div className="ml-row ml-inline">
          <button onClick={togglePlay}>{playing ? "pause" : "play"}</button>
          <input type="range" className="ml-scrub" min={0} max={Math.max(duration, 0.01)}
            step={0.01} value={Math.min(current, duration || 0)}
            onChange={(e) => {
              const v = videoRef.current;
              if (v) v.currentTime = parseFloat(e.target.value);
            }} />
          <small>{current.toFixed(1)}/{duration.toFixed(1)}s</small>
        </div>

        <div className="ml-row ml-inline">
          <button type="button" onClick={() => fileRef.current?.click()}>
            load video
          </button>
          <input ref={fileRef} type="file" accept="video/*" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
          <small className="ml-src">{srcLabel}</small>
        </div>
        <p className="ml-hint">drop a video anywhere &middot; space = refresh &middot; F = freeze</p>
      </section>
    </main>
  );
}
