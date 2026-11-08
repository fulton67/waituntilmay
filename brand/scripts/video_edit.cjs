// Edit a talking-head video with the video kit (kit/video/VIDEO.md): speed change, the kit treatment, the lower third, captions,
// chips on named treatments, moving grain and the editorial end card, all through kit/video/kit.html VK.reel() - the same path as the demo reel.
//   footage: setpts/speed, fps = video.fps (24, motion rule 8), lut3d = kit/treatment.cube, no zoom or reframe (motion rules 1-2)
//   audio:   atempo = speed (pitch kept), two-pass EBU R128 loudnorm to edit.json loudness, faded out under the end card
//   captions: from the word-timed transcript (scripts/video_transcribe.py), one phrase per line, each line measured in the page to fit
//             one line of the caption box (VK.fits), broken at sentence ends, pauses > 0.35 s, and clauses; cut on and off (motion rule 7)
// usage: NODE_PATH=node_modules node brand/scripts/video_edit.cjs brand/edits/<slug>/edit.json [workers=4]
//   -> <slug>/<slug>.mp4 (local), result.json, poster.jpg; copies the mp4 to edit.json "out" if set
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const { chromium } = require("playwright"); const { serve } = require("./render_posts.cjs");
const ROOT = path.resolve(__dirname, "..", ".."); const CFG = path.resolve(process.argv[2]); const DIR = path.dirname(CFG), SLUG = path.basename(DIR);
const W = parseInt(process.argv[3] || "4", 10);
const C = JSON.parse(fs.readFileSync(CFG, "utf8")); const S = C.speed || 1;
const T = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "kit", "tokens.json"), "utf8"));
const FPS = T.video.fps.$value, DISSOLVE = parseFloat(T.motion.duration.dissolve.$value) / 1000, END_HOLD = 2.5; // VIDEO.md: end card in the last 2.5-3 s
const BG = path.join(DIR, "_frames", "bg"), FR = path.join(DIR, "_frames", "out");
const ff = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { cwd: ROOT, maxBuffer: 1 << 26 });
const pad = (i) => String(i).padStart(5, "0");

// ---- transcript -> words (source s), with fixes for names the recogniser misheard ----
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
function fixWords(words, fixes) {
  for (const [from, to] of fixes || []) {
    const ft = from.split(" ").map(norm);
    for (let i = 0; i + ft.length <= words.length; i++) {
      if (!ft.every((t, k) => norm(words[i + k].w) === t)) continue;
      const last = words[i + ft.length - 1], trail = (last.w.match(/[^\w']+$/) || [""])[0];
      const startsSentence = i === 0 || /[.?!]$/.test(words[i - 1].w);
      const txt = startsSentence ? to[0].toUpperCase() + to.slice(1) : to;
      words.splice(i, ft.length, { w: txt + trail, s: words[i].s, e: last.e, p: Math.min(...words.slice(i, i + ft.length).map((x) => x.p)), fixed: from });
    }
  }
  return words;
}

(async () => {
  const tr = JSON.parse(fs.readFileSync(path.join(DIR, C.transcript), "utf8"));
  const raw = tr.segments.flatMap((s) => s.words.map((w) => ({ ...w, w: w.w.trim() }))).filter((w) => w.w)
    .reduce((a, w) => { if (/^-/.test(w.w) && a.length) Object.assign(a[a.length - 1], { w: a[a.length - 1].w + w.w, e: w.e }); else a.push(w); return a; }, []); // "long" "-term" -> "long-term"
  const words = fixWords(raw, C.fixes);

  // ---- footage ----
  const REUSE = process.env.REUSE && fs.existsSync(FR) && fs.readdirSync(FR).length > 0; // REUSE=1: keep rendered frames (re-run audio + encode only)
  if (!REUSE) for (const d of [BG, FR]) { fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true }); }
  if (!REUSE) ff(["-i", C.src, "-an", "-vf", `setpts=PTS/${S},fps=${FPS},scale=1080:1920,lut3d=brand/kit/treatment.cube`, "-q:v", "2", path.join(BG, "%05d.jpg")]);
  const nBg = fs.readdirSync(BG).length, FOOT = nBg / FPS;

  const server = await serve(8774); const browser = await chromium.launch();
  const errors = [];
  const open = async () => {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    page.on("pageerror", (e) => errors.push(String(e))); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.route("**/edit_bg/*", (r) => r.fulfill({ path: path.join(BG, path.basename(new URL(r.request().url()).pathname)), contentType: "image/jpeg" }));
    await page.route("**/edit_asset/*", (r) => r.fulfill({ path: ASSET[path.basename(new URL(r.request().url()).pathname)] }));
    await page.goto("http://localhost:8774/brand/ostad/kit/video/kit.html", { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__vkReady === true, null, { timeout: 30000 });
    return page;
  };
  const p0 = await open();

  // ---- captions: one phrase per line, measured ----
  const wide = C.capWide !== false, phrases = []; let cur = [];
  for (const w of words) {
    if (cur.length) {
      const prev = cur[cur.length - 1], txt = cur.map((x) => x.w).join(" ");
      const brk = (w.s - prev.e > 0.35 && txt.length >= 6) || /[.?!]$/.test(prev.w) || (/[,;:]$/.test(prev.w) && txt.length >= 12)
        || !(await p0.evaluate(([t, wd]) => window.VK.fits(t, wd), [txt + " " + w.w, wide]));
      if (brk) { phrases.push(cur); cur = []; }
    }
    cur.push(w);
  }
  if (cur.length) phrases.push(cur);
  const speechEnd = words[words.length - 1].e / S;
  const endAt = Math.min(FOOT - DISSOLVE, speechEnd + 0.15), DUR = endAt + DISSOLVE + END_HOLD;
  const captions = phrases.map((ph) => ({ text: ph.map((x) => x.w).join(" "), from: ph[0].s / S, to: ph[ph.length - 1].e / S + 0.2 }));
  captions.forEach((c, i) => { const n = captions[i + 1]; if (n && n.from - c.to < 0.5) c.to = n.from; if (n) c.to = Math.min(c.to, n.from); c.to = Math.min(c.to, endAt + DISSOLVE / 2); });
  const unfit = []; for (const c of captions) if (!(await p0.evaluate(([t, wd]) => window.VK.fits(t, wd), [c.text, wide]))) unfit.push(c.text);

  // ---- overlays: lower third at the top of the first shot; a chip when a treatment is first named ----
  const overlays = [{ name: "lower-third", at: 0.1 }];
  // find(say): the first word where `say` starts (joined letters over up to 4 words, so "Laser Genesis" matches one fixed token or two)
  const key = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const find = (say, from = 0) => { const k = key(say); for (let i = 0; i < words.length; i++) { if (words[i].s < from) continue; let acc = "";
    for (let j = i; j < Math.min(i + 4, words.length); j++) { acc += key(words[j].w); if (acc === k) return words[i]; if (!k.startsWith(acc)) break; } } return null; };
  // machine cards: a device in kit/devices/devices.json with a cutout gets a card the first time he names it (DECISIONS 62); its chip is dropped
  const REG = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "kit", "devices", "devices.json"), "utf8")).devices;
  const DEV_DUR = 0.2 + 0.6 + parseFloat(T.motion.duration["hold-min"].$value) / 1000 + 1 + 0.3, carded = new Set();
  if (C.devices !== false) for (const d of REG.filter((d) => d.img)) {
    const hit = d.say.map((s) => find(s)).filter(Boolean).sort((a, b) => a.s - b.s)[0]; if (!hit) continue;
    overlays.push({ name: "device", at: Math.max(0, hit.s / S - 0.2), said: hit.s / S, id: d.id, fill: { img: `../devices/${d.img}`, label: d.label, maker: d.maker || "" } }); carded.add(key(d.label));
  }
  for (const ch of C.chips || []) { // chips for named treatments without a card
    if (carded.has(key(ch.say))) continue; const hit = find(ch.say);
    if (hit) overlays.push({ name: "chip", at: Math.max(0, hit.s / S - 0.2), text: ch.text, said: hit.s / S });
  }
  // hand-placed overlays from edit.json: { name: "tile" | "tile-pair" | ..., at (s, output) or say (phrase), fill: { img, img2, label, ... } }
  const ASSET = {}; // local images are served to the page as /edit_asset/<n>
  for (const o of C.overlays || []) {
    const hit = o.say ? find(o.say) : null; if (o.say && !hit) { console.warn("overlay phrase not found:", o.say); continue; }
    const fill = Object.fromEntries(Object.entries(o.fill || {}).map(([k, v]) => {
      if (!/^img/.test(k) || /^(https?:|\.\.\/|\/)/.test(v)) return [k, v];
      const n = `${Object.keys(ASSET).length}${path.extname(v)}`; ASSET[n] = path.resolve(DIR, v); return [k, `/edit_asset/${n}`]; }));
    overlays.push({ ...o, at: hit ? Math.max(0, hit.s / S - 0.2) : o.at, said: hit ? hit.s / S : undefined, fill });
  }
  // a card waits for the previous card in the same slot to leave (one machine card / one tile group on screen at a time)
  for (const slot of [["device"], ["tile", "tile-pair"]]) {
    let free = 0; for (const o of overlays.filter((o) => slot.includes(o.name)).sort((a, b) => a.at - b.at)) { o.at = Math.max(o.at, free); free = o.at + (o.name === "device" ? DEV_DUR : 5); }
  }
  const SPEC = { overlays, captions, capWide: wide, end: { card: C.end || "card-editorial-end", at: endAt, dissolve: DISSOLVE } };

  if (process.env.PLAN) { // PLAN=1: write the spec and a few proof frames, no full render
    fs.writeFileSync(path.join(DIR, "_frames", "plan.json"), JSON.stringify({ FOOT, DUR, unfit, SPEC }, null, 1));
    for (const t of String(process.env.PLAN).split(",").map(Number).filter((x) => x > 0)) {
      await p0.evaluate(([s, t, src]) => window.VK.reel(s, t, src), [SPEC, t, `/edit_bg/${pad(Math.min(Math.round(t * FPS) + 1, nBg))}.jpg`]);
      await p0.locator("#stage").screenshot({ path: path.join(DIR, "_frames", `plan_${t}.jpg`), type: "jpeg", quality: 90 });
    }
    await browser.close(); server.close(); console.log("plan", captions.length, "captions,", unfit.length, "unfit, DUR", DUR.toFixed(2)); return;
  }
  // ---- render: W pages over contiguous frame ranges ----
  const n = Math.round(DUR * FPS), reuse = REUSE && fs.readdirSync(FR).length === n, pages = reuse ? [] : [p0, ...(await Promise.all(Array.from({ length: W - 1 }, open)))];
  const t0 = Date.now(); let done = 0;
  if (reuse) console.log("reusing", n, "rendered frames");
  await Promise.all(pages.map(async (page, k) => {
    const a = Math.floor((n * k) / W), b = Math.floor((n * (k + 1)) / W);
    for (let i = a; i < b; i++) {
      const src = `/edit_bg/${pad(Math.min(i + 1, nBg))}.jpg`;
      await page.evaluate(([s, t, src]) => window.VK.reel(s, t, src), [SPEC, i / FPS, src]);
      await page.locator("#stage").screenshot({ path: path.join(FR, `${pad(i)}.jpg`), type: "jpeg", quality: 94 });
      if (++done % 240 === 0) console.log(`${done}/${n} frames, ${Math.round((Date.now() - t0) / 1000)} s`);
    }
  }));
  const fonts = await p0.evaluate(() => ["600 40px neue-haas-grotesk-display", "500 40px neue-haas-grotesk-display"].every((f) => document.fonts.check(f)));
  const rects = await p0.evaluate(([s, t]) => window.VK.reel(s, t, null).then(() => { // lower third vs caption band at 1.0 s, both on screen
    const r = (sel) => { const e = [...document.querySelectorAll(sel)].find((x) => x.offsetParent !== null && getComputedStyle(x).display !== "none"); return e ? e.getBoundingClientRect().toJSON() : null; };
    return { lower_third: r(".vk-lt"), caption: r(".vk-multi .vk-cap"), chip: r(".vk-chip") };
  }), [SPEC, 1.0]);
  await browser.close(); server.close();

  // ---- audio: speed, loudness (two-pass loudnorm), fade under the end card ----
  const L = C.loudness || { I: -14, TP: -1.5, LRA: 11 }, AUD = path.join(DIR, "_frames", "audio.m4a");
  const PRE = C.audio_pre ? C.audio_pre + "," : ""; // lav-mic speech far below target: compress + limit first so loudnorm can stay linear
  const ln = `loudnorm=I=${L.I}:TP=${L.TP}:LRA=${L.LRA}`;
  const pass1 = require("child_process").spawnSync("ffmpeg", ["-hide_banner", "-i", C.src, "-vn", "-af", `atempo=${S},${PRE}${ln}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" });
  const m = JSON.parse(pass1.stderr.match(/\{[^{}]*"input_i"[^{}]*\}/)[0]); // loudnorm's measurement block on stderr (ffmpeg's summary lines follow it)
  const ln2 = `${ln}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  ff(["-i", C.src, "-vn", "-af", `atempo=${S},${PRE}${ln2},aresample=48000,apad,afade=t=out:st=${endAt.toFixed(3)}:d=${(DUR - endAt).toFixed(3)}`, "-t", DUR.toFixed(3), "-ac", "2", "-c:a", "aac", "-b:a", "192k", AUD]);

  // ---- encode ----
  const out = path.join(DIR, `${SLUG}.mp4`);
  ff(["-framerate", String(FPS), "-i", path.join(FR, "%05d.jpg"), "-i", AUD, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
      "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-c:a", "copy", "-movflags", "+faststart", "-shortest", out]);
  ff(["-i", path.join(FR, `${pad(Math.round(1.5 * FPS))}.jpg`), "-vf", "scale=540:-1", "-q:v", "3", path.join(DIR, "poster.jpg")]);
  if (C.out) fs.copyFileSync(out, C.out);
  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames,channels,sample_rate:format=duration,size", "-of", "json", out]).toString());
  const res = { src: C.src, speed: S, fps: FPS, source_s: tr.duration, footage_frames: nBg, footage_s: FOOT, dur_s: DUR, frames: n, render_s: Math.round((Date.now() - t0) / 1000),
    loudness_in: m, adobe_fonts: fonts, errors, captions: captions.length, captions_unfit: unfit, fixed_words: words.filter((w) => w.fixed).map((w) => ({ w: w.w, from: w.fixed, t: +(w.s / S).toFixed(2) })),
    rects, spec: SPEC, out, copy: C.out || null, probe };
  fs.writeFileSync(path.join(DIR, "result.json"), JSON.stringify(res, null, 1));
  console.log(`${SLUG}: ${n} frames, ${DUR.toFixed(2)} s, ${captions.length} captions (${unfit.length} unfit), fonts ${fonts}, errors ${errors.length}, ${Math.round(fs.statSync(out).size / 1e6)} MB`);
})().catch((e) => { console.error(e); process.exit(1); });
