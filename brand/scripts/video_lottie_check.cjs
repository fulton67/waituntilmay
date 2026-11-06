// BUILDER Phase F: validate kit/video/lottie/*.json by playing them in lottie-web 5.12.2 (cdnjs) in headless Chromium with the Adobe kit.
// Per file: loads without error, frame count = duration x fps, and at the hold frame the drawn alpha covers > 0 px; at frame 0 the overlays
// are empty (enter from nothing). Writes kit/video/lottie/lottie_check.json and a hold-frame PNG per file (_frames/lottie/, local).
// usage: NODE_PATH=node_modules node brand/scripts/video_lottie_check.cjs
const fs = require("fs"), path = require("path"); const { chromium } = require("playwright");
const L = path.resolve(__dirname, "..", "kit", "video", "lottie"); const SH = path.resolve(__dirname, "..", "kit", "video", "_frames", "lottie"); fs.mkdirSync(SH, { recursive: true });
const HTML = `<!doctype html><html><head><link rel="stylesheet" href="https://use.typekit.net/vzz0hgt.css">
<style>html,body{margin:0;background:transparent}#s{width:1080px;height:1920px}</style></head><body><div id="s"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script></body></html>`;
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const errors = []; page.on("pageerror", (e) => errors.push(String(e))); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.setContent(HTML, { waitUntil: "networkidle" }); await page.evaluate(() => document.fonts.ready);
  const rows = [];
  for (const f of fs.readdirSync(L).filter((x) => x.endsWith(".json") && x !== "lottie_check.json")) {
    const data = JSON.parse(fs.readFileSync(path.join(L, f), "utf8")); const before = errors.length;
    const info = await page.evaluate((d) => new Promise((res) => {
      document.getElementById("s").innerHTML = ""; window.anim && window.anim.destroy();
      const a = window.anim = lottie.loadAnimation({ container: document.getElementById("s"), renderer: "svg", loop: false, autoplay: false, animationData: d });
      a.addEventListener("DOMLoaded", () => res({ frames: a.totalFrames, fr: a.frameRate, layers: d.layers.length }));
    }), data);
    const shot = async (fr) => { await page.evaluate((x) => window.anim.goToAndStop(x, true), fr); return page.screenshot({ omitBackground: true }); };
    const alpha = async (buf) => page.evaluate(async (b64) => { const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode();
      const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const x = c.getContext("2d"); x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++; return n; }, buf.toString("base64"));
    const name = f.replace(".json", ""); const transition = name.startsWith("transition");
    const holdF = transition ? Math.round(info.frames / 2) : Math.round(info.frames * 0.6);
    const a0 = await alpha(await shot(0)); const hb = await shot(holdF);
    const inside = await page.evaluate((d) => { const box = d.layers.find((l) => l.ty === 4 && l.nm !== "band" && l.nm !== "paper"); const texts = d.layers.filter((l) => l.ty === 5); if (!box || !texts.length) return null;
      const r = (id) => document.getElementById(id).getBoundingClientRect(); const b = r(box.ln); return texts.every((t) => { const q = r(t.ln); return q.left >= b.left && q.right <= b.right && q.top >= b.top && q.bottom <= b.bottom; }); }, data); fs.writeFileSync(path.join(SH, `${name}.png`), hb); const aH = await alpha(hb);
    const ok = errors.length === before && info.frames === data.op && aH > 0 && (transition || a0 === 0) && inside !== false;
    rows.push({ name, frames: info.frames, fps: info.fr, layers: info.layers, alpha_px_frame0: a0, hold_frame: holdF, alpha_px_hold: aH, text_inside_box: inside, errors: errors.length - before, ok });
    console.log(name, info.frames, "frames", "alpha0", a0, "hold", aH, "inside", inside, ok ? "ok" : "FAIL");
  }
  const fonts = await page.evaluate(() => document.fonts.check("500 40px neue-haas-grotesk-display"));
  await browser.close();
  fs.writeFileSync(path.join(L, "lottie_check.json"), JSON.stringify({ player: "lottie-web 5.12.2 (cdnjs), svg renderer", adobe_fonts: fonts, passed: rows.filter((r) => r.ok).length, total: rows.length, errors, files: rows }, null, 1));
  console.log("passed", rows.filter((r) => r.ok).length, "/", rows.length, "fonts", fonts);
})().catch((e) => { console.error(e); process.exit(1); });
