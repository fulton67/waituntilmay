# Ostad reel playbook (FAST LANE)

A production session reads only this page, the reel's timeline and its transcript. Everything else (RULES.md, MOTION.md, LESSONS.md, the bible) is reference: open a file only to answer one question.

## 1. The look in 10 lines
1. Raw camera-roll footage: no grade, tone map, brightening or opacity change; `toneMapped={false}`; HDR master from the HLG originals.
2. 1080 × 1920, 24 fps. Margins 98, top safe 250, chest band 1040, captions 1594 (px).
3. One material: calm glass (frost, hairline rim, long soft shadow, two slow light blobs).
4. Ink `#1d2230`, muted `#6b7183`, white, kit cream `#f2efed` and sand `#bf8662`. Blue `#37a9e8` only on arrows.
5. Neue Haas Grotesk Display: caps 500 +0.13em, titles 600, captions white 600, 1–3 words.
6. Nothing covers a face: cards go in the face-free band from the face track.
7. Show the thing: the literal subject of the line (his product, the real instrument, her own feature).
8. A visual every ~5 s; one card at a time, handed over in sequence.
9. Hook within 1.5 s; end on a complete sentence, then the end card.
10. Face markup is a surgeon's: entry x's, paths, the measured change, locked to the face.

## 2. Motion numbers
- **Springs only** (`brand/kit/tokens.json motion.spring`, `src/fast/spring.ts`). All are closed-form: stiffness / damping / mass, then first reach / settled / overshoot.
  - `settle` 76 / 15 / 1 → 14 f / 14 f / 0.5 %. Card, label and row entrances.
  - `snap` 176 / 19 / 1 → 7 f / 13 f / 4.0 %. Pops, chips, value tags and every exit.
  - `float` 14 / 7.5 / 1 → 48 f / 48 f / 0 %. Drift, breathing, parallax, secondary type.
  - `heavy` 74 / 25.5 / 3 → 23 f / 32 f / 0.55 %. Plates, full-frame titles, cut-outs, morphs.
- **Text** holds fully lit ≥ 60 f (2.5 s). Objects hold ≥ 48 f (2 s).
- **Reveals** start on the key word's onset + 1 f. A long build may start early but lands on the word.
- **Sound** lands on the spring's first reach of its target (`sfxAtSettle`), not its release. Hero sounds at 0.32, the rest at 0.16. Master −14 LUFS, ≤ −1 dBTP.
- **Audio-driven motion** sets a spring's target (`useAudioSpring`), never a size or position directly.
- **Cuts** happen only at sentence ends, mid-gap in a silence ≥ 80 ms (noise floor + 8 dB), keeping ≥ 25 ms of the gap on the speech side.
- **Dead frames:** no graphic holds still for more than 12 f. The fix is `drift()` on `float`. Captions, and slots marked `hold`, are exempt.

## 3. Banned
- CSS transitions and keyframes, stock easings, bezier curves, hand-made ease functions, linear ramps on the frame, and raw sine breathing. Lint: `tools/motion_lint.py`.
- Strike-through text. Blue highlights, tints or zone fills. Green. Off-palette colour. Flat filled boxes behind text. Dot-and-line callouts. Lint: `tools/banned_lint.py`, which includes `lint_compositions.py`.
- Blurred copies of footage as a fill. Play/pause marks, cursors and sliders. Glossy glass letters. Overshoot that wasn't made by a spring.
- AI-generated or AI-upscaled instruments, products, results or faces. Never use Higgsfield. Krea needs Naim's approval. Patient footage never goes to any AI or online service.
- A graphic on the first passing mention of a thing (show it where he explains it).
- A graphic from another topic. Invented numbers. Patient names (use codes only).
- Editing a delivered composition (make a new comp id), overwriting a render, or deleting files (rename instead).

## 4. Components (`brand/remotion/src/fast/`)
- `spring.ts`: `sp`, `life`, `chase`/`to`, `drift`, `firstReach`, `settled`. The four named springs.
- `audio.ts`: `sfxAtSettle(start, spring)` and `useAudioSpring(values, spring)`.
- `GlassCard`: argument beat, caps + title (+ line), breathing on `float`.
- `TitleCard`: the title in the face-free band, typed on by a spring.
- `ObjectCut`: a real cut-out with a shadow and a label, ≥ 2 s.
- `TermWindow`: a named term's example, the footage punched in a glass window.
- `Captions`: phrases cut on at the onset; scale on `snap`.
- `EndCard`: the call to action over the tail.
- `Sfx`: a sound at the timeline's frame.
- `FastReel.tsx`: draws `public/fast/<reel>/timeline.json`. Pass `gfx` = graphics only (dead-frame preview).
- Presets in `brand/remotion/presets/`: procedure-explainer, myth-buster, product-talk, patient-walkthrough.
- Missing pieces go to `research/ostad/WISHLIST.md`. Use the closest component meanwhile.

## 5. The 15 lessons that matter most
1. Map the argument first: a setup never leaves its "but", and a trim never changes a claim (L2, U4).
2. Contrast labels stay true for the whole reel: "Not first, here", not "Not used" (L3).
3. A result claim maps to a measurement or to his own words (L4).
4. Cut only in measured silence; word times are off by up to 0.25 s (L7, U1).
5. Remove a name by cutting the whole phrase (U2).
6. Hook on information and picture, not chronology (U3, L8).
7. A named condition gets her own feature as the example (L6); a named object gets its real cut-out for ≥ 2 s.
8. Two approaches compared are shown side by side (U5).
9. A before/after is "an example of his approach", never her diagnosis.
10. No text over any face, measured on the render.
11. Anatomy is traced from the 3D model and checked by Dr. Ostad; the current drawings read "AI-looking" (L11, U8).
12. Section titles hold fully lit ≥ 60 f (L9).
13. Remotion first; AI never for a result, a face or a product (L10).
14. The camera-roll look is sacred: the orange "filter" was Remotion's tone map, and the flat look was SDR tags on HLG.
15. Measure a complaint on the render before fixing it.

## 6. Every reel
1. Fresh session: read this page, run `tools/make-reel <clip> <preset>`, stop at the Studio link. No render.
2. The script runs every check: motion lint, dead frames, SFX on settle, banned lint, cuts on sentence ends, comprehension, audio levels, faces clear, hold-min.
3. Only if one flags: stills of the flagged moments, grade 1–10 against GOLDEN, fix anything under 8, at most 2 rounds.
4. Naim's one batch of notes from Studio becomes `timeline.json` edits, in one pass.
5. After approval, render once in the background and say when it's ready. The next reel doesn't wait.
6. Missing graphics go to `WISHLIST.md`; use the closest component.
7. Spending: library first; for paid generation, state the cost and reason, one attempt, then show it. Cap $5 a reel without Naim's OK. Log it in `COSTS.md` and give the day's total.
8. After approval: ≤ 3 lines in LESSONS.md, the reel into GOLDEN, timings into SCORECARD.md.

New components, studies, anatomy renders and playbook rewrites belong to the weekly system session only.
