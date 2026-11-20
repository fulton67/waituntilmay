# Reels: the recipe, the timeline, the one command

Every reel is rebuilt from its recipe and edited as a timeline. Nobody copies `ReelVn.tsx` and patches constants.

```
python brand/scripts/reel.py <jan08|oct14|undereye> [--version vN] [--frames A-B] [--face-clear] [--compare <delivered.mp4>]
python brand/scripts/reel.py <reel> --plan         # print every step, run nothing
python brand/scripts/timeline_view.py              # the timeline view: http://127.0.0.1:8765
python -I brand/scripts/timeline_lib.py            # validate every timeline
```

| File | What it is |
|---|---|
| `brand/remotion/timelines/<reel>.json` | The working timeline: every beat of the reel's next version. Owned by whoever builds that version. |
| `brand/remotion/timelines/<reel>.<version>.json` | A frozen, delivered version (`jan08.v3`, `oct14.v5c`, `undereye.v4b`). Read-only in the view. |
| `brand/remotion/timelines/.history/` | The previous file, kept on every save from the view. |
| `brand/remotion/src/timeline/timeline.ts` | Types and the resolver the compositions import (`resolve`, `span`, `event`, `plateMap`, `labels`, `sfxHits`). |
| `brand/scripts/timeline_lib.py` | The same resolver in Python, plus `validate`. Keep the two in step. |
| `brand/scripts/timeline_extract.py` | Wrote the three frozen timelines from the delivered compositions. |
| `brand/scripts/reel.py` | Prep (cached), render, master, checks, manifest. |
| `brand/scripts/timeline_view.py` + `.html` | The local timeline page and its server. |

## How Naim makes a change

1. `python brand/scripts/timeline_view.py`, open `http://127.0.0.1:8765`, pick the reel's working file.
2. Click a beat. Change its start or end (pick a word in the transcript row, or type an offset in frames), its on-screen text, a plate's word-to-clip-frame keys, an SFX, or the notes. Dragging a block or its edges shifts it in frames.
3. Save (Ctrl+S). The JSON is validated and written; the old file goes to `timelines/.history/`.
4. Render reel, or Render selected beat (that beat with 1 s either side). Both run `reel.py`. Or run it in a terminal.
5. The build folder holds the master, the manifest with the check results, and the exact timeline and props that were rendered.

To start from a delivered version: open it, Copy to working, name the new version.

A new graphic, device or layout is still code: a component in `src/<reel>/`, placed by a beat in the timeline. Numbers and words belong in the JSON; components stay in TSX.

## Timeline schema (v1)

```json
{ "schema": 1, "reel": "oct14", "version": "v6",
  "comp": { "entry": "src/oct14/index.ts", "id": "Oct14ReelV6", "props": {} },
  "fps": 24, "transcript": "public/oct14/props.json", "voice": "public/oct14/mix_v6.wav",
  "master": { "lufs": -14, "tp": -1.5, "limiter": false },
  "beats": [ { "id": "O2", "lane": "plates", "device": "FloraPlate",
    "start": { "word": 144, "text": "deflation" }, "end": { "piece": "intro-cheekbones", "edge": "end", "offset": -2 },
    "text": { "eyebrow": "The source", "title": "Deflation", "labels": [ { "text": "Cheek fat", "at": { "word": 144, "text": "deflation", "offset": 16 }, "x": 0.2, "y": 0.42 } ] },
    "plate": { "id": "O2", "map": [ [ { "word": 144, "text": "deflation" }, 0 ], [ { "word": 160, "text": "moving" }, 54 ] ] },
    "source": { "clip": "oct14/inj3.mp4", "in": 20.0, "rate": 1 },
    "layout": { "mode": "takeover", "x": 40, "y": 730, "w": 1000, "h": 850 },
    "events": { "strike": { "word": 150, "text": "but" } },
    "sfx": [ { "name": "exo_card", "gain": 0.22 } ],
    "notes": "free text" } ] }
```

- **Lanes:** `footage`, `captions`, `titles`, `plates`, `objects`, `markup`, `sfx`.
- **Anchors** (one kind each; all take `offset` in frames):
  - `{ "word": i, "text": "…", "edge": "start"|"end" }` is preferred. `i` indexes the transcript's `words`. If a retime moves the word, the resolver finds the nearest word with that text and the validator notes it.
  - `{ "piece": id, "edge" }`: a cut. Matches a piece id, an Oct 14 line, or under-eye sub-pieces `<id>x/y/z`; `"exact": true` matches the id only.
  - `{ "cue": name }`: a named cue in the transcript's `cues` (`"end"` = the last frame of the talk).
  - `{ "beat": id, "edge" }`: another beat (a beat's end may be its own start + n).
  - `{ "frame": n }`: last resort.
- **`transcript`** is the reel's props JSON (words with `f`/`f1`, pieces, cues), relative to `brand/remotion`. The timeline references it and never copies it.
- **Top-level extras:** `"voice"` or `"audio": {"dialogue": …}` name the voice track the composition plays.
- **Word times** come from the transcript. Where a reel's props carry estimated word times (under-eye: letter-length estimates; measured times are in `research/ostad/style/undereye/dialogue_v2_words.json`), a word anchor is only as exact as those.
- **`"checks": {"colour_skip": [[anchor, anchor], …]}`** (top level) names spans the colour check must not sample: a full-frame still or graphic that is still drawn in TSX and has no beat yet. A beat in lane titles, plates, objects or markup already excludes its own span.
- **`plate.map`** is `[anchor, clip frame]`: the plate's change lands on the word and holds.
- **`events`** are named moments inside a beat (strike, sweep, swap, dim). `text.rows`, `text.items`, `source.left/right`, `layout.ref` (`"layout_v5:compare"` = the face-free solver's output) and other extra keys are allowed; the resolver ignores what it does not know.
- **Reading it in a composition:** `const tl = (props.timeline ?? defaultTimeline) as Timeline`, where `defaultTimeline` is the static import of `../../timelines/<reel>.json`. `reel.py` always passes the timeline as `props.timeline`, so a frozen version renders from its own file; Studio uses the import and hot-reloads on save.

## Timeline view: a page, not Remotion Studio

Studio's props panel edits `defaultProps` as a form (it wants a zod schema and saves into the Root file). It has no lanes, no transcript row and cannot write a separate JSON. So the view is a static page with a stdlib server (`timeline_view.py`, 127.0.0.1 only, outside Next.js). Studio stays the preview: `cd brand/remotion && npx remotion studio src/<reel>/index.ts`.

## What reel.py does

1. **Timeline:** loads `timelines/<reel>.<version>.json` if it exists, else `timelines/<reel>.json`; validates it.
2. **Prep, cached:** each step below has inputs and outputs. The signature (command + input hashes) is kept in `brand/edits/<edit>/builds/prep_cache.json`. First run: the assets on disk are adopted. Later: a step re-runs only when an input changed or an output is missing. `--prep force` re-runs all, `--prep skip` none. Steps that need a person (restore raw clips, per-piece matting) are reported as MISSING or STALE, never guessed.
3. **Render:** `npx remotion render <entry> <comp> <build>/raw.mp4 --props=<build>/props.json --log=error --concurrency=4 --crf=16 --timeout=240000` from `brand/remotion`. A step that fails leaves its build folder in place with a `FAILED.txt`. `--frames A-B` renders a segment, plus an audio-only render of the whole reel so the loudness gain is the full reel's.
4. **Master:** two-pass linear `loudnorm` to −14 LUFS, true peak target −1.5 dBTP, AAC 192k 48 kHz; the picture is copied. `"limiter": true` adds the 4x-oversampled peak limiter (under-eye v4b needed it).
5. **Checks** (in the manifest; exit code 1 if one fails):
   - `timeline`: validates.
   - `format`: 1080x1920, 24 fps, the expected frame count.
   - `loudness`: ffmpeg `ebur128=peak=true`, −14 ± 0.5 LUFS, ≤ −1 dBTP.
   - `colour`: raw footage. On frames where the footage is full frame with no graphic above y 1440, the render is compared with a plain ffmpeg decode of the same source frame; mean difference ≤ 2 levels. This is the guard against Remotion's default HDR tone map (the warm cast).
   - `frozen_picture`: for every footage beat, every 3rd render frame's body region is matched against the source clip (2 s back to just ahead of the expected time). The matched source time must keep advancing. A stall of ≥ 6 frames while the source moves fails. It catches a key or video layer that outlives its file and holds its last frame (under-eye f1581–1613 and f429–464, found in both v4b and v5).
   - The colour check skips frames that show a still image or a full-frame graphic (the render does not correlate with the footage, r < 0.8) and lists them.
   - `tonemap_lint`: every `<OffthreadVideo>` in the composition's file carries `toneMapped={false}`.
   - `--face-clear`: renders the reel's check layers and runs `research/ostad/style/<reel>/face_clear.py`; pass = 0 frames.
   - `--compare <file>`: picture and loudness difference against a delivered file.
6. **Output:** `brand/edits/<edit>/builds/<reel>_<version>[_fA-B]__<time>/` with `raw.mp4`, `<reel>_<version>.mp4`, `manifest.json` (input hashes, comp id, props, prep status, check results), `build.log`, `timeline.json`, `props.json`. The folder is always new. Nothing is overwritten. To deliver, copy the master to the edit folder under a new name.

Checks still run by hand after a full build (commands in each recipe): tracking lock, cuts and pacing, the final transcript.

## Rules baked in

- Footage is never graded, tone-mapped, brightened or faded. Every `OffthreadVideo` has `toneMapped={false}`. The delivered `Jan08ReelV3`, `Oct14ReelV5` and `UndereyeReelV4` predate this rule and are not edited; their rebuilds report the lint and the colour difference honestly.
- Patient footage never goes to an AI or online service. Transcription (faster-whisper), matting (Robust Video Matting), face tracking (MediaPipe) and face detection (YuNet) are all local. Flora receives drawings only.
- Never edit a delivered composition; never overwrite a render; delete nothing.
- Interpreters: style venv `~/tools/style-venv` (cv2, mediapipe), brand venv `~/tools/brand-venv` (RVM), clinic venv `C:/Users/naimj/clinic-library/.venv` (faster-whisper, GPU).

## Flora plates (all reels)

1. Stills and the image-to-video clip are made in Flora (Gemini Omni 1.2 Flash; drawings only). Clips land in `brand/edits/flora-anatomy/clips/<name>.mp4`; picks and usable frame ranges in `brand/edits/flora-anatomy/qa_omni.json`; QA in `QA_omni.md`.
2. `python -I brand/scripts/flora_frames.py <plate ids>`: paper to alpha, re-inked in the brand palette (ink, warm grey, sand gel, deep-brown blood), autocropped, 3 in-betweens per frame. Writes `brand/remotion/public/flora/<id>/*.png` and `public/flora/frames.json`.
3. `FloraPlate` (`src/flora/FloraPlate.tsx`) plays the frames through the beat's `plate.map`. A new or replaced clip: re-run step 2 for that id, then set the map's clip frames in the timeline.

## Jan 08, filler fatigue

Edit folder `brand/edits/jan08-filler-fatigue`, assets `brand/remotion/public/jan08`, entry `src/jan08/index.ts`. Delivered: v3 = `Jan08ReelV3`, "Ostad - Filler fatigue v3.mp4" (−14.2 LUFS / −1.3 dBTP). Source: `clinic-library/tmp/jan08/IMG_2421.MOV`.

| Step | Command | Writes |
|---|---|---|
| words | `$CLINIC brand/scripts/jan08_prep.py words` | `words_talk.json` (local whisper) |
| gaps | `$STYLE -I brand/scripts/jan08_gaps.py check` | `gaps.json`; every cut in `research/ostad/style/jan08/cut.json` sits in a measured silence |
| footage | raw `talk.mp4`, `clinic/IMG_3453.mp4`, `clinic/IMG_3470.mp4` restored from `hlg_backup/` (first build: `jan08_prep.py transcode`, 1080x1920, 24 fps) | `public/jan08/talk.mp4`, `clinic/*.mp4` |
| props | `$STYLE -I brand/scripts/jan08_prep.py props` | `public/jan08/props.json` (pieces, words, cues) |
| voice | `$STYLE -I brand/scripts/jan08_prep.py voice` | `public/jan08/voice.wav` |
| before/after | `$STYLE -I brand/scripts/jan08_ba.py` | `ba.json`, `clinic/front_after_aligned.jpg` |
| plan | `$STYLE -I brand/scripts/jan08_plan.py` | `src/jan08/planV3.ts` (surgeon's marks from landmarks) |
| matte | `$BRAND -I brand/scripts/video_matte.py <piece_src.mp4> <edit>/matte/<piece>` per keyed piece (hook, belief, aging, method, cheekbones, approach), then `$STYLE -I brand/scripts/jan08_mattes.py` | `public/jan08/matte/<piece>.mp4` (alpha-only key over the raw footage) |
| plates | `flora_frames.py J1 J2 J3 J4 J5` | `public/flora/J*` |
| build | `python brand/scripts/reel.py jan08 --version v3` | the build folder |

Face-clear layers: `{"mode":"footage"}` and `{"mode":"check"}`. By hand: `research/ostad/style/jan08/track_v3.py` (lock 1.4 / 2.0 / 7.2 px), `brand/scripts/jan08_verify.py <master>`, `jan08_pieces_asr.py final <master>`.

## Oct 14, injections

Edit folder `brand/edits/oct14-injection`, assets `public/oct14`, entry `src/oct14/index.ts`. Delivered: v5c = `Oct14ReelV5` with `{"big":true}`, "Ostad - Oct 14 injections v5c.mp4" (−14.2 / −1.3). Source: `clinic-library/tmp/oct14/`.

| Step | Command | Writes |
|---|---|---|
| select | `$STYLE -I brand/scripts/oct14_prep.py select` | `clips.json` (roles by creation time) |
| words | `oct14_prep.py transcribe`, then `words` | `words_<role>.json` (patient's name redacted on read) |
| footage | raw clips restored from `hlg_backup/` (first build: `oct14_prep.py transcode`) | `public/oct14/<role>.mp4` |
| plan | `$STYLE -I brand/scripts/oct14_plan.py` | `research/ostad/style/oct14/cut.json`, `plan.json` |
| before/after | `$STYLE -I brand/scripts/oct14_pairs.py` | `before.jpg`, `after_aligned.jpg`, `pair.json` |
| track | `$STYLE -I brand/scripts/oct14_track.py` | `tracks.json` |
| props | `$STYLE -I brand/scripts/oct14_prep.py props` | `public/oct14/props.json` |
| audio | `oct14_prep.py audio` (v6: `audio_v6` writes `mix_v6.wav`) | `public/oct14/mix.wav` |
| track v5 | `$STYLE -I brand/scripts/oct14_track_v5.py` | `tracks_v5.json` (per frame, zero-phase, no hold) |
| still | `$STYLE -I brand/scripts/oct14_still_v5.py` | `stills_v5.json`, `still_jowl.jpg` |
| markup | `$STYLE -I brand/scripts/oct14_v5_markup.py` | `markup_v5.json` (measured surgeon's plan) |
| faces, layout | `oct14_faces.py` (then `--render <allowed.mp4>`), `oct14_layout_v5.py` | `faces_*.json`, `layout_v5.json` (every card where no face is, or a cream-room takeover) |
| plates | `flora_frames.py O1 O2 O3 O4` | `public/flora/O*` |
| build | `python brand/scripts/reel.py oct14 --version v5c` | the build folder |

Face-clear layer: `{"layer":"allowed"}`. By hand: a `{"layer":"probe"}` render through `research/ostad/style/oct14/track_measure_v5.py` (median < 6, p95 < 15, max ≤ 15 px), `brand/scripts/oct14_verify.py <master> <bare.mp4>`.

## Under-eye filler

Edit folder `brand/edits/undereye-filler`, assets `public/undereye-filler`, entry `src/undereye/index.ts`. Delivered: v4b = `UndereyeReelV4`, "UndereyeReel_v4b.mp4" (−14.0 / −2.6, limiter). Source: clinic-library IMG_6813–6821, IMG_7044.

| Step | Command | Writes |
|---|---|---|
| footage | raw clips restored from `hlg_backup/` (first build: `undereye_prep.py`) | `public/undereye-filler/<clip>.mp4` |
| before/after | `$STYLE -I brand/scripts/undereye_beforeafter.py` | `ba_wipe_before.jpg`, `ba_wipe_after.jpg`, the measured bands |
| sketch | `$STYLE -I brand/scripts/undereye_sketch.py` | `sketch.json` (entries, cannula axes, the rim) |
| track | `$STYLE -I brand/scripts/undereye_track_v2.py` | `tracks_v2.json` |
| props v2 | `$STYLE -I brand/scripts/undereye_prep_v2.py build` | `props_v2.json`, `dialogue_v2.wav` |
| props v4 | `$STYLE -I brand/scripts/undereye_prep_v4.py` | `props_v4.json` (picture-only changes, the plan board, the keys) |
| keys | `$BRAND -I brand/scripts/undereye_key.py <name> <clip> <a_s> <b_s>` for title, c01, c02, c02b, c03, c04 | `key_<name>.webm` (the clip's own Y/U/V with RVM alpha) |
| plates | `flora_frames.py U1 U3 U4 U5 U6 U7 U8 U9` | `public/flora/U*` |
| build | `python brand/scripts/reel.py undereye --version v4b` | the build folder |

Face-clear layer: `{"bare":true}` at half scale. By hand: `brand/scripts/undereye_lock_check.py` (lock 2.3 / 3.6 / 4.5 px), `undereye_master_v4.py measure <master> <json>`.

## HDR master (`reel.py <reel> --hdr`)

The normal build is an 8-bit H.264 render labelled SDR; the camera roll plays the iPhone originals as 10-bit HLG (bt2020). `--hdr` builds
the same reel as a 10-bit HEVC HLG master whose footage is cut from the original camera files, untouched (`brand/scripts/reel_hdr.py`).

    python brand/scripts/reel.py undereye --hdr [--frames A-B]
    python brand/scripts/reel.py oct14 --hdr --comp Oct14ReelV6b --audio "brand/edits/oct14-injection/Ostad - Oct 14 injections v6b.mp4"
    python brand/scripts/reel.py jan08 --hdr --audio "brand/edits/jan08-filler-fatigue/Ostad - Filler fatigue v4b.mp4"

1. Footage: every picture segment is cut from the original (`public/originals.json`: working file -> original, offset; the copies in
   `public/originals/`) in yuv420p10le. Only cut, frame pick to 24 fps (the same frame the delivered cut shows, never blended), the
   timeline's punch-in / placement, rotation. No colour filter. An original that is missing falls back to the working file and is named
   in the manifest.
2. Graphics: the composition renders without footage as transparent PNG passes, prop `pass`: `under` (behind the people: wall titles,
   the cream room and plates he stands in front of), `matte` (the people's key, alpha or luma only), `over` (every other graphic),
   `media` (clips inside cards), `frost` (white exactly where a card has a CSS backdrop blur). sRGB graphics go through a 3D LUT to bt2020 + HLG with white at HLG 75 % (203 nits, BT.2408).
   `media` clips are already HLG-coded: matrix only.
3. Layers: footage -> under -> the people (ORIGINAL footage through the matte) -> frosted glass (the picture blurred where the `frost`
   pass is white) -> over -> media.
   Before the composite every input is written once more as a lossless `.nut` track and its frames are counted: the cut footage on an
   exact 1/24 timebase (an .mkv rounds to 1 ms and every third frame then took the previous graphics frame), and each PNG pass as
   constant RGBA (Chrome writes opaque frames as RGB and the rest as RGBA; a format change mid-stream makes ffmpeg rebuild the filter
   graph and drop frames at the cuts). `.nut` carries no colour tags, so the composite states them on the footage inputs (`setparams`);
   without that the footage came out 2-4 codes off. The encode never repeats frames: a short master fails the format check.
4. Encode: libx265 main10, crf 8, tags bt2020 / arib-std-b67 / bt2020nc / tv. Audio: stream-copied from the existing master (`--audio`).
5. Checks (manifest.json): tags equal the original's; footage vs the original in graphics-free regions (mean |diff| <= 2 ten-bit codes);
   graphics white at 75 % +-3 %; frozen picture; format; audio unchanged; picture vs the delivered master (every 6th frame, grey
   correlation >= 0.9: catches a picture that runs early or late). A build with a failed check is copied out as "... (FAILED).mp4".

Intermediate passes are deleted after the build (`--keep` keeps them). `--reuse <build folder>` composites again from a kept build's
cut footage and passes without cutting or rendering (use `--keep` with it, or that folder's passes are removed); add `--recut` to cut
the footage again and reuse only the passes. `--threads N` limits filter and x265 threads (less memory). `--name "<file>"` copies the
master beside the delivered ones. The originals are only read. A composition takes part by honouring
`pass` (UndereyeReelV5, Oct14ReelV6b, Jan08ReelV4 do); without the prop their output is unchanged.
