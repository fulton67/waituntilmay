# Paste-to-deploy — sie.market v10

The Webflow grant covers workspace 68556fb5691d8adc81e2fdc2 (Dauan Jacari), not
sie.market's 6ab08ed1200d66b2bf7a5ca1, so site 6ab09c2043ba16c77bec74be returns
"The site cannot be found". Everything is hosted and byte-verified. Paste in this order (the catalogue JSON rides in the site footer):

1. 1-site-head.html   -> Site settings / Custom code / Head code
2. 2-site-footer.html -> Site settings / Custom code / Footer code
3. 3-page-home.html   -> page "/"       / Page settings / Before </body>
4. 4-page-videos.html -> page "/videos" / Page settings / Before </body>

The videos page slug must be **videos** (it was created as "sie", id
6ab3da62aedbf627496688e4 — rename it). Then Publish to sie.market + www.sie.market.

Hosted and verified:
  https://assets.sie.market/sie.v12.css        9,697 B
  https://assets.sie.market/sie.v12.js         14,772 B
  https://assets.sie.market/myth-index.v1.css    5,409 B   (vendored component, verbatim from Downloads/component.zip)
  https://assets.sie.market/myth-index.v1.js     8,377 B   (vendored component, verbatim from Downloads/component.zip)
  https://assets.sie.market/fonts.v1.css        2,206 B   + fonts/*.woff2
  https://assets.sie.market/sie-intro.v4.mp4  206,987 B
All six images are already in the sie.market asset store.

To let the API do this instead: re-authorize the Webflow connector and tick
sie.market in Naim's Workspace — the workspace switcher at the top of the
authorization screen defaults to whichever workspace was used last.
