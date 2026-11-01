# OSTAD CONTENT INTEL — Report

Dr. Ariel Ostad · cosmetic dermatology, injectables + lasers, skin cancer + Mohs · data pulled 2026-11-01
Dashboard: **https://waituntilmay.com/ostad** · numbers below are rendered from `research/ostad/data/` by `scripts/render_report.py`

---

## 1. Corpus

- **1,031 unique videos**: 537 TikTok · 247 Instagram · 247 YouTube.
- By source: 752 from searches (49 queries on TikTok and YouTube, 40 hashtags on Instagram), 170 from 13 benchmark derm creators, 109 of Ostad's own.
- **922 niche videos** (everything except his own). 731 of them are relevant to what he offers. 171 are "winning" (top 20% by outlier score on their platform AND above that platform's median views); 109 winners are Ostad-relevant.
- Posted 2019-04 → 2026-11-01; 373 of the niche videos are from the last 90 days.
- 307 videos have a spoken hook from subtitles; the top 80 carry full transcripts.
- Also gathered: 47 real viewer questions (from 600 comments under 30 top TikToks) and 73 unique active Meta ads.
- **Apify cost: $6.17** (cap $20; the account's FREE plan allows $10/month, and $2.73 was already used).
- How to read the numbers: **outlier score** = views ÷ that creator's median views (when we have ≥3 of their posts), otherwise views ÷ followers (floor 1,000). Raw views mostly finds big accounts; outlier finds ideas that beat the account's normal. **Engagement** = (likes + comments + shares + saves) ÷ views.
- One caveat up front: the Instagram hashtag scrape returns each hashtag's *top* reels, so Instagram niche medians run high (119K). Read Instagram rows against each other, not against TikTok.

## 2. What is winning

Niche median: **71.6K views · 1.18× outlier · 2.9% engagement**.

### Genre (all platforms)

{{GENRE}}

### Genre × platform (median outlier · median engagement)

{{MATRIX}}

### Format

{{FORMAT}}

### Hook type

{{HOOK}}

**Top 3 genres by outlier score, and whether they hold on engagement:**

1. **Before-after: 10.2× outlier, 47% of them win, but 1.0% engagement and 0.01% saves.** This is the biggest reach lever in the niche, on every platform (TikTok 8.1×, YouTube 21.3×). People watch the reveal and leave. It brings in strangers; it doesn't build trust on its own.
2. **Skin-cancer awareness: 4.1× overall, and 31.3× on TikTok, where 53% of them win.** Engagement is 1.0% on TikTok but 3.4% on Instagram. The winners are quizzes ("Melanoma or not?" 12.6M, "skin cancer or not?" 9.6M), patients' own stories ("signs I had before my stage 4 diagnosis", 1.8M) and Mohs explainers ("Mohs isn't just about clearing the visible tumor", 146K on a small account, 146×). This is the lane a Mohs surgeon owns.
3. **Humor / skit (1.43×), patient story (1.38×) and procedure-POV (1.37×), effectively tied.** Of these, **patient story holds up best**: 2.8% engagement and the second-highest comment rate of the reach genres (0.072%). Humor's reach comes mostly from generic memes; the skin-specific ones (Shereene Idriss "face basting", 3.1M) are rarer.

**The engagement leaders are a different set.** Q&A / comment-reply has the highest saves (0.66%) and comments (0.14% per view) of any genre. Myth-bust (1.32× outlier, 3.4% engagement, 0.63% saves, 0.11% comments) is **the only genre above the niche median on outlier, engagement, saves and comments at once.** Routine and product-review get the most saves (0.83%) but sit under 1× outlier. These keep a follower; they don't find new ones.

**Format:** voiceover-over-procedure leads (2.85×), then text-on-screen (1.59×) and vlog (1.34×). Talking-head, the most common format (320), sits at 1.06× but has the most comments per view (0.084%): the face earns the conversation, the procedure footage earns the reach.

**Hooks:** before/after reveal (5.8×), reaction (1.8×) and story open (1.6×) win. "Direct address" ("Today let's talk about…", "Hi everyone, I'm Dr. …") is the most common hook in the niche (285) and sits below median (0.97×). Questions do no better (0.99×).

**Topics that over-index** (n ≥ 12, median outlier): baby botox 11.1×, melasma 7.8×, acne scars 5.9× (52% win), melanoma 4.6×, mole removal 4.3×, hyperpigmentation 3.3×, retinoids 3.1×, buccal fat 2.9×. **Topics that under-index:** sculptra 0.37×, prejuvenation 0.09×, collagen 0.22×, exosomes 0.54×, sunscreen 0.56×, skin cycling 0.56×, PDRN 0.68×, GLP-1 0.81× (but "ozempic face" with celebrity faces: 1.6×, 752K median).

## 3. Top 30 Ostad-relevant videos by outlier score

(Off-niche winners are excluded: Filipino product plugs, hair "botox", OR comedy. They're in the dashboard with `relevant = false`.)

{{TOP30}}

**What the 30 have in common:** the payoff is visible in the first second (a face, a lesion, a needle, a result); the expert is a *reactor or narrator*, not a presenter; and the topic is a fear (melanoma, scars, melasma, a botched peel) or a desire with proof (glass skin, a lifted eye). None of the 30 opens with a credentials line ("I'm Dr. …", "as a board-certified …") in its caption or spoken hook.

## 4. What is not working

- **Polished clinic promos: 97 videos, median outlier 1.0×, Instagram 0.67×.** On text-on-screen and talking-head + b-roll promos (63 between them) the median is 0.70×/0.68×. The device-with-music clip ("Morpheus8 is the gold standard in skin tightening…") is the most common thing clinics post and the least rewarded. The few promos that win are sponsored creator posts riding a trusted face (Dr. Toral Vaidya × La Roche-Posay), not clinic reels.
- **Generic educational explainers: the biggest genre (175) at exactly the median (1.00×).** Same subject, different framing: the explainers that win promise one definitive answer ("The best treatment for melasma", 2.7M) or a visual contrast (damaged vs healthy barrier, 4.4M). The ones that don't start with "Today we're going to talk about…".
- **Brand-name device talk:** Sculptra (0.37×), EMFACE (1.18×, 16 videos, median 28.6K views), SKINVIVE (1.08×), exosomes (0.54×). When the hook is the product name, nobody outside the industry stops scrolling.
- **"Prejuvenation" as a word (0.09×) and collagen supplements (0.22×).** The same idea framed as "baby botox" scores 11.1×.
- **Day-in-the-life / office: 35 videos, median 8.1K views.** Engagement is high (4.5%) but reach stays inside the existing audience.

## 5. Ostad's baseline

{{BASELINE}}

- **TikTok @drarielostad exists and isn't linked from his site**: 135 followers, 30 videos, last post May 2025, median 827 views. The niche median on TikTok is 47K, **57× higher**.
- **YouTube: 61 videos, median 464 views; the niche median is 96K, 206×.** His two big YouTube hits are from April–June 2023 (Botox before/after on a staff member, 522K; underarm sweating, 149K). The October 2026 batch (Jeuveau assessment, Cold-X, "less is more") sits at **43–98 views each**.
- **Instagram is the one channel that works**: 19 reels in 2026, median 31.4K views, likes around 2K on every post. That's 3.8× below the Instagram niche median, but the niche figure is hashtag *top* reels, so the real gap is smaller. 112 of his last 150 Instagram posts are photos.

**His genre mix vs the winning mix (videos only):**

{{MIX}}

**78% of his videos are ad/promo (41) or educational-explainer (44); together those are 25% of niche winners.** He has 3 skin-cancer videos (3% of his output) against 8% of niche winners, and 8 before-afters (7%) against 15%. 82 of his 109 videos open with direct address, the weakest common hook in the niche (0.97×). Myth-bust, patient story, Q&A and reaction, the genres that hold engagement, are 4 videos between them.

**His best 5:**

{{OWN_BEST}}

**His worst 5:**

{{OWN_WORST}}

**The plain version:** when he has a point of view on camera ("not all aesthetic treatments are created equal" → 61K; "trending doesn't mean right for you" on Sculptra → 43K; the LUMA Cream story → 50K), Instagram rewards him. When he walks through a device or a brand's technology, nobody watches: YouTube 43–98 views, TikTok 200–900. The strongest material on his own channels is buried mid-video: the Botox-can-drop-your-eyelids warning, his pushback on surgeons who criticise filler, the melanoma-vaccine explainer.

## 6. Topic demand: what people actually ask

Reddit refused this account's scrapers (3 actors tried; see DECISIONS.md 6), so these are **real viewer comments under the 30 most-discussed niche TikToks**, kept only where the comment is a question a cosmetic dermatologist can answer (47 of 137 question-shaped comments). "Good video?" counts *winning* corpus videos tagged with the same topic.

{{QUESTIONS}}

**Open lanes: high demand and few good videos.**
- **Retinoids + sunscreen interplay** ("no daily SPF if you're using a retinoid?", 1,789 likes; "retinol vs tretinoin?", 1,156 likes). Sunscreen as a topic sits at 0.56×, so the volume is there but nobody has framed it well. **This maps straight to his Ret Nia serums + Sun Shade tints.**
- **"Basal cell is rarely deadly, so why cut so much?"** Mohs has 9 tagged videos in the whole corpus; 4 of them win (20.8× median). Nobody is explaining the tissue-sparing logic of Mohs plus the reconstruction, which is exactly his triple certification.
- **"Should I be worried about this spot?" / "what test catches it?"** Melanoma quizzes are the single biggest format in the lane, and almost none come from a Mohs surgeon in NYC.
- **Microneedling/Morpheus8 aftercare, purging, sessions, makeup after**: 11 of the 47 questions sit under a single treatment video, and the corpus has only 2 winners tagged microneedling.
- **Melasma on brown skin / "will this work for melasma?"**: melasma is 7.8× and 44% winners, and the skin-of-color angle has his Ethnic Skin Tones page behind it.

## 7. Competitor ads (Meta, US, active)

73 unique active ads from 5 searches. Meta hides results, so days running is the proxy:

{{ADS}}

- **Who runs longest:** membership and offer machines, not education. Luxe Med Spa (2,177 days, ~6 years), SpaVela (1,188), Ralph Garramone's VIP memberships ($250/month tiers, 816 days), Iorio Plastic Surgery (773), Halo's "Morpheus8 50% off for new clients" (754), NYC's Perfect MedSpa on hair restoration (738).
- **The angles that last:** a price anchor ("$12 a unit", "20 units for $180", "50% off Morpheus8"), a membership, or a doctor-in-action video (Hillelson-Whipple's "See Dr. Hillelson in Action with Morpheus8", 445 days).
- **The keyword "botox" is being taken by non-medical DTC brands**: tallow balm ("Someone asked if I got BOTOX. I didn't."), beef-fat cream, red-light "= Botox" claims, Seoul and Bangkok clinics selling to tourists.
- **No board-certified NYC derm shows up in these searches with a long-running ad.** An Ostad ad built from a winning organic video (a myth-bust or a melanoma quiz), not a device promo, would have that lane to itself.

## 8. Pillars

Each pillar maps to a number above and to a service from CLIENT.md.

1. **The Mohs Surgeon Explains (skin-cancer credibility).** *Data:* skin-cancer awareness 4.1× overall, 31.3× and 53% winners on TikTok; melanoma 4.6×; mole removal 4.3×; Mohs-tagged 20.8× but only 9 videos exist. *Service:* Mohs, skin cancer reconstruction, mole removal, skin checks. **The data supports it.** Only he can do it at his level: triple board-certified, NYU professor, Skin Cancer Foundation council. Weekly cadence.
2. **Proof (before-after and procedure-POV, narrated).** *Data:* before-after 10.2× (47% win), procedure-POV 1.37×, voiceover-over-procedure 2.85×, before/after-reveal hook 5.8×; acne scars 5.9×, melasma 7.8×. *Service:* Fraxel/CO2, Morpheus8, PicoWay, fillers, Botox/Jeuveau, scar revision. His own 2023 Botox before/after (522K) is proof that it works on his channel. Fixes the engagement weakness by putting his voice on top of the footage.
3. **Myth-bust and red-flag (the expert who protects you).** *Data:* myth-bust 1.32× with the best all-round engagement (3.4%, 0.63% saves, 0.11% comments); his own best IG reel is a red-flag case (61K). *Service:* fillers (migration, "overfilled"), Botox, peels, at-home devices, the skincare line. His "art meets science / less is more" is a point of view, so make it the hook, not the closing line.
4. **Your Questions, Answered (comment replies + the viewer's own case).** *Data:* Q&A / comment-reply has the highest save rate (0.66%) and comment rate (0.14%); patient story 1.38× with 2.8% engagement; the 47 questions in §6. *Service:* acne/AviClear, melasma, retinoids (Ret Nia), sunscreen (Sun Shade), Morpheus8 aftercare. Cheapest to shoot: phone, one take.
5. **Trend, Checked by a Surgeon (opportunistic, ≤1/week).** *Data:* Ozempic face 1.6× (752K median), baby botox 11.1×, buccal fat 2.9×, salmon-sperm/PDRN carried by influencers and gossip pages (PDRN 0.68× because no credentialed voice owns it). *Service:* GLP-1 laxity (Sculptra, Morpheus8, EMFACE), Botox, PRFM/exosomes. He already has the press for it (Cosmopolitan's salmon-sperm feature, NY Post "Barbie Botox").

Not a pillar: **pure device promos** (0.67–1.0×), **day-in-the-life** (8.1K median), **"prejuvenation"** framing (0.09×).
