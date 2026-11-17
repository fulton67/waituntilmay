import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { C, SERIF, SANS, cl, glass } from "../exo6/look";
import { curve, D24 } from "../library/motion";
import up from "./up.json";

// posts/kit.tsx: shared pieces for the feed posts (brand/POSTS.md). Posts are built like the reels: a timed composition at 24 fps
// on the MOTION.md tokens; the stills are frames of that motion (the cover = the settled last frame, carousel slides = the moments the
// motion lands). Look = exo6/look.ts (kit tokens: cream #f2efed, ink #211b15; Cormorant Garamond 500 + NHG Text; one blue for arrows).
// Photos are NEVER graded: no filter, no LUT, no tint, no overlay colour on the picture (Naim, 2026-11-17: the kit treatment read "tinted blue").

export const W = 1080, H = 1350, M = 98; // 4:5; margin 9.1 % W (MOTION.md 5.3)
export const FPS = 24;

/** clinic-library preview (or its Flora upscale when present in up.json) */
export const photo = (id: string) => staticFile(`posts/src/${id}${(up as string[]).includes(id) ? "_up" : ""}.jpg`);

export const p = (frame: number, s: number, d: number, c: (x: number) => number = curve.arrive) =>
  d <= 0 ? (frame >= s ? 1 : 0) : c(cl((frame - s) / d));

/** an image covering a box, with a focus point; `pt(nx, ny)` maps image-normalised coords to frame px, so marks land on the thing */
export type Box = { x: number; y: number; w: number; h: number };
export const cover = (iw: number, ih: number, b: Box, fx = 0.5, fy = 0.5, zoom = 1) => {
  const s = Math.max(b.w / iw, b.h / ih) * zoom;
  const dw = iw * s, dh = ih * s;
  const ox = b.x + (b.w - dw) * fx, oy = b.y + (b.h - dh) * fy;
  return { dw, dh, ox, oy, pt: (nx: number, ny: number) => ({ x: ox + nx * dw, y: oy + ny * dh }) };
};

/** plate, then picture (MOTION.md 3: `plate` 18 f + 18 f); the picture itself is untouched */
export const Photo: React.FC<{ id: string; iw: number; ih: number; box: Box; fx?: number; fy?: number; zoom?: number; at?: number; r?: number }> = ({
  id, iw, ih, box, fx = 0.5, fy = 0.5, zoom = 1, at = 0, r = 0,
}) => {
  const frame = useCurrentFrame();
  const c = cover(iw, ih, box, fx, fy, zoom);
  const plate = p(frame, at, D24.plate, curve.plate), pic = p(frame, at + D24.plate, D24.plate, curve.plate);
  return (
    <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, overflow: "hidden", borderRadius: r, background: `rgba(195,189,187,${0.55 * plate})` }}>
      <Img src={photo(id)} style={{ position: "absolute", left: c.ox - box.x, top: c.oy - box.y, width: c.dw, height: c.dh, opacity: pic }} />
    </div>
  );
};

export const Room: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg = C.cream }) => (
  <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>{children}</AbsoluteFill>
);

/** fade + 16 px rise on `arrive` (14 f) */
export const Rise: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties; d?: number }> = ({ at, children, style, d = D24.arrive }) => {
  const frame = useCurrentFrame();
  const q = p(frame, at, d);
  return <div style={{ position: "absolute", opacity: q, transform: `translateY(${(1 - q) * 16}px)`, ...style }}>{children}</div>;
};

/** the small corner lines every post shares: handle bottom-left, source bottom-right (sources are on the frame, MOTION.md rule 10) */
export const Foot: React.FC<{ source: string; at?: number; dark?: boolean }> = ({ source, at = 0, dark = false }) => {
  const frame = useCurrentFrame();
  const q = p(frame, at, D24.arrive);
  const col = dark ? "rgba(255,255,255,.82)" : C.ink2;
  const s: React.CSSProperties = { position: "absolute", bottom: 46, fontFamily: SANS, fontWeight: 500, fontSize: 19, letterSpacing: "0.08em", color: col, opacity: q, textTransform: "uppercase" };
  return (
    <>
      <div style={{ ...s, left: M }}>@drarielostad</div>
      <div style={{ ...s, right: M, maxWidth: 560, textAlign: "right", lineHeight: 1.35 }}>{source}</div>
    </>
  );
};

export const Eyebrow: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = C.ink2 }) => (
  <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 22, letterSpacing: "0.16em", textTransform: "uppercase", color }}>{children}</div>
);
export const Display: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({ children, size = 84, color = C.ink, style }) => (
  <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: size, lineHeight: 1.0, letterSpacing: "-0.015em", color, ...style }}>{children}</div>
);
export const Text: React.FC<{ children: React.ReactNode; size?: number; color?: string; w?: number; style?: React.CSSProperties }> = ({ children, size = 30, color = C.ink, w = 400, style }) => (
  <div style={{ fontFamily: SANS, fontWeight: w, fontSize: size, lineHeight: 1.3, color, ...style }}>{children}</div>
);

/** calm glass chip (DECISIONS 12: frost + hairline, no tint/gloss) */
export const Chip: React.FC<{ at: number; x: number; y: number; children: React.ReactNode; anchor?: "l" | "r" | "c" }> = ({ at, x, y, children, anchor = "l" }) => {
  const frame = useCurrentFrame();
  const q = p(frame, at, D24.arrive);
  const tx = anchor === "l" ? "0%" : anchor === "r" ? "-100%" : "-50%";
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(${tx}, calc(-50% + ${(1 - q) * 16}px))`, opacity: q, ...glass(18), padding: "14px 22px", fontFamily: SANS, fontWeight: 500, fontSize: 26, color: C.ink, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
};

/** a hand-drawn-free ring: an ellipse stroke that draws on `sweep` (DrawnCircle timing, 12 f), lands on the thing it marks */
export const Ring: React.FC<{ at: number; cx: number; cy: number; rx: number; ry: number; color?: string; sw?: number; d?: number }> = ({ at, cx, cy, rx, ry, color = C.blue, sw = 5, d = 12 }) => {
  const frame = useCurrentFrame();
  const q = p(frame, at, d, curve.sweep);
  if (q <= 0) return null;
  const L = 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2);
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - q)} transform={`rotate(-90 ${cx} ${cy})`}
        style={{ filter: "drop-shadow(0 2px 4px rgba(32,37,50,.25))" }} />
    </svg>
  );
};

/** highlighter block behind a phrase (MOTION.md 3: #c4e4f8, square corners, `sweep` 16 f, text stays ink) */
export const Hi: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const q = p(frame, at, D24.highlighter, curve.sweep);
  return (
    <span style={{ backgroundImage: "linear-gradient(#c4e4f8, #c4e4f8)", backgroundRepeat: "no-repeat", backgroundSize: `${q * 100}% 88%`, backgroundPosition: "0 60%", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>
      {children}
    </span>
  );
};
