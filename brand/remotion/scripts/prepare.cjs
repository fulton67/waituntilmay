// Fill public/<slug>/ for the OstadReel composition from an edit made by brand/scripts/video_edit.cjs (DECISIONS 67):
//   footage.mp4  the source clip (played muted at the edit's speed)
//   audio.m4a    the edit's finished audio (sped, compressed, loudnorm -14 LUFS) taken from brand/edits/<slug>/<slug>.mp4
//   spec.json    speed, duration, captions, overlays (lower third, machines) and end card time from result.json, plus props in edit.json "remotion"
//   devices/*.png, end.mp4   machine cutouts and the kit's end card
// usage: node scripts/prepare.cjs <slug>     (then: npx remotion studio  /  npx remotion render OstadReel --props=public/<slug>/props.json)
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const slug = process.argv[2] || "rosacea-laser";
const BRAND = path.resolve(__dirname, "..", ".."), E = path.join(BRAND, "edits", slug), OUT = path.join(__dirname, "..", "public", slug);
const C = JSON.parse(fs.readFileSync(path.join(E, "edit.json"), "utf8")), R = JSON.parse(fs.readFileSync(path.join(E, "result.json"), "utf8"));
const edited = [path.join(E, `${slug}.mp4`), C.out].find((p) => p && fs.existsSync(p));
if (!edited) throw new Error(`no rendered edit for ${slug}: run brand/scripts/video_edit.cjs first (its audio is the reel's audio)`);
fs.mkdirSync(path.join(OUT, "devices"), { recursive: true });
fs.copyFileSync(C.src, path.join(OUT, "footage.mp4"));
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", edited, "-vn", "-c:a", "copy", path.join(OUT, "audio.m4a")]);
fs.copyFileSync(path.join(BRAND, "kit", "video", "elements", `${R.spec.end.card}.mp4`), path.join(OUT, "end.mp4"));
const overlays = R.spec.overlays.map((o) => {
  if (o.name !== "device") return o;
  const img = path.join(BRAND, "kit", "devices", "img", `${o.id}.png`);
  fs.copyFileSync(img, path.join(OUT, "devices", `${o.id}.png`));
  return { ...o, fill: { ...o.fill, img: `${slug}/devices/${o.id}.png` } };
});
const spec = { slug, speed: C.speed, fps: 24, durationInSeconds: R.dur_s, captions: R.spec.captions, overlays, end: { ...R.spec.end, src: `${slug}/end.mp4` },
  footage: `${slug}/footage.mp4`, audio: `${slug}/audio.m4a`, ...(C.remotion || {}) };
fs.writeFileSync(path.join(OUT, "props.json"), JSON.stringify({ spec }, null, 1));
console.log(`${slug}: ${spec.captions.length} captions, ${overlays.length} overlays, ${spec.durationInSeconds.toFixed(2)} s -> public/${slug}/props.json`);
