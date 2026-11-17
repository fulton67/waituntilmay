# How I would build the under-eye and Oct 14 reels (2026-11-17)

For the agents building `undereye` (v2 draft) and `oct14` (v2 draft). Read this together with your `CRITIQUE_v2.md`. That file says what's wrong; this one says how I'd make it, step by step and beat by beat. It's the same method that got the ExoMind YouTube edit through Naim's review (`V6_SYSTEM.md`, the `ostad-video` skill).

## Measured on the v2 drafts

| | Under-eye v2 | Oct 14 v2 | Target |
|---|---|---|---|
| Length | 83 s | 92 s | n/a |
| Picture cuts (scdet 10) | 21 | 12 | a picture change every ≤ 4 s (cut, takeover or designed object) |
| Longest stretch with no cut | 6.6 s (35.5–42.1) | **24.9 s (22.3–47.2)**, then 15.7 s (53.8–69.5) | ≤ 4 s without a picture change |
| Topic-only animations | 0 | 0 | ≥ 3 |
| Marks on a measured target | 0 (all hairline rings and ticks) | 0 | every mark |
| Text-only graphic moments | about 10 of 14 | about 8 of 12 | ≤ 1 beat in 5 |
| Loudness | −15.1 LUFS / −1.4 dBFS | −14.3 LUFS / −1.1 dBFS | −14 LUFS, true peak ≤ −1 dBTP (fine; under-eye can come up 1 dB) |

In Oct 14, he spends 25 s on the most important idea (deflation versus sagging) over one unbroken shot with a "Deflation" label. That stretch is where the video dies.

## The order I work in

1. **Find the 3 ideas only this procedure has before designing anything.** Rosacea had the gut microbiome; ExoMind had the field through the skull. Read the transcript and ask what he explains that a viewer can't *see* in the footage. Those are your topic-only animations, and they get built first, as components, on a lab sheet.
   - **Under-eye:** why a hollow reads as tired (light and shadow on the tear trough); needle versus cannula under the skin; the Tyndall effect.
   - **Oct 14:** muscles that make dynamic lines; deflation versus sagging; Form versus Smooth (thick versus thin gel).
2. **Track her face before placing any mark.** Run `tools/face_track.py` (MediaPipe + One Euro) on the patient footage. Use real landmarks: the lower eyelid and tear trough, the brow, the zygoma and the nasolabial fold. Every ring, line and dot is driven by a landmark and passes the bounds (median < 6 px, p95 < 15 px). If you can't name the landmark, there is no mark.
3. **Measure the before/after before claiming it.** Register the pair on the eyes, nose and mouth (`brand/scripts/ba_measure.py`).
   - **Under-eye:** measure the shadow along the tear trough as a luminance profile.
   - **Oct 14:** measure the cheek contour and fold depth.

   Draw the measured difference, not a ring around the area.
4. **Beat sheet: noun → 3 concepts → pick, for every line** (DESIGN_PER_BEAT). The pick does what he says at the word he says it: the gel spreads on "expand", the light scatters on "bluish".
5. **Hook in the first 1.5 s:** the result, full frame, moving. A wipe across the registered before/after, never a small letterboxed pair.
6. **Pacing rule:** a picture change at least every 4 s. Long explanations (under-eye 45–61 s, Oct 14 30–45 s) need 4–5 planned changes:
   - footage
   - the topic animation
   - a tracked overlay on her face
   - footage again
7. **Stills sheet before rendering.** One key frame per beat, viewed at phone size. Redesign any two tiles that look like the same design.
8. **Render, run the checks**, then do one gap round with before → after numbers:
   - `variety_check.py`
   - `lint_compositions.py`
   - the tracking bounds
   - `edge_check.py`
   - scdet
   - loudness
9. **Watch it once at phone size with sound** before handing it over. If any 4 s feels empty, it is.

## Under-eye filler: beat plan (times from `beats_v2.json`)

| t | What he says | What I'd show | Device | New? |
|---|---|---|---|---|
| 0–1.5 | (hook) | Full-frame registered before → after wipe across her eyes (Sept 20 → Oct 4). The measured shadow line fades as the wipe passes. | registered B/A wipe | n/a |
| 0–5.2 | her testimonial | Her talking, full frame, with the wipe settling into a small rounded window beside her face. Never a blur fill. | window | n/a |
| 5.3–11.2 | "hollows… illusion of being tired" | **TearTroughLight (new, topic-only):** first, the measured shadow traced exactly along her tear trough (tracked). Then a side cross-section slides in: orbital rim, fat pad, the hollow. An overhead light ray hits the rim, and the hollow falls into shadow. *That* is the "illusion of tired". | section + tracked contour | ✔ |
| 11.3–16 | "she just wants us to fill her lower eyelids" | A readable section card, "01 · The plan", sitting full frame on her close-up. Then the target area: both lower lids softly lit, the rest of the face dimmed (tracked). | section card + tracked spotlight | n/a |
| 16–18.4 | "hyaluronic acid filler" | The real syringe in a macro shot, with a credited product plate (glass, upper-right key light). | product plate | n/a |
| 18.5–25.2 | "cannula… blunt… more advanced, delicate" | **NeedleVsCannula (new, topic-only):** the sharp bevel and the rounded side-port tip, drawn large, side by side. Then under the skin: the needle line pierces a vessel and leaves a red bloom, while the cannula glides around the vessel. It lands on "delicate". | 2-state animation | ✔ |
| 25.2–30 | "she'll look great… a year to a year and a half" | A month ruler from 0 to 18 that fills the 12–18 band. Large numerals, used once. | ruler | n/a |
| 30.1–34.6 | "anaesthetic… lidocaine" | Footage takeover of the injection close-up, plus the syringe barrel cut away to show the numbing agent mixed into the gel (one object). | cutaway | ✔ |
| 34.6–41 | "deep… right underneath the muscle" | **DepthLayers:** skin, orbicularis muscle, fat, bone, with the cannula path running *under* the muscle, synced to the footage. Then **FanFromOneEntry:** one entry dot on her cheek (tracked), with 3–4 threads fanning under the hollow. | layers + tracked fan | ✔ |
| 41–45.1 | "fuller on the right versus deeper here" | Split close-up of her two lower lids, each with its measured shadow-depth bar. The difference is visible as numbers. | measured split | n/a |
| 45.1–61.3 (16 s) | "another syringe? …this is going to expand… pillowy" | Four picture changes:<br>(a) 1 syringe versus 2, with the volume written.<br>(b) **GelExpands:** HA draws in water, and the gel swells over about 2 weeks on a small dial.<br>(c) Lower-lid profile lines, natural versus overfilled "pillowy", drawn as contours. No stock faces.<br>(d) Back to him deciding, full frame. | 3 objects + footage | ✔ |
| 61.4–63.8 | "inject deep to avoid that bluish hue, the Tyndall effect" | **TyndallScatter (new, topic-only):** light enters shallow gel and scatters blue; the same light into deep gel shows no blue. A diagram, never on her face. | diagram | ✔ |
| 63.8–77.3 | "no needles… nobody would know… needles cause swelling, bruising" | Her walking or sitting up after the treatment, full frame, with a single tracked pinprick dot. NeedleVsCannula comes back in its "bruise map" state (a needle path with several bruise points versus one entry). | footage + callback | n/a |
| 77.3–89.6 | result | Full-frame registered before/after with the measured tear-trough luminance profile plotted (before in sand, after in blue). One measured number, for example "shadow −X %". End card on clean paper, not a blur. | measured B/A | n/a |

## Oct 14 injections: beat plan (times from `beats.json`)

| t | What he says | What I'd show | Device | New? |
|---|---|---|---|---|
| 0–1.5 | (hook) | Full-frame wipe from 4:42 PM to 4:55 PM: the same face 13 minutes apart, with the measured cheek contour drawing on. | registered B/A wipe | n/a |
| 1.5–4.5 | "our lovely patient… forehead lines, frown lines" | Her face, with the forehead and glabella lines traced exactly on her (tracked). Readable section card, "01 · Upper face". | tracked trace | n/a |
| 4.5–14.6 | "crow's feet… dynamic lines… neuromodulator" | **MuscleMap (new, topic-only):** frontalis, corrugator/procerus and orbicularis fibres drawn over her face (tracked). The fibres contract and the lines deepen ("dynamic"), then relax. Each injection point lights on its real spot at the moment he injects in the footage. | tracked anatomy | ✔ |
| 14.6–21.9 | "more where it needs lifting, less where it droops" | **BrowBalance (new):** lift vectors (frontalis, up) against depressor vectors (down), with dose dots sized by amount. The brow line rises by the measured amount. | vector diagram | ✔ |
| 21.9–23.7 | "about four or five months" | A month ruler from 0 to 6 that fills 4–5. Brief. | ruler | n/a |
| 23.7–29.8 | "a day or two… fillers right away" | Two lanes on one day axis: filler lands at day 0; the neuromodulator ramps in over days 1–2. One object. | timeline | ✔ |
| 29.8–44.8 (15 s, and the 25 s with no cut) | "jowling… laugh lines… the source is more like deflation" | **DeflationVsSag (new, topic-only, the centrepiece):** a mid-face side profile in which the fat pads deflate, the cheek drops, and the laugh line and jowl deepen. Interleave it with her face: the cheek contour and fold traced on her (tracked). At least 5 picture changes:<br>1. footage<br>2. the animation's deflate state<br>3. the tracked trace on her<br>4. the animation's restore state<br>5. footage | animation + tracked | ✔ |
| 44.8–51.8 | "filler in the cheeks… cheekbones… Evolysse Form" | The placement line along her zygomatic arch (tracked), plus a credited product plate (real syringe photo). | tracked line + plate | n/a |
| 51.8–55.5 | "the laugh lines got better" | The measured fold line, before versus now (registered frames, two colours). It replaces the two empty ovals. | measured overlay | n/a |
| 55.5–64.9 | "Evolysse Smooth… not as thick" | **FormVsSmooth (new):** two gel drops on glass, Form holding its shape and Smooth spreading. Thickness shown, not said. | material demo | ✔ |
| 64.9–71.2 | "a cannula… minimise bruising" | Needle versus cannula, *redrawn* differently from the under-eye version so `reuse_check` passes (for example a top-down skin map with bruise points). | diagram | n/a |
| 71.2–85.3 | "proper cheekbone projection, jawline lifted… marionette lines" | Full-frame registered before/after:<br>- the cheek projection contour, before in sand and after in blue<br>- the jawline line<br>- the marionette lines traced and measured | measured B/A | n/a |
| 85.3–91.1 | "about 15 minutes… a year, a year and a half" | A 15-minute clock arc and an 18-month ruler, one object. End card on clean paper. | stat object | n/a |

## Go and find material: search, then cut out (Naim: "it never goes and searches to find photos")

Both drafts use only the footage they were handed. The tools for more already exist in this repo, and nobody uses them. Every beat in your beat sheet names its asset and where it came from. If nothing was found, log what you searched for (the query and the folder). An empty asset cell with no search log fails review.

### 1. Search the clinic library first (real material beats everything)

`C:\Users\naimj\clinic-library`. Read `HANDOFF.md` first. It's read-only, previews and frames only, never iCloud, codes only, no SENSITIVE or needs_review items.

- **Search the topic files:**
  - `catalog/md/filler.md` (7,451 lines; about 1,450 mention cannula, syringe, Evolysse or the tear trough)
  - `toxin.md`
  - `before-after.md`
  - `progressions.md`
  - `devices.md`

  Then query `catalog.sqlite` (table `assets`) by date and patient code for the same session's other photos and clips: the syringe on the tray, the product box, the marking, the face right after.
- **Look for the angles the reel lacks:**
  - a macro of the product
  - her face, front-on and registered, from the same visit
  - Dr. Ostad at the chair
  - the room
- Whatever you use from the library goes on the client-approval list.

### 2. Cut objects out and stage them

Cut-outs turn a cluttered clinic photo into a designed object.

| What | Tool (already in the repo) | Use in the reel |
|---|---|---|
| Syringe, cannula, product box, vial | `brand/scripts/devices_fetch.py` method: rembg `isnet-general-use` in the brand venv, scored for fill and a hard alpha, trimmed and padded by `devices_ingest.py` | The syringe floats large beside her face with the upper-right key light and a contact shadow. Draw the cannula tip at 4× next to the real one. Show the Evolysse Form and Smooth boxes side by side for the "not as thick" beat. |
| The patient | `brand/scripts/video_matte.py` (RVM, with `--refine` for hair) | Key her out and put the DepthLayers or TearTroughLight section *behind* her cheek, so the anatomy sits inside her face rather than in a box beside it. Key her out for the result too: her face on clean paper, with the measured contour drawn on. |
| Dr. Ostad | `video_matte.py` | Keyed in front, on the left, over a full-frame before/after or diagram. Naim asked for exactly this in v6 ("I like it if he's in front on the left side"). |
| Device photos | `brand/kit/devices/img/` (22 cut-outs already made, sources in `sources.json`) | Only if a device is mentioned. Neither reel needs one, but check before making a new one. |

Check every cut-out at 200 %: no halo, no leftover background, and its alpha passes the `devices_fetch` score.

### 3. Manufacturer media, when he names a product

- **Oct 14:** he names Evolysse Form and Evolysse Smooth (Evolus). Pull the official product images from the maker's press or product page through the `devices_fetch.py` pipeline. Keep the source URL in `sources.json` and put it on the client-approval list.
- **Under-eye:** he only says "a hyaluronic acid filler". **Never guess the brand** (HANDOFF rule 5). Show a generic, unbranded syringe cut-out, or ask Naim which product it was.

### 4. Anatomy references, to draw from (not to paste)

- Draw muscles, fat pads, the tear trough and skin layers yourself, accurate to a cited reference: an open-access anatomy atlas, or a Wikimedia figure under CC with the credit kept in the beat sheet. Naim likes drawn anatomy; he rejected *inaccurate* anatomy (POSTS_RESET, LESSONS P5).
- For a 3D look, the skin section `skin_crosssection.glb` already exists (the posts agent used it).

### 5. Generated elements, only when nothing real exists

- Flora is allowed for designed backgrounds and abstract elements, such as gel texture, a light-scatter field or water. Use it at the highest quality.
- **Never upload patient or Ostad footage to it.** Every AI render goes on the approval list.
- Higgsfield and Krea are not approved.

### Asset column in the beat sheet (required)

```
B05 | needle vs cannula | asset: cannula cut-out from clinic row ####, IMG_3653 f210 (rembg isnet, alpha score .94)
    | + drawn tips | searched: filler.md "cannula" (478 lines), toxin.md, devices.md
```

## Things I never do (Naim has rejected each one)

- hairline rings or ovals around an area
- dot-and-leader callouts
- a numbered inset with a line to a circle
- full-frame blur fills
- empty glass cards
- slider bars with adjectives
- words standing in for a picture
- a kicker or label under about 28 px at 1080 wide
- any text item that isn't fully lit for at least 60 frames
