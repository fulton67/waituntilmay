# grid sources

Drop a video file here when the stitched wall cannot fetch it from YouTube,
named after its video id:

    media/grid-src/_swh-ZVvAro.mp4

`scripts/build_grid_video.py` prefers a file here over the network, so this is
also how to override a video whose YouTube copy is the wrong cut. Any of
`.mp4`, `.mov`, `.webm`, `.mkv` works — the builder scales and re-encodes it to
the 320x180 cell either way, so resolution and aspect ratio do not matter.

The only id currently needing this is `_swh-ZVvAro` (sheroy — lastyear), which
is age-restricted: yt-dlp cannot pass "Sign in to confirm your age" without
YouTube cookies. Lifting the restriction in YouTube Studio fixes it for good
and needs no file here — the hourly Action re-tests every missing id and
rebuilds as soon as one becomes reachable.
