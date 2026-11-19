# Flora anatomy clips, Omni round: QA

Reviewed 2026-11-19. 18 clips in `clips/` (byte-identical to `omni/`): Gemini Omni 1.2 Flash, except U9 (Kling). 24 fps. Frame numbers are 0-based within each clip. The machine-readable version is `qa_omni.json`.

**Method.**
- Every frame was extracted. I read contact sheets every 6 f, then full-resolution crops every 2-4 f around each action.
- Frame-diff scan: d1 = mean |f - f-1|.
- Change maps (blurred |a - b| painted red) show what actually moves.
- ORB similarity fit from f0 to every 3rd frame, for camera moves.
- Eye-band blink test on every clip with an eye: |f - f-3| spikes, a "revert" test, and the iris/lash ink fraction. I also read eye strips every 4 f.

**Results that hold for all 18 clips:**
- **No blinks.** No clip closes an eye. The iris ink fraction stays within about 10 % of its median throughout. This is the big gain over Kling.
- **No cuts or hard jumps inside any clip.**
  - The d1 maximum at f128 in J2, J3, J4, O4, U3 and U8 is an encoder grain refresh. The blurred diff from 127 to 128 is zero (checked on J2).
  - The ORB "zoom" in J1 and O1 is tissue motion. The block and skull edges stay fixed.
  - Real but slow drift: U8 (scale 0.979-1.010, 18 px), J3 (1.8 %, 15 px, returns to start), O2b (9 px pan).
- **No text, letters or watermarks** in any corner. J5 has watercolour stains in its paper, which come from the still.
- **The usual Omni failure is a morph**: a structure dissolves, pops in or un-happens mid-clip. Most FIXes below are that.

## Verdicts

| Clip | Verdict | n | Usable | Key frames | Main problem |
|---|---|---|---|---|---|
| J1 skin block | **PASS** | 144 | 0-143 | dome visible 60 · gel fills fat 84 · dome max 96 · first droplet 102 · drift to 143 | none (beats later than Kling: remap) |
| J2 ageing profile | **FIX** | 144 | 0-143 | fat descent 54 · jowl visible 72 · jowl max 143 | no fat shrink, no bone thinning |
| J3 cannula on cheekbone | **FIX** | 144 | 36-66 | cannula in 10 · tip at zygoma 40 · deposits 44 / 50 / 58 · complete 60 | cheek layer dissolves f18-36; entry lower-medial over the teeth; no lift; hub glitch 68-76 |
| J4 lip migration | **PASS** | 144 | 0-143 | lip gel grows 6 · crosses the border 30 · moustache full 60 | gel sits on the lip surface; lip colour fades |
| J5 golf ball | **FIX** | 144 | 0-72 | ball appears 24 · half 54 · max 108 | bone underlay dissolves f60-96; outline never bulges; glass sphere |
| O1 frown muscles | **PASS** | 144 | 0-143 | onset 66 · bunching 78 · creases 90 · peak 108-143 | f0-60 nearly still |
| O2a deflation | **FIX** | 120 | 0-96 | shrink 0-36 · descent 42 · jowl max 96 | fat blob pops in by the nose f44-90; jowl fades after 102; **hard jump at the O2a→O2b join** |
| O2b restore | **FIX** | 120 | 0-119 | gel appears 28 · complete 84 | on the zygoma (fixed), but no fat rise and no jowl shrink; gel oversized |
| O3 Form vs Smooth | **FIX** (minor) | 144 | 0-82 | Form seed 6 · Smooth seed 18 · Form complete 78 · Smooth max 80 | Smooth sinks, splits and shrinks back f84-100 |
| O4 needle vs cannula | **FIX** (minor) | 144 | 0-143 | pierce 52 · bleed 54 · bruise peak 143 · cannula stops 126 | needle already through the surface at f0; cannula tail floats from ~f90 |
| U1 tear-trough cutaway | **FIX** | 144 | 66-143 | superficial ghost 24-66 · deep deposit 48 · fill complete 100 | a superficial blob inflates then vanishes; deep deposit sits below the rim |
| U3 Tyndall | **PASS** | 144 | 0-143 (hold 114+) | glow 66 · glitter 72-108 · haze settled 114 | glitter particles; no bone landmark |
| U4 needle vs cannula (vessels) | **FIX** | 144 | 0-60 | needle at vein 50 · bleed 52 · peak 120 · cannula meets vein 90 | cannula runs into the vein; needle starts in the skin |
| U5 fan | **FIX** (minor) | 144 | 0-143 (skip a hold on 84-100) | cannula in 20 · at entry 46 · threads 54 / 66 / 90 · fill 96 | entry point jumps f84-96 |
| U6 syringe + lidocaine | **PASS** | 120 | 0-119 | appears 6 · swirl 12 · settled 48 | lidocaine stays a grey ribbon |
| U7 pillowy bag | **FIX** | 144 | 0-74 | swell 0-72 · second pillow pops in 76 · max 102 | a new giant object pops in instead of the deposit swelling |
| U8 needle → bruise | **FIX** (minor) | 144 | 0-143 | contact 28 · pierce 32 · bloom 42 · purple 84 · peak 108 | needle enters at the lash line; slow drift |
| U9 cannula tip | **PASS** | 121 | 0-120 | still | Kling, 1928x1076 (scale to fit) |

**Totals: 6 PASS (J1, J4, O1, U3, U6, U9), 12 FIX.** Four of the FIXes are minor and usable now within the range given: O3, O4, U5 and U8.

Max/median d1 per clip:

| Clip | J1 | J2 | J3 | J4 | J5 | O1 | O2a | O2b | O3 | O4 | U1 | U3 | U4 | U5 | U6 | U7 | U8 | U9 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Max/median d1 | 4.3 | 7.9* | 2.8* | 7.0* | 5.4 | 6.8 | 5.5 | 1.5 | 3.0 | 3.4* | 3.5 | 4.7* | 5.6 | 4.0 | 11.6** | 3.9 | 2.2* | 2.3 |

- \* The max is the f128 grain refresh.
- \*\* The median is tiny (the syringe is static).

None of these is a cut.

---

## Per-clip notes

### J1: PASS
- Gel seed in the fat at f0, growing visibly from about f30.
- The dermis and epidermis dome from about f60, with the maximum at f96. The gel fills the fat layer edge to edge by f84.
- Beads bud off the right edge at f102 and drift down and right to f143. That is the direction of the SVG.
- The layers stay put (the hair follicle and vessels are fixed).
- **Remap for the reel.** Kling's dome came at about f24, so the old map is early. Use:
  - "Stretch?" → f60-96
  - "Overfilled?" → f84-100
  - "Migrates?" → f102-143

### J2: FIX
- **What works:** descent and jowl. The fat drops below the mandible into a jowl/submental mass (f54-143), and the jaw outline sags.
- **Missing beats.** The plate's map is volume → fat → support. The change map for f0-48 shows only outline shimmer, so:
  - The malar/buccal pads never shrink. The "Volume" beat has nothing to show.
  - No bone thins. The "Support" beat has nothing to show.
- The top of the head is cropped by the 9:16 frame, which does not matter.
- **Regenerate**, same start still. Motion prompt:
  > *"First the yellow cheek fat pads slowly shrink to about two-thirds of their size; then they slide downward and gather below the jawline as a jowl; finally the cheekbone and upper-jaw bone outlines become thinner and the eye socket slightly wider. The camera, ear, eye, lips and muscles stay perfectly still. No new skin is drawn over the cutaway."*

### J3: FIX
- **Good:** the three deposits are on the zygomatic body and arch, below the lateral orbital rim, not hugging the rim. They appear in order: f44, f50, f58.
- **Problems:**
  1. **Morph f18-36.** The zygomaticus muscles and the malar fat of the cutaway dissolve. The cheek tissue the cannula should run through disappears.
  2. **Entry.** The shaft comes up from beside the mouth corner, with the hub off the bottom-left of the frame, and it is drawn across the teeth. The intended entry is the lower *outer* cheek.
  3. **No cheek lift.**
  4. **Hub glitch.** The hub vanishes and the shaft breaks f68-76, then the cannula comes back.
  5. **Slow zoom**, 1.8 % and 15 px.
- **If it must be used now:** f36-66 (cannula in, three deposits laid).
- **Regenerate.** Start still: the J3 face with the cutaway kept. Motion prompt:
  > *"A blunt microcannula enters the skin of the lower outer cheek, near the angle of the jaw, and slides upward and outward along the cheekbone. Three small clear gel beads are laid one after another on the bone of the zygomatic body and arch, below the outer eye socket. The cheek fat and skin contour above them lift slightly. The cheek muscles and fat of the cutaway stay drawn the whole time. The cannula is never drawn over the teeth. Camera locked, no zoom."*

### J4: PASS
- The cheekbone beads are static throughout, which is the "stays on the bone" half of the beat.
- Lip gel spreads past the vermilion border f6-60 into a "filler moustache" and holds to f143.
- The Kling clip's muscle-to-skin-lips morph is gone, so **the whole clip is usable** (the old map stopped at f84).
- **Notes:**
  - The gel already sits on the lip at f0, and it reads as a blob on the surface rather than inside the lip.
  - The lip colour fades from dark red to pink by f72.
  - There are no small beads beyond the border.
- Acceptable for the beat.

### J5: FIX
- **Story right:** the ball grows from nothing in the mid-cheek (f24 → max f108), with no cheekbone beads.
- **Problems:**
  - The skull/zygoma underlay dissolves f60-96. By f96 it is a plain face with a ball.
  - The face outline never bulges. The ball is a glossy glass sphere pasted over the cheek.
  - A blush appears on the other cheek.
- **Strike-out:** the ball at f108-143 is centred at about (0.62, 0.53) of the frame, with a diameter of about 0.35 W. Re-measure the `strike` position (the old one, x 0.64 / y 0.69, was for the Kling ball).
- **If it must be used now:** f0-72.
- **Regenerate.** Motion prompt:
  > *"A round lump of translucent gel swells UNDER the skin in the middle of the cheek, below and in front of the cheekbone; the cheek's outer contour line bulges outward over it. The faint skull and cheekbone drawing stays visible the whole time. Nothing else changes colour. Camera locked."*

### O1: PASS
- f0-60 is nearly still. Use it for the label build-in.
- Frown onset at f66. The procerus and corrugator bunch from f78, and forehead creases appear from f90.
- The peak at f108 holds to f143. Put the callouts on that hold.
- No blink. The skull outline is fixed, and the ORB scale is muscle motion.

### O2a: FIX
- The malar fat shrinks slightly (f0-36), then the pads slide down (f42-96) to a jowl at f96. That is the right order.
- **Problems:**
  - **Blob pop-in.** A new fat blob pops in beside the nose at f44, partly outside the face contour, and fades by f90.
  - **The jowl fades.** At f102 it becomes a ghost outline and has mostly gone by f114, so the end state shows *less* jowl than f96.
  - **The chain join is a hard jump.** O2b f0 is 4.4 % larger and 104 px left / 19 px up of O2a f119. The mean diff across the join is 17.6, against 1.1 between frames inside the clip. The fat pads and face lines differ too.
- **If used now:** f0-96, then O2b, with an aligned crossfade.
- **Regenerate** with *"the fat pads only shrink and slide down; no new fat appears; the jowl keeps its size once formed."* Then generate O2b **from O2a's last frame**, not from a separate still.

### O2b: FIX
- **Placement is fixed:** the gel is on the zygomatic body and arch, not under the eye. It appears at f28 and is complete by f84.
- **The restoration is missing:** the fat pads do not rise and the jowl pads do not shrink. They are static.
- The gel is one long oval running from the mid-cheek to the arch near the ear, over the masseter. That is too big.
- **Regenerate**, start image = O2a f96 or the final frame. Motion prompt:
  > *"A compact oval of clear gel swells on the cheekbone below the outer eye socket (a band of bone between it and the socket rim); as it fills, the sagged cheek fat pads slide back UP over it and the fat pads at the jawline shrink. No gel under the eye. Camera locked."*

### O3: FIX (minor)
- **Form is correct:** seed on the bone at f6, a firm dome through the fat to f78, and it holds to f143.
- **Smooth:**
  - It spreads thin in the dermis f18-80, which is correct.
  - Then f84-100 it sinks into the deep dermis, splits into two bands and shrinks back to a thin strip. The "spreads" beat un-happens.
  - The crease above it never softens.
- **Use now:** f0-82, and hold the last frame. Put "holds its shape" on f78 and "spreads thin" on f80.
- **Regenerate** with *"…the right gel spreads into a thin wide layer just under the wrinkle and stays there; the wrinkle above it softens slightly; nothing moves after it has spread."*

### O4: FIX (minor)
- **Needle start:** the tip is already through the stratum corneum at f0. It does then advance visibly to the vessel nick at f52, with the bleed from f54 and the bruise growing to f143.
- **Cannula:** it glides in the upper fat with no bleeding and stops at f126.
  - From about f90 its tail detaches from the frame edge, leaving a floating rod in the fat.
  - The bruise spreads over its path from f96.
- **Usable now** for both halves: "can nick a vessel" from f52, "glides" from f0.
- **For a clean redo:**
  - Start still: the needle tip clearly above the skin surface, with a gap.
  - Add to the motion prompt: *"the needle descends from above the skin, pierces the surface, then nicks the vessel; the cannula's shaft stays continuous to the left frame edge; the bruise stays above the fat layer, away from the cannula."*

### U1: FIX
- **What it should show** is the SectionDiagram "deep" mode: filler on the bone at the infraorbital rim, under the orbicularis, filling the hollow (`devices_v3.tsx`).
- **Superficial blob.** A bluish blob inflates just under the skin at the lid-cheek junction (f24-54), then dissolves (f54-66). It reads as superficial filler that vanishes.
- **Deep deposit:**
  - It grows under the orbicularis f48-100 and stays to the end, which is good.
  - It sits low on the anterior maxilla, well below the rim, not on it.
- **Use now:** f66-143. This loses the "hollow" before-state, so start the card on the still f0 if needed.
- **Regenerate.** Motion prompt:
  > *"Only one deposit: a clear gel deposit grows deep on the bone of the lower orbital rim, under the red orbicularis muscle, and the shadowed hollow at the lid-cheek junction above it fills in and flattens. Nothing appears just under the skin. The deposit stays to the last frame. Camera locked."*

### U3: PASS
- The shallow deposit, just under the skin, turns blue. The deep deposit stays grey.
- The glow starts at f66 and a soft blue haze has settled by f114.
- **Notes:**
  - f72-108 the scatter is drawn as cyan glitter particles, which is decorative. Hold on f114-143.
  - The section has no bone or orbit landmark, so it needs the "Shallow" / "Deep" labels to read.
  - Late drift of about 11 px.

### U4: FIX
- **Needle half is correct:** it advances, nicks the vein at f50, and the bleed blooms f52-120. The tip is already below the surface at f0.
- **Cannula half is wrong:**
  - The vein branch beside the cannula dissolves f0-30.
  - From about f72 the cannula runs along the blue vein, and f90-143 it sits coaxial with the tip in the lumen. It reads as the cannula *entering* the vessel, the opposite of the GlideAnim (whose path bends round the vessel).
- **Use now:** f0-60 only (needle nick, cannula still in the fat).
- **Regenerate.** Motion prompt:
  > *"…the blunt cannula slides through the fat layer BELOW the vessels, its rounded tip pushing a vein gently aside as it passes; the vessels stay intact and separate from the cannula; no blood near the cannula. The needle starts above the skin."*

### U5: FIX (minor)
- One entry point, and the cannula fans out three threads (f54 / f66 / f90) to the tear trough. The trough fills from f96.
- **Problems:**
  - The entry point jumps about 30 px up-right f84-96 and back by f104.
  - A twin ghost shaft shows f24-60.
- **Use now,** but don't hold on f84-100.
- **Redo:** add *"the entry point mark stays fixed; one cannula shaft only."*

### U6: PASS
- The syringe is still. The lidocaine appears at f6, swirls f12-48 and settles as an S-ribbon.
- **Notes:**
  - It never dissolves.
  - It is the same grey as the gel. A faint tint for the lidocaine would help, but the label carries it.

### U7: FIX
- f0-72: the under-eye deposit swells modestly. **Usable.**
- f76: a second, much larger pillow pops in as a pale outline and fills f78-96. A new object appears instead of the deposit swelling.
- End state: a huge glossy kidney over the whole upper cheek, replacing the cheek contour.
- **Use now:** f0-74.
- **Regenerate.** Motion prompt:
  > *"The same under-eye deposit slowly absorbs water and swells into a soft pillowy bag under the lower lid; the skin contour of the lower lid and upper cheek bulges outward with it; no second shape appears; it never extends below the upper cheek. Camera locked."*

### U8: FIX (minor)
- **Timing:** contact at f28, pierce f32, bloom from f42, purple at f84, peak at f108. The colour shift from red to purple with a yellow edge reads well.
- **Problems:**
  - The needle enters the lower-lid margin at the lash line. A physician will object: the entry should be below the lid, at the tear trough or over the rim.
  - Slow drift (2 %, 18 px).
- **Usable now.**
- **Redo** with *"needle enters the skin about 1 cm below the lower lashes, at the tear trough; camera locked."*

### U9: PASS
- Kling, near-still: a blunt rounded tip with a side port, plus a loupe. 1928x1076, so scale to fit.

---

## Prompt rules for every Omni regeneration
- Omni does not blink, so the blink line is no longer needed. **But add:**
  - *"Every structure present in the first frame stays drawn until the last frame; nothing dissolves, pops in, or reverses; camera locked, no zoom or pan."*
- Its failures this round were all morphs: J3, J5, O2a, O3, U1, U4, U7.
- **Chained plates:** generate the second clip from the first clip's last frame. O2a → O2b jumps 4.4 % and 104 px.

---

# Round 2 (omni2/, regenerated with the round-1 prompts + the no-morph rule)

Same method as round 1: contact sheets every 6 f, crops every 2-4 f, change maps, ORB drift, eye strips every 3-4 f. `qa_omni.json` now has a `version` field per id. For the regenerated ids, the top-level fields describe the chosen version and the other round is kept under `omni1` / `omni2`. O2a and O2b are marked superseded by O2.

| Clip | Round 2 | Use | Usable | Key frames (chosen version) | Why |
|---|---|---|---|---|---|
| J2 | FIX | **omni2** | 0-86 | fat reshapes 0 / shrinks 36 · jowl forms 42 · jowl full 72 | f0-86 shows volume and jowl (omni1 had no shrink). **Blink f89-91**, then the cheek muscles dissolve to bare maxilla f90-110. Cut at 86. "Support" (bone thins) is still absent in both rounds. |
| J3 | FIX (minor) | **omni2** | 0-143 | cannula in 14 · tip at lateral rim 63 · beads 65 / 76 / 90 · complete 92 | No tissue dissolve; entry below the jaw angle (lower outer); camera locked. Remaining: the shaft crosses the mandible/teeth f20-60; the cannula pivots f54-88 with a twin shaft f80-92; the top bead sits on the lateral orbital rim; no lift (no cheek tissue in this cutaway). |
| J5 | FIX | **omni2** | 0-86 | ball 30 · half 66 · underlay fades 86 · max 102 | Same failure as omni1 but later: the bone stays visible through the ball until ~f84, then dissolves f86-96. No outline bulge; glass sphere; 14 px drift. Ball centre ~(0.62, 0.55), Ø ~0.33 W. |
| O2 (one 10 s take) | FIX | **omni2** (replaces O2a+O2b) | 0-239 | slide 30 · descent 42 · jowl 54-70 · deflated (O2B2) 92 · gel 100 · gel complete 156 · hold to 239 | **No join jump.** It has a smooth camera push between keyframes instead: zoom 6.2 % at f60, settling to 1.8 %, and a 50 px pan by f96, then locked. The jowl hangs below the jaw f54-66, then dissolves f66-80. The gel is on the zygoma (good) but oversized, and the fat never rises. |
| O3 | **PASS** | **omni2** | 0-143 | Form seed 24 · Smooth seed 30 · Form complete 84 · Smooth spread 90 · crease softened 100 | Fixed: Smooth spreads and stays, the crease softens slightly. 1 % / 8 px slow drift. |
| O4 | **PASS** | **omni2** | 0-143 | above the skin 0 · touch 6 · pierce skin 10 · vessel nick 52 · bleed 54 · bruise peak 143 · cannula stops 102 | Fixed: the needle starts above the skin and the cannula shaft stays continuous. Minor: the bruise drapes over the cannula path f84+; 2.7 % slow zoom-out. |
| U1 | FIX | **omni1** (66-143) | — | omni2: deposit at the rim 30 · moves superficial 48 · fades to shadow 84-100 | omni2 is worse: the deposit migrates under the lid skin and then dissolves. **No filler at the end.** |
| U4 | FIX | **omni2** (marginal) | 0-72 | needle at vessel 48 · bleed 54 · peak 120 · cannula meets vein 78 | The cannula stays below the vessels to ~f72 (omni1 ~f60). After f78 it is again coaxial with the vein. The needle again starts in the skin. |
| U5 | FIX | **omni1** | (omni1 0-143) | omni2: threads 90 / 98, fill 108 | omni2 is worse: the cannula first runs to the orbit edge away from the entry mark (f42-66), then slides sideways onto it (f74-82). |
| U7 | FIX (minor) | **omni2** | 0-96 | swell 30 · second lobe 48 · pillowy 84 · max 102 | One continuous swell, no pop-in, and the skin line follows it. Still oversized by f102. Hold on f84-96. |

**Net set to use:**
- J1 o1, J2 o2 (0-86), J3 o2, J4 o1, J5 o2 (0-86)
- O1 o1, O2 o2, O3 o2, O4 o2
- U1 o1 (66-143), U3 o1, U4 o2 (0-72), U5 o1, U6 o1, U7 o2 (0-96), U8 o1, U9 kling

**What's in `clips/` now:**
- Already swapped in, and correct: J3, J5, O3, O4, U4, U7 and O2.
- J2 should also be swapped to omni2, trimmed to f86.
- U1 and U5 stay on round 1.

**Clean in round 2:** no text or watermarks anywhere. One blink: J2 f89-91.

**Round 3 is only worth it for:**
- **J2 support.** Keep the morph rule and add *"the bones are drawn the whole time, only their outline thins; the masseter and cheek muscles never disappear; eyes open."*
- **U1.** *"the deposit stays deep on the bone at the rim, under the muscle, it never moves forward and never fades."*
- **U4 cannula.** *"the cannula passes UNDER the vein, crossing it at an angle, and keeps going past it; it is never parallel to or inside a vessel; the needle tip starts above the skin."*
- **J5 bone underlay and O2 restoration.** Same prompts as round 1.

---

# Round 3 (omni3/: J2, U1, U4)

| Clip | Round 3 | Use | Usable | Key frames | Notes |
|---|---|---|---|---|---|
| J2 | FIX (minor) | **omni3** | 0-84 | shrink 30-54 · descent 60 · jowl at jaw 84 · jowl full 96 | **Best round.**<br>• Clear volume loss, then the descent into a jowl. The muscles stay drawn throughout. No blink. Camera locked.<br>• **The f75 spike is the fat pad sliding.** f73-79 are continuous; I checked them frame by frame.<br>• f78-96 the mid-cheek fills with fat again behind the pad, so don't hold past f84.<br>• Bone thinning is still not shown. |
| U1 | FIX | **omni1** (66-143) | omni3 24-60 | deep deposit 24-60 · moves to the lid skin 66-90 · gone 102 | Same failure as omni2: the deposit migrates forward and fades. omni1 is the only round where the deep deposit stays to the end. |
| U4 | FIX | **omni2** (0-72) | omni3 0-72 | vessel nick 60 · bleed 66 · cannula meets the vein 78 | No gain: the cannula again runs parallel to the vein and then into it. The needle again starts in the skin. |

**Final picks:**
- **J:** J1 o1, J2 o3 (0-84), J3 o2, J4 o1, J5 o2 (0-86)
- **O:** O1 o1, O2 o2, O3 o2, O4 o2
- **U:** U1 o1 (66-143), U3 o1, U4 o2 (0-72), U5 o1, U6 o1, U7 o2 (0-96), U8 o1, U9 kling
