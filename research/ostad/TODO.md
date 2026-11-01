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
- [ ] pushed to main, live on waituntilmay.com/ostad

## Phase 9 — meeting
- [ ] MEETING.md

## n8n weekly workflow
- [ ] workflow JSON written; created in n8n (or exported locally if no API key)

## Final summary
- [ ] written below
