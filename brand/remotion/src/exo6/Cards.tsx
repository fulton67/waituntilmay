import { Arrow } from "../devices/Arrow";
import React from "react";
import { useCurrentFrame } from "remotion";
import { C, caps, cl, display, drift, ease, p, text } from "./look";
import { Glass } from "./parts";

// exo6/Cards.tsx: the title card (device `wordmark-depth-sandwich`), the section card (`chapter-title-card`, one look for all four)
// and the end card. Timings are the measured reveals in research/ostad/style/exomind/beats.json `cards` + DEVICE_LIBRARY.

// ------------------------------------------------------------------------------------------------ section card
// chapter-title-card (G4 T30 eMX2jPQE090 f1160-1207: letters light up one by one under a travelling soft light; SU blank 11+7+11 f).
// Ours, 30 f in all (beats.json cards): number + rule draw and the title types on in 12 f, holds 10 f, letters leave from the line
// end in 8 f (type-letter-stagger-out). Each letter arrives defocused (6 px -> 0 in 3 f) under a light bloom that rides the typing
// head, so the light, not a slide, does the reveal. Sits on the clean canvas right of keyed Ostad, who keeps talking.
export const SECTION_TIMING = { typeIn: 12, hold: 10, out: 8 } as const;

export const SectionCard: React.FC<{ num: string; title: string; start: number; x?: number; y?: number; size?: number }> = ({ num, title, start, x = 860, y = 400, size = 118 }) => {
  const f = useCurrentFrame();
  const t = f - start;
  const { typeIn, hold, out } = SECTION_TIMING;
  if (t < 0 || t > typeIn + hold + out) return null;
  const n = title.length;
  const outT = t - (typeIn + hold); // >= 0 while leaving
  const rate = n / typeIn; // letters per frame in
  const head = Math.min(n, t * rate); // typing head (fractional letter index)
  const gone = outT >= 0 ? Math.ceil(((outT + 1) / out) * n) : 0; // letters removed from the end
  const rule = p(f, start, typeIn, ease.sweep) * (1 - p(f, start + typeIn + hold, out, ease.exit));
  const numO = p(f, start, 5) * (1 - p(f, start + typeIn + hold + out - 4, 4, ease.exit));
  const bloomX = (Math.min(head, n) / n) * 100;
  const bloomO = cl(1 - Math.max(0, t - typeIn) / 6) * 0.9 + 0.1 * (outT < 0 ? 1 : 0);
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      {/* travelling light: a wide soft bloom + a tight warm core at the typing head */}
      <div style={{ position: "absolute", left: `${bloomX * 0.01 * n * size * 0.42 - 260}px`, top: -150, width: 520, height: 420,
        background: "radial-gradient(ellipse at 50% 55%, rgba(255,255,255,.95), rgba(255,255,255,0) 62%)", opacity: bloomO, filter: "blur(6px)" }} />
      <div style={{ position: "absolute", left: `${bloomX * 0.01 * n * size * 0.42 - 70}px`, top: 8, width: 140, height: 150,
        background: "radial-gradient(ellipse at 50% 50%, rgba(159,214,245,.55), rgba(159,214,245,0) 65%)", opacity: bloomO }} />
      <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: numO, marginBottom: 18 }}>
        <span style={{ ...caps(30, C.blue), letterSpacing: "0.2em" }}>{num}</span>
        <span style={{ width: 220, height: 3, borderRadius: 2, background: C.blue, transformOrigin: "0 50%", transform: `scaleX(${rule})` }} />
        <span style={{ ...caps(26, C.ink2), opacity: rule }}>Chapter</span>
      </div>
      <div style={{ ...display(size), whiteSpace: "nowrap", position: "relative" }}>
        {title.split("").map((ch, i) => {
          const local = head - i + Math.max(0, t - typeIn) * rate; // > 0 once the head passes letter i; keeps growing after the line is typed, so the last letters sharpen too
          const a = cl(local / 1.5);
          const blur = (1 - cl(local / 3)) * 6;
          const visible = i < n - gone;
          return <span key={i} style={{ opacity: visible ? a : 0, filter: blur > 0.05 ? `blur(${blur}px)` : undefined, display: "inline-block", whiteSpace: "pre",
            textShadow: local < 3 && local > 0 ? `0 0 ${18 * (1 - local / 3)}px rgba(159,214,245,.9)` : undefined }}>{ch}</span>;
        })}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ title: wordmark-depth-sandwich
// ro _MAYscxxhDE f66 / glp1 f120-140: giant type behind the keyed subject. Ours (beats.json B01): the wordmark rises 6 % H out of
// its baseline mask in 5 f (DDOS f3-9 ease-out), the subline 3 f later; the wordmark layer pushes 1.000 -> 1.012 over the beat while
// the matte layer (children = keyed Ostad) holds, so the two layers separate in depth; exit = defocus 0 -> 8 px + fade, `exit` 7 f.
// Tonal, lit letters (a cool emboss with a moving highlight), not flat ink: the type is scenery, he is the subject.
export const WordmarkDepthSandwich: React.FC<{
  word: string; subline: string; start: number; exitAt: number; end: number; baselineY?: number; size?: number; children?: React.ReactNode; centerX?: number;
}> = ({ word, subline, start, exitAt, end, baselineY = 560, size = 360, children, centerX = 1060 }) => {
  const f = useCurrentFrame();
  const t = f - start;
  const rise = p(f, start, 5, ease.arrive);
  const sub = p(f, start + 5, 5, ease.arrive);
  const push = 1 + 0.012 * ease.blank(cl((f - start) / Math.max(1, end - start)));
  const x = p(f, exitAt, 7, ease.exit);
  const lightX = -20 + ((t * 1.1) % 160);
  const H = size * 1.0;
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${push})`, transformOrigin: `${centerX}px ${baselineY}px`,
        filter: x > 0 ? `blur(${8 * x}px)` : undefined, opacity: 1 - x }}>
        {/* baseline mask: the word rises out of it */}
        <div style={{ position: "absolute", left: 0, width: 1920, top: baselineY - H, height: H + size * 0.06, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: centerX, bottom: size * 0.06, transform: `translate(-50%, ${(1 - rise) * 0.06 * 1080 + (1 - rise) * H * 0.35}px)`, opacity: rise,
            ...display(size), lineHeight: 0.8, letterSpacing: "0.02em", whiteSpace: "nowrap",
            backgroundImage: `linear-gradient(100deg, rgba(255,255,255,0) ${lightX}%, rgba(255,255,255,.9) ${lightX + 9}%, rgba(255,255,255,0) ${lightX + 18}%), linear-gradient(180deg, #e6edf2 0%, #c9d7e2 58%, #b9c9d6 100%)`,
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
            filter: "drop-shadow(0 2px 0 rgba(255,255,255,.9)) drop-shadow(0 18px 30px rgba(32,37,50,.16))" }}>{word}</div>
        </div>
        <div style={{ position: "absolute", left: centerX, top: baselineY + 26, transform: `translate(-50%, ${(1 - sub) * 0.06 * 1080 * 0.4}px)`, opacity: sub,
          display: "flex", gap: 22, alignItems: "center", whiteSpace: "nowrap" }}>
          <span style={{ width: 40 * sub, height: 1.5, background: C.blue }} />
          <span style={{ ...caps(28, C.ink2), letterSpacing: "0.22em" }}>{subline}</span>
          <span style={{ width: 40 * sub, height: 1.5, background: C.blue }} />
        </div>
      </div>
      {children}
    </>
  );
};

// ------------------------------------------------------------------------------------------------ end card
// A glass card (beats.json cards.end): plate 18 f, then the three lines 4 f apart on `arrive`; a hairline draws under the first line;
// the card keeps a ~1 % drift and its sheen moves. No "Book now" press UI (removed per Naim).
export const EndCard: React.FC<{ lines: [string, string, string]; start: number; end: number; x?: number; y?: number }> = ({ lines, start, end, x = 900, y = 300 }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const t = f - start;
  const plate = p(f, start, 18, ease.plate);
  const L = (i: number) => p(f, start + 10 + 4 * i, 14, ease.arrive);
  const u = p(f, start + 20, 16, ease.sweep);
  const s = 0.985 + 0.015 * plate + 0.008 * ease.blank(cl(t / Math.max(1, end - start)));
  return (
    <>
    <div style={{ position: "absolute", left: x, top: y + drift(f, 4, 160), width: 860, height: 340, transform: `scale(${s})`, opacity: plate }}>
      <Glass r={28} t={t} style={{ inset: 0 }}>
        <div style={{ position: "absolute", left: 64, top: 52 }}>
          <div style={{ ...display(92), opacity: L(0), transform: `translateY(${(1 - L(0)) * 16}px)` }}>{lines[0]}</div>
          <div style={{ width: 360, height: 1.5, background: C.blue, marginTop: 18, transformOrigin: "0 50%", transform: `scaleX(${u})` }} />
          <div style={{ ...text(38, 500), marginTop: 34, opacity: L(1), transform: `translateY(${(1 - L(1)) * 16}px)` }}>{lines[1]}</div>
          <div style={{ ...text(30, 400, C.ink2), marginTop: 12, opacity: L(2), transform: `translateY(${(1 - L(2)) * 16}px)` }}>{lines[2]}</div>
        </div>
      </Glass>
    </div>
    {/* a straight pointer from under the card down toward the description (the CTA the third line names), after the lines land */}
    <Arrow variant="straight-pointer" from={{ x: x + 160, y: y + 360 }} to={{ x: x + 160, y: y + 500 }} start={start + 26} end={end} color={C.blue} />
    </>
  );
};
