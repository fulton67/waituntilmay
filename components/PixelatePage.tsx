"use client";

import { useRef, useState, useCallback, useEffect } from "react";

// Y = 0.299R + 0.587G + 0.114B
function luma(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

type Mode = "horizontal" | "vertical" | "both";

interface Preset {
  name: string;
  tip: string;
  pixelSize: number;
  bMin: number;
  bMax: number;
  minArea: number;
  strip: number;
  mode: Mode;
}

const PRESETS: Preset[] = [
  {
    name: "cascade",
    tip: "midtone glitch lines — most readable source",
    pixelSize: 1, bMin: 100, bMax: 200, minArea: 10, strip: 1, mode: "horizontal",
  },
  {
    name: "melt",
    tip: "shadows only — dark regions drip right",
    pixelSize: 1, bMin: 0, bMax: 80, minArea: 5, strip: 3, mode: "horizontal",
  },
  {
    name: "burn",
    tip: "highlights smear — bright areas stretch furthest",
    pixelSize: 1, bMin: 180, bMax: 255, minArea: 5, strip: 1, mode: "horizontal",
  },
  {
    name: "narrow",
    tip: "ultra-precise band (120–135) — surgical glitch on exact tone",
    pixelSize: 1, bMin: 120, bMax: 135, minArea: 3, strip: 1, mode: "horizontal",
  },
  {
    name: "corrupt",
    tip: "full range, tiny area — maximum chaos, nothing survives",
    pixelSize: 3, bMin: 0, bMax: 255, minArea: 2, strip: 1, mode: "horizontal",
  },
  {
    name: "crosshatch",
    tip: "both axes — unison grid, rows and columns move together",
    pixelSize: 2, bMin: 90, bMax: 160, minArea: 10, strip: 2, mode: "both",
  },
];

// Stretch qualifying row runs: each run's first `strip` px are stretched across the run
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

// Same but scans columns — creates vertical unison movement
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
  // both: horizontal → then vertical on the result
  const tmp = new Uint8ClampedArray(src);
  stretchRows(src, tmp, w, h, bMin, bMax, minArea, strip);
  const dst = new Uint8ClampedArray(tmp);
  stretchCols(tmp, dst, w, h, bMin, bMax, minArea, strip);
  return new ImageData(dst, w, h);
}

export default function PixelatePage() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const tmpCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [img, setImg]           = useState<HTMLImageElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [processed, setProcessed] = useState(false);

  // Controls
  const [pixelSize, setPixelSize] = useState(1);
  const [bMin, setBMin]           = useState(100);
  const [bMax, setBMax]           = useState(200);
  const [minArea, setMinArea]     = useState(10);
  const [strip, setStrip]         = useState(1);
  const [mode, setMode]           = useState<Mode>("horizontal");

  const getScaledDims = useCallback((image: HTMLImageElement) => {
    const maxW = Math.min(image.naturalWidth, window.innerWidth - 80);
    const scale = maxW / image.naturalWidth;
    return { w: Math.round(image.naturalWidth * scale), h: Math.round(image.naturalHeight * scale) };
  }, []);

  const drawPixelated = useCallback((image: HTMLImageElement, size: number): ImageData | null => {
    const tmp = tmpCanvasRef.current;
    if (!tmp) return null;
    const ctx = tmp.getContext("2d");
    if (!ctx) return null;
    const { w, h } = getScaledDims(image);
    tmp.width = w; tmp.height = h;
    ctx.imageSmoothingEnabled = false;
    if (size <= 1) {
      ctx.drawImage(image, 0, 0, w, h);
    } else {
      const pw = Math.max(1, Math.floor(size));
      const sw = Math.ceil(w / pw), sh = Math.ceil(h / pw);
      // Use a separate small canvas to avoid self-referential drawImage artifacts
      const small = document.createElement("canvas");
      small.width = sw; small.height = sh;
      const sctx = small.getContext("2d")!;
      sctx.imageSmoothingEnabled = false;
      sctx.drawImage(image, 0, 0, sw, sh);
      ctx.drawImage(small, 0, 0, sw, sh, 0, 0, w, h);
    }
    return ctx.getImageData(0, 0, w, h);
  }, [getScaledDims]);

  // Show plain pixelated preview (no stretch)
  const renderPreview = useCallback((image: HTMLImageElement, size: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imageData = drawPixelated(image, size);
    if (!imageData) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
    setProcessed(false);
  }, [drawPixelated]);

  useEffect(() => {
    if (img && !processed) renderPreview(img, pixelSize);
  }, [img, pixelSize, processed, renderPreview]);

  const handleProcess = useCallback(() => {
    if (!img) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pixelated = drawPixelated(img, pixelSize);
    if (!pixelated) return;
    const stretched = applyStretch(pixelated, bMin, bMax, minArea, strip, mode);
    canvas.width = stretched.width;
    canvas.height = stretched.height;
    ctx.putImageData(stretched, 0, 0);
    setProcessed(true);
  }, [img, pixelSize, bMin, bMax, minArea, strip, mode, drawPixelated]);

  const applyPreset = (p: Preset) => {
    setPixelSize(p.pixelSize);
    setBMin(p.bMin);
    setBMax(p.bMax);
    setMinArea(p.minArea);
    setStrip(p.strip);
    setMode(p.mode);
    setProcessed(false);
  };

  const loadFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { setImg(image); setProcessed(false); };
    image.src = url;
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "distorted.png";
    a.click();
  };

  const label = (text: string) => (
    <span style={{ fontSize: "11px", opacity: 0.45, letterSpacing: "0.08em", textTransform: "uppercase" }}>
      {text}
    </span>
  );

  const slider = (
    value: number,
    min: number, max: number,
    onChange: (v: number) => void,
    displayValue?: string
  ) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => { onChange(Number(e.target.value)); setProcessed(false); }}
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
      <canvas ref={tmpCanvasRef} style={{ display: "none" }} />

      <div style={{ marginBottom: 20 }}>
        <a href="/" style={{ fontSize: 12, opacity: 0.45 }}>← back</a>
      </div>

      <h1 style={{ fontSize: 13, marginBottom: 24, letterSpacing: "0.08em" }}>pixelate + pixel stretch</h1>

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
        {img ? "click or drop to replace image" : "click or drop an image"}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*"
        onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); }}
        style={{ display: "none" }} />

      {img && (
        <>
          {/* ── Presets ─────────────────────────────────────── */}
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

          {/* ── Pixelate ────────────────────────────────────── */}
          {label("pixelate")}
          <div style={{ marginTop: 8, marginBottom: 20 }}>
            <div style={{ fontSize: 12, marginBottom: 6 }}>pixel size</div>
            {slider(pixelSize, 1, 64, setPixelSize, `${pixelSize}px`)}
          </div>

          {divider}

          {/* ── Pixel Stretch ───────────────────────────────── */}
          {label("pixel stretch")}

          {/* Brightness range — visual gradient bar */}
          <div style={{ marginTop: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 12, marginBottom: 8 }}>brightness range</div>

            {/* Gradient track showing selected band */}
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
                {slider(bMin, 0, 255, v => { setBMin(Math.min(v, bMax)); }, undefined)}
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>max {bMax}</div>
                {slider(bMax, 0, 255, v => { setBMax(Math.max(v, bMin)); }, undefined)}
              </div>
            </div>

            <div style={{ fontSize: 10, opacity: 0.3, marginTop: 6 }}>
              Y = 0.299×R + 0.587×G + 0.114×B &nbsp;·&nbsp; blue band = affected zone
            </div>
          </div>

          {/* Min connected area */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, marginBottom: 6 }}>min connected area</div>
            {slider(minArea, 1, 200, setMinArea, `${minArea}px`)}
            <div style={{ fontSize: 10, opacity: 0.3, marginTop: 4 }}>
              runs shorter than this are ignored — smaller = more pixels affected
            </div>
          </div>

          {/* Left strip width */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>left strip width</div>
            {/* Visual: strip block vs stretched run */}
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
              source strip (■) stretched across the entire run — strip=1 gives hardest glitch
            </div>
          </div>

          {/* Direction / mode */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, marginBottom: 8 }}>direction</div>
            <div style={{ display: "flex", gap: 6 }}>
              {(["horizontal", "vertical", "both"] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setProcessed(false); }}
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
            <div style={{ fontSize: 10, opacity: 0.3, marginTop: 6 }}>
              H+V runs horizontal then vertical — rows and columns move in unison
            </div>
          </div>

          {divider}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
            <button
              onClick={handleProcess}
              style={{ border: "1px solid #000", background: "#000", color: "#fff",
                padding: "6px 16px", fontSize: 12, cursor: "pointer", letterSpacing: "0.06em" }}
            >
              process
            </button>
            <button
              onClick={() => { if (img) renderPreview(img, pixelSize); }}
              style={{ border: "1px solid #ccc", background: "transparent",
                padding: "6px 16px", fontSize: 12, cursor: "pointer", letterSpacing: "0.06em" }}
            >
              reset
            </button>
            <button
              onClick={download}
              style={{ border: "1px solid #000", background: "transparent",
                padding: "6px 16px", fontSize: 12, cursor: "pointer",
                letterSpacing: "0.06em", marginLeft: "auto" }}
            >
              download
            </button>
          </div>

          {/* Output */}
          <canvas
            ref={canvasRef}
            style={{ display: "block", maxWidth: "100%", imageRendering: "pixelated" }}
          />
        </>
      )}
    </div>
  );
}
