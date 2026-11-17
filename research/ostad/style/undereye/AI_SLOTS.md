# Under-eye filler reel v2: AI image slots (Flora / Higgsfield, Nano Banana)

The flora and higgsfield MCP servers were not connected in this session, so nothing here was generated. Each slot has a designed fallback in
`brand/remotion/src/undereye/devices_v2.tsx`, so v2 renders either way. To fill a slot, generate the image and drop it in
`brand/edits/undereye-filler/ai/<slot>.png` (gitignored). `brand/scripts/undereye_prep_v2.py build` copies whatever is there into
`public/undereye-filler/ai/` and lists it in `props_v2.json` (`ai`). The reel then uses the image in place of the fallback, with the same
"Illustration" label.

## Rules for every slot (user, 2026-11-17)

- AI never shows a treatment result or a before/after. The only results are the real 9-20 and 10-04 images.
- Never generate or alter the real patient or Dr. Ostad. Use a neutral, generic adult face that is not built from either of them (no face reference upload).
- "Illustration" is shown on screen while the image is up.
- Each AI frame goes on the stills sheet next to its reference frames, for an identity check (`brand/edits/undereye-filler/stills_v2/`).
- AI media stays gitignored (`brand/edits/undereye-filler/.gitignore` ignores everything there).
- No drawn anatomy (no skull or muscle layers). Photographic skin only, or a clean product-style render.

## Brand tokens to match (brand/kit/tokens.json, MOTION.md)

- Light, calm, clinical. Cool room light (hue 205-216°), never green. Low saturation (about 0.3 on skin).
- Backdrop: soft blue-grey `#d6dde5` to `#e8eff8`, or a black studio backdrop like the clinic's own standardised photos.
- Accent blue `#37a9e8`, ice `#cfe9f7` (only if a graphic element is needed). No text in the image: the reel sets its own NHG type.
- Grain: fine (tokens `grain.opacity` 0.06). No glossy glints, no bloom.

## Slots

| Slot | Shown at (cut_v2 cue) | Prompt | Reference frames (identity and look; never uploaded as a face reference) | Aspect / size | Duration on screen | Fallback now |
|---|---|---|---|---|---|---|
| `tyndall` | B13, "that bluish hue called the **Tyndall** effect" | "Macro photograph of the under-eye area of a neutral, generic adult face, front light, a faint bluish-grey translucent tint visible under the thin lower-eyelid skin, as when a gel sits too close to the surface. Soft clinical studio light, cool blue-grey backdrop, realistic skin texture, no makeup, no text." | `stills_v2/` frame at the Tyndall cue (her close-up, for the light only) | 4:3, 1200×900 | about 4 s, in a glass card in the top band | `TyndallSwatch`: a skin-tone swatch with a translucent blue streak under a lid line |
| `pillowy` | B12, "this **pillowy** look under the eyelids" | "Close-up of the under-eye area of a neutral, generic adult face showing a puffy, overfilled, pillow-like swelling below the lower eyelid, side light that shows the bulge. Clinical, calm, cool backdrop, realistic skin, no text." | the 9-20 close-up at the cue (light only) | 4:3, 1200×900 | about 3 s, inside the "Another syringe" card | `PillowProfile`: lid contour line with the bulge growing on "expand" |
| `bruising` | B14, "a lot of swelling, **bruising**" | "Macro photograph of a small fresh bruise on the cheek of a neutral, generic adult face, purple centre fading to yellow, clinical light, cool backdrop, realistic skin texture, no text." | none | 1:1, 900×900 | about 3 s, in the "Needles" card | `BruiseSwatch`: skin disc with a purple-to-yellow gradient |
| `needle_cannula` | B14, "the conventional way of using actually **needles**" | "Product photograph of two medical instruments side by side on a pale blue-grey surface: a sharp bevel-tipped injection needle and a blunt round-tipped micro-cannula with a side port, macro, crisp, clinical, no brand marks, no text." | none | 16:9, 1600×900 | about 4 s, across both contrast cards | the drawn tip profiles in `Contrast` / `CannulaLedger` |
| `plate` | every glass card | "Abstract frosted glass texture, soft cool blue-grey light gradient, very fine grain, no objects, no text." | the kit glass (`brand/kit/tokens.json` glass radius 29.6, blur 17.8, alpha 0.61) | 9:16, 1080×1920 | background of the cards | the kit's calm glass (`components/Ro.tsx card()`) |
