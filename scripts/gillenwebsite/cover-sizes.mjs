// Every cover at 512, 1024, 2048 and 3000 px, as AVIF (quality 60) with a JPEG fallback, from the largest original
// each source has. Never upscaled: a cover whose original is smaller than a size stops at its own width, which is
// then one more size (e.g. 1425). An iTunes original at 3000x3000 is kept byte for byte as the 3000 JPEG.
//   node scripts/gillenwebsite/cover-sizes.mjs
// Originals are cached in scripts/gillenwebsite/cache/covers (git-ignored). Covers that came in under 1500 px are
// asked for again (iTunes, then Deezer), and a new file is only taken when it is the same picture (dHash <= 10).
// Writes public/covers/<w>/<id>.avif|.jpg, coverSizes (and cover = "/covers/<id>") into discography.json, and
// scripts/gillenwebsite/cover-sizes-report.json.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const DATA = path.join(ROOT, "lib/gillenwebsite/discography.json");
const CACHE = path.join(import.meta.dirname, "cache/covers");
const SIZES = [512, 1024, 2048, 3000];
const SMALL = 1500;
const UA = "waituntilmay-gillenwebsite/1.0 (https://waituntilmay.com/gillenwebsite)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, referer) {
  const r = await fetch(url, { headers: { "User-Agent": url.includes("wixstatic") ? "Mozilla/5.0" : UA, ...(referer ? { Referer: referer } : {}) }, redirect: "follow" });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer()), m = await sharp(buf).metadata();
  return { buf, width: m.width, height: m.height, format: m.format, url };
}
async function dhash(buf) {
  const px = await sharp(buf).greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += px[y * 9 + x] > px[y * 9 + x + 1] ? 1 : 0;
  return bits;
}
const hamming = (a, b) => [...a].filter((c, i) => c !== b[i]).length;
const words = (s) => s.replace(/\s+(ft|feat)\.?\s.*$/i, "").replace(/[^\p{L}\p{N}&]+/gu, " ").trim();
const norm = (s) => s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// other copies of a small cover: iTunes albums and songs named like it (3000x3000bb asks for the largest), then Deezer
async function alternatives(r) {
  const out = [], lead = r.artist.split(",")[0];
  for (const entity of ["album", "song"])
    for (const country of ["us", "gb"]) {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(words(`${lead} ${r.release}`))}&entity=${entity}&limit=25&country=${country}`).then((x) => x.json()).catch(() => ({ results: [] }));
      await sleep(1500);
      for (const x of res.results || [])
        if (x.artworkUrl100 && norm(x.artistName).includes(norm(lead)) && norm(x.collectionName).includes(norm(words(r.release)).split(" ").slice(0, 2).join(" ")))
          out.push({ source: `iTunes (${entity}, ${country})`, url: x.artworkUrl100.replace("100x100bb", "3000x3000bb") });
    }
  const dz = await fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(words(`${lead} ${r.release}`))}`).then((x) => x.json()).catch(() => ({}));
  for (const x of (dz.data || []).slice(0, 5)) if (x.cover_xl) out.push({ source: "Deezer", url: x.cover_xl.replace("1000x1000-000000-80", "1900x1900-000000-100") });
  return [...new Map(out.map((o) => [o.url, o])).values()];
}

await fs.mkdir(CACHE, { recursive: true });
const data = JSON.parse(await fs.readFile(DATA, "utf8"));
const prior = JSON.parse(await fs.readFile(path.join(import.meta.dirname, "covers-report.json"), "utf8"));
const rows = [];
for (const r of data.releases) {
  const was = prior.rows.find((x) => x.id === r.id);
  if (!was?.sourceUrl) { rows.push({ id: r.id, cover: false }); continue; }
  // the original, from the cache or its source
  const cached = path.join(CACHE, `${r.id}.orig`);
  let orig;
  try { const buf = await fs.readFile(cached), m = await sharp(buf).metadata(); orig = { buf, width: m.width, height: m.height, format: m.format, url: was.sourceUrl }; }
  catch { orig = await get(was.sourceUrl, was.source === "dylansproduce.net" ? "https://www.dylansproduce.net/" : undefined); await fs.writeFile(cached, orig.buf); }
  const row = { id: r.id, source: was.source, sourceUrl: orig.url, original: `${orig.width}x${orig.height}`, tried: [] };
  let pick = orig;
  if (Math.min(orig.width, orig.height) < SMALL) {
    const h0 = await dhash(orig.buf);
    for (const alt of await alternatives(r)) {
      try {
        const c = await get(alt.url), d = hamming(h0, await dhash(c.buf));
        row.tried.push(`${alt.source} ${c.width}x${c.height} dHash ${d}${d <= 10 ? "" : " (different picture)"}`);
        if (d <= 10 && Math.min(c.width, c.height) > Math.min(pick.width, pick.height)) pick = { ...c, source: alt.source };
      } catch (e) { row.tried.push(`${alt.source}: ${e.message}`); }
    }
    if (pick !== orig) { await fs.writeFile(cached, pick.buf); Object.assign(row, { refetched: `${pick.source} ${pick.width}x${pick.height}`, sourceUrl: pick.url }); r.coverSource = pick.url; }
  }
  const native = Math.min(pick.width, pick.height);
  const keep = /mzstatic.com/.test(pick.url) && pick.format === "jpeg" && pick.width === 3000 && pick.height === 3000;
  // the sizes this cover really has: the standard ones up to its width, then its own width if that falls between
  const sizes = SIZES.filter((s) => s <= native);
  if (native < 3000 && !sizes.includes(native)) sizes.push(native);
  for (const s of sizes) {
    const dir = path.join(ROOT, "public/covers", String(s));
    await fs.mkdir(dir, { recursive: true });
    const square = sharp(pick.buf).resize(s, s, { fit: "cover" });
    await square.clone().avif({ quality: 60 }).toFile(path.join(dir, `${r.id}.avif`));
    // the iTunes original is the 3000 file as it is
    if (s === 3000 && keep) await fs.writeFile(path.join(dir, `${r.id}.jpg`), pick.buf);
    else await square.clone().jpeg({ quality: 85, mozjpeg: true }).toFile(path.join(dir, `${r.id}.jpg`));
  }
  r.cover = `/covers/${r.id}`;
  r.coverSizes = sizes;
  Object.assign(row, { used: `${pick.width}x${pick.height}`, sizes, onlySmall: native < SMALL, keptOriginal3000: keep });
  rows.push(row);
  console.log(`${r.id.padEnd(48)} ${row.used.padEnd(10)} ${sizes.join(",")}${row.refetched ? `  refetched: ${row.refetched}` : ""}`);
}
await fs.writeFile(DATA, JSON.stringify(data, null, 2) + "\n");
const report = {
  rule: "AVIF q60 + JPEG q85 at 512/1024/2048/3000, never above the original's width (the original's own width is added when it falls between)",
  onlySmall: rows.filter((x) => x.onlySmall).map((x) => `${x.id}: ${x.used}`), rows,
};
await fs.writeFile(path.join(import.meta.dirname, "cover-sizes-report.json"), JSON.stringify(report, null, 2) + "\n");
console.log("only below 1500 px:", report.onlySmall.join("; ") || "none");
