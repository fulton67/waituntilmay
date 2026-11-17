import React from "react";
import { useCurrentFrame } from "remotion";
import { TypeEntry } from "../devices/TypeEntry";
import { C, SERIF, cl, ease, p } from "./look";

// type-name-decode (B14 f1379-1448). Ref: G4 T22 (a name resolves from placeholder characters at ~40 f per line). 'The next
// frontier' is set as defocused ghost glyphs (same font) that resolve in a seeded order (devices/TypeEntry type-name-decode, last letter on the onset of
// 'frontier' + 1). Under it a horizon hairline draws on `sweep` 26 f from the centre out, carrying a soft cool light that keeps
// travelling along it while held; the type layer pushes 1.00 -> 1.04. Exit 7 f.
export const TypeNameDecode: React.FC<{ start?: number; words?: number[]; exitAt?: number; text?: string; x?: number; y?: number; w?: number; size?: number }> = ({
  start = 1, words = [1, 34, 40], exitAt = 63, text = "The next frontier", x = 960, y = 420, w = 1200, size = 132 }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const u = ease.blank(cl((f - start) / Math.max(1, exitAt - start)));
  const line = p(f, start, 26, ease.sweep);
  const o = p(f, exitAt, 7, ease.exit);
  const glow = ((f - start) % 72) / 72;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - o }}>
      <div style={{ position: "absolute", left: x - w / 2, top: y, width: w, textAlign: "center", transform: `scale(${1 + 0.04 * u})`, transformOrigin: "50% 60%" }}>
        <TypeEntry entry="type-name-decode" start={start} text={text} wordTimes={words} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: size, lineHeight: 1, letterSpacing: "-0.01em", color: C.ink }} />
      </div>
      <div style={{ position: "absolute", left: x - (w / 2) * line, top: y + size * 1.22, width: w * line, height: 1.5, background: `linear-gradient(90deg, rgba(33,27,21,0), ${C.ink} 18%, ${C.ink} 82%, rgba(33,27,21,0))` }} />
      {line >= 1 && (
        <div style={{ position: "absolute", left: x - w / 2 + glow * w - 140, top: y + size * 1.22 - 12, width: 280, height: 26, borderRadius: 13,
          background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(55,169,232,.55), rgba(55,169,232,0) 70%)" }} />
      )}
    </div>
  );
};
