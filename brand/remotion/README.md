# Ostad reels in Remotion

[Remotion](https://github.com/remotion-dev/remotion) renders the reels as React: `src/OstadReel.tsx`. It contains the source clip at the
edit's speed, the edit's finished audio, the Elza captions (pop-on, keywords in a brand-blue gradient), the liquid-glass name card with a
light sweep, the machine pop-ins, an opening title on glass (letters rise from hairlines) and the kit's end card. It is its own package (own `node_modules`, kept out of the
Next app's tsconfig and eslint). DECISIONS 67-68.

```sh
cd brand/remotion
npm install
node scripts/prepare.cjs rosacea-laser     # fills public/rosacea-laser/ from brand/edits/rosacea-laser (run video_edit.cjs first: its audio is used)
npx remotion studio                        # live preview with a timeline, every prop editable
npx remotion still OstadReel out/f.png --frame=60
npx remotion render OstadReel out/reel.mp4 --props=public/rosacea-laser/props.json
```

- **Per-edit motion settings:** `brand/edits/<slug>/edit.json` under `"remotion"`: `hook` (`text`, with `
` or ?.!: ending each line; `at`; `dur`, default 3.4 s) and `keywords` (the caption words drawn in the brand-blue gradient).
- **Elza:** loaded from the Adobe Fonts kit `rwy7toj`. Its domains are localhost, 127.0.0.1 and waituntilmay.vercel.app. A render stops if Elza fails to load.
- **public/ is gitignored.** It holds the footage, the machine cutouts (the makers' photos; the repo is public) and the end card.
- **License:** Remotion is free for individuals and companies of up to 3 people. Larger companies need a company license (remotion.pro).
