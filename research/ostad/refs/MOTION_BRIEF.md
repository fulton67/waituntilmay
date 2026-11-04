# Motion judging brief

You are judging YouTube videos found for an aesthetic dermatologist's procedure list. The goal: **animations and 3D explainers** that show how a procedure works (a needle entering skin layers, a laser beam heating the dermis, a toxin blocking a nerve signal, a surgical step drawn as an illustration). Our animator will use them as motion references.

Each video comes as one overview sheet: 16 frames spread evenly from the first frame to the last, each labelled `m:ss`.

## Keep (`keep: true`) only if
- a real share of the runtime (roughly 25% or more) is animation, 3D render, or motion graphics that explains mechanism or anatomy, AND
- what is animated matches the procedure it was found for (or the same anatomy or mechanism).

## Drop (`keep: false`, give `why`)
- talking heads, before/after photos, live clinic footage, product ads with no mechanism shown, slideshows of stock photos, real surgery footage
- off-topic videos
- **duplicate re-uploads.** Clinics re-post a manufacturer's film. If two videos in your batch show the same animation, keep the one from the maker (or the longest or cleanest) and drop the others with `why: "dup of <id>"`.

## For each kept video write
- `type`: `3D-render` | `2D-animation` | `motion-graphics` | `mixed`
- `style`: one line on the look (palette, render style, cutaway or not, labels on screen)
- `beats`: an ordered list covering the **whole** video, first frame to last. Each beat is `{"t": "m:ss", "what": "..."}` and starts at a frame timestamp on the sheet. Typically 4–10 beats. Include non-animated stretches too, e.g. `{"t":"0:00","what":"logo + title card"}`. The last beat starts at or before the final frame.
- `best`: the `m:ss` of the single most useful animated moment
- `fragment`: true if the duration is under 15 s

## Output
Write one file per video: `cache/movw/{id}.beats.json`, containing a single JSON object:

```
{"id":"...","keep":true,"type":"3D-render","style":"...","beats":[{"t":"0:00","what":"..."}],"best":"0:42","fragment":false}
{"id":"...","keep":false,"why":"talking head, no animation"}
```

Look at every sheet (use the Read tool on the image). Don't guess from titles.
