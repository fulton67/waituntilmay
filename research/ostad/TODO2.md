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
- [ ] 2a batch server + re-classification of all rows (subject, claim, tone, speaker, makeable, audience_reaction)
- [ ] 2a distribution guard passes (logged before/after)
- [ ] 2b themes: embeddings + clustering, named/merged by reading, themes/{slug}.md written (10–18)
- [ ] 2c cares.json (25)
- [ ] 2d PLAN.md / plan.json regenerated from themes
- [ ] 2e REPORT2.md (≤ 2,500 words) + MEETING.md regenerated

## Phase 3 — /ostad as a reading tool
- [ ] tabs: Read, Themes, Watch, Cares, Plan, Him (Genres/Questions/Ads deleted; ads folded into Read)
- [ ] verified locally: build, watch counts (makeable / all), theme pages, embeds, 6-tab click-through 0 console errors
- [ ] pushed + verified live

## Finish
- [ ] summary below
