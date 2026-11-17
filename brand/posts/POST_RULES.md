# Post rules: designed stills (2026-11-17)

These rules come from `STILL_STUDY.md`. Each one is marked **[observed]** (measured) or **[inferred]**; the inferred rules are
collected again at the end. Posts share tokens and type with the videos (V6_SYSTEM.md), not their layouts.

Build route: `public/brand/ostad/stills/*.html` (HTML/CSS/SVG, shared `stills.css`) → `brand/scripts/render_stills.cjs`
(headless Chromium) → PNG. Never through the Remotion video compositions.

1. **One real photo, or one designed graphic, per tile.** It must be the literal subject: the product, the device, the room, the
   patient's own result. **[observed]** Cites: rit DSou2PGj6Wu_01–05, DTxAdD6Epxb_01; Are.na 12400773, 47483045; V6 "no empty
   signifiers".
2. **Photos are never graded, tinted or upscaled.** Use full-resolution originals. **[observed]** Cites: rit tone .18 saturation;
   POSTS.md tint check.
3. **Type is small.**
   - Body: 32 px line height at 1080 (3.0 % of width).
   - Labels: 24 px.
   - Heads: ≤ 68 px.
   - A single display number may run to 200 px.

   **[observed]** Cites: rit body slides .029–.030; Are.na .039; Naim's refs .032; Are.na 34747221 ("7").
4. **One idea plus an information layer**, up to about 25 words: a head, then spec rows (key left, value right, hairline between)
   or chips. **[observed]** Cites: Naim's refs median 24.5 words; Are.na 34747221 and 41432 (spec rows, ingredient chips).
5. **Type sits on paper, or on a glass plate over the photo,** never loose on a busy photo. It goes lower left or centred.
   **[observed]** Cites: rit type positions (bottom-left 5, middle-centre 5).
6. **One key light from the upper right on everything we add:**
   - glass highlight on the top and right inner edges
   - contact shadow offset down-left (−10 px, +16 px, blur 30 px)

   **[observed]** Cites: rit −38°, Are.na −60°.
7. **Glass is a material, used only with a reason:** a label plate over a photo, a panel over a product, or a loupe on a detail.
   **[observed]** Cites: Naim's ref 2; Are.na 41432, 22772082. Its parts:
   - blur 28 px of what's behind (saturate 1.12)
   - white veil α .30
   - a highlight band over the first 26 % from the lit corner
   - a 1.5 px bright rim on the top and right, plus a 1 px all-round rim at α .34
   - the contact shadow from rule 6
   - 7 % grain
8. **Edges:** mix full bleed, inset (96 px paper margin) and rit's 63/37 photo-over-paper split. No two neighbours share an edge
   type with the same background. **[observed]** Cites: rit 16 inset / 3 split; Are.na 31 inset / 20 full bleed.
9. **Colours are tokens only:**
   - ivory `#f5f2eb`
   - paper `#ece8e0`
   - sand `#d6c3a0`
   - navy `#152235`
   - ink `#1d1a16`
   - white
   - v6 blue `#37a9e8`, for arrows and measurement marks only

   **[observed]** Cites: EXISTING.md palette; V6 arrows.
10. **Before/after tiles show what changed.**
    - Matched panels with labels.
    - The change is marked where it was measured: landmarks for skin, his guide line for profiles.
    - One arrow style: blue, 4 px, a real filled head, stopping 6–10 px short of its target.
    - A loupe for small changes.
    - The measured numbers are written out.

    **[observed]** Cites: Naim 2026-11-17 ("explain with arrows how they have changed"); V6 arrows; `brand/scripts/ba_measure.py`.
11. **Grid rhythm for nine:** 5–6 photo-led tiles (before/afters count), 1–2 quiet text tiles and 1 designed graphic. No two tiles
    alike. **[observed]** Cites: the brief; rit feed.
12. **Tone target for the whole grid:** median luma about 120–130, saturation .18–.29, RMS contrast about .21. **[observed]**
    Cites: rit, Are.na and Naim's refs medians.

## Inferred rules (guesses, to be confirmed)

- **I1.** Glass highlight width 26 % from the lit corner and grain at 7 %: chosen by eye to match Naim's ref 2, not measured.
- **I2.** A 96 px inset margin (8.9 % of width): Are.na insets vary; this matches the kit's margin, not a measured mean.
- **I3.** Body type 32 px is a rounding of 3.0 % of width; rit's Korean body set may read optically smaller than the same size in
  Latin type.
- **I4.** About 25 words reads well at feed size. This is extrapolated from Naim's refs, which are not all single feed tiles
  (ref 4 is a full grid screenshot).
