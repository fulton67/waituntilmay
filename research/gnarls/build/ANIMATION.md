# Gnarls animation timing (24 fps)

These are frame-level starting numbers for the rig in `blender/rig.py` and `blender/face_rig.py`. They come from the
sources listed at the end. Where a number is our own derivation (the physics, the volume formula, the mouth proxies),
the text says so. Treat every value as a first pass that you then tune by eye.

**Conventions.** Frames are 1-based at 24 fps (1 f = 41.7 ms). Rotations are in **world axes, matching `rot_world`**,
with the front facing −Y and the character's left (fin_L) on +X. The signs below were checked against the house poses:
- **Y = roll in the frontal plane.** A raised fin is **fin_L Y −** and **fin_R Y +** (cheer_jump uses −68 / +68).
- **X = pitch.** X − tilts back and looks up; X + nods forward and down.
- **Z = yaw.** Z + turns toward the character's left.

`s` is the vertical scale of the trunk (root or hips). The horn has no bone: it rides `head`. It is a rigid tusk, so it
only follows through with the head and never bends. The glasses are a separate object; if they ever get their own
offset, give them a 1 f lag and at most 0.005 units of bounce on impacts.

---

## 0. Shared rules (apply to every table)

### 0.1 Squash and stretch with volume preserved (derived)
Keep volume constant: `scale_xy = 1/sqrt(s)`.

| s (z) | 0.78 | 0.80 | 0.85 | 0.92 | 0.97 | 1.00 | 1.04 | 1.10 | 1.15 | 1.20 |
|---|---|---|---|---|---|---|---|---|---|---|
| x = y | 1.132 | 1.118 | 1.085 | 1.043 | 1.015 | 1.000 | 0.981 | 0.953 | 0.933 | 0.913 |

Scale about the base (between the flukes) so the contact point stays planted. The limits for this toy-like design are
**s 0.78 to 1.20**. Values past that read as rubber, not vinyl.

### 0.2 Overlap delays (successive breaking of joints, Williams)
When the trunk (`root`/`hips`) changes direction on frame N, each part reaches its own change later:

| Part | Delay | Amplitude vs. driver | Settle after body stops |
|---|---|---|---|
| spine, chest | +0 to 1 f | 100 % | with body |
| head (+ horn, glasses) | +1 to 2 f | 60 to 80 % of chest pitch | +2 to 3 f |
| fin_*_1 | +2 f | arcs out 10 to 20° past rest | +4 f |
| fin_*_2 | +3 f | +30 % over fin_1 | +5 f |
| fin_*_3 (tip) | +4 f | +50 % over fin_1 (whip) | +6 f |
| tail1 | +2 f | 6 to 12° | +4 f |
| tail2 | +3 f | 1.3 × tail1 | +5 f |
| fluke_L / fluke_R | +4 to 5 f; offset L and R by 1 f from each other | 15 to 25° flap | +6 to 8 f |
| brows | lead the mouth by 2 to 4 f (see 0.5) | | last facial part to settle: +2 to 4 f after the body |

### 0.3 Easing (Blender `Keyframe.interpolation` and `easing`)
| Use | Interpolation |
|---|---|
| Poses, holds, face controls | `BEZIER`, auto-clamped handles. Use slow-in and slow-out on every key unless a row below says otherwise. |
| Ballistic rise, takeoff to apex | `QUAD` + `EASE_OUT`. This is exactly a gravity parabola. |
| Ballistic fall, apex to contact | `QUAD` + `EASE_IN` |
| Launch and impact frames | Sharp in, no ease into the contact frame: put a Bezier handle *into* contact, never an ease-out. |
| Overshoot settle (twirl stop, fin arrival) | `BACK`, easing `EASE_OUT`, back ≈ 1.2 to 1.7, or keyed overshoot plus Bezier. |
| Pure turntable | `LINEAR` + a Cycles F-curve modifier |
| Never in motion | `CONSTANT`. The house 2-key holds (A7) are for stills only. |

Moving holds: never hold dead still for more than 8 f. Drift 1 to 2° or `s` ±0.01 across the hold.

### 0.4 Blink rules
| Blink | blink_L/R per frame (start to end) | Frames | When |
|---|---|---|---|
| Regular | 0, 0.6, 1, **1**, 0.6, 0.25, 0 | 7 | Head turns of 30 to 90°, a new thought, keeping a hold alive |
| Fast | 0, 0.6, 1, 0.5, 0.15, 0 | 6 | Impacts, being startled, an object passing the face |
| Long | 0, 0.4, 0.8, 1, **1**, 0.75, 0.45, 0.2, 0.05, 0 | 10 | Long or slow turns (>90°), a change of mind |
| Bat | 0, 0.75, 0.35, 0 | 4 | Coy or cute beats |

These follow Bloop's counts: regular = close 2, hold 1, open 3; fast = close 2, open 3; long = close 3, hold 2, open 4.
Additional rules:
- **Head turns.** The eyes dart toward the turn 2 to 3 f *before* the head moves. The blink starts on the first frame
  of head motion and is fully closed through the fastest middle of the turn. The eyes reopen already looking at the
  new target, before the head arrives.
- **Accents.** The lids reach fully closed 3 to 4 f *before* an accent such as a takeoff or a landing (Johnston, rule
  11). Eyes also move 3 f ahead of an accent (rule 10).
- **Asymmetry.** Lead with one lid by 1 f. Either side is fine; offset_L = 0, offset_R = +1 f.
- **No fixed timer.** Space idle blinks 48 to 144 f apart, randomized, with an occasional double blink (two regular
  blinks 2 f apart).
- **The lids follow the pupils.** When look_z < −0.3, add blink 0.2 to 0.3. When look_z > +0.5, add brow_raise +0.15.
- **No blink on closed eyes.** Skip blinks while happy_L/R > 0.5; the eyes are already closed.
- **Eye darts.** Use 3 frames: start, one in-between at about 70 % of the way, end. A new point of interest takes 3
  to 4 f. Never animate look_x or look_z as a slow drift between targets.
  - For reference, a saccade lasts about 1 to 3 f.
  - Hold each dart target at least 6 f.

### 0.5 How the face sequences around the body
- **Order.** Eyes, then brows, then mouth, then body. The thought is born in the eyes (Johnston, rule 6).
- **Change the expression before or after a big body move, not during it** (Johnston). Where both must happen, push
  the face change to the anticipation or the recovery.
- **Lead, lag and follow-through.** Brows lead the mouth by 2 to 4 f. On a landing, the face lags the body: brows dip
  1 f after contact. Brows overshoot about 0.1 to 0.15 past their target and settle over 4 to 6 f.

### 0.6 Keeping the mouth from popping
- **Interpolation.** Key every mouth control `BEZIER`, never `CONSTANT`.
- **Minimum transition times.** A change of ≥0.3 takes at least 3 f. A change of shape class (open↔round,
  smile↔frown, smirk side flip) takes at least 5 f.
- **Speed limits per frame** (max |Δ|):

  | Control | mouth_open | mouth_smile | mouth_wide | mouth_round | mouth_smirk |
  |---|---|---|---|---|---|
  | Max \|Δ\| per frame | 0.25 | 0.20 | 0.20 | 0.20 | 0.15 |

- **Continuous width and area.** Calibrate these proxies by measuring the rendered mouth mask; the coefficients are
  ours, not from a source:
  - width `W = 1 + 0.35·wide + 0.15·smile − 0.45·round`
  - area `A = open·(0.6 + 0.4·W) + 0.1·max(smile,0)`
  - Assert that |ΔW| and |ΔA| per frame stay ≤ 0.12. Better still, measure the pixel width and area of the mouth
    mask in the render and assert < 8 % change per frame.
- **Compensation.** When mouth_open falls, raise mouth_wide by about half of the drop, so the area hands over instead
  of collapsing. When mouth_round rises, ramp mouth_wide down over the same frames. Keep `wide ≤ 1 − 1.5·round`.
- **Overlap shape changes.** For example, a wide grin turning into an "O":
  - frames 0 to 4: wide goes 0.5 → 0, open goes 0.4 → 0.6;
  - frames 2 to 7: round goes 0 → 0.8.
  - Never have one control fall while another rises on identical keys with no overlap.
- **Smirk flips.** A smirk sign flip (−↔+) must pass through 0 with smile ≥ 0.2 holding the mouth open in width.

---

## 1. Jump in place (48 f, about 2 s)

**Physics (derived).** With 1 unit treated as 1 m and g = 9.81, an object falls `d(n) = 0.0085·n²` units in the n-th
frame after the apex. This is Garcia's "1/3 inch × n²" at 24 fps. It gives the odd-number rule (spacing 1:3:5:7) and
"fourth down at half time": the top 25 % of the height takes half the airtime, which is the built-in hang time.

**Height and hang time vs. height.** Airtime = 2·sqrt(2h/g).

| Height h | Airtime |
|---|---|
| 0.15 | 8.4 f |
| 0.31 | 12 f |
| 0.42 | 14 f |
| 0.60 | 16.8 f |

**Chosen arc.** h = 0.31 units, 6 f up and 6 f down. Height above rest, per airborne frame:

| Frame | 17 takeoff | 18 | 19 | 20 | 21 | 22 | 23 apex | 24 | 25 | 26 | 27 | 28 | 29 contact |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| root z | 0 | .094 | .171 | .230 | .273 | .298 | .307 | .298 | .273 | .230 | .171 | .094 | 0 |

For more cartoon float, add 1 to 2 frames at the apex (±0.003). Never add more than 2 f: the arc goes floaty and the
weight is lost.

| Phase | Frames | Trunk (root/hips) | Fins / tail / flukes / head | Face |
|---|---|---|---|---|
| Hold | 1–4 | rest, s 1.00 | rest; breathing s ±0.01 | Neutral. 3 to 4: look_z dart to +0.35 (eyes to the "target" above) |
| Anticipation down | 5–12 | Ease in-out to **s 0.82** (xy 1.104). root z −0.05. hips X +6 (lean in). head X +8, lagging 2 f | fin_L_1 Y +25 / fin_R_1 Y −25 (fins drop and swing back), fin_*_3 follows +4 f. tail1 X +10, flukes press flat | 3–6 (brows lead): brow_angry 0 → 0.35, squint 0 → 0.3. 5–10: mouth_smile 0.2, mouth_wide 0 → 0.35, mouth_open 0 (lips pressed, effort) |
| Crouch hold | 12–14 | **s 0.80** (deepest at 13), moving hold | fins keep settling 2 to 3° | 11–15: regular blink, fully closed on 13–14 (3 to 4 f before takeoff) |
| Launch | 15–17 | Fast, sharp into 17: s 0.80 → **1.18** (xy 0.920). hips X +6 → −4 | Fins whip up, peaking at 19 (+2 f lag): fin_L_1 Y −45 / fin_R_1 Y +45, fin_3 at 20. Flukes leave the ground last (fluke X −20, pointing down), 1 to 2 f drag | 15–17: brow_angry → 0, brow_raise 0 → 0.7, squint → 0. mouth_wide 0.35 → 0.25 while mouth_open 0 → 0.45, smile → 0.6 (open replaces width) |
| Rise | 17–23 | `QUAD EASE_OUT`. Stretch decays 1.18 → 1.00 by 21, → 0.97 at apex 23 | Fins float up to −55/+55, fin_3 trails. tail tucks (tail1 X −8), flukes trail +4 f | brow_raise → 0.85 at 21. mouth_open 0.6, smile 0.85. sparkle 0 → 1 over 19–22. pupil_small 0.15 |
| Apex / fall | 23–29 | `QUAD EASE_IN`. s 0.97 → 1.00 at 25 → **1.10** at 28, 1.08 at 29 (stretch toward the ground) | Fins lag going down, still raised at 27 (drag up). tail and flukes swing down to brace by 28 | 25–26: look_z eases +0.35 → −0.4 (eyes to the landing, 3 to 4 f ahead). brow_raise holds 0.85 |
| Impact | 29–31 | Contact at 29 (s 1.08, sharp in). **s 0.78** at 31 (xy 1.132). hips X +5 | Fins keep falling past rest, peaking at 32 to 33 (fin_L_1 Y +15). head nods X +6 at 31 to 32 (+1 to 2 f; the horn dips). Flukes splay ±12° at 30 | 29–34: fast blink, closed at 30 to 31 (lag 1 f). squint 0.5. brow_raise 0.85 → −0.15 by 31 (1 f behind). mouth_open 0.6 → 0.3 while wide 0.25 → 0.5 (area kept) |
| Rebound | 31–36 | s 0.78 → **1.04** at 35 → 0.99 at 38. Bezier, overshoot | Fins rebound up 8° past rest at 36 and settle by 42. head X −3 at 35. tail and flukes overshoot then settle by 44 | 32–36: happy 0 → 1 (^ eyes), squint → 0, mouth_smile → 1.0, open 0.35, wide 0.35. brow_raise −0.15 → 0.5 at 37 (overshoot) |
| Settle | 36–48 | s 1.00 by 41, moving hold | Everything at rest by 44 to 46 | brow_raise 0.5 → 0.35 at 42 (the last part to settle). happy 1 → 0.6 at 44 to 48. sparkle 1 → 0.5. mouth eases to smile 0.8, open 0.25 |

**Rule of thumb (Williams and teaching sources):** the anticipation (8 to 10 f) is about as long as or longer than the
time it takes to rise. Impact to rest is 3 to 4 × the squash duration.

---

## 2. Arm moves

### 2a. Wave, character's right fin (fin_R; raised = Y +). 52 f.
| Phase | Frames | fin_R chain | Body / tail | Face |
|---|---|---|---|---|
| Notice | 1–6 | rest | head tilts toward the camera, Z ±5 | 1–3: look dart to camera. 2–5: brow_raise 0 → 0.45 (brows lead). 4–8: mouth_smile 0 → 0.7 |
| Anticipation | 5–8 | fin_R_1 Y −8 (dips), fin_R_3 Y −10 | chest Y +2, leaning away from the wave | regular blink 5–11 (thought change) |
| Raise | 9–16 | fin_R_1 Y −8 → **+75** at 15, overshoot to 80 at 16. fin_R_2 +20, lag 2 f. fin_R_3 +10, lag 3 f | chest Y −4 toward the wave side (+2 f). head X −4 (lifts). fin_L drifts Y +5 | 10–16: mouth_open 0 → 0.3, smile → 0.85. sparkle 0 → 0.6. happy 0 → 0.35 |
| Wave cycles | 17–40 (2 × 12 f) | Rock fin_R_2 Y ±18 about +20, period 12 f. fin_R_3 Y ±28, same period, **lag 2 f** (whip). fin_R_1 Y ±4, lead 1 f | head roll Y ±3, counter-phase, lag 2 f. tail1 Z ±4, lag 4 f. flukes ±6, lag 5 f. s 1 ± 0.015 per beat | Hold. Brows bob +0.05 on each outward beat, lag 1 f. Mouth steady; no flapping |
| Lower | 41–48 | fin_R_1 → Y −4 at 47 (undershoot) → 0 at 50. fin_R_3 lags 3 f | chest and head back to rest, lag 2 f | 41–46: happy 0.35 → 0.6, mouth_open 0.3 → 0.15, wide +0.1 (compensation) |
| Settle | 48–52 | rest | rest by 52 | brow_raise 0.45 → 0.3 by 52 |

The friendly range is 10 to 14 f per back-and-forth. Use 8 f for an excited wave, 16 to 18 f for a lazy one.

### 2b. Two-fin cheer. 44 f. End pose = cheer_jump.
| Phase | Frames | Fins | Body / tail | Face |
|---|---|---|---|---|
| Anticipation | 1–8 | fin_L_1 Y +20 / fin_R_1 Y −20 (down and in), fin_*_3 curl ±15 | s → 0.92 (xy 1.043). hips X +4. tail1 X +6 | 1–4: brow_raise → 0.4, squint 0.2. 3–8: mouth_smile 0.4, wide 0.3, open 0 (lips pressed). 4–10: regular blink, closed at 6 to 7 (accent at 11) |
| Thrust | 9–12 | fin_L_1 Y +20 → **−78** / fin_R_1 → **+78** at 12 (overshoot). fin_*_2 ∓15 lag 1 f. fin_*_3 lag 2 f | s 0.92 → 1.12 at 11. Optional hop: root z +0.04 at 13 (quad up/down, contact at 17). root Z +12 (cheer_jump) | 9–13: brow_raise → 1.0, squint → 0. mouth_open 0 → 0.8, smile → 1.0, wide 0.3 → 0.4. happy → 1 at 13 |
| Settle | 13–18 | Back to −68/+68 at 16. fin_3 snaps at 17 | s 1.00 at 15, landing squash 0.94 at 17 if hopped | brow_raise 1.0 → 0.9. sparkle 0 → 1 over 13–16 |
| Pumps | 19–34 (2 × 8 f) | fin_*_1 ±10 (down beat on 19 and 27, up on 23 and 31), fin_*_3 lag 1 to 2 f ±15 | s 0.97 on each down beat. tail1 X ±6, lag 3 f. flukes lag 4 f | mouth_open pulses 0.8 → 0.65 → 0.8 per pump (no deeper; keep it ≤ 0.25 per frame). brows +0.05, lag 1 f |
| Release | 35–44 | Fins down to rest, overshoot +6 past rest at 42 | s 1.0 | happy 1 → 0.7. mouth_open 0.8 → 0.3 over 35–42 while wide 0.4 → 0.55. brows → 0.45 |

### 2c. Point / present, fin_L at a target to the character's left. 54 f.
| Phase | Frames | fin_L chain | Body / head | Face |
|---|---|---|---|---|
| Eyes find the target | 1–4 | rest | rest | 1–3: look_x dart to +0.7 (3-frame dart). 2–5: brow_raise_L 0.6 / _R 0.3 |
| Head turns | 4–10 | rest | head Z +18, lag 3 f after the eyes. chest Z +8, lag 2 f after the head | 4–10: regular blink 4–10 (the turn rule). mouth_smirk 0 → +0.35 (toward the target) |
| Anticipation | 8–13 | fin_L_1 Z +15 / Y +10 (draws back and down), fin_L_3 curl +20 | chest Y +3, away | mouth_smile 0.4, open 0 |
| Thrust | 14–18 | Thrust to fin_L_1 Z −55, Y −35 (out and up), fin_L_2 Z −20, fin_L_3 straight. Overshoot 5° at 18 | chest leans Y −4 toward the target | 14–18: brow_raise_L → 0.7. mouth_open 0 → 0.25 ("ta-da"). sparkle 0 → 0.5 |
| Settle | 18–24 | Back to pose by 22. fin_L_3 settles at 24 | head settles at 22 | |
| Present hold | 24–44 | moving hold: 1° drift, a tiny 2° tip flick at 34 | tail Z ±3, slow | 28–31: look_x dart from +0.7 to 0 (back to the audience). Head follows Z +18 → +8 over 30–36. smirk 0.35 → 0.5, smile 0.7. Regular blink on the look-back (29–35) |
| Release | 44–54 | Back to rest, 3 f lag on fin_3 | head and chest to rest | smirk → 0.2, brow_raise → 0.3 |

**Two-fin present.** The end pose is the rig's `presenting` (fin_L_1 Z −55 Y −15, fin_R_1 Z +55 Y +15, fin_*_2 ∓20).
Keep the timing above, but use the anticipation from 2b (both fins draw in) and centre the face (look_x 0,
brow_raise_LR 0.6, mouth_open 0.35, smile 0.9).

---

## 3. Twirl (360° on the spot, turning to the character's left = root Z +). 40 f.
| Phase | Frames | root Z (cumulative) | Body | Fins / tail / flukes / head | Face |
|---|---|---|---|---|---|
| Hold | 1–4 | 0 | rest | rest | 2–4: look_x dart to +0.6 (into the turn) |
| Wind-up | 5–12 | 0 → **−30** (counter-turn) | s 1 → 0.92. chest Z −8 more (twist, lag 1 f) | Fins wrap the other way: fin_L_1 Z +20, fin_R_1 Z +20, fin_*_1 Y lowered 10. tail1 Z +10, lag 3 f | 4–8: brow_raise 0.3, smirk +0.3, smile 0.6. Mouth stays closed (open 0.1) |
| Coil hold | 12–14 | −30 | s 0.92, moving hold | fins settle 2° | 11–14: regular blink starting, so the eyes are closed at 14 to 15 as the spin starts |
| Spin | 15–27 | −30 → **+372** (overshoot) | s 0.92 → 1.06 at 17 (rising on the flukes, root z +0.015). Bezier: 2 f slow-out, peak about **45°/frame** around 20–23, slow-in to 27. Use motion blur | head leads +15° at 15–18, then trails −10° by 25 to 27. **Fins fly out:** fin_L_1 Y −35 / fin_R_1 Y +35 at 20 to 24 and drag −20° in yaw, lag 2 to 4 f. tail swings out and lags 4 f, flukes flutter ±15 (lag 5 f, L and R offset 1 f) | 15–27: **happy 1** (^ closed, joyful; this covers the turn blink). mouth_open 0.1 → 0.5, smile 0.9, round 0.15 ("wheee"). Keep wide ≤ 0.4 while round is on |
| Overshoot settle | 27–33 | 372 → 358 at 31 → 360 at 33 (`BACK` or keyed) | s 1.06 → 0.96 at 29 → 1.0 at 33 | Fins still swinging: they pass rest at 30, overshoot the other way 10° at 32, settle at 37. tail and flukes settle at 38 to 40. head trails 2 f | 27–30: happy 1 → 0, eyes open with sparkle 0 → 1. brow_raise 0.3 → 0.75 at 29 (lag 2 f) → 0.5 at 35. round → 0 while wide 0.2 → 0.4 over 27–32 (5 f class change). smile 1.0, open 0.3 |
| Finish | 33–40 | 360 | rest | everything at rest by 40 | look_x 0 (to camera) by 32. A small head tilt Y ±4, "ta-da", at 34 to 38 |

- **Spin speed.** 360° in 10 to 13 f reads as a twirl; 16 to 20 f reads as a casual turn. Above about 50°/frame
  the spin strobes. Then either add motion blur, or put 2 smear frames with fins stretched 1.15 along the travel.
- **Faster face beats.** The back of the head faces the camera around frames 19 to 22. That is the safest place for
  the biggest face change, but still key it continuously.

---

## 4. Turnaround (360° turntable, showing the back, with a glance over the shoulder). 176 f, about 7.3 s.
The head is most of the body, so a "glance over the shoulder" combines a partial root counter-turn with a head yaw.
Together they bring the face to about 110 to 120° from the camera, a ¾-back view. Push look_x to full so the near eye
reads.

| Phase | Frames | root Z | Head / chest | Fins / tail / flukes | Face |
|---|---|---|---|---|---|
| Front hold | 1–12 | 0 | breathing s ±0.01, period 72 f | rest | neutral smile 0.4. 9–11: look_x dart to +0.5 (into the turn) |
| Turn to the back | 13–64 | 0 → 180, Bezier slow-in and slow-out (peak ≈ 5.5°/frame) | head leads +8° for the first 6 f, then lags −6° on the slow-in at 58 to 64 | fins lag 3 f, drag 5°. tail1 Z −8 while accelerating, +6 overshoot at 66 to 70. flukes lag 5 f | 13–22: **long blink** (the turn is > 90°), closed through 16 to 18. look_x returns to 0 by 20. The face turns away from about 90° (frame 38) |
| Back hold | 64–80 | 180 | moving hold, s ±0.01 | flukes do a slow wiggle ±8° (L and R offset 3 f) | (hidden; keep the controls continuous and at rest) |
| Glance anticipation | 80–84 | 180 → 184 (away) | head X +3 (dips) | tail ±3 | 80–82: look_x pre-set full toward the camera side (−1 or +1, whichever side faces the camera) |
| Glance | 84–92 | 184 → **125** (back toward the camera, ease-out) | head Z −30 relative, lead 2 f. chest −10, lag 2 f. hips lag 4 f | fins swing 6°, lag 3 f. tail counter-swings 8°, lag 4 f | 84–90: regular blink, closed at 86 to 87 (mid-turn). Reopens at 88 already looking at the camera |
| Glance hold | 92–110 | 125 (drift ±1) | head tilt Y 4°, "knowing" | flukes flick once at 100 | 90–96: smirk 0 → 0.55, brow_raise near-side 0.6 / far-side 0.15, squint 0.2, sparkle 0.6. Optional wink: blink on the near eye only, regular timing, 100–106 |
| Glance away | 110–118 | 125 → 180 | head leads back, 2 f | lag 3 f | 110–116: regular blink on the turn. smirk 0.55 → 0.2 over 6 f |
| Turn to the front | 118–164 | 180 → **362** (overshoot) → 360 at 170 | head arrives 2 f early | tail overshoots and settles at 174 | Face visible again from about 270° (frame 140). 150–158: eyes dart to camera, then a long blink at 152–161 (a fresh "hello" beat). smile 0.8, open 0.2, brow_raise 0.4 |
| Settle | 164–176 | 360 | rest | rest | happy 0.4, sparkle 0.5. Idle blinks per 0.4 |

**Pure model-sheet turntable** (no acting): 192 f per 360° (1.875°/frame), `LINEAR` + Cycles, rest pose and idle
breathing only. Blink only on irregular idle timing (0.4), never at a fixed interval.

---

## 5. The 12 principles, mapped to this rig
| Principle | What it means for Gnarls |
|---|---|
| Squash and stretch | s 0.78 to 1.20, volume kept (0.1). Squash on crouch and impact, stretch on launch and fall |
| Anticipation | 6 to 10 f opposite move before every main action (crouch, counter-turn, fin draw-back) |
| Staging | Key poses read in silhouette at yaw −35 (primary ¾). Fins clear of the body outline at the extremes |
| Straight ahead / pose to pose | Pose to pose for the body. The physics arc is computed per frame (table 1) |
| Follow-through and overlapping action | The delay chain in 0.2. The face follows through last |
| Slow in / slow out | Bezier on poses. `QUAD` on ballistics (0.3) |
| Arcs | Fin tips and fluke tips trace arcs. Check them with motion paths on grip_* and fluke_* |
| Secondary action | Tail and flukes, brow bobs, breathing. Never louder than the primary action |
| Timing | The frame counts above. Small amounts of hang time and holds sell the weight |
| Exaggeration | Push poses 10 to 20 % past realistic, but within the toy limits |
| Solid drawing | Keep the volume constant. No crossing or inter-penetrating fins |
| Appeal | Asymmetry (offset L and R by 1 f, brows uneven in smirks), clear expressions |

---

## Sources
- Thomas, F. & Johnston, O., *The Illusion of Life: Disney Animation* (1981), the 12 principles:
  https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation
- Johnston's rules on eyes and expressions (3 f ahead of accent; blink closed 3 to 4 f ahead; change the expression
  before or after a body move):
  https://www.flong.com/archive/blog/2009/johnstons-rules-of-expressions-for-eyes-and-time-travel/index.html
- Lasseter, J., "Principles of Traditional Animation Applied to 3D Computer Animation", SIGGRAPH 1987:
  https://doi.org/10.1145/37402.37407
- Williams, R., *The Animator's Survival Kit* (Faber, 2001/2009), jumps, weight, successive breaking of joints:
  https://en.wikipedia.org/wiki/The_Animator%27s_Survival_Kit
- Garcia, A., "Principles of Animation Physics", SIGGRAPH 2012 course (1/3 inch × n² fall rule, odd rule, fourth
  down at half time): https://doi.org/10.1145/2343483.2343496. Interview: https://www.animatorisland.com/?p=3319
- Garcia, A. & Bousquet, M., *Physics for Animators* (jump timing, landing chapters).
- Squash in the crouch and recovery, stretch in the jump and fall:
  https://courses.cs.washington.edu/courses/cse459/10wi/content/html/exercises/animation_principles.html
- Squash at the apex and on impact in games: https://www.gamedeveloper.com/production/the-12-principles-of-animation-in-video-games
- Blink and dart frame counts (regular 2/1/3, fast, long 3/2/4; 3-frame dart): https://www.bloopanimation.com/blinking-animation/
- Blinks driven by head turns and thought, not a timer: https://www.animationmentor.com/?p=10065
- Blink of about 8 f, offset the lids 1 f: https://animationapprentice.blogspot.com/2018/03/why-animators-need-to-blink.html
- Blink on any change of eye direction: https://animationapprentice.blogspot.com/2020/09/do-animated-characters-need-to-blink.html
- Osipa, J., *Stop Staring: Facial Modeling and Animation Done Right* (eyes and brows carry the emotion):
  https://www.oreilly.com/library/view/stop-staring-facial/9780471789208/pt03.html
- Lee, Badler & Badler, "Eyes Alive" (saccade timing): https://www.cis.upenn.edu/~badler/papers/EyesAlive.pdf
- Blender keyframe interpolation and easing enums (`BEZIER`, `QUAD`, `BACK`, `EASE_IN`/`EASE_OUT`):
  https://docs.blender.org/api/current/bpy.types.Keyframe.html
