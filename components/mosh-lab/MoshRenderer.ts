/**
 * WebGL2 engine for the lattice-reprojection shader.
 *
 * Pass order per frame: A -> B -> (faces) -> image -> composite.
 * A and B both read themselves, so each gets a ping-pong pair.
 *
 * Buffer A packs pixel coordinates and a time into RGBA, so the targets must
 * be full float. Half float silently quantises both and the reprojection
 * falls apart, so RGBA32F is required and RGBA16F is only a flagged fallback.
 *
 * renderFrame() takes an explicit time and frame index rather than reading a
 * clock, so the offline renderer can step deterministically.
 */
import {
  FRAG_BUFFER_A, FRAG_BUFFER_B, FRAG_COMPOSITE, FRAG_FACES, FRAG_IMAGE, VERT,
} from "./shaders";

export type StampMode = "faces" | "screen";

export interface FrameParams {
  time: number;
  frame: number;
  intensity: number;
  stampMode: StampMode;
  refresh: number;
  freeze: boolean;
  camSpeed: number;
  scale: number;
  forceOverride: boolean;
}

export interface FloatSupport {
  colorBufferFloat: boolean;
  rgba32f: boolean;
  rgba16fFallback: boolean;
  message: string;
}

interface Target { fb: WebGLFramebuffer; tex: WebGLTexture; }
interface PingPong { read: Target; write: Target; }

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) ?? "";
    gl.deleteShader(sh);
    throw new Error(`shader compile failed: ${log}`);
  }
  return sh;
}

function link(gl: WebGL2RenderingContext, fragSrc: string) {
  const p = gl.createProgram()!;
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.bindAttribLocation(p, 0, "aPos");
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p) ?? "";
    gl.deleteProgram(p);
    throw new Error(`program link failed: ${log}`);
  }
  return p;
}

export class MoshRenderer {
  readonly gl: WebGL2RenderingContext;
  readonly float: FloatSupport;

  private progA: WebGLProgram;
  private progB: WebGLProgram;
  private progImage: WebGLProgram;
  private progFaces: WebGLProgram;
  private progComposite: WebGLProgram;
  private uniforms = new WeakMap<WebGLProgram, Map<string, WebGLUniformLocation | null>>();

  private vao: WebGLVertexArrayObject;
  private bufA!: PingPong;
  private bufB!: PingPong;
  private faces!: Target;
  private image!: Target;

  private videoTex: WebGLTexture;
  private ffmpegTex: WebGLTexture;
  private width = 1;
  private height = 1;
  private internalFloat: number;

  private video: HTMLVideoElement | null = null;
  private ffmpegVideo: HTMLVideoElement | null = null;
  private hasFfmpegFrame = false;
  private frameImage: TexImageSource | null = null;
  private frameFlipY = true;
  private frameSize = { w: 0, h: 0 };

  /** CPU time around the draw calls (submission, not necessarily GPU work) */
  lastFrameMs = 0;
  /** true GPU time via EXT_disjoint_timer_query_webgl2, or 0 if unavailable */
  lastGpuMs = 0;
  gpuTimingAvailable = false;
  private timerExt: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null = null;
  private pendingQuery: WebGLQuery | null = null;
  private suspendPerFrameQuery = false;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      antialias: false, depth: false, stencil: false,
      preserveDrawingBuffer: true, powerPreference: "high-performance",
    });
    if (!gl) throw new Error("WebGL2 is not available in this browser");
    this.gl = gl;

    const ext = gl.getExtension("EXT_color_buffer_float");
    let rgba32f = false;
    if (ext) rgba32f = this.probeRenderable(gl.RGBA32F);
    const rgba16f = !rgba32f && !!ext && this.probeRenderable(gl.RGBA16F);
    this.internalFloat = rgba32f ? gl.RGBA32F : gl.RGBA16F;
    this.float = {
      colorBufferFloat: !!ext,
      rgba32f,
      rgba16fFallback: rgba16f,
      message: rgba32f
        ? "RGBA32F render targets OK"
        : rgba16f
          ? "RGBA32F not renderable - fell back to RGBA16F. Buffer A stores "
            + "coordinates and time, which 16F quantises, so reprojection will drift."
          : "No renderable float colour buffer. This shader cannot run correctly.",
    };

    this.progA = link(gl, FRAG_BUFFER_A);
    this.progB = link(gl, FRAG_BUFFER_B);
    this.progImage = link(gl, FRAG_IMAGE);
    this.progFaces = link(gl, FRAG_FACES);
    this.progComposite = link(gl, FRAG_COMPOSITE);

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.timerExt = gl.getExtension("EXT_disjoint_timer_query_webgl2") as
      { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null;
    this.gpuTimingAvailable = !!this.timerExt;

    this.videoTex = this.makeVideoTexture();
    this.ffmpegTex = this.makeVideoTexture();
    this.resize(canvas.width || 1, canvas.height || 1);
  }

  private probeRenderable(internal: number): boolean {
    const gl = this.gl;
    const tex = gl.createTexture();
    const fb = gl.createFramebuffer();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, internal, 4, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D, tex, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);
    gl.deleteTexture(tex);
    return ok;
  }

  private makeVideoTexture(): WebGLTexture {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA,
      gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // REPEAT so a face UV scale > 1 tiles the frame
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    return t;
  }

  private makeTarget(internal: number, filter: number): Target {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, internal, this.width, this.height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb, tex };
  }

  private destroyTarget(t?: Target) {
    if (!t) return;
    this.gl.deleteFramebuffer(t.fb);
    this.gl.deleteTexture(t.tex);
  }

  resize(width: number, height: number) {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    if (w === this.width && h === this.height && this.bufA) return;
    this.width = w;
    this.height = h;
    const gl = this.gl;

    [this.bufA?.read, this.bufA?.write, this.bufB?.read, this.bufB?.write,
      this.faces, this.image].forEach((t) => this.destroyTarget(t));

    const f = this.internalFloat;
    this.bufA = { read: this.makeTarget(f, gl.NEAREST), write: this.makeTarget(f, gl.NEAREST) };
    this.bufB = { read: this.makeTarget(f, gl.NEAREST), write: this.makeTarget(f, gl.NEAREST) };
    this.faces = this.makeTarget(gl.RGBA8, gl.LINEAR);
    this.image = this.makeTarget(gl.RGBA8, gl.LINEAR);
  }

  get size() { return { width: this.width, height: this.height }; }

  setVideo(v: HTMLVideoElement | null) { this.video = v; }
  setFfmpegVideo(v: HTMLVideoElement | null) {
    this.ffmpegVideo = v;
    if (!v) this.hasFfmpegFrame = false;
  }

  /**
   * Offline render path: supply an exact decoded frame instead of the video
   * element. Seeking a <video> is not frame-exact - the browser lands on the
   * nearest decodable frame - so the render script decodes the source to
   * numbered images and hands them over one at a time, which makes output
   * frame n provably source frame n.
   */
  setFrameImage(img: TexImageSource | null, flipY = true) {
    this.frameImage = img;
    // UNPACK_FLIP_Y_WEBGL is honoured for <video> but not reliably for an
    // ImageBitmap on this driver, which silently flipped every rendered frame.
    // The caller states the orientation it is handing over instead of the
    // renderer guessing from the source type.
    this.frameFlipY = flipY;
    if (img) this.frameSize = {
      w: (img as { width?: number }).width ?? 0,
      h: (img as { height?: number }).height ?? 0,
    };
  }
  get sourceSize() {
    if (this.frameImage) return this.frameSize;
    return { w: this.video?.videoWidth ?? 0, h: this.video?.videoHeight ?? 0 };
  }

  private uploadVideo(tex: WebGLTexture, v: HTMLVideoElement | null): boolean {
    const gl = this.gl;
    const src: TexImageSource | null = this.frameImage
      ?? ((v && v.readyState >= 2 && v.videoWidth > 0) ? v : null);
    if (!src) return false;
    const flip = this.frameImage ? this.frameFlipY : true;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    return true;
  }

  /** Read the composited canvas back as raw RGBA (bottom-up, GL order). */
  readPixels(): Uint8Array {
    const gl = this.gl;
    const buf = new Uint8Array(this.width * this.height * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    return buf;
  }

  private loc(p: WebGLProgram, name: string) {
    let m = this.uniforms.get(p);
    if (!m) { m = new Map(); this.uniforms.set(p, m); }
    if (!m.has(name)) m.set(name, this.gl.getUniformLocation(p, name));
    return m.get(name) ?? null;
  }

  private common(p: WebGLProgram, fp: FrameParams) {
    const gl = this.gl;
    gl.uniform3f(this.loc(p, "iResolution"), this.width, this.height, 1);
    gl.uniform1f(this.loc(p, "iTime"), fp.time);
    gl.uniform1i(this.loc(p, "iFrame"), fp.frame);
    gl.uniform1i(this.loc(p, "uRefresh"), Math.max(1, Math.round(fp.refresh)));
    gl.uniform1i(this.loc(p, "uFreeze"), fp.freeze ? 1 : 0);
    gl.uniform1f(this.loc(p, "uCamSpeed"), fp.camSpeed);
    gl.uniform1f(this.loc(p, "uScale"), fp.scale);
    gl.uniform1i(this.loc(p, "uStampMode"), fp.stampMode === "screen" ? 1 : 0);
    gl.uniform1i(this.loc(p, "uForceOverride"), fp.forceOverride ? 1 : 0);
  }

  private bindTex(p: WebGLProgram, name: string, unit: number, tex: WebGLTexture) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(this.loc(p, name), unit);
  }

  private drawTo(target: Target | null) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
    gl.viewport(0, 0, this.width, this.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Clear both ping-pong pairs; the next frames < 3 re-stamp everything. */
  reset() {
    const gl = this.gl;
    for (const t of [this.bufA.read, this.bufA.write, this.bufB.read, this.bufB.write]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  renderFrame(fp: FrameParams) {
    const gl = this.gl;
    const t0 = performance.now();
    this.collectGpuQuery();
    let query: WebGLQuery | null = null;
    if (this.timerExt && !this.pendingQuery && !this.suspendPerFrameQuery) {
      query = gl.createQuery();
      if (query) gl.beginQuery(this.timerExt.TIME_ELAPSED_EXT, query);
    }

    const hasVideo = this.uploadVideo(this.videoTex, this.video);
    this.hasFfmpegFrame = this.uploadVideo(this.ffmpegTex, this.ffmpegVideo);
    void hasVideo;

    gl.bindVertexArray(this.vao);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    const needsLattice = fp.intensity > 1 / 3 - 1e-6 || fp.frame < 3;
    const needsFaces = fp.intensity > 1e-6 && fp.intensity < 2 / 3 + 1e-6;

    // ---- Buffer A (reprojection)
    if (needsLattice) {
      gl.useProgram(this.progA);
      this.common(this.progA, fp);
      this.bindTex(this.progA, "uPrevA", 0, this.bufA.read.tex);
      this.drawTo(this.bufA.write);

      // ---- Buffer B (held colour)
      gl.useProgram(this.progB);
      this.common(this.progB, fp);
      this.bindTex(this.progB, "uBufA", 0, this.bufA.write.tex);
      this.bindTex(this.progB, "uPrevB", 1, this.bufB.read.tex);
      this.bindTex(this.progB, "uVideo", 2, this.videoTex);
      this.drawTo(this.bufB.write);

      // ---- Image (warp held buffer into the current view)
      gl.useProgram(this.progImage);
      this.common(this.progImage, fp);
      this.bindTex(this.progImage, "uBufA", 0, this.bufA.write.tex);
      this.bindTex(this.progImage, "uBufB", 1, this.bufB.write.tex);
      this.drawTo(this.image);

      [this.bufA.read, this.bufA.write] = [this.bufA.write, this.bufA.read];
      [this.bufB.read, this.bufB.write] = [this.bufB.write, this.bufB.read];
    }

    // ---- Live faces
    if (needsFaces) {
      gl.useProgram(this.progFaces);
      this.common(this.progFaces, fp);
      this.bindTex(this.progFaces, "uVideo", 0, this.videoTex);
      this.drawTo(this.faces);
    }

    // ---- Composite
    const p = this.progComposite;
    gl.useProgram(p);
    gl.uniform3f(this.loc(p, "iResolution"), this.width, this.height, 1);
    gl.uniform1f(this.loc(p, "uIntensity"), fp.intensity);
    gl.uniform1i(this.loc(p, "uHasFfmpeg"), this.hasFfmpegFrame ? 1 : 0);
    const ss = this.sourceSize;
    const vw = ss.w || 16;
    const vh = ss.h || 9;
    gl.uniform2f(this.loc(p, "uVideoSize"), vw, vh);
    this.bindTex(p, "uVideo", 0, this.videoTex);
    this.bindTex(p, "uFaces", 1, this.faces.tex);
    this.bindTex(p, "uShader", 2, this.image.tex);
    this.bindTex(p, "uFfmpeg", 3, this.ffmpegTex);
    this.drawTo(null);

    gl.bindVertexArray(null);
    if (query && this.timerExt) {
      gl.endQuery(this.timerExt.TIME_ELAPSED_EXT);
      this.pendingQuery = query;
    }
    gl.flush();
    this.lastFrameMs = performance.now() - t0;
  }

  /**
   * Time a batch of frames honestly.
   *
   * A per-frame timer query never resolves inside a tight loop, so reading
   * lastGpuMs there just repeats a stale value. One query around the whole
   * batch resolves, and a 1x1 readPixels forces the pipeline to drain, which
   * gl.flush() and even gl.finish() do not reliably do on this driver.
   */
  async benchmark(frames: number, fp: FrameParams):
    Promise<{ wallMs: number; msPerFrame: number; fps: number; gpuMs: number | null }> {
    const gl = this.gl;
    this.suspendPerFrameQuery = true;
    if (this.pendingQuery) { gl.deleteQuery(this.pendingQuery); this.pendingQuery = null; }

    let q: WebGLQuery | null = null;
    if (this.timerExt) {
      q = gl.createQuery();
      if (q) gl.beginQuery(this.timerExt.TIME_ELAPSED_EXT, q);
    }
    const t0 = performance.now();
    for (let i = 0; i < frames; i++) {
      this.renderFrame({ ...fp, time: i / 30, frame: i });
    }
    if (q && this.timerExt) gl.endQuery(this.timerExt.TIME_ELAPSED_EXT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    const wallMs = performance.now() - t0;

    let gpuMs: number | null = null;
    if (q) {
      for (let i = 0; i < 600; i++) {
        if (gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
        await new Promise((r) => setTimeout(r, 5));
      }
      const disjoint = this.timerExt
        ? gl.getParameter(this.timerExt.GPU_DISJOINT_EXT) : false;
      if (!disjoint && gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) {
        gpuMs = (gl.getQueryParameter(q, gl.QUERY_RESULT) as number) / 1e6;
      }
      gl.deleteQuery(q);
    }
    this.suspendPerFrameQuery = false;
    return {
      wallMs: +wallMs.toFixed(2),
      msPerFrame: +(wallMs / frames).toFixed(3),
      fps: +((frames * 1000) / wallMs).toFixed(1),
      gpuMs: gpuMs === null ? null : +gpuMs.toFixed(2),
    };
  }

  /** Timer queries resolve asynchronously; read one as soon as it is ready. */
  private collectGpuQuery() {
    const gl = this.gl;
    if (!this.pendingQuery || !this.timerExt) return;
    const disjoint = gl.getParameter(this.timerExt.GPU_DISJOINT_EXT);
    const available = gl.getQueryParameter(this.pendingQuery, gl.QUERY_RESULT_AVAILABLE);
    if (available || disjoint) {
      if (available && !disjoint) {
        const ns = gl.getQueryParameter(this.pendingQuery, gl.QUERY_RESULT) as number;
        this.lastGpuMs = ns / 1e6;
      }
      gl.deleteQuery(this.pendingQuery);
      this.pendingQuery = null;
    }
  }

  dispose() {
    const gl = this.gl;
    [this.bufA?.read, this.bufA?.write, this.bufB?.read, this.bufB?.write,
      this.faces, this.image].forEach((t) => this.destroyTarget(t));
    gl.deleteTexture(this.videoTex);
    gl.deleteTexture(this.ffmpegTex);
    [this.progA, this.progB, this.progImage, this.progFaces, this.progComposite]
      .forEach((p) => gl.deleteProgram(p));
    gl.deleteVertexArray(this.vao);
  }
}
