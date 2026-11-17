# Oct 14 injection reel: the reusable devices, measured on placeholder media

**NOT FOR POSTING until patient consent = yes.** The devices below were built and measured before the footage arrived. The lab media is synthetic: `brand/scripts/oct14_placeholder.py` draws an abstract mannequin face and numbered "injection" cards, so there is no patient anywhere in it.

- Code: `brand/remotion/src/oct14/` (`look.ts`, `devices.tsx`, `Lab.tsx`). It has its own entry point, `index.ts`, so the shared `Root.tsx` stays untouched.
- Lab: `npx remotion render src/oct14/index.ts Oct14Lab <out> --props='{"item":"pip"|"ba","bare":true,"marks":false}'`.
- Measure: `brand/scripts/oct14_lab_measure.py` writes `lab_measure.json`. It reads decoded frames of the bare pass (graphics on black), the marks-off pass and the full render.
- Stills and renders: `brand/edits/oct14-injection/lab/` (gitignored).

## InjectionPip (`zoom-box-inset` + `windowed-footage` + `arrow-curved-callout` + `tracking-ring` + numbered badge)

At the point he names, the injection clip grows **out of that exact facial point** into a 380×676 window on the opposite side of the frame. A ring marks the point, a numbered badge pops, his words for the point type under the window, and a curved callout with a head runs from the window to the ring. On `out` the window collapses back into its point and leaves a numbered ring, so the face builds an index of what was treated. The clip plays muted, with his voice on the main track. The point is a `PtSrc`, so it follows the face track frame by frame.

| Pip | Cue f | Reveal (target cue+1) | 98 % open (`arrive` 99 % at 65 %) | Overshoot | Arrow ink 99 % (head lands cue+18) | Point never covered | Gap window→point |
|---|---|---|---|---|---|---|---|
| 1 | 30 | 32 (+1) | 40 | 0 px | 47 (−1) | yes | 187 px |
| 2 | 110 | 111 (0) | 120 | 0 px | 127 (−1) | yes | 187 px |
| 3 | 190 | 191 (0) | 200 | 0 px | 207 (−1) | yes | 62 px |

"+1" on pip 1 is the frame after the token's start frame (`prog` is 0 on its own start frame), the same reading as DECISIONS 15. Safe area: 0 frames outside x 98–982 / y ≥ 250, not counting the consent flag. Flashes: 0.

## BeforeAfter (`split-labelled` + `stepped-punch-in` + `annotation-box-footage` + `arrow-straight-pointer`)

Two labelled cards ("Before · 4:44 PM", "Right after · 4:55 PM") enter plate-then-picture. Never a slider. For each region where a change is **visible** (chosen and logged in `ARROWS.md`, never invented):

1. Both cards push to the region together and land on the word.
2. The region is outlined on **both** cards (same mark = same place).
3. Everything else dims to 0.45, so the highlight never recolours her skin.
4. A straight pointer rises from the typed label to the outline on the "after" card.

When the camera moves on, the marks leave. At the pull-back every outline returns with its number and a list builds under the cards. The note "Immediately after treatment. Individual results vary." stays on.

| Region | Cue f | Push lands (target cue+1) | Outline 10 % (token: cue+1 → +3) | Pointer ink 99 % (head lands cue+18) |
|---|---|---|---|---|
| 1 | 70 | 71 | 74 | 86 |
| 2 | 140 | 141 | 144 | 155 |

- Plate: f7 against the cue+1 of f6, which is the same token-start reading.
- Never static: the minimum 1 s grey change inside a card during holds is 0.80, against the 0.16 lint threshold.
- Safe area: 0 violations. Flashes: 0.

## Checks

- `lint_compositions.py brand/remotion/src/oct14/*.tsx`: PASS, 0 dot-and-line.
- `tsc --noEmit`: no errors in `oct14/`.

## Changes made while measuring

- The before/after push first landed 10 f *after* its word. It now starts 25 f early and lands on the word +1, so the outline draws on a still picture (MOTION §3 long build).
- The region ellipses were drawn with a −90° rotate, which swapped rx/ry against the dim mask. The rotate is gone.
- Marks stayed up through the next push and overlapped the next label. They now leave when the camera leaves.
- The pip badge stayed at the open box while the window collapsed. It now rides the window.
