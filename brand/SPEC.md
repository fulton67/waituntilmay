# BRAND KIT — from an Are.na board to a posting machine

Unattended. Never ask; decide, log in `brand/DECISIONS.md`, resume from `brand/TODO.md`, cache everything, push to main after each measured phase. Work in the repo this file sits in; everything lives under `brand/`.

```
ARENA_BOARD = <paste are.na channel URL>
CLIENT      = <who this brand is for — name, what they do, one line>
INSTAGRAM   = <@handle>      # existing identity; the current colours live here
EXISTING_COLORS = <hex list if known, else "scrape">
```

## Goal

Three things, in order: (1) a brand bible, in the Doom Bible form, built from the board and reconciled with what the client already uses, so the new identity feels new and still theirs; (2) a kit — fonts, palette, shapes, icons, grid, motion rules — as real files; (3) a posting machine: one command or one slash-command that turns a brief into finished, on-brand post graphics (single, carousel, story, quote, announcement) in seconds, so posts can be speed-run without redesigning each one.

## Phase 1 — pull the board

Are.na API, no auth for public channels: `GET https://api.are.na/v2/channels/{slug}/contents?per=100&page=N` (paginate until empty). If the channel is private, look for `ARENA_ACCESS_TOKEN` in `.env` and pass it as a bearer; if absent, log and stop with BLOCKED.md. For every block save: id, class (Image / Link / Text / Media / Attachment), title, description, source URL, the image at its largest size (`image.original.url`), video files or embed URLs for Media blocks (download with yt-dlp where possible), the block's connected channels. Store in `brand/board/blocks.json` and `brand/board/img/`. Also pull every channel the board's blocks are connected to and list them in `brand/board/connected.md` — those are Naim's own trail of references and tell you what he was looking at.

Then **look at every block** and write `brand/board/READ.md`: one line per block saying what it is and why it's probably on the board (a typeface, a colour, a composition, a texture, a motion idea, a tone). Group as you go. This is the raw material for everything after.

## Phase 2 — the existing identity

Scrape `INSTAGRAM` (Apify `apify/instagram-scraper`, last 60 posts, token in `.env`) — thumbnails, captions, dates, engagement. Extract the palette actually in use (k-means over the grid, k=6), the typefaces visible in post graphics (same font pipeline as Phase 3), the layout habits (how text sits, margins, image-to-text ratio), and the tone of the captions. Write `brand/EXISTING.md`: palette hex, fonts identified, five layout habits, five tone words, and the three posts that performed best with why. If `EXISTING_COLORS` was given, use it as truth and note where the scrape disagrees.

## Phase 3 — fonts

For every board image that contains type:
1. Detect text regions (EasyOCR or PaddleOCR; install if needed), crop each region at full resolution with 10% padding, save to `brand/fonts/crops/{block_id}_{n}.png`. Skip crops under 24 px x-height.
2. Identify the face, in this order of attempts, logging which one worked per crop:
   - If Adobe MCP font tools are available in this session (`font_search`, `font_recommend`, `find_fonts`), use them first with the crop.
   - Playwright against Adobe Fonts visual search (fonts.adobe.com → the image-search entry point; find the current upload control on the page, don't assume a selector) — upload the crop, read the top 5 matches with their Adobe Fonts links.
   - WhatTheFont (myfonts.com/pages/whatthefont) the same way.
   - Your own judgment: look at the crop, name the closest family from Google Fonts and from the Adobe Fonts library, and say how confident you are.
3. Record per crop in `brand/fonts/matches.json`: crop, source block, top matches with provider and URL, classification (grotesk / geometric sans / humanist / serif / slab / mono / display / script), weight, case, tracking estimate, your pick, confidence.
4. Cluster the picks. Choose the **system**: one display face, one text face, one optional mono or accent — the set that covers the most board images with the fewest families and sits well against the fonts the client already uses (Phase 2). State the reasoning. For each chosen face: where it's licensed from (Adobe Fonts via Creative Cloud, Google Fonts, or a foundry with price), the closest free fallback, the weights to use, and the three sizes/leading pairs for post, carousel and story. Download the free ones into `brand/fonts/files/`; for Adobe fonts write the activation step.

## Phase 4 — colour, shape, composition, motion

Measure the board, then decide. Each measurement gets one plate in `brand/fig/` (schematic, labelled, one claim per figure; never node graphs).
- **Colour:** k-means per image (k=5), aggregate; the dominant palette, the accent set, the neutrals; contrast pairs that pass AA at post sizes. Reconcile with the existing palette: keep what's theirs, add what the board brings, retire what clashes. Final palette as hex with roles (background / surface / text / accent-1 / accent-2 / signal).
- **Shape & motif:** catalogue every recurring shape, frame, border, rule, blob, grid or texture on the board; count them; name the ones that will become the kit's shape vocabulary (6–10), draw each as clean SVG.
- **Composition:** for every board image, measure where the subject and the text sit (thirds grid), margins as % of width, text block width, image/text ratio, alignment. Derive the post grid: safe areas for 4:5, 1:1, 9:16, column rules, type scale.
- **Motion:** for every Media block, frame-grab across the whole duration, write the beats and the camera/motion vocabulary (cuts, pushes, text reveals, loops), measure durations. Derive 6–8 motion rules for stories and reels.
- **Photography / image treatment:** grain, contrast, colour cast, crop habits — measure and state the treatment as numbers (LUT-able).

## Phase 5 — the bible

`brand/BRAND-BIBLE.md`, written in the Doom Bible form (revision number and date; styles defined once then referenced; margin symbols ⊗ hero / ♠ detail / ↻ reused; V/D/N manifests; appendices: glossary, file layout, utilities with exact invocations, approved language, random important info, known failure modes). Chapters: who this is for and what must not change · the existing identity · the board, read · type system · colour · shape vocabulary · grid and composition · imagery treatment · icons · motion · voice (from captions) · post formats · do/don't with paired examples from the board · master asset manifest. Every rule carries a number or a board reference. 8,000–15,000 words. Render it as a page at `/brand/{client-slug}` (noindex) with the plates and the board images inline, and export to PDF.

## Phase 6 — the kit as files

`brand/kit/`: fonts (or activation notes), `palette.json` + `.ase` + CSS variables, `shapes/*.svg`, `icons/*.svg` (a starter set of 24 in the shape vocabulary: the actions and objects this client posts about most, from the captions), `grid/` templates for 4:5 / 1:1 / 9:16 as SVG with guides, `treatment.cube` LUT for the image look, `motion/` as Lottie or CSS keyframes for the text reveals.

## Phase 7 — the posting machine

Two entry points to the same renderer:
- `brand/post.py` CLI: `post.py --type single|carousel|story|quote|announcement --title "" --body "" --image path --slides N --out dir` → finished PNGs at platform sizes (and an MP4 for story/reel when motion rules apply). Renderer: HTML templates per format using the kit's CSS variables, fonts and SVG shapes, rendered headlessly with Playwright at 2×. Carousels paginate body text automatically by the type scale. Every output passes a check script: fonts loaded (not fallback), contrast AA, text inside safe area, file size.
- `.claude/commands/post.md` slash command: takes a plain-English brief ("carousel, 5 slides, announcing X, use the second accent"), reads the bible, writes the copy in the voice chapter's rules, picks the format and shapes, calls `post.py`, returns the files. If a Flora MCP is connected, it may generate supporting imagery through it using the imagery-treatment rules as the prompt; otherwise it uses images from the brief or the board.
Produce 12 demo posts across the five formats from real captions in Phase 2 as the proof, saved to `brand/demo/`, rendered on the `/brand` page under the bible.

## Finish

TODO.md ends with: blocks read, fonts identified (how many by each method), the chosen type system, final palette, shape count, icon count, demo posts rendered and checks passed, the `/brand` URL, and everything decided alone.
