/**
 * Find Houthi x cable videos through the Apify YouTube scraper.
 *
 * Six searches, deduped by video id, written whole to
 * sources/houthi-candidates.json. Then a relevance pass picks the ten to
 * ingest: the brief's test is that the title or description is about cables,
 * not about strikes in general, so cable vocabulary scores and strike
 * vocabulary alone does not.
 *
 *   node --env-file=.env.local scripts/apify-search.mjs
 *   node --env-file=.env.local scripts/apify-search.mjs --confirm
 *   node --env-file=.env.local scripts/apify-search.mjs --pick 10
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ACTOR = "h7sDV53CddomktSi5";
const API = "https://api.apify.com/v2";
const OUT = "sources/houthi-candidates.json";
const PICKED = "sources/houthi-picked.json";

const QUERIES = [
  "Houthi undersea cables",
  "Houthi Red Sea cables",
  "Red Sea submarine cable cut",
  "Rubymar cable damage Red Sea",
  "Houthis internet cables Yemen",
  "Red Sea cables internet outage 2024",
];

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const PICK = Number(argOf("--pick", "10"));
const MAX_MINUTES = Number(argOf("--max-minutes", "15"));
const PER_QUERY = Number(argOf("--per-query", "40"));

const token = process.env.APIFY_TOKEN;
if (!token) {
  console.error("APIFY_TOKEN is not set. Add it to .env.local and run with\n"
    + "  node --env-file=.env.local scripts/apify-search.mjs");
  process.exit(1);
}

/** Never print the token, including inside an error body. */
const scrub = (s) => String(s).split(token).join("<APIFY_TOKEN>");

async function api(pathname, init = {}) {
  const r = await fetch(`${API}${pathname}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers || {}) },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${init.method || "GET"} ${pathname} -> `
    + `${r.status} ${scrub(text).slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

/* ------------------------------------------------- confirm the actor first */
async function confirmActor() {
  const a = await api(`/acts/${ACTOR}`);
  const d = a.data ?? a;
  const full = `${d.username}/${d.name}`;
  console.log(`actor ${ACTOR}`);
  console.log(`  ${full}`);
  console.log(`  title: ${d.title ?? "(none)"}`);
  const ok = full === "streamers/youtube-scraper";
  console.log(ok
    ? "  confirmed: streamers/youtube-scraper"
    : `  WARNING: expected streamers/youtube-scraper, got ${full}`);
  return { full, ok, title: d.title };
}

/* ----------------------------------------------------------- run a search */
async function search(q) {
  const run = await api(`/acts/${ACTOR}/runs?waitForFinish=300`, {
    method: "POST",
    body: JSON.stringify({
      searchQueries: [q],
      maxResults: PER_QUERY,
      maxResultsShorts: 0,
      maxResultStreams: 0,
      sortVideosBy: "r",
      dateFilter: "",
    }),
  });
  const d = run.data ?? run;
  if (d.status !== "SUCCEEDED") {
    console.log(`  ${q}: run ${d.status}`);
    return [];
  }
  const items = await api(`/datasets/${d.defaultDatasetId}/items?clean=true&limit=200`);
  console.log(`  ${q}: ${items.length}`);
  return items.map((it) => ({ query: q, ...it }));
}

/* -------------------------------------------------------------- relevance */
// cables: what the brief is actually looking for
const CABLE = /\b(cable|cables|undersea|submarine|subsea|fib(er|re)|seacom|aae-?1|eig\b|internet (outage|traffic|disruption)|connectivity)\b/i;
// strikes alone: present in most of the pool, so it cannot be the signal
const STRIKE = /\b(houthi|houthis|red sea|yemen|strike|strikes|attack|attacks|drone|missile|rubymar|ansar allah)\b/i;
const NOISE = /\b(live stream|full episode|podcast|reaction|shorts|music)\b/i;

function score(v) {
  const t = String(v.title ?? "");
  const d = String(v.text ?? v.description ?? "");
  let s = 0;
  const tc = (t.match(CABLE) || []).length;
  const dc = (d.match(CABLE) || []).length;
  // a cable in the title is the strongest signal the brief names
  if (CABLE.test(t)) s += 10;
  if (CABLE.test(d)) s += 4;
  s += Math.min(3, tc + dc);
  if (STRIKE.test(t) || STRIKE.test(d)) s += 2;
  if (NOISE.test(t)) s -= 4;
  const dur = Number(v.duration_s ?? 0);
  if (dur > 0 && dur <= MAX_MINUTES * 60) s += 3; else if (dur > 0) s -= 99;
  if (dur > 0 && dur < 45) s -= 6;          // too short to cut phrases from
  return s;
}

function toSeconds(d) {
  if (typeof d === "number") return d;
  if (!d) return 0;
  const p = String(d).split(":").map(Number);
  if (p.some(Number.isNaN)) return 0;
  return p.reduce((a, b) => a * 60 + b, 0);
}

function normalise(v) {
  const id = v.id ?? v.videoId
    ?? (String(v.url ?? "").match(/[?&]v=([\w-]{11})/) || [])[1] ?? null;
  return {
    id,
    title: v.title ?? null,
    channel: v.channelName ?? v.channel ?? v.channelTitle ?? null,
    date: v.date ?? v.uploadDate ?? v.publishedAt ?? null,
    duration: v.duration ?? null,
    duration_s: toSeconds(v.duration ?? v.durationSeconds ?? v.lengthSeconds),
    views: v.viewCount ?? v.views ?? null,
    url: v.url ?? (id ? `https://www.youtube.com/watch?v=${id}` : null),
    text: (v.text ?? v.description ?? "").slice(0, 600),
    query: v.query,
  };
}

/* ------------------------------------------------------------------- main */
const actor = await confirmActor();
if (has("--confirm")) process.exit(actor.ok ? 0 : 2);

console.log(`\n${QUERIES.length} searches, up to ${PER_QUERY} results each:`);
const seen = new Map();
for (const q of QUERIES) {
  let items = [];
  try { items = await search(q); }
  catch (e) { console.log(`  ${q}: FAILED ${scrub(e.message)}`); }
  for (const raw of items) {
    const v = normalise(raw);
    if (!v.id) continue;
    const prev = seen.get(v.id);
    if (prev) { prev.queries.push(q); continue; }
    v.queries = [q];
    delete v.query;
    seen.set(v.id, v);
  }
}

const all = [...seen.values()];
for (const v of all) v.score = score(v);
all.sort((a, b) => b.score - a.score);

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify({
  actor: { id: ACTOR, name: actor.full, confirmed: actor.ok },
  queries: QUERIES, found: all.length,
  fetched: new Date().toISOString(),
  candidates: all,
}, null, 1));
console.log(`\n${all.length} unique candidates -> ${OUT}`);

const picked = all.filter((v) => v.duration_s > 0
  && v.duration_s <= MAX_MINUTES * 60 && v.score > 0).slice(0, PICK);
await writeFile(PICKED, JSON.stringify(picked.map((v, i) => ({
  id: `houthi-${String(i + 1).padStart(2, "0")}`, ...v,
})), null, 1));

console.log(`\ntop ${picked.length} by relevance (<= ${MAX_MINUTES} min):`);
for (const [i, v] of picked.entries()) {
  console.log(`${String(i + 1).padStart(2)}. [${String(v.score).padStart(3)}] `
    + `${(v.duration ?? "?").toString().padStart(7)}  ${v.channel ?? "?"}`);
  console.log(`     ${v.title}`);
  console.log(`     ${v.url}`);
}
console.log(`\n${PICKED}`);
