// BUILDER Phase F: capture every element of kit/video/kit.html frame by frame (video.fps from kit/tokens.json = 24, 1080x1920) in headless Chromium with the
// Adobe kit, then encode. Overlays (transparent): PNG sequence with alpha (_frames/, local), VP9 WebM with alpha (committed),
// ProRes 4444 .mov with alpha (_mov/, local; for Premiere/AE). Cards (opaque): H.264 MP4. Also a poster PNG per element.
// usage: NODE_PATH=node_modules node brand/scripts/video_kit.cjs [name ...]   -> brand/kit/video/{name}.webm|.mp4, video_kit.json
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const { chromium } = require("playwright");
const { serve } = require("./render_posts.cjs");
const V = path.resolve(__dirname, "..", "kit", "video"); const FR = path.join(V, "_frames"), MOV = path.join(V, "_mov"), OUT = path.join(V, "elements");
for (const d of [FR, MOV, OUT]) fs.mkdirSync(d, { recursive: true });
const PORT = 8772; const FPS = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "kit", "tokens.json"), "utf8")).video.fps.$value; // 24, motion rule 8
const ff = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);
(async () => {
  const server = await serve(PORT); const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = []; page.on("pageerror", (e) => errors.push(String(e))); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`http://localhost:${PORT}/brand/ostad/kit/video/kit.html`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__vkReady === true, null, { timeout: 30000 });
  const all = await page.evaluate(() => window.VK.names); const want = process.argv.slice(2).length ? process.argv.slice(2) : all;
  const fonts = await page.evaluate(() => ["600 40px neue-haas-grotesk-display", "500 40px neue-haas-grotesk-display"].map((f) => document.fonts.check(f)));
  const rows = [];
  for (const name of want) {
    const dur = await page.evaluate((n) => window.VK.dur(n), name); const n = Math.round(dur * FPS); const card = name.startsWith("card-");
    const dir = path.join(FR, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const stage = page.locator("#stage");
    for (let i = 0; i < n; i++) {
      await page.evaluate(([nm, t]) => window.VK.seek(nm, t), [name, i / FPS]);
      await stage.screenshot({ path: path.join(dir, `${String(i).padStart(4, "0")}.png`), omitBackground: !card });
    }
    const seq = path.join(dir, "%04d.png"); const poster = path.join(OUT, `${name}.png`);
    fs.copyFileSync(path.join(dir, `${String(Math.min(n - 1, Math.round(n * 0.6))).padStart(4, "0")}.png`), poster);
    let file;
    if (card) { file = path.join(OUT, `${name}.mp4`); ff(["-framerate", String(FPS), "-i", seq, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", file]); }
    else {
      file = path.join(OUT, `${name}.webm`); ff(["-framerate", String(FPS), "-i", seq, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "30", "-auto-alt-ref", "0", file]);
      ff(["-framerate", String(FPS), "-i", seq, "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", "-alpha_bits", "16", path.join(MOV, `${name}.mov`)]);
    }
    rows.push({ name, kind: card ? "card" : (name.startsWith("transition") ? "transition" : name.startsWith("reveal") ? "reveal" : "overlay"), dur_s: dur, frames: n,
                file: path.relative(V, file).replace(/\\/g, "/"), poster: path.relative(V, poster).replace(/\\/g, "/"), bytes: fs.statSync(file).size, alpha: !card });
    console.log(name, n, "frames", Math.round(fs.statSync(file).size / 1024), "KB");
  }
  await browser.close(); server.close();
  const prev = fs.existsSync(path.join(V, "video_kit.json")) ? JSON.parse(fs.readFileSync(path.join(V, "video_kit.json"), "utf8")).elements : [];
  const merged = [...prev.filter((p) => !want.includes(p.name)), ...rows].sort((a, b) => all.indexOf(a.name) - all.indexOf(b.name));
  fs.writeFileSync(path.join(V, "video_kit.json"), JSON.stringify({ fps: FPS, size: [1080, 1920], adobe_fonts: fonts.every(Boolean), errors, elements: merged }, null, 1));
  console.log("fonts", fonts, "errors", errors.length);
})().catch((e) => { console.error(e); process.exit(1); });
