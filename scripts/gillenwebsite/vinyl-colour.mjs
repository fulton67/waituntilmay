// The record's colour in the record view, per release.
//   node scripts/gillenwebsite/vinyl-colour.mjs
// The rule: Discogs' colour variant if one is listed, otherwise the cover's dominant colour darkened to 25% lightness.
// White only if Discogs lists white vinyl.
//  - the release's MusicBrainz release group (matched as backs.mjs does), its releases on vinyl (media format),
//    and their links to Discogs (url relationships)
//  - each linked Discogs release from the public API (api.discogs.com/releases/<id>, no token needed): its format
//    text and descriptions ("Red Translucent", "White", "Black"). The first edition (by date) whose vinyl is a colour
//    other than black gives the colour; "Black" alone means the plain record, which takes the cover rule like the rest
//  - otherwise the dominant colour of the front cover (public/covers/512) darkened to HSL lightness 25% (a darker
//    cover keeps its own lightness)
// Writes lib/gillenwebsite/vinyl-colours.json and scripts/gillenwebsite/vinyl-colour-report.json.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const CACHE = path.join(import.meta.dirname, "cache/backs");
const UA = "waituntilmay-gillenwebsite/1.0 (https://waituntilmay.com/gillenwebsite)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const last = {};
async function json(url, gap) {
  const key = path.join(CACHE, createHash("sha1").update(url).digest("hex") + ".json");
  const hit = await fs.readFile(key, "utf8").catch(() => null);
  if (hit) return JSON.parse(hit);
  const host = new URL(url).host;
  for (let i = 0; i < 5; i++) {
    const wait = (last[host] ?? 0) + gap - Date.now();
    if (wait > 0) await sleep(wait);
    last[host] = Date.now();
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } }).catch(() => null);
    if (r?.ok) { const j = await r.json(); await fs.writeFile(key, JSON.stringify(j)); return j; }
    if (r && r.status !== 429 && r.status < 500) return null;
    await sleep(5000 * (i + 1));
  }
  return null;
}
// matching, as backs.mjs
const norm = (s) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/\b(the|ft|feat|featuring)\b\.?/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const core = (s) => norm(s.replace(/\s*[([].*?[)\]]/g, "").replace(/\s+-\s+(single|ep)$/i, ""));
const artistsOf = (a) => a.split(/,|&| and | x /i).map(norm).filter(Boolean);
const artistOk = (want, got) => { const g = norm(got); return artistsOf(want).some((a) => g.includes(a) || a.includes(g)); };
const titleScore = (want, got) => {
  const w = core(want.replace(/\s+(ft|feat)\.?\s.*$/i, "")), g = core(got.replace(/\s+(ft|feat)\.?\s.*$/i, ""));
  if (!w || !g) return 0; if (w === g) return 3; if (g.startsWith(w + " ")) return 2;
  const ws = w.split(" "), gs = new Set(g.split(" "));
  return ws.length >= 4 && ws.filter((x) => gs.has(x)).length / ws.length >= 0.85 ? 1 : 0;
};
const words = (s) => s.replace(/\s+(ft|feat)\.?\s.*$/i, "").replace(/[^\p{L}\p{N}&]+/gu, " ").trim();

// vinyl colour names as Discogs writes them, to a colour; the first one named wins. Clear vinyl is a smoked grey (on
// the white ground a clear record would read as white, and white is only for records Discogs lists as white)
const COLOURS = [
  ["white", "#f2f0ea"], ["cream", "#ece2c6"], ["clear", "#454b51"], ["transparent", "#454b51"], ["crystal", "#454b51"],
  ["red", "#a3161c"], ["oxblood", "#5a1013"], ["maroon", "#5a1013"], ["pink", "#e07aa2"], ["magenta", "#b0206e"],
  ["orange", "#d9661e"], ["yellow", "#e6c42a"], ["gold", "#c9a227"], ["green", "#2e7d4f"], ["olive", "#6b6b2a"],
  ["teal", "#1f7a78"], ["turquoise", "#2aa6a0"], ["blue", "#2546a8"], ["navy", "#1b2650"], ["purple", "#5b2a86"],
  ["violet", "#6a3fa0"], ["lilac", "#b59ad4"], ["silver", "#b9bcc0"], ["grey", "#6e7176"], ["gray", "#6e7176"],
  ["brown", "#6a4327"], ["bone", "#e3d9c3"], ["beige", "#d8c7a6"],
];
const colourIn = (text) => {
  const t = text.toLowerCase();
  let best = null;
  for (const [w, hex] of COLOURS) { const k = t.search(new RegExp(`\\b${w}\\b`)); if (k >= 0 && (!best || k < best.k)) best = { k, w, hex }; }
  return best;
};
const hsl25 = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0; const l0 = (mx + mn) / 2, s = d === 0 ? 0 : d / (1 - Math.abs(2 * l0 - 1));
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  // darkened to 25% lightness: a cover already darker than that keeps its own
  const l = Math.min(l0, 0.25), c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [R, G, B] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [R, G, B].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
};

await fs.mkdir(CACHE, { recursive: true });
const data = JSON.parse(await fs.readFile(path.join(ROOT, "lib/gillenwebsite/discography.json"), "utf8"));
const out = {}, rows = [];
for (const r of data.releases) {
  const lead = r.artist.split(",")[0];
  const loose = words(r.release.replace(/\s*[([].*?[)\]]/g, "")).replace(/&/g, " ");
  const groups = [];
  for (const q of [`releasegroup:"${words(r.release)}" AND artist:"${words(lead)}"`, `releasegroup:(${loose}) AND artist:(${words(lead)})`, `releasegroup:(${loose})`]) {
    const res = await json(`https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(q)}&fmt=json&limit=25`, 1100);
    for (const g of res?.["release-groups"] || []) {
      const a = (g["artist-credit"] || []).map((c) => c.name + (c.joinphrase || "")).join("");
      const who = artistOk(r.artist, a) || (/various artists/i.test(a) && titleScore(r.release, g.title) === 3);
      if (who && titleScore(r.release, g.title) >= 1 && !groups.find((x) => x.id === g.id)) groups.push(g);
    }
    if (groups.length) break;
  }
  const editions = [];
  for (const g of groups.slice(0, 2)) {
    const rels = (await json(`https://musicbrainz.org/ws/2/release?release-group=${g.id}&inc=media+url-rels&fmt=json&limit=100`, 1100))?.releases || [];
    for (const rel of rels) {
      if (!(rel.media || []).some((m) => /vinyl/i.test(m.format || ""))) continue;
      const dg = (rel.relations || []).find((x) => x.type === "discogs" && /\/release\/\d+/.test(x.url?.resource || ""));
      editions.push({ mb: rel.id, date: rel.date || "9999", discogs: dg ? dg.url.resource.match(/\/release\/(\d+)/)[1] : null });
    }
  }
  editions.sort((a, b) => a.date.localeCompare(b.date));
  let pick = null, seen = [];
  for (const e of editions.filter((x) => x.discogs).slice(0, 12)) {
    const d = await json(`https://api.discogs.com/releases/${e.discogs}`, 2600);
    const vinyl = (d?.formats || []).filter((f) => /vinyl/i.test(f.name));
    const text = vinyl.map((f) => [f.text, ...(f.descriptions || [])].filter(Boolean).join(" ")).join("; ");
    seen.push({ discogs: e.discogs, date: e.date, text });
    const c = colourIn(vinyl.map((f) => f.text || "").join(" "));
    if (c && !pick) pick = { ...c, discogs: e.discogs, text };
  }
  let colour, source, detail;
  if (pick) { colour = pick.hex; source = "Discogs"; detail = `${pick.w}: "${pick.text}" (discogs.com/release/${pick.discogs})`; }
  else {
    const { dominant } = await sharp(path.join(ROOT, "public/covers/512", `${r.id}.jpg`)).stats();
    colour = hsl25([dominant.r, dominant.g, dominant.b]); source = "cover";
    detail = `dominant rgb(${dominant.r}, ${dominant.g}, ${dominant.b}) darkened to 25% lightness` + (editions.length ? `; ${editions.length} vinyl editions on MusicBrainz, ${seen.length} on Discogs, none coloured` : "; no vinyl edition found");
  }
  out[r.id] = { colour, source };
  rows.push({ id: r.id, release: `${r.artist}, ${r.release}`, colour, source, detail, discogsEditions: seen });
  console.log(r.id.padEnd(46), colour, source.padEnd(7), detail.slice(0, 110));
}
await fs.writeFile(path.join(ROOT, "lib/gillenwebsite/vinyl-colours.json"), JSON.stringify(out, null, 2) + "\n");
await fs.writeFile(path.join(import.meta.dirname, "vinyl-colour-report.json"), JSON.stringify({ at: new Date().toISOString(), rule: "Discogs colour variant if listed (clear as smoked grey), else the cover's dominant colour darkened to HSL lightness 25%; white only if Discogs lists white", rows }, null, 2) + "\n");
