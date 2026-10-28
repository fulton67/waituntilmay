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

## Which pool is live

`journey-multi/` — 29 versions drawn across blum, lackner and swartz.

One line in `components/JourneyPlayer.tsx` decides, and it moves the live
Blob manifest and the bundled fallback together:

```ts
const POOL = process.env.NEXT_PUBLIC_JOURNEY_POOL ?? "journey-multi";
```

`journey/` is the original single-source pool, still on Blob with its 61
objects untouched, so switching back is that one line — or
`NEXT_PUBLIC_JOURNEY_POOL=journey` with no code change at all. The pools are
separate prefixes; uploading to one never touches the other.

To rebuild the live pool from scratch:

```
python randomize.py --count 30 --outdir renders_multi
python scripts/verify_renders.py --dir renders_multi --no-text
python scripts/build_web.py --src renders_multi --out renders_multi/web \
  --height 720 --crf 30 --maxrate-kbps 2000 --budget-mb 8.0
node --env-file=.env.local scripts/upload_blob.mjs --prefix journey-multi \
  --src renders_multi/web --manifest public/journey-multi/manifest.json \
  --mix renders_multi
node scripts/mosh-codec-audit.mjs
node scripts/verify-journey-live.mjs
```

Only versions that pass every gate ship: move a failure out of the renders
directory before encoding. `--mix` reads each version's `source_mix` into the
manifest, which is what lets `verify-journey-live.mjs` prove a version from
every source actually decodes in the live page rather than just one.

The nightly job (`scripts/register-pool-task.ps1`, 03:00, idle + AC only) runs
the same gates before a version joins the rotation, so the pool grows
unattended against the same bar as this batch.

## The picture is locked to the voice

One segment per phrase: that phrase's own frames, from its own source, over
exactly the output frames its audio occupies. `unit_media` cuts a unit's
frames and its samples from the same spans and fits the samples to the frame
count, so the offset is zero by construction.

It was not always so. The picture used to be cut on its own rhythm from a
random unit in the bank at a random offset inside it. Replaying the 30 shipped
renders against their own seeds — plan, audio and picture all draw from one
`random.Random(seed)` in that order, so the replay is exact — measured the
cost:

```
picture source != audio source   57.0% of speech frames, mean over 30
picture phrase != audio phrase   90.1%
renders with any mismatch        30/30
```

`verify_renders.py` gates it now (`av-locked`): segments must tile all 720
frames, picture source must equal voice source over the same spans within one
frame, no speech segment under 1.5s, and a hold must stay with the speaker.
It checks `segments` against `audio_track` — written by the picture builder
and the audio builder separately — so the two agreeing is an invariant
between two pieces of code rather than one certifying itself.

Through a breath the picture stays with whoever just spoke. A pause belongs to
the speaker who earned it, and cutting early would put the next source's
picture over the previous source's silence.

The breath is also the one place the picture gets played with. `freeze`,
`reverse`, `stutter` and `step` are back, scaled by phase, and they apply to
breath holds only: the frames are the end of the phrase just heard, so the
source on screen never changes. Over speech they stay impossible, because a
reverse there would put the wrong frame against the word being said — the
exact fault the lock exists to prevent. Phase 1 breaths are nearly all a plain
hold; phase 4 breaths rewind and stutter. Each hold's op is in the log
(`hold_ops`), and ten plans across phases 1 and 4 pass the gate 10/10 with
the ops on.

`PHASE` therefore no longer carries `cut_frames`, `freeze_p`, `reverse_p`,
`stutter_p` or `step_p`: there is no independent picture rhythm left to tune,
and a freeze or a reverse would break the lip sync the gate measures. Phase
still sets how steeply the mosh escalates.

## Cuts read as an exchange

Whose turn it is comes first, then how well that source's phrases answer the
last one. Within the chosen source the tiers are: a shared content word, then
a shared tag, then neither — and the source itself is drawn from the
configured weights, excluding whoever just spoke. `pipeline/link.py` is the
only place that decides what "answer" means.

That order is a trade, and it was measured rather than assumed. Deciding the
link first and the weight second — the obvious reading — cannot deliver a
configured mix once one group of sources shares its vocabulary densely: the
fifteen Red Sea clips all say cable, so the cross-source-plus-shared-word
tier was nearly always satisfied by another Red Sea clip and the rest of the
pool never entered the draw. Over 300 plans:

```
                blum  houthi  lackner  swartz    word     tag  random
configured      45.0    30.0     10.0    15.0       -       -       -
source-first    41.4    31.6      8.7    18.3   33.8%   24.9%   41.4%
link-first      40.5    47.9      3.8     7.8   53.4%   24.1%   22.5%
```

Source-first ships: link-first leaves two deliberately weighted sources at a
third of their share, and 94% of cuts still cross sources and still take the
most linked phrase the chosen source has. `JC_SOURCE_FIRST=0` flips it back.

One more correction lives in the draw. "Never the same source twice in a row"
caps a source at `w/(1+w)` of the result, because it is barred from exactly
the turn after its own — for blum at 0.45 that is 31%, and 32% is what it
measured. The draw uses the conditional weight `w/(1-w)`, which is what comes
out at `w`.

The word link has its own tier above the tag because a tag is nearly free —
`physical` is on a third of Blum's phrases — and folding them together meant
the word link never got chased.

Only narrow tags can carry a cut: `water`, `inside`, `real`, `attack`, `cut`,
`doubt`. `physical`, `people`, `abstract`, `scale`, `definition` and `filler`
never link, however well they describe a phrase in tags.json.

Narrowing them does not raise the word share, and cannot: words are tier 1, so
a word link already wins wherever one exists. What it does is stop weak links
being counted as connections. Over 600 plans, before and after:

```
                  every tag   narrow set   without definition
all cuts   word        38.1%        38.9%                37.9%
           tag         56.5%        48.3%                28.0%
           random       5.4%        12.7%                34.1%
cross only word        44.0%        44.9%                43.9%
           tag         53.4%        45.7%                27.8%
           random       2.6%         9.5%                28.3%
```

The word share barely moves across all three, because it cannot: a word link
already wins wherever one exists. What narrowing buys is that a weak link
stops being counted as a connection — a third of cuts now report `random`,
which is what they always were.

The pattern repeats one level down each time: with every tag allowed
`physical` dominated, inside the narrow set `definition` carried 71% of tag
links, and without it `doubt` carries 74% (1116 of 1506). Whichever tag is
broadest absorbs the tier.

```
python scripts/segment_list.py renders_multi/v_<seed>.json
python scripts/segment_list.py --dir renders_multi --best-linked
```

Minimum segment is 1.5s, so a viewer can place the voice and the face. That
is a floor on selection, not a trim: units are clause runs and are never cut
short.

## Every version says the word

`config/triggers.json` asks for 1-3 mosh triggers per render and
`verify_renders.py` rejects a version with none, but for a long time nothing
in the planner made one possible. It was free while the pool was two voices
who say "internet" constantly. With eighteen sources only 88 of 2344 units
say it - 58 of them in the `internet` pool - and 180 of 600 plans drew none
of them: 9 of 30 renders failed the gate on the draw rather than on anything
they did.

Three rules, in `plan_arc`:

* while the plan is still silent, the `internet` beat draws only from lines
  that say the word - the source draw and the link tiers are untouched, they
  just choose among those;
* the trim-down loop will not pop the only line a plan has (that beat is
  short, so it is often the one the trim reaches for);
* a plan that still comes out silent exchanges one line for one that says
  it - same beat, same pool, through the same tiers, short enough that the
  ceiling holds. 31 plans in 600 need this.

0 of 600 plans cannot fire a trigger now. The word share pays about a point
and a half for it: the `internet` beat is the one place the planner is no
longer free to pick the best answer.

## A source that is not in English

Four things decide what a source contributes, and three of them read the
translation:

| | reads |
|---|---|
| selection (`houthi_select.py`) | translation |
| tags (`autotag.py` via `phrases_en.json`) | translation |
| link words (`link._en_by_word`) | translation |
| **beat pools** (`units.assign_pools`) | **used to read the spoken text** |

Beat membership is regex over English. houthi-13 is Hindi, so its text
matched no pattern in any of the five beats: 8 units in the pool, 0
reachable, 0 of 30 live versions. It was kept by the selection rule, tagged,
linkable - and undrawable.

`assign_pools` now matches the translation where there is one, so the same
text every other stage reads decides this too. The spoken words are still
what gets cut and shown; only the reading changes. houthi-13 went 0.0% ->
2.2% of speech and appears in 5 of 30 versions.

That also made drawable two lines that should not be: "don't forget to like,
share and subscribe" landed in `dissolution` on the word "forget". Channel
furniture - subscribe, hit the bell, download the app, thanks for watching -
is now in no pool at all. 8 units of 2344 match, every one from a Red Sea
clip, and six were already in no pool.

## Finding Red Sea material

```
node --env-file=.env.local scripts/apify-search.mjs --confirm
node --env-file=.env.local scripts/apify-search.mjs --per-query 50 --shortlist 30
.venv/Scripts/python.exe -u scripts/ingest_source.py \
  --picked sources/houthi-shortlist.json --no-register
python scripts/houthi_select.py --register --max 15
```

Nine searches through Apify's `streamers/youtube-scraper`, deduped, with every
Apify run id recorded in `sources/houthi-candidates.json` so a search can be
opened in the console. The free plan allows five concurrent runs and Apify
restarts a run that migrates, so the orchestration caps concurrency and
adopts runs a previous invocation already paid for.

Selection is in two stages and only the second one decides. The search script
drops what cannot be used whatever it says — over 20 minutes, under a minute,
music, compilations, livestreams — and orders the rest so that videos whose
title or description mentions cables get transcribed first. That ordering buys
a place in the queue and nothing else.

`houthi_select.py` makes the call on the transcript: a video is kept only if
cables/undersea/submarine/internet AND Houthi/Yemen/Red Sea are said within
60 seconds of each other, and it reports the matching sentence for every
candidate so the call can be checked by reading. A non-English source is
judged on its English pass, which carries its own segment times, so the
60-second window means the same thing in both languages.

The kept sources share one weight between all of them, together with
`lackner`, which is the same kind of material: the split stays Blum 0.5,
Swartz 0.2, Red Sea 0.3 however many clips the search returns.
