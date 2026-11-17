# Feed posts, built in Remotion (2026-11-17)

> **Grid 3 (current): the video system.** Naim on grid 2: "canva-esque", weak photos, "no glass effects", "no translation from what
> we do in videos into feed posts ... treat each post in the process of the video". Each carousel is now one short Remotion video
> (`brand/remotion/src/posts/g3/`, 5 scenes x 60 f) in the YouTube v4 system: warm field with light moving behind glass, pictures
> in white rounded windows (ungraded), 963 glass cards, caps chips, his own spoken line as the caption (word by word, keywords
> blue), v4 leaders ending in arrowheads. Slides = where each scene lands. Three carousels so far: Mohs (what actually happens),
> Jeuveau (his assessment, dose vs duration), Meet Dr. Ostad (NYU teaching award, Super Doctors, Castle Connolly, billboards).
> Facts: his transcripts (clinic-library reference/ostad_transcripts.md), procedures-guide.md, his BCC post (row 4018), catalog
> photo data. Photos upscaled in Flora (Topaz; mean colour shift <= 1.5 levels, channels together). Review: `brand/posts/grid3/`.

> **Grid 2 supersedes grid 1** (Naim: grid 1 was "too similar to his current grid", thin on information and detail, cheap).
> Grid 2 = `brand/remotion/src/posts/g2/` ("the clinical index"): his own palette from `brand/EXISTING.md` (navy `#152235`, ivory
> `#f5f2eb`, sand `#d6c3a0`, silver), in the are.na board's language: four-corner meta, figure captions with the catalog photo
> dates, key/value data rows, rulers, labelled hairline leaders, big tight NHG Display, IBM Plex Mono for data, and a Cormorant
> italic accent. No glass chips, rounded tiles or bright blue. Review copies: `brand/posts/grid2/`; measured in
> `brand/posts/posts_check_grid2.json` (27 stills; photo tint spread ≤ 0.15 levels on 7 of 7); lint PASS.
> Next: multi-slide carousels on what the audience values (`clinic-library/network/swipe_file.md`, `questions.md`), with
> procedure facts from `clinic-library/reference/` and the catalog, plus consent-gated before/afters.

Replaces the POST_GRID tile templates, which Naim rejected ("everything is tinted blue", off the bible, inaccurate; never use).
Posts are made like the reels: each one is a timed Remotion composition on the MOTION.md tokens, and the stills are frames of that
motion. The carousel slides are the moments where the motion lands. The last key frame is the cover, which is also the grid tile.

- Code: `brand/remotion/src/posts/` (`kit.tsx` shared pieces, `Posts.tsx` the nine posts plus `POSTS` order and keys, own entry `index.ts`).
- Render and measure: `python brand/scripts/posts_render.py` → `brand/remotion/out/posts/` and `brand/posts/posts_check.json`
  (one bundle for every still: `brand/remotion/scripts/posts_stills.mjs`). Review copies: `brand/posts/grid1/` (`_grid.jpg` = feed).
- Look: `exo6/look.ts` (kit cream `#f2efed`, ink `#211b15`, Cormorant Garamond 500 + NHG Text, calm glass, one blue for every
  arrow and ring). Are.na board (all 82 blocks now pulled): type and labels sit on full-bleed natural photos, numbered lists, and
  spec-sheet rows. That's why two posts are full-bleed.
- **Photos are never graded.** There's no filter, LUT or colour overlay on any picture. Checked per post: the photo area of the cover
  against the same crop of the source. The per-channel shift spread is ≤ 1.1 levels on all 7 photo posts (a tint would pull the
  channels apart; the blue rings and arrows account for the ~1). Reapply is measured left of its glass card.

## Sources

Every photo is a clinic-library item with no patient code and no review flag. Every patient is consent `unknown`, so no
before/after and no patient appears. Photos were upscaled 2× (4× for 08710) in Flora with Topaz High Fidelity V2 (no generative
detail; mean colour within 1.4 levels of the original). Flora canvas: "Ostad post photos upscale".

| # | Post | Device (what it explains) | Photo (catalog row) | Facts from |
|---|---|---|---|---|
| 1 | Filler, to scale | full bleed, rings name the filler bead and the blueberry: how small a filler volume is | 7640 clinic shot | catalog description; "about 1 mL" is the standard HA syringe |
| 2 | Layer it in this order | layers physically stack on a cleansed line; sunscreen ends on top | none (type) | his post, row 4245 |
| 3 | CEG + Ferulic Complex | the name decoded letter by letter; one arrow lands on the name on the bottle | 374 | his "What's inside" post, row 4826 |
| 4 | 3.6 million (BCC) | cited counter, then 1 of 3 tiles fills | none (type) | his post row 4018 (Skin Cancer Foundation); row 4015 for "curable when found early" and the yearly check |
| 5 | His words | progressive highlight; the highlighter lands on "skin cancer patients" | 8710 (him at the podium) | gala quote card, row 8677, word for word |
| 6 | Reapply every 2–3 hours | full bleed; reapply windows sweep in on a day timeline; arrow to SPF 40 on the bottle | 9677 | his "Prevention is Key!" post, row 4015; label: Broad Spectrum SPF 40 |
| 7 | Top Doctor for 15 years | ring on the "15" seal, then 15 ticks count in | 6354 (cropped above the engraved plate, which reads "Psychiatry") | the Castle Connolly plaque, 2022 |
| 8 | EMSCULPT NEO | before → after bars with cited counters (−30 % fat, +25 % muscle thickness) | 2204 | his announcement, row 2267 ("clinical studies… 4 sessions a week apart") |
| 9 | 897 Lexington Avenue | plate then picture; highlighter on the street | 9035 (waiting room) | his EMFACE post, row 5920 (address, phone, Upper East Side) |

Grid order is the table order, read left to right and top to bottom. No two type-only posts touch, and every row mixes photo and type.

## Measured

27 stills (9 posts × 3 keys) at 1080 × 1350. Photo tint check passes on 7 of 7 photo posts. `lint_compositions` PASS (0 dot-and-line). tsc clean
for `src/posts`.

## Decided alone

- "About 1 mL" on post 1 is general knowledge, not from his material. Remove it if he doesn't want a number there.
- Post 7 crops out the plaque's engraved plate, which says "Psychiatry" (likely an engraving error); flag it to the office.
- No before/after, results photos or patient footage until consent = yes in the catalog (HANDOFF rule 4).
- `devices/Arrow.tsx` has another agent's uncommitted changes in the working tree; the posts use its public props only.
