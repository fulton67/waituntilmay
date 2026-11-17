# Oct 14 injection reel: how the before/after arrows were chosen

**Consent = yes since 2026-11-17 (DECISIONS 16d).** The rule: an arrow or highlight goes only where a change is actually visible. No improvement is invented (clinic brief; DECISIONS 9: spots are measured, not hand-placed).

## The pair

- **Before:** IMG_3637 at 16.83 s (4:42 PM, before any injection).
- **After:** IMG_3656 at 12.17 s (4:55 PM, right after the filler). Both are picked by `brand/scripts/oct14_pairs.py pick`.
- **Not the intro:** in every intro frame her head is turned 24-43 deg toward him (measured yaw, 1 frame a second over the whole clip), while the after clip has her at +1 to +27 deg. The nearest intro/after pair is about 45 deg apart, which is not a fair comparison.
- **Pose difference** of the chosen pair (yaw, pitch, roll): [6.5, 0.4, 0.1] deg. The after frame is aligned to the before frame by rotation and uniform scale only, on stable points (eye corners, nose bridge, forehead). Residual 2.63 px. Face width 219.4 px.
- **Colour:** the displayed frames keep their own colour. A gain-matched grey copy is used only for measuring.

## The measure (per region, an ellipse round her named landmark, sized to her face width)

- **Line depth:** the mean black-top-hat response with a fold-width kernel. Lower = softer line.
- **Shadow:** mean luminance against the forehead. Higher = fuller, catches light.
- **Noise floor:** the same measures between the before frame and four other before frames 1-3 s apart, aligned the same way (the largest of them).
- **A region qualifies** if he names it, it improves by more than 3x the noise floor in the improving direction, **and** the side-by-side crop shows it by eye (`regions_sheet.jpg`, `regions_zoom.jpg`, gitignored).
- **Negative control:** the same rule on two frames of a no-treatment clip (Dr. Ostad's own presenter footage, 25 s apart) flagged 0 of 8 regions.

| Region (image side) | Line depth change | noise | Shadow change | noise | Passes 3x | Eye check | Decision |
|---|---|---|---|---|---|---|---|
| nasoL | +0.66 | 0.29 | +7.53 | 6.12 | no | no softening at this point; a puncture mark right after injecting reads as a deeper line | no arrow |
| marioL | +0.27 | 0.17 | -0.07 | 4.91 | no | no change | no arrow |
| lipCL | +1.56 | 0.64 | -2.47 | 3.57 | no | puncture/redness at the mouth corner | no arrow |
| jawL | +0.23 | 0.10 | -3.94 | 5.04 | no | no change visible | no arrow |
| cheekL | +0.30 | 0.01 | +19.42 | 4.49 | yes | visible: the outer cheek contour is fuller and catches more light; small injection marks | **arrow** |
| malarL | -0.24 | 0.21 | +15.89 | 6.18 | no | brighter (2.6x noise) but below the 3x rule; the visible fullness is captured by the cheek region | no arrow |
| nasoR | +0.29 | 0.84 | -14.63 | 0.08 | no | no measured softening | no arrow |
| marioR | +0.50 | 3.79 | -4.22 | 8.84 | no | no change | no arrow |
| lipCR | +1.11 | 2.10 | -11.55 | 2.01 | no | no change | no arrow |
| jawR | -1.72 | 0.04 | -15.16 | 10.22 | yes | not visible as a change: his gloved hand behind her head in the before frame sits in this region's background, so the line-depth drop is the glove edge, not her jaw | no arrow |
| cheekR | +0.89 | 0.62 | -12.01 | 22.06 | no | no change | no arrow |
| malarR | +0.30 | 0.20 | -35.24 | 3.15 | no | shadow change is the glove in the before background | no arrow |
| chin | +0.28 | 0.27 | +0.36 | 10.18 | no | no change | no arrow |

## Result

- **One arrow: "Fuller cheek"** on her image-left cheek, which he treated with Evolysse Form (IMG_3641 / IMG_3642). It is measured (shadow +19.4 against a noise floor of 4.5) and visible.
- **No arrow on the laugh lines, marionette lines or jawline,** although he names all three in his summary:
  - At 4:55 PM, minutes after the cannula, the laugh lines show no measured softening, and the left one carries a puncture mark.
  - The jaw change measured on the right is his glove in the before frame's background.
  - His words stay in the audio and captions as his account. The graphics do not illustrate them, and the card says "Immediately after the filler. Individual results vary."
- **No arrow on the upper face either.** The neuromodulator (IMG_3657, 16:57) was injected after the after clip, and he says its results take a day or two.


## v3 surgeon markup: every mark mapped to a clip (2026-11-17)

Each X is a needle tip seen in an injection clip. It is located by face landmarks at that moment (MediaPipe, nearest frame with her face within 1 s), carried to the before frame (IMG_3637 at 16.83 s) by the same landmark offset, and drawn in treatment order. Error = landmark-fit residual + spread across frames. Target < 15 px. Result: max 12.0 px, all 8 marks under 15 px.

| Mark | Order | Product | Seen in | Anchor | Before-frame px | Error px |
|---|---|---|---|---|---|---|
| cheekR-a | 1 | Evolysse Form | inj1 @ 2 s, tip (505, 968) | landmark 137 + (13.3, 1.6) | (120.4, 901.7) | 4.46 |
| cheekR-d | 1 | Evolysse Form | inj1 @ 8 s, tip (515, 968) | landmark 50 + (2.0, -9.4) | (162.6, 874.3) | 5.34 |
| cheekR-c | 2 | Evolysse Form | inj1 @ 26 s, tip (500, 950) | landmark 227 + (3.9, -8.7) | (105.9, 869.5) | 4.44 |
| cheekL | 3 | Evolysse Form | inj3 @ 4 s, tip (487, 937) | landmark 280 + (-5.9, -0.5) | (292.6, 872.0) | 12.03 |
| lowerR | 4 | Evolysse Smooth | inj7 @ 10 s, tip (537, 946) | landmark 212 + (3.2, 6.0) | (189.0, 942.8) | 10.0 |
| chin | 5 | Evolysse Smooth | inj7 @ 60 s, tip (515, 940) | landmark 149 + (2.8, -0.5) | (199.6, 993.1) | 3.28 |
| jawL | 6 | Evolysse Smooth | inj7 @ 100 s, tip (555, 1130) | landmark 400 + (9.4, 4.7) | (290.5, 988.4) | 3.47 |
| crowL | 9 | Neuromodulator | neuro @ 92 s, tip (335, 778) | landmark 447 + (-5.1, -1.8) | (291.8, 862.9) | 6.05 |

Not drawn as an X (no landmarks while his hand covered her face):
- cheekR-b: no face landmarks within 1 s of any annotated frame (her face is behind his hand). Shown as a hatched zone from her landmarks, not as an entry X.
- glabella: no face landmarks within 1 s of any annotated frame (her face is behind his hand). Shown as a hatched zone from her landmarks, not as an entry X.
- corrugator: no face landmarks within 1 s of any annotated frame (her face is behind his hand). Shown as a hatched zone from her landmarks, not as an entry X.

### Arrows on the after (v3)

| Arrow | Measured | Visible | Drawn |
|---|---|---|---|
| Fuller cheek, her right cheek (image left), a straight pointer outward | yes (pair_measure.json: the cheek contour moved outward; see v1 table above) | yes | yes, white, on the glass system |
| Laugh lines | no change measurable at this photo angle | he says softer | no arrow; the note "Laugh lines: softer, he says. This photo angle cannot measure it, so no arrow." |
| Marionette lines, neuromodulator areas | no | no (the neuromodulator shows in a day or two) | no arrow; markup only, faint on the after |

No blue anywhere: the marks are white pen on the photo and ink on glass (client 2026-11-17; LESSONS L5; lint rule PAL).
