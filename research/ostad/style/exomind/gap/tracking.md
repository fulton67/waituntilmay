# Gap: tracking accuracy (YouTube v6, measured on the rendered pixels)

EXOMIND_REDO §4.3, gap agent 5 of 5 (tracking). Measure only: the composition was not touched.

- Render: `C:\Users\naimj\Downloads\Ostad - Exomind and total skin health (YouTube v6).mp4` (1920×1080, 24 fps, 2166 f).
- Data:
  - `gap/tracking.json`: every number below, plus the per-frame arrow rows.
  - `gap/tracking_pip.json`: B12, per frame.
- Tools: `gap/tracking_tools/`, run with the style venv and `-I`.
  - `gap_track.py` makes one pass over all 2166 frames.
  - `gap_pip.py` handles B12.
  - `analyse.py` summarises.

## How this differs from the self-reports

`track_verify.json` and `pip_verify.json` compare the point the composition *intended* (track.json → LAYER6 → offset) with a MediaPipe pass in VIDEO mode. This pass is independent in three ways:

1. **Arrow ends come from pixels.** The brand-blue stroke (#37a9e8, HSV hue 92–108) is found in the render. The arrow's tracked end is the mean of the 4 left-most pixels of the largest blue component.
   - B03 region: x < 820, y < 420.
   - B16 region: x < 1030, y 250–620.
2. **Face landmarks come from MediaPipe Face Landmarker in IMAGE mode** (no temporal smoothing) on the left 960 px of each rendered frame. headTop = foreheadTop + k·(foreheadTop − chin), k = 0.3328.
3. **Overlay over the face is a pixel test against the keyed source, not a second render.** The render is diffed against `presenter_cut_k.webm` (the alpha source, 756×1344 = exactly 0.7×), placed at (−30, −150).
   - Only pixels inside the measured face box or head box, where the keyed layer is opaque (α > 250), are compared.
   - The webm frame is t·1.15·30, ±1 f, taking the best match.
   - A pixel counts as covered when its max-channel difference is over 40.
   - Calibration: the median difference on clean frames is 6 grey levels, and the clean-frame count is 0 at p99. The test is sharp.

Note: the face-anchored end of both callouts is the **tail** (`from`), not the arrowhead. The heads land on cards: B03 on the Mind window, B16 on the "Emotional stress" row. So "tip-to-landmark" here means tail-to-landmark.

## 1. Arrow anchor vs his landmark (spec: median < 6 px, p95 < 15 px)

| Beat | Anchor | Frames (held) | median | p95 | max | signed bias (dx, dy) | Self-report (median / p95) |
|---|---|---|---|---|---|---|---|
| B03 callout #1 | headTop + (0, −24) | 195–255 (61) | **5.12** | **12.80** | **16.06** | (+1.7, −4.0) | 2.07 / 4.14 |
| B16 callout | templeR + (40, −6) | 1662–1702 (41) | 3.80 | 5.50 | 7.73 | (+2.4, +0.1) | 1.84 / 3.04 |
| pooled | | 102 | 4.47 | 11.88 | 16.06 | | |

- **Both pass the spec, but B03 is close to the limit.** Its median is 5.1 of 6. Its p95 is 12.8 of 15, and one frame goes over 15: f218 at 16.1 px. Frames 211–219 and 231–232 run 10–16 px, all during head moves.
- **The self-reports understate the error by 2.5–4×.** The difference is how it's measured. The self-reports use a VIDEO-mode detector, which smooths in time like the One Euro track. IMAGE mode doesn't.
- **The renderer draws exactly where it was told to.** Tail vs the composition's own target: B03 0.51 / 1.02 px, B16 0.42 / 0.90 px (median / p95). All of the error is between track.json and his rendered pixels.
- **Draw-on and exit are expected misses, outside the held frames.** All visible frames: B03 p95 122 px, B16 p95 251 px. The tail erases toward the tip over the 7 f exit, so on those frames the "tail" is no longer at the anchor. That's correct behaviour.

## 2. Registration of the whole edit (every frame he is on the canvas; 2001 of 2009 detected)

| Landmark (render vs track.json → LAYER6) | median | p95 | max |
|---|---|---|---|
| noseTip | 2.93 | 6.29 | 11.86 |
| templeR | 3.43 | 6.13 | 8.63 |
| headTop (derived) | **8.85** | **16.12** | 33.51 |

- **headTop is the weak anchor, and its error is a bias, not lag.** The signed median is (−1.1, **+8.0**) px. Shifting the comparison by ±1–3 f never lowers the error (lag 0: 8.85; best, −1 f: 8.67).
- **Where the bias comes from:** on the 0.7× render, the mesh's foreheadTop sits about 5.0 px lower and the chin about 3.6 px higher than in the track. The rendered mesh is about 2.6 % shorter, matching the interocular scale of 0.987–0.995 in §4.
  - headTop extrapolates that difference by 1 + k. So the self-reported 1.77 px headTop registration does not hold on an IMAGE-mode read.
  - Any device pinned to headTop inherits about ±8 px of definitional uncertainty. B03 already shows it (−4 px vertical bias).
  - The real anatomical landmarks (nose, temple) register within 3 px median.
- **Worst frames:**
  - B17 f1743–1745 (23–34 px): the room crossfades and his face is half covered, so the detector degrades.
  - B15 / B16 starts (f1468, 1518–1543, 1603–1605: about 20–24 px): fast head turns.

## 3. Overlay over his face / head box across the whole video (spec: 0 unless intended)

| Test | Frames over threshold |
|---|---|
| face box, > 200 px covered | **B17 f1741–1745 only** (40k–80k px; the skull crossfade) |
| head box (to headTop), > 200 px | B17 f1741–1745 only |
| any other frame | 0 covered px (p99 = 0 over 1942 tested frames) |

- **Unintended overlap is 0 frames.** The only overlap is inside the logged B17 step-out (f1741–1753). From f1746 he is too faded to detect, so f1746–1849 count as "out", as designed.
- **B03 and B16 are clean.** The B03 tail on his crown and the B16 stroke past his temple never cover a face-box pixel.
- The self-report's 13 frames (1741–1753) are consistent with this. The pixel test fires on the first 5, and after that the face is gone.

## 4. Keyed placement consistency across beats

Per beat, the median of (measured nose − track nose) and of the scale (measured interocular / track interocular), over 19 beats plus the cards:

| Measure | min | max | std across beats |
|---|---|---|---|
| translation dx (px) | −0.80 | +1.92 | 0.68 |
| translation dy (px) | −2.75 (cards) | +0.25 | 0.64 |
| scale vs 0.7× | 0.9869 | 0.9950 | 0.0025 |

- **One placement, held everywhere: pass.** No beat moves him by more than 2 px (2.75 on the cards) or rescales him by more than 0.4 %. There are no jumps at beat lines.
- The 1 % under-scale is the detector effect described in §2, constant across beats, not a placement change.
- Timing: the best webm frame was offset 0 on 1050 frames and −1 on 890, so the presenter clock alternates within one source frame (33 ms). That's normal rounding of startFrom × 1.15. No beat is a full frame out.

## 5. B12 circular PiP (f1185–1241, 57 frames after the pop)

| Measure | Result | Spec | Self-report |
|---|---|---|---|
| face-box centre to circle centre | median 1.3 px (0.50 % of D), p95 6.5 px (2.49 %), max 8.3 px (3.28 %, f1185) | < 4 % | 0.55 % / max 1.49 % |
| circle | Hough r ≈ 128; radial edge median 127.9 | true circle | |
| his pixels outside the circle | **0 on every frame** (grey < 120 in r+14…r+60, tag excluded) | 0 | 0 |
| face height in the circle | 89 px of 256 (35 % of D) | | |

- **Centring passes, with a noisier tail than self-reported.** The max is 3.3 % against the 4 % limit. The worst frames are f1185 (8.3 px, in the pop's settle), f1218 and f1236 (5–6 px; the Hough circle jittered ±5 px on those frames, so part of that is circle-fit noise).
- **New gap the self-report does not catch: the source frame's left edge is visible inside the circle.** At the pip scale (about 0.19×) his source frame's left edge falls at x ≈ 161–170, inside the 260 px circle (its left edge is at x ≈ 92).
  - His right shoulder and scrubs end in a hard vertical line against the dark pip fill, about 60 px in from the rim, on every B12 frame. The step is 15–26 RGB-sum across the edge, visible at 1×.
  - Seen in a crop of f1200: the shoulder is sliced off straight.
  - Geometry: the edge is 310 source px left of his face centre. At s ≈ 0.19 that is about 59 px, while the circle radius is 128.
  - This is a "nothing of him cut" failure inside the circle, even though nothing of him is outside it.

## Top gaps (ranked)

1. **B03's crown anchor is the least accurate thing in the edit.** p95 12.8 px, f218 at 16.1 px (over 15). It rides headTop, a point extrapolated 33 % past the forehead, with an 8 px vertical bias and noise amplified by 1.33×.
2. **The self-reports are 2.5–4× optimistic.** `track_verify.json` should be re-run with an IMAGE-mode (unsmoothed) detector, or this tool, before it's used as a pass/fail gate.
3. **B12 pip shows the source frame's straight left edge** across his shoulder.
4. **headTop registration over the whole edit** is 8.9 / 16.1 px (median / p95), worse than the spec if any future device is pinned to headTop.

## Fixes (for the build agent; not applied here)

1. **Re-anchor B03 callout #1** off the derived headTop onto a measured mesh point: foreheadTop (landmark 10) + (0, −k·faceH − 24), with the bias corrected. Or anchor on templeL/templeR as B16 does, which measures 3.8 / 5.5 px.
   - If the crown must stay, lower the One Euro `min_cutoff` lag only for this anchor, or add the measured +8 px dy correction in `follow()` for headTop.
   - Target: B03 p95 under 8 px, max under 15.
2. **Make `track_verify.py` detect in IMAGE mode** (or run `gap/tracking_tools/gap_track.py`), and gate on the max as well as the p95 (no held frame over 15 px).
3. **B12: hide or fill the source frame's left edge.** Shifting or scaling the plate cannot clear it while keeping him centred.
   - Why not: the edge is 310 source px from his face centre. At s = 0.19 that is 59 px, and the circle radius is 128. The edge only leaves the circle at s > 0.41 (head about 2× too big), or with a 70 px shift (27 % off-centre).
   - Fix options:
     - feather the plate's left 40 px into the pip's dark fill (a linear alpha ramp on the inner layer), or
     - extend the keyed plate with a mirrored and blurred strip of his shoulder, or
     - darken the circle's fill to match the scrubs, so the step drops under about 5 grey levels.
   - Then add a pip check: no straight source edge inside the mask (column-gradient test at the computed frame edge x = cx − s·faceCx_src; see `gap_pip.py`).
4. **Keep the B17 step-out as logged.** No other overlap fix is needed.
