# Filters, in plain English — `/mosh-lab/filters`

ffmpeg has about four hundred video filters in this build and documentation
for all of them. The documentation is not the problem; it is written for
someone who already knows. `lagfun` is "slowly update darker pixels", which is
true and tells you nothing about the comet tail you get. So this is the other
reference: a plain name, one sentence about what the filter does **to the
picture**, and a before/after you can look at before you add it.

## What is in it

`config/ffmpeg-filters.plain.json` — one entry per video filter in the build:

```json
{
 "name": "lagfun",
 "plain": "Let the bright parts linger",
 "group": "Time (speed, echo, repeat)",
 "what": "Bright pixels fade out slowly while dark ones update at once, so anything light leaves a comet tail behind it.",
 "hand": true,
 "options": [
  {"flag": "decay", "plain": "How long the tail lasts",
   "hint": "Close to 1 almost never fades.",
   "ends": ["no tail", "never fades"],
   "type": "float", "min": 0.0, "max": 1.0, "default": "0.95", "hand": true}
 ]
}
```

`ends` is the part that matters: what the two extremes of a slider mean in
words, not just numbers. `"hand": true` means a person wrote it.
`"hand": false` means it came out of `ffmpeg -h filter=<name>` automatically
and nobody has read it; those are shown with a `rough` badge, filter and
option alike, so you always know which words to trust.

| | filters | options |
|---|---|---|
| hand-written | 92 | 477 |
| generated, marked rough | 304 | 1,651 |
| **total** | **396** | **2,128** |

The hand-written set is the one this work reaches for: colour, blur, distort,
time, edges, glitch, crop — including every filter in the brief (`tblend`,
`lagfun`, `chromashift`, `rgbashift`, `datascope`, `pixelize`,
`shuffleframes`, `random`, `noise`, `geq`, `displace`, `lenscorrection`,
`hue`, `curves`, `colorbalance`, `erosion`, `dilation`, `tmix`,
`minterpolate`, `setpts`).

## Grouped by what it does, not by its name

Alphabetical order only helps if you already know the word. The eight groups
are Color · Blur & sharpen · Distort & warp · Time (speed, echo, repeat) ·
Edges & shapes · Glitch & noise · Cut & crop · Everything else. A hand-written
filter is filed by hand; a generated one is filed by keyword and carries
`group_guessed: true`, because a guess among eight groups is still a guess.
Inside a group the hand-written ones come first.

## The thumbnails

`public/mosh-lab/filter-thumbs/<name>.webp` — one 322×90 image per filter:
frame 100 of a Journey version on the left, the same frame with the filter
applied at its own defaults on the right.

Two details make it work on filters a naive "grab one frame" cannot touch.
The filter runs over a 101-frame clip, not over one frame, because `tblend`,
`lagfun`, `tmix` and `minterpolate` have nothing to do until they have a
history. And the output is written with `-update 1`, so every frame overwrites
the same file and what survives is the *last* frame out of the filter — the
only way to take "the frame at the end" from something that changes how many
frames there are (`framestep`, `fps`, `random`, `reverse`).

258 of 396 filters have one. The 138 that do not, with the reason recorded in
`filter-thumbs/index.json`:

| | why |
|---|---|
| 71 | hardware-only (`_opencl`, `_vulkan`, `_cuda`, `_vaapi`, `_qsv`, `_d3d12`) — needs a GPU device set up first |
| 30 | a source filter (`color`, `cellauto`, `smptebars`) — there is no "before" |
| 26 | ffmpeg refuses the filter's own defaults without an argument |
| 6 | produced no frame at its defaults |
| 4 | structural — named below |
| 1 | timed out past 25s (`elbg`) |

89 of the 92 hand-written filters have one. The three that do not are
structural and say so: `haldclut` needs a real lookup-table image as its
second input, `extractplanes` sends each channel out as its own video so there
is no single "after", and ffmpeg will not write a still out of `pixscope`.

## Rebuilding

```
.venv/Scripts/python.exe scripts/build_filter_plain.py          # the words
.venv/Scripts/python.exe scripts/build_filter_plain.py --check  # what drifted
.venv/Scripts/python.exe scripts/build_filter_thumbs.py --jobs 6
node scripts/verify-filter-book.mjs                             # the page
```

`build_filter_plain.py` keeps every `"hand": true` entry already in
`config/ffmpeg-filters.plain.json`, so that file is the copy to edit and the
generator only fills the gaps. `--check` writes nothing and reports anything
hand-written that this build does not have — it is how `pixelscope` was found
to be called `pixscope` here.

The hand-written seed itself lives in `scripts/filters_hand.py`, which is where
new descriptions go before anything is in the JSON.

## The page

`/mosh-lab/filters`, served from `app/api/filters/route.ts`, which imports the
JSON so there is no second copy anywhere.

The plain name is the heading and the ffmpeg name sits beside it small, grey
and monospaced, with the raw help on hover — there when you need to type it,
out of the way when you are deciding. Click a filter into the chain and its
sliders carry the plain labels; the `rough` ones are folded behind a
disclosure. **Output command** stays what it always was: the real ffmpeg line,
with only the options you actually changed.

```
ffmpeg -i in.mp4 -vf "lagfun=decay=1,rgbashift=rh=6" -c:a copy out.mp4
```

A filter that takes more than one input says so and the panel notes that the
chain needs `-filter_complex` rather than `-vf`.

`scripts/verify-filter-book.mjs` drives it in a real browser and checks the
reader's claims rather than the JSON's: the groups are in order, hand-written
filters come first, a slider's ends are words rather than numbers, the command
changes when a dial moves, a second filter chains onto the first, a thumbnail
decodes, and no request failed. That last one caught a real bug — the page
used to ask for all 396 pictures before the index of which ones exist had
arrived, and answered 140 of them with a 404.
