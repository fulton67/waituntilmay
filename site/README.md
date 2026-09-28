# sie.market — front-end bundle (v5)
Drop-in source for the Webflow build. This is the current signed-off look.

- index.html        two pages in one document, hash-routed (#home / #sie). The #intro block at the top of <body>
                    is SITE-WIDE: put its markup + the intro CSS/JS in site-wide custom code before </body>, not in a page.
- css/sie.v5.css    all styling; type law clamp(11px,3.136vw,16px); logo small + fixed top-left on all sizes
- js/sie.v5.js      intro (once per session, tap to skip), routing, gallery dots + arrow keys, disc scrub, video facades
- assets/           transparent WebP cutouts (alpha preserved), disc overlay, sie-logo.png (SIE #ededed, 愛 red),
                    sie-intro.mp4 (H.264 over black, 720×870, 30fps, 2.6s, ~200 KB — plays on iOS; no alpha needed)

Disc overlay geometry (from the 3243x1515 original): left 53.685% / top 2.442% / width 43.54% of the open-case photo.
Buy link placeholder: replace with https://shop.sie.market/cart/{SHOPIFY_VARIANT_ID}:1
Versioning: v1/v2 are burned. Any change ships as sie.v6.css / sie.v6.js — Webflow's CDN caches by name.
Hosting: css/js/mp4 on assets.sie.market (Vercel static project); images as Webflow assets.

Gallery order + captions (data-title / data-copy on each slide, shown under the title and swapped on swipe):
 1 cd in case (emoji cover) — the main product paragraph
 2 open case, disc turning — placeholder copy, Naim to supply
 3 poster — title 'in loving memory of egan, tazparis'; copy about the lyric sheet / On My Terms video
 4 om cover — '1 of 3 included alternative album covers.'
Caption alignment: slide 1 justified; slides 2–4 carry data-align="center" and render centred.
