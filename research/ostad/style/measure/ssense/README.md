# SSENSE: Instagram feed sample (@ssense)

- **Scraped:** 2026-11-17, using `apify/instagram-scraper` (`resultsType: posts`, `resultsLimit: 28`, `maxTotalChargeUsd: 0.08`). Run id `8Ua2YlQ5uSnvGHKzx`.
- **Cost:** $0.0756, as reported by Apify (28 `result` events at $0.0027, FREE tier).
- **Kept:** 26 feed posts: 25 carousels (217 slides, 2 of them video) and 1 single image. They were posted between 2026-10-13 and 2026-11-16.
- **Skipped:** 2 reels (`DfnS0Mly7CK`, `DfAPSH-k-hS`). The posts feed returns reels mixed in with other posts. No top-up run was made: the account had about $0.013 left before its $10/month limit, and the actor can't skip results it has already returned.
- **Engagement:** median 1,271 likes. The top post is `DfhtEmqAMeH` (12,084 likes). The zodiac carousels draw the most comments (83 to 140).

## Files

- `posts.json` (committed): one record per feed post. Each record has the shortcode, URL, timestamp, type, caption, hashtags, mentions, likes, comments, dimensions, and the media URL of every slide (the CDN links expire). It also has the local file names.
- `research/ostad/style/raw/ig_ssense.json` (gitignored, like the other raw dumps): the full Apify output, reels included.
- `research/ostad/style/media/ig/ssense/` (gitignored, other creators' work): 217 files named `<shortcode>_<n>.jpg|mp4`, about 89 MB.

## Look

The posts are portrait 3:4 carousels (mostly 1440x1920). There are two kinds of cover:
- archival or editorial photos with a plain white grotesk sans line in the top-left, or a black-on-white boxed label;
- mock SSENSE article pages, with a large black grotesk headline centred on white above an inset photo.

The palette is neutral: black, white and grey, with colour coming only from the photography. The tone is editorial and culture-led (zodiac signs, fashion history, music, trend round-ups) rather than product shots.
