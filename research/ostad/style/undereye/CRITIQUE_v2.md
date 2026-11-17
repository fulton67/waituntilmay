# Under-eye filler v2 (draft): critique for the building agent

Reviewed 2026-11-17: `Downloads/Ostad - Under-eye filler v2 (draft).mp4` (1080×1920, 24 fps, 83 s). I looked at a frame every 2 s and full-size frames at 5, 8, 19, 21, 30.5, 44, 48 and 71 s.

**Naim's verdict:** it feels "extremely basic" and it is "circling random things". He is right. This is raw phone footage with small glass chips and hairline circles laid over it. Nothing on screen explains anything his words don't already say.

**Read first:** `research/ostad/style/V6_SYSTEM.md`, which replaces v4 as the model. Then `exomind/ROSACEA_METHOD.md`, `exomind/specs/DESIGN_PER_BEAT.md` and `brand/motion/RULES.md` (the Ostad video rules block). Follow the `ostad-video` skill.

## What's wrong, by timestamp

| t | What's on screen | Problem |
|---|---|---|
| 0:00 | Tiny before/after pair with black bars above and below | It opens on a small, letterboxed still. The result should be the hook, so show it full frame. |
| 0:04 | "01 THE CONCERN" pill, about 3 % of the frame wide | It's a section card in name only and can't be read on a phone. There is no title card at all. |
| 0:06–0:08 | Her face in a band, with huge blurred crops of the same frame above and below; two hairline white arrows from "Under-eye hollows" | This is the blur pillarbox Naim banned ("no full blur"), and it looks broken. The arrows are hairline and land on nothing in particular. |
| 0:10 | "Tired?" | Plain kinetic text. |
| 0:19–0:22 | "BLUNT CANNULA" glass card: a thin bar with three greyed words, "Blunt / More advanced / Delicate", lighting up | An empty signifier. A progress bar with three adjectives doesn't show what a cannula is. |
| 0:26–0:28 | "HOW LONG IT LASTS" slider card | The label is nearly invisible (light grey on white glass). It's the same card design as 0:19. |
| 0:30.5 | Hairline circle plus "One entry poin" | **The banned dot-and-line callout.** The text is cut off, either clipped or caught mid-type, so check the hold. The circle sits on the cheek, not on the entry point. |
| 0:34 | "Lidocaine" highlighter label | Text over footage again. |
| 0:36–0:48 | 12 s of raw injection footage, with "Deep," and "Fuller" captions | The most important part of the procedure has no visual explanation of where the product goes. |
| 0:52–0:54 | "Another syringe?" | Kinetic text, the third time a plain word or phrase stands in for a design. |
| 1:00 | "Bluish hue: the Tyn…" | The Tyndall effect is the one under-eye-specific idea in the script, and it gets a cut-off text line. |
| 1:04 | Hairline line plus "One pinprick" | Dot-and-line again. |
| 1:10–1:14 | Before/after eye crops with tiny "Less shadow" boxes | This is the strongest material in the video, but the boxes are about 40 px and unreadable. Nothing is measured, and the dates are faint blue on black. |
| 1:20 | "Book a consultation" over a full blur | Full blur again. |

## The patterns behind it

1. **The circles are decoration, not information.** Every ring and line points at a generic patch of face. A mark has to land on a measured, meaningful target, such as the entry point, the hollow, or the change between before and after, and it has to follow her face (head track, `tools/face_track.py`). If you can't say what the circle proves, delete it.
2. **There's no device built for this topic.** Rosacea had the gut-microbiome animation; ExoMind has field-through-skull, rewire-trace and pulse-train. This edit has none. Every graphic is a generic glass chip that could sit in any video.
3. **Text is the default.** About 10 of the roughly 14 graphic moments are words: "Tired?", "Lidocaine", "Deep,", "Fuller", "Another syringe?", "One entry point", "Bluish hue", "One pinprick" and the two slider cards. The rule is that kinetic text is allowed on at most 1 beat in 5.
4. **One card design is reused.** The glass slider card appears 3 times, which fails variety_check's limit of 2 uses per device.
5. **There's a dead zone.** From 0:36 to 0:50 nothing is designed.
6. **The type is too small and too faint.** Kickers, card labels and dates run at roughly 18–22 px with low contrast on a 1080-wide reel. RULES needs ≥ 4.5:1 contrast and a readable size at phone scale.
7. **Blur fills appear twice** (0:06, 1:20). Naim said no full blur.

## What it should be: show the thing

| Line | Show this instead |
|---|---|
| "under-eye hollows" | **A tear-trough cross-section:** the orbital rim, the fat pad and thin skin. The hollow appears as a shadow in a lit side-view diagram, then a dissolve to her real eye with the same shadow line traced exactly on it, tracked. |
| "blunt cannula, more advanced" | **A needle vs cannula comparison:** a sharp bevel next to a rounded side-port tip, drawn large. Then an animation of the cannula sliding under the skin and gliding around a vessel (it pushes the vessel aside), while the needle's path would pierce it. This is the topic-only animation. |
| "one entry point" | **The fan map:** one entry dot on the cheek, then 3–4 threads fanning out under the hollow from that single point, drawn on her face from the head track and timed to the injection footage. |
| "lidocaine already in the filler" | A syringe barrel with the HA gel shown, and a small dissolved lidocaine marker inside it. One object, not a highlighter word. |
| "deep, right underneath" | **A depth layer diagram:** skin, fat and bone, with the product placed at depth on the bone. Contrast it with the "too shallow → bluish hue" placement. |
| "bluish hue / Tyndall" | Light hitting shallow gel scatters blue and is shown as an arrow of light; deep gel shows no blue. This is the second topic-only animation. |
| "how long it lasts" | A real timeline object (months along a ruler, with a 1-year mark and a "can last longer" fade), not a slider card. Use it once. |
| "another syringe?" | Show 1 syringe vs 2 side by side, with the measured volume. Or cut it, since he answers it in words. |
| result | **A full-frame before/after with a measured change:** an under-eye luminance profile line plotted for before and after, or the shadow area in px² shrinking. Big type, real dates. |

## Bar to pass before re-rendering

- `tools/variety_check.py` on beats_v2.json: no device more than twice, at least 6 distinct devices, at least 3 never built before, at most 20 % text-only, and 0 dot-and-line.
- `tools/lint_compositions.py`: 0 dot-and-line callouts and 0 static images.
- Every mark on her face is driven by the head track, with tip error median under 6 px and p95 under 15 px.
- No blur fill anywhere.
- Every text item is fully lit for at least 60 f. Take a still at each hold midpoint and confirm no word is cut.
- A stills sheet with one key frame per beat. If two tiles look like the same design, redesign one.
