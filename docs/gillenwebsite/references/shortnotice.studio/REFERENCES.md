# shortnotice.studio: reference read

Crawled on 2026-10-30 with the full Lexicon crawl. Pages: /, /index/ and 3 project pages, followed to depth 3, 40 pages in total. Each page was loaded fully, scrolled to the bottom and back, and its computed styles were captured. Scripts went through REA: 16 scripts, 15 read in full and 1 skipped as third-party.
Crawl folder: `~/arena/lexicon/channels/references/shortnotice.studio/deep/`. The site runs on Lay Theme (WordPress). The theme stylesheet is `styles/1b979d7b0875324e.css` and the theme script is `scripts/8b2e2443155aa981.js`. Both are minified onto line 1.

## Layout
- The home page is a client list set large: **26 px / 31.2 px**, black, with a measured row pitch of **31.19 px**. Items are `<a>` elements separated by `,<br>`, so it reads as one long comma list.
- Small labels are 15 px. The fixed nav is a **pill** set at 15 px. Smaller pill buttons are **12 px / 13.2 px**.
- Portrait images sit freely in the margins beside the list, not in a grid.
- /index/ ("Endless Scroll") is a stack of full-width project images with the titles alongside.

## How the list behaves and how clicking reveals the work
- Hovering a title reveals its image. Thumbnails are `.thumb.has-mouseover-img`, and `body.thumb-mo-image-no-transition` makes the swap **instant**. On hover the first image is hidden and `img.mo_thumb` is shown purely through `visibility`, with no fade (css:1, `thumb-mo-image-no-transition .thumb.has-mouseover-img:hover .ph img.mo_thumb{visibility:visible}`).
- Clicking a title opens the project page through Lay Theme's own transition. The nav pill gets its `nav-pill-transition` class **750 ms** after `transition_navigation_in_completed` (js:1, `…addClass("nav-pill-transition")…},750)`).

## Hover and transition timing
| element | rule | where |
|---|---|---|
| title → image | instant `visibility` swap | css:1 `thumb-mo-image-no-transition` |
| thumbnail scroll animation | `transform .4s ease-out` | css:1 `.lay-scroll-anim-wrap .thumb img` |
| mouseover image | `transform .4s ease-out, opacity .3s ease-out` | css:1 `…has-mouseover-img img:first-child` |
| lazyload blur-up | `filter .4s ease-out` | css:1 |
| nav pill | transition class added after 750 ms | js:1 |
| client list links | no hover change | computed |

## Button text and marks
- The pill is the site's only shape: a rounded capsule around the nav word. Everything else is plain words set in the one face.

## Type: measured, computed
- The list and all other text are set in `"ABCDiatype-Black"`. The list is **26 px / 31.2 px** (leading 1.2), labels are 15 px, and small pills are 12 px / 13.2 px.

## Font families in the CSS
| family | source |
|---|---|
| `ABCDiatype-Black` | **self-hosted** at `wp-content/uploads/2024/11/ABCDiatype-Black.woff` (inline `@font-face` in every page). This is ABC Diatype Black from Dinamo, a commercial font. |
| Helvetica Neue / Helvetica / -apple-system stacks | theme fallbacks (css:1) |
| icomoon, swiper-icons | icon fonts for the theme UI and carousel arrows |

No font files were copied.
