# What Hacker News actually uses for design systems, read for one brand across social, video and web

Research run on 2026-11-06. Source: the Algolia HN API (search and search_by_date for the last 24 months). Item-level data is in `data/hn.json`, and the curated claims with comment ids are in `data/findings/*.json`. Every link below goes to the HN comment or story that backs the claim.

**The short version.** HN is overwhelmingly a product-UI crowd. Most design-system talk is about React components, Tailwind and Storybook. The brand/marketing slice is small but consistent, and it points one way. Keep a **small token file in code** and treat every tool (Figma, CSS, image renderer, video renderer) as a consumer of it, never the source. Render images and video with **the same HTML/CSS engine as the web page**, so nothing drifts. Use **one icon set** delivered as SVG. Almost nobody on HN bridges tokens into Premiere/After Effects natively. The working pattern is to render brand graphics in code and hand finished video, often with transparency, to the editor.

---

## 1. What people use, ranked by how often HN recommends it

`rec` = distinct comments recommending it or reporting positive use. `men` = distinct comments naming it, noise removed. Counts come from reading, not keyword hits.

### 1a. Token tooling

| # | Tool | What it does | rec / men | Who recommends it, for what | Strongest criticism |
|---|---|---|---|---|---|
| 1 | **Tailwind theme/config** as the token file | Config defines colour, space, type and radius scales | 46 / 466 | Delete the defaults and keep only brand values, so off-brand mocks get caught [34923677](https://news.ycombinator.com/item?id=34923677) [38116639](https://news.ycombinator.com/item?id=38116639). Name by purpose (`text-secondary`, `bg-action`) [20697263](https://news.ycombinator.com/item?id=20697263). Config mirrors the design file [35355915](https://news.ycombinator.com/item?id=35355915) | Web-only. Designers and mobile teams would not adopt Tailwind values [29122025](https://news.ycombinator.com/item?id=29122025). Markup tied to a custom config doesn't move between projects [39042204](https://news.ycombinator.com/item?id=39042204) |
| 2 | **CSS custom properties** | Native variables, swappable at runtime | 27 / 75 | Purpose-named variable layer makes light/dark a theme-file swap [38014566](https://news.ycombinator.com/item?id=38014566) [42215728](https://news.ycombinator.com/item?id=42215728). "Tailwind's scales as root variables, 90% of the benefit, no lock-in" [44691311](https://news.ycombinator.com/item?id=44691311). Prefer about 20 purpose-named variables to 100+ [49960600](https://news.ycombinator.com/item?id=49960600) | Only solves the web; a brand change must also reach Figma, apps and docs [42451571](https://news.ycombinator.com/item?id=42451571) |
| 3 | **Open Props** | Ready-made CSS-variable tokens (OKLCH palettes, fluid type, easings) | 17 / 27 | Tailwind-like scales in plain CSS, no build step [32824220](https://news.ycombinator.com/item?id=32824220) [41485056](https://news.ycombinator.com/item?id=41485056). JSON exports for Figma and Style Dictionary (per open-props.style) | Shared vocabularies have little adoption incentive [37829978](https://news.ycombinator.com/item?id=37829978) |
| 4 | Vanilla Extract | Typed CSS-in-TS themes → static CSS variables | 9 / 11 | Type-safe tokens at build time [45219803](https://news.ycombinator.com/item?id=45219803). Consumes Tokens Studio output cleanly [42456253](https://news.ycombinator.com/item?id=42456253) | Ends up as one-offs plus a variable theme like any CSS-in-JS [33793801](https://news.ycombinator.com/item?id=33793801) |
| 5 | Sass variables | Classic token layer (ITCSS settings layer) | 8 / 56 | Source of truth in SCSS, not JS [19762559](https://news.ycombinator.com/item?id=19762559). ITCSS token layer [48162200](https://news.ycombinator.com/item?id=48162200) | Generated SCSS from a big system became unreadable [40792232](https://news.ycombinator.com/item?id=40792232) |
| 6 | Theme UI / styled-system | Theme-object spec of scales | 7 / 14 | Component code never makes ad-hoc style choices [19192471](https://news.ycombinator.com/item?id=19192471) | Stack ripped out after styling bugs became undiagnosable [32215943](https://news.ycombinator.com/item?id=32215943) |
| 7 | **Style Dictionary** | Builds one JSON/DTCG source into CSS, SCSS, JS, iOS and Android | 6 / 10 | The standard pipeline tool, alongside Salesforce Theo [21477897](https://news.ycombinator.com/item?id=21477897). Tokens Studio → repo → Style Dictionary → Sass and theme outputs [42449151](https://news.ycombinator.com/item?id=42449151) | Per-platform colour conversion (OKLCH → hex) got too complex [37787192](https://news.ycombinator.com/item?id=37787192) |
| 8 | Tokens Studio | Figma plugin; tokens as JSON in Git; designers open PRs | 4 / 6 | Designers PR token changes with light developer review [42456253](https://news.ycombinator.com/item?id=42456253) | Stays in sync only while every designer uses it; drifted when new designers didn't [42449151](https://news.ycombinator.com/item?id=42449151) |
| 9 | Figma Variables | Figma-native tokens with modes | 4 / 8 | Figma variables kept 1:1 with CSS variables [39504200](https://news.ycombinator.com/item?id=39504200) | Bogged down at scale; one designer gave up after a month and built the system in code [44490181](https://news.ycombinator.com/item?id=44490181) |
| 10 | W3C DTCG format | Vendor-neutral JSON (`$value`, `$type`, aliases) | 4 / 8 | Matters once a decision must reach SVG, Sass, Figma and several modes [42448251](https://news.ycombinator.com/item?id=42448251) | Still a draft; colour and theming unresolved [42450933](https://news.ycombinator.com/item?id=42450933) |
| — | Diez, Specify, Supernova, Theo, Terrazzo, Utopia, Radix Colors, Panda | | ≤2 each | Thin evidence. Diez and Specify are mostly praised by their own makers [21867661](https://news.ycombinator.com/item?id=21867661) [36431729](https://news.ycombinator.com/item?id=36431729). Stitches was abandoned [37098442](https://news.ycombinator.com/item?id=37098442) | |

### 1b. Component and documentation tooling (mostly product-UI; low relevance to you)

| # | Tool | rec / men | For | Strongest criticism |
|---|---|---|---|---|
| 1 | **Storybook** | 23 / 32 | A showcase of the implemented system that developers and designers trust more than a Figma spec [28496035](https://news.ycombinator.com/item?id=28496035). A must-have once 3+ developers share components [28499348](https://news.ycombinator.com/item?id=28499348) | Pays off only for a coded component library maintained by several developers [28499348](https://news.ycombinator.com/item?id=28499348) [39701233](https://news.ycombinator.com/item?id=39701233) |
| 2 | Radix (+ Radix Themes/Colors) | 12 / 16 | Default foundation for custom React systems [38629896](https://news.ycombinator.com/item?id=38629896) | React-only web primitives [46689962](https://news.ycombinator.com/item?id=46689962) |
| 3 | Bootstrap (themed) | 12 / 22 | A themed Bootstrap is a legitimate system, e.g. Swiss Post [33149981](https://news.ycombinator.com/item?id=33149981) [43641737](https://news.ycombinator.com/item?id=43641737) | Generic framework plus brand colours is not a design [45301194](https://news.ycombinator.com/item?id=45301194) |
| 4 | **Figma** | 10 / 28 | Expected design tool. A small file of colours, gradients, shadows and type is enough for a brand [33101860](https://news.ycombinator.com/item?id=33101860). Frames rendered to OG images via REST [25932979](https://news.ycombinator.com/item?id=25932979) | "A picture of the system, not the system": keep tokens in code and push them into Figma [33015114](https://news.ycombinator.com/item?id=33015114) [42457647](https://news.ycombinator.com/item?id=42457647) |
| 5 | Chromatic | 10 / 10 | Visual regression on Storybook [24133077](https://news.ycombinator.com/item?id=24133077) | Only matters if you have Storybook |
| 6 | React Aria | 10 / 13 | Accessibility out of the box [29118016](https://news.ycombinator.com/item?id=29118016) | Steep for a small site [37723152](https://news.ycombinator.com/item?id=37723152) |
| 7 | **Penpot** | 9 / 19 | Open, self-hostable, SVG/CSS-native, native tokens and MCP [32851779](https://news.ycombinator.com/item?id=32851779) [46067169](https://news.ycombinator.com/item?id=46067169) | Performance, plus export fidelity (text to path, fonts). These matter for social exports [33013123](https://news.ycombinator.com/item?id=33013123) [46076140](https://news.ycombinator.com/item?id=46076140) |
| 8 | shadcn/ui | 9 / 24 | Fast scaffold themed from one CSS-variable file [36730103](https://news.ycombinator.com/item?id=36730103) | Looks generic unless you replace the defaults [47985939](https://news.ycombinator.com/item?id=47985939) |
| 9 | zeroheight | 5 / 12 | Brandable docs site pulling from Figma and Storybook [21410514](https://news.ycombinator.com/item?id=21410514) | Another paid layer; parity stays manual [21412412](https://news.ycombinator.com/item?id=21412412) |
| — | Histoire, Ladle, Fractal, Framer, MUI, Headless UI, Base UI, Sketch, Pattern Lab | ≤5 each | Framer marketing site mirroring the app's CSS variables [46065877](https://news.ycombinator.com/item?id=46065877) | Pattern Lab: no substantive comments |

### 1c. Programmatic rendering (HTML→PNG, OG generators, templating)

| # | Tool | rec / men | For | Strongest criticism |
|---|---|---|---|---|
| 1 | **Puppeteer / Playwright (headless Chrome)** | 17 / 51 | Fill an HTML template, screenshot it. Full CSS and fonts, so the image matches the page [29810032](https://news.ycombinator.com/item?id=29810032) [27077171](https://news.ycombinator.com/item?id=27077171). Reuse front-end code as the renderer [16670286](https://news.ycombinator.com/item?id=16670286). GitHub runs its OG images this way (≈2M a day, per its blog) | Out-of-memory crashes and cost in production [45253318](https://news.ycombinator.com/item?id=45253318). Cold starts and a ≈300 MB binary [47440652](https://news.ycombinator.com/item?id=47440652). Screenshots before fonts load [27459098](https://news.ycombinator.com/item?id=27459098). Emoji differ from the browser [34369647](https://news.ycombinator.com/item?id=34369647) |
| 2 | **Satori / @vercel/og** | 13 / 33 | Millisecond renders that replaced 5-second Chrome cards [33158551](https://news.ycombinator.com/item?id=33158551) [33155870](https://news.ycombinator.com/item?id=33155870). The default for per-page OG in Next/Astro/Workers [42604616](https://news.ycombinator.com/item?id=42604616) | A subset of CSS with its own layout engine, fonts as buffers, "fighting Satori" [47765329](https://news.ycombinator.com/item?id=47765329). One builder had to keep the HTML card and the image card as **two renderers reading one theme file** [49629447](https://news.ycombinator.com/item?id=49629447) |
| 3 | Bannerbear | 9 / 22 | Founder: the main real use is **spreadsheet → Instagram posts and ad variants**, not OG images [25936711](https://news.ycombinator.com/item?id=25936711) | About $49 a month per ~1,000 images is "crazy" at low volume [46212773](https://news.ycombinator.com/item?id=46212773) |
| 4 | node-canvas / skia-canvas / @napi-rs/canvas | 7 / 13 | 50–100 ms per image with no browser [46212773](https://news.ycombinator.com/item?id=46212773) | You own text layout and wrapping [41940682](https://news.ycombinator.com/item?id=41940682) |
| 5 | html-to-image / html2canvas | 7 / 13 | Client-side "download this card" [46332542](https://news.ycombinator.com/item?id=46332542) | html2canvas draws text a few pixels off [48991516](https://news.ycombinator.com/item?id=48991516) |
| 6 | resvg | 5 / 8 | SVG→PNG behind Satori; deterministic props → pixels with ffmpeg [33182568](https://news.ycombinator.com/item?id=33182568) [49786497](https://news.ycombinator.com/item?id=49786497) | Paired with Satori on Workers, cold renders exceeded crawler wait times [49629447](https://news.ycombinator.com/item?id=49629447) |
| 7 | Sharp | 5 / 5 | Re-encode heavy PNGs to JPEG/WebP [48774122](https://news.ycombinator.com/item?id=48774122) | — |
| 8 | Figma REST API | 5 / 9 | Design the card in Figma; a stable frame URL renders the latest version [25932979](https://news.ycombinator.com/item?id=25932979) | — |
| 9 | Placid / Canva / OG SaaS | ≤5 | Template editor plus API/Zapier for non-developers [17462161](https://news.ycombinator.com/item?id=17462161) [46271906](https://news.ycombinator.com/item?id=46271906) | Canva's Autofill is enterprise-only [47564886](https://news.ycombinator.com/item?id=47564886). A vendor shut down and forced a rebuild [41785788](https://news.ycombinator.com/item?id=41785788) |

### 1d. Icon systems

| # | Set | rec / men | For | Strongest criticism |
|---|---|---|---|---|
| 1 | **Iconify** | 19 / 40 | Single source across 200+ sets; a Figma plugin for designers [46670140](https://news.ycombinator.com/item?id=46670140); any icon as an SVG URL [46667000](https://news.ycombinator.com/item?id=46667000) | Mixed licences; downstream tools can strip attribution [34955665](https://news.ycombinator.com/item?id=34955665) |
| 2 | Heroicons | 14 / 33 | Small, elegant, "copy SVG" button [25875907](https://news.ycombinator.com/item?id=25875907) | Too small, so you mix in others and lose consistency [29872253](https://news.ycombinator.com/item?id=29872253) |
| 3 | Lucide | 12 / 50 | Active Feather fork with more icons [33225949](https://news.ycombinator.com/item?id=33225949) | **Now reads as an AI "slop" tell**: the LLM default, the shadcn stack [46674925](https://news.ycombinator.com/item?id=46674925) [47668467](https://news.ycombinator.com/item?id=47668467) |
| 4 | **Phosphor** | 11 / 14 | Best positive-to-mention ratio; six weights (thin → duotone) on one grid; a "hidden gem" [29871163](https://news.ycombinator.com/item?id=29871163) [40891453](https://news.ycombinator.com/item?id=40891453) | Occasionally missing a glyph [45091117](https://news.ycombinator.com/item?id=45091117) |
| 5 | Font Awesome | 8 / 40 | Free, covers the basics [7344120](https://news.ycombinator.com/item?id=7344120) | Inconsistent viewBox metrics, so icons misalign [35710469](https://news.ycombinator.com/item?id=35710469) |
| 6 | IcoMoon | 8 / 10 | Build a sprite from picked icons plus your own SVGs [7345052](https://news.ycombinator.com/item?id=7345052) | — (2014-era) |
| 7 | Fluent UI icons | 7 / 12 | Neutral base to build a system on [24993215](https://news.ycombinator.com/item?id=24993215) | Monochrome look-alikes hurt recognition [24992853](https://news.ycombinator.com/item?id=24992853) |
| 8 | Material Symbols | 5 / 18 | Huge, neutral, easy to draw matching extras [46666165](https://news.ycombinator.com/item?id=46666165) | Reads as Google [46666306](https://news.ycombinator.com/item?id=46666306) |
| 9 | Tabler | 4 / 6 | The Feather look with ≈5k icons [31122110](https://news.ycombinator.com/item?id=31122110) | "Pixel perfect" doubted [31122886](https://news.ycombinator.com/item?id=31122886) |

### 1e. Video and motion bridges

| # | Tool | rec / men | For | Strongest criticism |
|---|---|---|---|---|
| 1 | **Lottie** (+ Bodymovin) | 45 / 429 | App and web brand moments: logos, heroes, loaders [29635131](https://news.ycombinator.com/item?id=29635131). **PBS KIDS: one After Effects master → Lottie for apps, MOV for broadcast/YouTube, SVG for low-end devices** [44091391](https://news.ycombinator.com/item?id=44091391) | About 95% of AE features can't export, with no warning inside AE. You author from scratch [44090280](https://news.ycombinator.com/item?id=44090280) |
| 2 | **Remotion** | 30 / 131 | **AE-made assets plus a Remotion template plus a script pump out repeat-format videos** [47485960](https://news.ycombinator.com/item?id=47485960). A direct-to-consumer brand's in-house social/ad editor [48810576](https://news.ycombinator.com/item?id=48810576). TikTok-style captions and subtitles [40655710](https://news.ycombinator.com/item?id=40655710) [48453561](https://news.ycombinator.com/item?id=48453561). Site colours and fonts scraped into scene props [46732672](https://news.ycombinator.com/item?id=46732672) | 1–2 full-HD frames a second per instance, so long videos get expensive [40653433](https://news.ycombinator.com/item?id=40653433). Chrome frames not identical across machines [50053338](https://news.ycombinator.com/item?id=50053338) |
| 3 | Rive | 20 / 93 | Interactive and state-machine animation, smaller than Lottie [29635279](https://news.ycombinator.com/item?id=29635279) | $39 a month cloud editor; files locked online [39817019](https://news.ycombinator.com/item?id=39817019) |
| 4 | After Effects | 10 / 121 | Still unbeaten for motion graphics; JS expressions [43654878](https://news.ycombinator.com/item?id=43654878) | Lottielab's founder: a 30-year-old VFX tool with a plugin patchwork [37133128](https://news.ycombinator.com/item?id=37133128) |
| 5 | Lottielab / dotLottie / Cavalry | ≤7 | Lottie without AE [29634964](https://news.ycombinator.com/item?id=29634964); dotLottie theming [39932491](https://news.ycombinator.com/item?id=39932491) | Large exports unless you pay for hosting [44089087](https://news.ycombinator.com/item?id=44089087); dotLottie player is ≈308 KB [39936156](https://news.ycombinator.com/item?id=39936156) |
| 6 | Revideo / Motion Canvas | 3 / 9 | MIT licence vs Remotion's paid company licence [40656963](https://news.ycombinator.com/item?id=40656963) | Speed only on par with Remotion [40655238](https://news.ycombinator.com/item?id=40655238) |
| 7 | HyperFrames (HeyGen) | 1 / 3 | HTML+GSAP is easier for agents than React [47902856](https://news.ycombinator.com/item?id=47902856) | "Feels vibe-coded" next to Remotion [50369261](https://news.ycombinator.com/item?id=50369261) |
| 8 | **Premiere MOGRT / Essential Graphics** | 0 / 4 | Wanted for transcript-cued overlays [44203377](https://news.ycombinator.com/item?id=44203377) | Premiere's UXP API lacks MOGRT support (Adobe says it's coming) [44203377](https://news.ycombinator.com/item?id=44203377) |
| — | nexrender, ExtendScript, Theatre.js | 0 | **No HN evidence at all** | |

---

## 2. The approaches, not just the tools

**How tokens are structured so they port**
- **Three tiers, kept few.** Raw values (ramps) feed purpose-named tokens (`bg-brand`, `text-danger`), which feed component tokens. Each tier aliases the one below [44017526](https://news.ycombinator.com/item?id=44017526). Theming has two independent axes, mode (light/dark) and brand, and only a purpose-named layer handles both [37826760](https://news.ycombinator.com/item?id=37826760).
- **Don't over-layer.** The founder of the W3C token-format group tells teams to add only the layers they can document; most need a simple setup [42450000](https://news.ycombinator.com/item?id=42450000). A developer on a heavily tokenised Figma team describes missing tokens and endless coordination [42457647](https://news.ycombinator.com/item?id=42457647). Indirection hurts readability [44480588](https://news.ycombinator.com/item?id=44480588).
- **Name by purpose, not by colour,** so a rebrand doesn't touch markup [20697263](https://news.ycombinator.com/item?id=20697263). A counterpoint: people talk in colour names, so keep a friendly primitive name too [38120073](https://news.ycombinator.com/item?id=38120073).
- **Build the full ramp up front.** Brand guides usually ship about 5 colours with no tints, shades or accessible pairs [41966188](https://news.ycombinator.com/item?id=41966188). Hue and contrast aren't linear: the "dark yellow" problem and APCA [33246929](https://news.ycombinator.com/item?id=33246929).
- **Compile tokens into each target,** don't serve them over a network; that decays silently as schemas change [21867661](https://news.ycombinator.com/item?id=21867661).

**"One source of truth → many outputs": what worked**
- **One master, many exports.** PBS KIDS turns one AE file into Lottie, MOV and SVG [44091391](https://news.ycombinator.com/item?id=44091391). A graph-paper app has one pure `buildPaper(config)` function feeding the SVG preview, the PDF and the OG image, with no duplicated drawing logic [48761320](https://news.ycombinator.com/item?id=48761320).
- **Tokens in code, pushed into design tools,** with the value growing as the number of surfaces grows [42451571](https://news.ycombinator.com/item?id=42451571) [33015114](https://news.ycombinator.com/item?id=33015114).
- **A small vocabulary agreed by designer and developer** (composite type styles, named radii and spacing) cut style count sharply [26449773](https://news.ycombinator.com/item?id=26449773) [33797043](https://news.ycombinator.com/item?id=33797043).
- **Cut the config down to legal values only,** so off-brand work becomes impossible or obvious [34923677](https://news.ycombinator.com/item?id=34923677).
- **Tokens plus written rules as AI guardrails** (CLAUDE.md or DESIGN.md, plus a lint for off-system colours) [48904240](https://news.ycombinator.com/item?id=48904240) [46898280](https://news.ycombinator.com/item?id=46898280) [47893608](https://news.ycombinator.com/item?id=47893608).
- **For motion, transparent video (ProRes/HEVC/VP9 alpha) instead of a runtime format,** when the animation is complex [44094826](https://news.ycombinator.com/item?id=44094826).

**What rotted**
- **A framework config as the cross-platform source.** Tailwind values didn't reach mobile, TV or design [29122025](https://news.ycombinator.com/item?id=29122025). Tokens should sit above the framework [43641737](https://news.ycombinator.com/item?id=43641737).
- **A design-tool-owned source** (Tokens Studio/Figma) drifted when designers stopped using the tokens [42449151](https://news.ycombinator.com/item?id=42449151). At scale it needs a review gate, and Figma never stays 1:1 with code [46672545](https://news.ycombinator.com/item?id=46672545).
- **Two renderers for one design** (HTML page plus a Satori image) need a shared theme file to avoid drift [49629447](https://news.ycombinator.com/item?id=49629447).
- **Print-first brand books** went unused on web projects [17517231](https://news.ycombinator.com/item?id=17517231). **Big docs sites nobody reads**: a marketer with 30 minutes won't read five hours of docs, so codify only what repeats [38632344](https://news.ycombinator.com/item?id=38632344).
- **Defaults left in** (Tailwind palette, stock shadcn, Lucide) make everything look generic [36983305](https://news.ycombinator.com/item?id=36983305) [47668467](https://news.ycombinator.com/item?id=47668467).
- **Icon fonts** (blocked fonts, inaccessible) [30846958](https://news.ycombinator.com/item?id=30846958) and **mixed icon sets** (viewBox and stroke mismatch) [35710469](https://news.ycombinator.com/item?id=35710469).
- **AE→Lottie without a dedicated AE person.** Teams fell back to video or WebP [29634924](https://news.ycombinator.com/item?id=29634924).
- **Cloud-only motion editors.** Fable shut down and deleted project files [41851706](https://news.ycombinator.com/item?id=41851706).

---

## 3. Open design systems people keep pointing at

| System | Good reference for | Relevance to a visual brand |
|---|---|---|
| **USWDS** | Colour tokens graded so contrast is guaranteed [30845302](https://news.ycombinator.com/item?id=30845302); praised over GOV.UK for density [30880712](https://news.ycombinator.com/item?id=30880712) | **High**: copy the contrast-grade idea for your ramps |
| **Wise** (rebrand) | A brand-led, accessible colour rebrand, and a warning: a "fun" rebrand hurt trust for a money brand [35036772](https://news.ycombinator.com/item?id=35036772) | **High**: maps directly onto a medical brand that sells trust |
| **Audi CI**, Mailchimp | On-brand systems that span media, from identity down to code [35384915](https://news.ycombinator.com/item?id=35384915) | **High**: identity-first structure |
| "Integrated branding" / parametric identity systems | The 50-year-old practice that UI design systems rediscovered [38633927](https://news.ycombinator.com/item?id=38633927) | **High**: the right mental model for social + video + web |
| GOV.UK | Plain-language content style and research-backed docs format [30877798](https://news.ycombinator.com/item?id=30877798) | Medium: voice and tone, not visuals |
| IBM Carbon | Several themes from one token set [36082122](https://news.ycombinator.com/item?id=36082122) | Medium: theming model |
| Airbnb DLS | Early visual language unifying brand and product [11768420](https://news.ycombinator.com/item?id=11768420) | Medium |
| Zomato Sushi | Design system as brand consistency across media [21791063](https://news.ycombinator.com/item?id=21791063) | Medium |
| Material | Token naming taxonomy; don't copy the look [38631419](https://news.ycombinator.com/item?id=38631419) | Low |
| Polaris, Atlassian, Primer, Spectrum, Fluent, PatternFly, Lightning | Product UI | Low |
| Kiwi Orbit | Warning: an "open" system on a closed font [27836734](https://news.ycombinator.com/item?id=27836734) | Low |

Healthcare signal: style tells visitors whether they're in the right place; calm and professional beats playful [30848007](https://news.ycombinator.com/item?id=30848007).

---

## 4. Your case: the shortest sensible stack for one brand across social, video and web

1. **One `tokens.json` in git, DTCG-shaped, two tiers plus a few component tokens.** Primitives (full colour ramps with tints and shades, two typefaces, a type scale, radii, spacing) feed about 20 purpose-named tokens (`brand.primary`, `surface`, `ink`, `caption.bg`, `lowerthird.accent`). *Evidence:* single language-agnostic source [42451571](https://news.ycombinator.com/item?id=42451571); few layers [42450000](https://news.ycombinator.com/item?id=42450000); ramps and accessible pairs up front [41966188](https://news.ycombinator.com/item?id=41966188).
2. **A small build script, or Style Dictionary, emitting:** CSS variables for the web page, a TS/JSON module for the renderers, and swatch values for Figma and Adobe. *Evidence:* Style Dictionary is the standard tool [21477897](https://news.ycombinator.com/item?id=21477897). Keep it tiny; colour-conversion complexity is the known pain [37787192](https://news.ycombinator.com/item?id=37787192). Open Props shows the CSS-variable output shape [32824220](https://news.ycombinator.com/item?id=32824220).
3. **One rendering engine for everything: HTML/CSS in headless Chrome.**
   - **Web:** the page reads the CSS variables.
   - **Social stills** (4:5, 1:1, 9:16, carousels): HTML templates at those sizes, screenshotted with Playwright in a local or CI batch. It's the same CSS as the site, so there's no second renderer to drift [29810032](https://news.ycombinator.com/item?id=29810032) [27077171](https://news.ycombinator.com/item?id=27077171) [49629447](https://news.ycombinator.com/item?id=49629447). The out-of-memory and cold-start complaints are about serverless crawler endpoints, not a batch you run yourself [45253318](https://news.ycombinator.com/item?id=45253318) [47440652](https://news.ycombinator.com/item?id=47440652). Wait for fonts before each shot [27459098](https://news.ycombinator.com/item?id=27459098).
   - **Video graphics:** Remotion compositions (captions, lower thirds, title cards) read the same tokens module. Render them as **transparent overlays or finished clips** for Premiere, rather than trying to drive Premiere. *Evidence:* Remotion templates for repeat-format video [47485960](https://news.ycombinator.com/item?id=47485960); in-house brand social editor [48810576](https://news.ycombinator.com/item?id=48810576); captions [48453561](https://news.ycombinator.com/item?id=48453561); transparent video as the handoff [44094826](https://news.ycombinator.com/item?id=44094826); Premiere's MOGRT automation isn't there yet [44203377](https://news.ycombinator.com/item?id=44203377).
   - **If you need fast server-side OG images later,** Satori + resvg is the HN default. Accept the CSS subset and feed it the same tokens file [33158551](https://news.ycombinator.com/item?id=33158551) [49629447](https://news.ycombinator.com/item?id=49629447).
4. **Icons: Phosphor, one weight family, as an SVG sprite or inline SVG with `currentColor`.** Export the same SVGs into Figma and AE. Draw any custom icon on Phosphor's grid and stroke spec. Keep the MIT notice on a credits page. *Evidence:* best rec/mention ratio [29871163](https://news.ycombinator.com/item?id=29871163); weights suit a distinctive brand; sprites with currentColor worked [31810882](https://news.ycombinator.com/item?id=31810882); encode the grid spec [46986823](https://news.ycombinator.com/item?id=46986823); licence notice [34184175](https://news.ycombinator.com/item?id=34184175). Iconify's Figma plugin is the easy way to get it into Figma [46670140](https://news.ycombinator.com/item?id=46670140).
5. **Figma (or Penpot) for layout and the brand sheet, as a consumer of the tokens.** *Evidence:* "a picture of the system" [33015114](https://news.ycombinator.com/item?id=33015114); a small brand file is enough [33101860](https://news.ycombinator.com/item?id=33101860). Penpot is the open option, but check text and font export first [46076140](https://news.ycombinator.com/item?id=46076140).
6. **One short brand page plus a DESIGN.md/CLAUDE.md, not a docs site.** Codify only what repeats, and lint for off-palette colours if AI generates the posts. *Evidence:* [38632344](https://news.ycombinator.com/item?id=38632344) [48904240](https://news.ycombinator.com/item?id=48904240) [46898280](https://news.ycombinator.com/item?id=46898280).
7. **Tone: calm, clinical-trustworthy, not "fun".** *Evidence:* [35036772](https://news.ycombinator.com/item?id=35036772) [30848007](https://news.ycombinator.com/item?id=30848007).

**What HN says to avoid**
- **Tailwind config or Figma Variables as the master source.** They don't reach video or design tools [29122025](https://news.ycombinator.com/item?id=29122025) [44490181](https://news.ycombinator.com/item?id=44490181).
- **Lucide, stock shadcn, Inter and similar defaults.** They now read as AI-generated [46674925](https://news.ycombinator.com/item?id=46674925) [47668467](https://news.ycombinator.com/item?id=47668467).
- **Icon fonts, and mixing icon sets** [30846958](https://news.ycombinator.com/item?id=30846958) [35710469](https://news.ycombinator.com/item?id=35710469).
- **AE→Lottie for social video.** Lottie is for app and web runtime animation, and AE export is a minefield [44090280](https://news.ycombinator.com/item?id=44090280). Ship MP4/MOV instead.
- **Cloud-only editors whose files you can't take with you** (Rive's free plan, the defunct Fable) [39817019](https://news.ycombinator.com/item?id=39817019) [41851706](https://news.ycombinator.com/item?id=41851706).
- **Hosted template APIs** (Bannerbear, Placid, Canva Autofill) unless a non-developer must run the templates. They cost $49+ a month per ~1,000 images and carry shutdown risk [46212773](https://news.ycombinator.com/item?id=46212773) [41785788](https://news.ycombinator.com/item?id=41785788) [47564886](https://news.ycombinator.com/item?id=47564886).
- **Storybook, Chromatic and zeroheight.** There is no component codebase to justify them [28499348](https://news.ycombinator.com/item?id=28499348).
- **Over-tokenising** [42457647](https://news.ycombinator.com/item?id=42457647).

**Where HN has no evidence:** native token → Premiere/After Effects bridges (MOGRT with data, nexrender, ExtendScript token import) are essentially undiscussed. MOGRT has 4 comments and nexrender none. If lower thirds must be editable inside Premiere, that is a decision to test outside HN's evidence.

---

## 5. Ten threads worth reading in full

1. [Design Token-Based UI Architecture](https://news.ycombinator.com/item?id=42445834): Fowler's article plus the W3C token-format founder on when token layers pay off and when they become bureaucracy.
2. [It's weird how design systems are so rote, yet so difficult](https://news.ycombinator.com/item?id=38627674): the brand-identity framing, integrated branding and parametric identity.
3. [Lottie is an open format](https://news.ycombinator.com/item?id=44088216): the most candid account of AE→Lottie pain, plus PBS KIDS' one-master, many-outputs brand pipeline.
4. [Vercel OG Image Generation](https://news.ycombinator.com/item?id=33155829): Satori's speed and limits, and platforms rejecting SVG og:images.
5. [Ask HN: Convert HTML to PNG server-side](https://news.ycombinator.com/item?id=21696173): headless Chrome vs wkhtmltoimage vs plain SVG, with real RAM numbers.
6. [Iconify: Library of Open Source Icons](https://news.ycombinator.com/item?id=46665411): a 2026 poll of which icon set people use, and the Lucide-as-slop debate.
7. [Rebranding the Wise design system](https://news.ycombinator.com/item?id=35036068): an accessible colour rebrand, and why "fun" hurts a trust brand.
8. [The "dark yellow problem" in palettes](https://news.ycombinator.com/item?id=33246700): why brand colour ramps break contrast, and APCA.
9. [Don't use Tailwind for a design system](https://news.ycombinator.com/item?id=34336576): where a utility config stops being a token system.
10. [Professional video editing in the browser](https://news.ycombinator.com/item?id=47471601): Remotion as a partial After Effects replacement for templated brand video, and Chromium's cost for subtitles.

---

## Method and counts

- **Queries:** 26 seed queries plus 42 expansion terms found while reading (design token, figma variables, open props, shadcn, og image, vercel og, puppeteer screenshot, bannerbear, placid, remotion, rive, essential graphics, lucide, heroicons, phosphor, iconify, uswds, gov.uk, material design 3, …). Each was run with `search` and with `search_by_date` limited to the last 24 months, for stories and comments, up to 600 hits per query.
- **Raw hits:** 49,304. After an on-topic filter: 10,770, of which 4,187 are from the last 24 months.
- **Full threads read** (every story ≥ 20 points or ≥ 10 comments with an on-topic title, plus 37 smaller tool-specific threads): **171 stories** containing **6,934 comments**.
- **Additional search-hit comments read** (outside those threads, naming a tracked tool): **2,275**. Total comments read: **9,209**.
- **Linked articles fetched:** 15 (Fowler, Sancho on Tailwind, open-props.style, diez.org, Vercel OG, the Satori README, GitHub's OG post, iconify.design, the CSS-Tricks sprites article, Lucide's licence, lottie.github.io, lottielab.com, the HyperFrames repo, Big Medium on pace layers, Brad Frost's design system ecosystem). Wise, the dark-yellow article and Airbnb's article returned 404/403.
- **Date range:** stories 2010-07-22 → 2026-09-24; comments 2010-07-22 → 2026-09-25; search hits up to 2026-11-06. 29 of the 171 full threads are from the last 24 months.
- **Caveats:**
  - HN skews to product UI. Brand and video evidence comes from fewer voices, so treat those rankings as directional.
  - Several tools (Diez, Specify, Radix Colors) are praised mainly by their makers.
  - "Context" in `data/hn.json` is a keyword guess. The curated `context` field in `data/findings/*.json` comes from reading.
