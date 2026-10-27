/**
 * Find Houthi x cable videos through the Apify YouTube scraper.
 *
 * Nine searches - seven English, two Arabic - launched in parallel and
 * deduped by video id, written whole to sources/houthi-candidates.json with
 * the Apify run id of every search so each one can be opened in the console.
 *
 * This script does NOT decide what is relevant. A title is a headline writer's
 * summary, and "Houthi attack" videos outnumber "Houthi cable" videos by an
 * order of magnitude in these results; selecting on it would fill the pool
 * with strike footage that never says the word cable. All this does is throw
 * out what cannot be used - too long, too short, music, compilations - and
 * hand the survivors to the transcript filter, which reads what was actually
 * said. See scripts/houthi_select.py.
 *
 *   node --env-file=.env.local scripts/apify-search.mjs --confirm
 *   node --env-file=.env.local scripts/apify-search.mjs
 *   node --env-file=.env.local scripts/apify-search.mjs --per-query 50 --shortlist 24
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ACTOR = "h7sDV53CddomktSi5";
const EXPECT = "streamers/youtube-scraper";
const API = "https://api.apify.com/v2";
const OUT = "sources/houthi-candidates.json";
const SHORT = "sources/houthi-shortlist.json";

const QUERIES = [
  "Houthi undersea cables",
  "Houthis Red Sea internet cables",
  "Red Sea cables cut 2024",
  "Rubymar anchor cables",
  "Seacom AAE-1 EIG cable damage Red Sea",
  "Houthi threat submarine cables",
  "Bab el-Mandeb internet cables",
  "الحوثي الكابلات البحرية",
  "قطع الكابلات البحر الأحمر",
];

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const PER_QUERY = Number(argOf("--per-query", "50"));
const SHORTLIST = Number(argOf("--shortlist", "24"));
const MAX_MINUTES = Number(argOf("--max-minutes", "20"));
const MIN_SECONDS = Number(argOf("--min-seconds", "60"));
// the free plan's ceiling; exceeding it loses the surplus launches to a 402
const CONCURRENCY = Number(argOf("--concurrency", "5"));
const SETTLE_MS = Number(argOf("--settle-minutes", "25")) * 60000;

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
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${init.method || "GET"} ${pathname} -> `
    + `${r.status} ${scrub(text).slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------- confirm the actor first */
async function confirmActor() {
  const a = await api(`/acts/${ACTOR}`);
  const d = a.data ?? a;
  const full = `${d.username}/${d.name}`;
  const ok = full === EXPECT;
  console.log(`actor ${ACTOR}`);
  console.log(`  ${full}`);
  console.log(`  title: ${d.title ?? "(none)"}`);
  console.log(`  ${ok ? `confirmed: ${EXPECT}` : `WARNING: expected ${EXPECT}`}`);
  return { full, ok, title: d.title };
}

/* --------------------------------------------------------- run the searches */
// One run per query rather than one run with nine, so a result can be
// attributed to the query that found it and every run has its own id to open.
async function launch(q) {
  const run = await api(`/acts/${ACTOR}/runs`, {
    method: "POST",
    body: JSON.stringify({
      searchQueries: [q],
      maxResults: PER_QUERY,
      maxResultsShorts: 0,
      maxResultStreams: 0,
      // sortVideosBy and dateFilter are left out on purpose. Both are
      // enums with no empty member - the actor rejects "" with a 400 - and
      // omitting them keeps YouTube's own relevance order, which is what a
      // search for a thing that happened once should be ranked by.
      videoType: "video",
      transcriptionAndSubtitle: "NONE",
      saveSubsToKVS: false,
    }),
  });
  const d = run.data ?? run;
  console.log(`  launched ${d.id}  ${q}`);
  return { q, id: d.id, datasetId: d.defaultDatasetId };
}

const LIVE_STATUS = new Set(["RUNNING", "READY"]);

async function status(id) {
  return (await api(`/actor-runs/${id}`)).data;
}

async function settle(run, timeoutMs = SETTLE_MS) {
  const t0 = Date.now();
  for (;;) {
    const r = await status(run.id);
    if (!LIVE_STATUS.has(r.status)) {
      return { ...run, status: r.status, datasetId: r.defaultDatasetId,
               items: r.stats?.itemCount ?? null };
    }
    if (Date.now() - t0 > timeoutMs) return { ...run, status: "TIMED_OUT_LOCALLY" };
    await sleep(10000);
  }
}

/** Run the queue respecting the account's concurrent-run limit.
 *
 * The free plan allows five, and the first attempt launched nine: four came
 * back 402 and were lost. Apify also restarts a run that migrates between
 * workers, which resets its clock - the first attempt gave up locally after
 * ten minutes on runs that had just been restarted, so the wait is long and
 * the state is written to disk after every settle, letting a re-run adopt
 * what is already finished instead of paying for it twice.
 */
async function drain(queue, prior) {
  const out = [];
  const inFlight = [];

  const adoptable = (q) => {
    const p = prior.get(q);
    return p && (p.status === "SUCCEEDED" || LIVE_STATUS.has(p.status)) ? p : null;
  };

  for (const q of queue) {
    const p = adoptable(q);
    if (p && p.status === "SUCCEEDED") {
      console.log(`  reusing ${p.id}  (already SUCCEEDED)  ${q}`);
      out.push({ ...p, q });
      continue;
    }
    if (p) {
      console.log(`  adopting ${p.id}  (${p.status})  ${q}`);
      inFlight.push({ ...p, q });
    } else {
      while (inFlight.length >= CONCURRENCY) {
        const done = await settle(inFlight.shift());
        console.log(`  ${done.id}  ${done.status.padEnd(10)}  ${done.q}`);
        out.push(done);
      }
      try { inFlight.push(await launch(q)); }
      catch (e) {
        console.log(`  FAILED to launch ${q}: ${scrub(e.message)}`);
        out.push({ q, id: null, status: "NOT_LAUNCHED" });
      }
    }
  }
  for (const r of inFlight) {
    const done = await settle(r);
    console.log(`  ${done.id}  ${done.status.padEnd(10)}  ${done.q}`);
    out.push(done);
  }
  return out;
}

/* --------------------------------------------- what cannot be used at all */
// Not relevance - usability. A 3-hour livestream and a 40-second clip are both
// unusable whatever they say, and a music video has no speech to cut phrases
// from. Everything else goes to the transcript filter.
const MUSIC = /\b(song|music|audio|nasheed|anthem|remix|lyrics|beat|instrumental|compilation|montage|best of|top \d+|mix \d{4}|full album)\b/i;
const LIVE = /\b(live stream|livestream|24\/7|full (episode|show|match))\b/i;
const SPEECHY = /\b(news|report|explain|analysis|interview|briefing|statement|press|documentary|why|how|what|bbc|cnn|al jazeera|dw|france 24|reuters|ap\b|sky news|wion|trt|cgtn|وثائقي|تقرير|أخبار|مقابلة|تحليل)\b/i;

function toSeconds(d) {
  if (typeof d === "number" && Number.isFinite(d)) return d;
  if (!d) return 0;
  const p = String(d).trim().split(":").map(Number);
  if (!p.length || p.some(Number.isNaN)) return 0;
  return p.reduce((a, b) => a * 60 + b, 0);
}

function normalise(v) {
  const id = v.id ?? v.videoId
    ?? (String(v.url ?? "").match(/[?&]v=([\w-]{11})/) || [])[1] ?? null;
  const text = String(v.text ?? v.description ?? "");
  return {
    id,
    title: v.title ?? null,
    channel: v.channelName ?? v.channel ?? v.channelTitle ?? null,
    date: v.date ?? v.uploadDate ?? v.publishedAt ?? null,
    duration: v.duration ?? null,
    duration_s: toSeconds(v.duration ?? v.durationSeconds ?? v.lengthSeconds),
    views: v.viewCount ?? v.views ?? null,
    url: v.url ?? (id ? `https://www.youtube.com/watch?v=${id}` : null),
    text: text.slice(0, 500),
  };
}

function usable(v) {
  const t = `${v.title ?? ""} ${v.text ?? ""}`;
  if (!v.id || !v.url) return "no id";
  if (!v.duration_s) return "unknown length";
  if (v.duration_s < MIN_SECONDS) return `${v.duration_s}s too short`;
  if (v.duration_s > MAX_MINUTES * 60) return `${(v.duration_s / 60).toFixed(0)}min too long`;
  if (MUSIC.test(t)) return "music/compilation";
  if (LIVE.test(t)) return "livestream/full episode";
  return null;
}

/* ------------------------------------------------------------------- main */
const actor = await confirmActor();
if (has("--confirm")) process.exit(actor.ok ? 0 : 2);
if (!actor.ok) {
  console.error("refusing to run: the actor is not the one the brief names");
  process.exit(2);
}

// adopt whatever a previous invocation already paid for
let prior = new Map();
try {
  const old = JSON.parse(await readFile(OUT, "utf8"));
  for (const r of old.runs ?? []) if (r.id) prior.set(r.q, r);
} catch { /* first run */ }

console.log(`\n${QUERIES.length} searches, up to ${PER_QUERY} results each, `
  + `${CONCURRENCY} at a time:`);
const done = await drain(QUERIES, prior);

const seen = new Map();
for (const r of done) {
  if (r.status !== "SUCCEEDED") continue;
  let items = [];
  try {
    items = await api(`/datasets/${r.datasetId}/items?clean=true&limit=200`);
  } catch (e) { console.log(`  dataset ${r.datasetId}: ${scrub(e.message)}`); continue; }
  console.log(`  ${r.q}: ${items.length} items`);
  for (const raw of items) {
    const v = normalise(raw);
    if (!v.id) continue;
    const prev = seen.get(v.id);
    if (prev) { if (!prev.queries.includes(r.q)) prev.queries.push(r.q); continue; }
    v.queries = [r.q];
    v.runId = r.id;
    seen.set(v.id, v);
  }
}

const all = [...seen.values()];
for (const v of all) v.unusable = usable(v);

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify({
  actor: { id: ACTOR, name: actor.full, confirmed: actor.ok },
  runs: done.map(({ q, id, datasetId, status }) => ({ q, id, datasetId, status })),
  queries: QUERIES,
  filter: { max_minutes: MAX_MINUTES, min_seconds: MIN_SECONDS },
  found: all.length,
  fetched: new Date().toISOString(),
  candidates: all,
}, null, 1));
console.log(`\n${all.length} unique candidates -> ${OUT}`);

const kept = all.filter((v) => !v.unusable);
const dropped = all.length - kept.length;
const why = {};
for (const v of all) if (v.unusable) {
  const k = v.unusable.replace(/^\d+(s|min)\s/, "$1 ");
  why[k] = (why[k] ?? 0) + 1;
}
console.log(`${dropped} dropped on metadata: ${JSON.stringify(why)}`);

// The shortlist is an ordering, never a verdict. 295 videos survive the
// metadata filter and only a couple of dozen can be transcribed, so
// something has to decide what goes first - and ordering by views alone put
// twelve near-identical strike clips at the top, which is the trap the brief
// names: they are titled Houthi and never say cable. A cable word in the
// title or description is the best cheap guess at which videos will pass the
// transcript test, so it goes first here. It buys a place in the queue and
// nothing else: keep or reject is decided by houthi_select.py on what was
// actually said, and plenty of these will be rejected.
const CABLE_META = /\b(cable|cables|undersea|under[- ]?sea|submarine|subsea|fib(er|re)|seacom|aae-?1|eig\b|internet (cable|outage|traffic|disruption)|connectivity|كابل|كابلات|بحرية)\b/i;
kept.sort((a, b) => {
  const ct = (v) => (CABLE_META.test(v.title ?? "") ? 1 : 0);
  const cd = (v) => (CABLE_META.test(v.text ?? "") ? 1 : 0);
  const sp = (v) => (SPEECHY.test(`${v.title ?? ""} ${v.text ?? ""}`) ? 1 : 0);
  return (ct(b) - ct(a)) || (cd(b) - cd(a)) || (sp(b) - sp(a))
    || ((b.views ?? 0) - (a.views ?? 0));
});
// the spread goes first: with `id` before it, v.id - the YouTube id -
// overwrote the source id, and the ingest wrote sources/_hF_QUZJt28/
const shortlist = kept.slice(0, SHORTLIST).map((v, i) => ({
  ...v,
  video_id: v.id,
  id: `houthi-${String(i + 1).padStart(2, "0")}`,
}));
await writeFile(SHORT, JSON.stringify(shortlist, null, 1));

console.log(`\n${kept.length} usable; shortlisting ${shortlist.length} to transcribe:`);
for (const [i, v] of shortlist.entries()) {
  console.log(`${String(i + 1).padStart(2)}. ${v.id}  ${(v.duration ?? "?").toString().padStart(7)}  `
    + `${String(v.views ?? "?").padStart(9)} views  ${v.channel ?? "?"}`);
  console.log(`     ${v.title}`);
}
console.log(`\n${SHORT}`);
console.log("\nnext: python scripts/ingest_source.py --picked " + SHORT
  + " --no-register\n      python scripts/houthi_select.py");
