# Source metrics vs pixels

`source.json` holds every board block whose source is a web page: the page and all its stylesheets, the declared font rules, the @font-face files read with fontTools (unitsPerEm, cap height, x-height, kerning pairs), and any typeface credits in the page text. LIVE = the board image is a screenshot of that page, so its CSS set the pictured type. HOST = a case study or gallery hosting a raster: its CSS is the host's own.

| Block | Kind | Declared / credited | Font files (x/cap from the file) | Pixel x/cap (median, n) | Verdict |
|---|---|---|---|---|---|
| 36747221 | HOST | — | — | 0.768 (n=6) | no usable source: 403 |
| 14664481 | HOST | America, Lyon | GT America Light: 0.704 (upm 1000, 4042 kern pairs)<br>GT America Medium: 0.704 (upm 1000, 4797 kern pairs) | 0.706 (n=3) | host page: its fonts describe the host, not the image; credits used as a lead only |
| 16453124 | HOST | — — The multiplicity is equally embodied in typography — a mix of serif and sans serif, balanc | — | 0.617 (n=6) | host page: its fonts describe the host, not the image; credits used as a lead only |
| 21587531 | HOST | HS Sans, sans-serif, monospace, inherit | Univers LT W04 75 Black: 0.688 (upm 1000, 2659 kern pairs)<br>Univers LT W04 55 Roman: 0.688 (upm 1000, 1247 kern pairs)<br>Univers LT W04 65 Bold: 0.688 (upm 1000, 2813 kern pairs)<br>Univers LT W04 67 Bold Cond: 0.688 (upm 1000, 396 kern pairs) | 0.659 (n=2) | host page: its fonts describe the host, not the image; credits used as a lead only |
| 41911984 | HOST | inherit, Monaco, var(--font-family) | — | 0.703 (n=3) | host page: its fonts describe the host, not the image; credits used as a lead only |
| 23958815 | HOST | monospace, sans-serif, PortraitText | — | None (n=0) | host page: its fonts describe the host, not the image; credits used as a lead only |
| 16463981 | HOST | var(--font-savee), var(--default-font-family, var(--default-mono-font-family, Roboto Mono | Inter Variable: 0.75 (upm 2048, 31159 kern pairs)<br>Inter Variable Italic: 0.75 (upm 2048, 30583 kern pairs) | None (n=0) | host page: its fonts describe the host, not the image; credits used as a lead only |
| 7529470 | HOST | — | — | 0.437 (n=1) | no usable source: urllib 403; Chrome redirected to Adobe ID |
| 34771058 | HOST | inherit, Monaco, var(--font-family) | — | None (n=0) | host page: its fonts describe the host, not the image; credits used as a lead only |
| 13828406 | HOST | — — Fonts by Pangram Pangram Foundry | — | 0.716 (n=1) | host page: its fonts describe the host, not the image; credits used as a lead only |
| 26381730 | LIVE | Helvetica Now Text | — | 0.736 (n=4) | declared face only; no file to compare |
| 52340827 | LIVE | Arial | — | 0.647 (n=2) | declared face only; no file to compare |
| 41432513 | HOST | inherit, Monaco, var(--font-family) | — | 0.76 (n=8) | host page: its fonts describe the host, not the image; credits used as a lead only |
| 24130326 | LIVE | STK Bureau Serif, STK Bureau Sans, monospace, sans-serif | STK Bureau Sans Book: 0.739 (upm 1000, 11776 kern pairs)<br>STK Bureau Sans Medium: 0.739 (upm 1000, 11776 kern pairs)<br>STK Bureau Serif Book: 0.739 (upm 1000, 11250 kern pairs)<br>STK Bureau Serif Light: 0.739 (upm 1000, 11250 kern pairs) | 0.733 (n=13) | agree within 0.006 |

## What the sources say

- **24130326 waysintopractice.no (LIVE):** STK Bureau Serif (Book, Light) for text, STK Bureau Sans for UI. The pictured serif in that screenshot is STK Bureau Serif; compare x/cap above.
- **26381730 Zara (LIVE, read in Chrome):** Helvetica Now Text at 300 for body, uppercase at 12 px / 20 px with 0.8 px tracking for nav (+6.7% em).
- **52340827 aaron-meyers.com (LIVE):** Arial, the system default.
- **14664481 SIJO (favourite, HOST):** High Tide's own site uses GT America (Light, Medium) and Lyon. High Tide designed SIJO, and the SIJO serif crop has Lyon-like proportions, but the host CSS is not proof of the brand's face.
- **13828406 Wallace Corp (HOST):** the shot credits 'Fonts by Pangram Pangram Foundry'.
- **16453124 Eadem (HOST):** the case study names no face, only 'a mix of serif and sans serif'.
- **7529470 EQL (favourite):** Behance returned 403, then redirected to Adobe sign-in in Chrome; no face credited in the text read.

## No usable source (42 blocks)

Image files, Instagram/Pinterest/LinkedIn pins and CDN links carry no page CSS: 4358580, 832475, 40898406, 39832259, 50510620, 4341196, 52313969, 34175362, 2527310, 43001699, 47311638, 47161957, 32335068, 38155009, 24946075, 30880633, 33635746, 38275156, 34126462, 31815447, 22772082, 11460382, 13607089, 47483050, 47483045, 32197302, 31223791, 30248124, 27647159, 27454118, 27454113, 12087163, 13902728, 2145281, 15688099, 28246874, 52020245, 52302251, 30940781, 12400773, 38944212, 52386109.
