# Tag guide — Journey to the Center of the Internet

Rules for tagging `phrases.json` (1,366 phrases). Every batch follows this file
so tagging stays consistent from phrase 0 to phrase 1365.

## Conventions

- A phrase may carry **multiple tags**. Most carry 1–3.
- A phrase carries **at least one** tag. If nothing else fits, it is `filler`.
- `filler` is **exclusive**: if a phrase is tagged `filler` it gets no other tag.
  This matters because the randomizer must never select `filler`.
- Tag on **what the words say**, not on what the video shows.
- Judge the phrase **on its own**, as a standalone fragment. It will be cut out
  of context, so "does this read as X when heard alone?" is the test.
- JSON key for *inside/threshold* is `inside`.

## Tags

### `physical`
Buildings, cables, machines, geography, hardware, named places. Concrete nouns
you could photograph or touch.

- `563` "specifically the undersea cables that connect continents."
- `593` "that transmits the electricity that powers these repeaters that sit on the ocean floor"
- `457` "has quite a bit of space in this building, I think."

### `abstract`
The internet as idea. Cloud, network-as-concept, information, data, virtuality,
metaphor. The non-material side of the talk.

- `138` "completely absurd because the internet is a transcendent idea."
- `99` "physical world around you and this ostensibly virtual world inside the screen."
- `62` "four involved with connecting Microsoft's network to other networks."

### `definition`
Statements of what something **is** (or is not). Copular constructions: "X is
Y", "that is", "it was", "means", "the definition of". The load-bearing tag for
phase 3 pseudo-sentences, so tag it generously wherever the grammar asserts
identity.

- `194` "the history of the internet is a history of metaphors about the internet,"
- `212` "It's not something you can dump something on. It's a series of tubes,"
- `181` "And she says, this is the internet, the whole internet?"

### `people`
Bodies, workers, engineers, users, audiences. First/second person as social
actors — "we", "you", "they", "people", named individuals.

- `14` "lot of the people that I wrote about spend many of their days here,"
- `28` "you guys are my villain,"
- `60` "There are 200 people involved with Microsoft's global network. There are,"

### `doubt`
Negation, uncertainty, hedging, questions. "not", "never", "no", "maybe",
"seemed", "apparently", "hardly", and any interrogative. Carries the
simulacrum's instability, so tag it on the negation even when the phrase is
also a definition.

- `12` "I've actually never stepped foot inside of it."
- `102` "that world behind the screen seemed to have no physical reality."
- `214` "It was absolutely not a series of tubes. It was, again,"

### `scale`
Numbers, quantities, size, speed, distance, dates, percentages, orders of
magnitude.

- `59` "there are 90,000 employees. You guys are how many now? 50, I think."
- `264` "a 10 gigabit per second wave of light,"
- `24` "have you read pages 235 to 245?"

### `filler`
Throat-clearing, audience logistics, Q&A scaffolding, thanks, book-signing,
off-topic asides. **Exclusive** — never combined.

- `1000` "I was like, OK, great. Thank you."
- `1035` "Can you take questions?"
- `1106` "I don't know how many months ago I emailed you, but thank you for coming."

## Concept tags (added per concept.md)

These three carry the piece's argument: *the internet is a dimension stored
inside another dimension*. They overlap freely with the tags above.

### `water`
Ocean, sea, undersea, underwater, beach, shore, coast, landing point, cable
ship, harbour, island, and the named crossings (Atlantic, Pacific, Cornwall,
Lisbon). The medium you pass **through**.

- `567` "is there like a manhole where the undersea cable connects to the beach?"
- `612` "yet when you look out across the ocean,"
- `577` "New Jersey or Long Island beaches"

Pool is small — roughly 46 keyword occurrences across the talk — so tag it on
any genuine maritime reference, including cable ships and landing stations.

### `inside`  *(inside / threshold)*
Inside, into, through, under, beneath, within, centre, core, crossing, entering,
behind, interior. Prepositions of containment and passage. This is the tag that
makes "a dimension inside a dimension" legible, so it is tagged on the
**spatial relation**, not just on concrete interiors.

- `6` "obvious thing is we are standing at the center of the internet."
- `12` "I've actually never stepped foot inside of it."
- `226` "negate the fact that each one of those things is passing through."

### `real`
Assertions of realness, actuality, materiality — "real", "actually", "physical",
"tangible", "a place", "a thing". Distinct from `physical`: `physical` is a
concrete **noun**, `real` is a **claim about** something's reality. A phrase
naming a building is `physical`; a phrase arguing the internet is real is
`real`.

- `99` "physical world around you and this ostensibly virtual world inside the screen."
- `102` "that world behind the screen seemed to have no physical reality." *(also `doubt`)*
- `138` "completely absurd because the internet is a transcendent idea." *(also `abstract`)*

## Selection weighting (for randomize.py)

Tags are **weights, not filters**. Every non-filler phrase is eligible in every
phase; tags only change selection probability, weighted toward `water` +
`inside` + `real` + `definition` so each version builds toward *a dimension
inside a dimension*.

`filler` is eligible in **phase 4 only**, and there mainly as single words and
sub-second slices. In phases 1-3 it is never selected.

## Edge cases, decided once

| Situation | Decision |
|---|---|
| "the internet is a series of tubes" | `definition` + `physical` + `abstract` — it defines, names a thing, and is a metaphor |
| Question that is also a definition | both `doubt` and `definition` |
| Audience question with real content | tag its content, **not** `filler`; `filler` is for logistics only |
| Sentence fragment with no content word | `filler` |
| "we"/"you" used as a generic pronoun, not about people | do **not** tag `people` |
| A number used as an aside ("2007, 2008") | still `scale` |
| "in" as a bare preposition of place | do **not** tag `inside` — needs real containment or passage |

## Revision: widened `water` (after STEP 1 review)

The literal maritime vocabulary is thin (46 keyword occurrences), so `water`
was widened to cover the **continuous cable-landing narration** — the Lisbon
beach sequence and its conclusion — even where a phrase carries no maritime
keyword of its own ("the English engineers looking on", "then once it's in
place"). The scene is the water crossing; a fragment cut from it reads as such.

37 phrases added across the 693–780 run. Pool: 56 → **93 phrases / 188.8s**.

Deliberately NOT widened: 754 ("the amorphous blob seems a really long way
away") and 755 ("a lot more tangible thing"). They sit inside the scene but are
the conceptual pivot, already carrying `abstract` / `real`; tagging them `water`
would dilute the pool with phrases that do not read as maritime alone.

## Widening: the cable material (added with the multi-source pool)

The pool is no longer one talk. `config/sources.json` lists every source and
this guide applies to all of them unchanged — the tags are about what the
words say, not about who is speaking. Two tags are added for the Red Sea
material, where the subject is a cable being cut rather than a cable being
visited.

### `attack`
Force directed at something. Strike, struck, hit, target, attack, drone,
missile, bomb, shoot, launch, war, military, airstrike, retaliation,
assault, offensive, escalation.

- "military carried out new airstrikes in Yemen today,"
- "targeting 10 drones and a ground control station"
- "The airstrikes are the latest targeting the Houthis."

Nearby vocabulary (needs two to fire on its own): force, defence, threat,
conflict, violence, kill, death, destroy.

### `cut`
A connection failing, and the repair of it. Cable, cut, sever, damage,
outage, repair, disrupt, broken, connectivity, disconnect, restore, sabotage,
and "internet … down" either way round.

- "three undersea cables in the Red Sea were cut"
- "a quarter of the traffic between Europe and Asia rerouted"
- "the repair ship could not get a permit to enter"

Nearby vocabulary: fail, interrupt, blackout, anchor, drag.

`attack` and `cut` overlap freely — a cable cut by a strike is both — and both
overlap `physical` (the cable is a concrete noun) and `water` (the Red Sea).
A phrase about a strike on a ship, with no cable in it, is `attack` and not
`cut`. A phrase about an anchor dragging through a cable is `cut` and not
`attack`.

### Which sources carry them

`attack` and `cut` are offered to the Red Sea material only (`lackner` and
`houthi-*`). Running them over the Blum talk would tag "it hit me that" as an
attack; the talk has no such material to find, so it is not asked the
question. `scripts/autotag.py` holds that split in `tagset_for`.

## Applying the guide without reading 12 sources by hand

Blum's 1,366 phrases were tagged by hand. The sources added since are tagged
by `scripts/autotag.py`, which writes the rules above out as lexicon and
grammar tests and is scored against those hand tags:

```
tag           hand   auto   both   prec recall     F1
abstract       200    182    130   0.71   0.65   0.68
definition     194    428    170   0.40   0.88   0.55
doubt          152    185    118   0.64   0.78   0.70
filler         457    371    287   0.77   0.63   0.69
inside          91     72     49   0.68   0.54   0.60
people         254    442    200   0.45   0.79   0.57
physical       442    255    215   0.84   0.49   0.62
real            79     61     40   0.66   0.51   0.57
scale          141    132     81   0.61   0.57   0.59
water           93     37     36   0.97   0.39   0.55

selectable kept selectable  81.4%
filler kept out of the pool 62.8%
at least one tag agrees     70.3%
```

Where precision and recall pull against each other the rules lean toward
keeping a phrase selectable: a wrong content tag costs a slightly wrong
selection weight, a wrong `filler` costs the phrase entirely. `water` is
precise and shy, which is the right way round for a small pool — every
phrase it finds is genuinely maritime.

Note what these tags do and do not drive. Selection in `randomize.py` runs on
the five-beat regex pools in `pipeline/units.py`, not on `tags.json`; the tags
are the pool's description of itself, read by `scripts/source_report.py` and
by hand. So the accuracy above bounds how well the pool can be *described*,
not how well a version is cut.

## A note on level, not tagging

Every source is levelled to **-19.9 LUFS** at ingest (`scripts/ingest_source.py`,
`TARGET_LUFS`), which is Blum's own integrated loudness. This is not cosmetic.
The voice runs as one continuous line across sources, so a source off that
level jumps audibly at the splice, and - because the speech-coverage gate in
`scripts/verify_renders.py` is an absolute dBFS threshold calibrated against
Blum's noise floor - it also reads as *silence* to the gate. Measured: a
broadcast source arrived at -32.4 LUFS against Blum's -19.9 and cost half a
30-version batch a check it should have passed. `scripts/source_report.py`
prints the spread and flags it above 1.0 LU.

## A source that was not spoken in English

Every rule in `scripts/autotag.py` is an English regex, so a source recorded
in another language comes back `filler` on every phrase if it is tagged on its
own words. Those sources are transcribed and aligned in their own language —
the word timings have to match the audio that gets cut, and aligning an
English translation against Arabic speech would place every word wrong — and
then translated in a second pass.

`build_outputs.py` writes `transcript/phrases_en.json`, keyed by the same
phrase ids, holding the English text that overlaps each phrase in time. The
tagger reads it when it is there. The phrase keeps its own words and its own
timings; only the text the rules read changes.

The same file gives `pipeline/link.py` its content words for that source, so a
translated phrase about a cable can link to Blum's cable. Without it a
non-English source could only ever link on a tag, because an Arabic token
shares nothing with English however much the two phrases are about the
same thing.
