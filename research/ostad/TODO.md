# OSTAD CONTENT INTEL — TODO

Source of truth for the run. On restart: read this, resume from the first unchecked item.
Spec: `research/ostad/OSTAD_RUN.md`. Decisions: `DECISIONS.md`. Spend: `COSTS.md`.

## Phase 0 — setup
- [x] Apify token found and valid (`GET /v2/users/me` → measured_label, FREE plan)
- [x] deps installed (apify-client, pandas, pillow, bs4, requests)
- [x] dirs created; `research/ostad/raw/` gitignored; `.env` written (gitignored)
- [x] DECISIONS.md, COSTS.md, TODO.md created

## Phase 1 — client brief
- [ ] crawl drarielostad.com + drarielostadskincare.com
- [ ] CLIENT.md written

## Phase 2 — Ostad baseline
- [ ] IG @drarielostad scraped
- [ ] YouTube channel scraped
- [ ] TikTok account searched (scrape if exists)
- [ ] data/ostad_own.json + baseline medians

## Phase 3 — niche scrape
- [ ] 5-item test runs of each actor, field names read
- [ ] TikTok search queries
- [ ] Instagram hashtags
- [ ] YouTube searches
- [ ] Benchmark creator profiles
- [ ] Reddit questions → data/questions.json
- [ ] Meta Ads → data/ads.json

## Phase 4 — normalize
- [ ] data/videos.json + videos.csv (500+ unique)
- [ ] metrics (engagement, views/day, outlier, winning)
- [ ] thumbnails downloaded → thumbs/ + public/ostad/thumbs/

## Phase 5 — classify
- [ ] every video classified (genre, format, hook_type, topic_tags, ostad_relevant)

## Phase 6 — REPORT.md
- [ ] REPORT.md written

## Phase 7 — plan
- [ ] PLAN.md + data/plan.json

## Phase 8 — dashboard
- [ ] design bibles located, logged
- [ ] app/ostad built (Library, Genres, Baseline, Plan, Questions, Ads)
- [ ] verified: build passes, 200 locally, card count, filters, thumbnails
- [ ] pushed to main, live on waituntilmay.com/ostad

## Phase 9 — meeting
- [ ] MEETING.md

## n8n weekly workflow
- [ ] workflow JSON written; created in n8n (or exported locally if no API key)

## Final summary
- [ ] written below
