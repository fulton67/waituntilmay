# /gillenwebsite fonts

## Every font-family in the two reference crawls
| site | family (CSS name) | real face | source | licence |
|---|---|---|---|---|
| gaeawoods.com | `nimbus-sans` 300, 300 italic | URW Nimbus Sans Light | **Adobe Fonts** (Typekit kit `twr8vrw`) | commercial; Adobe Fonts licence for gaeawoods' own use |
| gaeawoods.com | Helvetica Neue, Helvetica, Arial | system | fallback | |
| shortnotice.studio | `ABCDiatype-Black` | ABC Diatype Black (Dinamo) | **self-hosted**, `wp-content/uploads/2024/11/ABCDiatype-Black.woff` | commercial foundry |
| shortnotice.studio | Helvetica Neue / -apple-system stacks | system | fallback | |
| shortnotice.studio | icomoon, swiper-icons | icon fonts | self-hosted theme assets | |
| brian-eno.net (also crawled) | Neue-Haas-Grotesk-DisplayPro 55 Roman, 65 Medium | Neue Haas Grotesk Display Pro (Monotype) | **self-hosted** | commercial foundry |
| brian-eno.net | Roboto | Roboto | Google Fonts, through YouTube embeds | OFL |

No font file was copied from any of these sites.

## What /gillenwebsite uses
| role | variable | face | file and source | licence |
|---|---|---|---|---|
| informational text: captions, credits, track lists, buttons | `--font-info` | **TeX Gyre Heros** 400 + italic. This is GUST's free build of URW Nimbus Sans, the same design as gaeawoods' face. | `app/gillenwebsite/fonts/texgyreheros-*.woff2`, converted from the CTAN `qhv2.004otf.zip` OTFs | GUST Font License (`app/gillenwebsite/fonts/GUST-FONT-LICENSE.txt`), free |
| title (one display line) | `--font-title` | **Archivo** (wdth axis), a placeholder | Google Fonts through `next/font/google` | OFL, free |

The gaeawoods body font is not on Google Fonts and is not freely licensed, so TeX Gyre Heros is the closest free match.
**To license the real face:** buy **URW Nimbus Sans Light** (weights 300 and 300 italic) from URW Type Foundry, or use it through an Adobe Fonts subscription as gaeawoods does. Then replace the two files in `app/gillenwebsite/fonts.ts`. TeX Gyre Heros has no Light, so the site runs at 400.

Rules kept: one weight across the page, 400 (R2). The small interface size is 12 px (R9). There are two faces (R11).

## Measured on localhost:3217/gillenwebsite at 1440×900 (`~/arena/lexicon/fontcheck.mjs`)
- Rendered families: `info` (next/font's name for TeX Gyre Heros) on 158 text nodes; `Archivo` on 10.
- Weights in use: 400 only.
- Sizes by node count: 12 px ×158, 28 px ×9, 20 px ×1.
- Font files loaded: `texgyreheros_regular…woff2`, `texgyreheros_italic…woff2` and two Archivo subsets.
