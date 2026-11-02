# OSTAD CONTENT INTEL — run 2: make it readable (spec, as given 2026-11-01)

Run 1 is done (1,031 videos, `/ostad`). Naim: the data is there but nothing is digestible. Run 2 fixes that.
Rules: unattended, resume from `TODO2.md`, cache everything, fallback ladder, push to main per measured phase, never ask.
No re-scrape. Apify $0 unless unavoidable, hard cap $3 ($5.95 of the $10/month already used).

## What went wrong
1. Library hid ~90% of videos (winning filter on by default, invisible). Every filter must be a visible chip with a count; default is everything.
2. Only 80 transcripts.
3. Classification collapsed onto a few genres/hooks.
4. Influencer product advertorials Ostad could never make dominate.
5. Dashboard leads with numbers instead of "what the niche talks about / why it works / what we make Tuesday".
6. Charts were decorative bars. Standing preference: schematic, labelled figures, one claim per figure; never node graphs.

## Phase 1 — transcribe all 1,031 (free, local)
yt-dlp + local Whisper (`faster-whisper` off Apple silicon), model `small`; if time allows re-run top 200 by outlier with `medium`.
Audio to `audio/{id}.m4a`; YouTube tries free subs first; Instagram: yt-dlp or the CDN `videoUrl` in `raw/`, else `unavailable`.
Apify `apify/instagram-reel-scraper` only if < 70% of IG videos get a transcript. Restartable (skip existing `transcripts/{id}.txt`), background.
Fields: `transcript`, `transcript_status` (whisper|captions|unavailable), `transcript_words`, `opening_line`, `closing_line`.
Report counts by status per platform; target ≥ 85%.

## Phase 2 — read the corpus (by reading, batches of 25, never keyword-match)
2a. Re-classify: genre, format, hook_type (+ extend), subject (2–6 words), claim (1 sentence), tone (1–2 of clinical, casual-friend,
confessional, fear/warning, humor, luxury, contrarian, reassuring, salesy), speaker (doctor, nurse/injector, patient, influencer, brand, other),
makeable_by_ostad (+ makeable_note), audience_reaction (from comments or null).
Distribution guard: any single value of genre/hook_type/tone/subject > 35% of rows, or < 6 genres used → re-read that field for the top-value rows. Log before/after.
2b. Themes: local sentence embeddings + agglomerative clustering as first cut; name/merge by reading. 10–18 themes, `themes/{slug}.md` each:
name, plain description, size, share, winning share, median "× the creator's usual", makeable share; 5–10 claims; tone/speaker mix;
dominant hook + 3 real opening lines (< 15 words); audience says back; Ostad's angle (services, what only he can say, the trap); 6 example ids (best makeable first).
2c. `data/cares.json`: 25 questions/anxieties ranked by frequency × performance; audience wording, # videos, how they do, doctor vs influencer, does Ostad have anything.
2d. PLAN.md / plan.json from themes: per slot theme, claim, opening line in his register, 3 beats, tone, makeable refs with their opening lines, why it's his. 20 + 10 + 40.
2e. REPORT2.md for a person, ≤ 2,500 words: themes as narrative → what the audience asks → tone and shape that wins → what Ostad does instead → what we make and why. Numbers inside sentences. MEETING.md regenerated.

## Phase 3 — /ostad as a reading tool
Keep route + bible styling; new IA. Static JSON, no auth, noindex. Default everywhere: makeable only, all videos; a "show everything" toggle;
every filter a visible chip with a count; header always "Showing N of M".
Tabs: **Read** (REPORT2 as landing; per theme: paragraph, 4 cards, and one page figure: a log strip of makeable videos by ×usual coloured by theme with theme names at medians; no bar charts; ads table collapsed at the bottom),
**Themes** (page per theme with embedded examples + audience block), **Watch** (library; cards: thumb, creator, platform, opening line, ×N usual, theme, makeable mark; panel with embed (YouTube iframe / TikTok oEmbed / IG /embed / link-out), transcript with opening line highlighted, claim, tone, reaction, metrics in a collapsed drawer; plain-word sorts; 50 per page with running count),
**Cares** (25 questions; expand to videos; "Ostad's answer" editable via localStorage), **Plan** (slot → large opening line, 3 beats, tone, theme link, refs; "shoot batches" view),
**Him** (two-row strip his vs makeable niche on ×usual; two stacked bars his mix vs winning mix, same scale).
Delete Genres, Questions, Ads tabs. Plain labels: "×usual", "saves+comments per 1k views", "views/day".
Verify: build; `/ostad/watch` count == makeable rows, and == all rows with show-everything (assert, print both); every theme page resolves; every embed URL 200 or falls back; Playwright through all six tabs, 0 console errors; coverage in TODO2.md.

## Finish
Coverage ≥ 85% (or every failure logged), guard passes, 10–18 themes, REPORT2/PLAN/MEETING regenerated, `/ostad` live with counts verified live.
TODO2.md ends with coverage per platform, theme list with sizes, three sentences Naim says first on Tuesday, decisions made alone.
If `N8N_API_KEY` is now in `.env`, run `n8n/create_workflow.py`; else skip.
