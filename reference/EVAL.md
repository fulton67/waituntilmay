# EVAL — what was asked vs what shipped

Written 2026-09-28, before any further building.

## Source of truth, located

The only markdown on this machine documenting the index UI and the myth-collection
hover button is **`C:/Users/naimj/webflow-migration/dauan-jacari/component/README.md`**
(packaged 2026-09-28 00:53), alongside `component/myth-index.css` and
`component/myth-index.js`. There is no separate notes file — I searched every `*.md`
under `webflow-migration/` and `Documents/` for "myth"; that README is the single hit.

The packaged CSS is byte-consistent with the two files already cited in this repo:

| token | component | original |
|---|---|---|
| pill | `myth-index.css:36-53` | `myth-head.v2.html:138` |
| pill hover | `myth-index.css:54` | `myth-head.v2.html:139` |
| row | `myth-index.css:115-124` | `myth-head.v2.html:149` |
| row hover | `myth-index.css:126` | `myth-head.v2.html:151` |
| num / title / price | `myth-index.css:128-136` | `myth-head.v2.html:152-154` |
| tap-target reasoning | — | `nav-index.css:92-95, 113-115` |

So the component *is* the source, and nothing needs deriving. That matters for the
verdicts below: several rows are "random" purely because I rebuilt a lookalike instead
of using files that already existed.

## The table

| # | asked for | what actually shipped | sourced? | verdict |
|---|---|---|---|---|
| 1 | luxury entrance sequence | v8/v9: title in word by word, 2.4× base, settles to body size; gallery fades in. Measured 2116 ms at both widths, marks logged. | **no source** — there is no motion precedent in the dj files. Timings came from the brief. | **correct** (to brief) |
| 2 | details always visible | v8 hid the paragraph behind a `details` toggle (which pass B asked for). Pass C exposed it as a plain `.desc` block. Now visible, justified. | n/a | **correct** |
| 3 | index-language buy | A hand-written `<a class="buy">` styled to look like the pill. v8 used my inverted `--idx-*` variables; v9 replaced them with the literal `myth-head.v2.html:138/139` values. Still a plain link. | tokens yes (`:138`, `:139`); **mechanism no** | **random** — the pill is a lookalike. No panel, no rows, no hover preview, no numbering, no sticky head. The actual component was sitting in `component/` unused. |
| 4 | checkout section under buy | v8 built `.summary` with three rows on the `28px 1fr 60px` grid (item, shipping US, shipping RoW). Pass C deleted all three. | grid yes (`:149`) | **missing** — nothing under buy now. And the two shipping rows never belonged on the page; that is checkout's job. |
| 5 | corner nav "shop"/"videos" | `<a class="corner">` with a number span. v8 gave it two hairlines and a grid; v9 gave it the literal pill tokens. | tokens yes (`:138`, `:139`); **mechanism no** | **random** — same lookalike problem. Also points at `/sie`, not `/videos`. |
| 6 | videos grid, labels under tiles | 14 tiles from `artist-map.json`, 2 cols at 390 / 5 at 1280, 3:2 aspect, label under each tile, one line with ellipsis. | yes — label role is `myth-index.css:129-135` (`overflow:hidden; text-overflow:ellipsis; white-space:nowrap`) | **correct** |
| 7 | large player | Tap opens a black overlay, exactly one `youtube-nocookie` iframe, true 16:9 at every size, landscape fills height (693.3×390 in an 844×390 viewport). Closes on X, Esc, outside-tap, browser Back. Previews capped at 4 on touch. | no source needed | **correct** |
| 8 | auto-updating feed | **Nothing.** `site/videos.json` is a hand-run `yt-dlp` snapshot from 2026-09-23. No Action, no schedule, no run id. | n/a | **missing** |

### Also true, and not in the table

The last two passes never reached production. `assets.sie.market` serves v8; the Webflow
staging site still serves **v7**; `sie.market` and `www.sie.market` both return Webflow's
404. The grant flipped mid-session to the Dauan Jacari workspace, so v8 and v9 exist only
locally and in `site/build/webflow-paste/`. Three of the eight rows above have therefore
never been seen on a real URL.

## The five things that make it feel less than luxury

**1. None of the controls are the real component.** This is the whole problem. The pill,
the glass panel, the sticky column head, the continuous numbering, the 180×220 hover
preview that follows the cursor — that apparatus *is* the luxury. I reproduced a
border-radius and a background colour and shipped a lozenge. Two files in `component/`
would have given the real thing.

**2. A translucent white pill on flat black is worse than either.** v9 applied
`rgba(255,255,255,0.72)` + `backdrop-filter: blur(8px)` literally. On dauanjacari that
sits over photographs and reads as glass. Over `#000` there is nothing to blur, so it
resolves to a flat grey-white lozenge with black text — the most conspicuous element on
the page, and the least considered. Either give it something to sit over, or re-derive the
surface for a dark ground. Applying it verbatim was the wrong instinct.

**3. The page has no facts.** It ends on a 70-word justified paragraph. "35 copies",
"physical only, never on streaming", "the music, in its totality" are the reasons this
object costs $80, and they are buried mid-sentence in body copy. An edition states its
terms in a table.

**4. The type is the tell.** Everything else is measured to the reference sites, and then
it renders in `"Helvetica Neue", Helvetica, Arial` — which on Naim's Windows box means
Arial. ear-music, thecorrectdistance and dauanjacari are all on real grotesques.
No webfont is the single largest gap between this and the references.

**5. Motion is standing in for hierarchy.** 2.1 seconds of choreography, and when it
settles, title / caption / price / description all sit within one step of each other in
size and colour. The sequence spends attention it then has nowhere to direct. Fix the
resting hierarchy first; the entrance should point at something.

*Runner-up:* the disc spins forever at 12 s/turn. Perpetual rotation reads as a spinner —
a loading state, not an object.
