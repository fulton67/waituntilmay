# luckydaye.com: the site from Felix Luke's most recent website post

**Which post.** @fe___luke, 2026-10-01: "Site design and development for @iamluckydaye for ALOUD!" This is the latest of his posts that is about a website. The post after it (2026-10-23, VIGIL) is a charity compilation and group show, not a site. The site is **luckydaye.com**, one of the 26 in the channel. It was crawled on 29–30 Oct, after the post.

**What is taken for Dylan's releases.** The way the work pops up and switches. A gallery of images can be dragged in three.js. A click that is not a drag opens one image large in a lightbox that fades in over .25 s. Switching between panels blurs the header out, waits 1000 ms, then slides the next panel across in 1 s on `cubic-bezier(.77,0,.175,1)`.

Crawl folder: `~/arena/lexicon/channels/felixluke/luckydaye.com/deep/`. All script citations are to `scripts/00aac55989b5a00a.js`, the Nuxt bundle served at `/_nuxt/CGz_NxoV.js`. Line 4109 is the Gallery component and line 2 is the Header. Columns are given as `line:col`. The CSS is `styles/4bda12d4093ea50f.css`, minified onto line 1. These are the same traces as BRAND-BIBLE §8.3 (rows B2875–B2882, B3327, B3330).

## Gallery: work arranged in 3D (4109)
| behaviour | code | at |
|---|---|---|
| click-vs-drag threshold | `th=5` (px) | 4109:74152 |
| sphere radius and image size per breakpoint | `y(){… e<768?(_=175,v=65,…):e<1024?(_=275,v=90):(_=350,v=100)}` | 4109:74307 |
| images on a Fibonacci sphere | `w(e,t){let n=2/t,r=Math.PI*(3-Math.sqrt(5)),i=e*n-1+n/2 …return{x:s*_,y:i*_,z:c*_}}` | 4109:79923 |
| each image is a plane facing the centre, keeping its own aspect | `T(e,t,n){C.load(e,r=>{… a>1?s=v/a:o=v*a; … c.lookAt(0,0,0)` | 4109:80071 |
| orbit with damping only | `enableDamping=!0,dampingFactor=.05,enableZoom=!1,enablePan=!1,autoRotate=!1` | 4109:80745 |
| pointerdown records the start | `k(e){a=e.clientX,o=e.clientY,s=!0,c=!1}` | 4109:81179 |
| pointermove: more than 5 px makes it a drag; cursor is `grabbing`, `pointer` over an image, otherwise `grab` | `A(e){if(s&&Math.hypot(…)>th&&(c=!0),c){…cursor=\`grabbing\`…}…cursor=l.length>0?\`pointer\`:\`grab\`}` | 4109:81227 |
| pointerup without a drag raycasts and opens that image | `j(e){t.value&&(c\|\|O(e),s=!1,c=!1,A(e))}` → `O(e){…intersectObjects(g)…n.value=s.userData.imageUrl}` | 4109:81564, 4109:80879 |
| close | `ee(){n.value=null}` | 4109:81612 |
| lightbox markup: `Transition name="lightbox"`, teleported to body; a click on the backdrop itself closes it | `de(Pe,{name:\`lightbox\`},…class:\`lightbox\`,onClick:ke(ee,[\`self\`])…class:\`lightbox-image\`` | 4109:82466 |

## Lightbox CSS (css:1)
```
.lightbox{z-index:9999;cursor:pointer;justify-content:center;align-items:center;padding:40px;display:flex;position:fixed;inset:0}
.lightbox-image{object-fit:contain;cursor:default;max-width:45vw;max-height:75vh}
.lightbox-enter-active,.lightbox-leave-active{transition:opacity .25s}
```
At ≤768 px the image's max-width is 80vw. The images are Cloudflare Images (`imagedelivery.net/…/gallery`).

## Switching panels (line 2 and css)
| behaviour | code | at |
|---|---|---|
| switch delay | `ea=1e3` | 2:46617 |
| blur out: an SVG `feGaussianBlur` on `#blur` animates `values` from 0 to 100 | `me(){…setAttribute(\`values\`,\`0 0; 10 0; … 100 0\`),e.beginElement()}` | 2:49713 |
| each nav handler: set the state, then `me()`, then wait `ea`, then navigate | `…await y(),me(),await new Promise(e=>setTimeout(e,ea)),await t()…` | 2:48021, 2:48207, 2:48393 |
| the blur applies to the nav, the large text and the Back button | `.back-button-holder,.header-nav-holder,.large-text-holder{filter:url(#blur-filter)}` | css:1 |
| the panel slides from the left | `.gallery-panel{…transition:transform 1s cubic-bezier(.77,0,.175,1);…transform:translate(-100%)}` and `.gallery_open{transform:translate(0)}` | css:1 |
| Back control: a word, rotated −90°, that calls `history.back` | `R(\`a\`,{class:\`header-nav back-button\`,onClick:j},\` Back \`)` in `.back-button-holder{…transform:rotate(-90deg)}` | 4121:6231, css:1 |
| nav words: 4rem / 5rem, letter-spacing −.25rem, #ff3700, underlined on hover with offset .3rem | `.header-nav{letter-spacing:-.25rem;color:#ff3700;…font-size:4rem;line-height:5rem}` | css:1 |

## Header clock (S1, line 2)
| behaviour | code | at |
|---|---|---|
| time since load as `HH:MM:SS:mmm` | `ue=()=>{let e=Date.now()-oe,… N.value=[…padStart(2),…padStart(3)].join(\`:\`)}` | 2:49189 |
| updated every 10 ms; the countdown every 1000 ms | `ne=Bi(se,1e3),oe=Date.now(),ue(),ie=Bi(ue,10)` | 2:49638 |
