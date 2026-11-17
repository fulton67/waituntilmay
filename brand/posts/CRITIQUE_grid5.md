# Grid 5 critique: the AviClear carousel and the grid plan (2026-11-17)

**For the agent building grid 5.** Naim's verdict: the posts are "coming out really bad"; none are as good as they should be. Don't build the other eight carousels yet. Fix the AviClear carousel until Naim approves it. Then rework the grid line-up using the notes below.

**Reviewed:**
- `grid5/_aviclear_carousel.jpg` and `avi_1_cover.png`–`avi_4_visits.png` at full size
- `grid5/_grid_now.jpg`
- the reference posts in `refs/grid/` (Seed feed, glass ingredient cards, profile callouts)

## The one-line diagnosis

**It's a lab report, not a post.** Every slide is a dark spec sheet: small grey type, hairline boxes and ticks, internal notes printed on the slide, and a third of the frame left empty. It's accurate, but nobody would stop scrolling for it or share it. The references do the opposite: one big, beautiful picture, one idea set in confident type, and a single signature motif (Seed's circle, the glass card, the dot-and-leader profile).

## Slide by slide

### 1/4, the cover (it's also the grid tile, so it matters most)

| Problem | Where |
|---|---|
| The photos fill only about 44 % of the slide. Between the spec rows and the footnote, about 18 % is empty dark space. | y ≈ 1060–1290 |
| At feed size (about 360 px), it reads as two small faces and grey lines. Nothing pulls the eye. | whole slide |
| Hairline white squares A and B on her face are the "circling random things" problem. At tile size they read as UI selection boxes. The B box on the before photo sits half on her jaw shadow, not on the acne. | both photos |
| The after photo is a different shot: a white wall, cooler light, a wider-looking face. At the top left there's a smear where the image was padded by stretching its edge pixels. That's a visible defect. | after photo, top-left corner |
| The headline is a 14-word sentence in one weight. There's no hierarchy, and nothing in it is memorable. | "Acne, before and 3 months after the third AviClear session" |
| "PATIENT P0010" appears on a public post. Patient codes are internal and go in the sidecar JSON, not on the image. | top right, on all four slides |
| "Look at: A forehead · B cheek, same spot in both photos" and the footnote "aligned on eyes and nose" are instructions and process notes, not information for the audience. | rows and footer |

### 2/4, up close

| Problem | Where |
|---|---|
| The crops are low-res previews blown up. You can see the pixel blocks. POST_RULES 2 says to use full-resolution originals. Re-pull them, or don't zoom this far. | all four panels |
| The white ticks don't match the claim. The caption says "6 papules" but the forehead has about 10 ticks, several on clear skin. Pin 2 floats on blank forehead. The dashed line on the after panel marks nothing. | forehead, before and after |
| The numbered pins with hairline leaders are the banned dot-and-line callout. | pins 1 and 3 |
| The "Clear" chips are glass pills from the video system, which POSTS_RESET bans in posts. | after panels |
| "Counted by eye on these close-ups" undermines the claim. Count properly, or say less. | bottom right |

### 3/4, how it works

- **The idea is right; this is the topic-only graphic.** The drawing isn't. It's a beige textbook/patent line drawing: the follicles look like test tubes, the laser is a thin wedge, and it has no light, no material and no brand.
- **"For Dr. Ostad to check." is printed on the post**, along with "epidermis drawn about 8× thicker". Those are internal notes and must never reach the slide.
- You already have `skin_crosssection.glb`. Render it lit, with the key light upper right, and focus on **one** follicle and **one** gland. Show the 1726 nm beam as light that warms the gland (a glow), not as a line. Use 3 labels at most, on glass plates.

### 4/4, every visit

- **The data is good.** "6 → 1 → 0 → 0" is the best thing in the carousel, but it's set at body size in a spec row.
- Eight small images in two rows are too much at phone size. The bottom 35 % of the slide is empty.
- "Counted: by eye" again, and another internal footnote ("fit within 1.7 % of eye spacing").

## What it should look like

Take the references literally:
- **Seed:** a circle mask as the signature, type with real hierarchy, and a calm field.
- **Glass ingredient cards:** an object photo inside a glass card, with chips.
- **Profile callouts:** solid dots and leaders that land on real anatomy.

| Slide | Direction |
|---|---|
| Cover | **Use her after photo full-bleed**, cropped tight, at full resolution. Put **one circular glass loupe** on her forehead: inside the circle is the *before* forehead at the same spot, showing the red papules. The before/after is told by the loupe, not by two shrunken photos. Headline: two lines, display serif (Cormorant 500) with a grotesk kicker, for example kicker *AviClear · 1726 nm* over *"Clear skin, 3 months on."* Three chips at most: *3 sessions · acne · no downtime*, only if it's sourced. Nothing else. |
| 2/4 | **One loupe pair, big.** Before and after of the forehead patch, each in a circle about 460 px across. Each papule gets a solid blue dot (v6 blue, 14 px) exactly on it. Then show the count as a **display number**: "6" before, "0" after, 200 px. Delete the cheek pair, or give it its own slide only if a full-res crop exists. |
| 3/4 | A lit 3D section of one follicle, as described above. Headline: *"It heats the oil gland, not the surface."* The physician check goes in the sidecar, not on the slide. |
| 4/4 | **A horizontal timeline:** four circles (the same loupe motif) on a hairline ruler with dates, and the count under each as a large number: **6 · 1 · 0 · 0**. That's the whole slide. |

**Rules for every slide:**
- No patient codes, alignment numbers, "check" notes or "counted by eye" on any slide. They go in `grid5/<post>.json`.
- No hairline boxes, ticks or pin-and-leader callouts. Marks are solid dots or rings on a measured target, in one blue.
- Full-resolution originals only. If the original is missing because iCloud failed, mark the slide **blocked**; don't upscale the preview.
- Check at phone size: render the grid at 360 px per tile and confirm the headline and the change can both be read.

## The grid plan

1. **Don't unify by putting everything on the same ink background.** The proposal ("every cover could use the same ink background with the photo set inside it") would give nine identical dark spec sheets, the same mistake nine times. The references unify through **one motif plus one type system plus one palette**, not one background. Use the circle loupe as Ostad's signature, the shared type pair, and the token palette (ivory, paper, sand, navy, ink, one blue). Alternate full-bleed and inset tiles (POST_RULES 8).
2. **The line-up is nine procedure carousels.** POST_RULES 11 needs rhythm: 5–6 photo-led tiles, 1–2 quiet text tiles and 1 designed graphic, and no two alike. There's no Dr. Ostad portrait, no product and no quiet tile. Suggested swaps:
   - **Mohs:** the bloody gauze photo is a bad grid tile (unappealing at feed size). Make Mohs the *designed graphic* tile instead: the inked map → layers → microscope, drawn, with the real photo inside the carousel.
   - **MyEllevate:** the cover photo shows a patient in a gown looking distressed. Use the marking shot (her face with the drawn lines) as the cover, or move it to a later grid.
   - **Treatment map:** this is the second graphic tile. Keep it, but make it a *quiet text tile*, for example a single sourced statement from Dr. Ostad, with the map in the carousel.
   - **Add:** one portrait of Dr. Ostad (him, his room, real light) and one product or device still.
3. **Fill the unknowns before designing.** "Acne · 3 visits: treatment: Ostad to name" means the post can't be written yet. Put it on the questions list and pick another tile meanwhile.
4. **Choose by tone.** Pick cover photos whose median brightness and saturation fall inside POST_RULES 12 (luma 120–130, saturation .18–.29), so the grid matches without grading any photo.

## Bar before showing Naim again

- [ ] The AviClear carousel is redone as above. Show one sheet with the old version next to the new one.
- [ ] The grid is mocked up at phone size (360 px tiles), with the new cover placed among real photos. No "Planned" placeholders on the version Naim sees.
- [ ] One sheet with our cover next to the 3 reference posts at the same size. If ours looks like a report next to them, it isn't done.
- [ ] No internal text on any slide. Grep the HTML for `P00`, `check`, `aligned`, `counted by eye`.
- [ ] Every image is a full-resolution original, at ≥ 1.0 source px per output px.
