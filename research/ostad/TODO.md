# OSTAD CONTENT INTEL — TODO

Source of truth for the run. On restart: read this, resume from the first unchecked item.
Spec: `research/ostad/OSTAD_RUN.md`. Decisions: `DECISIONS.md`. Spend: `COSTS.md`.

## Phase 0 — setup
- [x] Apify token found and valid (`GET /v2/users/me` → measured_label, FREE plan)
- [x] deps installed (apify-client, pandas, pillow, bs4, requests)
- [x] dirs created; `research/ostad/raw/` gitignored; `.env` written (gitignored)
- [x] DECISIONS.md, COSTS.md, TODO.md created

## Phase 1 — client brief
- [x] crawl drarielostad.com + drarielostadskincare.com (246 pages, 62 SKUs, 316 blog posts, 49 Ostad TV videos)
- [x] CLIENT.md written

## Phase 2 — Ostad baseline
- [x] IG @drarielostad scraped (150 posts: 112 images, 12 carousels, 19 reels, 7 collabs dropped)
- [x] YouTube channel scraped (61 videos, 60 of them Shorts)
- [x] TikTok account found and scraped: @drarielostad, 135 followers, 30 videos
- [x] data/ostad_own.json: median views TikTok 827 · IG reels 31,395 · YouTube 464

## Phase 3 — niche scrape
- [x] 5-item test runs of each actor, field names read (Reddit failed on 3 actors → TikTok comments; see DECISIONS 6)
- [x] TikTok search: 49 queries × 9 → 466 raw
- [x] Instagram hashtags: 40 × 6 reels → 230 raw
- [x] YouTube searches: 49 queries × (4 shorts + 1 long) → 239 raw
- [x] Benchmark profiles: 13 TikTok creators × 12–15 (186 raw)
- [x] Questions → data/questions.json (Reddit blocked; 600 comments under 30 top TikToks → 46 real questions)
- [x] Meta Ads → data/ads.json (100 scraped, 73 unique)

## Phase 4 — normalize
- [x] data/videos.json + videos.csv: **1,031 unique videos**
- [x] metrics (engagement, views/day, outlier, winning = 171)
- [x] thumbnails: 1,156 files, 23.9 MB at q70 (7 placeholders) → public/ostad/thumbs/

## Phase 5 — classify
- [x] all 1,031 videos classified by reading (4 parallel readers × ~250, 0 rejected by the taxonomy check)

## Phase 6 — REPORT.md
- [x] REPORT.md written (rendered from data by scripts/render_report.py)

## Phase 7 — plan
- [x] PLAN.md + data/plan.json (20 slots Mon 2026-11-09 → Fri 2026-12-04, 10 backups, 40 backlog; every ref resolves)

## Phase 8 — dashboard
- [x] design bibles located, logged (DECISIONS 7)
- [x] app/ostad built (Library, Genres, Baseline, Plan, Questions, Ads)
- [x] verified on `next start`: build exit 0, 6/6 routes 200 + noindex, 1,031 cards = 1,031 rows, filters change count (winning 109, YouTube 247, "mohs" 13), 1,156 thumbs 0 missing, 30 plan slots, 0 page errors
- [x] pushed to main (a816363), live on waituntilmay.com/ostad: verify.mjs PASS against production (6/6 routes 200 + noindex, 1,031 cards, 0 thumbs missing, 30 slots, 0 page errors)

## Phase 9 — meeting
- [x] MEETING.md (5 talking points with number + tab, 10 make-bullets, 7 asks)

## n8n weekly workflow
- [x] workflow JSON written: `n8n/ostad-weekly-refresh.json` (8 nodes, Mon 06:00). **Exported locally, not created**: no N8N_API_KEY was supplied (the kickoff left it as `<paste>`), and the n8n API returns 401 without one. To create it, add `N8N_API_KEY=` to `.env` and run `python research/ostad/n8n/create_workflow.py`, or import the JSON in the n8n UI. Then fill the Apify and GitHub credentials.

## Final summary
- [x] written below

### Summary (2026-11-01)

**Done:** 500+ videos ✓ · REPORT.md ✓ · PLAN.md ✓ · MEETING.md ✓ · dashboard live ✓ · n8n workflow exported locally (not created: no API key).

- **Videos: 1,031 unique.** TikTok 537 · Instagram 247 · YouTube 247. By source: 752 search, 170 from 13 benchmark creators, 109 of Ostad's own. Every one classified by reading (0 rejected). 171 winners, 109 of them Ostad-relevant.
- **Apify cost: $5.95 billed** ($8.68 account usage − $2.73 before the run). Logged per run: $5.30. Conservative estimate: $6.17. Cap was $20; the account limit is $10/month (FREE plan).
- **Dashboard:** https://waituntilmay.com/ostad (noindex). Tabs: library · genres · baseline · plan · questions · ads.
- **Files:** `research/ostad/CLIENT.md` · `research/ostad/REPORT.md` · `research/ostad/PLAN.md` (+ `data/plan.json`) · `research/ostad/MEETING.md` · `research/ostad/COSTS.md` · `research/ostad/DECISIONS.md` (24 decisions) · `research/ostad/n8n/ostad-weekly-refresh.json`.
- **Headline findings:**
  - Skin-cancer awareness is 31.3× on TikTok (53% win) and he has 3 such videos.
  - Before-after is 10.2× but 1.0% engagement.
  - Myth-bust is the only genre above the median on every metric.
  - 78% of his videos are promos or explainers.
  - His medians: TikTok 827 vs 47K, YouTube 464 vs 96K, IG reels 31.4K vs 119K.
- **Key decisions:**
  - Run budget $6.50: the account limit binds before the $20 cap.
  - Windows, not a Mac.
  - The two tokens are the same account.
  - Classification used 4 parallel reader agents, applied centrally.
  - The library defaults to relevant winners.
  - REPORT tables are rendered from data.
- **Failures → fallbacks:**
  - Reddit: all 3 actors returned 0 on the FREE plan, and the JSON endpoint is blocked. → Questions were mined from 600 TikTok comments (47 kept).
  - FREE plan limits: 16 GB memory and 5 concurrent runs. → Smaller memory per run, 3 concurrent, re-run from cache.
  - Benchmark handles that don't exist (dermdoctor, tonyyounmd, samellismd) were skipped.
  - Meta ads needed `count` ≥ 10.
  - Instagram baseline is mostly photos: only 19 of 143 posts carry views.
  - His TikTok isn't linked from his site; it was found by handle.
  - n8n: no API key. → JSON exported, MCP server registered, `create_workflow.py` ready.
  - Local `next build` needs `app/reels/admin` stashed (KV env vars exist only on Vercel). Vercel builds it fine.
