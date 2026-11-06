// BUILDER Phase F: the 10 s demo reel. Footage = Dr. Ostad's own clip ig_DcjqIkoFMTF, 229.55-237.05 s: the lowest burnt-in-text 10 s
// window inside a single take (ffmpeg scene > 0.25, take 182.9-249.19 s; text 2.28% of frame, motion.json ocr_samples) - DECISIONS 57.
// Footage gets the kit treatment (treatment.cube) at 24 fps, no zoom (motion rules 2, 8, 9). Over it, kit/video/kit.html VK.reel():
// lower third, chip, speech captions cut on in the band (wide, covering the burnt-in ones; words and timings from his own captions),
// moving grain, then the editorial end card dissolved in (duration.dissolve, 12 frames) with its card reveals.
// usage: NODE_PATH=node_modules node brand/scripts/video_reel.cjs  -> brand/kit/video/reel.mp4, reel.png, reel.json
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const { chromium } = require("playwright"); const { serve } = require("./render_posts.cjs");
const ROOT = path.resolve(__dirname, "..", ".."), V = path.resolve(__dirname, "..", "kit", "video");
const BG = path.join(V, "_frames", "reel_bg"), FR = path.join(V, "_frames", "reel");
const T = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "kit", "tokens.json"), "utf8"));
const FPS = T.video.fps.$value, DISSOLVE = parseFloat(T.motion.duration.dissolve.$value) / 1000;
const CLIP = "research/ostad/audio/in_DcjqIkoFMTF.mp4", START = 229.55, FOOT = 7.5, DUR = 10;
const SPEC = {
  overlays: [{ name: "lower-third", at: 0.1 }, { name: "chip", at: 4.4, text: "+ Exomind" }],
  captions: [ // his burnt-in captions (OCR every 0.5 s, motion.json) regrouped into one line per phrase; t relative to START
    { text: "Comprehensive approach", from: 0.0, to: 2.0 },
    { text: "to taking care of yourself,", from: 2.0, to: 3.5 },
    { text: "both from the inside in", from: 3.5, to: 5.5 },
    { text: "as well as from the inside out.", from: 5.5, to: FOOT },
  ],
  end: { card: "card-editorial-end", at: FOOT - DISSOLVE, dissolve: DISSOLVE },
};
const ff = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { cwd: ROOT });
(async () => {
  for (const d of [BG, FR]) { fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true }); }
  ff(["-ss", String(START), "-i", CLIP, "-t", String(FOOT), "-vf", `fps=${FPS},scale=1080:1920,lut3d=brand/kit/treatment.cube`, path.join(BG, "%04d.png")]);
  const nBg = fs.readdirSync(BG).length;
  const server = await serve(8773); const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = []; page.on("pageerror", (e) => errors.push(String(e))); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.route("**/reel_bg/*", (r) => r.fulfill({ path: path.join(BG, path.basename(new URL(r.request().url()).pathname)), contentType: "image/png" }));
  await page.goto("http://localhost:8773/brand/ostad/kit/video/kit.html", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__vkReady === true, null, { timeout: 30000 });
  const n = Math.round(DUR * FPS);
  for (let i = 0; i < n; i++) {
    const t = i / FPS, src = `/reel_bg/${String(Math.min(i + 1, nBg)).padStart(4, "0")}.png`;
    await page.evaluate(([s, t, src]) => window.VK.reel(s, t, src), [SPEC, t, src]);
    await page.locator("#stage").screenshot({ path: path.join(FR, `${String(i).padStart(4, "0")}.png`) });
  }
  const fonts = await page.evaluate(() => document.fonts.check("500 40px neue-haas-grotesk-display"));
  await browser.close(); server.close();
  const out = path.join(V, "reel.mp4");
  ff(["-framerate", String(FPS), "-i", path.join(FR, "%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", out]); // silent: the local clip has no audio stream (DECISIONS 57)
  ff(["-i", path.join(FR, `${String(Math.round(2.5 * FPS)).padStart(4, "0")}.png`), "-q:v", "3", path.join(V, "reel.jpg")]);
  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate,nb_frames:format=duration", "-of", "json", out]).toString());
  fs.writeFileSync(path.join(V, "reel.json"), JSON.stringify({ clip: CLIP, clip_id: "ig_DcjqIkoFMTF", start_s: START, footage_s: FOOT, dur_s: DUR, fps: FPS, frames: n, bg_frames: nBg,
    spec: SPEC, adobe_fonts: fonts, errors, bytes: fs.statSync(out).size, probe }, null, 1));
  console.log("reel", n, "frames", Math.round(fs.statSync(out).size / 1024), "KB fonts", fonts, "errors", errors.length);
})().catch((e) => { console.error(e); process.exit(1); });
