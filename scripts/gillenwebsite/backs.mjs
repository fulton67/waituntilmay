// Back covers, catalogue numbers and collaborators for every release, for the record sleeves on the Rolodex.
//   node scripts/gillenwebsite/backs.mjs [--force] [--plain-only]
// (--plain-only: remake only the plain backs already in sleeves.json, fetching nothing)
// Order per release:
//  1. Discogs (only with a user token in DISCOGS_TOKEN or ~/.discogs_token): database search by artist + title,
//     the master's main release, its images. Discogs types images "primary" / "secondary" only, so the back is the
//     second image when it is square-ish (the tracklist side); the release's credits (extraartists) and catno too.
//  2. MusicBrainz + Cover Art Archive: the release group matched by artist + title, then its releases until one has
//     an image CAA types "Back". Catalogue number from the release's label-info; collaborators from the artist
//     relationships on the release and on the recordings of the tracks Dylan worked on.
//  3. Scrapling (plain fetcher, scripts/gillenwebsite/scrapling_back.py) on the release's Bandcamp page: any image
//     on the page other than the album art.
// A release none of them has a back for gets a plain sleeve back: the front's dominant colour, and nothing on it.
// Writes public/covers/<id>-back.jpg (full size), public/covers/{512,1024,2048}/<id>-back.{avif,jpg},
// lib/gillenwebsite/sleeves.json and scripts/gillenwebsite/backs-report.json.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { chromium } from "@playwright/test";

const ROOT = path.resolve(import.meta.dirname, "../..");
const DATA = path.join(ROOT, "lib/gillenwebsite/discography.json");
const OUT = path.join(ROOT, "lib/gillenwebsite/sleeves.json");
const CACHE = path.join(import.meta.dirname, "cache/backs");
const COVERS = path.join(ROOT, "public/covers");
const SIZES = [512, 1024, 2048];
const UA = "waituntilmay-gillenwebsite/1.0 (https://waituntilmay.com/gillenwebsite)";
const DYLAN = /neustadter/i;
const FORCE = process.argv.includes("--force");
// CAA images typed "Back" that are not a back, found by eye on the contact sheet (no rule above catches them)
const NOT_BACK = { "25865725802": "a product photo of three copies of the front" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = promisify(execFile);
const TOKEN = process.env.DISCOGS_TOKEN || (await fs.readFile(path.join(os.homedir(), ".discogs_token"), "utf8").catch(() => "")).trim();

// the same matching as covers.mjs: artist and title have to agree once punctuation and edition notes are gone
const norm = (s) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/&/g, " and ").replace(/\b(the|ft|feat|featuring)\b\.?/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const core = (s) => norm(s.replace(/\s*[([].*?[)\]]/g, "").replace(/\s+-\s+(single|ep)$/i, ""));
const artistsOf = (a) => a.split(/,|&| and | x /i).map(norm).filter(Boolean);
const artistOk = (want, got) => { const g = norm(got); return artistsOf(want).some((a) => g.includes(a) || a.includes(g)); };
const titleScore = (want, got) => {
  const w = core(want.replace(/\s+(ft|feat)\.?\s.*$/i, "")), g = core(got.replace(/\s+(ft|feat)\.?\s.*$/i, ""));
  if (!w || !g) return 0;
  if (w === g) return 3;
  if (g.startsWith(w + " ")) return 2;
  const ws = w.split(" "), gs = new Set(g.split(" "));
  return ws.length >= 4 && ws.filter((x) => gs.has(x)).length / ws.length >= 0.85 ? 1 : 0;
};
const VARIANT = /(remix|live|acoustic|instrumental|karaoke|sped up|slowed|a cappella|remixes)/i;
const variantOk = (want, got) => !VARIANT.test(got) || VARIANT.test(want);
const words = (s) => s.replace(/\s+(ft|feat)\.?\s.*$/i, "").replace(/[^\p{L}\p{N}&]+/gu, " ").trim();

let last = 0;
// every API answer is cached (scripts/gillenwebsite/cache/backs, git-ignored), so a re-run only asks for what is new
async function json(url, headers = {}, gap = 1100) {
  const key = path.join(CACHE, createHash("sha1").update(url).digest("hex") + ".json");
  const hit = await fs.readFile(key, "utf8").catch(() => null);
  if (hit) return JSON.parse(hit);
  const res = await fetchJson(url, headers, gap);
  if (res) await fs.writeFile(key, JSON.stringify(res));
  return res;
}
async function fetchJson(url, headers, gap) {
  for (let i = 0; i < 4; i++) {
    const wait = last + gap - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json", ...headers } }).catch(() => null);
    if (r?.ok) return r.json();
    if (r && r.status !== 429 && r.status !== 503 && r.status < 500) return null;
    await sleep(3000 * (i + 1));
  }
  return null;
}
async function dhash(buf) {
  const px = await sharp(buf).greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += px[y * 9 + x] > px[y * 9 + x + 1] ? 1 : 0;
  return bits;
}
const hamming = (a, b) => [...a].filter((c, i) => c !== b[i]).length;
async function image(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer()), m = await sharp(buf).metadata();
  return { buf, width: m.width, height: m.height };
}

// ---- 1. Discogs ----
async function discogs(r) {
  if (!TOKEN) return { tried: "discogs: no token" };
  const auth = { Authorization: `Discogs token=${TOKEN}` };
  const lead = r.artist.split(",")[0];
  const q = `https://api.discogs.com/database/search?artist=${encodeURIComponent(words(lead))}&release_title=${encodeURIComponent(words(r.release))}&type=master&per_page=25`;
  let res = (await json(q, auth))?.results || [];
  if (!res.length) res = (await json(q.replace("type=master", "type=release"), auth))?.results || [];
  const hit = res.map((x) => { const [a, ...t] = x.title.split(" - "); return { x, s: artistOk(r.artist, a) && variantOk(r.release, t.join(" - ")) ? titleScore(r.release, t.join(" - ")) : 0 }; })
    .filter((c) => c.s > 0).sort((a, b) => b.s - a.s)[0]?.x;
  if (!hit) return { tried: "discogs: no match" };
  const master = hit.type === "master" ? await json(`https://api.discogs.com/masters/${hit.id}`, auth) : null;
  const rel = await json(`https://api.discogs.com/releases/${master?.main_release ?? hit.id}`, auth);
  if (!rel) return { tried: "discogs: release lookup failed" };
  const imgs = rel.images || [];
  const typed = imgs.find((im) => /back/i.test(im.type));
  const second = imgs.filter((im) => im.type === "secondary")[0];
  const back = typed || (second && second.width / second.height > 0.9 && second.width / second.height < 1.1 ? second : null);
  const collab = (rel.extraartists || []).filter((a) => !DYLAN.test(a.name)).map((a) => ({ name: a.name.replace(/\s\(\d+\)$/, ""), role: a.role }));
  return {
    tried: back ? "discogs: back found" : `discogs: ${imgs.length} images, none a back`,
    back: back ? { url: back.uri, source: "Discogs", page: rel.uri } : null,
    catno: rel.labels?.[0]?.catno && rel.labels[0].catno !== "none" ? rel.labels[0].catno : null,
    label: rel.labels?.[0]?.name ?? null,
    collab,
  };
}

// ---- 2. MusicBrainz + Cover Art Archive ----
async function musicbrainz(r) {
  const lead = r.artist.split(",")[0];
  const rgs = [];
  // the title without its edition notes, as loose words: MusicBrainz writes "Mercury – Acts 1 & 2", "SOS Deluxe: Lana"
  const loose = words(r.release.replace(/\s*[([].*?[)\]]/g, "")).replace(/&/g, " ");
  for (const q of [`releasegroup:"${words(r.release)}" AND artist:"${words(lead)}"`, `releasegroup:(${loose}) AND artist:(${words(lead)})`, `releasegroup:(${loose})`]) {
    const res = await json(`https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(q)}&fmt=json&limit=25`);
    for (const g of res?.["release-groups"] || []) {
      const a = (g["artist-credit"] || []).map((c) => c.name + (c.joinphrase || "")).join("");
      // a soundtrack he worked on is credited to Various Artists: then the title has to be exact
      const who = artistOk(r.artist, a) || (/various artists/i.test(a) && titleScore(r.release, g.title) === 3);
      const s = who && variantOk(r.release, g.title) ? titleScore(r.release, g.title) : 0;
      if (s && !rgs.find((x) => x.g.id === g.id)) rgs.push({ g, s });
    }
    if (rgs.length) break;
  }
  // the title on his site may be a track: the release groups that hold a recording of it
  if (!rgs.length) {
    const res = await json(`https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(`recording:"${words(r.release)}" AND artist:"${words(lead)}"`)}&fmt=json&limit=25`);
    for (const rec of res?.recordings || []) {
      const a = (rec["artist-credit"] || []).map((c) => c.name + (c.joinphrase || "")).join("");
      if (!artistOk(r.artist, a) || titleScore(r.release, rec.title) < 2) continue;
      for (const rel of rec.releases || []) { const g = rel["release-group"]; if (g && !rgs.find((x) => x.g.id === g.id)) rgs.push({ g, s: 0.5 }); }
    }
  }
  if (!rgs.length) return { tried: "musicbrainz: no match" };
  rgs.sort((a, b) => b.s - a.s);
  let out = { tried: "musicbrainz: matched, CAA has no back", back: null, catno: null, label: null, collab: [], mbid: null };
  const cands = [];
  // a group found only through one of its tracks (his release is a single off it) has the album's back, not his
  for (const { g } of rgs.filter((x) => x.s >= 1).slice(0, 3)) {
    const rels = (await json(`https://musicbrainz.org/ws/2/release?release-group=${g.id}&inc=labels&fmt=json&limit=100`))?.releases || [];
    rels.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
    if (!out.mbid && rels[0]) {
      const li = rels.flatMap((x) => x["label-info"] || []).find((l) => l["catalog-number"] && !/none/i.test(l["catalog-number"]));
      out = { ...out, mbid: rels[0].id, catno: li?.["catalog-number"] ?? null, label: li?.label?.name ?? rels.flatMap((x) => x["label-info"] || [])[0]?.label?.name ?? null };
    }
    // every release in the group whose CAA entry has a Back: all of them are candidates, and the one kept is the
    // squarest (a 12" back over a CD tray card) and then the largest. Formats tell a vinyl back from a CD's.
    for (const rel of rels.slice(0, 40)) {
      if (!rel["cover-art-archive"]?.back) continue;
      const caa = await json(`https://coverartarchive.org/release/${rel.id}`, {}, 200);
      for (const im of caa?.images || []) if (im.types?.includes("Back")) cands.push({ im, rel });
    }
    if (cands.length >= 12) break;
  }
  let pick = null;
  const frontHash = await dhash(await fs.readFile(path.join(COVERS, "512", `${r.id}.jpg`)));
  for (const c of cands.slice(0, 12)) {
    if (NOT_BACK[c.im.id]) { c.rejected = `${NOT_BACK[c.im.id]} (by eye)`; continue; }
    const file = path.join(CACHE, `${c.im.id}.img`);
    let buf = await fs.readFile(file).catch(() => null);
    if (!buf) { try { buf = (await image(c.im.image)).buf; await fs.writeFile(file, buf); } catch { continue; } }
    let m = await sharp(buf).metadata();
    // a whole outer gatefold spread (twice as wide as tall): the back is its left half
    if (m.width / m.height >= 1.8) { buf = await sharp(buf).extract({ left: 0, top: 0, width: Math.floor(m.width / 2), height: m.height }).toBuffer(); m = await sharp(buf).metadata(); }
    // not a back: a scan that is mostly blank paper round a small object, or a photo of the front
    const g = await sharp(buf).greyscale().resize(64, 64, { fit: "fill" }).raw().toBuffer();
    const blank = g.filter((v) => v > 235).length / g.length;
    // the front again, whole or as a picture inside a product shot: its middle at a few scales against the front
    let same = 64;
    for (const k of [1, 0.9, 0.8, 0.72, 0.65]) {
      const cw = Math.round(m.width * k), ch = Math.round(m.height * k);
      const crop = await sharp(buf).extract({ left: Math.round((m.width - cw) / 2), top: Math.round((m.height - ch) / 2), width: cw, height: ch }).toBuffer();
      same = Math.min(same, hamming(await dhash(crop), frontHash));
    }
    if (blank > 0.55 || same <= 14) { c.rejected = blank > 0.55 ? `mostly blank (${Math.round(blank * 100)}%)` : `the front again (dHash ${same})`; continue; }
    const ar = m.width / m.height;
    const score = (ar > 0.9 && ar < 1.11 ? 1e9 : 0) + m.width * m.height;
    if (!pick || score > pick.score) pick = { ...c, buf, score, w: m.width, h: m.height };
  }
  const rejected = cands.filter((c) => c.rejected).map((c) => c.rejected);
  if (!pick && rejected.length) out.tried = `musicbrainz: CAA backs rejected: ${rejected.join(", ")}`;
  if (pick) {
    const li = (pick.rel["label-info"] || []).find((l) => l["catalog-number"]);
    return { ...out, tried: `musicbrainz: CAA back found (${cands.length} candidates, kept ${pick.w}x${pick.h}${rejected.length ? `; rejected ${rejected.join(", ")}` : ""})`, mbid: pick.rel.id, back: { url: pick.im.image, buf: pick.buf, source: "Cover Art Archive", page: `https://musicbrainz.org/release/${pick.rel.id}` }, catno: li?.["catalog-number"] ?? out.catno, label: li?.label?.name ?? out.label };
  }
  return out;
}

// collaborators: the people credited (artist relationships) on the release and on the recordings of his tracks
async function credits(mbid, r) {
  const rel = await json(`https://musicbrainz.org/ws/2/release/${mbid}?inc=artist-rels+recordings+recording-level-rels+artist-credits&fmt=json`);
  if (!rel) return [];
  const mine = new Set(r.tracks.map((t) => core(t.title)));
  const people = [], add = (rels) => {
    for (const x of rels || []) if (x["target-type"] === "artist" && !DYLAN.test(x.artist?.name || "")) people.push({ name: x.artist.name, role: [x.type, ...(x.attributes || [])].join(" ") });
  };
  add(rel.relations);
  for (const m of rel.media || []) for (const t of m.tracks || []) if (!mine.size || mine.has(core(t.title)) || core(r.release) === core(t.title)) add(t.recording?.relations);
  return people;
}

// ---- 3. Bandcamp through Scrapling ----
async function bandcamp(r) {
  try {
    const { stdout } = await run(path.join(os.homedir(), "tools/rolodex-venv/Scripts/python.exe"), ["-I", path.join(import.meta.dirname, "scrapling_back.py"), r.artist, r.release], { timeout: 90000 });
    const hit = JSON.parse(stdout.trim().split("\n").pop() || "{}");
    return hit.url ? { tried: "bandcamp: extra image found", back: { url: hit.url, source: "Bandcamp (Scrapling)", page: hit.page } } : { tried: `bandcamp: ${hit.why || "no back"}` };
  } catch (e) { return { tried: `bandcamp: ${String(e.message).split("\n")[0].slice(0, 80)}` }; }
}

// MusicBrainz relationship names as people say them: "instrument electric guitar" -> "electric guitar",
// "producer co" -> "co-producer", "engineer task" -> "engineer"; the sleeve's art credits are not collaborators
const roleName = (x) => x.toLowerCase().replace(/\b(task|additional)\b/g, "").replace(/^instrument\s+/, "").replace(/^vocal\s+/, "")
  .replace(/^producer co\b/, "co-producer").replace(/^producer executive\b/, "executive producer").replace(/\s+/g, " ").trim();
const ART = /photograph|illustration|design|art direction|artwork|graphic|liner|booklet/i;
// merge credits by name, the artist's own name left out, at most three roles each
const mergeCollab = (list, r) => {
  const m = new Map(), own = artistsOf(r.artist);
  for (const { name, role } of list) {
    if (ART.test(role) || own.includes(norm(name))) continue;
    if (!m.has(name)) m.set(name, new Set());
    role.split(/,\s*/).map(roleName).filter(Boolean).forEach((x) => m.get(name).add(x));
  }
  // a featured artist on his title ("Arlo Parks, John Glacier") is a collaborator too
  for (const a of r.artist.split(/,|&/).slice(1).map((x) => x.trim()).filter(Boolean)) if (!m.has(a)) m.set(a, new Set(["featured artist"]));
  return [...m].filter(([, roles]) => roles.size).map(([name, roles]) => ({ name, roles: [...roles].slice(0, 3) }));
};

async function save(id, buf) {
  const m = await sharp(buf).metadata();
  // a back that is not square (a CD tray card with its spines) is fitted inside the square on its own edge colour
  const edge = await sharp(buf).resize(1, 1, { fit: "fill" }).raw().toBuffer();
  const side = Math.max(m.width, m.height);
  await sharp(buf).rotate().jpeg({ quality: 92, mozjpeg: true }).toFile(path.join(COVERS, `${id}-back.jpg`));
  const sizes = [];
  for (const w of SIZES) {
    const ww = Math.min(w, side);
    if (sizes.includes(ww)) continue;
    sizes.push(ww);
    const dir = path.join(COVERS, String(ww));
    await fs.mkdir(dir, { recursive: true });
    const img = sharp(buf).rotate().resize(ww, ww, { fit: "contain", background: { r: edge[0], g: edge[1], b: edge[2] } });
    await img.clone().avif({ quality: 60 }).toFile(path.join(dir, `${id}-back.avif`));
    await img.clone().jpeg({ quality: 88, mozjpeg: true }).toFile(path.join(dir, `${id}-back.jpg`));
  }
  return { width: m.width, height: m.height, sizes };
}

// the plain sleeve back: the front's dominant colour, nothing on it (no type on the sleeves)
async function plainBacks(list) {
  for (const p of list) p.buf = await sharp({ create: { width: 2048, height: 2048, channels: 3, background: { r: p.rgb[0], g: p.rgb[1], b: p.rgb[2] } } }).png().toBuffer();
}
if (process.argv.includes("--plain-only")) {
  const have = JSON.parse(await fs.readFile(OUT, "utf8"));
  const list = Object.entries(have).filter(([, x]) => x.back.source === "plain").map(([id, x]) => ({ id, rgb: x.back.rgb }));
  await plainBacks(list);
  for (const p of list) await save(p.id, p.buf);
  console.log(`plain backs remade: ${list.length}`);
  process.exit(0);
}

await fs.mkdir(CACHE, { recursive: true });
const data = JSON.parse(await fs.readFile(DATA, "utf8"));
const prior = FORCE ? {} : JSON.parse(await fs.readFile(OUT, "utf8").catch(() => "{}"));
const priorRows = FORCE ? [] : JSON.parse(await fs.readFile(path.join(import.meta.dirname, "backs-report.json"), "utf8").catch(() => '{"rows":[]}')).rows;
const sleeves = {}, rows = [], plain = [];
for (const r of data.releases) {
  const was = prior[r.id];
  const tried = [];
  let found = null, catno = null, label = null, collab = [], mbid = null;
  if (was && was.back.source !== "plain" && !FORCE) { sleeves[r.id] = { ...was, report: priorRows.find((x) => x.id === r.id) }; rows.push(sleeves[r.id].report); continue; }
  for (const step of [discogs, musicbrainz]) {
    const res = await step(r);
    tried.push(res.tried);
    catno ??= res.catno ?? null; label ??= res.label ?? null; mbid ??= res.mbid ?? null;
    collab.push(...(res.collab || []));
    if (res.back && !found) { found = res.back; break; }
  }
  if (!found) { const res = await bandcamp(r); tried.push(res.tried); found = res.back ?? null; }
  if (mbid && !collab.length) collab = await credits(mbid, r);
  const front = data.releases.find((x) => x.id === r.id);
  let back;
  if (found) {
    try {
      const buf = found.buf ?? (await image(found.url)).buf;
      const meta = await save(r.id, buf);
      back = { source: found.source, url: found.url, page: found.page, ...meta };
      delete found.buf;
    } catch (e) { tried.push(`download failed: ${e.message}`); }
  }
  if (!back) {
    // the dominant colour of the front's 512 JPEG
    const { dominant } = await sharp(path.join(COVERS, "512", `${r.id}.jpg`)).stats();
    const rgb = [dominant.r, dominant.g, dominant.b];
    plain.push({ id: r.id, rgb, catno: catno ?? "CAT. NO. UNKNOWN", label });
    back = { source: "plain", rgb, width: 2048, height: 2048, sizes: SIZES };
  }
  const coll = mergeCollab(collab, r).slice(0, 16);
  sleeves[r.id] = { back, catno, label, collaborators: coll, report: { release: `${r.artist}, ${r.release}`, front: front.coverSource, back: back.source === "plain" ? "no back cover found" : back.url, resolution: back.source === "plain" ? "plain sleeve back, 2048" : `${back.width}x${back.height}`, catno, tried } };
  rows.push({ id: r.id, ...sleeves[r.id].report });
  console.log(r.id.padEnd(48), back.source === "plain" ? "plain" : `${back.source} ${back.width}x${back.height}`, "|", tried.join("; "));
}
await plainBacks(plain);
for (const p of plain) await save(p.id, p.buf);
// the page gets the sleeve data only; how each was found goes to the report
await fs.writeFile(OUT, JSON.stringify(Object.fromEntries(Object.entries(sleeves).map(([k, { report, ...v }]) => [k, v])), null, 2) + "\n");
await fs.writeFile(path.join(import.meta.dirname, "backs-report.json"), JSON.stringify({
  at: new Date().toISOString(),
  discogs: TOKEN ? "token used" : "no token: Chrome was not signed in to Discogs, so no user token could be made; MusicBrainz + Cover Art Archive used instead",
  backs: rows.filter((x) => x.back !== "no back cover found").length, plain: plain.length, rows,
}, null, 2) + "\n");
console.log(`backs ${rows.length - plain.length}, plain ${plain.length}`);

// the table in docs/gillenwebsite/BACKS.md: release, front source, back source, resolution
const cell = (s) => String(s ?? "").replace(/\|/g, "\|");
const SOURCE = { "static.wixstatic.com": "dylansproduce.net", "is1-ssl.mzstatic.com": "iTunes", "coverartarchive.org": "Cover Art Archive" };
const host = (u) => { try { const h = new URL(u).hostname.replace(/^www\./, ""); return SOURCE[h] ?? h; } catch { return u; } };
await fs.writeFile(path.join(ROOT, "docs/gillenwebsite/BACKS.md"), [
  "# Sleeve backs",
  "",
  "Written by `scripts/gillenwebsite/backs.mjs`. " + (TOKEN ? "Discogs (user token) first, then" : "No Discogs token: Chrome was not signed in to Discogs, so no user token could be made. Discogs is skipped and the order is") + " MusicBrainz + Cover Art Archive (images typed Back), then Bandcamp through Scrapling. A release with no back gets a plain sleeve back: the front's dominant colour, with no type on it.",
  "",
  `${rows.length - plain.length} backs found, ${plain.length} plain.`,
  "",
  "| # | Release | Front source | Back source | Resolution | Cat. no. |",
  "|---|---|---|---|---|---|",
  ...rows.map((x, k) => `| ${k + 1} | ${cell(x.release)} | ${cell(host(x.front))} | ${x.back === "no back cover found" ? "no back cover found (plain sleeve back)" : `[${cell(host(x.back))}](${x.back})`} | ${cell(x.resolution)} | ${cell(x.catno ?? "unknown")} |`),
  "",
].join("\n"));
