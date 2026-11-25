---
name: ostad-video
description: Build, fix or review a Dr. Ariel Ostad video edit (YouTube or reel, Remotion). Use for a new topic edit, a gap round on an existing one, Naim's review notes on an Ostad video, or any reel rebuild (Jan 08 filler fatigue, Oct 14 injections, under-eye filler).
---

# Ostad video

**NEW REELS: the FAST LANE (2026-11-25) replaces the per-reel process below.** One fresh session per reel:
1. Read `research/ostad/PLAYBOOK.md` (2 pages), and nothing else, unless a specific question needs it.
2. Run `bash tools/make-reel <clip> <preset>`. The presets are procedure-explainer, myth-buster, product-talk and patient-walkthrough.
3. Stop at the Remotion Studio link. Don't render.
4. Self-grade only what the checks flag.
5. Apply Naim's notes as `public/fast/<reel>/timeline.json` edits in one pass.
6. Render once after approval.
7. Missing graphics go to `research/ostad/WISHLIST.md`. Paid generation: $5 cap per reel, logged in `research/ostad/COSTS.md`.

The sections below still apply to the three delivered reels (rebuilds, HDR masters) and to YouTube edits.

**Read "Standing rules" and "Reels: how we make them now" first. They are Naim's latest rulings and override anything older below or in the repo.**

## Standing rules (Naim, every Ostad video)

1. **Footage is raw, as in the camera roll.**
   - Never grade, tone-map, brighten, change opacity or "fix" colour.
   - Build from the 10-bit HLG camera-roll originals (`reel.py --hdr`), never from 8-bit transcodes.
   - In Remotion, every OffthreadVideo gets `toneMapped={false}`.
2. **No text, card, plate or label ever covers a face** (his or a patient's), in any frame.
   - Titles go behind people (person key over the type) or into face-free space.
   - Measure it with face_clear.
3. **Face markup is technical**, like a surgeon marking a face:
   - entry x's, cannula paths, product and amount, the measured before → after;
   - locked to the face (median < 6, p95 and max ≤ 15 px) or put on a still;
   - no decorative circles. The Jan 08 landmark plan is the accepted "happy medium".
4. **Graphics explain what words can't.**
   - Sourced and hyper-specific; no decoration and no generic devices.
   - No graphic on the first passing mention of a thing; show it where he explains it.
   - No strike-through text.
   - A before/after example is labelled as "an example of his approach", never implying the patient has the condition.
5. **Timing.**
   - Every pop-up or example holds at least 2 s.
   - The reel ends on a completed sentence, cut inside its pause.
   - No picture freezes: a key or clip must never run past its source (frozen_picture check).
6. **Real objects.**
   - A named instrument or product becomes a real cut-out floating beside him: background removed, soft shadow, short label, clear of faces.
   - It holds at least 2 s, and pairs are compared side by side at the same scale with tip loupes.
   - Sources, in order: his iCloud/footage, then manufacturer images where licensed (credit them), then SHOT_REQUESTS.md.
   - Never AI-generated or AI-upscaled instruments. If no photo exists, use a neutral "photo to come" ghost, never red placeholder text.
7. **Anatomy drawings: brand palette only.** Ink #1d2230, warm grey #a2978d, one sand accent #bf8662, deep #8b5b3d (`brand/scripts/flora_frames.py`); no pastel textbook colours.
   - Animation must be smooth: use in-betweens, no stepping.
   - Flora models: Seedance 2.5 for video, Nano Banana 2.1 for images. No Higgsfield. Higgsfield and Krea need approval.
   - A 3D anatomy-render style is under test (`brand/edits/flora-anatomy/style3d/STYLE3D.md`).
8. **Privacy.**
   - Patient footage never goes to Flora or any AI or online service.
   - Patient codes only, never names. All clinic photos are consented (company iCloud, contracts).
   - Dr. Ostad approves clinical drawings.
9. **Process.**
   - Never edit a delivered composition or overwrite a render: use new comp ids and new file names, and delete nothing.
   - Multi-step work is split across parallel agents that message each other; agents don't commit, the coordinator does.
   - Commit per change group and push main (`git push origin HEAD:main`).

## Reels: how we make them now

Every reel is rebuilt from its recipe and edited as a timeline. Nobody copies a `ReelVn.tsx` and patches it. Full recipe: `brand/remotion/REELS.md`.

- **Timeline:** `brand/remotion/timelines/<reel>.json` is the working file. Beats are anchored to transcript words, and `<reel>.<version>.json` is frozen per delivered version. Edit it in the lanes page: `python brand/scripts/timeline_view.py` → http://127.0.0.1:8765.
- **Build:** `python brand/scripts/reel.py <jan08|oct14|undereye> --hdr [--version vN] [--comp <CompId>] [--frames A-B]`.
  - Footage is cut from `brand/remotion/public/originals/` (mapped in `public/originals.json`) in 10-bit with no colour filter.
  - Graphics are Remotion alpha passes (the `pass` prop) converted sRGB → HLG at 75 % reference white.
  - Person keys are RVM mattes applied to the original footage.
  - Master: 10-bit HEVC tagged bt2020 / HLG, the same as the originals.
- **Checks reel.py runs (all must pass):**
  - tags equal the originals;
  - footage vs original ≤ 2 ten-bit codes;
  - graphics white 0.75 ± 0.03;
  - frozen_picture;
  - format;
  - audio unchanged.
  - Plus face_clear, tracking and -14 LUFS / ≤ -1 dBTP.
  - A failed build is never delivered next to the good files.
- **Current delivered versions:**

  | Reel | Comp | Delivered files |
  |---|---|---|
  | Jan 08 | Jan08ReelV4 | `Ostad - Filler fatigue v4b(.mp4 / HDR.mp4)` |
  | Oct 14 | Oct14ReelV6b | `Ostad - Oct 14 injections v6b(.mp4 / HDR.mp4)` |
  | Under-eye | UndereyeReelV5b | `UndereyeReel_v5b.mp4` (HDR in progress) |

- **Reel look:**
  - calm glass, a visual about every 5 s, gentle cuts, then 1.1–1.2x;
  - word-onset captions, real video over stock;
  - no blue except the Tyndall effect.
- **Delivery:** Naim judges colour on the iPhone next to the camera roll (AirDrop); Windows players show HDR flat.
- **Still open:**
  - photos of the cannula and the Evolysse Form/Smooth syringes (SHOT_REQUESTS #14–16);
  - Dr. Ostad approval of the drawings;
  - the needle photo's CC BY-SA credit in the caption.

## YouTube edits


For YouTube edits the bar is YouTube v6 of "Exomind and total skin health" (`brand/remotion/src/OstadYT6.tsx`). Every new edit beats it by a stated measure.

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
