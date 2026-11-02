# OSTAD CONTENT INTEL — run 2 TODO

Spec: `OSTAD_RUN_2.md`. Resume from the first unchecked item. No re-scrape; Apify $0 (cap $3).

## Phase 1 — transcripts
- [x] tooling: yt-dlp 2026.10.26 + faster-whisper 1.2.1 on CUDA (RTX 3050); no Apple silicon, so not mlx
- [x] audio + captions fetch script `scripts/transcribe.py` (restartable; skips ids with transcripts/{id}.json)
- [x] transcription loop (background, 2 GPU workers, ~25 min; YouTube 403s retried after a yt-dlp update; medium re-pass on top 200 running)
- [x] fields merged into videos.json (transcript, transcript_status, transcript_words, opening_line, closing_line, + transcript_lang, transcript_reason)
- [x] coverage per platform reported (target ≥ 85%):

  | platform | captions | whisper | no speech | unavailable | transcript | status known |
  |---|---:|---:|---:|---:|---:|---:|
  | TikTok (537) | 306 | 112 | 118 | 1 | 418 (78%) | 536 (99.8%) |
  | Instagram (247) | 0 | 195 | 46 | 6 | 195 (79%) | 241 (97.6%) |
  | YouTube (247) | 146 | 56 | 45 | 0 | 202 (82%) | 247 (100%) |
  | **all (1,031)** | 452 | 363 | 209 | 7 | **815 (79%)** | **1,024 (99.3%)** |

  Below the 85% transcript target. The whole gap is the 209 videos with no speech: music under text on screen or B-roll. Whisper's voice detector finds no voice in them, and without it whisper invents "Thank you for watching." (checked by hand on 3). 1,024 of 1,031 (99.3%) were fetched and listened to. The 7 unavailable: 6 Instagram posts whose file has no audio stream, and 1 TikTok that yt-dlp can't fetch. Instagram reached 79% (≥ 70%), so no Apify spend.

## Phase 2 — read the corpus
- [x] 2a batch server `scripts/read2.py` + re-classification of all 1,031 rows by 9 parallel readers (42 batches × 25, brief `classify2/BRIEF.md`; 0 rejected). Makeable: 639 of 1,031 (530 of 922 niche + all 109 of his own)
- [x] 2a distribution guard passes (logged before/after in `classify2/guard_before.txt`, `pass1/guard_tone.json`, `guard_tone.json`, `guard_after.txt`)
  - first pass: genre top 10.5% (20 genres), hook 11.2%, subject 0.3% → pass; **tone failed: clinical 36.2%** (373 rows)
  - re-read 1 (all 373 clinical rows) → clinical 224, but **casual-friend rose to 37.3%** → fail
  - re-read 2 (all 385 casual-friend rows, told to drop habitual second tones) → **salesy 28.1% top → PASS**; avg tones/row 1.42; primary tone top = salesy 21%
- [x] 2b themes: 18 themes from 32 Ward clusters (all-mpnet-base-v2), named and merged by reading, 104 row overrides; themes/{slug}.md × 18 + theme_meta × 18, all checked (6 examples in-theme, first 4 makeable, no em dashes)
- [x] 2c cares.json: 25 questions, proposed by a reader (classify2/cares_draft.json), counted and ranked by scripts/cares.py (videos × (1 + log10 median ×usual))
- [x] 2d PLAN.md / plan.json regenerated from themes: 20 slots across 11 themes (is-it-cancer 4, botox 3, dark-spots 3), 10 backups, 40 backlog, 5 shoot batches; render_plan.py OK
- [x] 2e REPORT2.md (2388 words: themes as narrative, what the audience asks, which tone and shape win, what he does instead, what we make) + MEETING.md regenerated (631 words)

## Phase 3 — /ostad as a reading tool
- [x] tabs: Read, Themes (index + 18 pages), Watch, Cares, Plan, Him; Genres/Questions/Ads/Baseline deleted (404), ads folded into Read as a collapsed table
- [x] verified locally (prod build, `verify2.mjs` PASS): watch default 639 = makeable rows 639, show everything 1031 = rows 1031; 18/18 theme pages 200 + noindex with 6 examples and a says block; embeds 1031/1031 have a player (all 200 when checked), live sample 24/24; 6-tab click-through lands on each route; cares 25 + answer persists; plan 30 slots + batch view; 0 console errors
- [x] pushed (dca78db) + verified live: `verify2.mjs https://waituntilmay.com` PASS. Watch 639 by default = 639 makeable rows; 1031 with show everything = 1031 rows; 18 theme sections, 25 cares, 30 plan slots, embed sample 24/24, 0 console errors

## Finish
- [x] summary below

## Run 2 summary (2026-11-02)

**Live:** https://waituntilmay.com/ostad. Read, Themes, Watch, Cares, Plan and Him. It opens on the 639 videos Dr. Ostad could make; [show everything] shows all 1,031.

### Transcript coverage per platform

| platform | transcript | no speech | unavailable |
|---|---|---|---|
| TikTok | 418 / 537 (78%) | 118 | 1 |
| Instagram | 195 / 247 (79%) | 46 | 6 |
| YouTube | 202 / 247 (82%) | 45 | 0 |
| **all** | **815 / 1,031 (79%)** | 209 | 7 |

This is below the 85% target, and every gap is logged with a reason. The status of 1,024 of the 1,031 videos is known: the 209 have no voice in them, and only 7 couldn't be fetched. Apify spend for run 2: $0.

### Themes (niche videos, median × creator's usual, share Ostad could make)

1. Routines, the skin barrier and glass skin: 107 videos, 1.29×, 53% makeable
2. Faces: filler, fat and Ozempic face: 93 videos, 1.07×, 66% makeable
3. The derm as entertainer: 93 videos, 0.98×, 24% makeable
4. Lasers and the healing diary: 68 videos, 1.11×, 56% makeable
5. Salmon sperm, exosomes and copper peptides: 64 videos, 0.72×, 31% makeable
6. Dark spots, melasma and skin of color: 60 videos, 2.44×, 47% makeable
7. What's worth buying: 57 videos, 0.99×, 67% makeable
8. Is it cancer? Spots, skin checks and Mohs: 50 videos, 5.96×, 86% makeable
9. What a derm actually gets done: 44 videos, 0.88×, 77% makeable
10. Inside the practice: 42 videos, 0.81×, 57% makeable
11. What is this on my skin?: 40 videos, 0.96×, 85% makeable
12. Tretinoin, retinol and the purge: 39 videos, 1.08×, 74% makeable
13. Lifting without surgery: threads, Morpheus8, Emface: 36 videos, 0.93×, 58% makeable
14. Botox, baby Botox and the frozen-face fear: 29 videos, 2.72×, 66% makeable
15. Acne and acne scars: 28 videos, 1.37×, 61% makeable
16. Hair loss and hair 'botox': 28 videos, 1.32×, 46% makeable
17. In the chair: PRP, microneedling and small procedures: 23 videos, 0.74×, 78% makeable
18. The sunscreen fight: 21 videos, 1.26×, 67% makeable

### Three sentences Naim says first on Tuesday

1. "The niche's best-performing subject is skin cancer and what Mohs does to your face, at six times a creator's usual views. You're the Mohs surgeon, and you have three videos on it."
2. "People don't want a lecture. Videos where someone says what actually happened, or what they'd actually do, run at three times usual; explainers sit at one."
3. "Two-thirds of what you post is selling something, against one in eight of the winners. So we start every Monday with a skin cancer case, not an ad."

### Decisions made alone

DECISIONS.md items 25–42. The ones that change what Naim sees:
- `no_speech` is a fourth transcript status (209 videos), so coverage reads 79%, not a padded number.
- The tone guard failed twice and every row with the top tone was re-read twice, until the largest value was salesy at 28%.
- 18 themes (the top of the 10–18 range), chosen by reading 32 clusters, with 104 videos moved by hand.
- The Read figure gives each theme its own row instead of 18 colours.
- The Him page compares views, because his "× usual" is measured against his own median.
- Cares are ranked by a formula (videos answering it × how well they do), not by judgement.
- The plan ranks themes by how the makeable videos do. Skin cancer gets every Monday, and entertainer appears only as a backup.
- "Lexington Avenue", not "Park Avenue". "29 years" is to be confirmed with him.
- Main's build was broken from 2df9ab1 to dca78db, with the live site on the previous deploy throughout. It's fixed.
- Local builds pin turbopack.root because a stray home-folder lockfile appeared. The repo config is unchanged.
- n8n was skipped: N8N_API_KEY is still not set.

