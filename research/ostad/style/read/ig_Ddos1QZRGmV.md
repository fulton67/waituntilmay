# Evident: "Debt is neo-colonialism" (IG Ddos1QZRGmV), read frame by frame

Reference sent by the client as the model for our explainer animations. 98.5 s, 720x1280, 30 fps, 2,953 frames. Presenter: Bianca Graulau (journalist), red-curtain studio. Subject: Thomas Sankara and African debt.

Sources: all 50 contact sheets viewed. Close-up frames were checked against Evident's YouTube upload of the same piece (`media/yt/evident/zigiwXNHo7c.mp4`: 1080x1920, 30 fps, 2,953 frames, **frame offset 0** against the IG copy; mean abs luma diff 2.91 at offset 0 vs 3.90 at ±1). All frame numbers refer to the IG copy (`sheets/evident/Ddos1QZRGmV/0000-0049.jpg`, one TSV line each in `ig_Ddos1QZRGmV_sheets.tsv`), every JSON in `measure/evident/Ddos1QZRGmV/`, and per-frame pixel measurements of four moments decoded with ffmpeg (scripts and output in the session scratchpad: `ddos_moments.py`, `moments.json`, `ddos_analyse.py`, `analysis.json`). Frame numbers are 0-based. "f" = frames at 30 fps.

---

## 1. How Evident does it (the short version)

1. **Every graphic is a piece of the story, never a widget.** Across 33 beats there is no button, progress bar, icon set, step player or cursor. The only UI-like thing is a typewriter caret visible for 2 frames (27-28). Every element on screen is data the narrator says (bars, counters, a dot grid), a document she cites (headlines, a bondholder table), or real archive (photos, 1980s video). The motion carries the meaning: bar height is the number, the fill is the share, the coastline trace is the geography, the highlighter is the phrase she's saying, the tape glitch is the assassination, the empty window is the death, and the karaoke quote is his voice.
2. **One visual change per spoken claim, landing on the word.** 23 measured reveals start a median of +1 f after the word onset (median absolute offset 2 f; 65% within ±3 f). The karaoke quote is within ±1 f on all 7 measured words. 22 of 31 beat changes (71%) happen mid-sentence, on the key word, not at the full stop.
3. **Build in place instead of cutting to a new card.** One chart grows across a whole sentence: B05 adds the scaffold, then bar 1, bar 2, and the lime bar 3 over 10.9 s (frames 366-693). The camera reframes to make room for each bar: it pushes into slot 1 at 416-430 and pulls back at 540-560. 7 of 32 transitions are additions inside the same graphic.
4. **Shared grammar, different form.** The constants are a charcoal paper canvas, one data blue (#4D63CA), one accent (lime #D9ED55), a highlighter, and the caption box. The form changes every time: bar chart with tags (B05), then bars with rolling counters (B07), a unit/waffle chart (B08), a punch-in with a typed callout (B09), a typewriter-titled chart (B14), a table with row wipes (B15), document crops (B11-B18), windowed archive (B19-B24), and a karaoke quote (B26). The bar chart is the most repeated family (8 beats), but each of its 3 charts changes a variable: title fade vs typed title, value tags vs counters, and accent colour only on the punchline.
5. **The accent colour has one job.** Lime appears only on the thing that matters: the quote highlight (frames 27-47), the "still owed" bar (619), Africa's 9.8% yield bar (763), the BlackRock and Goldman rows (1696, 1724), and the headline phrases (1227, 1287, 1859, 1897, 1947). Blue is the neutral data colour.
6. **Real archive is framed, credited and graded per clip.** Every borrowed image carries a small grey source label (ProleWiki at f78, "CheSankara / YouTube" at f2007, "UN Photo / Saw Lwin" at f2595, a chart source line on every chart). Archive video sits in a rounded window on black (radius ≈2% of window width, no shadow), and each clip gets a different cast: blue hall (2215), orange crowd (2259), red podium (2324).

---

## 2. Numbers

| Measure | Value | Source |
|---|---|---|
| Beats (distinct visual ideas) | 33 (27 scenes, with sub-beats split where a new number or element is revealed) | §3 |
| Seconds per beat, excl. end card | median **2.13 s**, p90 **5.19 s**, mean 2.94, min 0.87 (B24), max 7.57 (B26) | analysis.json |
| Seconds per scene | median 2.57 s, p90 6.75 s | analysis.json |
| Presenter beats / graphic beats | median 2.56 s / 2.05 s | analysis.json |
| Frame share | designed full-frame graphics **38.7%**, document crops **9.5%**, archive photo/video **26.8%**, presenter **20.6%**, end card 4.4% | beats |
| Runs between presenter shots | 8.1, 10.9, 13.3, 3.9, 30.0, 11.9 s | beats |
| Speech | 2.92 words/s, 17 sentences, median 17 words / 4.44 s | pacing.json |
| Transitions (by viewing) | 21 hard cuts, 2 defocus-to-focus (2259, 2595), 1 tape glitch (2377-2410), 1 stepped zoom (1016-1026), 7 in-place additions, **0 crossfades** | §3 |
| Detector cuts / dissolves | 26 hard / 35 "dissolves" (median 5 f). The dissolves are 3-5 f animation steps inside graphics (e.g. 2018-2141), not editorial dissolves | cuts.json |
| Camera | moving 92.6% of frames: push 47.4%, pull 40.5%, static 7.4%; median push rate 0.033/s, pull 0.048/s; median net zoom per shot 0.48%/s (shot cum_scale 0.947-1.074) | camera.json |
| Camera caveat | on animated graphics the estimator alternates push/pull every 2-3 f in step with the bar steps (e.g. 763-805), and it reads the lime block at 20-51 as a ±10% zoom while the frames show a locked-off presenter. Real moves are the reframes at 416-430, 540-560, 1016-1026, 1675, 1858 and 1940-1946, plus slow pushes on stills | frames vs camera.json |
| Animation frame rate | designed graphics are **stepped on 2s/3s (~12 fps)**: 44% duplicate frames in G, 33% in archive (low-fps sources), 18.5% in documents, **0% in presenter footage** | cuts.json content_val < 0.1 |
| Element entry | non-caption elements settle to full opacity in median 5.5 f (p90 19 f); 75 of 80 enter mid-shot | graphic_elements.json |
| Caption | black box, square (0 px edge at 1080p; detector 3.4 px), **52 px tall = 4.06% H** (78 px at 1080p, 4.06%), cap height **21 px = 1.64% H** (32 px at 1080p = 1.67%), centre **77.1% H**, width median 50.8% W (max 76.3%); phrase chunks of median 1.23 s (≈3.6 words); hard swap, no fade; quoted words set in italic (f2050) | pixels fr_0100/0460, elements |
| Other type (% of frame height) | kinetic quote: highlight bar 74 px = 5.8%, x-height 38 px = 3.0%; name super cap 35 px = 2.7%; chart title cap 33 px = 2.6% (pushed-in); value-tag figures 31 px = 2.4%; small caps labels (LOANS, name tag) 16 px = 1.25%; "57%" 80 px = 6.25% (f950) → 119 px = 9.3% after punch-in (f1070); callout 26 px = 2.0% | pixel rows |
| Cards: corner radius | caption boxes ~0 (3.4 px detector); value tags 20-31 px measured; archive window ~20 px at 1080p (≈13.5 px at 720, **≈2% of window width**; cards.json reads 20.5 px at 720 from the soft glow edge); callout and headline cards 52-84 px read off rag-shaped shapes; overall median 5.1 px | cards.json |
| Cards: shadow | none visible in any frame. The archive window measures alpha 0.0. Tag "shadows" (alpha 0.5-0.74) are the charcoal canvas misread against white tags | cards.json + frames |
| Brand bug | "E" roundel top-right, 80 px (6.25% H), centre ~15% H, on every frame except the end card | elements 17/284 |
| SFX alignment | 62.6% of 115 graphic entries within 3 f of an audio onset, but **chance is 58.7%** (343 onsets, 3.48/s, mostly speech syllables). Strong onsets (≥0.4) hit 82.6% (n=23), and most of those are caption changes on speech. **No evidence of per-graphic SFX** | sfx.json |
| Loudness | mix −14.7 LUFS, true peak −0.2 dBFS, LRA 3.8 LU; **voice −15.23, bed −23.65 LUFS: voice 8.42 LU over the bed** | loudness.json |
| Palette | charcoal canvas #313032 (23.8% of G pixels); presenter blacks #141516; archive pure black #000002; documents pale #F0F8F6 (luma 220); data blue **#4D63CA** (RGB 77,99,202); accent lime **#D9ED55** (217,237,85); dots/labels cream #DAD8D4; value tags #ECEAEB | palette.json + pixel samples |
| Image stats (median) | presenter luma 51 / sat 0.35 / warm highlights 20°; graphics luma 57 / sat **0.07** / cool highlights 222°; documents luma 221; archive luma 37 / sat 0.16 | image_stats, tone_hue |

---

## 3. Beat table

Cat: P presenter, A archive, G designed graphic, D document crop, E end card. "Onset" is the strongest audio onset near the beat's first element (sfx.json); given the 58.7% chance rate this only shows sync, not that a designed sound exists.

| # | Frames | s | Cat | Device | Spoken line | In / out | Onset | How it differs from the previous beat |
|---|---|---|---|---|---|---|---|---|
| B01 | 0-77 | 0.00-2.60 | P | kinetic pull-quote + highlighter, name super | "Debt is neocolonialism." | '"Debt is' types 4-9; 'neo-colonialism."' 27; lime sweep 27-47 (20 f); out: hard cut 78 | 34 (+0.8 f) | opening: quote set as type over the presenter |
| B02 | 78-212 | 2.60-7.10 | A | archive photo + typewriter name tag | "Thomas Sankara said 40 years ago... president of Burkina Faso." | cut on "Thomas" (78); tag types on 83-100 and off 205-212; slow push; cut 213 | n/a | from her face to *his* face; studio colour to archive; name typed, not faded |
| B03 | 213-321 | 7.10-10.73 | G | real map + line trace | "At that time, African countries were already trapped in a cycle of debt." | cut on "At" (212); lime stroke traces the coast clockwise 216-250, tail erases; cut 322 | 228 (−0.2), 246, 250 | first designed graphic; the stroke traces the continent being named |
| B04 | 322-365 | 10.73-12.20 | P | presenter | "Look at these numbers. From 1970" | hard cut / hard cut | n/a | back to the narrator to set up the data |
| B05a | 366-420 | 12.20-14.03 | G | chart scaffold | "to 2002, the continent" | title fade 369-371 (3 f), axis draws 376-390 (15 f), source 389 | 429 | new space: charcoal paper canvas |
| B05b | 421-543 | 14.03-18.13 | G | bar grow + value tag | "received $540 billion in loans and paid back" | bar 421-441; tag pops 439-441 on "$540" (440); push-in held | 440 (−5.7) | first number made physical |
| B05c | 544-600 | 18.13-20.03 | G | bar grow + tag (slot 2) | "$550 billion," | camera pulls 540-560; bar 551-574 on "$550" (550); tag 576-586 | 555 | same grammar, new slot; the camera makes room |
| B05d | 601-693 | 20.03-23.13 | G | accent bar | "yet still owed almost $300 billion." | lime bar 619-633; tag 634-640 on "almost" (633); cut 694 | 620.7, 642 | **colour switch** delivers the irony |
| B06 | 694-747 | 23.13-24.93 | P | presenter | "Today, African countries pay as much as" | hard / hard | 705 (+4.8) | narrator, new topic (interest) |
| B07a | 748-802 | 24.93-26.77 | G | bar + rolling counter | "10% in interest, which is" | title 751-753; axis 753-760; lime bar 763-796 with % label counting 2.3→9.8 | 773 | a counter instead of a tag; whole chart in accent because Africa is the subject |
| B07b | 803-887 | 26.77-29.60 | G | comparison bar + counter | "around twice as much as countries like the US." | "U.S." 803; bar counts 1.1→4.4 over 810-843; swap 888 | 820.6 | comparison added beside, same scale |
| B08 | 888-1015 | 29.60-33.87 | G | unit (waffle) chart + big number | "a result, more than half of Africa's population lives in countries that spend" | grid builds from bottom-left 888-906; header types on; blue fill 931-955; "57%" 946 | 890.9 (−0.1) | new chart form: people as dots |
| B09 | 1016-1145 | 33.87-38.20 | G | stepped punch-in + typewriter callout | "more paying interest on loans than on education or health." | zoom 1016-1026; rag-hugging callout types 1026-1085, following the words; cut 1146 | 1037-1125 (−0.8 to +7) | the camera dives into the 57%; the sentence is typed as she speaks it |
| B10 | 1146-1221 | 38.20-40.73 | P | presenter | "The irony becomes that lending money to impoverished nations" | hard / hard | n/a | narrator for the turn |
| B11 | 1222-1284 | 40.73-42.83 | D | document crop + highlighter | "is a lucrative business, sometimes" | cut on "is" (1222); highlight "Pour Record Funds" 1227-1250 (23 f); pan | 1252 (+1.2), 1262 | first document: pale paper, serif |
| B12 | 1285-1339 | 42.83-44.67 | D | document crop + highlighter | "with record returns." | hard swap on "with"; "Record Returns" lit 1287-1303 (16 f), 9 f before "record" | 1281 (−4) | second outlet, sans type: corroboration |
| B13 | 1340-1536 | 44.67-51.23 | P | presenter (longest hold) | "While these countries are left without money... and the cycle continues." | hard / hard | 1425 (+2.3) | breather, 6.6 s |
| B14a | 1537-1594 | 51.23-53.17 | G | typed chart title + counter bar | "Private creditors have been buying up more" | cut on "Private" (1538); title types letter by letter 1540-1556; 2010 bar counts 14→30% over 1565-1587 | 1557.6 | title is typed this time (B05/B07 faded theirs) |
| B14b | 1595-1675 | 53.17-55.87 | G | comparison bar + counter | "and more African debt, and we see Wall Street" | 2021 bar counts 24→44% over 1595-1610; chart shrinks 1675 | 1598.7 | second bar towers: growth over time |
| B15a | 1676-1719 | 55.87-57.33 | G | table + row wipe | "firms like BlackRock and Goldman" | cut on "firms" (1676); slow push; lime wipes the BlackRock row 1696-1714 on "BlackRock" (1695) | 1685 (+1.1) | from aggregate to named actors |
| B15b | 1720-1843 | 57.33-61.47 | G | row wipe #2, hold | "Sachs investing in bonds for countries like Ghana and Zambia." | Goldman row 1724-1739; both rows stay lit; cut 1844 | 1730.4, 1751 | second name lit; nothing else moves |
| B16 | 1844-1893 | 61.47-63.13 | D | document crop + highlighter | "For years, some advocacy groups have" | Reuters article; push step 1858; "call for debt cancellation" 1859-1870 | 1846, 1859 (+0.2) | data to press: a news wire |
| B17 | 1894-1946 | 63.13-64.90 | D | document crop + highlighter | "been calling for the debt to get cancelled," | second outlet with a dice photo; two-line highlight 1897-1910; pull-out 1940 | 1899.6 (+2.6) | different outlet, photo, two lines |
| B18 | 1947-2006 | 64.90-66.90 | D | document crop + highlighter | "echoing what Sankara said in the 80s." | third outlet with a photo strip; "debt forgiveness" 1947-1958 | 1950.5 | faith leaders: a third, different voice (3 outlets in 5.4 s) |
| B19 | 2007-2214 | 66.90-73.83 | A | archive video in a window + italic quote captions | "If we don't repay, he said, lenders will not die. But if we repay, we are going to die. Sankara called" | black frame, rounded 4:3 window, credit; his words captioned in italic | 2022 (+3.2) | his actual voice on screen; captions change register |
| B20 | 2215-2258 | 73.83-75.30 | A | windowed archive, in-window cut | "on other African countries to" | hard cut inside the window | n/a | blue-cast conference hall |
| B21 | 2259-2323 | 75.30-77.47 | A | windowed archive, defocus-in | "join him in refusing to pay. Because" | focus pulls from blur 2259-2266 (7 f) on "join" (2262) | 2258 (+3.4) | orange grade, crowd |
| B22 | 2324-2376 | 77.47-79.23 | A | windowed archive | "if Burkina Faso stood alone," | hard cut inside the window | n/a | Sankara at the UN podium, red grade |
| B23 | 2377-2410 | 79.23-80.37 | A | tape glitch | "he said he would get" | tracking glitch 2377-2392, B&W flash 2393-2395, black 2407-2410 | n/a | **the picture breaks**: violence without showing it |
| B24 | 2411-2436 | 80.37-81.23 | A | empty window | "murdered." | window goes flat grey on "murdered" (2414) | n/a | **absence**: the man is withdrawn from the frame |
| B25 | 2437-2594 | 81.23-86.50 | P | presenter | "Three months later, he was killed in a coup... He said debt" | hard / defocus cut | 2448, 2461, 2533 (speech) | narrator carries the fact |
| B26 | 2595-2821 | 86.50-94.07 | A | archive photo + karaoke quote | "was, quote, controlled and dominated by imperialism... reconquest of Africa." | blur→sharp 2595-2600; quote laid out dim; each word brightens on its onset (±1 f) | 2645 (+3) | his words lit as they're spoken: final authority |
| B27 | 2822-2952 | 94.07-98.43 | E | brand end card | (none) | strokes 2822-2851; wordmark 2852; "SEE FOR YOURSELF" ~2896 | 2824.7 | brand system made from the same blue, lime and cream |

### Repetition count and how they avoid it

- Device families across 33 beats: bar chart 8 (in 3 separate charts), archive video 6 (5 clips plus the void), document crop 5, presenter 5 (plus B01), archive still 2, unit chart 2, table 2, map 1, kinetic quote 1, end card 1. **10 families.**
- 15 of 32 boundaries continue the same family, but those are builds (B05a-d, B07a-b, B14a-b, B15a-b, B08-B09) or deliberate runs where the *content* changes: 3 outlets in B16-18, each with its own typography and photo; 5 archive clips in B19-24, each with its own grade (blue 2215, orange 2259, red 2324, B&W glitch 2393, grey void 2411).
- Within the bar-chart family, each repeat changes one variable: B05 uses faded title, value tags and an accent on the last bar only. B07 uses a faded title, counters, and accent on the whole chart. B14 uses a typed title, counters, and an all-blue chart. The 3 charts never look the same.
- Highlighter repeats 7 times but always on a different object: a quote over the presenter (27), a serif headline (1227), a sans headline (1287), table rows (1696, 1724), a wire headline (1859), multi-line text over a photo (1897), and a headline under a photo (1947).
- The presenter appears between graphic runs of 3.9-30.0 s. She is never used as filler between two graphics of the same kind.

---

## 4. Frame-by-frame tables: the 3 most instructive moments

Measured by decoding frames with ffmpeg and thresholding the lime (#D9ED55) pixels (`ddos_moments.py`). Positions are in px on the 720x1280 frame. Camera columns are from camera.json. In all three windows the presenter or graphic is locked off, and the camera.json rate oscillates in step with the animation steps, so treat it as estimator noise.

### Moment A: opening pull-quote highlighter (frames 17-57) on "neo-colonialism" (word onset f28)

Lime block from x=63; full width 593 px (63→656), height 74 px (y 704-778 = 5.8% H). Solid fill (opacity 1), square corners. Unlit text is grey; text under the lime turns black.

| Frame | t (s) | Lime right edge x | Progress | Step Δpx | Light-text px | camera.json | Note |
|---|---|---|---|---|---|---|---|
| 17-26 | 0.57-0.87 | none | 0% | n/a | 7,345-7,350 | push 0.04-0.23/s (noise) | '"Debt is' on screen |
| 27-28 | 0.90-0.93 | 64 | 0.2% | +1 | 6,767 → 6,750 | push | line swaps to 'neo-colonialism."'; 1 px caret (the only "UI" in the video) |
| 29-31 | 0.97-1.03 | 85 | 3.7% | +21 | 9,759 | push | sweep starts 1 f after the word onset (28) |
| 32-33 | 1.07-1.10 | 142 | 13.3% | +57 | 8,572 | push | accelerating |
| 34-36 | 1.13-1.20 | 275 | 35.8% | +133 | 8,244 | push | element 1 detected (opacity 0.583) |
| 37-38 | 1.23-1.27 | 478 | 70.0% | **+203 (peak)** | 4,087 | push | peak velocity at 44% of duration |
| 39-41 | 1.30-1.37 | 591 | 89.0% | +113 | 1,739 | pull | decelerating; element 1 opacity 0.98 |
| 42-43 | 1.40-1.43 | 639 | 97.1% | +48 | 1,220 | pull | |
| 44-46 | 1.47-1.53 | 655 | 99.8% | +16 | 1,025 | pull | element 1 opacity 1.00 |
| 47-57 | 1.57-1.90 | 656 | 100% | +1 then 0 | ~1,060 (name super) | pull → push | holds to the cut at 78 (31 f hold) |

Read: **20 f (0.67 s) ease-in-out sweep, held in 2-3 f steps (8 updates)**, starting on the word onset. Peak speed comes at 44% of the duration, so the curve is close to a symmetric cubic in-out. The text changes colour as the block passes over it. There's no shadow, overshoot or scale.

### Moment B: Africa bond-yield bar + rolling counter (frames 753-806) on "10% in interest" ("10" onset f752, "interest" f778-793)

Bar x 247-320 (73 px = 10.1% W, fixed width), baseline y 803, final height 364 px (28.4% H). Lime, solid. The % label sits on top of the bar and rides up with it. Counter values were read from sheets 12-13.

| Frame | t (s) | Bar top y | Height px | Progress | Step Δpx | Counter label | elem 72 opacity* |
|---|---|---|---|---|---|---|---|
| 753-762 | 25.10-25.43 | none | 0 | 0% | n/a | none (axis + "AFRICA" label 758) | n/a |
| 763-765 | 25.43-25.53 | 800 | 3 | 0.8% | +3 | none | n/a |
| 766-767 | 25.53-25.57 | 790 | 13 | 3.6% | +10 | none | n/a |
| 768-770 | 25.60-25.67 | 775 | 28 | 7.7% | +15 | 2.3% | n/a |
| 771-772 | 25.70-25.73 | 750 | 53 | 14.6% | +25 | 2.9% | 0.449 |
| 773-775 | 25.77-25.83 | 711 | 92 | 25.3% | +39 | 3.4% | 0.64 |
| 776-777 | 25.87-25.90 | 652 | 151 | 41.5% | +59 | 4.2% | 0.83 |
| 778-780 | 25.93-26.00 | 580 | 223 | 61.3% | **+72 (peak)** | 4.9% | 0.92 |
| 781-782 | 26.03-26.07 | 524 | 279 | 76.6% | +56 | 5.5% | 0.96 |
| 783-785 | 26.10-26.17 | 489 | 314 | 86.3% | +35 | 6.1% | 0.98 |
| 786-787 | 26.20-26.23 | 466 | 337 | 92.6% | +23 | 6.8% | 0.99 |
| 788-790 | 26.27-26.33 | 452 | 351 | 96.4% | +14 | 7.4% | 0.99 |
| 791-792 | 26.37-26.40 | 444 | 359 | 98.6% | +8 | 8.1% | 1.00 |
| 793-795 | 26.43-26.50 | 440 | 363 | 99.7% | +4 | 8.7% | 1.00 |
| 796-797 | 26.53-26.57 | 439 | 364 | 100% | +1 | 9.4% | 1.00 |
| 798-806 | 26.60-26.87 | 439 | 364 | 100% | 0 | **9.8%** | 1.00 |

*Element 72's opacity is the detector's area coverage. The bar itself is fully opaque.

Read: **the bar grows over 33 f (1.1 s), ease-in-out with its peak at 45% of the duration, in 14 updates of 2-3 f each.** The counter is **linear** (+0.5 to +0.8 per update, about 0.25 %/f) and keeps counting 2 f after the bar stops (9.4 at 796, 9.8 at 798). Bar and counter run on separate curves: at f783 the bar is 86% up but the counter reads 62% of its final value. The bar starts 11 f after "10" and lands on "which" (796), so it fills the length of the clause.

### Moment C: table row-highlight wipes (frames 1686-1745) on "BlackRock" (onset f1695) and "Goldman" (f1715)

Row highlight from x=100. BlackRock row width 521 px (100→621 = 72% W). Height 44-45 px (3.4% H). Lime, square corners, text flips to black. The band top drifts up from y 484 to 458 over 60 f because of a slow real push (about 0.4 px/f).

| Frame | t (s) | BlackRock right x | Progress | Step Δpx | Goldman right x | Goldman progress | Band y (top-bottom) |
|---|---|---|---|---|---|---|---|
| 1686-1695 | 56.20-56.50 | none | 0% | n/a | none | 0% | n/a |
| 1696-1698 | 56.53-56.60 | 110 | 1.9% | +10 | none | 0% | 484-495 (leading sliver) |
| 1699-1700 | 56.63-56.67 | 150 | 9.6% | +40 | none | 0% | 480-523 |
| 1701-1703 | 56.70-56.77 | 250 | 28.8% | +100 | none | 0% | 477-521 |
| 1704-1705 | 56.80-56.83 | 437 | 64.7% | **+187 (peak)** | none | 0% | 474-518 |
| 1706-1708 | 56.87-56.93 | 555 | 87.3% | +118 | none | 0% | 472-516 |
| 1709-1710 | 56.97-57.00 | 604 | 96.7% | +49 | none | 0% | 470-514 |
| 1711-1713 | 57.03-57.10 | 620 | 99.8% | +16 | none | 0% | 468-513 |
| 1714-1723 | 57.13-57.43 | 621 | 100% | +1 then 0 | none | 0% | 467→463 |
| 1724-1725 | 57.47-57.50 | 621 | 100% | 0 | 129 | 5.6% | Goldman 807-851 |
| 1726-1728 | 57.53-57.60 | 621 | 100% | 0 | 197 | 18.6% | 806-849 |
| 1729-1730 | 57.63-57.67 | 621 | 100% | 0 | 353 | 48.6% | 805-849 |
| 1731-1733 | 57.70-57.77 | 621 | 100% | 0 | 509 | 78.5% | 804-849 |
| 1734-1735 | 57.80-57.83 | 621 | 100% | 0 | 577 | 91.6% | 804-847 |
| 1736-1738 | 57.87-57.93 | 621 | 100% | 0 | 603 | 98.9% | 803-847 |
| 1739-1745 | 57.97-58.17 | 621 | 100% | 0 | 607 | 100% | 802-846 |

Read: **BlackRock's wipe takes 18 f (0.6 s), peaks at 44%, and starts 1 f after the word.** Goldman's takes 15 f and starts 9 f after "Goldman", on "Sachs" (1726). The first row stays lit while the second fills, so the frame ends with both names highlighted.

### Bonus: waffle fill (frames 925-955), "more than half of Africa's population" ("of" f929)

Blue-pixel area (minus the constant 213 px "E" logo): 103 (931) → 603 (933) → 3,728 (936) → 12,281 (938) → 35,301 (941) → 59,581 (943) → 74,072 (946, "57%" fades in) → 85,280 (948) → 94,407 (951) → 98,083 (953, settled). Fill bottom edge y 301 → 331 → 407 → 518 → 672 → 785 → 865 → 910 → 933 → 944. **22 f, ease-in-out (slow start, peak around 941, long settle), stepped every 2-3 f**, starting 2 f after the word.

---

## 5. Rules for our Exomind edit

Our constraints are Helvetica Neue LT Pro 65 Medium; word-by-word captions on the audio onset with no fade or shadow; brand blues, never green; real video over stock; no play/pause or cursor UI; no hand-drawn anatomy; calm, linear pacing.

| # | Rule | Number | Frames | Verdict | Why |
|---|---|---|---|---|---|
| R1 | Every visual element is content he names (a number, a document, a real image). No decorative UI: no step players, taps, icons or hairlines that aren't data | 0 UI widgets in 33 beats; caret visible 2 f | 27-28 | **Adopt** | This answers the client's "random widgets" complaint directly |
| R2 | Reveals start on the key word's onset | median +1 f, abs median 2 f, 65% ≤3 f; karaoke ±1 f | 27, 439, 551, 1696, 2620-2759 | **Adopt** (target ≤3 f) | Same logic as our word-onset captions |
| R3 | Change the picture mid-sentence, on the claim word, not at the full stop | 22/31 beat changes mid-sentence | 78, 1222, 1676, 2414 | **Adopt** | Ties each image to its word |
| R4 | One visual idea per claim; hold a scene and *build inside it* | beat median 2.13 s, p90 5.19 s; B05 runs 10.9 s with 4 reveals | 366-693 | **Adapt**: scene median 4-6 s (our "visual every ~5 s"), with an in-scene reveal every 2-3 s | Calm long-form needs longer scenes; the build keeps it alive without cutting |
| R5 | Build in place: add the next bar, row or highlight to the same canvas instead of cutting to a new card | 7 of 32 transitions in place | 544, 601, 803, 1595, 1720 | **Adopt** | The opposite of "same card template everywhere" |
| R6 | Never reuse a template unchanged: keep the grammar, change one variable per repeat (title fade vs typed; tag vs counter; accent position) | 3 bar charts, 3 variants | 369 / 751 / 1540 | **Adopt** | Gives identity without repetition |
| R7 | Two-colour data logic: neutral data colour plus one accent reserved for the punchline | blue #4D63CA neutral; lime #D9ED55 only on 9 punch elements | 619, 763, 1696 | **Adapt**: neutral mid brand blue, accent a light ice blue (~205-215°); lime **rejected** (it's yellow-green) | The client bans green |
| R8 | Textured dark canvas for data scenes; low saturation | G luma 57, saturation 0.072; canvas #313032 | 366-1675 | **Adapt**: our cool blue-grey room canvas (hue 212-216°) with a fine paper grain | Ties the graphics to his room palette |
| R9 | Highlighter: solid block behind the phrase, square corners, text flips dark; ease-in-out sweep | 16-23 f; peak at 44%; full width 593 px | 27-47, 1227-1250, 1696-1714 | **Adopt** (in light blue; 18-20 f) | The most reusable evidenced move, and it explains which words matter |
| R10 | Bar grows ease-in-out, counter linear, value tag pops in 2-3 f | bar 33 f, peak 45%; counter ≈0.25 %/f; tag 439-441, settles in 11 f | 763-798, 439-457 | **Adopt** | Shows magnitude; the decoupled counter reads as calculation |
| R11 | Animate graphics on 2s/3s (~12 fps) over 30 fps footage | 44% duplicate frames in graphics, 0% in presenter | 763-796 | **Adapt**: test on data graphics only; keep camera moves at 30 fps | Gives a printed, editorial feel, but may fight "calm"; A/B it |
| R12 | Flat surfaces, no drop shadows; rounded window only for real footage | window radius ≈2% of its width (20 px at 1080p), shadow alpha 0.0; caption box square | 2007-2436 | **Adopt** | Matches calm glass without generic card chrome |
| R13 | Credit every borrowed image or clip with a small grey source label | 4 credit styles; label ~1.25% H | 78, 2007, 2595, 389 | **Adopt** | Builds his authority as a doctor citing sources |
| R14 | Captions: boxed phrase chunks, median 1.23 s, hard swap, centre 77% H, cap height 1.64% H | n/a | throughout | **Reject** the chunks and the box (client rule: word by word, no box/fade/shadow). **Adopt** the italic switch for quoted speech | Italics mark another voice (a patient or a study), as at 2050 |
| R15 | Type sizes by role (% of H): quote x-height 3.0, name super 2.7, chart title 2.6, value figures 2.4, labels 1.25, hero number 6.25-9.3 | n/a | 50, 460, 950, 1070 | **Adapt** to 16:9 by height, all set in Helvetica Neue 65 | Their font is a geometric grotesk; keep the size ratios, not the face |
| R16 | Camera moves serve the reveal: push into the slot, pull back to make room, stepped punch-in into the key number | reframes 416-430, 540-560, 1016-1026; median push 0.033/s | same | **Adapt** within our 1.1-1.2x cap; no random drift | Motion with a reason reads as calm |
| R17 | Hard cuts between scenes, no crossfades; defocus-to-focus only into archive or stills | 21 hard, 2 defocus (7 f, 5 f), 0 crossfade | 2259, 2595 | **Adopt** | Matches our gentle cuts |
| R18 | Meaning through the medium: the image breaks or disappears when the story does | glitch 30 f, void 26 f | 2377-2436 | **Adapt**: a soft version only (e.g. noise clearing to calm), no hard datamosh | The client wants calm; the inverse reading still works |
| R19 | Karaoke quote: lay out the whole statement dim, light each word on its onset | ±1 f on 7 words | 2620-2789 | **Adopt** for his thesis line | Builds identity; compatible with word-onset captions (hide captions during it) |
| R20 | Voice 8-9 LU over the bed; no evidence of per-graphic SFX | voice −15.23, bed −23.65 LUFS; SFX hits 62.6% vs 58.7% chance | n/a | **Adopt** the gap; **adapt** SFX: keep pops sparse (one per hero reveal), since Evident doesn't evidence them | Calm mix |
| R21 | Persistent small brand bug | 80 px roundel, 6.25% H, top-right | 7→2821 | **Adapt**: optional small Ostad mark; drop it in hero frames | Identity, but it's clutter on long-form |

---

## 6. Bespoke animation ideas for the Exomind video

Each idea uses a technique evidenced above (reference frames given), shows the mechanism or point he's making, and stays within our constraints: blues only, Helvetica Neue 65, real video or real imaging, no drawn anatomy, no UI chrome.

1. **"Stress → cortisol" bar build in one scene** (B05, 366-693). A blue-grey canvas with a scaffold (title, axis, a credited study source). Bar 1, "cortisol at rest", grows on his first number. The camera pulls back to make room, and bar 2, "under chronic stress", grows on the second. The *consequence* bar ("inflammatory markers") arrives last in the ice-blue accent: the colour switch is the punchline. Tags pop on each number's onset (2-3 f), and bars ease in-out over about 30 f.
2. **Rolling counter for the inflammation climb** (B07a, 763-798). If he gives a percentage (e.g. a flare-risk increase), a single bar eases up while its label counts linearly and finishes 2 f after the bar. A comparison bar (calm baseline) then joins beside it at the same scale (B07b, 803-843): "twice as much" becomes visible.
3. **Highlight the inflamed area on the real condition photo** (B03 line trace 216-250). On the patient's real before image (markup on condition images, never his face), a thin light-blue stroke traces the edge of the inflamed patch as he says "inflammation", then the tail erases. A real image with one stroke means no drawn anatomy.
4. **The coil reaching the prefrontal cortex on real imaging** (B03 trace plus B09 stepped punch-in, 1016-1026). On a real MRI slice or a real photo of the coil on a patient's head, a stroke traces from the coil position to the frontal region, then a stepped 10 f punch-in fills the frame with the prefrontal area. A rag-hugging callout types "magnetic pulses → prefrontal cortex" word by word as he says it (1026-1085). The motion is the pulse's path.
5. **Pulse count as a counter, not an icon** (B07a counter logic). For "each session delivers N pulses", a large Helvetica 65 number counts linearly while a thin bar eases to full. No waveform widgets or play buttons. The number is the visual.
6. **Neuroplasticity as before/after bars from a cited study** (B14, 1537-1610). Typed title "Connectivity, before vs after a course of sessions", then a "before" bar counts up and an "after" bar counts higher beside it. The title is typed this time, which varies it from idea 1's faded title, as Evident does between charts.
7. **Anxiety and sleep as a unit chart** (B08-B09, 888-1145). A grid of dots builds (each dot is a patient). The share reporting anxiety or poor sleep floods light blue from the top-left over about 22 f with a hero % (6-9% H). Then a stepped punch-in into the filled block, and a callout types his conclusion ("stress you can see on the skin").
8. **Journals and FDA paper as document crops with a highlighter** (B11-B12, B16-B18). Three real crops in about 5 s, each with its own typography: a dermatology journal headline on psychological stress and skin, a TMS study headline, and the relevant line of a clearance document. A light-blue highlighter sweeps the key phrase on its spoken onset (18-20 f, ease-in-out, text flips dark), with a source label on each. This shows corroboration without stock footage.
9. **The patient's sessions as a table with row wipes** (B15, 1676-1843). A clean table: session or week, what changed (sleep, anxiety, skin). Each row is wiped light blue as he mentions it (18 f, peak at 44%) and stays lit, so by the end the course of treatment is fully highlighted. A slow real push runs underneath, about 0.4 px/f.
10. **Real clinic footage in a credited window** (B19-B22, 2007-2376). Real Exomind session video (or a news clip about TMS) in a rounded window (radius ≈2% of window width, no shadow) on the dark canvas, with in-window hard cuts between angles and a different subtle grade per clip. If a patient is quoted, the quoted words are captioned in italic (2050).
11. **"Total skin health" thesis as a karaoke statement** (B26, 2595-2821). Over a darkened real photo from his clinic (not his face as a markup surface), his one-line thesis is laid out dim in Helvetica 65 and each word brightens on its onset (±1 f). Word captions are hidden during it. This is the identity frame for the end.
12. **Calm-from-noise for the anxiety loop** (inverse of B23-B24, 2377-2436). A real clip of a restless night carries faint scan-line noise that clears to a clean, steady image as he says the stimulation "quiets" the loop. It uses Evident's medium-as-meaning device with the direction reversed to stay calm.
13. **Opening pull-quote with a highlighter and name super** (B01, 0-77). His opening line is set as type over the presenter shot, and the key word ("brain" or "skin") gets the light-blue block sweep on its onset (20 f). The name super reads "Dr. Ariel Ostad / Dermatologist". The block sits on dead space beside him, never over the face.

---

## 7. Caveats

- The SFX alignment is not evidence of designed sounds: the hit rate (62.6%) is only 3.9 points above chance (58.7%), and 343 onsets at 3.48/s are mostly speech syllables. The only reliable audio fact is the 8.42 LU voice-over-bed gap.
- camera.json misreads animated graphics as push/pull oscillation (e.g. 763-805) and a ±10% zoom at 20-51. Real moves were confirmed visually at the frames listed in R16.
- The cards.json "shadow" values on value tags and callouts (alpha 0.5-0.74) come from the dark canvas next to light shapes. No drop shadow is visible in any extracted frame, and the archive window measures alpha 0.0.
- The detector missed some editorial swaps between two dark or two pale graphics (888, 1285) and some in-window archive cuts (2215, 2324). Those were taken from the contact sheets.
- The cuts.json "dissolves" (35, median 5 f) are animation steps, not editorial dissolves.
