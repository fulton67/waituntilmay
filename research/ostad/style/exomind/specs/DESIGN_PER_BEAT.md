# DESIGN PER BEAT — stop repeating text-on-screen; design every moment

Unattended. Same rules as every Ostad run. This applies to the ExoMind edit now and to every edit after it. Add it to the `ostad-video` skill when done.

## What's wrong (Naim's review)

- Every beat gets the same treatment: text rising on screen. No new graphics, no new animations, no variation.
- The 50 reference videos were studied, but none of what they do shows up in the edits.
- The "arrow" is still a blue dot. He wants an actual arrow.
- The text animation at F04 S4, around 24 s, is bad: the way the type moves in is wrong. Find that moment, look at it frame by frame, and compare it to how type enters in the references.
- When Ostad says "check your text messages after the event," the screen should show a phone with a message arriving. When he talks about medical history, show the thing itself. Earlier edits did this (the gut microbiome, the GLP-1 pop-up, the phone moment). This one doesn't.

## The rule

**Text on screen is the last resort, not the default.** For every line Ostad says, first ask what the *thing* is, then show the thing.

## 1. Beat sheet with a literal visual for every line

Go through the transcript line by line. For each beat, write a row in `style/{topic}/BEATS.md`:

- what he says, with timestamps
- **the noun**: the object, place, action or process the line is about (text messages → a phone; medical history → a chart or intake form; the device → the coil on a head; a number → the number as a designed figure, counted up)
- **three different visual concepts** for it, each one sentence, each naming the reference video and frame it borrows its idea from
- the pick, and why

Rules for the picks:
- A phone, document, calendar, chart, map, device or body part is built as an object and animated doing what he describes (a message arrives, a form fills in, a date circles).
- Plain kinetic text is allowed for at most 1 beat in 5, and only when the words themselves are the point.

## 2. The device library from the 50 references

Build `style/DEVICE_LIBRARY.md` from the reference study (contact sheets, read files, RULES.md). List every distinct visual device seen across the references: at least 40 entries. For each: a name, the reference frames, what it's used for, how it moves (entry, hold, exit with measured timings), and whether we have built it yet.

Each new edit must use **at least 3 devices we have never built before**, chosen from the library, and build them properly as Remotion components.

## 3. Variation checks that fail the render

Add `style/tools/variety_check.py`. It reads the edit's beat JSON and fails if:
- the same device is used more than twice in one video
- the same entry animation is used on two beats in a row
- more than 20% of beats are text-only
- fewer than 6 distinct devices appear in a 60 s video
- fewer than 3 never-built-before devices appear
- any dot-and-line callout exists

## 4. Arrows are arrows

A drawn shaft with a real arrowhead, curved where it helps, that draws on from tail to tip, lands, keeps slight motion while held, and animates out. No dots. Build it once, properly, and compare it against arrows in the references on a side-by-side sheet before using it.

## 5. Type motion

Take every text entry in the current edit, starting with F04 S4 at ~24 s. For each, put its frames next to the closest reference text entry and measure direction, distance, duration, easing and overshoot. Replace ours with the measured reference behaviour. Build at least 5 distinct text entries (not five speeds of the same slide) and rotate them.

## 6. Rebuild and prove

1. Redo the ExoMind edit from the new beat sheet.
2. Stills first: one key frame per beat on a single sheet. Look at the sheet. If two tiles look like the same design, redesign one.
3. Render, run `variety_check.py`, publish next to the old version.
4. Report: the beat sheet, devices used (new ones marked), the variety numbers, and the side-by-side sheets for arrows and type.
