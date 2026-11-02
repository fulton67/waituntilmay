# Theme writer brief (run 2, phase 2b)

The reader is **Naim**, who pitches content to Dr. Ariel Ostad. His complaint about run 1 was that numbers, tables and outlier
scores didn't tell a person what the niche is *talking about* or what to make. Your page fixes that for one theme. Write for
a smart person who has never seen a spreadsheet: plain, specific, concrete. Numbers go inside sentences as evidence, never as
a table.

Inputs:
- `classify2/dossier_{slug}.md`: exact numbers, then every video in the theme (best first), each with its subject, claim,
  opening line, transcript start and audience reaction. Read the videos, not just the summary.
- `CLIENT.md`: Dr. Ostad's practice. Use the services, the "gaps" (services he offers but never films), the skin-of-colour
  page, the press and his credentials.
- `classify2/BRIEF.md` (§ intro): who he is. A male cosmetic derm and Mohs surgeon in his 50s, triple board-certified,
  20+ years on Park Avenue, Manhattan.

Say "× the creator's usual", never "outlier score". Never invent a number: use the dossier's numbers or count from it.
Quote only lines that are actually in the dossier (opening lines and transcripts). You may trim them to under 15 words.
No em dashes. No hype words ("game-changer", "unlock", "elevate").

## Output 1: `themes/{slug}.md`, exactly this shape

```markdown
# {Theme name}

{One plain paragraph, 60–110 words: what people in this theme are actually saying, and why anyone watches. Specific: name the real recurring arguments, fears, promises.}

## The numbers

{One or two sentences carrying: size (N videos, X% of the niche), share winning, median × the creator's usual, share Ostad could make. E.g. "50 videos, 5% of the niche. 36% of them are winners and the median one does 6× its creator's usual; 86% are videos Dr. Ostad could make himself."}

## What people claim

- {5–10 bullets: the actual claims made in these videos, paraphrased from transcripts, each specific enough to argue with. Prefer claims that recur or that won.}

## How it sounds

{2–4 sentences: tone mix and speaker mix in words (who carries this theme, doctors or influencers? earnest or joking?), and the dominant hook pattern: what the first line does in the videos that win.}

Three opening lines that worked:

> “{line}” (@creator, {× usual})
> “{line}” (@creator, {× usual})
> “{line}” (@creator, {× usual})

## What the audience says back

{2–4 sentences from the audience reactions / comments / the 47 questions in the dossier. If there are few or none, say so plainly and say what the claims imply people are worried about. Don't invent comments.}

## Ostad's angle

- **Maps to:** {his services from CLIENT.md}
- **Only he can say:** {what his Mohs / 20+ years / NYC / skin-of-colour page / triple board certification lets him say that an influencer or a med-spa can't}
- **The trap:** {the version of this theme that would make him look like everyone else, or worse}

## Six to watch

1. `{id}`: {one line: what it does and why it's worth watching}
... (6 ids from this theme; best-performing MAKEABLE ones first, then one or two strong non-makeable ones if they teach something)
```

## Output 2: `classify2/theme_meta_{slug}.json`

```json
{"slug": "...", "says": "<the 'What the audience says back' paragraph as plain text>", "examples": ["id1", "id2", "id3", "id4", "id5", "id6"]}
```

The first four examples are shown as cards on the landing page, so make the first four the clearest makeable ones.

For the `entertainer` theme ("the derm as entertainer", mostly not makeable), be honest that most of it is off-limits for him. Name the narrow slice he *could* use (e.g. anaesthesia-free patient reactions he's allowed to film, a dry-humour reaction format) and the trap (lip-syncs, memes).
