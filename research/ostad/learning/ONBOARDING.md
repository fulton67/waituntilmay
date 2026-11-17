# Onboarding: what I read, and what I'll follow (2026-11-17, under-eye filler reel)

Written before any build work. Each point cites the file it comes from. Abbreviations: **DEC** = `research/ostad/style/DECISIONS.md`, **MOT** = `research/ostad/style/MOTION.md`, **DL** = `research/ostad/style/DEVICE_LIBRARY.md`, **G1–G4** = `research/ostad/style/read/evident_yt_group1..4.md`, **DDOS** = `research/ostad/style/read/ig_Ddos1QZRGmV.md`, **MR** = `brand/motion/RULES.md`, **TOK** = `brand/kit/tokens.json`.

## Missing from the reading list

I searched the worktree, every branch's history (`git log --all -- '*<name>'`) and `C:\Users\naimj` (depth 7). None of these exist anywhere:

- `research/ostad/learning/LESSONS.md`, `CRITIQUES.md`, `SCORECARD.md` and `GOLDEN/` (the folder `learning/` did not exist; this file creates it)
- `research/ostad/style/RULES.md` (the only `RULES.md` is `brand/motion/RULES.md`, read instead)
- `brand/DESIGN.md`
- `research/ostad/graphics/GRAPHICS-BIBLE.md` (optional in the brief)
- `DESIGN_PER_BEAT.md`, `LEARNING_LOOP.md`, `EXOMIND_REDO.md` (repo root). They are cited by DL, DEC 14h–14i and `tools/variety_check.py`; I follow them through those citations: beat sheet with a literal visual per line (`exomind/BEATS.md` is the worked example), the §3 variety rules as coded in `tools/variety_check.py`, and EXOMIND_REDO §3's ban on the dot-and-line (DL §A).
- `.claude/skills/ostad-video/SKILL.md` (no `.claude/skills/` folder; only `.claude/commands/post.md`)

Read in full: MOT, DL, DEC (1–14i), DDOS, G1–G4, MR, TOK, plus `exomind/BEATS.md` §0 and `tools/variety_check.py` for the beat-sheet format.

## Rules I'll follow

| # | Rule | Source |
|---|---|---|
| 1 | Reels: 1080×1920, 24 fps; caption top at 83 % H (1594); side margin 98 px; top safe 250 px; NHG Display system (600 headline / 500 caption + caps label) | MR table; MOT §5.3; TOK `typography.9x16`; DEC 14d rule 7 |
| 2 | Captions word by word, each word cut on at its measured onset; no fade, rise, shadow or box | DEC 14d rule 8; DEC 14c (decoded-frame check) |
| 3 | Every graphic lands on the word: pop / label / highlight at onset **+1 f**; a long build may start early but must land on the word | DEC 14d rule 9; MOT §3; DDOS §1.2 |
| 4 | Motion tokens only: `cut`, `arrive` 14 f, `sweep` (highlighter 16 f, trace 27 f), `plate` 18+18 f, `swap` 16 f, `exit` 7 f; no spring, no overshoot, no `easeOutBack` | MOT §2, §1.4; `library/motion.ts` |
| 5 | Hard cuts by default; no crossfades inside a section; at most the brand-shape wipe, the card↔full morph and the chapter blank | MOT §4; DDOS R17 |
| 6 | One accent per piece: ice blue `#cfe9f7` / highlighter `#c4e4f8` over slate and brand blue `#37a9e8`; never green | MOT §1.6; DEC 14d rule 4; G4 A6 |
| 7 | No UI widgets (play/pause, cursors, sliders, step players); before/after is two labelled cards or a labelled split | DEC 14d rule 1; DDOS R1; G1 R27 |
| 8 | No dot-and-line callouts; arrows are headed, drawn tail→tip, head lands last, no overshoot; lint must pass | DL §A; DEC 14i (`tools/lint_compositions.py`) |
| 9 | Markup goes on the treatment footage and condition images, never on his face; no drawn anatomy | MOT §1.7; DEC 9, 14d rule 6 |
| 10 | Numbers are cited or absent; the only figures on screen are ones he says (here: "a year to a year and a half", "one syringe", "two weeks") | DEC 14d rule 10; MOT §6 |
| 11 | A new visual every ≤ 5 s, an in-scene step every 2–4 s; build in place before cutting | DEC 12; MOT §1.3; G1 R4 |
| 12 | His pace is kept: cut false starts, dead air and asides only; a uniform 1.1–1.2× after the edit; never cut inside his natural pauses | DEC 14 ("what went wrong was the cutting"); DEC 13b |
| 13 | A second voice (the patient) gets italic captions | DDOS R14; G4 A7 |
| 14 | One SFX per hero reveal at most; voice ≥ 8 LU over any bed; −14 LUFS mix | MOT §6; DEC 14f verify |
| 15 | Clinical images enter plate-then-picture, never pop from empty | MOT §3; DEC 14f s12 |
| 16 | Media stays local and gitignored; consent is required before posting any patient image | DEC 4, 9, 14f "Open" |
| 17 | Variety: no device on > 2 beats, no entry on two beats in a row, text-only ≤ 20 % and ≤ 1 in 5, ≥ 3 never-built devices, ≥ 6 devices per 60 s | `tools/variety_check.py` (DESIGN_PER_BEAT §3) |
| 18 | Verify by measurement: re-transcribe the render, decoded-frame caption offsets, loudness, flash scan, static-image frame diff, reuse check | DEC 14c, 14f "Verify", 14i |

## Lessons that apply (from the client notes logged in DEC)

- Glossy glass letters, glints and pop-ups read as **cheap**; calm frosted glass with a hairline is the signature (DEC 11, 12).
- Graphics that have nothing to do with his words read as **random widgets**; every graphic must be bespoke to the line (DEC 14f).
- Words in place of the thing are weak: show the **noun** doing what he says (`exomind/BEATS.md` §0.2).
- One 2 s fade for everything was the wrong move; word-tied entries ≤ 17 f (`exomind/BEATS.md` §0.1; DL §T).
- Cuts that clip his words or speed him up read as rushed (219 wpm was too fast; 185 wpm was fine) (DEC 13b, 14).
- Don't cover his face; give the graphic the empty third or the chest band (DEC 12, 14).
- Labels must never truncate, and no frame should look empty mid-animation (DEC 14c).
- Drawn heads and anatomy were rejected three times: use the real footage (DEC 14c, 14d rule 6).
- Measure, don't assume: fonts (DEC 14b), caption lag (DEC 14c), flashes (DEC 13c).

## Devices that exist (`brand/remotion/src`)

| Committed (safe to import) | What |
|---|---|
| `library/motion.ts` | the MOT tokens, `onset()`, `prog()`, `arriveStyle()` |
| `library/Highlighter.tsx` | L01 sweep / L02 karaoke (`type-highlight-sweep`, `type-ghost-to-lit`) |
| `library/RollingLabel.tsx` | L05 masked roll (`type-rolling-swap`) |
| `library/TraceOnFootage.tsx` | L03 trace / L07 dim-the-rest on footage (16:9 sized) |
| `components/YT.tsx`, `Ro.tsx`, `Captions.tsx`, `SkinCard.tsx`, `NameCard.tsx`, `EndCard.tsx`, `Hook.tsx`, `Exo.tsx`, `Explainers.tsx` | the YouTube line system, calm Ro cards, reel captions, condition card, name super, end card, title; Exomind and rosacea explainers |
| `devices/track.ts`, `devices/Markup.tsx` | head track helpers; the older markup (its `Pin`/`Ring` fail the lint) |
| `OstadReel`, `OstadWide`, `OstadYT`, `OstadYT5`, `Storyboard`, `IdeaStills`, `LibraryProof`, `YTSystem`, `MarkupDemo` | compositions registered in `Root.tsx` |

**In progress, untracked** (another agent, 2026-11-17 10:28–10:53): `devices/Arrow.tsx` (9 headed variants), `devices/TypeEntry.tsx` (14 §T entries), `devices/ArrowTypeLab.tsx` and `exo6/*` (24 components: SectionCard, PhoneMessage, IntakeFormFill, TimelineMarkers, DonutRingFill, ZoomBoxInset, WindowedFootage, PortraitPipCircle, …). I import from them only once they are committed, so nothing I push depends on uncommitted files.

DL counts 79 device ids: 13 built, 33 partial, 33 never.

## Open critiques (no CRITIQUES.md; collected from DEC "Open" lists and BEATS §0)

- Patient consent unconfirmed for every patient image used so far (DEC 9, 14f Open). **This reel has the same problem: consent = unknown.**
- Helvetica Neue LT Pro is not in kit vzz0hgt; long-form still renders NHG Display 500 (DEC 14c, 14f Open).
- v4.1 weaknesses: one entry for everything, words instead of things, dot-and-line pointers, no immersion (`exomind/BEATS.md` §0).
- The Flora coil clip's green curtain; BTL clips need sign-off (DEC 14f Open) (not used here).
- The 9:16 right-rail safe size is unmeasured (MOT §5.3): verify on this reel.

## Clinic constraints for this piece (from the brief; they override the above)

No patient name anywhere (audio cut or muted; "our patient" on screen); consent unknown, so every output is marked **NOT FOR POSTING until patient consent = yes**; patient media, frames and renders stay gitignored under `brand/edits/undereye-filler/`; no filler brand unless a label is readable or it is said clearly.
