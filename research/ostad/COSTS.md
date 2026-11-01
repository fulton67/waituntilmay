# Apify spend

Spec cap $20. Real ceiling: account limit $10/month with $2.73 already used before this run, so the run budget is $6.50.

**Total this run: $5.30** across 38 runs (sum of per-run `usageTotalUsd` as logged).

**Reconciled 2026-11-01 against the account** (`/v2/users/me/limits`): monthly usage $8.68 − $2.73 before the run = **$5.95 actually billed**. That covers storage, the failed Reddit attempts and usage that was reported after we logged it. REPORT.md's $6.17 is the conservative estimate (max of logged and estimated per run). Every figure is under the $20 cap and the $10 account limit.

| key | actor | run id | items | usd | status |
|---|---|---|---|---|---|
| test__ads | curious_coder/facebook-ads-library-scraper | iONmuOymk0oLJpAzG | 1 | 0.0001 | SUCCEEDED |
| test__ig_hashtag | apify/instagram-hashtag-scraper | sxVXpZmo9ywnBmpIa | 5 | 0.0000 | SUCCEEDED |
| test__ig_profile | apify/instagram-scraper | sQaxd0B4Ladvw4u7p | 5 | 0.0027 | SUCCEEDED |
| test__yt | streamers/youtube-scraper | QBFYUzBb9MjEBgQBl | 5 | 0.0160 | SUCCEEDED |
| test__reddit | trudax/reddit-scraper-lite | HklfxrnRxeHyqVNUY | 5 | 0.0600 | SUCCEEDED |
| test__reddit2 | trudax/reddit-scraper-lite | mSK1bMPD3NPCHaVn1 | 0 | 0.0400 | SUCCEEDED |
| test__tiktok | clockworks/tiktok-scraper | ZfXs0dhM1JcFBrvWe | 5 | 0.0010 | SUCCEEDED |
| test__reddit3 | trudax/reddit-scraper-lite | f48kd3zotnlAsFb0o | 0 | 0.0400 | SUCCEEDED |
| test__reddit4 | trudax/reddit-scraper-lite | ZufIW0ofH5nzERV36 | 0 | 0.0400 | SUCCEEDED |
| test__reddit5 | fatihtahta/reddit-scraper-search-fast | TB6T0hqZX9p62is00 | 0 | 0.0000 | SUCCEEDED |
| test__reddit6 | harshmaur/reddit-scraper | cuVa0IX8v7k5KvpYO | 0 | 0.0200 | SUCCEEDED |
| own__tiktok__profile | clockworks/tiktok-scraper | hP8vd0ktBIsoI5nY7 | 32 | 0.0010 | SUCCEEDED |
| own__ig__drarielostad | apify/instagram-scraper | srUmt4lxYpFiELnAF | 150 | 0.3996 | SUCCEEDED |
| own__tiktok__search | clockworks/tiktok-scraper | DCNi5iVWCt4cU4Uxh | 17 | 0.0639 | SUCCEEDED |
| own__yt__channel | streamers/youtube-scraper | wgXbuXqMdUTLUPW2R | 120 | 0.4720 | SUCCEEDED |
| ads__meta__med-spa | curious_coder/facebook-ads-library-scraper | 1cagqhLC6uFf1Lx3n | 20 | 0.0001 | SUCCEEDED |
| ads__meta__morpheus8 | curious_coder/facebook-ads-library-scraper | rCID7OTSaF1RHWdah | 20 | 0.0001 | SUCCEEDED |
| ads__meta__dermatologist | curious_coder/facebook-ads-library-scraper | TxXxtpD3U1GIcCp1P | 20 | 0.0001 | SUCCEEDED |
| ads__meta__botox | curious_coder/facebook-ads-library-scraper | A22nesKbqhNObudkc | 20 | 0.0001 | SUCCEEDED |
| ads__meta__skin-cancer | curious_coder/facebook-ads-library-scraper | gyXOwzCbJrIBOXua6 | 20 | 0.0001 | SUCCEEDED |
| tiktok__search-3-mohs-surgery | clockworks/tiktok-scraper | stAdsjEgzzBn1zR6V | 90 | 0.3007 | SUCCEEDED |
| tiktok__search-2-thread-lift | clockworks/tiktok-scraper | euckVbUEYdib70t3r | 81 | 0.3007 | SUCCEEDED |
| tiktok__search-0-dermatologist | clockworks/tiktok-scraper | hMswMpLaAg9bWBAh6 | 81 | 0.3007 | SUCCEEDED |
| tiktok__search-1-botox | clockworks/tiktok-scraper | 5LxQAKjHfnmKQXBjB | 82 | 0.3044 | SUCCEEDED |
| instagram__hashtags-1-sculptra | apify/instagram-hashtag-scraper | HiQYzQZ5N6vbcWSMN | 60 | 0.1248 | SUCCEEDED |
| tiktok__search-4-glass-skin | clockworks/tiktok-scraper | IayyxNbZ0qjPc6uBU | 81 | 0.2674 | SUCCEEDED |
| instagram__hashtags-2-medspa | apify/instagram-hashtag-scraper | Y3Ua6x7TqA11HjxFa | 55 | 0.0000 | SUCCEEDED |
| instagram__hashtags-0-dermatologist | apify/instagram-hashtag-scraper | IdoYusB8s4ztkKKdI | 60 | 0.1404 | SUCCEEDED |
| instagram__hashtags-3-peptides | apify/instagram-hashtag-scraper | 28dkJPL2qXJjtGGyK | 55 | 0.1274 | SUCCEEDED |
| bench__tiktok__0 | clockworks/tiktok-scraper | jo0kcsgSGE6UcjbPk | 76 | 0.2267 | SUCCEEDED |
| bench__tiktok__1 | clockworks/tiktok-scraper | d6gCnixS2zb0a9Uyp | 62 | 0.2304 | SUCCEEDED |
| youtube__search-1-botox | streamers/youtube-scraper | Xq2ION2yRn55a4lFX | 50 | 0.1800 | SUCCEEDED |
| youtube__search-0-dermatologist | streamers/youtube-scraper | btCnGoNWAMi8IQXJN | 47 | 0.1880 | SUCCEEDED |
| youtube__search-2-thread-lift | streamers/youtube-scraper | aWYvRc2XI6PidZkrG | 50 | 0.1920 | SUCCEEDED |
| youtube__search-3-mohs-surgery | streamers/youtube-scraper | WW99hys44ei0KyEz9 | 50 | 0.1960 | SUCCEEDED |
| youtube__search-4-glass-skin | streamers/youtube-scraper | ZvFHiVnWCEvdhqxKX | 42 | 0.1640 | SUCCEEDED |
| bench__tiktok__nyc | clockworks/tiktok-scraper | TGW6QChbyWkuD7yXd | 48 | 0.1786 | SUCCEEDED |
| questions__tiktok-comments | clockworks/tiktok-comments-scraper | L5oMLP1vPftggrOsm | 600 | 0.7250 | SUCCEEDED |
