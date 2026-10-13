"use client";

import { useEffect, useRef, useState } from "react";

// Port of the "phase shift and rotation experiments" Shadertoy image pass.
// The original stepped its geometry on floor(iTime); here every step is driven
// by kicks detected live from the MP3 through a Web Audio analyser.

const TRACK_SRC = "/audio/go-away.mp3";
const LABEL = "go away";

const VERT = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0., 1.); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float uBeat;   // count of detected kicks
uniform float uKick;   // 1 on a kick, decays to 0
uniform float uPhase;  // 0 -> 1 sawtooth between kicks (camera slide)
uniform float uSpin;   // accumulated rotation, faster when the track is loud
uniform float uHigh;   // high-band energy (hats / air)
uniform sampler2D uText;
out vec4 fragColor;

#define dmin(a, b) ((a.x < b.x) ? a : b)
#define minkowski(v, m) pow(dot(pow(v, v * 0. + m), v * 0. + 1.), 1. / m)

vec2 pR(in vec2 p, float a) {
  p = cos(a) * p + sin(a) * vec2(p.y, -p.x);
  return p;
}
vec3 crt(in vec3 p) {
  float r = .5 * 6.2831 / 6.;
  float pa = r - atan(p.x, p.y);
  pa += mod(pa, -2. * r);
  return vec3(pR(p.xy, pa), p.z);
}
vec2 f(vec3 p) {
  vec3 v_bb = p;
  v_bb.xz = pR(v_bb.xz, uSpin);
  return dmin(
    vec2(minkowski(abs(abs(crt(abs(p) - vec3(1, .1, 3. + mod(uBeat, 3.)))) - vec3(.7 + mod(floor(.5 * uBeat), 3.), 4.2, 1.3)), 1.55) - 1.25, 3.),
    vec2(minkowski(abs(v_bb), 3.05) - (.9 + fract(.2 * uBeat) + .35 * uKick), 5.)
  );
}
vec3 N(in vec3 pos) {
  const vec3 eps = vec3(.001, 0, 0);
  return normalize(vec3(
    f(pos + eps.xyy).x - f(pos - eps.xyy).x,
    f(pos + eps.yxy).x - f(pos - eps.yxy).x,
    f(pos + eps.yyx).x - f(pos - eps.yyx).x));
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 R = iResolution.xy;
  vec2 st = -1. + 2. * fragCoord / R;
  float y = texture(uText, fragCoord / R).r;

  float h, aspct = max(R.x / R.y, R.y / R.x);
  vec3 rd, p, c,
       ro = vec3(uPhase, uPhase, 7. - .8 * uKick),
       gc = normalize(-ro),
       u = normalize(cross(gc, vec3(0, 1, 0))),
       v = normalize(cross(u, gc));
  u *= tan(1.2);
  v *= tan(1.2) / aspct;
  rd = normalize(gc + st.x * u + st.y * v);
  c = (1. - y) * vec3(1);
  h = 1.;
  vec2 d = vec2(0.);
  for (int i = 0; i < 32; ++i) {
    p = ro + rd * h;
    d = f(p);
    if (abs(d.x) < .001) {
      float fr;
      vec3 n = N(p);
      if (d.y == 3.) {
        fr = sqrt(1. - dot(-rd, n));
        c *= fr;
        ro = p + n * .01;
        rd = reflect(rd, n);
        h = 0.;
      }
      if (d.y == 5.) {
        fr = 1. - dot(-rd, n);
        c *= fr;
        ro = p + n * .001;
        rd = reflect(rd, n);
        h = 0.;
      }
    }
    h += d.x;
  }
  c *= 1. + .35 * uHigh;
  fragColor = vec4(c, 1);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(s) ?? "shader compile failed");
  }
  return s;
}

export default function SoundDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: false });
    if (!gl) {
      setError("this needs WebGL2");
      return;
    }

    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
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
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = U("iResolution"), uBeat = U("uBeat"), uKick = U("uKick"), uPhase = U("uPhase"),
      uSpin = U("uSpin"), uHigh = U("uHigh"), uText = U("uText");

    // Text overlay: drawn on a 2D canvas (replaces Shadertoy's font texture on iChannel3).
    const tex = gl.createTexture();
    const textCanvas = document.createElement("canvas");
    const drawText = () => {
      textCanvas.width = canvas.width;
      textCanvas.height = canvas.height;
      const c2 = textCanvas.getContext("2d")!;
      c2.fillStyle = "#000";
      c2.fillRect(0, 0, textCanvas.width, textCanvas.height);
      const size = Math.round(canvas.height / 20);
      c2.font = `${size}px ui-monospace, Menlo, Consolas, monospace`;
      c2.fillStyle = "#fff";
      c2.textBaseline = "bottom";
      c2.fillText(LABEL, size * 0.9, canvas.height - size * 0.9);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(uText, 0);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor(canvas.clientWidth * dpr), h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        drawText();
      }
    };
    resize();
    window.addEventListener("resize", resize);

    // Audio-driven state
    let beat = 0, kick = 0, spin = 0, high = 0;
    let lastBeatT = 0, beatInterval = 0.5;
    let prevBass = -100, fluxAvg = 0, level = 0, lastAnalysis = 0;
    let freq: Float32Array<ArrayBuffer> | null = null;
    let last = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const t = now / 1000;
      resize();

      const analyser = analyserRef.current;
      const audio = audioRef.current;
      if (analyser && audio && !audio.paused) {
        // Analyse at ~60 Hz regardless of display refresh so the per-step dB jump
        // (and so the kick threshold) means the same thing on 60, 120 and 144 Hz screens.
        if (t - lastAnalysis >= 0.0155) {
          lastAnalysis = t;
          // Float dB data: this master is loud enough that byte data clips the low end flat.
          if (!freq || freq.length !== analyser.frequencyBinCount) freq = new Float32Array(analyser.frequencyBinCount);
          analyser.getFloatFrequencyData(freq);
          const binHz = analyser.context.sampleRate / analyser.fftSize;
          const bandDb = (lo: number, hi: number) => {
            const a = Math.max(1, Math.floor(lo / binHz)), b = Math.max(a + 1, Math.ceil(hi / binHz));
            let s = 0;
            for (let i = a; i < b; i++) s += Math.pow(10, freq![i] / 10);
            return 10 * Math.log10(s / (b - a) + 1e-12);
          };
          const bass = bandDb(40, 120);
          const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
          const highs = clamp01((bandDb(6000, 14000) + 80) / 40);
          level = clamp01((bandDb(40, 14000) + 70) / 50);

          // Kick onset: jump in bass dB well above its recent average jump (tuned offline on this track).
          const flux = Math.max(0, bass - prevBass);
          prevBass = bass;
          fluxAvg += (flux - fluxAvg) * 0.05;
          const since = t - lastBeatT;
          if (since > 0.18 && flux > fluxAvg * 3 + 2) {
            beat += 1;
            kick = 1;
            if (since < 2) beatInterval += (since - beatInterval) * 0.3;
            lastBeatT = t;
          }
          high += (highs - high) * 0.3;
        }
      } else {
        // Idle: the original's once-a-second stepping.
        if (t - lastBeatT >= 1) {
          beat += 1;
          kick = 0.6;
          lastBeatT = t;
          beatInterval = 1;
        }
        high *= 0.9;
        level = 0;
      }

      kick *= Math.exp(-dt * 7);
      spin += dt * (1 + level * 4);
      const phase = Math.min(1, (t - lastBeatT) / Math.max(beatInterval, 0.2));

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uBeat, beat);
      gl.uniform1f(uKick, kick);
      gl.uniform1f(uPhase, phase);
      gl.uniform1f(uSpin, spin);
      gl.uniform1f(uHigh, high);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => () => void ctxRef.current?.close(), []);

  const toggle = async () => {
    const audio = audioRef.current!;
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      const src = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
    }
    await ctxRef.current.resume();
    if (audio.paused) {
      await audio.play();
      setStarted(true);
    } else {
      audio.pause();
    }
  };

  return (
    <main className="fixed inset-0 bg-white select-none" onClick={started ? toggle : undefined}>
      <canvas ref={canvasRef} className="block w-full h-full" />
      <audio
        ref={audioRef}
        src={TRACK_SRC}
        loop
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {!started && !error && (
        <button
          onClick={toggle}
          className="absolute inset-0 flex items-center justify-center font-mono text-sm tracking-widest text-black"
        >
          <span className="bg-white px-4 py-2 border border-black">▶ play</span>
        </button>
      )}
      {started && !playing && (
        <div className="pointer-events-none absolute top-4 right-4 font-mono text-xs text-black bg-white px-2 py-1">
          paused — tap to play
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-black">{error}</div>
      )}
    </main>
  );
}
