# Ostad video kit

The still kit, animated. Everything is 1080 × 1920 at **24 fps** (`tokens.json` → `video.fps`, motion rule 8), and every value comes from `../tokens.json`. Rebuild with `scripts/video_kit.cjs`, `video_lottie.py`, `video_reel.cjs` and `video_sheet.py`. The overview is `sheet.png`, and the 10 s demo is `reel.mp4`.

## Building a 15–60 s short

| when | element | file | rule |
|---|---|---|---|
| 0–3 s, optional | title card per family (editorial, clinical, event, guide) | `elements/card-*-title.mp4` | Text reveals live **only** on cards |
| first 0.5 s of the first shot | lower third (name, role) | `elements/lower-third.webm`, `lottie/lower-third.json` | Sits directly above the caption band, so it can overlap captions |
| whenever he speaks | caption, one line, cut on and cut off | `elements/caption.webm`, `lottie/caption.json` | Box top at **74.6%** of height (`video.caption-band-top`, feed band 74.6–78.7%); one spoken phrase per line |
| when a treatment is named | chip | `elements/chip.webm`, `lottie/chip.json` | Top of the safe area (13.0% of height) |
| between shots | cut, or a 12-frame dissolve | `transition-dip-paper`, `transition-glass-wipe` | Dissolve = 500 ms; no other transitions on footage |
| last 2.5–3 s | end card | `elements/card-*-end.mp4` | Dissolve in over 12 frames |

Reveals (`reveal-*`: fade-rise, line-stagger, word-stagger, mask-up, blur-in, tracking) are for headlines on cards and paper grounds, never over footage.

## Footage

- **Lock the camera, and do not add zoom or push-ins to filmed footage** (motion rules 1–2). One take per story. In longer reels, a shot runs at least 4.5 s.
- Grade with **`ostad_treatment.cube`** (a copy of `../treatment.cube`: the feed → board LUT; saturation ×0.49, lifted blacks, no clipped whites). Then add grain at 6% overlay (σ 0.0026).
- Graphic and product layers may zoom the way the board reel does: zoom in over 1.5 s, hold 2.63 s, zoom out over 2.79 s. Ease in-out, `cubic-bezier(0.65, 0, 0.35, 1)` in and `(0.33, 0, 0.2, 1)` out.

## Glass in the editor

The alpha overlays and the Lottie files carry the glass **tint only**: surface `#c3bdbb` at α 0.613, radius 29.6 px. A transparent file has nothing behind it to blur (DECISIONS 58). In Premiere or AE, put an adjustment layer under the box and blur the footage by **17.8 px at 1080 wide (1.65% of width)**, masked to the box shape. Full-width bands use 54 px at α 0.438. Don't add a rim or a shadow: the board's glass is matte.

## Timing

| token | value |
|---|---|
| enter / enter-slow / exit | 600 / 900 / 300 ms |
| stagger | 90 ms |
| hold-min (designed text) | 2.5 s |
| easing out / in | `cubic-bezier(0.22, 0.61, 0.36, 1)` / `(0.55, 0.06, 0.68, 0.19)` |

These are judgment calls (DECISIONS 57). The fps, the caption band and the zoom shape are measured (`../../motion/RULES_PHASE4.md`).

## Formats

| need | use |
|---|---|
| Premiere or AE with alpha | ProRes 4444 `.mov`. Run `video_kit.cjs` to make them in `_mov/`; they are kept local because of their size. |
| Browser or quick edit | VP9 `.webm` with alpha |
| Frame-exact | PNG sequences in `_frames/` (local) |
| AE, editable | `lottie/*.json` (Bodymovin import) + `../build/ae/ostad_tokens.jsx` + `../build/ae/ostad.ase` |
| MOGRT | Not shipped. Export it from Essential Graphics by hand if needed: there is no scripting route (DECISIONS 57). |

Fonts: Neue Haas Grotesk Display Medium and Roman, through Adobe Fonts (kit `vzz0hgt`).
