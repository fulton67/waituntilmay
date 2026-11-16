# How we study a reference video frame by frame

This is the method behind every style rule in the Ostad edits. It has one principle: **measure, don't describe.** An opinion can't be rebuilt, but a number can. So every rule we adopt carries a number, its spread, and the frames it came from.

The tools live in `research/ostad/style/tools/` (M1–M21). The outputs go to `research/ostad/style/measure/<ref>/<video>/`. Media lives in `research/ostad/style/media/`, which is gitignored because reference videos are other people's work and this repo is public.

---

## 1. Pick the reference and say what we want from it

Add the reference to `refs.yaml` with a `target`, meaning the specific thing the client likes about it. For example: "the animated graphics, not the whole page" or "captions without the outline". The target decides what the read-out in step 4 focuses on.

Current references:
- **Evident** (`evident`, plus `evident_yt` for their YouTube Shorts). Infographics, SFX, and explanation without putting every graphic in a box. The client's model post is `Ddos1QZRGmV`.
- **Colin and Samir** (`colin`). Captions without an outline.
- **Ro** (`ro`). The graphics system: type, cards, transitions and colour.
- **Dr. JC** (`drjc`). Clinical condition images: crop, label, sequence, and timing against speech.
- **Doctor Grove** (`grove`). Image cards: corner radius, framing and placement.
- **GLP-1** (`glp1`). The pop-up callout and the phone moment.
- **Three single posts** (`ig_DYKh5yyPxxg`, `ig_DdrkdrYv-yW`, `ig_DfTeuSYK23y`).
- **The Are.na board** (`arena`).

## 2. Download it

| Source | How | Where it lands |
|---|---|---|
| Instagram account or post | Apify `apify/instagram-scraper` (about $0.0027 per post on our plan). The dump goes in `raw/ig_*.json`. Then `python -I tools/run.py ig_media .` downloads each reel, carousel slide and cover. | `media/ig/<owner>/<shortcode>.mp4`, with `_1`, `_2`… for carousel slides |
| YouTube video or channel | `yt-dlp` with `--write-info-json`, mp4 at native resolution. Free, so use it first when the creator also posts there. | `media/yt/<ref>/<id>.mp4` |
| Are.na | the public API (`tools/arena_pull.py`) | `media/arena/` |

Rules:
- Keep the original audio language.
- Log the profile's post count beside how many we saved, so it's clear when we've sampled rather than taken everything.
- Downloads are untrusted: run every script that reads them with `python -I`.
- Never print the Apify token. It's read from `.env` inside the script.

`tools/common.py` → `corpus()` maps each file to its ref id. A new source folder needs one entry there.

## 3. Measure every frame (M1–M21)

Every tool decodes **every frame at the native frame rate**: ffmpeg with `-fps_mode passthrough`, no frame dropping, scaled down to 270 px wide for analysis only. Every per-frame output has one row per source frame, so frame numbers match the original video exactly.

| # | Tool | What it measures |
|---|---|---|
| M1 | `frames.py` | probe, frame count (checked against `ffprobe -count_frames`), mean luma per frame |
| M2 | `contact_sheets.py` | one sheet per 2 s, with every frame a tile and the frame number burned in. These are what a person (or an agent) looks at. |
| M3 | `cuts.py` | hard cuts and dissolves, from PySceneDetect ContentDetector and ffmpeg `scdet`, reconciled |
| M4 | `camera_phasecorr.py` | frame-to-frame pan (phase correlation) |
| M5 | `camera_ecc.py` | slow pushes and pulls over 1 s windows (ECC plus Lucas-Kanade) |
| M6 | `camera_classify.py` | each frame classed as static, drift, handheld, push, pull, pan or tilt, plus per-shot summaries |
| M7 | `luma_contrast_sat.py` | luma, RMS contrast, saturation, black and white points |
| M8 | `shadow_highlight_hue.py` | shadow and highlight hue (the grade) |
| M9 | `palette.py` | 5-colour CIELAB k-means every 15 frames |
| M10 | `ocr_track.py` | on-screen text: words, boxes, size as % of frame height, entry and exit |
| M11 | `graphic_track.py` | every graphic element: entry and exit frame, bbox per frame, opacity, scale, blur |
| M12 | `easing_fit.py` | for each element's entry: fitted easing curve, frames to settle (1% band), overshoot % |
| M13 | `card_geometry.py` | image cards: corner radius in px and as % of width, border, shadow offset/blur/alpha, padding, grid position |
| M14 | `mockup_detect.py` | phone and device mockups |
| M15 | `audio_track.py` | whether there's audio, and checks the spoken language |
| M16 | `transcribe.py` | Whisper word timings (GPU, faster-whisper) |
| M17 | `pacing.py` | words per second, pauses, dead air, sentence length |
| M18 | `loudness.py` | mix LUFS, true peak, and voice vs music bed after a Demucs two-stem split |
| M19 | `sfx_align.py` | audio onsets against graphic entries: share of entries with a sound within 3 frames, median offset |
| M20 | `script_structure.py` | first line, the turn, spoken numbers, recurring phrases across a creator's videos |
| M21 | `still_image.py` | the same image stats for carousel slides and stills |

**Calibrate first.** `tools/calibrate.py` makes three synthetic clips with known answers: a static shot, a 2% push over 2 s, and a 30 px pan. It also makes a synthetic bezier element. M4–M6 and M12 must land within 10% of the known answers, or the tool gets fixed before anything else runs. Results: `measure/_calibration/calibration.json` (all passing, see `MEASURE_COVERAGE.md`).

**Run it** from `research/ostad/style`. Both passes are idempotent, so finished outputs are skipped:

```bash
bash tools/run_pass1.sh > logs/pass1_runner.log 2>&1   # M1-M9 in 4 parallel groups, then M6
bash tools/run_pass2.sh                                # M10, M15, M16, M18 on the GPU; M11, M14; then M12, M13, M17, M19, M20, M21; then verify
```

Python is the style venv (`C:/Users/naimj/tools/style-venv/Scripts/python.exe`), launched as `python -I tools/run.py <tool>`.

**Verify.** `tools/verify_measure.py` checks that every applicable output exists, isn't empty and covers every frame. It writes the ✓/✗ table to `MEASURE_COVERAGE.md`. An ✗ means the reading step waits until it's fixed.

## 4. Read it: look at every sheet

Numbers can't tell you *why* a moment works, so a reader (a person or one subagent per reference) goes through **every contact sheet**, not a sample, alongside the numbers:

1. **One TSV line per sheet** (`read/<ref>_sheets.tsv`): frame range, time, what's on screen, which device is in use, and the words spoken over it. Count the lines against the number of sheets.
2. **A beat table:** each visual idea with its frames, the line it illustrates, the device, how it enters and exits (frame counts from M3/M11/M12), any SFX hit (M19), and how it differs from the beat before. Count the repeats.
3. **The numbers:**
   - median and p90 seconds per idea
   - share of frames that are full-frame graphics vs footage vs presenter
   - card radius and shadow
   - type size and placement
   - cut vs dissolve ratio
   - camera move share
   - SFX alignment
   - voice vs bed LUFS
   - palette
4. **Frame tables** for the best animation moments, from 10 frames before entry to 10 after exit: position, scale, opacity and easing per frame.
5. **Rules for our edit.** Each rule gets a number, a spread, the frames it came from, and a verdict: **adopt**, **adapt** (say how, under the client rules) or **reject** (say why).

This goes in `read/<ref>.md`, and the adopted rules go in `DECISIONS.md`.

## 5. Use it, then measure ourselves the same way

Build to the rules in Remotion (`brand/remotion`). Then run the same measurements on **our** render and compare it with the reference:
- seconds per idea
- SFX hit share
- caption onset offsets
- hue and saturation
- LUFS
- how often a layout or device repeats

Wherever we're outside the reference's spread, either fix it or write down why we chose to differ.

## Known limits

- Graphic tracking (M11) works on frame differences, so slow drifting backgrounds can register as elements. Check the element count against the sheets.
- OCR (M10) misses very thin or very small type. Read the sheets for type sizes it doesn't report.
- SFX alignment (M19) counts any audio onset, voice included. A "hit" near speech isn't necessarily a sound effect, so listen to the stems (`stems/`) before adopting an SFX rule.
- Instagram re-encodes reels, so fine grain, noise and exact colour are softened. Take colour as a direction, not a spec.
