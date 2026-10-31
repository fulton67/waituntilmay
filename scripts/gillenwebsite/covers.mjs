// Covers for every release, from official sources, at the highest resolution each source has.
//   node scripts/gillenwebsite/covers.mjs
// Order per release: the artwork on Dylan's own site (7 releases), the iTunes Search API (artworkUrl100 with
// 100x100bb -> 3000x3000bb), Cover Art Archive through a MusicBrainz release-group lookup, and last
// Scrapling's stealth fetcher on Bandcamp and Apple Music's web pages (scripts/gillenwebsite/scrapling_cover.py).
// A match needs the artist and the release title to agree; when the title on his site is a track, the
// track's album cover is used. Nothing is guessed: a release no source matches stays blank.
// Saves public/covers/<id>.jpg at 2048x2048 q88 (plus 1080 and 512 copies in public/covers/1080 and /512)
// and writes scripts/gillenwebsite/covers-report.json.
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const DATA = path.join(ROOT, "lib/gillenwebsite/discography.json");
const UA = "waituntilmay-gillenwebsite/1.0 (https://waituntilmay.com/gillenwebsite)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = promisify(execFile);

const norm = (s) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/&/g, " and ").replace(/\b(the|ft|feat|featuring)\b\.?/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
// a title with its edition notes dropped: "Fine Line (Deluxe)" -> "fine line"
const core = (s) => norm(s.replace(/\s*[([].*?[)\]]/g, "").replace(/\s+-\s+(single|ep)$/i, ""));
const artistsOf = (a) => a.split(/,|&| and | x /i).map(norm).filter(Boolean);
const artistOk = (want, got) => { const g = norm(got); return artistsOf(want).some((a) => g.includes(a) || a.includes(g)); };
// how well two titles agree, once punctuation, edition notes and a featured artist are gone:
// 3 the same, 2 the official title starts with his, 1 nearly every word of his is in it, 0 no match
const titleScore = (want, got) => {
  const w = core(want.replace(/\s+(ft|feat)\.?\s.*$/i, "")), g = core(got.replace(/\s+(ft|feat)\.?\s.*$/i, ""));
  if (!w || !g) return 0;
  if (w === g) return 3;
  if (g.startsWith(w + " ")) return 2;
  const ws = w.split(" "), gs = new Set(g.split(" "));
  return ws.length >= 4 && ws.filter((x) => gs.has(x)).length / ws.length >= 0.85 ? 1 : 0;
};
// a remix, live or acoustic edition has its own artwork: it is not his release unless his title says so
const VARIANT = /(remix|live|acoustic|instrumental|karaoke|sped up|slowed|a cappella|remixes)/i;
const variantOk = (want, got) => !VARIANT.test(got) || VARIANT.test(want);
const best = (list, artistOf, titleOf, r) => list
  .map((x) => ({ x, s: artistOk(r.artist, artistOf(x)) && variantOk(r.release, titleOf(x)) ? titleScore(r.release, titleOf(x)) : 0, extra: norm(titleOf(x)).length }))
  .filter((c) => c.s > 0).sort((a, b) => b.s - a.s || a.extra - b.extra)[0]?.x;

async function json(url) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (r.ok) return r.json();
    if (r.status === 403 || r.status === 429 || r.status >= 500) { await sleep(3000 * (i + 1)); continue; }
    return null;
  }
  return null;
}

// search words with punctuation dropped: iTunes returns nothing for a term with "?" or ":" in it
const words = (s) => s.replace(/\s+(ft|feat)\.?\s.*$/i, "").replace(/[^\p{L}\p{N}&]+/gu, " ").trim().replace(/\s+/g, "+");

async function itunes(r) {
  const lead = r.artist.split(",")[0];
  const search = async (term, entity, country) => {
    const res = (await json(`https://itunes.apple.com/search?term=${encodeURIComponent(term).replace(/%2B/g, "+")}&entity=${entity}&limit=200&country=${country}`))?.results || [];
    await sleep(1500);
    return res;
  };
  // not every album is in every store, and some only turn up under the artist's own name
  for (const country of ["us", "gb", "it"])
    for (const term of [words(`${lead} ${r.release}`), words(r.release), words(lead)]) {
      const hit = best(await search(term, "album", country), (a) => a.artistName, (a) => a.collectionName, r);
      if (hit?.artworkUrl100) return { source: "iTunes Search API", url: hit.artworkUrl100.replace("100x100bb", "3000x3000bb"), how: `album "${hit.collectionName}" by ${hit.artistName} (${country} store)`, page: hit.collectionViewUrl };
    }
  // the title on his site may be a song, or the album may be found through one of his tracks on it
  for (const country of ["us", "gb", "it"])
    for (const title of [r.release, ...r.tracks.map((t) => t.title)]) {
      const songs = await search(words(`${lead} ${title}`), "song", country);
      const hit = songs.find((x) => artistOk(r.artist, x.artistName) && titleScore(title, x.trackName) >= 2
        && variantOk(r.release, x.collectionName) && (title === r.release || titleScore(r.release, x.collectionName) > 0));
      if (hit?.artworkUrl100) return { source: "iTunes Search API", url: hit.artworkUrl100.replace("100x100bb", "3000x3000bb"), how: `track "${hit.trackName}" on "${hit.collectionName}" by ${hit.artistName} (${country} store)`, page: hit.collectionViewUrl };
    }
  return null;
}

async function coverArtArchive(r) {
  // punctuation dropped: a ":" inside the quoted phrase makes MusicBrainz's search return nothing
  const plain = (x) => x.replace(/\s+(ft|feat)\.?\s.*$/i, "").replace(/[^\p{L}\p{N}&' ]+/gu, " ").replace(/\s+/g, " ").trim();
  const artist = plain(r.artist.split(",")[0]);
  let rg = null;
  // the quoted phrase first; MusicBrainz misses some titles with a dash in them ("Mercury – Act 1"), so then the words unquoted
  for (const title of [`"${plain(r.release)}"`, `(${plain(r.release)})`]) {
    const res = await json(`https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(`releasegroup:${title} AND artist:"${artist}"`)}&fmt=json&limit=25`);
    await sleep(1100);
    rg = best(res?.["release-groups"] || [], (g) => (g["artist-credit"] || []).map((c) => c.name).join(", "), (g) => g.title, r);
    if (rg) break;
  }
  if (!rg) return null;
  const url = `https://coverartarchive.org/release-group/${rg.id}/front`;
  const head = await fetch(url, { method: "HEAD", headers: { "User-Agent": UA }, redirect: "follow" });
  if (!head.ok) return null;
  return { source: "Cover Art Archive", url, how: `MusicBrainz release group "${rg.title}" (${rg.id})`, page: `https://musicbrainz.org/release-group/${rg.id}` };
}

async function scrapling(r) {
  try {
    const { stdout } = await run("python", ["-I", path.join(import.meta.dirname, "scrapling_cover.py"), r.artist, r.release], { timeout: 180000 });
    const hit = JSON.parse(stdout.trim().split("\n").pop());
    return hit?.url ? { source: `Scrapling (${hit.site})`, url: hit.url, how: hit.how, page: hit.page } : null;
  } catch { return null; }
}

async function image(url, referer) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", ...(referer ? { Referer: referer } : {}) }, redirect: "follow" });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const m = await sharp(buf).metadata();
  return { buf, width: m.width, height: m.height };
}

// 9x8 difference hash, for checking the one unnamed homepage image against the fetched covers
async function dhash(buf) {
  const px = await sharp(buf).greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += px[y * 9 + x] > px[y * 9 + x + 1] ? 1 : 0;
  return bits;
}
const hamming = (a, b) => [...a].filter((c, i) => c !== b[i]).length;

const VARIANTS = [1080, 512];
for (const w of VARIANTS) await fs.mkdir(path.join(ROOT, "public/covers", String(w)), { recursive: true });
const data = JSON.parse(await fs.readFile(DATA, "utf8"));
const scrape = JSON.parse(await fs.readFile(path.join(import.meta.dirname, "scrape-report.json"), "utf8"));
const rows = [], hashes = [];
for (const r of data.releases) {
  const tried = [];
  // his own artwork: only what the scrape took from his site (a Wix media URL), never a link a previous run wrote
  const own = /static\.wixstatic\.com/.test(r.coverSource) ? { source: "dylansproduce.net", url: r.coverSource, how: "artwork on his homepage", page: "https://www.dylansproduce.net/" } : null;
  // iTunes and Cover Art Archive are both asked and the larger file wins; Scrapling only when both miss
  const official = [];
  for (const find of [itunes, coverArtArchive]) {
    const c = await find(r).catch((e) => { tried.push(`${find.name}: ${e.message}`); return null; });
    tried.push(`${find.name}: ${c ? "found" : "no match"}`);
    if (c) official.push(c);
  }
  if (!official.length) {
    const c = await scrapling(r);
    tried.push(`scrapling: ${c ? "found" : "no match"}`);
    if (c) official.push(c);
  }
  const candidates = [];
  for (const c of [own, ...official].filter(Boolean)) {
    try { candidates.push({ ...c, ...(await image(c.url, c.source === "dylansproduce.net" ? "https://www.dylansproduce.net/" : undefined)) }); }
    catch (e) { tried.push(`${c.source}: ${e.message}`); }
  }
  // his own artwork wins unless an official file is larger; between official files, the larger wins
  candidates.sort((a, b) => (b.source === "dylansproduce.net") - (a.source === "dylansproduce.net"));
  let chosen = candidates[0];
  for (const c of candidates.slice(1)) if (c.width > chosen.width) chosen = c;
  const row = { id: r.id, artist: r.artist, release: r.release, matched: !!chosen, tried };
  if (chosen) {
    const out = `/covers/${r.id}.jpg`;
    await sharp(chosen.buf).resize(2048, 2048, { fit: "cover" }).jpeg({ quality: 88, mozjpeg: true }).toFile(path.join(ROOT, "public", out));
    // smaller copies for where the cover is shown small: 1080 (brian-eno.net's "covers" variant size) for
    // the list slices, the About index and the card faces; 512 for the cover strip
    for (const w of VARIANTS) await sharp(chosen.buf).resize(w, w, { fit: "cover" }).jpeg({ quality: 85, mozjpeg: true }).toFile(path.join(ROOT, "public/covers", String(w), `${r.id}.jpg`));
    r.cover = out; r.coverSource = chosen.url;
    Object.assign(row, { source: chosen.source, how: chosen.how, page: chosen.page, sourceUrl: chosen.url, found: `${chosen.width}x${chosen.height}`, saved: "2048x2048", upscaled: chosen.width < 2048 });
    hashes.push({ id: r.id, h: await dhash(chosen.buf) });
  } else { r.cover = ""; r.coverSource = ""; }
  rows.push(row);
  console.log(`${r.id.padEnd(48)} ${chosen ? `${chosen.source.padEnd(22)} ${chosen.width}x${chosen.height}` : "NO MATCH"}`);
}

// the unnamed homepage image (a figure with antennae in tall grass)
const unknown = scrape.artworkNotMatched.find((a) => a.page === "home");
let unnamed = null;
if (unknown) {
  const { buf } = await image(unknown.url, "https://www.dylansproduce.net/");
  const h = await dhash(buf);
  const near = hashes.map((x) => ({ id: x.id, distance: hamming(h, x.h) })).sort((a, b) => a.distance - b.distance);
  // 64-bit dHash: 10 or fewer differing bits is the same picture
  unnamed = { alt: unknown.alt, url: unknown.url, closest: near.slice(0, 3), assigned: near[0]?.distance <= 10 ? near[0].id : null };
}

await fs.writeFile(DATA, JSON.stringify(data, null, 2) + "\n");
const report = {
  rule: "saved 2048x2048 JPEG q88; source order: his site, iTunes Search API, Cover Art Archive, Scrapling (Bandcamp, Apple Music web)",
  matched: rows.filter((r) => r.matched).length, unmatched: rows.filter((r) => !r.matched).map((r) => r.id), unnamedHomepageImage: unnamed, rows,
};
await fs.writeFile(path.join(import.meta.dirname, "covers-report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(`matched ${report.matched}/${rows.length}; unmatched: ${report.unmatched.join(", ") || "none"}`);
console.log(`unnamed homepage image: ${unnamed?.assigned || "not assigned"} (closest ${JSON.stringify(unnamed?.closest)})`);
