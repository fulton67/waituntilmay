---
description: Make an on-brand Dr. Ariel Ostad post (PNG) from a caption or from template slots, with the same renderer as /brand/ostad/make
argument-hint: <caption text | template name + what to say> [size 4x5|1x1|9x16]
---

Make an Ostad post from: $ARGUMENTS

`brand/post.py` uses the same templates and headless renderer as the builder page, so its files are identical to the page's Download (`brand/kit/templates/post_check.json`).

1. Decide the mode.
   - **Caption pasted:** write it to a temp file and use Auto: `--caption-file <file>`. Add `--template <id>` only if the user named one.
   - **Template plus wording:** pick the template from `brand/kit/templates/index.json`. Read its `slots.json` for the slot keys and each slot's `max`. Pass the main text with `--headline` / `--body`, any other slot with `--slot key=value` (JSON for list items), the icon with `--icon <name>` (names are in `brand/kit/icons/icons.json`) and a photo with `--image <path>`.
   - **Spec JSON (e.g. from a builder draft):** `--spec <file>`.
2. Size defaults to `4x5`; the others are `1x1` and `9x16` (story safe area). Accent is one of `accent-1`, `accent-2`, `signal`, `surface`.
3. Run it, with output going to `brand/demo/out/` unless the user named another folder:
   ```
   ~/tools/brand-venv/Scripts/python -I brand/post.py <args> --out brand/demo/out
   ```
   It prints the PNG paths, then a line with the page count, size, accent, fonts and the Auto choice. A carousel or a paginated caption writes `-01.png`, `-02.png`, ….
4. Check what it printed.
   - `fonts: adobe` is required; `fallback` means the Adobe kit didn't load, so re-run it.
   - Any `warning:` line (truncated text) means the copy should be shortened to the slot's `max`.
5. Open each PNG and look at it. Report the paths, the template used and any warnings. If the user wants a different take on a caption, re-run with `--seed` + 1 (the same as the builder's Regenerate).

Never put patient names or identifiable details in a post unless the user supplied them for that purpose.
