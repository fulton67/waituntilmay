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
