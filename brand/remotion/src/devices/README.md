# devices/

Reusable on-screen devices for the Ostad edits. Measured proof is in `research/ostad/style/exomind/ARROW_TYPE_PROOF.md`. The lab composition is `ArrowTypeLab` in Root.tsx.

| File | What |
|---|---|
| `Arrow.tsx` | the arrow system: tapered strokes with real heads, drawn on, alive while held, animated out |
| `TypeEntry.tsx` | 14 text entries rebuilt from the reference study (DEVICE_LIBRARY.md §T) |
| `track.ts` | Ostad's head track: `useTrack`, `follow`, `landmark`, `faceSafeRect` |
| `Markup.tsx` | the older markup set. Its `Pin` and riding-dot `Ring` are dot-and-line and fail the lint, so don't use them for pointing |
| `ArrowTypeLab.tsx` | one device alone on the kit background, for the proof sheets |

## Arrow

```tsx
import { Arrow } from "./devices/Arrow";

<Arrow variant="curved-callout" from={{ x: 1180, y: 300 }} to={{ x: 1460, y: 520 }} start={188} end={262} />
```

| Prop | Meaning |
|---|---|
| `from`, `to`, `via[]` | Points in composition px. Each can be a point or a `(frame) => point` function. |
| `start` | First frame of the draw. The head lands at `start + draw` (see the table below). |
| `end` | Last visible frame. The exit runs over the 7 frames before it, so give the arrow at least `draw + 7` frames. |
| `color` | Defaults to `tokens.json` `color.text`. Pass the YT blue for the active state. |
| `weight` | Defaults to 2 × kit `hairline` (4.62 px). The tail is always kit `rule` (1.5 px). |
| `bend` | Curvature as a share of the chord. The sign picks the side. |
| `label` | A ReactNode. It sits behind the tail, or rides beside the tip for `route-trace`, `arc-connector` and `marker-tick`. |

**Head tracking.** Point at his face by passing a `follow()` function as `to`. The tail and tip are pinned, and only the interior breathes, so the tip stays on the landmark.

```tsx
const track = useTrack();
const temple = track && follow(track, "templeL", LAYERS.keyed);
{temple && <Arrow variant="curved-callout" from={{ x: 1500, y: 860 }} to={temple} start={188} end={262} />}
```

| variant | draw (24 fps) | head | shaft | exit | reference |
|---|---|---|---|---|---|
| `curved-callout` | 7 f | open V | solid taper, bend 0.32 | tail erases | GMu3 f395–401 |
| `straight-pointer` | 7 f | rounded triangle | solid taper | tip retracts | WZ f926–933 |
| `bracket-pointer` | 7 f | open V | "]" closes from its ends (45 %), then the shaft | tail erases | none in the corpus; `via` = the two bracket ends |
| `route-trace` | 27 f | open V | straight legs, rounded joins, through `via` | tail erases | DDOS f216–250 |
| `arc-connector` | 26 f | rounded triangle | dashed, bend 0.5; the label rides the tip | tail erases | D_bh f1108–1140 |
| `dashed-flow` | 8 f | rounded triangle | dashed, bend 0.3 | tail erases | GMu3 f460–468 |
| `light-ribbon` | 28 f | small V | glowing tapered window on a closed loop through `from`/`via`/`to`; keeps travelling (1 loop / 96 f) | rides on and thins | glp1 f1100–1170 |
| `orbit-arc` | 9 f | open V | arc on a tilted dashed ring centred on `from`, ending at `to`; `bend` = share of a turn; drifts ±4° | tail erases | DYKh5yyPxxg f1200–1264 |
| `marker-tick` | 1 f | rounded triangle at `to`, pointing from→to | none | fades and falls 7 px | WZ f940/944 |

All variants share these rules:
- Draw-on uses `sweep`.
- The head grows over the last 22 % of the draw, so it lands on the last draw frame with no overshoot.
- While held, the shaft breathes ≤ 1.5 px on a 72 f period.
- Nothing is ever cut.

## TypeEntry

```tsx
import { TypeEntry, wordFrames } from "./devices/TypeEntry";

const [check, your, text] = wordFrames([24.16, 24.46, 24.68]); // yt_words.json seconds -> comp frames
<TypeEntry entry="type-word-fade-rise" start={check} text="Check your texts" wordTimes={[check, your, text]} style={{ position: "absolute", left: 760, top: 500 }} />
```

| Prop | Meaning |
|---|---|
| `wordTimes` | Composition frames of the spoken onsets. A word reveals at onset + 1 f. Line entries take one time per line instead: `message-lines` takes [plate, sender, line 1, …], and `orbit-labels` one per label. |
| `exitAt` | Starts the `exit` token (7 f, fade and fall 7 px). `type-letter-stagger-out` uses it to start dropping letters instead. |
| `style` | Goes on the outer box, so position it there. The default face is NHG Display 500, 64 px, in tokens `color.text`. |
| `text` | Split on `\n` into lines. Word and character entries need a string. A ReactNode falls back to a block entry. |

| id | mechanic |
|---|---|
| `type-word-fade-rise` | words rise 6 % H and fade in 5 f (per word with `wordTimes`) |
| `type-rise` | block rises 4.2 % H, settles in 11 f, ease-out |
| `type-slide-side` | slides right 2.8 % H in 9 f |
| `type-scale-pop` | scale 0.95→1 in 5 f |
| `type-card-rise` | white card rises 10.7 % H in 17 f on the measured colin bezier, then keeps drifting 0.15 px/f |
| `type-box-slam` | rises 7 % H + scale 0.85→1 in 4 f, then an ice box wipes L→R behind it in 4 f |
| `type-highlight-sweep` | text static; the ice block sweeps behind it over 16 f (`sweep`) |
| `type-ghost-to-lit` | line set dim (rises 2 % H in 5 f); each word cuts to ink on its onset |
| `type-line-accumulate` | each line cuts on at its first word; words light on their onsets |
| `type-typewriter` | 3.9 characters per frame, linear, no caret, no reflow |
| `type-message-lines` | glass plate (tokens glass radius / blur / alpha) in 4 f, sender row, then lines fade + rise 1 % H in 4 f |
| `type-orbit-labels` | labels (one per line) rise and fan out on an arc: first pair in 3 f, the rest 6 f later |
| `type-name-decode` | asterisks resolve to the characters in seeded random order over 70 f (or up to the last `wordTimes`) |
| `type-letter-stagger-out` | cuts on; from `exitAt` each line loses a letter from its end every 2.4 f |

**Rules.**
- Never use the same entry on two beats in a row (variety_check).
- No word-tied entry starts before its word.
- The 48 f `settle` fade stays off word-tied lines.

Run the lint after any change: `python -I research/ostad/style/tools/lint_compositions.py <file.tsx>`. A new head must carry `data-arrowhead`.
