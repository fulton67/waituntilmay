"use client";

import { useRef, useState, useCallback, useEffect } from "react";

// --- Types ---
type Effect = "datamosh" | "ghost" | "blocks" | "drift";

interface Preset {
  name: string;
  tip: string;
  effect: Effect;
  iFrameInterval: number;
  threshold: number;
  blend: number;
  blockSize: number;
  drift: number;
}

const PRESETS: Preset[] = [
  { name: "datamosh",  tip: "classic — old content bleeds through new motion",        effect: "datamosh", iFrameInterval: 60,  threshold: 18,  blend: 0.92, blockSize: 16, drift: 0 },
  { name: "smear",     tip: "high persistence — motion trails accumulate",            effect: "ghost",    iFrameInterval: 120, threshold: 10,  blend: 0.96, blockSize: 16, drift: 0 },
  { name: "blocks",    tip: "macroblock corruption — chunks from ghost frame",        effect: "blocks",   iFrameInterval: 45,  threshold: 20,  blend: 0.88, blockSize: 32, drift: 0 },
  { name: "drift",     tip: "ghost slowly shifts — displaced phantom image",          effect: "drift",    iFrameInterval: 90,  threshold: 14,  blend: 0.94, blockSize: 16, drift: 3 },
  { name: "stutter",   tip: "frequent keyframes — fragmented, glitchy refresh",      effect: "datamosh", iFrameInterval: 12,  threshold: 25,  blend: 0.80, blockSize: 16, drift: 0 },
  { name: "melt",      tip: "minimal threshold — almost everything is ghost",        effect: "datamosh", iFrameInterval: 80,  threshold: 5,   blend: 0.97, blockSize: 16, drift: 2 },
];

// Datamosh: in high-motion regions keep ghost pixels; in static regions update normally
function applyDatamosh(
  current: Uint8ClampedArray,
  ghost: Uint8ClampedArray,
  out: Uint8ClampedArray,
  w: number, h: number,
  threshold: number,
  blend: number
) {
  for (let i = 0; i < w * h * 4; i += 4) {
    const dr = current[i]     - ghost[i];
    const dg = current[i + 1] - ghost[i + 1];
    const db = current[i + 2] - ghost[i + 2];
    const motion = (Math.abs(dr) + Math.abs(dg) + Math.abs(db)) / 3;

    if (motion > threshold) {
      // Motion area: ghost bleeds through (datamosh core)
      out[i]     = ghost[i]     * blend + current[i]     * (1 - blend);
      out[i + 1] = ghost[i + 1] * blend + current[i + 1] * (1 - blend);
      out[i + 2] = ghost[i + 2] * blend + current[i + 2] * (1 - blend);
    } else {
      // Static area: normal update
      out[i]     = current[i];
      out[i + 1] = current[i + 1];
      out[i + 2] = current[i + 2];
    }
    out[i + 3] = 255;
  }
}

// Ghost: blend entire frame with ghost — classic smear/trail
function applyGhost(
  current: Uint8ClampedArray,
  ghost: Uint8ClampedArray,
  out: Uint8ClampedArray,
  len: number,
  blend: number
) {
  for (let i = 0; i < len; i += 4) {
    out[i]     = ghost[i]     * blend + current[i]     * (1 - blend);
    out[i + 1] = ghost[i + 1] * blend + current[i + 1] * (1 - blend);
    out[i + 2] = ghost[i + 2] * blend + current[i + 2] * (1 - blend);
    out[i + 3] = 255;
  }
}

// Blocks: take whole macroblocks from ghost where block motion exceeds threshold
function applyBlocks(
  current: Uint8ClampedArray,
  ghost: Uint8ClampedArray,
  out: Uint8ClampedArray,
  w: number, h: number,
  threshold: number,
  blockSize: number
) {
  for (let by = 0; by < h; by += blockSize) {
    for (let bx = 0; bx < w; bx += blockSize) {
      // Average motion across block
      let totalMotion = 0;
      let count = 0;
      const bw = Math.min(blockSize, w - bx);
      const bh = Math.min(blockSize, h - by);
      for (let dy = 0; dy < bh; dy++) {
        for (let dx = 0; dx < bw; dx++) {
          const i = ((by + dy) * w + (bx + dx)) * 4;
          const dr = current[i]     - ghost[i];
          const dg = current[i + 1] - ghost[i + 1];
          const db = current[i + 2] - ghost[i + 2];
          totalMotion += (Math.abs(dr) + Math.abs(dg) + Math.abs(db)) / 3;
          count++;
        }
      }
      const avgMotion = totalMotion / count;
      const useGhost  = avgMotion > threshold;

      for (let dy = 0; dy < bh; dy++) {
        for (let dx = 0; dx < bw; dx++) {
          const i = ((by + dy) * w + (bx + dx)) * 4;
          out[i]     = useGhost ? ghost[i]     : current[i];
          out[i + 1] = useGhost ? ghost[i + 1] : current[i + 1];
          out[i + 2] = useGhost ? ghost[i + 2] : current[i + 2];
          out[i + 3] = 255;
        }
      }
    }
  }
}

export default function DatamoshPage() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const ghostRef     = useRef<HTMLCanvasElement>(null);
  const tempRef      = useRef<HTMLCanvasElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rafRef       = useRef<number>(0);
  const recorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const frameCountRef = useRef(0);

  const [videoUrl, setVideoUrl]   = useState<string | null>(null);
  const [dragging, setDragging]   = useState(false);
  const [playing, setPlaying]     = useState(false);
  const [recording, setRecording] = useState(false);
  const [canRecord, setCanRecord] = useState(false);

  const [effect, setEffect]               = useState<Effect>("datamosh");
  const [iFrameInterval, setIFrameInterval] = useState(60);
  const [threshold, setThreshold]         = useState(18);
  const [blend, setBlend]                 = useState(0.92);
  const [blockSize, setBlockSize]         = useState(16);
  const [drift, setDrift]                 = useState(0);

  // Refs for live access inside RAF loop
  const effectRef         = useRef(effect);
  const iFrameIntervalRef = useRef(iFrameInterval);
  const thresholdRef      = useRef(threshold);
  const blendRef          = useRef(blend);
  const blockSizeRef      = useRef(blockSize);
  const driftRef          = useRef(drift);

  useEffect(() => { effectRef.current         = effect;         }, [effect]);
  useEffect(() => { iFrameIntervalRef.current = iFrameInterval; }, [iFrameInterval]);
  useEffect(() => { thresholdRef.current      = threshold;      }, [threshold]);
  useEffect(() => { blendRef.current          = blend;          }, [blend]);
  useEffect(() => { blockSizeRef.current      = blockSize;      }, [blockSize]);
  useEffect(() => { driftRef.current          = drift;          }, [drift]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const renderFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    const ghost  = ghostRef.current;
    const temp   = tempRef.current;
    if (!video || !canvas || !ghost || !temp || video.paused || video.ended) {
      setPlaying(false);
      return;
    }

    const ctx  = canvas.getContext("2d");
    const gctx = ghost.getContext("2d");
    const tctx = temp.getContext("2d");
    if (!ctx || !gctx || !tctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Draw current video frame to temp
    tctx.drawImage(video, 0, 0, w, h);

    const isIFrame = frameCountRef.current % iFrameIntervalRef.current === 0;

    if (isIFrame) {
      // Keyframe: update ghost with current frame
      if (driftRef.current > 0) {
        gctx.drawImage(ghost, driftRef.current, driftRef.current, w - driftRef.current, h - driftRef.current, 0, 0, w, h);
        gctx.drawImage(video, 0, 0, w, h);
      } else {
        gctx.drawImage(video, 0, 0, w, h);
      }
      // On I-frame: output is clean current frame
      ctx.drawImage(temp, 0, 0);
    } else {
      const currentData = tctx.getImageData(0, 0, w, h);
      const ghostData   = gctx.getImageData(0, 0, w, h);
      const outData     = ctx.getImageData(0, 0, w, h);

      const cur  = currentData.data;
      const gh   = ghostData.data;
      const out  = outData.data;

      switch (effectRef.current) {
        case "datamosh":
          applyDatamosh(cur, gh, out, w, h, thresholdRef.current, blendRef.current);
          break;
        case "ghost":
          applyGhost(cur, gh, out, cur.length, blendRef.current);
          break;
        case "blocks":
          applyBlocks(cur, gh, out, w, h, thresholdRef.current, blockSizeRef.current);
          break;
        case "drift":
          applyDatamosh(cur, gh, out, w, h, thresholdRef.current, blendRef.current);
          break;
      }

      ctx.putImageData(outData, 0, 0);

      // Feed output back into ghost for next frame (accumulation)
      gctx.drawImage(canvas, 0, 0);
    }

    frameCountRef.current++;
    rafRef.current = requestAnimationFrame(renderFrame);
  }, []);

  const getDims = useCallback(() => {
    const video = videoRef.current;
    if (!video) return { w: 0, h: 0 };
    const maxW  = Math.min(video.videoWidth, window.innerWidth - 80);
    const scale = maxW / video.videoWidth;
    return { w: Math.round(video.videoWidth * scale), h: Math.round(video.videoHeight * scale) };
  }, []);

  const initCanvases = useCallback(() => {
    const { w, h } = getDims();
    if (!w || !h) return;
    [canvasRef, ghostRef, tempRef].forEach(r => {
      if (r.current) { r.current.width = w; r.current.height = h; }
    });
    // Seed ghost with first frame
    const gctx = ghostRef.current?.getContext("2d");
    if (gctx && videoRef.current) gctx.drawImage(videoRef.current, 0, 0, w, h);
  }, [getDims]);

  const startPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    initCanvases();
    frameCountRef.current = 0;
    video.currentTime = 0;
    video.play();
    setPlaying(true);
    stopLoop();
    rafRef.current = requestAnimationFrame(renderFrame);
  }, [initCanvases, renderFrame, stopLoop]);

  const stopPlayback = useCallback(() => {
    videoRef.current?.pause();
    stopLoop();
    setPlaying(false);
  }, [stopLoop]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnded = () => {
      stopLoop();
      setPlaying(false);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    };
    video.addEventListener("ended", onEnded);
    return () => video.removeEventListener("ended", onEnded);
  }, [stopLoop]);

  useEffect(() => {
    setCanRecord(typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("video/webm"));
  }, []);

  const startRecording = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canRecord) return;
    chunksRef.current = [];
    const stream   = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      setRecording(false);
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = "datamoshed.webm"; a.click();
      URL.revokeObjectURL(url);
    };
    recorder.start();
    setRecording(true);
    startPlayback();
  }, [canRecord, startPlayback]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    stopPlayback();
  }, [stopPlayback]);

  const loadFile = (file: File) => {
    if (!file.type.startsWith("video/")) return;
    stopPlayback();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(file));
    setPlaying(false);
    setRecording(false);
  };

  const applyPreset = (p: Preset) => {
    setEffect(p.effect);
    setIFrameInterval(p.iFrameInterval);
    setThreshold(p.threshold);
    setBlend(p.blend);
    setBlockSize(p.blockSize);
    setDrift(p.drift);
  };

  const label = (text: string) => (
    <span style={{ fontSize: "11px", opacity: 0.45, letterSpacing: "0.08em", textTransform: "uppercase" }}>{text}</span>
  );

  const slider = (value: number, min: number, max: number, onChange: (v: number) => void, display?: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: "#000" }} />
      <span style={{ fontSize: "12px", minWidth: 36, textAlign: "right", fontFamily: "Courier New" }}>
        {display ?? value}
      </span>
    </div>
  );

  const divider = <div style={{ borderTop: "1px solid #ebebeb", margin: "20px 0" }} />;

  return (
    <div style={{ padding: "clamp(24px, 5vw, 64px) clamp(20px, 5vw, 32px)", maxWidth: "860px", margin: "0 auto", fontFamily: "'Courier New', monospace" }}>

      {/* Hidden canvases */}
      <canvas ref={ghostRef} style={{ display: "none" }} />
      <canvas ref={tempRef}  style={{ display: "none" }} />

      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          playsInline
          style={{ display: "none" }}
          onLoadedMetadata={initCanvases}
        />
      )}

      <div style={{ marginBottom: 20 }}>
        <a href="/" style={{ fontSize: 12, opacity: 0.45 }}>← back</a>
      </div>

      <h1 style={{ fontSize: 13, marginBottom: 6, letterSpacing: "0.08em" }}>datamosh</h1>
      <p style={{ fontSize: 11, opacity: 0.35, marginBottom: 24, lineHeight: 1.6 }}>
        codec-level glitch — motion vectors bleed ghost frames through new content, simulating i-frame removal
      </p>

      {/* Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) loadFile(f); }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        style={{
          border: `1px solid ${dragging ? "#000" : "#ccc"}`,
          padding: "28px", textAlign: "center", cursor: "pointer",
          fontSize: 12, marginBottom: 24, userSelect: "none",
        }}
      >
        {videoUrl ? "click or drop to replace video" : "click or drop a video file"}
      </div>
      <input ref={fileInputRef} type="file" accept="video/*"
        onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); }}
        style={{ display: "none" }} />

      {videoUrl && (
        <>
          {/* Presets */}
          <div style={{ marginBottom: 20 }}>
            {label("presets")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {PRESETS.map(p => (
                <button key={p.name} onClick={() => applyPreset(p)} title={p.tip}
                  style={{ border: "1px solid #d0d0d0", background: "transparent",
                    padding: "4px 10px", fontSize: 11, cursor: "pointer", letterSpacing: "0.06em" }}>
                  {p.name}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10, opacity: 0.35, marginTop: 6 }}>hover for description</div>
          </div>

          {divider}

          {/* Effect mode */}
          <div style={{ marginBottom: 20 }}>
            {label("effect")}
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {([
                ["datamosh", "datamosh — ghost bleeds through motion"],
                ["ghost",    "ghost — whole frame persists"],
                ["blocks",   "blocks — macroblock corruption"],
                ["drift",    "drift — ghost shifts spatially"],
              ] as [Effect, string][]).map(([e, tip]) => (
                <button key={e} onClick={() => setEffect(e)} title={tip}
                  style={{
                    border: `1px solid ${effect === e ? "#000" : "#d0d0d0"}`,
                    background: effect === e ? "#000" : "transparent",
                    color: effect === e ? "#fff" : "#888",
                    padding: "4px 12px", fontSize: 11, cursor: "pointer", letterSpacing: "0.06em",
                  }}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          {divider}

          {/* I-frame interval */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>i-frame interval</div>
            <div style={{ fontSize: 10, opacity: 0.3, marginBottom: 8 }}>
              every N frames the ghost resets — higher = more datamosh accumulation
            </div>
            {slider(iFrameInterval, 4, 240, setIFrameInterval, `${iFrameInterval}f`)}
          </div>

          {/* Motion threshold */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>motion threshold</div>
            <div style={{ fontSize: 10, opacity: 0.3, marginBottom: 8 }}>
              minimum per-channel diff to trigger ghost bleed — lower = more bleeding
            </div>
            {slider(threshold, 1, 80, setThreshold, `${threshold}`)}
          </div>

          {/* Ghost blend */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>ghost persistence</div>
            <div style={{ fontSize: 10, opacity: 0.3, marginBottom: 8 }}>
              how strongly ghost frame is retained — 1.0 = fully frozen
            </div>
            {slider(Math.round(blend * 100), 50, 99, v => setBlend(v / 100), `${Math.round(blend * 100)}%`)}
          </div>

          {/* Block size — only relevant for blocks mode */}
          {effect === "blocks" && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>macroblock size</div>
              {slider(blockSize, 4, 64, setBlockSize, `${blockSize}px`)}
            </div>
          )}

          {/* Drift — only relevant for drift mode */}
          {(effect === "drift" || effect === "datamosh") && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>drift offset</div>
              <div style={{ fontSize: 10, opacity: 0.3, marginBottom: 8 }}>
                pixels the ghost shifts on each keyframe — simulates vector displacement
              </div>
              {slider(drift, 0, 20, setDrift, `${drift}px`)}
            </div>
          )}

          {divider}

          {/* Controls */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
            {!playing ? (
              <button onClick={startPlayback}
                style={{ border: "1px solid #000", background: "#000", color: "#fff",
                  padding: "6px 16px", fontSize: 12, cursor: "pointer", letterSpacing: "0.06em" }}>
                preview
              </button>
            ) : (
              <button onClick={stopPlayback}
                style={{ border: "1px solid #000", background: "#000", color: "#fff",
                  padding: "6px 16px", fontSize: 12, cursor: "pointer", letterSpacing: "0.06em" }}>
                stop
              </button>
            )}
            {canRecord && (!recording ? (
              <button onClick={startRecording}
                style={{ border: "1px solid #c00", background: "#c00", color: "#fff",
                  padding: "6px 16px", fontSize: 12, cursor: "pointer", letterSpacing: "0.06em" }}>
                record + export
              </button>
            ) : (
              <button onClick={stopRecording}
                style={{ border: "1px solid #c00", background: "transparent", color: "#c00",
                  padding: "6px 16px", fontSize: 12, cursor: "pointer", letterSpacing: "0.06em" }}>
                stop recording
              </button>
            ))}
          </div>

          {recording && (
            <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 16, letterSpacing: "0.06em" }}>
              recording — plays through once then downloads as .webm
            </div>
          )}

          <canvas ref={canvasRef} style={{ display: "block", maxWidth: "100%" }} />
        </>
      )}
    </div>
  );
}
