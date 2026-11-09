# Style study decisions

1. **Sample, don't exhaust (client, 2026-11-08).** Apify's monthly limit is $10 and $8.85 was used, so $1.15 remained (the client said "the last 2 dollars"). Runs were capped at $1.00 total with `maxTotalChargeUsd` + `maxItems`: 60 latest posts per account (2 accounts), the 3 named posts, and the 2 profiles' details. Spent: $0.2673 + $0.0081 + $0.0054 = $0.28 (104 results at $0.0027).
2. **Flora is not used for scraping.** It is an AI generation canvas; no evidence it imports Instagram accounts, and it is not connected in this session.
3. **Are.na without a token.** `dr-ostad` is public; the v3 API returns it unauthenticated. Its 3 "sub-channels" are other people's channels connected to the board (MOTION/Typography by Alex Rainer, _skintech by Maud Giraudin, CGI 3D LIQUIDS by Natalie Liu): pulled as board context (the first two in full, liquids sampled), not treated as Naim's own picks. There is no `brand/board_marks.json` (no stars or rect notes), so "targets" on the board are the blocks with Naim's own descriptions.
4. **Media stays local.** Reference media, frames, sheets, stems and bank images are gitignored (other creators' work; the repo is public). Measurements, reads, rules, tools and manifests are committed.
5. **Remotion project = `brand/remotion/`** (the brief says `brand/video/`, which does not exist).
