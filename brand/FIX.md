# BRAND KIT — fix: redo Phases 1–3 properly, then continue

(Saved verbatim from Naim's message, 2026-11-05. Execution order: Phase 1 → 2 → 3 → 3b → BRANDKIT_RUN Phases 4–7.)

This replaces Phases 1–3 of BRANDKIT_RUN.md. The previous attempt matched fonts by eye, never pulled the board, never extracted colours, and produced nothing Naim could look at. Do not reuse `brand/fonts/matches.json` or `SYSTEM.md`; rebuild them. Delete nothing else. Webflow is not part of this project; do not connect to it or mention it.

Rules unchanged: unattended, log to `brand/DECISIONS.md`, resume from `brand/TODO.md`, push to main after each phase. Two exceptions to "never ask," both at the very start and both one-time: the Are.na token and the Adobe login, below. After those, no interaction.

## Phase 1 — pull the whole board (it is private)

Board: `dr-ostad`. Client: Dr. Ariel Ostad (see `research/ostad/CLIENT.md` if it exists in this repo or a sibling; otherwise NYC cosmetic dermatologist / Mohs surgeon, IG @drarielostad).

1. Read `ARENA_ACCESS_TOKEN` from `.env`. If missing, print one line — "Add ARENA_ACCESS_TOKEN= to .env (dev.are.na → Your applications → personal access token) and re-run" — write it to BLOCKED.md and stop. Do nothing else without it.
2. Pull with v2 first, bearer header: `GET https://api.are.na/v2/channels/dr-ostad/contents?per=100&page=N` until a page returns empty. If v2 404s or returns fewer blocks than `GET https://api.are.na/v2/channels/dr-ostad` reports in `length`, use v3: `GET https://api.are.na/v3/channels/dr-ostad` and its contents endpoint (read the response for the pagination fields; don't assume). Set a browser-like User-Agent; are.na blocks default clients.
3. Save every block: id, class, title, description, source URL, `image.original.url` (download), video/embed for Media (yt-dlp), connected channels. `brand/board/blocks.json`, `brand/board/img/`. Confirm the count matches the channel's `length`; log both numbers. Pull the connected channels' titles and URLs to `brand/board/connected.md`.
4. Look at every block; write `brand/board/READ.md` (one line each: what it is, why it's on the board). Mark the ones that are type-driven.

## Phase 2 — the colours, now

From the 60 Instagram thumbnails already in the repo plus every board image: k-means (k=6) per image, aggregated. Output `brand/colour/existing.json` (from Instagram: hex, share, role guess), `brand/colour/board.json` (from the board), and `brand/colour/CONTRAST.md`. Plate: one strip per source, swatches labelled with hex and share. This is a measurement; the palette decision is Phase 4 as before.

## Phase 3 — fonts, through Adobe's visual search, every crop

### Crops
Text detection on every board image (EasyOCR/PaddleOCR), crop each text region at full resolution with padding, drop anything under 24 px x-height. `brand/fonts/crops/`. Log the count. Also crop type from the Instagram thumbnails where it exists, tagged `source: instagram`.

### Browser
Use a real logged-in browser, in this order:
1. If the Claude-in-Chrome MCP tools are available in this session, use them — Naim's Chrome is already signed in to Adobe.
2. Otherwise Playwright with a **persistent profile** at `brand/fonts/.chrome-profile/` (gitignored). On the first run open it **headed** at `https://fonts.adobe.com/`, print "Sign in to Adobe in the window that just opened, then press Enter here", wait for Enter, confirm the account avatar is present on the page, and continue headless-or-headed from then on with the same profile. Never store credentials.

### Per crop
On fonts.adobe.com, find the visual search entry — the image/camera control in the search bar area (read the live DOM; the control's label contains "visual" or "image" or "upload"; don't hardcode a selector). Upload the crop. Wait for results. Read the top 5 families: name, foundry, the family URL, and the similarity order. Click **Add family** on the #1 result (and on #2 when #1's name is a brand font that can't be used, e.g. a logotype). Record the activation state the page shows after clicking. Save a screenshot of the results page to `brand/fonts/adobe/{crop_id}.png` as the receipt. Rate-limit: 2–4 s between crops; if Adobe throttles, back off and continue; if it blocks for more than 10 minutes, write what happened and keep going with the crops already done.

`brand/fonts/matches.json`: crop, source block, top 5 with URLs, added family, screenshot path. Nothing in this file is "by eye." If the visual search genuinely cannot be reached after the steps above, that is a BLOCKED.md, not a fallback.

### The system
Cluster the added families (by name and classification). Choose the type system — display, text, optional mono/accent — by board coverage weighted toward Naim's four favourite images (the ones in his notes) and consistency with the Instagram crops. Everything chosen must be in the Adobe Fonts library and activated. Free fallbacks (Google Fonts) only for the web page and scripts that can't load Adobe fonts; name them as fallbacks, never as the system. `brand/fonts/SYSTEM.md`: roles, weights, size/leading pairs for 1080×1350, 1080×1080, 1080×1920, web sizes, the Adobe URLs, the activation list.

### Show it, immediately
Before Phase 4, build `brand/fonts/specimen/` and push it to the `/brand/ostad` page as its first section: the board's own headlines, three real Instagram captions and five procedure names (from procedures.json if present) typeset in the chosen system at post size, on the three canvases, over three real board images and over plain colour — so Naim can see what a title actually looks like in these fonts. Rendered with the activated Adobe fonts via Playwright on this machine (Creative Cloud serves them to the system), fallbacks only if that fails and labelled as such in the image. Also one plate per candidate system that lost, same content, so the choice is visible.

## Phase 3b — exact metrics, two ways

Judgment measured nothing; this phase does. Output `brand/metrics/` and one plate per table.

**Pixels (Lexicon on images).** For every board image and Instagram thumbnail: decode to a pixel array (PIL/NumPy). Detect text lines and glyphs (OCR boxes refined with connected-component analysis on a binarised crop); measure per text block: cap height, x-height, baseline y, leading, letter-spacing (mean gap between adjacent glyph boxes, normalised by cap height), word spacing, tracking as % of em, text-block width and left edge, alignment, distance to nearest canvas edge. Measure per image: subject bounding box and its position on a thirds grid, margins as % of width/height, image-to-text area ratio, dominant line angles. Save `metrics/pixels.json` (one row per block/text region, with the crop path) and `metrics/PIXELS.md` with medians and spreads per role (headline / caption / label), per source (board vs Instagram), and per Naim-favourite image. These medians are the numbers the grid and type scale in Phase 4 must be set to; cite them.

**Source (REA on the pages).** For every board block with a source URL that is a web page: fetch it, read the page and every stylesheet and script in full the way REA did for the Felix Luke bible, and extract the type rules that produced the image: font-family, size, weight, `letter-spacing`, `line-height`, `text-transform`, margins and grid, colours as declared. Where the page loads font files, download them and read the metrics out of the font (fontTools: unitsPerEm, cap height, x-height, the kerning pairs in `kern`/`GPOS`) — those are the exact spacing values the image was set with. Save `metrics/source.json` keyed by block id, and `metrics/SOURCE.md` comparing declared values against the pixel measurements for the same block (they should agree; where they don't, say which to trust and why). Log blocks with no usable source.

Everything in Phase 4 (grid, type scale, composition rules) and in `SYSTEM.md` must cite a row from these two files or be marked as a judgment call.

## Then

Continue with Phases 4–7 of BRANDKIT_RUN.md exactly as written. Phase 4's palette decision now has the Phase 2 measurements to work from. TODO.md ends with: block count pulled vs channel length, crops, Adobe matches made, families added, the chosen system, specimen path and URL, and anything decided alone.
