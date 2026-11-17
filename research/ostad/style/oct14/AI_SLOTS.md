# Oct 14 reel: AI slots (minimal; Remotion first)

**Consent = yes** (written, before the procedure; clinic-library DECISIONS 2026-11-17; DECISIONS 16d).

The client prefers Remotion, so AI is used in a few targeted spots only. v3 ships with **no AI output**: every slot below already has its designed Remotion fallback in the render. Flora / Higgsfield are not connected in this environment, so nothing was generated.

Hard rules for any slot:
- AI never shows a result, a before/after, or any change in a face.
- AI never generates or alters the real patient or Dr. Ostad.
- Every AI frame is labelled "Illustration".
- It sits inside the identity tokens (brand/kit/tokens.json) and the glass system: no blue, no off-palette tint.
- No AI brand or product imagery (no syringes with labels, no Evolysse / Jeuveau packs).
- AI outputs are gitignored (brand/edits/oct14-injection/); only these briefs are committed.

| Slot | Line | Brief (if ever generated) | Remotion fallback in v3 |
|---|---|---|---|
| A1 | "deflation … soft tissue moving down" (S2, about 40 s) | A 3 s illustrative loop of generic facial fat pads settling downward, in a neutral cream-and-ink style. No real face, no skin texture, labelled "Illustration". | **Superseded in v3 by Remotion:** the glass anatomy card traced from face.glb (cheek and jowl fat sliding down from a dashed ghost, the cheekbone strengthening on "cheekbones"; outline error ≤ 1.4 px against the model render), plus the pen route on her own cheek. AI is not needed here. |

That was the only slot, and the traced anatomy now covers it, so v3 uses no AI at all. The other candidates from the earlier draft (onset timeline, product texture) are done better in Remotion (MonthsRule, Ledger) or are banned (product imagery), so they are dropped.
