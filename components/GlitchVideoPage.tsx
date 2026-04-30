"use client";

import { useRef, useState, useCallback, useEffect } from "react";

function luma(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

type Mode = "horizontal" | "vertical" | "both";

interface Preset {
  name: string;
  tip: string;
  bMin: number;
  bMax: number;
  minArea: number;
  strip: number;
  mode: Mode;
}

const PRESETS: Preset[] = [
  { name: "cascade",   tip: "midtone glitch lines",          bMin: 100, bMax: 200, minArea: 10, strip: 1, mode: "horizontal" },
  { name: "melt",      tip: "shadows drip right",            bMin: 0,   bMax: 80,  minArea: 5,  strip: 3, mode: "horizontal" },
  { name: "burn",      tip: "highlights smear horizontal",   bMin: 180, bMax: 255, minArea: 5,  strip: 1, mode: "horizontal" },
  { name: "corrupt",   tip: "full range — maximum chaos",    bMin: 0,   bMax: 255, minArea: 2,  strip: 1, mode: "horizontal" },
  { name: "crosshatch",tip: "both axes — grid movement",     bMin: 90,  bMax: 160, minArea: 10, strip: 2, mode: "both" },
  { name: "drip",      tip: "shadows fall vertically",       bMin: 0,   bMax: 90,  minArea: 4,  strip: 2, mode: "vertical" },
];

function stretchRows(
  src: Uint8ClampedArray, dst: Uint8ClampedArray,
  w: number, h: number,
  bMin: number, bMax: number, minArea: number, strip: number
) {
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const i = (y * w + x) * 4;
      const b = luma(src[i], src[i + 1], src[i + 2]);
      if (b >= bMin && b <= bMax) {
        let end = x + 1;
        while (end < w) {
          const ei = (y * w + end) * 4;
          const eb = luma(src[ei], src[ei + 1], src[ei + 2]);
          if (eb < bMin || eb > bMax) break;
          end++;
        }
        const runLen = end - x;
        if (runLen >= minArea) {
          const sw = Math.min(strip, runLen);
          for (let j = 0; j < runLen; j++) {
            const srcIdx = sw <= 1 ? 0 : Math.floor((j / (runLen - 1)) * (sw - 1));
            const si = (y * w + x + srcIdx) * 4;
            const di = (y * w + x + j) * 4;
            dst[di] = src[si]; dst[di + 1] = src[si + 1];
            dst[di + 2] = src[si + 2]; dst[di + 3] = src[si + 3];
          }
        }
        x = end;
      } else { x++; }
    }
  }
}

function stretchCols(
  src: Uint8ClampedArray, dst: Uint8ClampedArray,
  w: number, h: number,
  bMin: number, bMax: number, minArea: number, strip: number
) {
  for (let x = 0; x < w; x++) {
    let y = 0;
    while (y < h) {
      const i = (y * w + x) * 4;
      const b = luma(src[i], src[i + 1], src[i + 2]);
      if (b >= bMin && b <= bMax) {
        let end = y + 1;
        while (end < h) {
          const ei = (end * w + x) * 4;
          const eb = luma(src[ei], src[ei + 1], src[ei + 2]);
          if (eb < bMin || eb > bMax) break;
          end++;
        }
        const runLen = end - y;
        if (runLen >= minArea) {
          const sw = Math.min(strip, runLen);
          for (let j = 0; j < runLen; j++) {
            const srcIdx = sw <= 1 ? 0 : Math.floor((j / (runLen - 1)) * (sw - 1));
            const si = ((y + srcIdx) * w + x) * 4;
            const di = ((y + j) * w + x) * 4;
            dst[di] = src[si]; dst[di + 1] = src[si + 1];
            dst[di + 2] = src[si + 2]; dst[di + 3] = src[si + 3];
          }
        }
        y = end;
      } else { y++; }
    }
  }
}

function applyStretch(
  imageData: ImageData,
  bMin: number, bMax: number, minArea: number, strip: number, mode: Mode
): ImageData {
  const { width: w, height: h, data: src } = imageData;
  if (mode === "horizontal") {
    const dst = new Uint8ClampedArray(src);
    stretchRows(src, dst, w, h, bMin, bMax, minArea, strip);
    return new ImageData(dst, w, h);
  }
  if (mode === "vertical") {
    const dst = new Uint8ClampedArray(src);
    stretchCols(src, dst, w, h, bMin, bMax, minArea, strip);
    return new ImageData(dst, w, h);
  }
  const tmp = new Uint8ClampedArray(src);
  stretchRows(src, tmp, w, h, bMin, bMax, minArea, strip);
  const dst = new Uint8ClampedArray(tmp);
  stretchCols(tmp, dst, w, h, bMin, bMax, minArea, strip);
  return new ImageData(dst, w, h);
}

export default function GlitchVideoPage() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rafRef       = useRef<number>(0);
  const recorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);

  const [videoUrl, setVideoUrl]     = useState<string | null>(null);
  const [dragging, setDragging]     = useState(false);
  const [playing, setPlaying]       = useState(false);
  const [recording, setRecording]   = useState(false);
  const [canRecord, setCanRecord]   = useState(false);

  const [bMin, setBMin]       = useState(100);
  const [bMax, setBMax]       = useState(200);
  const [minArea, setMinArea] = useState(10);
  const [strip, setStrip]     = useState(1);
  const [mode, setMode]       = useState<Mode>("horizontal");

  const bMinRef    = useRef(bMin);
  const bMaxRef    = useRef(bMax);
  const minAreaRef = useRef(minArea);
  const stripRef   = useRef(strip);
  const modeRef    = useRef(mode);

  useEffect(() => { bMinRef.current    = bMin;    }, [bMin]);
  useEffect(() => { bMaxRef.current    = bMax;    }, [bMax]);
  useEffect(() => { minAreaRef.current = minArea; }, [minArea]);
  useEffect(() => { stripRef.current   = strip;   }, [strip]);
  useEffect(() => { modeRef.current    = mode;    }, [mode]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const renderFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.paused || video.ended) {
      setPlaying(false);
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const glitched = applyStretch(
      id,
      bMinRef.current, bMaxRef.current,
      minAreaRef.current, stripRef.current, modeRef.current
    );
    ctx.putImageData(glitched, 0, 0);
    rafRef.current = requestAnimationFrame(renderFrame);
  }, []);

  const startPlayback = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const maxW = Math.min(video.videoWidth, window.innerWidth - 80);
    const scale = maxW / video.videoWidth;
    canvas.width  = Math.round(video.videoWidth  * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    video.currentTime = 0;
    video.play();
    setPlaying(true);
    stopLoop();
    rafRef.current = requestAnimationFrame(renderFrame);
  }, [renderFrame, stopLoop]);

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
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
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

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      setRecording(false);
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "glitched.webm";
      a.click();
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
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setPlaying(false);
    setRecording(false);
  };

  const applyPreset = (p: Preset) => {
    setBMin(p.bMin); setBMax(p.bMax);
    setMinArea(p.minArea); setStrip(p.strip); setMode(p.mode);
  };

  const label = (text: string) => (
    <span style={{ fontSize: "11px", opacity: 0.45, letterSpacing: "0.08em", textTransform: "uppercase" }}>
      {text}
    </span>
  );

  const slider = (
    value: number, min: number, max: number,
    onChange: (v: number) => void,
    displayValue?: string
  ) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: "#000" }}
      />
      <span style={{ fontSize: "12px", minWidth: 36, textAlign: "right", fontFamily: "Courier New" }}>
        {displayValue ?? value}
      </span>
    </div>
  );

  const divider = <div style={{ borderTop: "1px solid #ebebeb", margin: "20px 0" }} />;

  return (
    <div style={{ padding: "clamp(24px, 5vw, 64px) clamp(20px, 5vw, 32px)", maxWidth: "860px", margin: "0 auto", fontFamily: "'Courier New', monospace" }}>

      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          playsInline
          style={{ display: "none" }}
          onLoadedMetadata={() => {
            const canvas = canvasRef.current;
            const video  = videoRef.current;
            if (!canvas || !video) return;
            const maxW = Math.min(video.videoWidth, window.innerWidth - 80);
            const scale = maxW / video.videoWidth;
            canvas.width  = Math.round(video.videoWidth  * scale);
            canvas.height = Math.round(video.videoHeight * scale);
          }}
        />
      )}

      <div style={{ marginBottom: 20 }}>
        <a href="/" style={{ fontSize: 12, opacity: 0.45 }}>← back</a>
      </div>

      <h1 style={{ fontSize: 13, marginBottom: 24, letterSpacing: "0.08em" }}>video glitch</h1>

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
      <input
        ref={fileInputRef} type="file" accept="video/*"
        onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); }}
        style={{ display: "none" }}
      />

      {videoUrl && (
        <>
          {/* Presets */}
          <div style={{ marginBottom: 20 }}>
            {label("presets")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {PRESETS.map(p => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  title={p.tip}
                  style={{
                    border: "1px solid #d0d0d0", background: "transparent",
                    padding: "4px 10px", fontSize: 11, cursor: "pointer",
                    letterSpacing: "0.06em",
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10, opacity: 0.35, marginTop: 6 }}>hover preset name for tip</div>
          </div>

          {divider}

          {/* Brightness range */}
          <div style={{ marginBottom: 16 }}>
            {label("pixel stretch")}
            <div style={{ marginTop: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 12, marginBottom: 8 }}>brightness range</div>
              <div style={{ position: "relative", height: 8, marginBottom: 10, borderRadius: 2, overflow: "hidden",
                background: "linear-gradient(to right, #000, #fff)" }}>
                <div style={{
                  position: "absolute", top: 0, bottom: 0,
                  left: `${(bMin / 255) * 100}%`,
                  right: `${100 - (bMax / 255) * 100}%`,
                  background: "rgba(0,120,255,0.55)",
                }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>min {bMin}</div>
                  {slider(bMin, 0, 255, v => setBMin(Math.min(v, bMax)))}
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>max {bMax}</div>
                  {slider(bMax, 0, 255, v => setBMax(Math.max(v, bMin)))}
                </div>
              </div>
              <div style={{ fontSize: 10, opacity: 0.3, marginTop: 6 }}>
                Y = 0.299×R + 0.587×G + 0.114×B &nbsp;·&nbsp; blue band = affected zone
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, marginBottom: 6 }}>min connected area</div>
              {slider(minArea, 1, 200, setMinArea, `${minArea}px`)}
              <div style={{ fontSize: 10, opacity: 0.3, marginTop: 4 }}>
                runs shorter than this are ignored — smaller = more pixels affected
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>left strip width</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <div style={{
                  width: `${Math.max(4, (strip / 100) * 120)}px`, height: 10,
                  background: "#000", flexShrink: 0, transition: "width 0.1s",
                }} />
                <div style={{ flex: 1, height: 10, background: "#e0e0e0" }} />
                <span style={{ fontSize: 10, opacity: 0.4, whiteSpace: "nowrap" }}>→ stretched</span>
              </div>
              {slider(strip, 1, 100, setStrip, `${strip}px`)}
              <div style={{ fontSize: 10, opacity: 0.3, marginTop: 4 }}>
                source strip (■) stretched across the run — strip=1 gives hardest glitch
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, marginBottom: 8 }}>direction</div>
              <div style={{ display: "flex", gap: 6 }}>
                {(["horizontal", "vertical", "both"] as Mode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      border: `1px solid ${mode === m ? "#000" : "#d0d0d0"}`,
                      background: mode === m ? "#000" : "transparent",
                      color: mode === m ? "#fff" : "#888",
                      padding: "4px 12px", fontSize: 11, cursor: "pointer",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {m === "horizontal" ? "H" : m === "vertical" ? "V" : "H+V"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {divider}

          {/* Playback controls */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
            {!playing ? (
              <button
                onClick={startPlayback}
                style={{ border: "1px solid #000", background: "#000", color: "#fff",
                  padding: "6px 16px", fontSize: 12, cursor: "pointer", letterSpacing: "0.06em" }}
              >
                preview
              </button>
            ) : (
              <button
                onClick={stopPlayback}
                style={{ border: "1px solid #000", background: "#000", color: "#fff",
                  padding: "6px 16px", fontSize: 12, cursor: "pointer", letterSpacing: "0.06em" }}
              >
                stop
              </button>
            )}

            {canRecord && (
              !recording ? (
                <button
                  onClick={startRecording}
                  style={{ border: "1px solid #c00", background: "#c00", color: "#fff",
                    padding: "6px 16px", fontSize: 12, cursor: "pointer", letterSpacing: "0.06em" }}
                >
                  record + export
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  style={{ border: "1px solid #c00", background: "transparent", color: "#c00",
                    padding: "6px 16px", fontSize: 12, cursor: "pointer", letterSpacing: "0.06em" }}
                >
                  stop recording
                </button>
              )
            )}
          </div>

          {recording && (
            <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 16, letterSpacing: "0.06em" }}>
              recording — plays through once then downloads as .webm
            </div>
          )}

          {!canRecord && videoUrl && (
            <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 16 }}>
              MediaRecorder not available in this browser — preview only
            </div>
          )}

          <canvas
            ref={canvasRef}
            style={{ display: "block", maxWidth: "100%" }}
          />
        </>
      )}
    </div>
  );
}
