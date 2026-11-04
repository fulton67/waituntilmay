# Rolodex materials: what to drop in

The housing's materials are made from three tileable textures. They are not here yet, so the site runs on
placeholder noise that `scripts/gillenwebsite/materials.py` makes in each material's colour.

Drop these three files into this folder, then rerun the pipeline:

| File | What | Used on |
|---|---|---|
| `enamel.png` | 2048 x 2048 seamless, the tan enamel paint | frame, base, side plates (the inner ones tinted darker), cradle |
| `bakelite.png` | 2048 x 2048 seamless, the black bakelite | all knob parts |
| `chrome.png` | 2048 x 2048 seamless, the chrome | axle, rails, spokes, hubs |

```
~/tools/rolodex-venv/Scripts/python -I scripts/gillenwebsite/materials.py
```

For each file the pipeline writes:

- `<name>-albedo.jpg`: the texture itself
- `<name>-rough.png`: luminance inverted, levelled so its median is the roughness the site had before
  (enamel 0.46, bakelite 0.35, chrome 0.18)
- `<name>-normal.png`: a normal map from the luminance as height (Sobel, tiling edges), strength 0.6 enamel,
  0.3 bakelite, 0.4 chrome

Runtime sizes are 1024 for enamel and 512 for bakelite and chrome, to keep the textures' GPU memory small.
`materials.json` records which source each map came from (`"placeholder noise"` until the real files are here).
Everything is mapped triplanar at 0.25 m per tile (`components/gillenwebsite/triplanar.ts`), so the mesh's UVs
play no part. The lighting is unchanged.
