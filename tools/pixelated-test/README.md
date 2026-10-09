# Does this browser honour `image-rendering: pixelated` on `<video>`?

Two `<video>` elements, same 640x360 source, both displayed at 1280x720 CSS
pixels. One has `image-rendering: pixelated`, the other `auto`. If the browser
honours the property the two look different (hard blocks vs smooth interpolation);
if it ignores it they render identically.

    cp renders/v_<seed>.mp4 tools/pixelated-test/native.mp4
    cd tools/pixelated-test && python -m http.server 8731
    # open http://127.0.0.1:8731/  and call show('pix') / show('smooth') in the console

## Measured so far

| browser | honours it? | how it was checked |
|---|---|---|
| Chrome (Windows 11, dpr 1) | **yes** | screenshots of the two variants differ: mean abs diff 1.258, max 75, 2.73% of pixels differ by >8 |
| Safari | **not tested** | no Safari on Windows - run the page above on a Mac/iOS to confirm |
| Firefox | **not tested** | run the page above |
