# How we make Dr. Ostad's videos: the process so far

Updated 2026-11-16. This is the working process behind the rosacea reel, the Exomind reels (v1–v3) and the Exomind / total skin health YouTube edit (v1–v4). Each step names the files that do the work. The *why* behind each choice is in `research/ostad/style/DECISIONS.md` (sections 8–14d).

---

## 0. Standing rules (from client notes; every edit follows them)

- **Pacing:** Dr. Ostad talks slowly. Cut gently: keep his pauses and breaths, and cut only dead air, retakes and repeats. *Then* apply one uniform 1.1–1.2x speed-up (1.15x on the YouTube edit) to the finished edit. Informational videos stay linear and calm, one idea at a time, each tied to the larger point.
- **Audio:** highpass, compressor and limiter, then loudnorm to −14 LUFS. **No denoise** (the client said it "really messed it up").
- **Captions:** word by word, each one cut on at its measured audio onset. No fade, no shadow, no black outline.
- **Type:**
  - Long-form/YouTube: Helvetica Neue LT Pro 65 Medium, from the font bible. This is a current choice and may change.
  - Vertical reels: the bible's NHG system.
- **Colour:** brand-bible blues. Never green backgrounds (sage-blue is OK, leaning bluer).
- **Footage:** real video over stills and generic stock. Never leave the subject against empty sky or dead space. Lots of full-frame B-roll and animation without him. Show the product and people experiencing it.
- **Graphics:**
  - No play/pause, cursor or press UI.
  - Icons must literally mean their word.
  - Not every graphic in a box.
  - No hand-drawn skulls, heads or brains.
  - Animations must be **bespoke to the idea and non-repetitive**. Generic reusable widgets read as "random" (2026-11-16).
- **AI anatomy (Flora):**
  - One material: a glass head with only the brain inside.
  - The face reads clearly, with calm glass at the eyes.
  - Neuroplasticity is shown as neurons growing connections.
  - Render slow so the edit can play it at about 1.3x.
  - Always use the highest-quality model and settings, with no cost checks.

## 1. Intake

- The client's notes on each version are quoted into a new `DECISIONS.md` section (13, 13b, 13c, 14, 14b, 14c, 14d…), with what was measured and what changed.
- Notes that apply to every future edit become client rules: DECISIONS 14d and the reel-direction memory.
- The source video is identified by its file and given a slug, for example `exomind-skin`. Edit config goes in `brand/edits/<slug>/edit.json`.

## 2. References, studied frame by frame

- References are listed in `research/ostad/style/refs.yaml`, each with a target.
- They're downloaded with Apify (Instagram, sampled when the budget is tight) or yt-dlp (YouTube, free).
- Every frame is measured with tools M1–M21.
- Every contact sheet is read into rules.

The full method is in **`research/ostad/style/FRAME_BY_FRAME.md`**. The client's model for explainer animation is Evident's post `Ddos1QZRGmV`; its read-out is `research/ostad/style/read/ig_Ddos1QZRGmV.md`.

## 3. Transcribe and cut

| Step | Tool | Check |
|---|---|---|
| Word-timed transcript of the raw recording | `brand/scripts/video_transcribe.py` (Whisper) | language and word count |
| Choose what to keep, in raw seconds, from the transcript | `edit.json` `cut.keep` | every removal has a reason: dead air, a false start, a repeated take |
| Cut | `brand/scripts/video_cut.py` (`tail` runs each end on to the room-tone dip, `tailSkip`, `maxPause`, `xfade` for long silences) | each join sits in an audio dip; re-transcribe the cut and check every source word is there in order |
| Speed | uniform `atempo` + `setpts` after the cut | measured speed per piece from the word-start slope; words per minute before and after |
| Faces, for placement | YuNet every 0.25 s | face box range, so graphics avoid the face |
| Cut-out (only if a layout needs it) | `brand/scripts/video_matte.py` (Robust Video Matting) | hair-edge stability, stray pixels |

## 4. Visuals

**Plan the ideas.** Go through the transcript line by line and decide what each idea needs: real footage, product, patient, mechanism animation, chapter title or caption only. Use one visual idea at a time, in his order, and no two neighbouring sections should share a layout.

**Sources, in order of preference:**
1. The practice's own footage, such as Exomind sessions. Needs patient consent before posting.
2. Manufacturer footage, such as BTL's Exomind film. Needs approval; crop clear of watermarks.
3. Flora AI renders for mechanism shots: the glass head, the coil, neurons. Labelled "Illustration", and the client is told they're AI.
4. Built animation in Remotion.

Never use generic stock where a real clip exists. All third-party and AI media is gitignored (`brand/remotion/public/`).

**Remotion compositions:**
- `OstadReel` (9:16)
- `OstadWide` (16:9 v1)
- `OstadYT` (16:9 v2–v4)

They use the components in `brand/remotion/src/components/`:
- `YT.tsx` (the YouTube system)
- `Ro.tsx` (calm glass cards)
- `Exo.tsx` (the Exomind devices)
- `Captions.tsx`, `Hook.tsx`, `EndCard.tsx` and others

Config comes from `edit.json`. Footage prep is done by `brand/edits/<slug>/yt_assets.sh`.

**Captions:** `brand/scripts/caption_words.py` gives word onsets on the sped-up timeline. Each word appears on its onset frame.

**Rendering:** `brand/scripts/video_edit.cjs` / `video_reel.cjs`, with fonts loaded through `remotion/src/Fonts.tsx`.

## 5. Verify by measurement, not by eye

Every render is checked before the client sees it:
- **Captions:** onsets read off decoded frames against the transcript. Target: each word within 0–1 frame.
- **Words:** re-transcribe the final and compare it word for word with the source.
- **Colour:** canvas hue and saturation (v4: hue 212–216°, saturation 0.05).
- **Loudness:** −14 LUFS, true peak.
- **Speed:** measured, not assumed.
- **Motion:** the longest still stretch behind the glass.
- **Glitches:** frame-to-frame scans for flashes.
- **Contact sheet:** of the final, for example `brand/edits/<slug>/yt_v4_contact.jpg`.

The numbers go into the DECISIONS section for that version.

## 6. Deliver and log

- The final goes to `Downloads` named "Ostad - <title> (<format> v<n>).mp4" and is opened for the user.
- One commit per change, pushed to main (`git push origin HEAD:main`), with the numbers in the message.
- **Before anything is posted**, these need sign-off:
  - patient consent for their footage and quotes
  - BTL's OK on their clips
  - the client knowing which shots are AI renders
  - gallery before/afters

## 7. Client review loop

The client's notes go back to step 1 as the next DECISIONS section. Rules that should outlive the video go into 14d and memory.

---

## Proposed additions (from the user's process notes, 2026-11-16; not built yet)

**1. An idea log and graphics library.**
- While cutting, flag each line where a new graphic would explain it better and nothing in the library fits. Log each one with the exact line he said and why existing pieces don't work.
- Pitch the list to the client to approve or pass.
- For each approved idea, show **three looks as stills** before any animation is built; the client picks one.
- Then build it as a **reusable, parameterised Remotion component**, with words and numbers as props. Check its render, and add it to a library with notes on when and how to use it.
- Each new edit pulls from the library first, so the library grows with every video.
- This answers the 2026-11-16 note directly: every animation starts from something he says, not from a template.
- Proposed home: `brand/remotion/src/library/` plus `research/ostad/style/IDEAS.md`.

**2. Sound effects.** Our SFX are quiet clicks today. The plan:
- **Measure where the reference puts sounds.** M19 already shows Evident lands 63% of graphic entries within 3 frames of an onset.
- **Source sounds:**
  - **Openverse API** (CC-licensed audio search). Its CC licences need checking per sound: CC0 or CC-BY only, with credit kept.
  - **Generated sounds**, so nothing depends on a licence.
- **Unverified tools:** "Real SFX" (timeline-aware placement) and "earshot" (code-generated sounds and kits) were named in the notes. Check they exist, and their licences, before relying on them.
- **Mix:** voice stays at least 8 LU above the bed (Evident: 8.4 LU).
