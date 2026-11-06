# OSTAD BRAND KIT — the builder (this is the product)

Unattended; same rules (never ask, `brand/DECISIONS.md`, resume from `brand/TODO.md`, push to main after each phase, verify by measurement). `/brand/ostad` currently shows only the type specimen. Keep that work (`fonts/system.json`, the Adobe matches) and build everything else, in this order. The page gets reorganised at the end so the builder is at the top.

## What Naim actually needs

A page where he picks a template, types the words, drops an image, picks an icon and an accent, sees the post live, and downloads it at platform size — and every post that comes out looks like it belongs to the same brand: the glossy/glass surfaces, the icon style, the colour treatment and the compositions from his Are.na board. "Text on top of a photo" is not a post. A post is a composition made of the board's devices.

## Phase A — the look, as components (not plates)

Go through every board image and catalogue the **visual devices** — the things that make the board look like itself, beyond type and colour: glossy/glass panels, pills and chips, frosted blur cards, gradient fields, highlight streaks and rim light on surfaces, grain, inner shadows, hairline borders, rounded-corner radii, stickers and badges, dividers, frames, image treatments (desaturation, warm cast, vignette), icon style (glass, outlined, 3D-ish — say which). Count each; keep the 10–15 that recur. `brand/look/CATALOG.md` with crops.

For each device, **measure and rebuild it**: estimate the parameters from the pixels (corner radius in px and % of card width, border width and alpha, blur radius from edge falloff, highlight angle and position, gradient stops as hex + position, shadow offset/blur/alpha, grain amount) and implement it as a reusable CSS/SVG component in `brand/kit/components/` (one file each, CSS custom properties for the variables). Then render each component next to its source crop at the same size in `brand/look/proof/{device}.png` and compare them yourself; iterate until it reads as the same device. Record the final parameters in `brand/kit/look.json`. This is the step that was missing: the glossy look becomes code you can use on any post.

**Colour** is decided here too, from `brand/colour/*.json` if present (else measure now): the palette with roles, the image treatment as a LUT (`treatment.cube`) and as CSS filter values, and the rule for which accent goes with which surface. `brand/kit/palette.json`, CSS variables.

**Icons:** build the icon set in the board's icon style using the components above — 24 to start, the objects and actions his captions mention most (procedures, skin, syringe, laser, sun, clock, before/after, book, location, phone, arrow, check, play…). SVG masters plus a PNG render in the glass treatment. `brand/kit/icons/`. Contact sheet `brand/kit/icons/sheet.png`.

## Phase B — templates, from the board's compositions

Measure the board's layouts (if `brand/metrics/pixels.json` exists use it; else measure now: subject position, text block position and width, margins, image/text ratio). Cluster into 8–10 recurring compositions. Each becomes an HTML template with slots, built only from the Phase A components, the palette and the type system:

`single-statement` (one line, big, on surface or image) · `procedure-card` (name, one-line what, icon, chip) · `carousel-cover` / `carousel-body` / `carousel-end` · `story` (9:16, with safe area) · `quote` · `before-after` (two-up with header; hooks into the face-markup renderer if present) · `list` (3–5 items with icons) · `announcement` (date/place/CTA) · `caption-card` (long text, paginated).

Each template cites the board blocks it came from. Each has a `slots.json` (which fields, limits, which are optional) and renders at 1080×1350, 1080×1080 and 1080×1920 from the same source. Text auto-fits within the type scale's allowed sizes; overflow paginates (carousel) or truncates with a warning (single). Every template renders with the activated Adobe fonts via the server renderer and with the fallbacks in the browser preview, labelled.

## Phase C — the builder at `/brand/ostad/make`

Client page, same noindex. Left: template picker (thumbnails rendered from Phase B). Middle: the form from `slots.json` — text fields, image drop (with the treatment applied), icon picker (Phase A set), accent picker (palette roles only), size tabs. Right: live preview, rendered by the same template code in the browser. Buttons: **Download PNG** (server render via an API route that runs Playwright with the Adobe fonts, so the download matches the preview but with the real fonts), **Download carousel** (zip of slides), **Save draft** (localStorage), **Duplicate**. An **Auto** mode: paste a caption or a brief; it picks the template, splits the text into slots, suggests an icon and accent — rule-based from `slots.json` and keyword→icon mapping, no model call needed; a "regenerate" cycles templates.

The builder is done when: all templates render in the browser and on the server; a downloaded PNG's text pixels match the preview within font-substitution tolerance; a 7-slide carousel zip downloads; drafts survive reload; the page scores 0 console errors in Playwright.

## Phase D — CLI and slash command

`brand/post.py` and `.claude/commands/post.md` call the same server renderer with the same templates, so the terminal and the page produce identical files. `post.py --template procedure-card --headline "" --body "" --icon laser --accent accent-1 --size 4x5 --out dir`.

## Phase E — the proof

12 demo posts from real recent captions (`brand/board/` Instagram pulls), across at least 6 templates and all 3 sizes, in `brand/demo/`. Render them as a wall and look at the wall: do they read as one brand? If any doesn't, fix the template, not the demo.

## Phase F — the same system for video

Export the tokens once in a format every tool can read: `brand/kit/tokens.json` in the W3C design-tokens shape (colour, type, spacing, radius, blur, shadow, grain, motion durations/easings), and build CSS, a Tailwind preset, and an After Effects/Premiere-ready set from it with Style Dictionary or a small script. Then the video kit in `brand/kit/video/`: lower thirds and caption style (the 9:16 caption block that matches the `caption` role: size, leading, box, position in safe area), a title card and an end card per template family, the glass chip as an animated element, 4–6 text reveals and transitions from the board's motion rules (as Lottie JSON and as MOGRT if a Premiere install is reachable, otherwise as PNG sequences with alpha), the LUT, and a one-page `VIDEO.md` saying which element to use where in a 15–60 s short. Render a 10 s demo reel that uses them over one of Ostad's own clips and put it on the page.

## Phase G — reorganise the page

`/brand/ostad` order becomes: **Make** (the builder, or a large button to it) · **Demo wall** · **Templates** (thumbnails, each with its board sources) · **Look** (components with their proofs, palette, treatment) · **Icons** (sheet) · **Type** (the existing specimen, moved last). Push.

## Finish

TODO.md ends with: devices catalogued / rebuilt, icon count, template count, builder checks passed, demo count, the `/brand/ostad/make` URL, and anything decided alone.
