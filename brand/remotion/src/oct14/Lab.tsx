// Oct14Lab: the reusable devices alone on PLACEHOLDER media (brand/scripts/oct14_placeholder.py; synthetic, no patient), for the
// device stills and the measurements in research/ostad/style/oct14/LAB.md. --props='{"item":"pip"}' | "ba" ; add "bare":true for the
// measuring pass (graphics only on black, so a frame difference is the graphics' own motion).
import React from "react";
import { AbsoluteFill } from "remotion";
import { useElza } from "../Fonts";
import { InjectionPip, Media, WordCaptions, type Word } from "./devices";
import { Label } from "./v3";
import type { Pt } from "./look";

export type Points = { f0: number; pts: Record<string, [number, number][]> };
export type LabProps = { item: "pip" | "ba" | "label"; bare?: boolean; marks?: boolean; points?: Points; opt?: "A" | "B" | "C" };
export const LAB_DUR = { pip: 288, ba: 264, label: 48 } as const;
const PH = "oct14/placeholder/";

// the lab timeline (frames): the same numbers measure.py checks against
export const LAB_PIPS = [
  { n: 1, s: 30, out: 100, key: "marioL", clip: "inj1.mp4", label: "Marionette line" },
  { n: 2, s: 110, out: 180, key: "nasoR", clip: "inj2.mp4", label: "Smile line" },
  { n: 3, s: 190, out: 260, key: "lipU", clip: "inj3.mp4", label: "Upper lip" },
];
export const LAB_BA = { s: 5, out: 250, pullS: 200, regions: [{ id: "mario", s: 70, key: "marioL", label: "Softer marionette line" }, { id: "naso", s: 140, key: "nasoR", label: "Softer smile line" }] };

export const Oct14Lab: React.FC<LabProps> = ({ item, bare = false, marks = true, points, opt = "C" }) => {
  useElza();

  const tp = (key: string) => (f: number): Pt => {
    const a = points?.pts[key];
    if (!a) return { x: 540, y: 960 };
    const q = a[Math.max(0, Math.min(a.length - 1, f - (points?.f0 ?? 0)))];
    return { x: q[0], y: q[1] };
  };
  const words: Word[] = item === "pip"
    ? [{ w: "right", f: 26, f1: 32 }, { w: "here", f: 30, f1: 38 }, { w: "and", f: 106, f1: 110 }, { w: "here", f: 110, f1: 118 }, { w: "the", f: 186, f1: 190 }, { w: "lip", f: 190, f1: 198 }]
    : [{ w: "before", f: 4, f1: 14 }, { w: "and", f: 16, f1: 20 }, { w: "after", f: 20, f1: 30 }];
  return (
    <AbsoluteFill style={{ background: bare ? "#000" : "#202532" }}>
      {!bare && item === "pip" && <Media src={PH + "intro.mp4"} style={{ left: 0, top: 0, width: 1080, height: 1920 }} />}
      {!bare && item === "ba" && <Media src={PH + "intro.mp4"} style={{ left: 0, top: 0, width: 1080, height: 1920, filter: "blur(24px) brightness(.6)" }} />}
      {item === "pip" && LAB_PIPS.map((q) => (
        <InjectionPip key={q.n} n={q.n} s={q.s} out={q.out} park={276} anchor={tp(q.key)} clip={bare ? PH + "before.jpg" : PH + q.clip} label={q.label} eyebrow={`Point ${q.n}`} />
      ))}
      {item === "label" && <Media src="oct14/intro.mp4" trimBefore={Math.round(87.5 * 24)} style={{ left: 0, top: 0, width: 1080, height: 1920, objectFit: "cover" }} />}
      {item === "label" && <Label style={opt} eyebrow="The source" word="Deflation" sub="Soft tissue moving down" s={2} subS={12} out={999} x={98} y={1150} />}
      {item !== "label" && <WordCaptions words={words} />}
    </AbsoluteFill>
  );
};
