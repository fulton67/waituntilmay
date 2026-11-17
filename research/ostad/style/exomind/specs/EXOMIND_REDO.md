# EXOMIND — redo it the way the rosacea edit was done

Unattended. Same rules as every Ostad run: never ask, log to `research/ostad/style/DECISIONS.md`, push to main after each measured step, verify by measurement.

The current ExoMind edit looks fine but it's generic. Naim's feedback, in his words:

- "I don't like the arrow… just the circle and the line. It feels very cheap."
- "No title card. Even when there is one, the images never feel immersive."
- "You don't track head motion. You're not using any of the things we established."
- "Use the brand bible… for how you created the rosacea, but for a different topic. The rosacea style of edits, the details, the innovation."
- "You created animations about the gut microbiome." That was a unique visual made for that one topic, showing exactly what mattered at that moment. ExoMind has nothing like it.

So: don't patch the current edit. Rebuild it with the rosacea method, using ExoMind's own content.

## 1. Read before touching anything

1. **The rosacea method.** Find the markdown that documents how the rosacea edit was built: grep `research/ostad/style/`, `brand/` and `.claude/skills/` for "rosacea". Read it in full.
2. **The rosacea Remotion source.** Read every composition and device it uses.
3. **The final rosacea render.** Open it and look at it frame by frame, using the contact-sheet tool, one sheet per 2 s.
4. **The rule book and design files:** `style/RULES.md`, `brand/DESIGN.md`, `brand/kit/tokens.json`, and `research/ostad/graphics/GRAPHICS-BIBLE.md` if it exists.
5. **The ExoMind research:**
   - the ExoMind topic file under `style/research/` (its corrected claims and its "don't say on camera" list)
   - the ExoMind gold pick: `k4lEDTVCb0U`, the BTL "What is EXOMIND? How does it work?" video at 56 s
   - its `graphics/read/` file and its shot spec, if the Gold Build ran
6. **Ostad's ExoMind footage** and its transcript.

## 2. Write the translation table first

Write `style/exomind/TRANSLATION.md` before building anything. It has one row for every device, detail and technique the rosacea edit uses: title card, section cards, the gut-microbiome animation, image treatments, transitions, captions, SFX, colour, pacing, and anything else you find. Each row gives:
- what the device did in rosacea, with the frame numbers
- why it worked
- the ExoMind version of it

**Topic-specific animations.** Like the gut microbiome for rosacea, design **at least 3 animations that exist only for ExoMind**. Each one must show the single thing that matters at that beat of what Ostad is saying, taken from the research and the transcript. Candidates include:
- the coil's magnetic field passing through the skull
- the targeted brain region lighting up
- neurons firing in rhythm as the pulses repeat
- the session timeline

Pick by what he actually says. Use only claims that are cleared in the topic file's corrected lines, and mark anything clinical ⚠ physician-check.

Every row must name the timestamp in Ostad's ExoMind clip where the device goes.

## 3. The fixes that must be in the new edit

### Arrows: kill the dot-and-line
The circle-dot-plus-straight-line callout is banned everywhere.
- Add a lint rule that fails any composition that uses it.
- Replace it with a designed arrow system in `brand/video/src/devices/Arrow.tsx`:
  - curved or angled tapered strokes, with arrowheads drawn from the brand shape vocabulary
  - stroke weight and colour from `tokens.json`

**The arrows are never static:**
- **Draw on.** The stroke grows from tail to tip using the measured easing from RULES.md. The head lands with a small overshoot and settles; record frames-to-settle.
- **Stay alive.** While held, the arrow keeps a slight breathe or drift. The tip follows its target as the head moves (see head tracking below).
- **Exit animated.** The arrow retracts or fades along its path. It never cuts.

Build 3–4 arrow variants (curved callout, straight pointer, bracket-pointer, path arrow that traces a route). Render a contact sheet of all of them and compare it against the arrows in the reference creators' footage before you use them.

### Title cards
- An opening title card, plus section cards at the turn points of the script.
- Use the type system and the rosacea title-card treatment, animated in and out with the measured reveals.
- No section of the video starts without one.

### Images must feel immersive, not pasted on
The default is no longer a flat rectangle floating over the talking head. Per beat, choose and log one of:
- **full-bleed takeover**: the image fills the frame and Ostad drops to a corner, or out
- **split screen**
- **depth push**: a 2.5D parallax from a depth map, with layers moving at different rates
- **camera move**: the measured push or drift from RULES.md, never a still image held still
- **masked card**: only when a card is right, using the measured doctor.grove corner radius and shadow, and still moving

Every image moves for its whole time on screen.

### Head tracking
Run MediaPipe Face Mesh on every frame of Ostad's clip and smooth the result with a One Euro filter. Export `style/exomind/track.json` with per-frame head pose and landmarks. Use it so that:
- arrows that point at the face keep their tip on the landmark as he moves
- labels and markup anchored to his face move with it
- every overlay avoids his face in every frame, using a dynamic safe area from the face box, not a fixed one

**Verify:** the tip-to-landmark error has a median under 6 px and a 95th percentile under 15 px at 1080×1920. Overlap between overlays and the face box is 0 frames, unless the overlap is intended and logged.

### Use what we established
Write `style/exomind/USAGE_AUDIT.md`: a table of every established device and tool, and where each one appears in the ExoMind edit, by timestamp, or why it doesn't. The list:
- the rule book's camera, easing and pacing numbers
- the captions composition with word timings
- the lower third
- the glass chip
- the contrast pairs
- SFX at graphic entries, aligned per M19
- the LUT
- the condition-image or bank treatment
- the markup overlay
- the GLP-1-style pop-up device
- the phone mockup, if relevant
- the gold-pick shot for EXOMIND

An empty "where" cell needs a real reason.

## 4. Build, check, compare

1. **Stills first.** Render the key frame of every beat and every ExoMind-specific animation as a PNG. Check each one:
   - the face is clear
   - the arrow tips sit on their targets
   - nothing is static that should move
   - colours are within the tokens
2. **Then the video**, at 9:16.
3. **Gap check with five measuring agents.** Each owns its own report file under `style/exomind/gap/`:
   - graphics and arrows
   - motion and easing
   - tracking accuracy
   - immersion and layout (image fill share, time on screen moving, takeover count)
   - audio

   Each puts the ExoMind frames next to the rosacea frames at the same beat type and next to the references, and measures the gap in numbers. One builder fixes; then re-measure. Run up to 2 rounds.
4. **Publish.** Put the ExoMind edit on `/brand/ostad` next to the rosacea edit.

## 5. Make sure it can't regress

- Add the arrow system, the title-card rule, the immersion rule and the head-tracking rule to `RULES.md` and to the `ostad-video` skill, each with its numbers.
- Add the dot-and-line lint and a "no static image" check, which fails if any image layer has zero transform change across its life.
- Future topics then get all of this by default.

## Finish

`style/exomind/TODO.md` ends with:
- the translation table's row count, and the ExoMind-specific animations built, each with a one-line description
- the arrow variants
- tracking error (median and p95)
- face-overlap frames
- the usage-audit table
- gap numbers before and after
- the render URL
- the ⚠ claims list for Ostad to check
- anything decided alone
