# gaeawoods.com: reference read

Crawled on 2026-10-30 with the full Lexicon crawl. Pages: /projects, /about and 3 project pages, followed to depth 3, 21 pages in total. Each page was loaded fully, scrolled to the bottom and back, and its computed styles were captured. Scripts were read through REA: 6 scripts, 3 read in full and 3 skipped as third-party.
Crawl folder: `~/arena/lexicon/channels/references/gaeawoods.com/deep/`. `scripts/a1d7dd0b218b20fd.js` is the site's own bundle (9117 lines). `styles/d35e915ec50e420e.css` is the site's own stylesheet (780 lines).

## Layout
- The site is built on Kirby. /projects is a 3-column grid of cells 430 px wide with 30 px gutters. Each cell is 122 px tall, topped by a 1 px rule.
- Each cell holds an index number, a thumbnail up to 103 px tall, the project title, and the client name in *italic*.
- A project page is a stack of full-bleed `figure.cover` images. The caption sits bottom-left at 16 px. The page is split into prev and next halves that link to the neighbouring projects.

## How the list behaves and how clicking reveals the work
- Clicking a title goes through **pjax**, so the content is swapped without a full reload. An nprogress bar starts on `pjax:send` and finishes on `pjax:complete` (bundle.js:8362–8363).
- Images are `[data-img]` backgrounds that start at opacity 0. They are loaded **one at a time in order** by `mbl($('[data-img]'), {sequential:true, bgMode:true})` (bundle.js:8404–8410). Each one fades to 1 over **.3s ease** once `[data-mbl-complete]` is set (css:200–207).
- About is an overlay, not a separate page. `exports.show` (bundle.js:8306) adds `.open` to `[data-about]`, and on the index it also adds `.thick`. The page behind is frozen with `.main.fixed` at `top: -scrollY`, and `exports.hide` (bundle.js:8321) restores the scroll position.
- The overlay's background is `rgba(255,255,255,.825)`, and it fades in with opacity over **.3s ease** (css:603–620).
- `[data-about-toggle]` switches the route between `/about` and the last project route using pushState (bundle.js:8424).
- The text toggle (`[data-text-toggle]`, bundle.js:8420–8422) toggles `html.invisible`. That fades every `[data-hide]` element to opacity 0 over .3s, leaving only the images (css:113–118).

## Hover and transition timing
| element | rule | where |
|---|---|---|
| links | `color .3s ease` | css:70–71 |
| menu links | `color .3s ease, border-color .3s ease` | css:93–94 |
| `[data-hide]` | `opacity .3s ease` | css:114–115 |
| `[data-img]` | `opacity .3s ease`, 0 → 1 on load | css:200–207 |
| `[data-about]` | `opacity .3s ease` | css:613–614 |

Every motion on the site runs .3s ease. Nothing slides; everything fades.

## Button text and marks
- There are no button shapes. Every control is a plain word in the body face: *Projects*, *About*, and the text toggle. The active menu link gets `.active`, shown as a border-coloured underline.
- The running index number on each grid cell serves as the mark (bible C2).

## Type: measured, computed
- Body text: `"nimbus-sans", Helvetica Neue, Helvetica, Arial, sans-serif` (css:65 and css:83), **16 px / 1.1 (17.6 px)**, weight **300**, with an italic 300 for client names.
- One face and one weight carry the whole site.

## Font families in the CSS
| family | source |
|---|---|
| `nimbus-sans` 300 and 300 italic | **Adobe Fonts** (Typekit kit `twr8vrw`). This is URW Nimbus Sans Light, a commercial font. |
| Helvetica Neue / Helvetica / Arial | system fallbacks |

No font files were copied.
