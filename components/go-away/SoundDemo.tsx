"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Director } from "./director";
import { FRAG, VERT } from "./shader";

// Vertical (9:16) audio-reactive raymarch. Load any song; record straight to a short-form video.

const DEFAULT_TRACK = { src: "/audio/go-away.mp3", title: "go away" };
const PREVIEW_MAX_H = 1280; // on-screen render height cap (720x1280)
const RECORD_W = 1080;
const RECORD_H = 1920;

const RECORDER_TYPES = [
  "video/mp4;codecs=avc1.640028,mp4a.40.2",
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4", // last: some builds report this but mux VP9 into it, which apps reject
];

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader compile failed");
  return s;
}

const titleFromFile = (name: string) =>
  name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();

export default function SoundDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const directorRef = useRef<Director | null>(null);
  const titleRef = useRef(DEFAULT_TRACK.title);
  const redrawTextRef = useRef<() => void>(() => {});
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingRef = useRef(false);
  const objectUrlRef = useRef<string | null>(null);

  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ---------- render loop ----------
  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl2", { antialias: false });
    if (!gl) {
      setError("this needs WebGL2");
      return;
    }
    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.bindAttribLocation(prog, 0, "a_pos");
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link failed");
    } catch (e) {
      setError(String(e));
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const uniformCache = new Map<string, WebGLUniformLocation | null>();
    const U = (n: string) => {
      if (!uniformCache.has(n)) uniformCache.set(n, gl.getUniformLocation(prog, n));
      return uniformCache.get(n)!;
    };

    // Title text is drawn on a 2D canvas and multiplied into the image in the shader.
    const tex = gl.createTexture();
    const textCanvas = document.createElement("canvas");
    const drawText = () => {
      textCanvas.width = canvas.width;
      textCanvas.height = canvas.height;
      const c2 = textCanvas.getContext("2d")!;
      c2.fillStyle = "#000";
      c2.fillRect(0, 0, textCanvas.width, textCanvas.height);
      const size = Math.round(canvas.height / 34);
      const pad = Math.round(size * 1.6);
      c2.font = `${size}px ui-monospace, Menlo, Consolas, monospace`;
      c2.fillStyle = "#fff";
      c2.textBaseline = "bottom";
      let text = titleRef.current;
      while (text.length > 1 && c2.measureText(text).width > canvas.width - pad * 2) text = text.slice(0, -2) + "…";
      c2.fillText(text, pad, canvas.height - pad);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(U("uText"), 0);
    };
    redrawTextRef.current = drawText;

    // preview resolution adapts to frame time so phones stay smooth; recording is always 1080x1920
    let scale = 1;
    let frameAvg = 16;
    const resize = () => {
      let w: number, h: number;
      if (recordingRef.current) {
        w = RECORD_W;
        h = RECORD_H;
      } else {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        h = Math.round(Math.min(Math.floor(canvas.clientHeight * dpr), PREVIEW_MAX_H) * scale);
        // match the on-screen box (9:16 on desktop, full screen on phones) so nothing stretches
        w = Math.round((h * canvas.clientWidth) / Math.max(1, canvas.clientHeight));
      }
      if (h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        drawText();
      }
    };

    let freq: Float32Array<ArrayBuffer> | null = null;
    let last = performance.now();
    let lastAnalysis = 0;
    let raf = 0;

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const t = now / 1000;
      frameAvg += (dt * 1000 - frameAvg) * 0.05;
      if (!recordingRef.current) {
        if (frameAvg > 24 && scale > 0.45) {
          scale = Math.max(0.45, scale * 0.85);
          frameAvg = 16;
        } else if (frameAvg < 14 && scale < 1) {
          scale = Math.min(1, scale * 1.1);
          frameAvg = 16;
        }
      }
      resize();

      const director = (directorRef.current ??= new Director());
      const analyser = analyserRef.current;
      const audio = audioRef.current;
      if (analyser && audio && !audio.paused) {
        // analyse at a fixed ~60 Hz so onset thresholds mean the same thing on any refresh rate
        const step = t - lastAnalysis;
        if (step >= 0.0155) {
          lastAnalysis = t;
          if (!freq || freq.length !== analyser.frequencyBinCount) freq = new Float32Array(analyser.frequencyBinCount);
          analyser.getFloatFrequencyData(freq);
          const progress = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration : 0;
          director.update(freq, analyser.context.sampleRate / analyser.fftSize, t, Math.min(step, 0.1), progress);
        }
      } else {
        director.idle(t, dt);
      }

      const u = director.uniforms();
      gl.uniform2f(U("iResolution"), canvas.width, canvas.height);
      gl.uniform1f(U("uTime"), t % 10000);
      for (const [k, v] of Object.entries(u)) {
        if (Array.isArray(v)) {
          if (v.length === 3) gl.uniform3f(U(k), v[0], v[1], v[2]);
          else gl.uniform4f(U(k), v[0], v[1], v[2], v[3]);
        } else gl.uniform1f(U(k), v);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(
    () => () => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      void ctxRef.current?.close();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  // ---------- audio ----------
  const ensureAudioGraph = useCallback(async () => {
    const audio = audioRef.current!;
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      const src = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;
      const streamDest = ctx.createMediaStreamDestination();
      src.connect(analyser);
      analyser.connect(ctx.destination);
      analyser.connect(streamDest);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      streamDestRef.current = streamDest;
    }
    await ctxRef.current.resume();
  }, []);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current!;
    await ensureAudioGraph();
    if (audio.paused) await audio.play();
    else audio.pause();
  }, [ensureAudioGraph]);

  const loadFile = useCallback(
    async (file: File | undefined) => {
      if (!file || recordingRef.current) return;
      if (!file.type.startsWith("audio/") && !/\.(mp3|wav|m4a|aac|ogg|flac|opus|webm)$/i.test(file.name)) {
        setNotice("that isn't an audio file");
        return;
      }
      const audio = audioRef.current!;
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = URL.createObjectURL(file);
      audio.src = objectUrlRef.current;
      const name = titleFromFile(file.name) || "untitled";
      titleRef.current = name;
      redrawTextRef.current();
      directorRef.current = new Director(); // fresh build-up for the new song
      setNotice(null);
      await ensureAudioGraph();
      await audio.play();
    },
    [ensureAudioGraph],
  );

  // ---------- recording ----------
  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const startRecording = useCallback(async () => {
    const canvas = canvasRef.current!;
    const audio = audioRef.current!;
    if (typeof MediaRecorder === "undefined" || !canvas.captureStream) {
      setNotice("recording isn't supported in this browser");
      return;
    }
    await ensureAudioGraph();
    const mimeType = RECORDER_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
    recordingRef.current = true; // render loop switches to 1080x1920 on its next frame
    // let the canvas resize before capture starts, so the video track opens at full size
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    const stream = new MediaStream([
      ...canvas.captureStream(30).getVideoTracks(),
      ...streamDestRef.current!.stream.getAudioTracks(),
    ]);
    const rec = new MediaRecorder(stream, { mimeType: mimeType || undefined, videoBitsPerSecond: 14_000_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    rec.onstop = () => {
      recordingRef.current = false;
      setRecording(false);
      audio.loop = true;
      audio.pause();
      stream.getVideoTracks().forEach((tr) => tr.stop());
      const type = rec.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunks, { type });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${titleRef.current.replace(/\s+/g, "-")}-waituntilmay.${type.includes("mp4") ? "mp4" : "webm"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      setNotice(type.includes("mp4") ? "saved mp4" : "saved webm — convert to mp4 if your app needs it");
    };
    recorderRef.current = rec;
    directorRef.current = new Director();
    audio.loop = false;
    audio.currentTime = 0;
    setNotice(null);
    setRecording(true);
    rec.start(1000);
    await audio.play();
  }, [ensureAudioGraph]);

  // ---------- drag & drop ----------
  useEffect(() => {
    const over = (e: DragEvent) => {
      e.preventDefault();
      setDragging(true);
    };
    const leave = (e: DragEvent) => {
      if (!e.relatedTarget) setDragging(false);
    };
    const drop = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      void loadFile(e.dataTransfer?.files?.[0]);
    };
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, [loadFile]);

  const btn =
    "px-3 py-1.5 border border-black bg-white text-black font-mono text-[11px] tracking-widest uppercase disabled:opacity-40";

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-neutral-200 select-none">
      <div
        className="relative h-[100dvh] max-w-[100vw] aspect-[9/16] bg-white overflow-hidden"
        onClick={(e) => {
          if (e.target === canvasRef.current && !recording) void togglePlay();
        }}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />

        {recording && (
          <span className="absolute top-3 right-3 pointer-events-none font-mono text-[11px] bg-black text-white px-2 py-1 animate-pulse">
            ● rec
          </span>
        )}

        <div className="absolute bottom-3 inset-x-3 flex items-center justify-end gap-2">
          <button className={btn} onClick={() => void togglePlay()} disabled={recording}>
            {playing ? "pause" : "play"}
          </button>
          <button className={btn} onClick={() => fileRef.current?.click()} disabled={recording}>
            song
          </button>
          <button className={btn} onClick={() => (recording ? stopRecording() : void startRecording())}>
            {recording ? "stop" : "rec"}
          </button>
        </div>

        {notice && (
          <div className="absolute bottom-14 inset-x-3 font-mono text-[11px] text-black bg-white px-2 py-1">{notice}</div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-black bg-white">
            {error}
          </div>
        )}
        {dragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 font-mono text-xs tracking-widest text-black pointer-events-none">
            DROP A SONG
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        src={DEFAULT_TRACK.src}
        loop
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={stopRecording}
      />
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          void loadFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </main>
  );
}
