# Journey to the Center of the Internet — pipeline

Python/ffmpeg work for the piece described in [`concept.md`](concept.md). It
lives outside the Next.js app; the only thing the app owns is the page at
`/journey-to-the-center-of-the-internet` and the manifest it reads.

## The seven-beat arc

The piece is an authored assemblage, not a randomiser. Every version plays the
same seven beats, in the same order, one or two phrases per beat:

| | beat | says | source |
|---|---|---|---|
| 1 | claim | the internet is a real place / tubes / cables under the water | blum |
| 2 | place | physical: building, landing station, ship, sea, cable | blum |
| 3 | control | many-to-many, points of control, search, centralizing | swartz |
| 4 | break | Red Sea cables cut, outage, attack, strike | the Red Sea clips |
| 5 | who | not proxies, their own history, Yemen | lackner |
| 6 | doubt | "not a series of tubes" / no internet to know if the internet's broken | blum |
| 7 | return | a beat-1 line again, a different take than beat 1 took | blum |

Which source speaks in which beat is part of the arc rather than a weighted
draw, because the argument only works as those voices in that order. No source
speaks two beats running except the two pairs the arc is built on — the claim
and the place it names, the doubt and the claim again.

A beat may say one thing or two. Beats 4 and 5 always say two: the cables
being cut and who cut them are where the piece argues rather than asserts, so
the break is reported twice and answered twice. The rest carry a second phrase
when there is room for one, which there usually is — eleven phrases in thirty
seconds, a cut every 2.7s against the 4.3s of the version this replaced.

The slots are therefore not equal. The planner draws the phrases, trims to
exactly 720 frames at word boundaries — never inside a word, never below a
1.5s floor — and hands whatever is left out as breath at the end of each beat.
Trimming costs about 0.4s a phrase; the breath is about six frames a version,
where the equal-slot renderer held 182.

`config/beats.json` is the piece. An entry is one contiguous `in`/`out` of one
source and the renderer plays exactly that — nothing re-derives it — so the
file can be edited by hand and the edit is the edit. `scripts/build_beats.py`
overwrites it, so hand edits belong in version control.

## The clip bank

The piece used to go to the tape on every render: thirty versions meant thirty
passes over a 54-minute talk and fifteen news clips, and anything applied to
the footage was applied thirty times over. The pools are small — 103 distinct
phrases, 5.5 minutes of tape — and every version is a permutation of them, so
the tape is cut once and everything expensive happens per clip.

```
.venv/Scripts/python.exe scripts/build_bank.py    # cut 103 clips, 5.5 min
.venv/Scripts/python.exe scripts/bank_env.py      # each clip's word envelope
node scripts/shade_bank.mjs                       # apply journey/look.json
.venv/Scripts/python.exe assemble_bank.py --seeds 1-30 --outdir renders_bank
.venv/Scripts/python.exe scripts/verify_arc.py --dir renders_bank
```

A version is then a stitch of frames that already exist: no seek, no decode,
no look. Measured on this machine, 7.5s a version — 0.1s to plan and gather,
2.6s for the clean cut, 4.8s for the datamosh and the final encode.

## The look

`journey/look.json` is what the footage is wearing, and `/mosh-lab/tune`
writes it with **publish look**. Two files sit beside it and are not the
look: `journey/look-nofeather.json`, the control the feather is measured
against, and `journey/look-dream.json`, the demonstration on
`/mosh-lab/compare`. Each differs from the published look in exactly one
group, which is what makes the difference between two shades attributable. Nothing else decides what the piece looks
like, which is the point: the sliders are the control surface and the file is
what they produce.

Shading a clip is the whole look, in the two halves that already existed:

* **the layers**, through ffgac and ffedit and `scripts/lib/mvfield.mjs`.
  Layer A is the clip's own motion vectors multiplied by a gain built from its
  word envelope times the damage curve — about 1 where nobody is speaking, 20
  on a concept word. Layer B is a fold of the clip answering the same field
  with a longer memory and a block of spatial smoothing. Layer C is the clip
  untouched.
* **the composite**, which is `/mosh-lab/tune` itself, driven in render mode
  over that clip's manifest. Same page, same WebGL programs, same config, so
  the preview and the shaded bank cannot drift apart — there is one
  implementation and two ways of driving it.

The curve and the envelope are read across each clip's own length, so a clip
that says "cables under the water" peaks on its own words and a clip with no
concept word in it stays calm. The one keyframe a clip gets is at its head,
which is what makes the expensive half cacheable: the two ffgac encodes, the
pixel-domain fold and the two ffedit exports depend only on the clip and live
in `bank/prep/<id>/`. Moving a slider changes the gain, not the footage, so a
re-shade pays for the amplify, the response, the decode and the composite and
nothing else.

Measured over the bank: 103 clips, 7988 frames, about 20 ms a frame in the
composite. One dial is new and sits above the rest — **underlayer strength**,
0 for the footage untouched and 1 for the look at the strength every other
dial describes. It is one blend against layer C applied last, so it can be
taken to nothing without changing the shape of anything above it, and the two
transitions ride on top of it at any setting.

## The feather

The damage map is a mask on the macroblock grid, so before this the edge
between a glitched area and a clean one was a cut line: the fold showed
through a 16-pixel rectangle and stopped dead at its boundary, which on a
face reads as a sticker rather than as damage.

The feather is a ring of blocks around the damage, one to three wide, that
does to its neighbours what the two transitions do to a whole frame —
duplicate P-frame data. A coded block is a pair, a motion vector and a
residual; decoding that pair where it does not belong is what a datamosh
is. A ring block has no useful pair of its own, because the background did
not move — measured on `blum_00324115`, half the coded blocks carry under
half a pixel — so it borrows its damaged neighbour's and holds it for a few
frames, most at the inner edge and none at the outer.

Three passes, two of them at block resolution:

* **DMGSEED** — is there any damage in this block at all, sixteen taps a
  block so a 4px cell cannot hide.
* **RINGMV** — how far is this block from damage, which direction is the
  damage in, and what is the longest vector among the blocks in reach. One
  7×7 gather rather than a dilation chain: 920 block-pixels, and it gives a
  true Euclidean distance, which matters because the distance sets the hold.
* **FEATHER** — one sample of the pass's own previous output, displaced, mixed
  with this frame's picture by a weight of `1 - 1/N`.

It spreads because it is recursive and it reads the previous frame: a block
at distance 1 takes the damage's content, and on the next frame a block at
distance 2 takes distance 1, which is already carrying it. The bloom crawls
outward one step a frame, which is what a bloom does in a stream with its
keyframes removed.

Two decisions inside it were measured rather than chosen, and both were
wrong the first time:

* **Whose field.** The first version repeated the field the bloom uses,
  which is B's. B is a leaky integrator with a 3×3 blur over it and comes
  out about a fifth of A's length — 0.31 px at the 90th percentile against
  2.59. Repeating a fifth of a pixel repeats nothing: it moved the band's
  gradient by 1.6%. The surface's field is what the damage was made with, so
  it is sent to the page as a second motion binary and the feather reads
  that one.
* **Read between the blocks, not from them.** Reading the ring field per
  block gives every pixel of a block the same hold, which is a step at the
  block boundary — a new hard edge one macroblock out from the one being
  softened. Measured, it put **43.7% more** gradient in the band than the
  control. The pixel pass interpolates the ring field by hand, and the same
  frames then came out **15.3%** softer.

`scripts/verify_feather.py` shades one clip twice — the published look and
`journey/look-nofeather.json`, which is the same file with the ring and the
hold at zero — and compares them where the pass says it acted, using the
ring map the GPU itself wrote through `shade_bank.mjs --rings`:

```
the three frames with the hardest edge in the control
  frame   band px   |grad| off    |grad| on     change
      4     18760       10.137        8.176    -1.961  (-19.3%)
      9     29968        9.764        7.872    -1.892  (-19.4%)
      7     22712        9.747        7.250    -2.497  (-25.6%)
  all 101 frames                 8.578        7.265    -1.314  (-15.3%)

beyond the ring             9279968 px   61.63 dB   (JPEG spill included)
beyond it by a whole MCU    7383752 px   85.97 dB   868 px differ at all
```

The PSNR is reported twice because the bank is stored as JPEG and JPEG does
not have pixels, it has 16×16 MCUs: change one and every pixel sharing its
MCU re-quantises, which is a fact about the codec and not about this pass.
Excluding the pixels that share an MCU with the skirt, 868 pixels of 7.4
million differ at all, and the gate is 45 dB.

## How fast it moves

Everything in the look that advances does so per FRAME - the squares' cycle,
the fold's walk, the filaments in the inside look, the bloom's smear, the
feather's hold, the stretch population - so at 24 frames a second the whole
thing churned at one rate, and calming it meant reaching for six dials at
once and getting them to disagree. **Distortion speed** is one number in
front of all of them.

It is not the transport's playback rate, which slows the picture. This slows
what is done to the picture: the speech, the cuts and the two transitions
keep their own time. Each kind of term gets the rescaling that belongs to
it - a cycle read off the frame index gets a scaled index, a per-frame
geometric decay `d` becomes `d^speed` so its half-life in seconds stays
put, a displacement per frame is multiplied, and the stretch simulation is
stepped fewer times rather than stepped differently, so it is the same
population seen slowly rather than a different one. The motion field it
reads is still the current frame's: a stretch born in slowed time should
follow the picture in front of it.

Measured on one clip, 101 frames, at 1.00x against 0.25x:

| | 1.00x | 0.25x |
|---|---|---|
| frame-to-frame difference | 4.063 of 255 | **2.310** |
| damage blocks flipping a frame | 23.6 of 920 | **12.1** |

The flips halve rather than quarter, and that is the dial working rather
than failing: a block also enters and leaves the damage because the voice
opened a reveal or because the footage moved, and neither of those is on
this clock.

## The dream slot

Off in the piece, built and measured, and the four dials travel with the
look the way the exchange's do — `scripts/dream_fold.py` reads them through
`scripts/shade_bank.mjs`, because by the time a frame reaches WebGL the
dreaming has already happened.

It runs on **the fold**, before the fold is encoded as layer B. Not on the
footage, which would turn the whole frame into wallpaper, and not on the
composite, which would repaint every pixel and leave the damage map meaning
nothing. Dream the fold and the dream appears exactly where the grain
already is, because the exchange only lets B through where the two layers
disagree.

DeepDream is a gradient ascent, and an ascent from a slightly different
start lands somewhere else, so run frame by frame it boils. Before dreaming
frame *f*, the previous dreamed frame is warped along the clip's own
exported vectors — `cleanA-mv.json`, the same field the surface is built
from, so there is one motion field in the pipeline and not two — and
blended into the input. Measured on `blum_00324115`, mean absolute
frame-to-frame difference in the still regions, where any difference at all
is the dream boiling rather than the picture moving:

| | flicker, of 255 |
|---|---|
| no warp | 15.807 |
| warp 0.6 | **6.514** |
| the fold underneath, for scale | 2.165 |

GoogLeNet, which is the network DeepDream was written against; depth walks
its ten blocks from `conv3` (weave and edges) to `inception5b` (eyes, dogs).
On the 3050 at 640×360 it costs **0.245 s a frame** at full size and 0.247
at half, so the half-size path exists as a dial for a larger frame and is
not the default — the card is not the bottleneck at this geometry.

`/mosh-lab/compare` has the clip four ways: the fold, the dreamed fold, the
look over it, and the look over the dreamed one.

The tuning lab plays it too. Dreaming is a CUDA pass and the page is a
shader, so the four dials describe what gets baked; the lab clip has one
bake kept beside it - its fold picture, through `dream_fold.py`, which is
the order the bank builds in - and the DeepDream switch swaps the underlayer
to it. The whole stack is then visible rather than described: the fold at
the bottom, the dream over it, the look on top, with the fold dial deciding
how much of the frame the Julia map takes. `refs/stack-fold-dream-look.png`
is that grid - the published fold at 0.5 and the fold at maximum, each
without the dream and with it.

## Publishing a look

Pressing **publish look** writes `journey/look.json` and queues a re-layer.
`scripts/relayer.mjs` does the rest: shade the bank, assemble the same thirty
seeds, run every gate, encode for the web, upload to `journey-arc-<hash>/` and
flip `journey-arc/manifest.json` to it. The flip is a manifest write rather
than a deploy — the manifest holds absolute URLs, so each look gets a prefix
of its own while the address the player knows never changes, and the previous
manifest is kept beside the new one as `manifest-<hash>.json`.

The lab is public and the machine that can render is not, so there are two
ways in. In development the button spawns `scripts/relayer.cmd` here and now.
In production there is no ffglitch and no writable repository, so the look and
a job go to Blob and `scripts/relayer.cmd --job blob` picks them up — hourly,
registered by `scripts/register-relayer-task.ps1`, exiting in under a second
when nothing is queued. Either way the lab polls `/api/journey-look` and shows
the stage: queued → shading n/N → assembling n/30 → uploading → live.

## Layout

```
concept.md                     the piece
config/beats.json              THE ARC: 7 beats, a hand-editable pool each
config/sources.json            the source pool: id, weight, enabled, duration
config/triggers.json           trigger words (the old randomiser's; unused by the arc)
config/tag_guide.md            the tagging authority, shared by every source
config/ffmpeg-filters.plain.json   every video filter in plain English
sources/<id>/source.mp4        normalised footage, 640x360 @ 24fps   (gitignored)
sources/<id>/transcript/       words.json, phrases.json, padded, srt, txt
sources/<id>/tags.json         the tags for that source's phrases
scripts/                       transcription, tagging, and verification tools
journey/look.json              THE LOOK: what /mosh-lab/tune published
pipeline/beats.py              the arc, the draw, the pools
pipeline/bank.py               the clip bank and the plan for one version
pipeline/mosh_cuts.py          the two real datamoshes
pipeline/media.py              frames/audio/assembly, per-source room tone
assemble_bank.py               THE RENDERER: a version, stitched from the bank
assemble.py                    the equal-slot renderer it replaced (lab only)
randomize.py                   the five-beat randomiser before that (lab only)
scripts/build_bank.py          cut every phrase out of its source, once
scripts/bank_env.py            each clip's own word envelope and concept hits
scripts/shade_bank.mjs         apply the look to every clip, once
scripts/relayer.mjs            publish a look: shade, assemble, upload, flip
scripts/verify_look.py         what the look did, against the same cut unshaded
bank/clean/<id>.mp4            the cut phrases                     (gitignored)
bank/prep/<id>/                the vector cache a re-shade reuses  (gitignored)
bank/look-<hash>/<id>/         the shaded frames                   (gitignored)
renders_bank/                  v_<seed>.mp4 + v_<seed>.json        (gitignored)
renders_arc/                   the equal-slot renders              (gitignored)
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

## No overlay

There is no "CAM 03", no clock, no REC and no numbers anywhere on screen. The
surveillance burn-in is gone and `pipeline/overlay.py` is no longer called by
anything that ships.

"It is gone" is a claim about pixels, so it is measured on pixels:
`scripts/overlay_check.py` samples 48 frames and counts, per corner region,
the pixels that are both bright (luma > 170) and unchanging (sd < 6) — which
is what burned-in text is and what footage of a person is not. Calibrated by
re-applying the old filter to one render:

```
region          overlay on    overlay off
top-left                90              0
top-right               37              0
bottom-left             51              0
```

The timecode's digits move, which is why the top right counts fewer; the
colons and the box edge are what is left of it. Across the shipped 30, at both
640x360 and the 1280x720 web encode, every region is 0.

## Two real datamoshes, and nothing else

The damage is at two cuts and no others: into beat 4, where the cables are
reported cut, and into beat 5, where someone says who did it. Frames 309 and
412 of 720. There is no escalation curve and no trigger word; `pipeline/mosh.py`,
`pipeline/moshv2.py` and `pipeline/composite.py` — the ffgac
amplify/underlayer/exchange look — are **off in production** and stay in the
lab behind `randomize.py` and `/mosh-lab/tune`.

The mechanism is classic I-frame removal. The clean edit is re-encoded to a raw
MPEG-4 Part 2 stream with keyframes forced exactly at the cut and exactly
`bloom` frames later (12–24, seeded). At the cut the I-VOP is taken out of the
picture and the incoming clip's first P-VOP plays in its place: a P-VOP is
motion vectors and a residual against whatever is in the reference buffer, and
what is in the buffer is the last frame of the *previous* clip. The new shot's
motion drags the old shot's pixels. The P-VOPs after it compound that, any GOP
keyframe inside the window is replaced by the P-VOP before it so the smear is
not cut short, and the forced keyframe at cut+bloom ends it in one frame.

It is replaced rather than deleted because the frame count is a gate — deleting
would make the render 718 frames. Replacing produces exactly what deleting
produces, plus one extra repeat of that first motion step, and keeps 720.

`scripts/mosh_evidence.py` proves it from the streams, not from the log
(render with `--keep-streams`):

```
I-VOPs: clean 62, moshed 58
  cut  clean  moshed   recover  clean  moshed
  309      I       P       330      I       I
  412      I       P       425      I       I

frame        clean |mv| (mb)       moshed |mv| (mb)
  309   I-VOP, no forward mv       0.383  (920/920)    the cut
  310       0.383  (920/920)       0.383  (920/920)    the donor it now plays

frames differing from the clean stream: 34 of 720, runs [(309,329),(412,424)]
```

Nothing is pitch-shifted anywhere in the audio path. The voice is cut from the
source and copied through the remux untouched (`-c:a copy`), and the breath
holds carry each source's own room tone at its own pitch —
`media.quietest_window` finds the quietest 1.5s of each source that is not
digital silence (six of eighteen sources have passages of literal zero, and
argmin landed on them: swartz −270 dBFS at 0s, lackner −270 dBFS at 817s).
Measured floors range −29 dBFS (houthi-17, a clip with a bed under it
throughout) to −78 dBFS (houthi-15).

## Verification

```
.venv/Scripts/python.exe scripts/verify_arc.py --dir renders_arc
.venv/Scripts/python.exe scripts/overlay_check.py --dir renders_arc/web
.venv/Scripts/python.exe scripts/mosh_evidence.py renders_arc/v_1.json
node scripts/mosh-codec-audit.mjs
node scripts/verify-journey-live.mjs
```

`verify_arc.py` gates: 30.000s ±1 frame, 720 frames, A/V drift <1 frame, all
seven beats in order with one pick each and the slot filled exactly, the
return never beat 1's own pick, no source two beats running outside the arc's
own pairs, A/V locked (picture source == voice source over the same span,
checked between the two lists the renderer writes separately), no overlay
pixels in any corner region, and exactly two mosh cuts at frames 309 and 412
with a 12–24 frame bloom that recovers on a keyframe. It exits non-zero on any
failure, and `scripts/grow_pool.py` calls the same `check_render`, so a version
that joins the rotation overnight has cleared the same bar.

## Which pool is live

`journey-arc/` — the 30 seven-beat versions, seeds 1–30.

One line in `components/JourneyPlayer.tsx` decides, and it moves the live Blob
manifest and the bundled fallback together:

```ts
const POOL = process.env.NEXT_PUBLIC_JOURNEY_POOL ?? "journey-arc";
```

`journey-multi/` (the five-beat randomiser, 29 versions) and `journey/` (the
original single-source pool, 61 objects) are still on Blob under their own
prefixes, untouched — uploading to one prefix never touches another — so
switching back is that one line, or `NEXT_PUBLIC_JOURNEY_POOL=journey-multi`
with no code change at all.

To rebuild the live pool from scratch:

```
.venv/Scripts/python.exe scripts/build_beats.py
python assemble.py --seed 1 --count 30 --outdir renders_arc
.venv/Scripts/python.exe scripts/verify_arc.py --dir renders_arc --no-text
.venv/Scripts/python.exe scripts/build_web.py --src renders_arc \
  --out renders_arc/web --height 720 --crf 24 --scale-flags neighbor \
  --budget-mb 8.0
node --env-file=.env.local scripts/upload_blob.mjs --prefix journey-arc \
  --src renders_arc/web --manifest public/journey-arc/manifest.json \
  --mix renders_arc
node scripts/mosh-codec-audit.mjs
node scripts/verify-journey-live.mjs
```

Only versions that pass every gate ship: move a failure out of the renders
directory before encoding. `--mix` reads each version's `source_mix` into the
manifest, which is what lets `verify-journey-live.mjs` prove a version from
every source actually decodes in the live page rather than just one.

The nightly job (`scripts/register-pool-task.ps1`, 03:00, idle + AC only) runs
`assemble.py` and the same gates before a version joins the rotation. It no
longer starts a dev server: the old mosh drew one of its layers with a WebGL
shader and needed a browser and a GPU every night, and this one needs nothing
but ffgac.

## The randomiser this replaced

Everything from here to the end describes `randomize.py`, which `assemble.py`
replaced as the production renderer. It still works, it still builds the
composite look, and it is the only way to reach that look; it is just not what
ships.

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

### Verifying a randomiser render

```
.venv/Scripts/python.exe scripts/verify_renders.py
```

Checks source <=30s, output 30.000s +/-1 frame, A/V drift <1 frame, 720 frames,
and >=1 trigger per render. Exits non-zero on any failure so it can gate a
re-run. It also prints the reassembled phrase text in order, and every splice.

### Web encoding and upload

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

### Which pool was live before

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

### The picture is locked to the voice

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

### Cuts read as an exchange

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

### Every version says the word

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

### A source that is not in English

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
