import React from "react";
import { Img, staticFile } from "remotion";
import { Canvas } from "../components/YT";

// Storyboard kit (YouTube v6 proposal, brand/edits/exomind-skin/storyboard/STORYBOARD.md). Stills only: every device is drawn at
// its key state. New code; OstadYT (v4.1) and OstadYT5 are untouched.
//
// The grammar, three devices and nothing else:
//   1. Him: keyed on the room canvas, always the same place and size (left third). Never his raw phone frame in a panel.
//   2. The window: a real picture (practice footage, his own before/after, BTL's licensed cards, BTL film) in a soft rounded
//      window that floats beside him or takes the frame when he steps out. Pictures never above 1x of their source pixels.
//   3. Marks that point: a hairline ring on the exact spot ("this is this"), and the thread: one hairline with a travelling bead
//      that runs from the thing he names to where it acts (the client's praised mind -> approach -> skin arrow, made the system).
// Type is the variable under test (`font` prop): see FONTS.

export const W = 1920, H = 1080;
export const NAVY = "#202532", INK = "#2a2f3c", MUTE = "#7d8592", RULE = "rgba(42,47,60,.18)", BLUE = "#37a9e8", ICE = "#cfe9f7";
export const sb = (f: string) => staticFile(`exomind-skin/${f}`);

export type FontKey = "proposal" | "serif" | "text" | "poppins" | "nhg";
// display = the one editorial line per frame; ui = labels, captions, small text
export const FONTS: Record<FontKey, { display: string; dw: number; dTrack: string; ui: string; uw: number; capW: number; name: string }> = {
  // A: Cormorant Garamond 500 for the one editorial line + NHG Text for everything else (both in kit vzz0hgt)
  proposal: { display: '"cormorant-garamond", serif', dw: 500, dTrack: "-0.005em", ui: '"neue-haas-grotesk-text", sans-serif', uw: 500, capW: 500, name: "Cormorant Garamond 500 + Neue Haas Grotesk Text" },
  serif: { display: '"cormorant-garamond", serif', dw: 500, dTrack: "-0.005em", ui: '"neue-haas-grotesk-text", sans-serif', uw: 500, capW: 500, name: "A  Cormorant Garamond 500 + NHG Text" },
  // B: Neue Haas Grotesk Text only, lighter (400 display, 500 labels): the same family the client knows, the quiet optical size
  text: { display: '"neue-haas-grotesk-text", sans-serif', dw: 400, dTrack: "-0.015em", ui: '"neue-haas-grotesk-text", sans-serif', uw: 500, capW: 400, name: "B  Neue Haas Grotesk Text 400/500" },
  // C: Poppins 400/500 (kit vzz0hgt; the board's second-ranked display match, fonts/SYSTEM.md)
  poppins: { display: '"poppins", sans-serif', dw: 400, dTrack: "-0.02em", ui: '"poppins", sans-serif', uw: 500, capW: 400, name: "C  Poppins 400/500" },
  // reference: what v4.1 uses now
  nhg: { display: '"neue-haas-grotesk-display", sans-serif', dw: 500, dTrack: "0.008em", ui: '"neue-haas-grotesk-display", sans-serif', uw: 500, capW: 500, name: "Now (v4.1)  Neue Haas Grotesk Display 500" },
};
export const FontCtx = React.createContext<FontKey>("proposal");
export const useF = () => FONTS[React.useContext(FontCtx)];

export const Room: React.FC<{ dim?: number }> = ({ dim = 0 }) => (
  <>
    <Canvas glow={[0.62, 0.42]} field={0.35} strip={false} />
    {dim > 0 && <div style={{ position: "absolute", inset: 0, background: `rgba(32,37,50,${dim})` }} />}
  </>
);

// ---------- type ----------
export const Label: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = MUTE, style }) => {
  const f = useF();
  return <div style={{ font: `${f.uw} 17px/1.2 ${f.ui}`, letterSpacing: "0.16em", textTransform: "uppercase", color, ...style }}>{children}</div>;
};
export const Display: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties; italic?: boolean }> = ({ children, size = 60, color = INK, style, italic }) => {
  const f = useF();
  const serif = f.display.includes("cormorant");
  return <div style={{ font: `${italic && serif ? "italic " : ""}${f.dw} ${Math.round(size * (serif ? 1.14 : 1))}px/1.08 ${f.display}`, letterSpacing: f.dTrack, color, ...style }}>{children}</div>;
};
export const Body: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({ children, size = 24, color = INK, style }) => {
  const f = useF();
  return <div style={{ font: `400 ${size}px/1.38 ${f.ui}`, color, ...style }}>{children}</div>;
};
// the source line every frame carries (client approval trail): small, quiet, never on his face
export const Source: React.FC<{ children: React.ReactNode; x?: number; y?: number; right?: number; color?: string; w?: number }> = ({ children, x, y = 1040, right, color = MUTE, w = 900 }) => {
  const f = useF();
  return <div style={{ position: "absolute", left: x, right, top: y, width: w, textAlign: right !== undefined ? "right" : "left", font: `400 14px/1.3 ${f.ui}`, letterSpacing: "0.02em", color }}>{children}</div>;
};
// word-onset caption, the current line with the words he has said so far (rest held invisibly), lower band
export const Cap: React.FC<{ text: string; said?: number; x?: number; y?: number; light?: boolean }> = ({ text, said, x = 175, y = 958, light }) => {
  const f = useF();
  const words = text.split(" ");
  const n = said ?? words.length;
  return (
    <div style={{ position: "absolute", left: x, top: y, font: `${f.capW} 40px/1.27 ${f.ui}`, letterSpacing: "-0.01em", color: light ? "#fff" : INK, whiteSpace: "nowrap", textShadow: light ? "0 0 40px rgba(16,24,40,.35)" : undefined }}>
      {words.map((w, i) => <span key={i} style={{ opacity: i < n ? 1 : 0 }}>{(i ? " " : "") + w}</span>)}
    </div>
  );
};

// ---------- him: one place, one size, keyed, on the canvas ----------
// source 1080x1920 at 0.62 (670 px wide), top -60: head y ~200-500, the same size and place in every section he is on screen.
// His right hand leaves the camera frame at the source's right edge, so that edge is feathered (x ~690-750); the picture column
// starts at x 900 and his caption sits under it (CX), never over his scrubs.
export const CX = 900;
export const Him: React.FC<{ t: string; x?: number }> = ({ t, x = 80 }) => (
  <Img src={sb(`sb/him_${t}.png`)} style={{ position: "absolute", left: x, top: -60, width: 670, height: 1191, WebkitMaskImage: "linear-gradient(90deg, #000 89%, transparent 99%)", maskImage: "linear-gradient(90deg, #000 89%, transparent 99%)" }} />
);

// ---------- the window: a real picture, cropped in SOURCE pixels, shown at scale s = w / crop width ----------
export type Crop = [number, number, number, number]; // sx, sy, sw, sh in source px
export type Box = { x: number; y: number; w: number; h: number };
export const fit = (c: Crop, x: number, y: number, w: number): Box => ({ x, y, w, h: Math.round((c[3] * w) / c[2]) });
export const mapPt = (c: Crop, b: Box, px: number, py: number): [number, number] => [b.x + ((px - c[0]) * b.w) / c[2], b.y + ((py - c[1]) * b.h) / c[3]];
export const Win: React.FC<{ src: string; iw: number; ih: number; crop: Crop; box: Box; r?: number; shadow?: boolean; filter?: string; children?: React.ReactNode; fade?: string }> = ({ src, iw, ih, crop, box, r = 22, shadow = true, filter, children, fade }) => {
  const s = box.w / crop[2];
  return (
    <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, borderRadius: r, overflow: "hidden", boxShadow: shadow ? "0 30px 80px rgba(32,37,50,.20), 0 4px 14px rgba(32,37,50,.08)" : undefined, WebkitMaskImage: fade, maskImage: fade }}>
      <Img src={sb(src)} style={{ position: "absolute", left: -crop[0] * s, top: -crop[1] * s, width: iw * s, height: ih * s, filter }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: r, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.35)" }} />
      {children}
    </div>
  );
};
// a cut-out object floating on the canvas, a soft contact shadow under it
export const Float: React.FC<{ src: string; iw: number; ih: number; crop: Crop; box: Box; fadeBottom?: number }> = ({ src, iw, ih, crop, box, fadeBottom = 0 }) => {
  // the cut-out has alpha 0 outside the object, so nothing is clipped except the bottom fade (the photo cuts the stand there);
  // the box is padded so the drop shadow is never cut by an edge
  const s = box.w / crop[2], pad = 140;
  const fb = fadeBottom ? ((box.h * (1 - fadeBottom / 100) + pad) / (box.h + 2 * pad)) * 100 : 0;
  const m = fadeBottom ? `linear-gradient(180deg, #000 ${fb}%, transparent ${((box.h + pad) / (box.h + 2 * pad)) * 100}%)` : undefined;
  return (
    <div style={{ position: "absolute", left: box.x - pad, top: box.y - pad, width: box.w + 2 * pad, height: box.h + 2 * pad, WebkitMaskImage: m, maskImage: m }}>
      <Img src={sb(src)} style={{ position: "absolute", left: pad - crop[0] * s, top: pad - crop[1] * s, width: iw * s, height: ih * s, filter: "drop-shadow(0 30px 40px rgba(32,37,50,.18))", willChange: "transform" }} />
    </div>
  );
};

// ---------- marks ----------
// ring: the rosacea device (DECISIONS 8-9): hairline ellipse on the exact spot, a dark under-stroke so it reads on any picture
export const Ring: React.FC<{ cx: number; cy: number; rx: number; ry: number; rot?: number; color?: string; draw?: number; dash?: boolean }> = ({ cx, cy, rx, ry, rot = 0, color = "#fff", draw = 1, dash }) => (
  <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} fill="none" stroke="rgba(16,22,34,.28)" strokeWidth={5} pathLength={1} strokeDasharray={`${draw} 1`} />
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} fill="none" stroke={color} strokeWidth={2.4} pathLength={1} strokeDasharray={dash ? "0.012 0.012" : `${draw} 1`} strokeLinecap="round" />
  </svg>
);
// a label chip: frosted, small caps, sits at the end of a hairline leader
export const Chip: React.FC<{ x: number; y: number; children: React.ReactNode; dark?: boolean; anchor?: "l" | "r" }> = ({ x, y, children, dark, anchor = "l" }) => {
  const f = useF();
  return (
    <div style={{ position: "absolute", left: anchor === "l" ? x : undefined, right: anchor === "r" ? W - x : undefined, top: y - 22, height: 44, padding: "0 18px", display: "flex", alignItems: "center", gap: 10, borderRadius: 999, background: dark ? "rgba(20,26,40,.55)" : "rgba(250,251,253,.82)", backdropFilter: "blur(14px)", boxShadow: dark ? "inset 0 0 0 1px rgba(255,255,255,.25)" : "inset 0 0 0 1px rgba(42,47,60,.12), 0 8px 24px rgba(32,37,50,.10)", font: `${f.uw} 16px/1 ${f.ui}`, letterSpacing: "0.14em", textTransform: "uppercase", color: dark ? "#fff" : INK, whiteSpace: "nowrap" }}>
      <span style={{ width: 7, height: 7, borderRadius: 9, background: BLUE, flex: "none" }} />{children}
    </div>
  );
};
export const Lead: React.FC<{ pts: [number, number][]; color?: string; dot?: boolean }> = ({ pts, color = "#fff", dot = true }) => {
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
      <path d={d} fill="none" stroke="rgba(16,22,34,.25)" strokeWidth={4} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} />
      {dot && <circle cx={pts[0][0]} cy={pts[0][1]} r={4.5} fill={color} />}
    </svg>
  );
};
// the thread: a cubic path drawn to `q`, a bead with a soft glow at the drawn end, an open chevron at the destination when done
export const Thread: React.FC<{ d: string; q: number; color?: string; under?: boolean; head?: boolean; len?: number; bead?: [number, number] }> = ({ d, q, color = INK, under, head, bead }) => (
  <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
    <defs><radialGradient id="beadglow"><stop offset="0" stopColor={BLUE} stopOpacity={0.55} /><stop offset="1" stopColor={BLUE} stopOpacity={0} /></radialGradient></defs>
    {under && <path d={d} fill="none" stroke="rgba(16,22,34,.25)" strokeWidth={4.5} pathLength={1} strokeDasharray={`${q} 1`} strokeLinecap="round" />}
    <path d={d} fill="none" stroke={color} strokeWidth={2.6} pathLength={1} strokeDasharray={`${q} 1`} strokeLinecap="round" />
    <path d={d} fill="none" stroke={color} strokeWidth={2} pathLength={1} strokeDasharray="0.004 0.012" opacity={0.35} />
    {bead && <><circle cx={bead[0]} cy={bead[1]} r={26} fill="url(#beadglow)" /><circle cx={bead[0]} cy={bead[1]} r={7} fill="#fff" stroke={BLUE} strokeWidth={3} /></>}
    {head && null}
  </svg>
);
// cubic point helper for placing the bead on a thread drawn with "M a C b c d"
export const cub = (p: number[][], q: number): [number, number] => {
  const u = 1 - q;
  return [0, 1].map((k) => u * u * u * p[0][k] + 3 * u * u * q * p[1][k] + 3 * u * q * q * p[2][k] + q * q * q * p[3][k]) as [number, number];
};
export const cd = (p: number[][]) => `M${p[0][0]} ${p[0][1]} C${p[1][0]} ${p[1][1]} ${p[2][0]} ${p[2][1]} ${p[3][0]} ${p[3][1]}`;
