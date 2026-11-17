---
name: ostad-video
description: Build, fix or review a Dr. Ariel Ostad video edit (YouTube or reel, Remotion). Use for a new topic edit, a gap round on an existing one, or Naim's review notes on an Ostad video.
---

# Ostad video

The bar is YouTube v6 of "Exomind and total skin health" (`brand/remotion/src/OstadYT6.tsx`). Every new edit beats it by a stated measure.

## Steps

1. **Read the system.** `research/ostad/style/V6_SYSTEM.md` in its order: the specs, the device library, the ExoMind worked example, the code, the checks. Then `brand/motion/RULES.md` (the hand-written "Ostad video rules" block). Done when you can name the device, the subject and the layout family you would use for any line of the script.
2. **Design per beat** (`research/ostad/style/exomind/specs/DESIGN_PER_BEAT.md`). Write `beats.json` + `BEATS.md` before code: per beat the noun, 3 concepts, the pick, what it does better than our closest earlier graphic (a number where possible), the device, entry, layout, image subject and word-timed events. Top of BEATS.md: the 3 weakest things about the previous edit and the fix for each. Done when `variety_check.py` passes on the JSON alone.
3. **Source real material.** The literal subject of each line: his products, his rooms, his patients, his device, from `C:\Users\naimj\clinic-library` (read `HANDOFF.md` first; read-only, local previews and frames, iCloud untouched, codes only, nothing SENSITIVE or needs_review). Copy into the gitignored `brand/remotion/public/<edit>/clinic/` and run `git check-ignore -v`. Every patient, staff and manufacturer item goes on the client-approval list.
4. **Build** new files (never edit a delivered composition). Reuse the method and the components in `brand/remotion/src/devices/` and `exo6/`; make every graphic new for this topic, with at least 3 animations that exist only for it.
5. **Render** with `npx remotion render <Comp> "<out>.mp4" --props=<props> --log=error --concurrency=6 --crf=16` from `brand/remotion`. Before re-rendering a delivered file, copy it to a "(… roundN).mp4" name; delete nothing.
6. **Check** (below). A failing check is a redesign, not a note. Done when every check passes or is a logged, accepted exception listed for Naim.
7. **Log** a numbered `research/ostad/style/DECISIONS.md` entry with before → after numbers; write the lessons into `RULES.md` and this skill; commit per change group; push.

## The rules (numbers in RULES.md)

- **Show the thing.** Every image is the literal subject of its line. A ring or arrow lands on something meaningful. Kinetic text on at most 1 beat in 5.
- **Subjects.** One image subject on at most 2 beats. No graphic from another topic, ever: reuse the method, never the graphic.
- **Arrows.** One system: brand blue `#37a9e8`, tapered 2 → 8 px stroke, one barb head, draw-on 7 f, alive while held, retract on exit. Never across text.
- **Cards.** A title card, a section card at every turn, an end card. A section title is fully lit for at least 60 f (hold-min 2.5 s). Verify with a still at the hold midpoint.
- **Immersion.** Mean image fill ≥ 35 %, ≥ 3 full-frame takeovers per minute, no layout family for more than 3 segments or 15 s. Pictures move for their whole life. Footage beside him sits in a clean rounded window or fills the frame; side-fill is the cream room, never a blurred copy.
- **Presenter.** Keyed on the cream room, left, one placement. Any straight source-frame edge is feathered (pip left edge, keyed right edge). The pip is a true circle with his face centred from the head track.
- **Tracking.** Anchor face-following tails on `templeR + (40, -6)`; error on rendered pixels median < 6, p95 < 15, max ≤ 15 px.
- **Compliance.** ExoMind is FDA-cleared only for MDD; no skin claim; "Exomind does not directly treat skin conditions" where skin and ExoMind meet; BTL imagery carries "Conceptual depiction. Results may vary."; clinical lines are ⚠ physician-check. Dates match the real event.
- **Sound.** One sound per event class (`beats.json sfx_map`), SFX on ≥ 72 % of entries, hero 0.32 / rest 0.16, −14 LUFS, ≤ −1 dBTP.

## Checks (style venv, `python -I`, tools in `research/ostad/style/tools/`)

| Check | Pass |
|---|---|
| `variety_check.py <beats.json>` | R1–R14 |
| `reuse_check.py <keyframes> --beats <beats.json>` | nearest earlier edit > 0.107 |
| `lint_compositions.py` and `--static-image` on the render | 0 violations |
| `arrow_text_lint.py` (TextAudit `ARROWTEXT` lines) | 0 crossings |
| `edge_check.py --ramp <px>` | 0 keyed frames with a straight source edge ≥ 12 px |
| `exomind/gap/tracking_tools/gap_track.py`, `gap_pip.py` (`-X utf8`, on the render; `track_verify.py` / `pip_verify.py` assume the pre-gap layout) | tracking bounds above; pip offset < 4 % of the diameter |
| ffmpeg `scdet=threshold=8` (relative paths) | every cut is an intended one |
| ffmpeg `ebur128=peak=true` | −14 LUFS, ≤ −1 dBTP |
| stills sheet of every beat + section-card hold midpoints | every title whole, no mark clipped by a frame edge |

## Lessons (gap rounds 1–2, DECISIONS 14o–14p)

- Measure the stills sheet's complaints on the render itself: a "clipped" title was a 10 f hold caught mid-type; a "clipped" mark was a sheet label over the frame.
- A licensed film's own marks (logo, emblem, burned-in subtitles) are either fully in or fully out of the frame; crop the band, never cut through a mark.
- A diptych needs two different subjects, not two moments of one clip.
- Footage an earlier edit showed full frame needs a new crop or role, or reuse_check fails.
- The hold-min applies to every text, including labels on a chart that follows a long section card: move the exit into the next beat rather than shorten the hold.
