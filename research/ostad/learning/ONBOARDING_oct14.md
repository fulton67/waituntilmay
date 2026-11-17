# Onboarding: the Oct 14 injection reel (2026-11-17)

Written before any build work. Each point cites its source. **DEC** = `research/ostad/style/DECISIONS.md`, **MOT** = `research/ostad/style/MOTION.md`, **DL** = `research/ostad/style/DEVICE_LIBRARY.md`, **MR** = `brand/motion/RULES.md`, **TOK** = `brand/kit/tokens.json`, **DDOS** / **G1–G4** = `research/ostad/style/read/ig_Ddos1QZRGmV.md` / `evident_yt_group1..4.md`, **UE** = the under-eye reel (`research/ostad/style/undereye/BEATS.md`, `brand/remotion/src/undereye/`). **NOT FOR POSTING until patient consent = yes.**

## Missing from the reading list

I checked the worktree and every branch's history (`git log --all -- '*<name>'`); `research/ostad/learning/ONBOARDING.md` (the other agent's map) reached the same result. These files don't exist:

- `learning/LESSONS.md`, `learning/CRITIQUES.md`. `SCORECARD.md` and `GOLDEN/` now exist. GOLDEN holds a single post grid (`posts/demo-grid`) and no reel, so "the 3 newest folders" means just that one.
- `style/RULES.md` (I read `brand/motion/RULES.md` instead), `brand/DESIGN.md`, `graphics/GRAPHICS-BIBLE.md`.
- `DESIGN_PER_BEAT.md`, `LEARNING_LOOP.md`, `EXOMIND_REDO.md` in the repo root. I follow them through what cites them: `tools/variety_check.py` (DESIGN_PER_BEAT §3), DL §A (EXOMIND_REDO §3 bans the dot-and-line) and the beat-sheet format of `exomind/BEATS.md` and UE. For LEARNING_LOOP I add a SCORECARD row before and after.
- `.claude/skills/ostad-video/SKILL.md`. There is no `.claude/skills/` folder.

## Rules I'll follow

| # | Rule | Source |
|---|---|---|
| 1 | 9:16 at 1080×1920, 24 fps. Margin 98, top safe 250, caption top 1594. NHG Display: 600 for headlines, 500 for captions and caps labels | MR table; MOT §5.3; TOK `typography.9x16`, `video.fps`; DEC 14d rule 7 |
| 2 | Captions go word by word, each cut on at its measured onset, with no fade, box or stroke | DEC 14d rule 8; DEC 14c |
| 3 | Every reveal starts at word onset +1 f. A long build may start early but must land on the word | DEC 14d rule 9; MOT §3; DDOS §1.2 |
| 4 | Motion tokens only (`arrive` 14 f, `sweep`, `plate` 18+18, `morph` 26, `exit` 7). No spring, no overshoot | MOT §2, §1.4; `library/motion.ts` |
| 5 | Hard cuts. At most one card↔full morph or chapter blank. No crossfades inside a section | MOT §4; DDOS R17 |
| 6 | One accent: ice `#cfe9f7` and highlighter `#c4e4f8` over brand blue `#37a9e8`. Never green | MOT §1.6; DEC 14d rule 4; G4 A6 |
| 7 | Before/after is two labelled cards or a labelled split. Never a slider, never UI chrome | DEC 14d rule 1; G1 R27; MOT §6 |
| 8 | No dot-and-line. Arrows have heads, draw tail→tip, the head lands last with no overshoot, and the hold breathes ≤ 1.5 px. `lint_compositions.py` must pass | DL §A; DEC 14i, 14k; `devices/Arrow.tsx` |
| 9 | Markup goes on the treated area and condition footage, never on his face. No drawn anatomy | MOT §1.7; DEC 9, 14d rule 6; G1 R23 |
| 10 | Clinical images enter plate-then-picture. A footage window has radius 2 % W. Annotation shape follows the claim (numbered boxes for counts, a loupe for detail) | MOT §3, §5.1; G4 A4, T2, T5 |
| 11 | Numbers are cited or absent: only figures he says | DEC 14d rule 10 |
| 12 | His pace is kept. Cut only dead air, false starts and the patient's name. Uniform speed-up ≤ 1.15× | DEC 13b, 14 |
| 13 | A new visual every ≤ 5 s, a step every 2–4 s inside a held scene | DEC 12; MOT §1.3 |
| 14 | One SFX per hero reveal. Voice ≥ 8 LU over any bed. −14 LUFS | MOT §6; DEC 14f Verify |
| 15 | Variety (variety_check, profile `injectable`): no device on > 2 beats, no entry on consecutive beats, text-only ≤ 20 %, ≥ 3 never-built devices, consent or `not_for_posting`, no brand without evidence, "results vary" on results | `tools/variety_check.py`; UE `beats.json` |
| 16 | Measure, don't assume: decoded-frame offsets, re-transcription, loudness, flash scan, static-image diff | DEC 14c, 14f, 14i |

## Lessons that apply (from client notes logged in DEC, since there is no LESSONS.md)

- Pop-ups and glossy glass read as "cheap". Calm frosted glass with a hairline is the signature (DEC 11, 12). So the injection PiP is a calm window that grows out of its point, not a bouncy pop.
- Graphics unrelated to his words read as random widgets. Each beat shows the noun he is saying (DEC 14f; `exomind/BEATS.md` §0.2).
- Clipped words and rushed cuts were the main complaint (DEC 13b, 14). 185 wpm was fine, 219 was not.
- Don't cover faces. Give graphics the empty third or the chest band (DEC 12, 14). Here the PiP must not cover the point it is anchored to.
- "Before" and "after" must be the *same* treatment and honest pairs (DEC 9). Spots are measured, not hand-placed (DEC 9 `redness_spots.py`). The arrows follow that rule.

## Devices that exist (`brand/remotion/src`)

| Committed and usable | What |
|---|---|
| `devices/Arrow.tsx` (committed in f394227; local edits add only `shadow`) | 9 headed arrow variants. `PtSrc` points can follow a track |
| `devices/TypeEntry.tsx` | 14 §T entries |
| `library/motion.ts`, `Highlighter.tsx`, `RollingLabel.tsx` | tokens, highlighter/karaoke, rolling label |
| `components/Ro.tsx` `card()` / `Sfx`, `NameCard`, `EndCard` | calm glass, sounds, name super, end card |
| `undereye/*` (other agent; read only, not imported) | the latest 9:16 injectable pattern: own entry point, `Footage` proxy switch, `bare` measuring pass, name redaction |
| `exo6/*` (16:9, uncommitted edits) | `ZoomBoxInset`, `SplitLabelled`, `PortraitPipCircle`: references only. I don't import uncommitted work |

DL's relevant ids are `zoom-box-inset` (never built), `windowed-footage`, `split-labelled` (partial), `annotation-box-footage` (partial), `loupe-zoom`, `stepped-punch-in`, `arrow-curved-callout`, `arrow-straight-pointer` and `held-photo-card` ("before/after only with consent").

## Open critiques (collected from DEC Open lists)

- Patient consent is unconfirmed for every patient image so far (DEC 9, 14f Open; UE). **Here too: consent unknown.**
- Helvetica Neue isn't in the kit, so reels stay on NHG Display (DEC 14c, 14f).
- The 9:16 right-rail safe size is unmeasured (MOT §5.3). I'll keep text inside 98 px and measure it.
- No CRITIQUES.md exists, so the reel's own client critique starts its SCORECARD row.

## Clinic constraints (override everything)

- No patient name anywhere. It is cut from the audio and redacted on read. On screen she is "our patient".
- The render filename, DEC and the report say **NOT FOR POSTING until patient consent = yes**.
- Media, frames and renders are gitignored under `brand/edits/oct14-injection/` and `brand/remotion/public/oct14/`.
- No injectable brand unless a label is readable or he says it.
- `C:\Users\naimj\clinic-library` is read-only except `tmp\oct14\`.
