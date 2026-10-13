/**
 * One command: source video -> shader-mosh render -> datamoshed layers.
 *
 *   npm run mosh -- input.mp4
 *   npm run mosh -- input.mp4 --settings mosh-settings.json --name myclip
 *
 * Starts the dev server if one is not already listening, renders the
 * shader-mosh layer frame-exactly, datamoshes it at two strengths, and prints
 * a table comparing every output against the source.
 */
import { spawn, execFileSync, execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const positional = args.filter((a, i) =>
  !a.startsWith("--") && (i === 0 || !args[i - 1].startsWith("--")));

const SRC = positional[0] ?? argOf("--src", "public/mosh-lab/test-clip.mp4");
const NAME = argOf("--name", null)
  ?? path.basename(SRC).replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]/gi, "-");
const SETTINGS = argOf("--settings", null);
const OUTDIR = argOf("--outdir", "public/mosh-lab");
const PORT = argOf("--port", "3000");
const URL_ = `http://localhost:${PORT}/mosh-lab`;

if (!existsSync(SRC)) { console.error(`source not found: ${SRC}`); process.exit(1); }
await mkdir(OUTDIR, { recursive: true });

const sh = (c, a, o = {}) => execFileSync(c, a, { encoding: "utf8", stdio: "inherit", ...o });
const probe = (p) => {
  const out = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0",
    "-count_frames", "-show_entries",
    "stream=width,height,r_frame_rate,nb_read_frames",
    "-show_entries", "format=duration,size", "-of", "json", p],
    { encoding: "utf8" });
  const d = JSON.parse(out), s = d.streams[0];
  return { w: s.width, h: s.height, fps: s.r_frame_rate,
    frames: Number(s.nb_read_frames), duration: Number(d.format.duration),
    mb: Number(d.format.size) / 1e6 };
};

// ---- dev server, started only if nothing is listening already
let dev = null;
const up = async () => {
  try {
    const r = await fetch(URL_, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch { return false; }
};
if (!(await up())) {
  console.log(`starting dev server on :${PORT} ...`);
  dev = spawn("npm", ["run", "dev", "--", "--port", PORT],
    { stdio: "ignore", shell: true, detached: false });
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await up()) break;
  }
  if (!(await up())) { console.error("dev server did not come up"); process.exit(1); }
  console.log("dev server ready");
} else {
  console.log(`using the dev server already on :${PORT}`);
}

const shaderOut = path.join(OUTDIR, `${NAME}-shader-mosh.mp4`);
const medOut = path.join(OUTDIR, `${NAME}-ffmpeg-mosh-medium.mp4`);
const fullOut = path.join(OUTDIR, `${NAME}-ffmpeg-mosh-full.mp4`);
const srcCopy = path.join(OUTDIR, `${NAME}-source.mp4`);

try {
  console.log("\n--- 1/3  shader-mosh render (frame exact) ---");
  sh("node", ["scripts/mosh-render.mjs", "--src", SRC, "--out", shaderOut,
    "--url", URL_, ...(SETTINGS ? ["--settings", SETTINGS] : [])]);

  console.log("\n--- 2/3  datamosh: medium ---");
  sh(".venv/Scripts/python.exe", ["scripts/mosh_datamosh.py",
    "--src", shaderOut, "--out", medOut, "--strength", "medium"]);

  console.log("\n--- 3/3  datamosh: full ---");
  sh(".venv/Scripts/python.exe", ["scripts/mosh_datamosh.py",
    "--src", shaderOut, "--out", fullOut, "--strength", "full"]);

  if (path.resolve(SRC) !== path.resolve(srcCopy)) await copyFile(SRC, srcCopy);

  console.log("\n=== outputs vs source ===");
  const rows = [["source", SRC], ["shader mosh", shaderOut],
    ["ffmpeg mosh medium", medOut], ["ffmpeg mosh full", fullOut]];
  const base = probe(SRC);
  console.log(`${"layer".padEnd(20)}${"size".padStart(11)}${"fps".padStart(8)}`
    + `${"frames".padStart(8)}${"duration".padStart(10)}${"MB".padStart(8)}  match`);
  for (const [label, p] of rows) {
    const q = probe(p);
    const ok = q.frames === base.frames
      && Math.abs(q.duration - base.duration) <= 1 / 24;
    console.log(`${label.padEnd(20)}${`${q.w}x${q.h}`.padStart(11)}`
      + `${q.fps.padStart(8)}${String(q.frames).padStart(8)}`
      + `${q.duration.toFixed(3).padStart(10)}${q.mb.toFixed(2).padStart(8)}`
      + `  ${label === "source" ? "-" : (ok ? "yes" : "NO")}`);
  }
  console.log(`\nwrote ${OUTDIR}/${NAME}-*.mp4`);
} finally {
  if (dev) { try { process.kill(dev.pid); } catch { /* already gone */ } }
}
