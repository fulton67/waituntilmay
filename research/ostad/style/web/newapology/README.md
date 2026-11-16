# newapology.com: UI motion and spacing study (2026-11-16)

Study notes only. Nothing from newapology.com or the linked sites ships: no code, CSS, fonts, images or copy. These notes record measured technique (timings, easings, spacing) so it can be translated into the Ostad brand bible's animation rules.

- `pages/site.md`: the site-wide systems: Lenis smooth scroll, the route change and "pull to next project" View Transition, cursor pill, hovers, entry cascades, grid, type and colour tokens.
- `pages/work__<slug>.md`: each of the 12 case-study pages.
- `pages/stack.md`: static analysis of the site's own chunks with REA 6.8.0.
- `sites/<host>.md`: the 14 live sites linked from the project pages (newapology's client builds and credited collaborators), each captured at 1440 and 390 with a REA bundle analysis.
- `tools/capture.mjs`, `tools/measure.mjs`: the Playwright runtime recorders. They log `getAnimations()`, inline style writes per frame, rAF, `Element.animate` and IntersectionObserver.

The raw captures, downloaded bundles, REA Evidence, videos and frames stay local and are never committed. They live in `boogie-website/ref/newapology/`, which ignores everything.
