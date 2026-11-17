import React from "react";
import { Easing, random, useCurrentFrame, useVideoConfig } from "remotion";
import tokens from "../../../kit/tokens.json";
import { DISPLAY, MUTE2 } from "../components/YT";
import { ICE_HL } from "../library/Highlighter";

// devices/TypeEntry.tsx: the type-entry system (DESIGN_PER_BEAT §5; research/ostad/style/DEVICE_LIBRARY.md §T; exomind/TYPE_AUDIT.md).
// Each id reproduces its reference entry: direction, distance (% of frame HEIGHT, as measured), duration, easing and overshoot (none:
// no frame-counted reference entry overshoots). Durations are 24 fps frames, scaled to the composition fps. The D numbers below are
// the animation lengths that make OUR render measure the reference frame count with the reference method (easing_fit.fit_track:
// frames until |p - 1| <= 1 %); the measured pairs are in research/ostad/style/exomind/ARROW_TYPE_PROOF.md.
// Replaces v4.1's single entry (44 of 73 entries: a 48 f CSS-ease fade + 20-40 px rise, starting ~33 f before its word).
//
// wordTimes: composition FRAMES of each word's spoken onset (like `start`); a word-tied reveal starts at onset + 1 f (MOTION.md §1.2).
// Use wordFrames(yt_words line, fps) to turn the seconds in brand/edits/exomind-skin/yt_words.json (already on the 1.15x timeline) into frames.
// Line/label entries (message-lines, orbit-labels, line-accumulate) take one time per line or label instead (see each case).

export type EntryId =
  | "type-word-fade-rise" | "type-highlight-sweep" | "type-box-slam" | "type-ghost-to-lit" | "type-line-accumulate" | "type-typewriter"
  | "type-message-lines" | "type-orbit-labels" | "type-letter-stagger-out" | "type-card-rise" | "type-rise" | "type-slide-side"
  | "type-scale-pop" | "type-name-decode";

const T = tokens as any;
const px = (s: string) => parseFloat(s);
export const TYPE_INK = T.color.text.$value as string;
const GLASS = { radius: px(T.radius.glass.$value), blur: px(T.blur.glass.$value), alpha: T.opacity.glass.$value as number };

// the reference behaviour each id rebuilds (DEVICE_LIBRARY §T), and our animation length D (24 fps) that measures to it
export const ENTRY_SPEC: Record<EntryId, { ref: string; D: number }> = {
  "type-word-fade-rise": { ref: "DDOS f3-9: up 6 % H, 5 f, ease-out, 0 overshoot", D: 5 },
  "type-highlight-sweep": { ref: "DDOS f27-47: block L->R 16 f on sweep, peak 44 %, text static", D: 17 },
  "type-box-slam": { ref: "GMu3 f1512-1520: pops on whole, rises 7 % H + scale .85->1 in 4 f, then box wipes L->R 4 f", D: 4 },
  "type-ghost-to-lit": { ref: "WZ f238-263: line rises 2 % H in 5 f; each word dim -> ink in 1 f on its onset", D: 6 },
  "type-line-accumulate": { ref: "DDOS f2595-2821: a line per phrase, cut on, words lit +-1 f, no travel", D: 0 },
  "type-typewriter": { ref: "DDOS f1539-1556: 3.9 characters per frame, linear, no caret", D: 0 },
  "type-message-lines": { ref: "glp1 f860-940: plate 4 f, sender row, each line fades + rises 1 % H in 4 f", D: 4 },
  "type-orbit-labels": { ref: "glp1 f622-644: labels rise and fan out on an arc, 3 f first pair, 9 f total, ease-out", D: 3 },
  "type-letter-stagger-out": { ref: "Are.na 12087163: letters leave from each line's end, 1 per GIF frame (2.4 f)", D: 0 },
  "type-card-rise": { ref: "colin DZiJljQJEKN f46-64: up 10.7 % H, 17 f, bezier (0,.18,.42,.91), keeps drifting", D: 18 },
  "type-rise": { ref: "all refs: up 4.2 % H, settle 11.2 f (median), ease-out", D: 12 },
  "type-slide-side": { ref: "all refs: slide right 2.8 % H, 9 f", D: 9 },
  "type-scale-pop": { ref: "all refs: scale .95->1, 5 f", D: 5 },
  "type-name-decode": { ref: "G4 FWfMMmC6mzE f960-1029: asterisks resolve over ~70 f", D: 70 },
};
export const TYPE_ENTRIES = Object.keys(ENTRY_SPEC) as EntryId[];

const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const outQuad = Easing.bezier(0.5, 1, 0.89, 1); // ease-out (99 % at 89 % of D)
const sweep = Easing.bezier(0.6, 0, 0.25, 1); // MOTION.md sweep
const cardC = Easing.bezier(0, 0.18, 0.42, 0.91); // colin card, measured (easing.json)
const exitC = Easing.bezier(0.4, 0, 1, 1); // MOTION.md exit
const EXIT_F = 7, FALL = 7;
// nominal travel (share of frame height) set so the VISIBLE travel (first legible frame -> rest, the reference measure) matches:
// rise 4.2 % H, slide 2.8 % H, word 6 % H, slam 7 % H, ghost 2 % H, pop 5 % scale (ARROW_TYPE_PROOF.md)
export const RISE = { rise: 0.05, slide: 0.035, word: 0.09, slam: 0.08, ghost: 0.04, pop: 0.07, message: 0.02 };

/** yt_words.json seconds (one caption line) -> composition frames */
export const wordFrames = (secs: number[], fps = 24) => secs.map((s) => Math.round(s * fps));

export const TypeEntry: React.FC<{
  entry: EntryId; start: number; text: string | React.ReactNode; style?: React.CSSProperties; exitAt?: number; wordTimes?: number[];
}> = ({ entry, start, text, style, exitAt, wordTimes }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const k = fps / 24, F = (n: number) => n * k;
  const D = F(ENTRY_SPEC[entry].D);
  if (frame < start) return null;
  const isStr = typeof text === "string";
  const lines = isStr ? (text as string).split("\n") : [""];
  const words = isStr ? lines.flatMap((l) => l.split(" ").filter(Boolean)) : [];
  // the frame word i is revealed: onset + 1 f, else a default cadence
  const wt = (i: number, step: number, from = start) => (wordTimes?.[i] != null ? wordTimes[i] + 1 : from + F(step * i));
  const p = (s: number, d: number, c: (x: number) => number = outQuad) => (d <= 0 ? (frame >= s ? 1 : 0) : c(cl((frame - s) / d)));

  // generic exit (all but letter-stagger-out): `exit` 7 f, opacity 1 -> 0, falls 7 px
  const ex = exitAt != null && entry !== "type-letter-stagger-out" ? exitC(cl((frame - exitAt) / F(EXIT_F))) : 0;
  if (exitAt != null && frame > exitAt + F(EXIT_F) && entry !== "type-letter-stagger-out") return null;
  const base: React.CSSProperties = { font: `500 64px/1.1 ${DISPLAY}`, letterSpacing: "0.0082em", color: TYPE_INK, ...style };
  const wrap = (inner: React.ReactNode, tf = "", op = 1, extra: React.CSSProperties = {}) => (
    <div style={base}>
      <div style={{ transform: `${tf} translateY(${ex * FALL}px)`, opacity: op * (1 - ex), transformOrigin: "50% 50%", ...extra }}>{inner}</div>
    </div>
  );
  const lineBreaks = (render: (w: string, i: number) => React.ReactNode) => {
    let i = 0;
    return lines.map((l, li) => (
      <div key={li}>{l.split(" ").filter(Boolean).map((w) => { const j = i++; return <React.Fragment key={j}>{render(w, j)}{" "}</React.Fragment>; })}</div>
    ));
  };

  switch (entry) {
    case "type-rise": {
      const q = p(start, D);
      return wrap(text, `translateY(${(1 - q) * RISE.rise * height}px)`, q);
    }
    case "type-slide-side": {
      const q = p(start, D);
      return wrap(text, `translateX(${-(1 - q) * RISE.slide * height}px)`, q);
    }
    case "type-scale-pop": {
      const q = p(start, D);
      return wrap(text, `scale(${1 - RISE.pop + RISE.pop * q})`, q);
    }
    case "type-card-rise": {
      const q = p(start, D, cardC);
      const drift = Math.max(0, frame - start - D) * 0.15; // keeps rising slowly (0.15 px/f) while held
      return wrap(
        <div style={{ background: "#ffffff", borderRadius: GLASS.radius, padding: "28px 36px", display: "inline-block" }}>{text}</div>,
        `translateY(${(1 - q) * 0.107 * height - drift}px)`, 1,
      );
    }
    case "type-word-fade-rise": {
      if (!isStr) { const q = p(start, D); return wrap(text, `translateY(${(1 - q) * RISE.word * height}px)`, q); }
      return wrap(lineBreaks((w, i) => {
        const q = p(wordTimes ? wt(i, 0) : start, D);
        return <span style={{ display: "inline-block", opacity: q, transform: `translateY(${(1 - q) * RISE.word * height}px)` }}>{w}</span>;
      }));
    }
    case "type-box-slam": {
      const q = p(wordTimes ? wt(0, 0) : start, D, sweep);
      const s0 = (wordTimes ? wt(0, 0) : start) + D;
      const b = p(s0, F(4), sweep);
      return wrap(
        <span style={{ display: "inline-block", padding: "0.06em 0.22em", background: b > 0 ? `linear-gradient(90deg, ${ICE_HL} ${b * 100}%, transparent ${b * 100}%)` : undefined }}>
          <span style={{ display: "inline-block", transform: `translateY(${(1 - q) * RISE.slam * height}px) scale(${0.85 + 0.15 * q})`, opacity: q > 0 ? 1 : 0 }}>{text}</span>
        </span>,
      );
    }
    case "type-highlight-sweep": {
      const s0 = wordTimes ? wt(0, 0) : start;
      const q = p(s0, D, sweep);
      if (!isStr) return wrap(<span style={{ background: `linear-gradient(90deg, ${ICE_HL} ${q * 100}%, transparent ${q * 100}%)`, padding: "0 0.1em" }}>{text}</span>);
      const chars = words.map((w) => w.length + 1), total = chars.reduce((s, c) => s + c, 0);
      let acc = 0;
      return wrap(lineBreaks((w, i) => {
        const from = acc / total, share = chars[i] / total; acc += chars[i];
        const u = cl((q - from) / share);
        return <span style={{ background: u > 0 ? `linear-gradient(90deg, ${ICE_HL} ${u * 100}%, transparent ${u * 100}%)` : undefined, padding: "0 0.1em", margin: "0 -0.1em" }}>{w}</span>;
      }));
    }
    case "type-ghost-to-lit": {
      const q = p(start, D);
      return wrap(lineBreaks((w, i) => <span style={{ color: frame >= wt(i, 5, start + F(5)) ? (base.color as string) : MUTE2 }}>{w}</span>), `translateY(${(1 - q) * RISE.ghost * height}px)`, q);
    }
    case "type-line-accumulate": {
      let i = 0;
      return wrap(lines.map((l, li) => {
        const ws = l.split(" ").filter(Boolean), first = i;
        const out = (
          <div key={li} style={{ visibility: frame >= wt(first, 5) ? "visible" : "hidden" }}>
            {ws.map((w, j) => <React.Fragment key={j}><span style={{ color: frame >= wt(first + j, 5) ? (base.color as string) : MUTE2 }}>{w}</span>{" "}</React.Fragment>)}
          </div>
        );
        i += ws.length;
        return out;
      }));
    }
    case "type-typewriter": {
      if (!isStr) return wrap(text, "", frame >= start ? 1 : 0);
      const s0 = wordTimes ? wt(0, 0) : start;
      const n = Math.floor(((frame - s0 + 1) * 3.9) / k);
      let c = 0;
      return wrap(lines.map((l, li) => {
        const vis = Math.max(0, Math.min(l.length, n - c)); c += l.length;
        return <div key={li}>{l.slice(0, vis)}<span style={{ visibility: "hidden" }}>{l.slice(vis)}</span></div>;
      }));
    }
    case "type-letter-stagger-out": {
      if (exitAt != null && frame >= exitAt) {
        const gone = Math.floor((frame - exitAt) / F(2.4)) + 1;
        if (lines.every((l) => gone >= l.length)) return null;
        return wrap(lines.map((l, li) => <div key={li}>{l.slice(0, Math.max(0, l.length - gone))}<span style={{ visibility: "hidden" }}>{l.slice(Math.max(0, l.length - gone))}</span></div>));
      }
      return wrap(isStr ? lines.map((l, li) => <div key={li}>{l}</div>) : text);
    }
    case "type-name-decode": {
      if (!isStr) return wrap(text);
      const s0 = wordTimes ? wt(0, 0) : start;
      const span = wordTimes && wordTimes.length > 1 ? Math.max(F(8), wordTimes[wordTimes.length - 1] + 1 - s0) : D;
      const chars = (text as string).split("");
      // seeded random order, evenly spread so the last character resolves at the end of the span
      const order = chars.map((_, i) => i).sort((a, b) => random(`decode-${text}-${a}`) - random(`decode-${text}-${b}`));
      const rank = new Map(order.map((ci, r) => [ci, r]));
      return wrap(chars.map((ch, i) => {
        const when = s0 + Math.round((span * ((rank.get(i) ?? 0) + 1)) / chars.length);
        return ch === "\n" ? <br key={i} /> : <span key={i}>{ch === " " || frame >= when ? ch : "*"}</span>;
      }));
    }
    case "type-message-lines": {
      // lines[0] = sender row, the rest = message lines; wordTimes = [plate, sender, line 1, line 2, ...] onsets
      const tp = wordTimes?.[0] != null ? wordTimes[0] + 1 : start;
      const plate = p(tp, D);
      const at = (i: number) => (wordTimes?.[i + 1] != null ? wordTimes[i + 1] + 1 : tp + F(i === 0 ? 4 : 12 + 6 * (i - 1)));
      return wrap(
        <div style={{ display: "inline-block", minWidth: 520, padding: "26px 32px", borderRadius: GLASS.radius, background: `rgba(255,255,255,${GLASS.alpha})`,
          backdropFilter: `blur(${GLASS.blur}px)`, opacity: plate, transform: `scale(${0.96 + 0.04 * plate})`, transformOrigin: "0 0" }}>
          {lines.map((l, i) => {
            const q = p(at(i), F(4));
            return <div key={i} style={{ opacity: q, transform: `translateY(${(1 - q) * RISE.message * height}px)`, ...(i === 0 ? { fontSize: "0.62em", opacity: q * 0.7, marginBottom: "0.4em" } : {}) }}>{l}</div>;
          })}
        </div>,
      );
    }
    case "type-orbit-labels": {
      // labels (one per line) fan out on an arc above the anchor; first pair lands in 3 f, the next pair 6 f later (9 f total)
      const n = lines.length, R = 0.36 * height;
      return wrap(
        <div style={{ position: "relative", width: 2 * R, height: R * 1.1 }}>
          {lines.map((l, i) => {
            const a = ((n === 1 ? 0 : -55 + (110 * i) / (n - 1)) * Math.PI) / 180;
            const s = wordTimes?.[i] != null ? wordTimes[i] + 1 : start + F(Math.floor(i / 2) * 6);
            const q = p(s, D);
            const r = R * (0.6 + 0.4 * q);
            const x = R + r * Math.sin(a), y = R * 1.1 - r * Math.cos(a) + (1 - q) * 0.03 * height;
            return <div key={i} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", opacity: q, whiteSpace: "nowrap" }}>{l}</div>;
          })}
        </div>,
      );
    }
  }
};
