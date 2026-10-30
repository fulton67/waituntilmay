// Scrape dylansproduce.net in Chrome and rebuild the /gillenwebsite data from it.
//   node scripts/gillenwebsite/scrape.mjs
// Opens every page of the site fully loaded (load, network idle, +5 s, scroll to the bottom and back),
// parses the discography text into releases and tracks, matches the homepage artwork to releases,
// and saves each cover at 1024x1024 JPEG q85 to public/covers/<release-id>.jpg.
// Writes lib/gillenwebsite/discography.json, lib/gillenwebsite/about.json and scripts/gillenwebsite/scrape-report.json.
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SITE = "https://www.dylansproduce.net";
// Every page in the site's own page list (pageUriSEO in the served HTML); home is "/"
const PAGES = ["", "discography", "about", "contact", "portfolio", "collection", "project", "accessibility-statement", "privacy-policy", "terms-and-conditions"];
// Artwork on the homepage whose filename names no release, matched by looking at the image
const BY_EYE = {
  "FINAL ART.jpg": { release: "BLUE", why: "the artwork is a blue wax seal stamped with the word BLUE" },
};

const clean = (s) => s.replace(/[​‌‍﻿]/g, "").replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();
const slug = (s) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const words = (s) => s.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);

async function open(browser, p) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const res = await page.goto(`${SITE}/${p}`, { waitUntil: "load", timeout: 90000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(5000);
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h + 900; y += 600) { await page.mouse.wheel(0, 600); await page.waitForTimeout(200); }
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(1500);
  const out = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    text: document.body.innerText,
    images: [...document.querySelectorAll("img")].map((i) => ({ alt: i.alt, src: i.currentSrc || i.src })),
    links: [...new Set([...document.querySelectorAll("a[href]")].map((a) => a.href))],
  }));
  const html = await page.content();
  await page.close();
  return { status: res?.status() ?? 0, ...out, html };
}

// The discography page is text: a year line, then "Artist — Release", then either a bare role line
// or one line per track: "Title" - Role. Releases are separated by zero-width-space lines.
function parseDiscography(text) {
  const lines = text.split("\n").map(clean).filter(Boolean);
  const start = lines.indexOf("DISCOGRAPHY");
  const releases = [];
  let year = null, cur = null;
  for (const l of lines.slice(start + 1)) {
    if (/^\d{4}$/.test(l)) { year = Number(l); cur = null; continue; }
    const head = l.match(/^(.+?)\s*—\s*(.+)$/);
    const track = l.match(/^"(.+)"\s*-\s*(.+)$/);
    if (head && !track) { cur = { year, artist: clean(head[1]), release: clean(head[2]), role: "", tracks: [] }; releases.push(cur); continue; }
    if (!cur) continue;
    if (track) cur.tracks.push({ title: clean(track[1]), role: clean(track[2]) });
    else if (!cur.role) cur.role = l;
  }
  for (const r of releases) {
    // a release with tracks takes its role from them, in the order the roles first appear
    if (!r.role) r.role = [...new Set(r.tracks.flatMap((t) => t.role.split(/,\s*/)))].join(", ");
  }
  return releases;
}

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const pages = {};
for (const p of PAGES) {
  pages[p || "home"] = await open(browser, p);
  console.log(`${(p || "home").padEnd(24)} ${pages[p || "home"].status} ${pages[p || "home"].url}`);
}
await browser.close();

const parsed = parseDiscography(pages.discography.text);
// the page lists one release twice; keep the first
const seen = new Set(), duplicates = [];
const releases = parsed.filter((r) => {
  const k = `${r.year}|${r.artist}|${r.release}`.toLowerCase();
  if (seen.has(k)) { duplicates.push(`${r.year} ${r.artist} — ${r.release}`); return false; }
  seen.add(k); return true;
}).map((r, i) => ({ id: `${String(i + 1).padStart(2, "0")}-${slug(r.artist)}-${slug(r.release)}`, ...r, cover: "", coverSource: "" }));

// Artwork: every Wix media image on every page, at its original size
const art = new Map();
for (const [name, pg] of Object.entries(pages)) {
  for (const im of pg.images) {
    const m = im.src.match(/static\.wixstatic\.com\/media\/([^/]+?~mv2\.[a-z]+)/i);
    if (m && !art.has(m[1])) art.set(m[1], { alt: im.alt, page: name, original: `https://static.wixstatic.com/media/${m[1]}` });
  }
}
const matches = [], unmatched = [];
for (const a of art.values()) {
  if (a.page === "about") continue; // his portrait
  let best = null;
  const eye = BY_EYE[a.alt];
  if (eye) best = { r: releases.find((r) => r.release === eye.release), how: `by eye: ${eye.why}` };
  else {
    const aw = new Set(words(a.alt));
    for (const r of releases) {
      const rw = words(r.release);
      if (!rw.length) continue;
      const score = rw.filter((w) => aw.has(w)).length / rw.length;
      if (score >= 0.6 && (!best || score > best.score)) best = { r, score, how: `filename "${a.alt}" names the release` };
    }
  }
  if (best?.r && !best.r.cover) { best.r.cover = `/covers/${best.r.id}.jpg`; best.r.coverSource = a.original; matches.push({ id: best.r.id, alt: a.alt, how: best.how, url: a.original }); }
  else unmatched.push(a);
}

await fs.mkdir(path.join(ROOT, "public/covers"), { recursive: true });
for (const r of releases.filter((r) => r.cover)) {
  const res = await fetch(r.coverSource, { headers: { "User-Agent": "Mozilla/5.0", Referer: SITE } });
  if (!res.ok) throw new Error(`${r.coverSource}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buf).metadata();
  await sharp(buf).resize(1024, 1024, { fit: "cover" }).jpeg({ quality: 85, mozjpeg: true }).toFile(path.join(ROOT, "public", r.cover));
  console.log(`cover ${r.id}  ${meta.width}x${meta.height} -> 1024x1024`);
}

// About: the paragraph between the ABOUT heading and the Instagram link, verbatim
const al = pages.about.text.split("\n").map((l) => l.replace(/[​﻿]/g, "")).filter((l) => l.trim());
const about = al.slice(al.indexOf("ABOUT") + 1, al.indexOf("Instagram")).join("\n\n");
const contact = pages.about.links.find((l) => l.startsWith("mailto:"))?.replace(/^mailto:/, "").replace(/\?.*$/, "") || "";

await fs.mkdir(path.join(ROOT, "lib/gillenwebsite"), { recursive: true });
await fs.writeFile(path.join(ROOT, "lib/gillenwebsite/discography.json"), JSON.stringify({ source: `${SITE}/discography (read ${new Date().toISOString().slice(0, 10)} in Chrome)`, releases }, null, 2) + "\n");
await fs.writeFile(path.join(ROOT, "lib/gillenwebsite/about.json"), JSON.stringify({ source: `${SITE}/about`, text: about, instagram: "https://www.instagram.com/dylanneu/", contact }, null, 2) + "\n");
const report = {
  pages: Object.fromEntries(Object.entries(pages).map(([k, v]) => [k, { status: v.status, url: v.url, title: v.title, images: v.images.length, chars: v.text.length }])),
  releases: releases.length,
  tracks: releases.reduce((a, r) => a + r.tracks.length, 0),
  duplicatesDropped: duplicates,
  covers: matches,
  artworkNotMatched: unmatched.map((a) => ({ alt: a.alt, page: a.page, url: a.original })),
  noCover: releases.filter((r) => !r.cover).map((r) => r.id),
};
// each page's rendered text, as read, so the report can be checked against it
await fs.mkdir(path.join(ROOT, "scripts/gillenwebsite/pages"), { recursive: true });
for (const [k, v] of Object.entries(pages)) await fs.writeFile(path.join(ROOT, `scripts/gillenwebsite/pages/${k}.txt`), `${v.url}\n${v.title}\n\n${v.text}\n`);
await fs.writeFile(path.join(ROOT, "scripts/gillenwebsite/scrape-report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(`releases ${report.releases}, tracks ${report.tracks}, covers ${matches.length}, no cover ${report.noCover.length}, duplicates dropped ${duplicates.length}, artwork not matched ${unmatched.length}`);
