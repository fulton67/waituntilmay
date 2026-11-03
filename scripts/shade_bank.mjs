/**
 * Shade every clip in the bank with the published look.
 *
 * This is the whole look, applied once per clip instead of once per version:
 * a hundred-odd clips against thirty versions of ten clips each, so the
 * expensive work happens about three times less often, and a version becomes
 * a stitch of already-shaded frames.
 *
 * It does NOT reimplement the look. The two halves of it are the two that
 * exist:
 *
 *   the layers      ffgac and ffedit, exactly as scripts/exchange-mosh.mjs
 *                   builds them, through the same scripts/lib/mvfield.mjs.
 *                   A is the footage's own vectors multiplied by a gain
 *                   built from the clip's word envelope times the damage
 *                   curve; B is a fold of the clip answering the same field
 *                   with a longer memory; C is the clip untouched.
 *   the composite   /mosh-lab/tune itself, driven in render mode over this
 *                   clip's manifest. Same page, same WebGL programs, same
 *                   config - the preview and the shaded bank cannot drift
 *                   apart, because there is one implementation.
 *
 * What is cached, and why that is the whole speed story
 * ----------------------------------------------------
 * Moving a slider changes the gain, not the footage. The two ffgac encodes,
 * the pixel-domain fold and the two ffedit exports depend only on the clip,
 * so they live in bank/prep/<id>/ and survive every slider change - which is
 * what the vector cache is: the exported field, read back as JSON, ready for
 * the gain to be applied to it. A re-shade pays for the amplify, the
 * response, the decode and the composite, and nothing else.
 *
 *   node scripts/shade_bank.mjs
 *   node scripts/shade_bank.mjs --only blum_00547682 --force
 *   node scripts/shade_bank.mjs --prep-only
 *   node scripts/shade_bank.mjs --force --force-prep   (a clip was recut)
 *
 * Needs the dev server up for /mosh-lab/tune.
 */
import { chromium } from "@playwright/test";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { EXCHANGE, makeGain, readField, respond } from "./lib/mvfield.mjs";

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };

const LOOK = argOf("--look", "journey/look.json");
const BANKJSON = argOf("--bank", "bank/bank.json");
const BANKDIR = argOf("--bankdir", "bank");
const ONLY = (argOf("--only", "") || "").split(",").filter(Boolean);
const LIMIT = Number(argOf("--limit", "0"));
const URL_BASE = argOf("--url", "http://localhost:3000/mosh-lab/tune");
const FORCE = has("--force");
// --force re-shades; it does not rebuild the prep. The prep is the vector
// cache and a slider cannot change it, so throwing it away on every forced
// re-shade would be throwing away the thing that makes a re-shade cheap.
// --force-prep is for when the clip itself has been recut.
const FORCE_PREP = has("--force-prep");
const PREP_ONLY = has("--prep-only");
const HEADED = has("--headed");
const KEEP = has("--keep-work");
// JPEG quality for the shaded frames, 0-1. The bank is an intermediate that
// a version is stitched out of, so it is kept high.
const QUALITY = Number(argOf("--q", "0.9"));
/**
 * How many frames cross the wire at once.
 *
 * Measured one frame at a time: 37.7 ms to fetch a frame's three layers,
 * 38.2 ms to post the result, 19.1 ms to render it. Both HTTP numbers were
 * flat regardless of how many bytes moved and did not budge when Nagle or
 * vsync were turned off, so they are per-request latency rather than
 * throughput - and the fix for per-request latency is fewer requests. A
 * batch of eight carries 22 MB in and 7 MB out and amortises both.
 */
const BATCH = Math.max(1, Number(argOf("--batch", "8")));
const FG = ".tools/ffglitch-0.10.2-windows-x86_64";
const FCODE = 7, FCODE_RANGE = 1023, MB = 16;
const WORK = ".shade";

/** execFileSync, with the tool's own complaint on the way out. */
function sh(c, a, o = {}) {
  try {
    return execFileSync(c, a, {
      encoding: "buffer", maxBuffer: 1 << 29,
      stdio: ["ignore", "pipe", "pipe"], ...o,
    });
  } catch (e) {
    const msg = (e.stderr ?? e.stdout ?? Buffer.from(""))
      .toString("utf8").trim().split(/\r?\n/).slice(-6).join(" | ");
    throw new Error(`${path.basename(c)} failed: ${msg || e.message}`);
  }
}
const now = () => Number(process.hrtime.bigint() / 1000000n);

if (!existsSync(`${FG}/ffgac.exe`)) throw new Error(`ffglitch missing at ${FG}`);

/* ------------------------------------------------------------ the inputs */
// The hash of the file's bytes, with line endings normalised first - see
// pipeline/bank.py's look_hash, which has to agree with this exactly.
const lookBytes = readFileSync(LOOK);
const HASH = createHash("sha256")
  .update(Buffer.from(lookBytes.toString("binary").split("\r\n").join("\n"),
    "binary"))
  .digest("hex").slice(0, 8);
const look = JSON.parse(lookBytes.toString("utf8"));
const bank = JSON.parse(await readFile(BANKJSON, "utf8"));
const OUTDIR = path.join(BANKDIR, `look-${HASH}`);
const PREPDIR = path.join(BANKDIR, "prep");

let clips = bank.clips;
if (ONLY.length) clips = clips.filter((c) => ONLY.includes(c.id));
if (LIMIT) clips = clips.slice(0, LIMIT);

const P = { ...EXCHANGE, ...(look.exchange ?? {}) };
const CLAMP = Math.min(FCODE_RANGE, Math.round(P.clampPx * 2));
const CURVE = look.damageCurve ?? [];
const STRENGTH = look.underlayer?.strength ?? 1;

console.log(`look ${LOOK}  hash ${HASH}`);
console.log(`  fold ${look.fold?.amount} (${look.fold?.where}, `
  + `centre ${look.fold?.center})   underlayer strength ${STRENGTH}`);
console.log(`  curve ${look.curveEnabled ? "on" : "off"}`
  + `${look.curveEnabled && look.curveBlend ? ", blended with the words" : ""}`
  + `   amplify ${P.amplify}  accum ${P.accum}`
  + `  under ${P.bResponse}/${P.bAccum}`);
console.log(`${clips.length} clips -> ${OUTDIR}`);

await mkdir(OUTDIR, { recursive: true });
await mkdir(PREPDIR, { recursive: true });

/* ---------------------------------------------------------------- the env */
function envOf(clip) {
  const p = path.join(BANKDIR, "env", `${clip.id}.json`);
  if (!existsSync(p)) {
    throw new Error(`no envelope for ${clip.id}; run scripts/bank_env.py`);
  }
  return JSON.parse(readFileSync(p, "utf8"));
}

/**
 * The follower, exactly as the page runs it, because the gain the vectors
 * get and the envelope the composite gets have to be the same number.
 *
 * The page's own followEnvelope is TypeScript inside a React component; this
 * is the same recursion over the same two arrays with the same three
 * constants, and the shaded output is checked against the preview rather
 * than this being taken on trust.
 */
function followed(env, cfg) {
  const r = cfg.reveals ?? {};
  const n = env.rawNoLoudness.length;
  const lw = r.loudnessWeight ?? 0.35;
  const ka = 1 - Math.exp(-1 / Math.max(r.attack ?? 3, 0.5));
  const kr = 1 - Math.exp(-1 / Math.max((r.release ?? 1.5) * env.fps, 1));
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    raw[i] = Math.min(1, Math.max(0,
      (env.rawNoLoudness[i] ?? 0) + lw * (env.loudness[i] ?? 0)));
  }
  for (const t of env.triggers ?? []) if (t >= 0 && t < n) raw[t] = 1;
  const out = new Float32Array(n);
  let e = 0;
  for (let i = 0; i < n; i++) {
    const tgt = raw[i];
    e += (tgt - e) * (tgt > e ? ka : kr);
    out[i] = Math.min(1, Math.max(0, e * (r.gain ?? 1)));
  }
  // The hand-drawn curve, the way the page blends it: it replaces the word
  // envelope or is averaged with it. Production averages, so a clip with a
  // concept word in it peaks and a clip without one still breathes.
  if (!cfg.curveEnabled || !CURVE.length) return out;
  const at = (f) => {
    const x = (f / Math.max(n - 1, 1)) * (CURVE.length - 1);
    const i = Math.floor(x), fr = x - i;
    const a = CURVE[i], b = CURVE[Math.min(CURVE.length - 1, i + 1)];
    return a + (b - a) * fr;
  };
  const blend = cfg.curveBlend !== false;
  const mixed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    mixed[i] = blend ? (at(i) + out[i]) * 0.5 : at(i);
  }
  return mixed;
}

/* --------------------------------------------------------------- the prep */
/**
 * Everything about a clip that a slider cannot change.
 *
 * One keyframe, at the head of the clip. The lab puts keyframes where the
 * damage curve dips, which is a property of the look and would make this
 * cache depend on the sliders; a bank clip is two to four seconds, so its
 * own first frame is the natural place for its only I-VOP, and everything
 * after it integrates across the phrase. A version then gets a keyframe at
 * every cut for free, which is what keeps the drag from running across an
 * edit that is not supposed to carry it.
 */
function prep(clip) {
  const dir = path.join(PREPDIR, clip.id);
  const p = (f) => path.join(dir, f);
  const stampFile = p("prep.json");
  if (existsSync(stampFile) && !FORCE_PREP) {
    const d = JSON.parse(readFileSync(stampFile, "utf8"));
    if (d.done && d.frames === clip.frames) return { ...d, cached: true, ms: 0 };
  }
  const t0 = now();
  mkdirSync(dir, { recursive: true });
  const src = clip.clean;
  const W = 640, H = 360, N = clip.frames, FPS = bank.fps;
  const stamps = ["0.000000"];

  // layer A's encode: no +forcemv, so a still macroblock is coded as
  // nothing and a null has nothing to multiply
  sh(`${FG}/ffgac.exe`, ["-i", src, "-an", "-mpv_flags", "+nopimb",
    "-g", "max", "-sc_threshold", "max", "-qscale:v", "3",
    "-me_range", "1023", "-fcode", String(FCODE),
    "-force_key_frames", stamps.join(","), "-frames:v", String(N),
    "-vcodec", "mpeg4", "-f", "m4v", "-y", p("cleanA.m4v")]);

  // the fold, in the pixel domain: the frame mirrored into itself at three
  // zooms with the centre drifting. The lab's fractal fold is a shader and
  // belongs to the composite; this is the picture B is made of.
  sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", src,
    "-filter_complex",
    "[0:v]split=4[s0][s1][s2][s3];"
    + `[s1]scale=iw*1.7:ih*1.7,crop=${W}:${H}:`
    + `'(iw-${W})/2+90*sin(t*0.63)':'(ih-${H})/2+50*cos(t*0.41)',hflip[f1];`
    + `[s2]scale=iw*2.8:ih*2.8,crop=${W}:${H}:`
    + `'(iw-${W})/2+140*sin(t*0.29+1.7)':'(ih-${H})/2+80*sin(t*0.53)',vflip[f2];`
    + `[s3]scale=iw*4.6:ih*4.6,crop=${W}:${H}:`
    + `'(iw-${W})/2+220*cos(t*0.17)':'(ih-${H})/2+120*sin(t*0.23+0.6)',`
    + "hflip,vflip[f3];"
    + "[s0][f1]blend=all_mode=average[b1];"
    + "[b1][f2]blend=all_mode=average[b2];"
    + "[b2][f3]blend=all_mode=average,format=yuv420p[fold]",
    "-map", "[fold]", "-frames:v", String(N), "-c:v", "libx264",
    "-preset", "medium", "-crf", "14", "-pix_fmt", "yuv420p", p("fold.mp4")]);

  // layer B's encode does carry +forcemv, because every macroblock of it
  // has to be able to accept a transferred vector
  sh(`${FG}/ffgac.exe`, ["-i", p("fold.mp4"), "-an",
    "-mpv_flags", "+forcemv+nopimb",
    "-g", "max", "-sc_threshold", "max", "-qscale:v", "3",
    "-me_range", "1023", "-fcode", String(FCODE),
    "-force_key_frames", stamps.join(","), "-frames:v", String(N),
    "-vcodec", "mpeg4", "-f", "m4v", "-y", p("cleanB.m4v")]);

  // THE VECTOR CACHE: what the encoder said before anything touched it,
  // and the structure B's field gets written back into. Both are pure
  // functions of the clip, so a slider change reads them off disk.
  sh(`${FG}/ffedit.exe`, ["-i", p("cleanA.m4v"), "-f", "mv",
    "-e", p("cleanA-mv.json")]);
  sh(`${FG}/ffedit.exe`, ["-i", p("cleanB.m4v"), "-f", "mv",
    "-e", p("B-tmpl.json")]);

  const d = { done: true, frames: N, fps: FPS, w: W, h: H,
    cols: Math.ceil(W / MB), rows: Math.ceil(H / MB),
    built: new Date().toISOString() };
  writeFileSync(stampFile, JSON.stringify(d, null, 1));
  return { ...d, cached: false, ms: now() - t0 };
}

/* ------------------------------------------------------- the shaded layers */
/**
 * A and B for one clip under this look, as raw RGBA planes in memory.
 *
 * Decoded straight out of the elementary streams rather than through an
 * H.264 intermediate: the lab encodes A and B to mp4 because a browser has
 * to be able to play them, and nothing here has to. One generation of
 * compression fewer, and the decode is the cheaper half of it.
 */
function layers(clip, pre) {
  const dir = path.join(PREPDIR, clip.id);
  const p = (f) => path.join(dir, f);
  const w = path.join(WORK, clip.id);
  const q = (f) => path.join(w, f);
  mkdirSync(w, { recursive: true });
  const N = pre.frames, NB = pre.cols * pre.rows;
  const t = {};

  const env = envOf(clip);
  const E = followed(env, look);
  const hits = (env.conceptHits ?? []).map((h) => h.frame).filter((f) => f < N);
  const { gain } = makeGain({ env: E, curve: CURVE, hits, frames: N, p: P });

  let t0 = now();
  // ---- the surface: multiply the encoder's own vectors by the gain
  const sp = JSON.stringify({
    gainsK: Array.from(gain, (g) => Math.round(g * 1000)),
    accumK: Math.round(P.accum * 1000),
    clamp: CLAMP,
  });
  sh(`${FG}/ffedit.exe`, ["-i", p("cleanA.m4v"), "-f", "mv",
    "-s", "scripts/ffedit/amplify.js", "-sp", sp, "-o", q("A.m4v"), "-y"]);
  sh(`${FG}/ffedit.exe`, ["-i", q("A.m4v"), "-f", "mv", "-e", q("A-mv.json")]);
  const A = readField(JSON.parse(readFileSync(q("A-mv.json"), "utf8")),
    N, pre.cols, pre.rows);
  t.amplify = now() - t0;

  // ---- the underlayer: the same field, answered slower
  t0 = now();
  const isKey = (f) => f === 0;
  const B = respond(A, { response: P.bResponse, accum: P.bAccum,
    smooth: P.bSmooth, isKey, clamp: CLAMP });
  const bdoc = JSON.parse(readFileSync(p("B-tmpl.json"), "utf8"));
  let bSet = 0, bNull = 0;
  for (let f = 0; f < N; f++) {
    const fr = bdoc.streams[0].frames[f];
    const fwd = fr?.mv?.forward;
    if (!fwd) continue;
    fr.mv.overflow = "truncate";
    const off = f * NB;
    for (let by = 0; by < pre.rows; by++) {
      const row = fwd[by];
      if (!row) continue;
      for (let bx = 0; bx < pre.cols; bx++) {
        const v = row[bx];
        if (v === null) { bNull++; continue; }
        const k = off + by * pre.cols + bx;
        const vx = Math.round(B.x[k]), vy = Math.round(B.y[k]);
        // a 4MV macroblock exports as four pairs; all four get the vector
        if (Array.isArray(v[0])) for (const z of v) { z[0] = vx; z[1] = vy; }
        else { v[0] = vx; v[1] = vy; }
        bSet++;
      }
    }
  }
  const bjson = q("B-mv.json");
  writeFileSync(bjson, JSON.stringify(bdoc));
  sh(`${FG}/ffedit.exe`, ["-i", p("cleanB.m4v"), "-f", "mv",
    "-a", bjson, "-o", q("B.m4v"), "-y"]);
  t.respond = now() - t0;

  // ---- the motion field the bloom pass feeds on, as the renderer wants it:
  // four int32 (frames, rows, cols, 2) then float32 x,y per block, in
  // PIXELS. B's field is half-pel, which is what a motion vector is, so it
  // is halved here rather than anywhere the shader can see.
  const head = Buffer.alloc(16);
  head.writeInt32LE(N, 0); head.writeInt32LE(pre.rows, 4);
  head.writeInt32LE(pre.cols, 8); head.writeInt32LE(2, 12);
  const body = Buffer.alloc(N * NB * 2 * 4);
  for (let f = 0; f < N; f++) {
    for (let k = 0; k < NB; k++) {
      const i = f * NB + k;
      body.writeFloatLE(B.x[i] / 2, (i * 2) * 4);
      body.writeFloatLE(B.y[i] / 2, (i * 2 + 1) * 4);
    }
  }
  const mvbin = Buffer.concat([head, body]);

  // ---- the three layers as raw planes
  t0 = now();
  // rgb24, not rgba: every layer here is opaque and the alpha byte is a
  // quarter of everything that crosses the wire.
  const rawOf = (argsIn) => sh("ffmpeg", ["-hide_banner", "-loglevel", "error",
    ...argsIn, "-frames:v", String(N), "-f", "rawvideo", "-pix_fmt", "rgb24",
    "-"]);
  const fromStream = (f) => ["-fflags", "+genpts", "-r", String(pre.fps),
    "-f", "m4v", "-i", f];
  const planes = {
    a: rawOf(fromStream(q("A.m4v"))),
    b: rawOf(fromStream(q("B.m4v"))),
    c: rawOf(["-i", clip.clean]),
  };
  t.decode = now() - t0;

  const stride = pre.w * pre.h * 3;
  for (const [k, v] of Object.entries(planes)) {
    if (v.length < stride * N) {
      throw new Error(`${clip.id}: layer ${k} decoded `
        + `${Math.floor(v.length / stride)} of ${N} frames`);
    }
  }
  return { planes, mvbin, stride, env, E, gain, bSet, bNull, t };
}

/* ------------------------------------------------------------ the server */
/**
 * Everything the page needs, over loopback and out of the way.
 *
 * Playwright can fulfil a request itself, and the lab's offline renderer
 * does exactly that, but every frame then crosses the debugging protocol as
 * base64 - three layers in and one picture out, four megabytes a frame.
 * These are ordinary HTTP requests to a socket on the same machine, so the
 * bytes stay bytes.
 */
let state = null;            // {clip, pre, lay, outdir, written}
const srv = createServer((req, res) => {
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  };
  if (req.method === "OPTIONS") { res.writeHead(204, cors); res.end(); return; }
  const u = new URL(req.url, "http://127.0.0.1");
  const parts = u.pathname.split("/").filter(Boolean);
  if (!state) { res.writeHead(409, cors); res.end("no clip loaded"); return; }
  const [kind, id, ...rest] = parts;
  if (id !== state.clip.id) {
    res.writeHead(404, cors); res.end(`${id} is not loaded`); return;
  }
  if (kind === "tune") {
    res.writeHead(200, { ...cors, "content-type": "application/json" });
    res.end(JSON.stringify({
      ...state.lay.env,
      layers: { a: "", b: "", c: "" },
      mvBin: `${BASE}/mv/${id}`,
    }));
    return;
  }
  if (kind === "mv") {
    res.writeHead(200, { ...cors, "content-type": "application/octet-stream" });
    res.end(state.lay.mvbin);
    return;
  }
  if (kind === "raw3") {
    // A run of frames, all three layers each, in one response: the layers
    // are always wanted together and a batch is always wanted in order.
    const from = Math.max(0, Number(rest[0]) || 0);
    const count = Math.max(1, Math.min(Number(rest[1]) || 1,
      state.pre.frames - from));
    const st = state.lay.stride;
    const p3 = state.lay.planes;
    const parts = [];
    for (let f = from; f < from + count; f++) {
      const off = f * st;
      parts.push(p3.a.subarray(off, off + st));
      parts.push(p3.b.subarray(off, off + st));
      parts.push(p3.c.subarray(off, off + st));
    }
    res.writeHead(200, { ...cors, "content-type": "application/octet-stream" });
    res.end(Buffer.concat(parts));
    return;
  }
  if (kind === "out" && req.method === "POST") {
    // A batch of JPEGs: int32 length per frame, then the frames. Written
    // straight to the look directory - the page has already encoded them,
    // so there is nothing left for ffmpeg to do.
    const from = Math.max(0, Number(rest[0]) || 0);
    const count = Math.max(1, Number(rest[1]) || 1);
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      let off = count * 4;
      try {
        for (let k = 0; k < count; k++) {
          const len = body.readInt32LE(k * 4);
          const name = `f_${String(from + k).padStart(5, "0")}.jpg`;
          writeFileSync(path.join(state.outdir, name),
            body.subarray(off, off + len));
          off += len;
          state.written++;
        }
      } catch (e) {
        res.writeHead(500, cors); res.end(String(e.message)); return;
      }
      res.writeHead(204, cors); res.end();
    });
    return;
  }
  res.writeHead(404, cors); res.end("no");
});
/**
 * Nagle off.
 *
 * Measured before this line: 39.2 ms to fetch a frame's three layers and
 * 39.7 ms to post the result, against 18.2 ms to actually render it. Two
 * stalls of almost exactly 40 ms is the delayed-ACK timer, which is what
 * Nagle's algorithm produces when a request is written in more than one
 * segment and the other end is waiting to piggyback its acknowledgement.
 * Nothing here benefits from coalescing - every message is already a
 * megabyte - so it is turned off and both numbers collapse.
 */
srv.on("connection", (s) => s.setNoDelay(true));
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const PORT = srv.address().port;
const BASE = `http://127.0.0.1:${PORT}`;
console.log(`serving layers on ${BASE}`);

/* ----------------------------------------------------------- the browser */
let browser = null, page = null;
async function openPage() {
  browser = await chromium.launch({
    headless: !HEADED,
    args: ["--autoplay-policy=no-user-gesture-required", "--use-angle=d3d11",
      "--ignore-gpu-blocklist", "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      // nothing here is being watched, so there is no reason for the
      // renderer to pace itself to a display's refresh
      "--disable-gpu-vsync", "--disable-frame-rate-limit"],
  });
  page = await browser.newPage({
    viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1,
  });
  page.on("pageerror", (e) => console.error("  page error:", e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.error("  console:", m.text());
  });
  // The first clip's manifest has to exist before the page mounts, so the
  // page is pointed at it and every clip after it is swapped in place.
  await page.goto(`${URL_BASE}?render=1&data=${encodeURIComponent(`${BASE}/tune/${state.clip.id}`)}`,
    { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction(() => window.__tune?.ready === true, null,
    { timeout: 60000 });
  await page.evaluate(() => {
    document.querySelectorAll(".mt-sources video").forEach((v) => v.pause());
  });
  await page.evaluate((c) => window.__tune.setConfig(c), look);
  const got = await page.evaluate(() => window.__tune.getConfig());
  for (const k of ["squares", "reveals", "bloom", "fold", "inside", "life",
    "underlayer"]) {
    if (JSON.stringify(got[k]) !== JSON.stringify(look[k])) {
      throw new Error(`the page did not take "${k}": sent `
        + `${JSON.stringify(look[k])}, live ${JSON.stringify(got[k])}`);
    }
  }
  console.log("config verified in the page");
}

/* -------------------------------------------------------------- one clip */
async function shade(clip, i) {
  const outdir = path.join(OUTDIR, clip.id);
  const stamp = path.join(outdir, "shade.json");
  if (existsSync(stamp) && !FORCE) {
    const d = JSON.parse(readFileSync(stamp, "utf8"));
    if (d.frames === clip.frames) return { ...d, cached: true };
  }
  const pre = prep(clip);
  if (PREP_ONLY) return { id: clip.id, prep_ms: pre.ms, cached: pre.cached };

  const t0 = now();
  const lay = layers(clip, pre);
  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });

  state = { clip, pre, lay, outdir, written: 0 };

  if (!page) await openPage();
  else {
    const t1 = now();
    await page.evaluate(async (url) => { await window.__tune.loadData(url); },
      `${BASE}/tune/${clip.id}`);
    await page.waitForFunction(
      (want) => window.__tune?.name === want.id
        && window.__tune?.frames === want.n,
      { id: clip.id, n: pre.frames }, { timeout: 30000 });
    await page.evaluate((c) => window.__tune.setConfig(c), look);
    lay.t.load = now() - t1;
  }
  await page.evaluate(() => window.__tune.resetBloom());

  // The whole per-frame loop runs INSIDE the page. Driving it from Node
  // would put a debugging-protocol round trip between every frame and the
  // next; this way the only thing crossing it is the timing summary.
  const tR = now();
  const run = await page.evaluate(async (a) => {
    const t = { fetch: 0, render: 0, grab: 0, post: 0 };
    const out = [];
    // rgb24: three bytes a pixel, matching what the server decodes.
    const stride = a.w * a.h * 3;
    for (let from = 0; from < a.n; from += a.batch) {
      const count = Math.min(a.batch, a.n - from);
      let t0 = performance.now();
      const all = new Uint8Array(await (await fetch(
        `${a.base}/raw3/${a.id}/${from}/${count}`)).arrayBuffer());
      t.fetch += performance.now() - t0;
      const jpegs = [];
      for (let k = 0; k < count; k++) {
        const base = k * stride * 3;
        t0 = performance.now();
        out.push(window.__tune.renderRaw(from + k,
          all.subarray(base, base + stride),
          all.subarray(base + stride, base + stride * 2),
          all.subarray(base + stride * 2, base + stride * 3), a.w, a.h));
        t.render += performance.now() - t0;
        t0 = performance.now();
        jpegs.push(await window.__tune.grabJpeg(a.quality));
        t.grab += performance.now() - t0;
      }
      t0 = performance.now();
      const total = jpegs.reduce((acc, j) => acc + j.length, 0);
      const back = new Uint8Array(count * 4 + total);
      const lens = new DataView(back.buffer, 0, count * 4);
      let at = count * 4;
      for (let k = 0; k < count; k++) {
        lens.setInt32(k * 4, jpegs[k].length, true);
        back.set(jpegs[k], at);
        at += jpegs[k].length;
      }
      const r = await fetch(`${a.base}/out/${a.id}/${from}/${count}`,
        { method: "POST", body: back });
      if (!r.ok) throw new Error(`frames ${from}+${count}: ${r.status} `
        + `${await r.text()}`);
      t.post += performance.now() - t0;
    }
    for (const k of Object.keys(t)) t[k] = Math.round(t[k]);
    return { cov: out, t };
  }, { base: BASE, id: clip.id, n: pre.frames, w: pre.w, h: pre.h,
    batch: BATCH, quality: QUALITY });
  const cov = run.cov;
  lay.t.render = now() - tR;
  lay.inside = run.t;

  const split = await page.evaluate(() => window.__tune.damageSplit());
  const dbg = await page.evaluate(() => window.__tune.debug());

  lay.t.encode = 0;   // the page encoded as it went

  const files = (await readdir(outdir)).filter((f) => f.endsWith(".jpg"));
  if (files.length !== pre.frames) {
    throw new Error(`${clip.id}: ${files.length} frames written, `
      + `${pre.frames} expected`);
  }
  state = null;
  if (!KEEP) await rm(path.join(WORK, clip.id), { recursive: true, force: true });

  const mean = cov.reduce((a, b) => a + b, 0) / cov.length;
  const rec = {
    id: clip.id, source: clip.source, frames: pre.frames,
    look: HASH,
    coverage_mean_pct: +(mean * 100).toFixed(3),
    coverage_max_pct: +(Math.max(...cov) * 100).toFixed(3),
    env_mean: +(lay.E.reduce((a, b) => a + b, 0) / lay.E.length).toFixed(4),
    env_max: +Math.max(...lay.E).toFixed(4),
    gain_min: +Math.min(...lay.gain).toFixed(2),
    gain_max: +Math.max(...lay.gain).toFixed(2),
    concept_hits: (lay.env.conceptHits ?? []).length,
    underlayer_blocks_set: lay.bSet, underlayer_blocks_null: lay.bNull,
    damage_split: split, debug: dbg,
    ms: { prep: pre.ms, ...lay.t, total: now() - t0 },
    ms_in_page: lay.inside,
    prep_cached: pre.cached,
  };
  await writeFile(stamp, JSON.stringify(rec, null, 1));
  const m = rec.ms;
  console.log(`${String(i + 1).padStart(3)}/${clips.length} ${clip.id.padEnd(22)}`
    + ` ${String(pre.frames).padStart(3)}f`
    + `  prep ${String(m.prep || 0).padStart(5)}`
    + `  amp ${String(m.amplify).padStart(4)}`
    + `  resp ${String(m.respond).padStart(4)}`
    + `  dec ${String(m.decode).padStart(4)}`
    + `  render ${String(m.render).padStart(5)}`
    + `  enc ${String(m.encode).padStart(4)}`
    + `  = ${String(m.total).padStart(6)}ms`
    + `  cov ${rec.coverage_mean_pct.toFixed(1)}%`
    + `  gain ${rec.gain_min}-${rec.gain_max}`);
  return rec;
}

/* ------------------------------------------------------------------ main */
await mkdir(WORK, { recursive: true });
const t0 = now();
const recs = [];
try {
  // The page is opened against the first clip's own manifest, inside
  // shade(), so there is never a moment where it is mounted on nothing.
  for (let i = 0; i < clips.length; i++) {
    recs.push(await shade(clips[i], i));
  }
} finally {
  if (browser) await browser.close();
  srv.close();
  if (!KEEP) await rm(WORK, { recursive: true, force: true });
}

const done = recs.filter((r) => r.ms);
const tot = now() - t0;
const sum = (k) => done.reduce((a, r) => a + (r.ms[k] || 0), 0);
console.log("");
console.log("=".repeat(72));
console.log(`SHADED ${done.length} clips in ${(tot / 1000).toFixed(1)}s`
  + `  (${recs.filter((r) => r.cached).length} already shaded)`);
if (done.length) {
  const totals = done.map((r) => r.ms.total).sort((a, b) => a - b);
  console.log(`per clip  min ${totals[0]}ms  median `
    + `${totals[totals.length >> 1]}ms  max ${totals[totals.length - 1]}ms`);
  const warm = done.reduce((a, r) => a + (r.ms.total - (r.ms.prep || 0)), 0);
  console.log(`  prep ${(sum("prep") / 1000).toFixed(1)}s`
    + `  amplify ${(sum("amplify") / 1000).toFixed(1)}s`
    + `  respond ${(sum("respond") / 1000).toFixed(1)}s`
    + `  decode ${(sum("decode") / 1000).toFixed(1)}s`
    + `  load ${(sum("load") / 1000).toFixed(1)}s`
    + `  render ${(sum("render") / 1000).toFixed(1)}s`
    + `  encode ${(sum("encode") / 1000).toFixed(1)}s`);
  console.log(`a re-shade skips the prep: ${(warm / 1000).toFixed(1)}s for `
    + `the bank, ${(warm / done.length).toFixed(0)}ms a clip, against `
    + `${(done.reduce((a, r) => a + r.ms.total, 0) / done.length).toFixed(0)}`
    + `ms cold`);
  const frames = done.reduce((a, r) => a + r.frames, 0);
  console.log(`${frames} frames shaded, `
    + `${(sum("render") / Math.max(frames, 1)).toFixed(1)} ms/frame in the composite`);
  const ins = (k) => done.reduce((a, r) => a + ((r.ms_in_page || {})[k] || 0), 0)
    / Math.max(frames, 1);
  console.log(`  of which, per frame: fetch ${ins("fetch").toFixed(1)}ms`
    + `  render ${ins("render").toFixed(1)}ms`
    + `  readback ${ins("grab").toFixed(1)}ms`
    + `  post ${ins("post").toFixed(1)}ms`);
}
await writeFile(path.join(OUTDIR, "shade.json"), JSON.stringify({
  look: HASH, look_file: LOOK, bank: BANKJSON,
  built: new Date().toISOString(),
  clips: recs.length, seconds: +(tot / 1000).toFixed(1),
  fold: look.fold, underlayer: look.underlayer,
  curveEnabled: look.curveEnabled, curveBlend: look.curveBlend,
  per_clip: recs,
}, null, 1));
console.log(`\n-> ${path.join(OUTDIR, "shade.json")}`);
