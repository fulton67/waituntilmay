/**
 * Motion-vector transfer: drive the source's own encoded motion with the
 * shader's motion field, via ffglitch (ffgac + ffedit).
 *
 * Convention, verified against a clip panning a known 8 px/frame rather than
 * assumed: ffedit reports median mv.x = +16 on 240/240 macroblocks when the
 * content moves LEFT by 8 px. So a forward MV is
 *     mv = (reference position - current position), in HALF-PEL units.
 * Buffer A stores exactly that difference in pixels, so the shader field only
 * needs doubling.
 *
 * The faces-mode render supplies the picture the vectors start from: it is
 * what gets encoded, so the I-frame carries video-on-the-blocks and every
 * following P-frame is displaced by the shader's field.
 *
 *   node scripts/mosh-mv-transfer.mjs --src public/mosh-lab/blum-clip.mp4 \
 *     --name blum --k 1.0 [--triggers 40,120,200] [--frames N]
 */
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };

const SRC = argOf("--src", "public/mosh-lab/blum-clip.mp4");
const NAME = argOf("--name", path.basename(SRC).replace(/\.[^.]+$/, ""));
const OUTDIR = argOf("--outdir", "public/mosh-lab");
const K = Number(argOf("--k", "1.0"));            // 0 = video's own, 1 = all shader
const URL_ = argOf("--url", "http://localhost:3000/mosh-lab");
const LIMIT = argOf("--frames", null);
const TRIGGERS = (argOf("--triggers", "") || "").split(",").filter(Boolean).map(Number);
const BLOOM = Number(argOf("--bloom", "6"));      // P-frame repeats at a trigger
const FG = ".tools/ffglitch-0.10.2-windows-x86_64";
const FCODE = Number(argOf("--fcode", "7"));
const GOP = Number(argOf("--gop", "1000"));          // 1000 = one I-frame, the faces render
const DROP_I = args.includes("--drop-iframes");
const DUP_P = Number(argOf("--dup-p", "0"));      // repeat a P-VOP every N frames
const TRIGGER_WORD = argOf("--trigger-word", null);
const CLIP_START = Number(argOf("--clip-start", "0"));
const TMP = ".mosh-mv";

const sh = (c, a, o = {}) => execFileSync(c, a, { encoding: "utf8", maxBuffer: 1 << 28, ...o });
const shq = (c, a) => {
  try { return sh(c, a, { stdio: "pipe" }); }
  catch (e) {
    const msg = (e.stderr || e.stdout || e.message).toString().trim();
    console.error(`  ${path.basename(c)} failed:`);
    for (const line of msg.split(/\r?\n/).slice(-6)) console.error(`    ${line}`);
    throw e;
  }
};

const probe = (p) => {
  const d = JSON.parse(sh("ffprobe", ["-v", "error", "-select_streams", "v:0",
    "-count_frames", "-show_entries",
    "stream=width,height,r_frame_rate,nb_read_frames",
    "-show_entries", "format=duration,size", "-of", "json", p]));
  const s = d.streams[0];
  return { w: s.width, h: s.height, fps: s.r_frame_rate,
    frames: Number(s.nb_read_frames), duration: Number(d.format.duration),
    mb: Number(d.format.size) / 1e6 };
};

/** mean |mv| in half-pel, and the share of macroblocks carrying a vector */
function mvStats(json) {
  const frames = json.streams[0].frames;
  let sum = 0, n = 0, withMv = 0, blocks = 0, inter = 0, framesWithMv = 0;
  const perFrame = [];
  for (const f of frames) {
    const fwd = f.mv?.forward;
    if (!fwd) { perFrame.push(null); continue; }
    framesWithMv++;
    let fs = 0, fn = 0;
    for (const row of fwd) for (const v of row) {
      blocks++;
      if (v === null) continue;                 // intra-coded macroblock
      inter++;
      if (!Number.isFinite(v[0]) || !Number.isFinite(v[1])) continue;
      const m = Math.hypot(v[0], v[1]);
      fs += m; fn++;
      if (m > 0) withMv++;
      sum += m; n++;
    }
    perFrame.push(fn ? fs / fn : 0);
  }
  return {
    meanMag: n ? sum / n : 0,
    pctNonZero: blocks ? (withMv / blocks) * 100 : 0,
    pctInter: blocks ? (inter / blocks) * 100 : 0,
    pctIntra: blocks ? ((blocks - inter) / blocks) * 100 : 0,
    framesWithMv, blocks, perFrame,
  };
}

if (!existsSync(SRC)) { console.error(`source not found: ${SRC}`); process.exit(1); }
if (!existsSync(`${FG}/ffgac.exe`)) { console.error(`ffglitch missing at ${FG}`); process.exit(1); }
await rm(TMP, { recursive: true, force: true });
await mkdir(TMP, { recursive: true });
await mkdir(OUTDIR, { recursive: true });

const src = probe(SRC);
const NFRAMES = LIMIT ? Math.min(Number(LIMIT), src.frames) : src.frames;
console.log(`source ${path.basename(SRC)}  ${src.w}x${src.h} @ ${src.fps}  `
  + `${src.frames} frames  ${src.duration.toFixed(3)}s`);
console.log(`mix k=${K}  (0 = video's own vectors, 1 = all shader)`);

// ---- 1. faces render + shader motion field, from one deterministic pass
const facesMp4 = path.join(OUTDIR, `${NAME}-faces.mp4`);
const mvJson = path.join(TMP, "shader-mv.json");
console.log("\n--- faces render + shader motion field ---");
sh("node", ["scripts/mosh-render.mjs", "--src", SRC, "--out", facesMp4,
  "--intensity", "0.33", "--mv-out", mvJson, "--url", URL_,
  ...(LIMIT ? ["--frames", String(NFRAMES)] : [])], { stdio: "inherit" });
const shaderMv = JSON.parse(await readFile(mvJson, "utf8"));

// ---- 2. encode the faces render with ffgac, long GOP, blocks kept inter
console.log("\n--- ffgac encode (long GOP, forced inter) ---");
const gac = path.join(TMP, "faces.mpeg4");
sh(`${FG}/ffgac.exe`, ["-i", facesMp4, "-an",
  "-mpv_flags", "+nopimb+forcemv", "-qscale:v", "6",
  "-g", String(GOP), "-sc_threshold", "1000000000", "-me_range", "1023",
  // ffedit will not rewrite fcode, so the stream must be encoded with a range
  // wide enough for the shader's vectors or they corrupt the bitstream.
  // fcode 7 gives +/-1024 half-pel; fcode 1 (the default here) gives +/-16.
  "-fcode", String(FCODE),
  "-vcodec", "mpeg4", "-f", "rawvideo", "-y", gac], { stdio: "pipe" });

const vidMvJson = path.join(TMP, "video-mv.json");
shq(`${FG}/ffedit.exe`, ["-i", gac, "-f", "mv", "-e", vidMvJson]);
const vid = JSON.parse(await readFile(vidMvJson, "utf8"));
const before = mvStats(vid);
const grid = vid.streams[0].frames.find((f) => f.mv?.forward)?.mv.forward;
console.log(`encoded: ${vid.streams[0].frames.length} frames, `
  + `grid ${grid?.[0]?.length}x${grid?.length} macroblocks`);
console.log(`shader field grid ${shaderMv.cols}x${shaderMv.rows}`);

// ---- 3. replace the vectors with the shader's field
console.log("\n--- applying shader vectors ---");
let clamped = 0, touched = 0;
const frames = vid.streams[0].frames;
for (let i = 0; i < frames.length; i++) {
  const fwd = frames[i].mv?.forward;
  if (!fwd) continue;                                 // I-frame, nothing to drive
  const field = shaderMv.frames[Math.min(i, shaderMv.frames.length - 1)];
  if (!field) continue;
  const limit = Math.pow(2, FCODE + 3) - 1;   // what this fcode can represent
  for (let r = 0; r < fwd.length; r++) {
    for (let c = 0; c < fwd[r].length; c++) {
      const cur = fwd[r][c];
      if (cur === null) continue;                     // leave intra blocks alone
      const sv = field[Math.min(r, field.length - 1)]?.[Math.min(c, field[0].length - 1)];
      if (!sv) continue;
      // shader field is in pixels; MPEG forward MVs are half-pel
      const sx = sv[0] * 2, sy = sv[1] * 2;
      let nx = Math.round(cur[0] * (1 - K) + sx * K);
      let ny = Math.round(cur[1] * (1 - K) + sy * K);
      if (Math.abs(nx) > limit || Math.abs(ny) > limit) clamped++;
      nx = Math.max(-limit, Math.min(limit, nx));
      ny = Math.max(-limit, Math.min(limit, ny));
      fwd[r][c] = [nx, ny];
      touched++;
    }
  }
}
console.log(`rewrote ${touched} macroblock vectors (${clamped} clamped to +/-${Math.pow(2, FCODE + 3) - 1} half-pel, fcode ${FCODE})`);

const appliedJson = path.join(TMP, "applied-mv.json");
await writeFile(appliedJson, JSON.stringify(vid));
const applied = path.join(TMP, "applied.mpeg4");
shq(`${FG}/ffedit.exe`, ["-i", gac, "-f", "mv", "-a", appliedJson, "-o", applied]);

// read back what actually landed in the bitstream
const verifyJson = path.join(TMP, "verify-mv.json");
shq(`${FG}/ffedit.exe`, ["-i", applied, "-f", "mv", "-e", verifyJson]);
const after = mvStats(JSON.parse(await readFile(verifyJson, "utf8")));

// ---- 3b. moves: I-frame removal and blooms, both frame-count preserving
const START3 = Buffer.from([0, 0, 1]);
function parseVops(buf) {
  const pos = [];
  for (let i = 0; (i = buf.indexOf(START3, i)) >= 0; i += 3) pos.push(i);
  if (!pos.length) return { header: buf, frames: [] };
  pos.push(buf.length);
  let header = null, pending = [];
  const frames = [];
  for (let k = 0; k < pos.length - 1; k++) {
    const s0 = pos[k], e0 = pos[k + 1];
    const seg = buf.subarray(s0, e0);
    const code = buf[s0 + 3];
    if (code === 0xb6) {
      const type = (buf[s0 + 4] >> 6) & 3;          // 0 = I, 1 = P
      if (header === null) { header = Buffer.concat(pending); pending = []; }
      frames.push({ buf: Buffer.concat([...pending, seg]), type });
      pending = [];
    } else pending.push(seg);
  }
  if (pending.length && frames.length) {
    frames[frames.length - 1].buf = Buffer.concat([frames[frames.length - 1].buf, ...pending]);
  }
  return { header: header ?? Buffer.alloc(0), frames };
}

let triggers = TRIGGERS.slice();
if (TRIGGER_WORD) {
  try {
    const words = JSON.parse(await readFile("transcript/words.json", "utf8"));
    const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
    const fps = eval(src.fps);
    const dur = NFRAMES / fps;
    const hits = words.filter((w) => norm(w.word) === TRIGGER_WORD.toLowerCase()
      && w.start >= CLIP_START && w.start <= CLIP_START + dur);
    triggers = hits.map((w) => Math.round((w.start - CLIP_START) * fps));
    console.log(`
transcript triggers for "${TRIGGER_WORD}" in this window: `
      + (triggers.length ? triggers.join(", ") : "none in range"));
  } catch { console.log("  (no transcript available for triggers)"); }
}

let moved = applied;
if (DROP_I || DUP_P > 0 || triggers.length) {
  const { header, frames: vops } = parseVops(await readFile(applied));
  const out2 = vops.map((f) => f.buf);
  let dropped = 0, bloomed = 0;
  for (let i = 1; i < vops.length; i++) {
    if (DROP_I && vops[i].type === 0) {
      // replace, never delete, so the frame count is unchanged
      let j = i - 1;
      while (j > 0 && vops[j].type !== 1) j--;
      out2[i] = vops[j].buf; dropped++;
    }
  }
  // repeating a P-VOP every N frames keeps re-applying the same displacement,
  // so the shader's field compounds into a drag instead of resetting
  let duped = 0;
  if (DUP_P > 0) {
    for (let i = DUP_P; i < vops.length; i += DUP_P) {
      let donor = i - 1;
      while (donor > 0 && vops[donor].type !== 1) donor--;
      if (vops[donor].type !== 1) continue;
      out2[i] = vops[donor].buf; duped++;
    }
  }
  for (const t of triggers) {
    if (t <= 0 || t >= vops.length) continue;
    let donor = t;
    while (donor > 0 && vops[donor].type !== 1) donor--;
    for (let d = 0; d < BLOOM && t + d < vops.length; d++) {
      out2[t + d] = vops[donor].buf; bloomed++;
    }
  }
  moved = path.join(TMP, "moved.mpeg4");
  await writeFile(moved, Buffer.concat([header, ...out2]));
  console.log(`moves: ${dropped} I-frames replaced, ${duped} P-VOPs duplicated `
    + `(every ${DUP_P || "-"}), ${bloomed} frames bloomed at ${triggers.length} `
    + `trigger(s), frame count unchanged (${vops.length})`);
}

// ---- 4. back to H.264 at the source's rate and frame count
const out = path.join(OUTDIR, `${argOf("--out-name", `${NAME}-mv-transfer`)}.mp4`);
sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-fflags", "+genpts",
  "-r", src.fps, "-f", "m4v", "-i", moved,
  "-vf", `scale=${src.w}:${src.h}`, "-frames:v", String(NFRAMES),
  "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p",
  "-r", src.fps, "-movflags", "+faststart", out]);

// the shader field's own magnitude, in half-pel for comparison
let ssum = 0, sn = 0;
for (const f of shaderMv.frames) for (const row of f) for (const [x, y] of row) {
  ssum += Math.hypot(x, y) * 2; sn++;
}

const got = probe(out);
console.log("\n=== motion vectors ===");
console.log(`${"".padEnd(26)}${"mean |mv|".padStart(12)}${"non-zero".padStart(11)}${"inter".padStart(9)}${"intra".padStart(9)}`);
console.log(`${"video's own (ffgac)".padEnd(26)}${before.meanMag.toFixed(2).padStart(12)}`
  + `${(before.pctNonZero.toFixed(1) + "%").padStart(11)}${(before.pctInter.toFixed(1) + "%").padStart(9)}`
  + `${(before.pctIntra.toFixed(1) + "%").padStart(9)}`);
console.log(`${"shader-derived".padEnd(26)}${(sn ? ssum / sn : 0).toFixed(2).padStart(12)}`
  + `${"-".padStart(11)}${"-".padStart(9)}${"-".padStart(9)}`);
console.log(`${"applied (read back)".padEnd(26)}${after.meanMag.toFixed(2).padStart(12)}`
  + `${(after.pctNonZero.toFixed(1) + "%").padStart(11)}${(after.pctInter.toFixed(1) + "%").padStart(9)}`
  + `${(after.pctIntra.toFixed(1) + "%").padStart(9)}`);
console.log("(half-pel units; 2 units = 1 pixel)");

console.log("\n=== output ===");
console.log(`${out}`);
console.log(`  ${got.w}x${got.h} @ ${got.fps}  ${got.frames} frames  `
  + `${got.duration.toFixed(3)}s  ${got.mb.toFixed(2)} MB`);
console.log(`  source: ${src.frames} frames ${src.duration.toFixed(3)}s`);
const okF = got.frames === NFRAMES;
const okD = Math.abs(got.duration - NFRAMES / (eval(src.fps))) <= 1 / 24;
console.log(`  frame count matches : ${okF} (${got.frames} vs ${NFRAMES})`);
console.log(`  duration matches    : ${okD} (${got.duration.toFixed(3)}s)`);
void TRIGGERS; void BLOOM;
