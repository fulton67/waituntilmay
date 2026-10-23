/**
 * Which frame of a render is closest to a reference still.
 *
 * The references are screenshots, so they cannot be compared pixel to
 * pixel with anything. What can be compared is the thing being judged:
 * how much of the frame is grain, and how big the grain is. A flipped
 * pixel departs sharply from the median of its neighbours and a
 * photographed surface does not, which is what the detector below uses -
 * the same quantity on both sides, measured the same way.
 *
 * It also reports the split the render knows and the screenshot does not:
 * how much of the moving figure, and how much of the still background,
 * was exchanged on that frame.
 *
 *   node scripts/exchange-closest.mjs --render public/mosh-lab/x.mp4 \
 *     --src public/mosh-lab/journey-30s.mp4 --mask .exchange-journey/g1 \
 *     --refs public/mosh-lab/refs/love-1.png,...
 */
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const RENDER = argOf("--render", "public/mosh-lab/journey-30s-exchange.mp4");
const SRC = argOf("--src", "public/mosh-lab/journey-30s.mp4");
const MASKDIR = argOf("--mask", ".exchange-journey/g1");
const REFS = argOf("--refs", "").split(",").filter(Boolean);
const STEP = Number(argOf("--step", "2"));
const TMP = argOf("--tmp", ".exchange-closest");
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

const sh = (c, a) => execFileSync(c, a, { encoding: "utf8", maxBuffer: 1 << 28 });
const probe = (f) => {
  const d = JSON.parse(sh("ffprobe", ["-v", "error", "-select_streams", "v:0",
    "-count_frames", "-show_entries", "stream=width,height,nb_read_frames",
    "-of", "json", f]));
  return d.streams[0];
};

/** The grain detector: a pixel that jumps away from its own 3x3 median. */
function grainOf(buf, W, H, T = 26) {
  const m = new Uint8Array(W * H);
  const win = new Uint8Array(9);
  let on = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let c = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy < 0 || yy >= H || xx < 0 || xx >= W) continue;
      win[c++] = buf[yy * W + xx];
    }
    const s = win.subarray(0, c).slice().sort();
    const k = y * W + x;
    if (Math.abs(buf[k] - s[c >> 1]) > T) { m[k] = 1; on++; }
  }
  return { m, on };
}

function clusters(m, W, H) {
  const seen = new Uint8Array(W * H), st = new Int32Array(W * H);
  let cl = 0, tot = 0, big = 0;
  for (let i = 0; i < W * H; i++) {
    if (!m[i] || seen[i]) continue;
    let sp = 0, sz = 0; st[sp++] = i; seen[i] = 1;
    while (sp > 0) {
      const k = st[--sp]; sz++;
      const x = k % W, y = (k - x) / W;
      if (x > 0 && m[k - 1] && !seen[k - 1]) { seen[k - 1] = 1; st[sp++] = k - 1; }
      if (x < W - 1 && m[k + 1] && !seen[k + 1]) { seen[k + 1] = 1; st[sp++] = k + 1; }
      if (y > 0 && m[k - W] && !seen[k - W]) { seen[k - W] = 1; st[sp++] = k - W; }
      if (y < H - 1 && m[k + W] && !seen[k + W]) { seen[k + W] = 1; st[sp++] = k + W; }
    }
    cl++; tot += sz; if (sz > big) big = sz;
  }
  return { clusters: cl, mean: cl ? tot / cl : 0, biggest: big };
}

/* ------------------------------------------------- the references first */
const refStats = [];
for (const r of REFS) {
  const s = probe(r);
  const raw = path.join(TMP, path.basename(r) + ".gray");
  sh("ffmpeg", ["-v", "error", "-y", "-i", r, "-f", "rawvideo",
    "-pix_fmt", "gray", raw]);
  const b = readFileSync(raw);
  const g = grainOf(b, s.width, s.height);
  const c = clusters(g.m, s.width, s.height);
  refStats.push({ file: r, w: s.width, h: s.height,
    coverage: 100 * g.on / (s.width * s.height), cluster: c.mean,
    biggest: c.biggest });
}

/* ------------------------------------------------------------ the render */
const rs = probe(RENDER);
const W = rs.width, H = rs.height, px = W * H;
const N = Number(rs.nb_read_frames);
const rawR = path.join(TMP, "render.gray");
sh("ffmpeg", ["-v", "error", "-y", "-i", RENDER, "-f", "rawvideo",
  "-pix_fmt", "gray", rawR]);
const R = readFileSync(rawR);
const rawS = path.join(TMP, "src.gray");
sh("ffmpeg", ["-v", "error", "-y", "-i", SRC, "-frames:v", String(N),
  "-f", "rawvideo", "-pix_fmt", "gray", rawS]);
const S = readFileSync(rawS);
const maskPath = path.join(MASKDIR, "exchange.raw");
const MK = existsSync(maskPath) ? readFileSync(maskPath) : null;

// the figure, the same way the render measures it: what moved in the last
// 8 frames, closed so the flat middle of a coat counts as the figure
const MOVE_WIN = 8, MOVE_T = 6, STILL_T = 2, CLOSE = 6;
const hist = [];
const moving = new Uint8Array(px), still = new Uint8Array(px);
const tA = new Uint8Array(px), tB = new Uint8Array(px);
const morph = (src, dst, r, grow) => {
  for (let y = 0; y < H; y++) {
    const row = y * W;
    for (let x = 0; x < W; x++) {
      let v = grow ? 0 : 1;
      for (let d = -r; d <= r; d++) {
        const xx = x + d; if (xx < 0 || xx >= W) continue;
        const s2 = src[row + xx];
        if (grow) { if (s2) { v = 1; break; } } else if (!s2) { v = 0; break; }
      }
      tA[row + x] = v;
    }
  }
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    let v = grow ? 0 : 1;
    for (let d = -r; d <= r; d++) {
      const yy = y + d; if (yy < 0 || yy >= H) continue;
      const s2 = tA[yy * W + x];
      if (grow) { if (s2) { v = 1; break; } } else if (!s2) { v = 0; break; }
    }
    dst[y * W + x] = v;
  }
};

const rows = [];
for (let f = 0; f < N; f++) {
  const d = new Uint8Array(px);
  if (f > 0) {
    const o = f * px, o1 = (f - 1) * px;
    for (let k = 0; k < px; k++) if (Math.abs(S[o + k] - S[o1 + k]) > MOVE_T) d[k] = 1;
  }
  hist.push(d); if (hist.length > MOVE_WIN) hist.shift();
  if (f % STEP !== 0) continue;
  moving.fill(0);
  for (const h of hist) for (let k = 0; k < px; k++) if (h[k]) moving[k] = 1;
  morph(moving, tB, CLOSE, true); morph(tB, moving, CLOSE, false);
  still.fill(0);
  if (f > 0) {
    const o = f * px, o1 = (f - 1) * px;
    for (let k = 0; k < px; k++) {
      if (!moving[k] && Math.abs(S[o + k] - S[o1 + k]) <= STILL_T) still[k] = 1;
    }
  }
  const g = grainOf(R.subarray(f * px, (f + 1) * px), W, H);
  const c = clusters(g.m, W, H);
  let mN = 0, mX = 0, bN = 0, bX = 0;
  if (MK) {
    const o = f * px;
    for (let k = 0; k < px; k++) {
      if (moving[k]) { mN++; if (MK[o + k]) mX++; }
      else if (still[k]) { bN++; if (MK[o + k]) bX++; }
    }
  }
  rows.push({ frame: f, coverage: 100 * g.on / px, cluster: c.mean,
    biggest: c.biggest,
    figurePct: mN ? 100 * mX / mN : 0, bgPct: bN ? 100 * bX / bN : 0,
    exchangePct: MK ? (() => { let t = 0; const o = f * px;
      for (let k = 0; k < px; k++) if (MK[o + k]) t++; return 100 * t / px; })() : 0 });
}

console.log(`${RENDER}  ${W}x${H}  ${N} frames, every ${STEP}`);
console.log("");
for (const r of refStats) {
  // match on both at once, each normalised by the reference's own value so
  // neither quantity dominates just because its numbers are bigger
  let best = null, bestD = Infinity;
  for (const x of rows) {
    const dc = (x.coverage - r.coverage) / Math.max(r.coverage, 0.3);
    const dk = (x.cluster - r.cluster) / Math.max(r.cluster, 0.3);
    const d = dc * dc + dk * dk;
    if (d < bestD) { bestD = d; best = x; }
  }
  console.log(`${path.basename(r.file)}  ${r.w}x${r.h}`);
  console.log(`  reference   grain ${r.coverage.toFixed(2)}%  `
    + `mean cluster ${r.cluster.toFixed(2)} px  biggest ${r.biggest}`);
  console.log(`  closest     frame ${best.frame}  `
    + `grain ${best.coverage.toFixed(2)}%  mean cluster ${best.cluster.toFixed(2)} px  `
    + `biggest ${best.biggest}`);
  console.log(`              exchange ${best.exchangePct.toFixed(2)}% of frame  `
    + `figure ${best.figurePct.toFixed(1)}%  background ${best.bgPct.toFixed(1)}%`);
  console.log("");
}
