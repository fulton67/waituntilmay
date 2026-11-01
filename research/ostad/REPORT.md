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

| genre | n | median views | median outlier | median engagement | saves+shares / view | comments / view | share winning |
|---|---:|---:|---:|---:|---:|---:|---:|
| before-after | 53 | 249K | 10.19× | 1.0% | 0.01% | 0.026% | 47% |
| skin-cancer-awareness | 38 | 116K | 4.10× | 1.0% | 0.14% | 0.026% | 37% |
| humor / skit | 57 | 130K | 1.43× | 3.1% | 0.31% | 0.040% | 25% |
| patient-story / testimonial | 78 | 134K | 1.38× | 2.8% | 0.27% | 0.072% | 22% |
| procedure-POV | 43 | 121K | 1.37× | 2.1% | 0.18% | 0.028% | 26% |
| myth-bust | 55 | 42K | 1.32× | 3.4% | 0.63% | 0.107% | 14% |
| day-in-the-life / office | 35 | 8.1K | 1.09× | 4.5% | 0.30% | 0.089% | 6% |
| derm-reacts / duet / stitch | 44 | 158K | 1.09× | 3.0% | 0.09% | 0.059% | 9% |
| trend-commentary | 62 | 79K | 1.08× | 2.4% | 0.18% | 0.048% | 16% |
| educational-explainer | 175 | 44K | 1.00× | 2.8% | 0.40% | 0.050% | 13% |
| ad / promo | 97 | 62K | 1.00× | 2.5% | 0.24% | 0.029% | 21% |
| red-flag / what-not-to-do | 30 | 57K | 1.00× | 2.2% | 0.24% | 0.074% | 17% |
| Q&A / comment-reply | 24 | 39K | 0.95× | 4.2% | 0.66% | 0.140% | 8% |
| product-review / drugstore-vs-medical | 81 | 78K | 0.93× | 4.8% | 0.83% | 0.060% | 10% |
| routine | 47 | 70K | 0.83× | 4.6% | 0.83% | 0.063% | 17% |

### Genre × platform (median outlier · median engagement)

| genre | TikTok n · outlier · eng | Instagram n · outlier · eng | YouTube n · outlier · eng |
|---|---|---|---|
| before-after | 19 · 8.11× · 2.2% | 10 · 1.35× · 2.1% | 24 · 21.32× · 0.5% |
| skin-cancer-awareness | 17 · 31.33× · 1.1% | 10 · 2.33× · 3.4% | 11 · 2.92× · 0.8% |
| humor / skit | 35 · 1.01× · 4.7% | 16 · 2.35× · 1.9% | 6 · 3.29× · 1.5% |
| patient-story / testimonial | 40 · 3.22× · 3.3% | 28 · 1.22× · 2.8% | 10 · 1.03× · 1.5% |
| procedure-POV | 21 · 1.26× · 2.4% | 9 · 1.18× · 4.8% | 13 · 12.66× · 0.7% |
| myth-bust | 36 · 1.25× · 4.5% | 9 · 1.14× · 2.5% | 10 · 1.41× · 2.2% |
| day-in-the-life / office | 25 · 1.09× · 4.9% | 3 · 0.26× · 3.1% | 7 · 3.89× · 1.9% |
| derm-reacts / duet / stitch | 28 · 1.09× · 3.0% | 5 · 1.79× · 2.8% | 11 · 1.00× · 3.4% |
| trend-commentary | 28 · 1.18× · 2.9% | 16 · 1.03× · 1.4% | 18 · 0.98× · 1.8% |
| educational-explainer | 97 · 1.00× · 3.9% | 31 · 1.18× · 2.1% | 47 · 1.00× · 1.7% |
| ad / promo | 50 · 1.30× · 2.1% | 40 · 0.67× · 4.1% | 7 · 12.99× · 0.5% |
| red-flag / what-not-to-do | 16 · 1.09× · 2.9% | 12 · 0.56× · 1.7% | 2 · 1.05× · 1.7% |
| Q&A / comment-reply | 19 · 1.00× · 3.7% | 4 · 0.72× · 5.6% | 1 · 20.37× · 6.1% |
| product-review / drugstore-vs-medical | 55 · 0.93× · 5.0% | 19 · 0.99× · 3.0% | 7 · 0.78× · 2.8% |
| routine | 22 · 1.31× · 6.8% | 15 · 0.38× · 3.5% | 10 · 0.55× · 2.9% |
| price / what-it-costs | — | 1 · 0.24× · 3.6% | 2 · 0.49× · 2.0% |

### Format

| format | n | median views | median outlier | median engagement | saves+shares / view | comments / view | share winning |
|---|---:|---:|---:|---:|---:|---:|---:|
| voiceover-over-procedure | 74 | 122K | 2.85× | 1.5% | 0.10% | 0.024% | 28% |
| text-on-screen only | 172 | 114K | 1.59× | 1.9% | 0.28% | 0.026% | 25% |
| vlog | 132 | 77K | 1.34× | 2.9% | 0.23% | 0.058% | 24% |
| stitch/duet | 45 | 132K | 1.08× | 3.0% | 0.09% | 0.051% | 9% |
| talking-head | 320 | 40K | 1.05× | 3.4% | 0.47% | 0.084% | 13% |
| green-screen | 7 | 10K | 1.00× | 5.6% | 0.53% | 0.095% | 0% |
| talking-head + b-roll | 169 | 80K | 0.89× | 3.4% | 0.41% | 0.052% | 17% |

### Hook type

| hook type | n | median views | median outlier | median engagement | saves+shares / view | comments / view | share winning |
|---|---:|---:|---:|---:|---:|---:|---:|
| before/after reveal | 70 | 213K | 5.75× | 1.3% | 0.11% | 0.027% | 40% |
| reaction | 81 | 240K | 1.79× | 3.2% | 0.21% | 0.042% | 22% |
| story open | 102 | 149K | 1.60× | 3.2% | 0.32% | 0.074% | 22% |
| contrarian claim | 114 | 72K | 1.16× | 2.9% | 0.39% | 0.066% | 14% |
| curiosity gap | 84 | 89K | 1.10× | 2.6% | 0.25% | 0.033% | 17% |
| number/stat | 53 | 65K | 1.10× | 3.3% | 0.61% | 0.044% | 24% |
| stop doing X | 14 | 42K | 1.07× | 2.0% | 0.39% | 0.098% | 7% |
| question | 119 | 49K | 0.99× | 2.1% | 0.18% | 0.052% | 13% |
| direct address | 285 | 34K | 0.97× | 3.1% | 0.37% | 0.050% | 15% |

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

| # | thumb | platform · creator | genre | views · outlier · eng | hook / title | why it worked |
|---|---|---|---|---|---|---|
| 1 | ![](https://waituntilmay.com/ostad/thumbs/ti_7134790376518470954.jpg) | [tiktok · @drwhitneybowe](https://www.tiktok.com/@drwhitneybowe/video/7134790376518470954) | derm-reacts / duet / stitch | 16.2M · 10554× · 16.6% | #duet with @e she nailed it!!!! 👊👊👊. #thatboweglow #skincycling #skintok #dermatologist | A famous derm duets a creator and simply validates her, borrowing the original's reach while adding expert endorsement. |
| 2 | ![](https://waituntilmay.com/ostad/thumbs/yo_3omae7t2VUo.jpg) | [youtube · @rissasroom](https://www.youtube.com/shorts/3omae7t2VUo) | trend-commentary | 8.3M · 1594× · 0.2% | 👀BEFORE & AFTER OZEMPIC FACE | Celebrity before/after faces tied to the Ozempic panic deliver an instant visual payoff in 11 seconds. |
| 3 | ![](https://waituntilmay.com/ostad/thumbs/yo_uCDNn5FcaJs.jpg) | [youtube · @blossomog](https://www.youtube.com/shorts/uCDNn5FcaJs) | before-after | 2.2M · 1263× · 1.1% | Chemical Peel Journey for black skin #chemicalpeel #skincare | Shows a chemical peel's shedding and result on Black skin, an under-served audience that wants proof it is safe for them. |
| 4 | ![](https://waituntilmay.com/ostad/thumbs/yo_l4CGjE-DPkQ.jpg) | [youtube · @KiAS-Studio](https://www.youtube.com/shorts/l4CGjE-DPkQ) | procedure-POV | 2.1M · 1142× · 0.6% | PRP+Microneedling treatment          #viral #skincare #viralvideo #shorts | Short, gory-satisfying microneedling-with-PRP footage that loops well and needs no words. |
| 5 | ![](https://waituntilmay.com/ostad/thumbs/ti_7400400768995429674.jpg) | [tiktok · @toralvaidyamd](https://www.tiktok.com/@toralvaidyamd/video/7400400768995429674) | ad / promo | 530K · 998× · 0.4% | Enjoy less plastic and more savings with Toleriane refill pouches from @LaRochePosayUS!  I | A sponsored product plug that rides the derm's trusted face, but there is no hook beyond the brand. |
| 6 | ![](https://waituntilmay.com/ostad/thumbs/ti_7696670183980567821.jpg) | [tiktok · @izzythepa](https://www.tiktok.com/@izzythepa/video/7696670183980567821) | myth-bust | 2.8M · 996× · 9.5% | I will literally die on this hill. That skin toner is one | Opens with "I will die on this hill" about an underrated product, and the conviction carries the clip. |
| 7 | ![](https://waituntilmay.com/ostad/thumbs/ti_7149704628165184810.jpg) | [tiktok · @drwhitneybowe](https://www.tiktok.com/@drwhitneybowe/video/7149704628165184810) | educational-explainer | 1.3M · 847× · 8.2% | I have a detailed blog on drwhitneybowebeauty.com under Derm Scribbles!  #skincycling #tha | The derm walks through her own branded system (skin cycling) night by night, so the method itself is the hook. |
| 8 | ![](https://waituntilmay.com/ostad/thumbs/ti_7702493975550201118.jpg) | [tiktok · @dermdocmalik](https://www.tiktok.com/@dermdocmalik/video/7702493975550201118) | product-review / drugstore-vs-medical | 843K · 706× · 0.4% | I have some hot takes about what actually deserves a spot in | "Hot takes" on what deserves a spot in your Sephora basket, timed to a sale, so it is useful and urgent at once. |
| 9 | ![](https://waituntilmay.com/ostad/thumbs/ti_7491067437274631454.jpg) | [tiktok · @verna_glow](https://www.tiktok.com/@verna_glow/video/7491067437274631454) | procedure-POV | 2.1M · 686× · 0.7% | #derm #dermatology #acne#acneskin #cyst#cystpopping  | Cyst-popping footage that viewers watch compulsively, with the derm hashtag adding credibility. |
| 10 | ![](https://waituntilmay.com/ostad/thumbs/ti_7609109122679606549.jpg) | [tiktok · @kintaro.ogata](https://www.tiktok.com/@kintaro.ogata/video/7609109122679606549) | patient-story / testimonial | 1.3M · 639× · 5.6% | Hello, friends. I actually can't take this shit anymore. Cheeks being so | A raw personal vent about big cheeks that speaks to a common insecurity and invites buccal-fat curiosity. |
| 11 | ![](https://waituntilmay.com/ostad/thumbs/yo_xIHFNjyZzrI.jpg) | [youtube · @antonialouiseskin](https://www.youtube.com/shorts/xIHFNjyZzrI) | educational-explainer | 2.7M · 636× · 0.4% | The best treatment for melasma! #skincare #skinadvice #skincaretips #hyperpigmentationtrea | "The best treatment for melasma" promises one definitive answer to a frustrating, chronic condition. |
| 12 | ![](https://waituntilmay.com/ostad/thumbs/ti_7665819003943701782.jpg) | [tiktok · @apoppyinbloom](https://www.tiktok.com/@apoppyinbloom/video/7665819003943701782) | patient-story / testimonial | 598K · 598× · 1.0% | Look at the pigmentation on my skin. If anyone has any recommendations | A patient asks the internet for help with pregnancy melasma, so the comments become the engagement engine and the opening for a derm reply. |
| 13 | ![](https://waituntilmay.com/ostad/thumbs/ti_7510594194528800022.jpg) | [tiktok · @brownskinjay3](https://www.tiktok.com/@brownskinjay3/video/7510594194528800022) | before-after | 1.3M · 565× · 1.8% | Before & after 🌟 Dealing with hyperpigmentation and sensitive acne prone skin was tough, b | A personal consistency before/after on brown skin is relatable and gives viewers hope. |
| 14 | ![](https://waituntilmay.com/ostad/thumbs/yo_Qo5vpmDJfSo.jpg) | [youtube · @chinenyeechem](https://www.youtube.com/shorts/Qo5vpmDJfSo) | routine | 3.2M · 555× · 1.0% | How to get rid of dark spots (hyperpigmentation hyperpigmentation #skincare #hyperpigmenta | A quick how-to for dark spots with shoppable links turns a common problem into an affiliate funnel. |
| 15 | ![](https://waituntilmay.com/ostad/thumbs/yo_HbYGMtrLtL4.jpg) | [youtube · @AvalonLaserSanDiego](https://www.youtube.com/shorts/HbYGMtrLtL4) | before-after | 708K · 445× · 0.9% | CO2 Laser Treatment – Is It Worth It? See the Results! | "Is it worth it?" framing paired with the results answers the buyer's real question with visuals. |
| 16 | ![](https://waituntilmay.com/ostad/thumbs/ti_7550131834177195271.jpg) | [tiktok · @clarisayti](https://www.tiktok.com/@clarisayti/video/7550131834177195271) | educational-explainer | 4.4M · 440× · 5.6% | Imagine the day they see you again and you are just, well, | A text-only contrast of damaged vs healthy barrier over an aspirational glow-up line, simple enough to understand and share. |
| 17 | ![](https://waituntilmay.com/ostad/thumbs/ti_7591647537308765458.jpg) | [tiktok · @belleza.corea](https://www.tiktok.com/@belleza.corea/video/7591647537308765458) | trend-commentary | 1.3M · 397× · 6.2% | today I tested the treatment that are being done all in Korea | A first-person test of the viral Korean salmon-DNA treatment rides the PDRN trend with step-by-step footage. |
| 18 | ![](https://waituntilmay.com/ostad/thumbs/ti_7333520579154267425.jpg) | [tiktok · @jenniferamyj](https://www.tiktok.com/@jenniferamyj/video/7333520579154267425) | patient-story / testimonial | 543K · 360× · 3.3% | If anyone was interested in how I held my mole scar on | A patient's own suspicious-mole story plus four scar-healing tips, delivered in a trustworthy peer voice. |
| 19 | ![](https://waituntilmay.com/ostad/thumbs/yo_BBG527GP3yU.jpg) | [youtube · @rissasroom](https://www.youtube.com/shorts/BBG527GP3yU) | trend-commentary | 1.6M · 314× · 0.1% | 💉👀BEFORE & AFTER OZEMPIC FACE | Repeats the celebrity Ozempic-face before/after formula, a proven high-curiosity trend visual. |
| 20 | ![](https://waituntilmay.com/ostad/thumbs/yo_eScGxMogEo0.jpg) | [youtube · @Skinperfectmedical](https://www.youtube.com/shorts/eScGxMogEo0) | procedure-POV | 34.2M · 278× · 0.0% | Foxy Eye Thread Lift by Dr Gideon Kwok at Skin Perfect Rancho 🪡 #beauty #threadlift | In-procedure fox-eye thread lift footage with an immediate lift reveal, satisfying and trend-driven (34M views). |
| 21 | ![](https://waituntilmay.com/ostad/thumbs/yo__PeVXKAXQ9o.jpg) | [youtube · @DermDocJason](https://www.youtube.com/shorts/_PeVXKAXQ9o) | educational-explainer | 31.4M · 233× · 3.5% | How Does Laser Tattoo Removal Work? | Answers a simple "how does it work?" question with laser visuals, a perennial-curiosity topic that reached 31M views. |
| 22 | ![](https://waituntilmay.com/ostad/thumbs/yo_HF0XeSC6i7Y.jpg) | [youtube · @jannatara](https://www.youtube.com/shorts/HF0XeSC6i7Y) | before-after | 2.0M · 232× · 1.0% | results of my fraxel laser treamtent for acne scars & large pores #skincare | A patient's own Fraxel results for scars and pores is a credible peer proof video. |
| 23 | ![](https://waituntilmay.com/ostad/thumbs/ti_7224307474361355521.jpg) | [tiktok · @jennadeeskin](https://www.tiktok.com/@jennadeeskin/video/7224307474361355521) | before-after | 214K · 214× · 1.0% | Melasma Treatment - 2 weeks post Cosmelan Peel. So good!  #cosmelan #tiktok #beautytok #br | A 7-second 2-weeks-post-Cosmelan reveal, a fast proof loop for a hard-to-treat condition. |
| 24 | ![](https://waituntilmay.com/ostad/thumbs/ti_7480964269807340846.jpg) | [tiktok · @skinbydrazi](https://www.tiktok.com/@skinbydrazi/video/7480964269807340846) | before-after | 1.0M · 201× · 1.0% | CO2 laser diary before & after Although you may look like Freddy Krueger and scare small c | An honest "Freddy Krueger" CO2 downtime diary into a final reveal sets expectations and shows the payoff. |
| 25 | ![](https://waituntilmay.com/ostad/thumbs/ti_7379293618437377326.jpg) | [tiktok · @skinbydrazi](https://www.tiktok.com/@skinbydrazi/video/7379293618437377326) | educational-explainer | 1.0M · 201× · 2.2% | if you get these little red bumps that come up all of | "It's not acne" reframes a common bump problem and gives viewers a diagnosis they did not know about. |
| 26 | ![](https://waituntilmay.com/ostad/thumbs/ti_7678470714093014286.jpg) | [tiktok · @lizzymabalot](https://www.tiktok.com/@lizzymabalot/video/7678470714093014286) | patient-story / testimonial | 400K · 190× · 5.3% | I thought my skin barrier was destroyed but it also looks so dry? Should I see an esthetic | A confused patient asks whether to see an esthetician or a derm first, which invites answers and stitches. |
| 27 | ![](https://waituntilmay.com/ostad/thumbs/ti_7407590020678192426.jpg) | [tiktok · @drabby6](https://www.tiktok.com/@drabby6/video/7407590020678192426) | educational-explainer | 22.5M · 185× · 9.8% | Have you tried any of these? #bodyodor #antiperspirant  #benzoylperoxide #skincare #bodyca | A derm's unexpected body-odor hack (BP wash) is a surprising, saveable tip that reached 22M views. |
| 28 | ![](https://waituntilmay.com/ostad/thumbs/ti_7477323953317465390.jpg) | [tiktok · @leftonred_podcast](https://www.tiktok.com/@leftonred_podcast/video/7477323953317465390) | skin-cancer-awareness | 344K · 183× · 2.0% | How do we get here? This is the result of a most | A young patient's raw Mohs-result story ("how do we get here?") makes skin cancer feel personal and urgent. |
| 29 | ![](https://waituntilmay.com/ostad/thumbs/ti_7649513627237551374.jpg) | [tiktok · @drdrayzday](https://www.tiktok.com/@drdrayzday/video/7649513627237551374) | red-flag / what-not-to-do | 4.7M · 174× · 5.5% | Things you absolutely should not do at home for 200, Alex. A | A Jeopardy-style "don't do this at home" warning, delivered with personality and authority. |
| 30 | ![](https://waituntilmay.com/ostad/thumbs/yo_s9LGR3V8s4o.jpg) | [youtube · @sharmafacialplasticsurgery](https://www.youtube.com/shorts/s9LGR3V8s4o) | procedure-POV | 168K · 168× · 1.7% | Buccal Fat Removal , Part 1 | A multi-part surgical series that explains the aesthetic rationale while showing the procedure. |

**What the 30 have in common:** the payoff is visible in the first second (a face, a lesion, a needle, a result); the expert is a *reactor or narrator*, not a presenter; and the topic is a fear (melanoma, scars, melasma, a botched peel) or a desire with proof (glass skin, a lifted eye). None of the 30 opens with a credentials line ("I'm Dr. …", "as a board-certified …") in its caption or spoken hook.

## 4. What is not working

- **Polished clinic promos: 97 videos, median outlier 1.0×, Instagram 0.67×.** On text-on-screen and talking-head + b-roll promos (63 between them) the median is 0.70×/0.68×. The device-with-music clip ("Morpheus8 is the gold standard in skin tightening…") is the most common thing clinics post and the least rewarded. The few promos that win are sponsored creator posts riding a trusted face (Dr. Toral Vaidya × La Roche-Posay), not clinic reels.
- **Generic educational explainers: the biggest genre (175) at exactly the median (1.00×).** Same subject, different framing: the explainers that win promise one definitive answer ("The best treatment for melasma", 2.7M) or a visual contrast (damaged vs healthy barrier, 4.4M). The ones that don't start with "Today we're going to talk about…".
- **Brand-name device talk:** Sculptra (0.37×), EMFACE (1.18×, 16 videos, median 28.6K views), SKINVIVE (1.08×), exosomes (0.54×). When the hook is the product name, nobody outside the industry stops scrolling.
- **"Prejuvenation" as a word (0.09×) and collagen supplements (0.22×).** The same idea framed as "baby botox" scores 11.1×.
- **Day-in-the-life / office: 35 videos, median 8.1K views.** Engagement is high (4.5%) but reach stays inside the existing audience.

## 5. Ostad's baseline

| platform | his posts scraped | with view counts | his median views | niche median views | gap |
|---|---:|---:|---:|---:|---:|
| tiktok | 30 | 30 | 826 | 47K | 57× |
| instagram | 143 | 19 | 31K | 119K | 4× |
| youtube | 61 | 61 | 464 | 96K | 206× |

- **TikTok @drarielostad exists and isn't linked from his site**: 135 followers, 30 videos, last post May 2025, median 827 views. The niche median on TikTok is 47K, **57× higher**.
- **YouTube: 61 videos, median 464 views; the niche median is 96K, 206×.** His two big YouTube hits are from April–June 2023 (Botox before/after on a staff member, 522K; underarm sweating, 149K). The October 2026 batch (Jeuveau assessment, Cold-X, "less is more") sits at **43–98 views each**.
- **Instagram is the one channel that works**: 19 reels in 2026, median 31.4K views, likes around 2K on every post. That's 3.8× below the Instagram niche median, but the niche figure is hashtag *top* reels, so the real gap is smaller. 112 of his last 150 Instagram posts are photos.

**His genre mix vs the winning mix (videos only):**

| genre | share of niche winners | share of Ostad's videos |
|---|---:|---:|
| before-after | 15% (25) | 7% (8) |
| educational-explainer | 13% (23) | 40% (44) |
| ad / promo | 12% (20) | 38% (41) |
| patient-story / testimonial | 10% (17) | 1% (1) |
| humor / skit | 8% (14) | 1% (1) |
| skin-cancer-awareness | 8% (14) | 3% (3) |
| procedure-POV | 6% (11) | 4% (4) |
| trend-commentary | 6% (10) | 1% (1) |
| routine | 5% (8) | 0% (0) |
| myth-bust | 5% (8) | 1% (1) |
| product-review / drugstore-vs-medical | 5% (8) | 1% (1) |
| red-flag / what-not-to-do | 3% (5) | 1% (1) |
| derm-reacts / duet / stitch | 2% (4) | 0% (0) |
| Q&A / comment-reply | 1% (2) | 1% (1) |
| day-in-the-life / office | 1% (2) | 2% (2) |

**78% of his videos are ad/promo (41) or educational-explainer (44); together those are 25% of niche winners.** He has 3 skin-cancer videos (3% of his output) against 8% of niche winners, and 8 before-afters (7%) against 15%. 82 of his 109 videos open with direct address, the weakest common hook in the niche (0.97×). Myth-bust, patient story, Q&A and reaction, the genres that hold engagement, are 4 videos between them.

**His best 5:**

| platform | date | views | genre · hook | post | why |
|---|---|---:|---|---|---|
| youtube | 2023-06-29 | 522,373 | before-after · before/after reveal | [Before and after Botox Injections](https://www.youtube.com/shorts/ppGlX6Ux9AY) | Ostad's best-performing format: a clear Botox before/after on a real staff member, with each treated area named. |
| youtube | 2023-04-21 | 148,635 | ad / promo · number/stat | [Excessive Sweating Treatment for Underarms](https://www.youtube.com/shorts/2lpsrhzZdBo) | Opens with a big stat (365 million sufferers) to sell an underarm sweating treatment, though the 11-second clip barely teaches. |
| instagram | 2026-04-23 | 61,177 | red-flag / what-not-to-do · story open | [Not all aesthetic treatments are created equal—and some come with risks that des](https://www.instagram.com/p/DXfNKTAgdhc/) | Ostad's own warning case about a treatment gone wrong elsewhere makes his best-performing format: an expert protecting viewers. |
| instagram | 2026-07-28 | 50,441 | product-review / drugstore-vs-medical · contrarian claim | [Not all Medical Grade Skincare is created equal.  I created Luma Cream because I](https://www.instagram.com/p/DbWaZHPgW0f/) | Ostad pitches his own cream as 'not one-size-fits-all', a product story that does well when he is on camera. |
| instagram | 2026-04-16 | 49,876 | educational-explainer · direct address | [It’s time for a spring skin reset 🌿  In this video, let talk about why chemical ](https://www.instagram.com/p/DXM-HzzDpVz/) | Ostad explains why spring is peel season, a timely, clear explainer that performs above his baseline. |

**His worst 5:**

| platform | date | views | genre · hook | post | why |
|---|---|---:|---|---|---|
| youtube | 2026-10-16 | 98 | educational-explainer · direct address | [Dr. Ariel Ostad Treats the Glabellar Lines Using Jeuveau](https://www.youtube.com/shorts/3zcokqzZ2jk) | Real assessment-and-injection footage shows expertise, but the 2.5-minute runtime and flat open limit reach. |
| youtube | 2026-10-16 | 76 | educational-explainer · direct address | [Dr. Ariel Ostad: Neuromodulator Assessment with Jeuveau](https://www.youtube.com/shorts/U9nqH9B-Nbw) | Shows a real assessment, which proves expertise, but it is long and has no opening question or tension. |
| youtube | 2026-10-16 | 70 | educational-explainer · direct address | [Dr. Ariel Ostad Explains the Science Behind Injectable Treatments](https://www.youtube.com/shorts/Gt_Ogifh5_A) | Clear science-of-injectables explainer from the doctor; credible but has no hook for cold viewers. |
| youtube | 2026-10-16 | 56 | educational-explainer · direct address | [Dr. Ariel Ostad Explains Cold-X Technology](https://www.youtube.com/shorts/LOPnIRsOBXQ) | Explains a brand's filler technology; too inside-baseball for consumers and has no hook. |
| youtube | 2026-10-16 | 43 | educational-explainer · direct address | [Dr. Ariel Ostad: The Less Is More Approach](https://www.youtube.com/shorts/dgsnyITW3ng) | "Less is more" philosophy matches what patients want but is told as a long talk with no hook. |

**The plain version:** when he has a point of view on camera ("not all aesthetic treatments are created equal" → 61K; "trending doesn't mean right for you" on Sculptra → 43K; the LUMA Cream story → 50K), Instagram rewards him. When he walks through a device or a brand's technology, nobody watches: YouTube 43–98 views, TikTok 200–900. The strongest material on his own channels is buried mid-video: the Botox-can-drop-your-eyelids warning, his pushback on surgeons who criticise filler, the melanoma-vaccine explainer.

## 6. Topic demand: what people actually ask

Reddit refused this account's scrapers (3 actors tried; see DECISIONS.md 6), so these are **real viewer comments under the 30 most-discussed niche TikToks**, kept only where the comment is a question a cosmetic dermatologist can answer (47 of 137 question-shaped comments). "Good video?" counts *winning* corpus videos tagged with the same topic.

| # | question (verbatim) | likes | topic | Ostad service | good video in corpus? |
|---|---|---:|---|---|---|
| 1 | so youre telling me I have rosacea cause demodex are having demosex on my face every night?? | 59,782 | rosacea / demodex | Rosacea treatment (lasers, Rx) | yes (2 winners) |
| 2 | I’m confused. Should we wear sunscreen or not? | 1,820 | sunscreen: do we need it? | Skincare line: Sun Shade | yes (6 winners) |
| 3 | no daily SPF if you are using a retinoid? doesn't that defeat the purpose | 1,789 | sunscreen + retinoids | Skincare line: Ret Nia + Sun Shade | yes (17 winners) |
| 4 | are we fucking normalizing taking ozempic for non-essential purposes ? | 1,657 | GLP-1 / Ozempic for cosmetic reasons | GLP-1 skin laxity: Sculptra, Morpheus8, EMFACE | yes (6 winners) |
| 5 | Can you make a video on retinol vs tretinoin? | 1,156 | retinol vs tretinoin | Skincare line: Ret Nia serums | yes (12 winners) |
| 6 | Which retinoid are you using? Please recommend something budget friendly. | 1,116 | which retinoid, on a budget | Skincare line: Ret Nia serums | yes (12 winners) |
| 7 | Should we also use suncream everyday on the arms or other bodyparts that are exposed to sunlight ? | 631 | sunscreen on the body | Skin cancer prevention | yes (14 winners) |
| 8 | Do you use retinol every day? No moisturizer? 🤯🤯🤯 | 600 | retinoid every day, moisturizer? | Skincare line: Ret Nia serums | yes (12 winners) |
| 9 | Effective on lighter skin as well? | 461 | does it work on lighter skin too? | Laser / pigmentation treatment | yes (14 winners) |
| 10 | When my barriers damaged, I usually use just a very gentle cleanser, snail mucin and a super hydrating moisturizer. I find that it heals wit | 377 | damaged skin barrier routine | Skincare line | yes (5 winners) |
| 11 | Is Botox something you should begin to consider in your 20s as “preventative” ? | 279 | preventative Botox in your 20s | Botox / Jeuveau | yes (8 winners) |
| 12 | does it hurt? | 254 | does it hurt? | Every procedure: consult content | no — open lane |
| 13 | How does sunscreen under makeup work when it comes to reapplying? Do you not need to reapply during the winter if it’s “staying in place” un | 209 | reapplying sunscreen over makeup | Skincare line: Sun Shade tints | yes (5 winners) |
| 14 | I’m using azaleic acid 15% every night on dry skin, it has been over a month and it still stings and I get new berakouts, should I stop and  | 157 | azelaic acid stings + breakouts | Acne / rosacea treatment | yes (9 winners) |
| 15 | What about perfect skincare routine for teens 17 18 16 ? | 111 | skincare routine for teens | Acne, AviClear | yes (6 winners) |

**Open lanes: high demand and few good videos.**
- **Retinoids + sunscreen interplay** ("no daily SPF if you're using a retinoid?", 1,789 likes; "retinol vs tretinoin?", 1,156 likes). Sunscreen as a topic sits at 0.56×, so the volume is there but nobody has framed it well. **This maps straight to his Ret Nia serums + Sun Shade tints.**
- **"Basal cell is rarely deadly, so why cut so much?"** Mohs has 9 tagged videos in the whole corpus; 4 of them win (20.8× median). Nobody is explaining the tissue-sparing logic of Mohs plus the reconstruction, which is exactly his triple certification.
- **"Should I be worried about this spot?" / "what test catches it?"** Melanoma quizzes are the single biggest format in the lane, and almost none come from a Mohs surgeon in NYC.
- **Microneedling/Morpheus8 aftercare, purging, sessions, makeup after**: 11 of the 47 questions sit under a single treatment video, and the corpus has only 2 winners tagged microneedling.
- **Melasma on brown skin / "will this work for melasma?"**: melasma is 7.8× and 44% winners, and the skin-of-color angle has his Ethnic Skin Tones page behind it.

## 7. Competitor ads (Meta, US, active)

73 unique active ads from 5 searches. Meta hides results, so days running is the proxy:

| days running | advertiser | search | format | angle (headline / first line) |
|---:|---|---|---|---|
| 2177 | [Luxe Med Spa & Wellness Center](https://www.facebook.com/ads/library/?id=417443209282500) | med spa | IMAGE | Luxe Med Spa & Wellness Center — Services you not only want but services you need. |
| 1188 | [SpaVela](https://www.facebook.com/ads/library/?id=833177868436592) | med spa | IMAGE | SpaVela — A Wellness Luxury Spa Resort Dedicated to Inspiring Life in Balance. |
| 816 | [Ralph Garramone, Plastic Surgeon and Medi-Spa](https://www.facebook.com/ads/library/?id=291464614027962) | morpheus8 | CAROUSEL |   — Be a VIP at Garrmamone, today!🌟💉  We offer 3 types of memberships:  🌟SILVER $250/MONTH  10% off injectables, additional  |
| 773 | [Iorio Plastic Surgery Medspa](https://www.facebook.com/ads/library/?id=536497392668921) | med spa | DCO |  — Get personalized aesthetic treatments at Iorio Plastic Surgery and Medspa. Services include Botox treatments, Dermal Fil |
| 754 | [Halo aesthetic bar](https://www.facebook.com/ads/library/?id=492389176950908) | morpheus8 | DCO |  — ✨ Limited Offer! Morpheus8 for New Clients - 50% OFF! ✨ Ready to experience the future of skin rejuvenation? For a limit |
| 751 | [Independence Park Medical Services](https://www.facebook.com/ads/library/?id=569445359075897) | med spa | IMAGE | Independence Park Medical Services — Our team has you covered, from family medicine, OBGYN to our new Med Spa, we are bringing Anchorage comprehensive care.  |
| 738 | [Perfect MedSpa](https://www.facebook.com/ads/library/?id=1293770215103736) | med spa | IMAGE | Aesthetic Services & Medical Spa in NYC / Perfect Med Spa — Transform your look in just 1 month! Learn about advanced hair restoration solutions now. |
| 716 | [Medical Center Weight Loss Clinic & Spa](https://www.facebook.com/ads/library/?id=2020852058350400) | med spa | DCO |  — Welcome to Medical Center Weight Loss Clinic & Spa in San Antonio, Texas. Check out our website or Facebook page for inf |
| 684 | [Botanique Paris](https://www.facebook.com/ads/library/?id=600595135715547) | botox | IMAGE | It's this or surgery 🤷‍♀️ — 10 Years Younger with this Sneaky Hack 🤫  🔥 Get Rid Of Dark Circles While You Netflix & Chill 🚨 10 Minutes of Red Light  |
| 653 | [MedSpa by Dr. Mignon](https://www.facebook.com/ads/library/?id=505918705347207) | med spa | IMAGE | 2025 is Your Year — MedSpa by Dr. Mignon offers passionate advocacy for holistic wellness and beauty, offering vaginal rejuvenation, weight  |
| 638 | [SwimZip](https://www.facebook.com/ads/library/?id=1149974446578284) | skin cancer | VIDEO | 50,000+ ⭐⭐⭐⭐⭐ — No more lathering sunscreen all over babies and toddlers!  UPF 50+ sun protection swimwear that blocks 98% of cancer cau |
| 628 | [Kleam Clinic English](https://www.facebook.com/ads/library/?id=3910036729326898) | botox | CAROUSEL | Kleam Clinic English — Experience Korean beauty innovation in Kleam clinic  Get your reservation today at the most visited clinic for foreigner |
| 586 | [NU Med Spas](https://www.facebook.com/ads/library/?id=1014559423342412) | med spa | VIDEO | Try laser tattoo removal — A mistake you can erase! Get rid of your unwanted tattoo 💥 |
| 569 | [Infinity MedSpa and Wellness](https://www.facebook.com/ads/library/?id=1239218214296820) | med spa | DCO |  — ✨New Patient Special!✨ Enjoy Botox Cosmetic for $12 a unit at Infinity MedSpa in Charlotte and the surrounding areas! Sc |
| 540 | [Premiere Center for Cosmetic Surgery](https://www.facebook.com/ads/library/?id=669392295729747) | morpheus8 | DCO |  — Smooth, tighten, and lift — without surgery. Morpheus8 is the gold standard in skin tightening, combining microneedling  |

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
