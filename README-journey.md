# Journey to the Center of the Internet — pipeline

Python/ffmpeg work for the piece described in [`concept.md`](concept.md). It
lives outside the Next.js app; the only thing the app owns is the page at
`/journey-to-the-center-of-the-internet` and the manifest it reads.

## Layout

```
concept.md                     the piece
config/triggers.json           trigger words, tag weights, phase bias, tubes pair
config/sources.json            the source pool: id, weight, enabled, duration
config/tag_guide.md            the tagging authority, shared by every source
sources/<id>/source.mp4        normalised footage, 640x360 @ 24fps   (gitignored)
sources/<id>/transcript/       words.json, phrases.json, padded, srt, txt
sources/<id>/tags.json         the tags for that source's phrases
scripts/                       transcription, tagging, and verification tools
pipeline/                      media.py (frames/audio/assembly), mosh.py, overlay.py
randomize.py                   the renderer
renders/                       v_<seed>.mp4 + v_<seed>.json   (gitignored)
renders/web/                   web-encoded batch + manifest   (gitignored)
cache/                         extracted frames, per-fragment WAVs, room tone (gitignored)
tools/pixelated-test/          browser check for image-rendering: pixelated
```

## Sources

`config/sources.json` is the pool. Every enabled source can supply phrases to
any version, and a splice can cross sources at a word boundary; each version's
log records the source of every phrase and the mix it ended up with. Weights
are relative and renormalise over the enabled set, so disabling one source
does not change the others' ratio to each other.

```
python scripts/ingest_source.py --url <youtube url> --id <id>   # one source, end to end
python scripts/source_report.py                                 # what each source holds
python randomize.py --sources config/sources-blum-only.json     # draw from a subset
```

The room tone and the drone come from `primary` whatever the words did, so
silence between beats still sounds like one room.

## Transcript

WhisperX `large-v3`, CUDA, float16, batch 8 — 129.0s ASR + 54.9s forced
alignment for the 54:24 talk (17.8x realtime). 9,229 words, 1,366 phrases,
zero words needed timing repair.

Word-onset accuracy, measured against acoustic onsets on the 392 words with
>=300ms of real silence beside them: median error **+1.0 ms**, median absolute
error **20 ms**, **85.5%** within 50 ms.

```
.venv/Scripts/python.exe scripts/transcribe.py        # whisperx  -> _raw_whisperx.json
.venv/Scripts/python.exe scripts/transcribe_fw.py     # faster-whisper fallback
.venv/Scripts/python.exe scripts/build_outputs.py --duration 3264.888 --pad 0.05
.venv/Scripts/python.exe scripts/verify.py --src <video> --duration 3264.888
.venv/Scripts/python.exe scripts/align_accuracy.py
```

## Tags

`config/tag_guide.md` is the authority — definitions, real examples, and an
edge-case table decided once so tagging stays consistent across all 1,366
phrases. Tags are **weights, not filters**: every non-filler phrase is eligible
in every phase, and tags only change selection probability. `filler` is
eligible in phase 4 only.

```
.venv/Scripts/python.exe scripts/tagging.py status | dump | apply | audit
.venv/Scripts/python.exe scripts/autotag.py validate       # score the rules vs blum
.venv/Scripts/python.exe scripts/autotag.py tag --source sources/<id>
```

Blum's 1,366 phrases were tagged by hand. Every source since is tagged by
`scripts/autotag.py`, which writes the guide out as lexicon and grammar tests
and is scored against those hand tags - the table is in the guide. Selection
itself runs on the five-beat regex pools in `pipeline/units.py`, not on
`tags.json`, so the tags describe the pool rather than cut the edit.

## Rendering

```
python randomize.py                  # one render, random seed and phase
python randomize.py --count 30       # a batch
python randomize.py --seed 1234      # reproduces a render exactly
python randomize.py --phase 3        # force a phase (testing)
```

Every render is **exactly 30.0s / 720 frames at 24fps**, from **<=30s** of
source footage, in 6–20 fragments. `v_<seed>.json` logs the phase, the selected
phrase ids and text in order, every operation applied, every splice as its
resulting sentence, the source seconds and the output duration.

Operations: `freeze` (one frame held 1–6s over cached room tone), `stutter`
(a frame range repeated 2–6x with its audio), `reverse` (frames and audio),
`step` (every Nth frame held N frames while audio runs underneath), `loop`,
`trim` (cut at a word boundary), and `splice` (first part of one phrase joined
to the second part of another, forming a new sentence).

Audio is forced to exactly `n_frames * 2000` samples per block, so A/V drift is
zero by construction rather than by luck. Measured drift across 30 renders:
**0.006s = 0.144 frames**.

Room tone is sampled once from a measured silent gap at 3248.60–3251.80s
(−49.7 dBFS) and cached.

### Two-pass datamosh

Pass one builds the clean, frame-accurate edit with the ffmpeg concat demuxer.
Pass two corrupts its *encoded* form, which is the opposite of a clean frame
reassembly and so cannot be done in the frame pipeline: the video is re-encoded
to a raw MPEG-4 Part 2 stream, then an I-VOP chosen for moshing is **replaced**
by a copy of the preceding P-VOP. Replacing rather than deleting keeps the
frame count exact, so the render stays 720 frames and sync is untouched.

Intensity follows `peak * (i/n)^gamma` — near zero at the start, maximum in the
last seconds. The phase sets the steepness:

| phase | gamma | peak | 5s | 15s | 25s | 30s |
|---|---|---|---|---|---|---|
| 1 | 4.0 | 0.72 | 0.00 | 0.05 | 0.35 | 0.72 |
| 2 | 3.0 | 0.86 | 0.00 | 0.11 | 0.50 | 0.86 |
| 3 | 2.2 | 0.95 | 0.02 | 0.21 | 0.64 | 0.95 |
| 4 | 1.4 | 1.00 | 0.08 | 0.38 | 0.78 | 1.00 |

Trigger words (`config/triggers.json`, currently `internet`) force a mosh at
their exact frame regardless of the curve. Add words to that file; no code
change needed.

## Verification

```
.venv/Scripts/python.exe scripts/verify_renders.py
```

Checks source <=30s, output 30.000s +/-1 frame, A/V drift <1 frame, 720 frames,
and >=1 trigger per render. Exits non-zero on any failure so it can gate a
re-run. It also prints the reassembled phrase text in order, and every splice.

## Web

```
.venv/Scripts/python.exe scripts/build_web.py --height 720 --crf 20 --scale-flags neighbor
npx vercel env pull .env.local
node --env-file=.env.local scripts/upload_blob.mjs --dry-run
node --env-file=.env.local scripts/upload_blob.mjs
```

Upscaling is **2x nearest-neighbor** (`flags=neighbor`, verified: 100.0% of 2x2
output blocks perfectly uniform vs 57.7% for bicubic), applied after the mosh,
so the mosh blocks stay hard-edged instead of being interpolated away.

The upload writes `public/journey/manifest.json` holding absolute Blob URLs.
The manifest stays local so the page has no cross-origin fetch before it can
start. Manifest entries may be bare filenames or absolute URLs, so changing
host is a manifest change, never a code change.
