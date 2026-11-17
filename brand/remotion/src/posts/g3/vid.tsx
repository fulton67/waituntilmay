import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { useExoFonts } from "../../exo6/look";
import { curve, D24 } from "../../library/motion";
import UP from "../up.json";

// posts/g3/vid.tsx: Grid 3. Naim 2026-11-17 on grid 2: "canva-esque", "no glass effects", "no translation from what we do in videos into
// feed posts ... treat each post in the process of the video". So every carousel here is a short Remotion video made with the YouTube v4
// system (OstadYT.tsx + components/YT.tsx, the approved standard): the warm field with light moving behind glass, footage in white rounded
// windows (Win: 10 px white mat, radius 24, elev shadow, picture NOT graded), the 963 glass card, caps chips, his own spoken line as the
// caption (NHG Display 500, word by word), and v4's leader (blue LINE over a white under-stroke) ending in an arrowhead. Each slide is the
// frame where a scene lands; the cover is scene 1. Scenes are SCENE frames long.

export const W = 1080, H = 1350, M = 64, SCENE = 60;
export const BG0 = "#faf9f6", INK = "#202532", INK2 = "#373737", MUTE = "#8e8e8e", RULE = "#dcdcdc", BLUE = "#37a9e8", SKY = "#7cc8f2", LINE = 3, RADIUS = 24;
export const DISPLAY = '"neue-haas-grotesk-display", "Inter Tight", Arial, sans-serif';
export const TEXT = '"neue-haas-grotesk-text", Inter, Arial, sans-serif';
export const elev = "0 24px 60px rgba(29,34,48,.16)";

export const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const p = (f: number, s: number, d: number, c: (x: number) => number = curve.arrive) => (d <= 0 ? (f >= s ? 1 : 0) : c(cl((f - s) / d)));

export const head = (px: number, color = INK): React.CSSProperties => ({ font: `500 ${px}px/1.04 ${DISPLAY}`, letterSpacing: "-0.012em", color });
export const label = (px = 20, color = INK2): React.CSSProperties => ({ font: `500 ${px}px/1.1 ${DISPLAY}`, letterSpacing: "0.06em", textTransform: "uppercase", color });
export const body = (px = 26, color = INK2, w = 400): React.CSSProperties => ({ font: `${w} ${px}px/1.32 ${TEXT}`, color });

const UPS = new Set<string>(UP as string[]);
export const src = (id: string) => staticFile(`posts/src/${id}${UPS.has(id) ? "_up" : ""}.jpg`);
// natural aspect of each source (w, h); only the ratio matters
export const DIM: Record<string, [number, number]> = {
  "10782": [409, 421], "00538": [371, 465], "00259": [415, 415], "00896": [480, 600], "03071": [768, 1024], "00838": [768, 1024],
  "03611": [1024, 683], him_r22: [1080, 1920], him_r72: [1080, 1920], "01329": [1024, 1024], "06354": [768, 1024],
};
export const cover = (id: string, b: { w: number; h: number }, fx = 0.5, fy = 0.5, zoom = 1) => {
  const [iw, ih] = DIM[id];
  const s = Math.max(b.w / iw, b.h / ih) * zoom, dw = iw * s, dh = ih * s;
  const ox = (b.w - dw) * fx, oy = (b.h - dh) * fy;
  return { dw, dh, ox, oy, pt: (nx: number, ny: number) => ({ x: ox + nx * dw, y: oy + ny * dh }) };
};

// ------------------------------------------------------------------------------------------------ the field (v4 BG0 + light behind)
export const Field: React.FC = () => {
  const t = useCurrentFrame() / 24;
  const bx = 30 + 18 * Math.sin(t * 0.5), by = 26 + 14 * Math.cos(t * 0.43);
  return (
    <AbsoluteFill style={{ background: BG0 }}>
      <AbsoluteFill style={{ background: `radial-gradient(60% 45% at ${bx}% ${by}%, rgba(55,169,232,.10), transparent 70%), radial-gradient(55% 50% at ${100 - bx}% ${100 - by}%, rgba(214,226,236,.55), transparent 70%), linear-gradient(180deg, #fbfaf8, #eef1f4)` }} />
    </AbsoluteFill>
  );
};

/** v4's light inside glass: two slow blobs and a turning tint */
const GlassLife: React.FC = () => {
  const t = useCurrentFrame() / 24;
  const bx = 35 + 30 * Math.sin(t * 0.8), by = 35 + 25 * Math.cos(t * 0.69);
  return <div style={{ position: "absolute", inset: 0, background: `radial-gradient(55% 60% at ${bx}% ${by}%, rgba(55,169,232,.16), transparent 70%), radial-gradient(50% 55% at ${100 - bx}% ${100 - by}%, rgba(255,255,255,.55), transparent 70%), linear-gradient(${115 + 50 * Math.sin(t * 0.55)}deg, rgba(55,169,232,.08), rgba(255,255,255,0) 55%, rgba(55,169,232,.06))` }} />;
};

/** the 963 glass card (YT.tsx glass) with the light moving inside; fades up and rises (v4 life) */
export const Glass: React.FC<{ at: number; x: number; y: number; w: number; h?: number; pad?: number; children: React.ReactNode; tone?: "light" | "clear"; style?: React.CSSProperties }> = ({ at, x, y, w, h, pad = 36, children, tone = "light", style }) => {
  const f = useCurrentFrame();
  const q = p(f, at, 16);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: RADIUS, overflow: "hidden", opacity: q, transform: `translateY(${(1 - q) * 20}px)`,
      background: tone === "light" ? "rgba(236,238,240,.72)" : "rgba(255,255,255,.42)", backdropFilter: "blur(22px) saturate(1.2)", WebkitBackdropFilter: "blur(22px) saturate(1.2)",
      boxShadow: "inset 0 0 0 0.5px rgba(188,188,188,.7), inset 0 1px 0 rgba(255,255,255,.9), 0 18px 44px -14px rgba(32,37,50,.20)", ...style }}>
      <GlassLife />
      <div style={{ position: "relative", padding: pad }}>{children}</div>
    </div>
  );
};

/** v4 Win: a white rounded window around a picture; lifts in; picture shown as shot (no grade) with a slow push */
export const Win: React.FC<{ id: string; at: number; x: number; y: number; w: number; h: number; fx?: number; fy?: number; zoom?: number; children?: React.ReactNode; mat?: number }> = ({ id, at, x, y, w, h, fx = 0.5, fy = 0.5, zoom = 1, children, mat = 10 }) => {
  const f = useCurrentFrame();
  const q = p(f, at, 14);
  const c = cover(id, { w, h }, fx, fy, zoom);
  return (
    <div style={{ position: "absolute", left: x - mat, top: y - mat, width: w + 2 * mat, height: h + 2 * mat, borderRadius: RADIUS + mat, background: "#fff", boxShadow: elev, opacity: q, transform: `translateY(${(1 - q) * 18}px) scale(${0.985 + 0.015 * q})` }}>
      <div style={{ position: "absolute", left: mat, top: mat, width: w, height: h, borderRadius: RADIUS, overflow: "hidden", background: "#d9dde2" }}>
        <Img src={src(id)} style={{ position: "absolute", left: c.ox, top: c.oy, width: c.dw, height: c.dh }} />
        {children}
      </div>
    </div>
  );
};

/** v4 Tag: pale chip, hairline, caps label; the blue disc marks the live topic */
export const Tag: React.FC<{ at: number; text: string; x: number; y: number; live?: boolean; onDark?: boolean }> = ({ at, text, x, y, live = true, onDark }) => {
  const f = useCurrentFrame();
  const q = p(f, at, 14);
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: q, display: "flex", alignItems: "center", gap: 12, padding: "11px 18px 11px 14px", borderRadius: 999,
      background: onDark ? "rgba(255,255,255,.22)" : "rgba(250,249,246,.94)", backdropFilter: "blur(12px)", boxShadow: "inset 0 0 0 0.65px #8e8e8e", whiteSpace: "nowrap" }}>
      {live ? <div style={{ width: 12, height: 12, borderRadius: 99, background: BLUE }} /> : null}
      <span style={label(19, onDark ? "#fff" : INK2)}>{text}</span>
    </div>
  );
};

/** his spoken line, set like the v4 captions: each word cuts on (2 f apart), keywords in blue */
export const Said: React.FC<{ at: number; text: string; x: number; y: number; w: number; px?: number; keys?: string[]; color?: string }> = ({ at, text, x, y, w, px = 46, keys = [], color = INK }) => {
  const f = useCurrentFrame();
  const K = new Set(keys.map((k) => k.toLowerCase()));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, ...head(px, color), lineHeight: 1.18 }}>
      {text.split(" ").map((wd, i) => (
        <span key={i} style={{ opacity: f >= at + i * 2 ? 1 : 0, color: K.has(wd.toLowerCase().replace(/[^a-z0-9]/g, "")) ? BLUE : undefined }}>{(i ? " " : "") + wd}</span>
      ))}
    </div>
  );
};

/** v4's leader (blue LINE over a white under-stroke) drawn tail -> tip, ending in an open arrowhead on its target */
export const Arrow: React.FC<{ at: number; pts: { x: number; y: number }[]; d?: number; curveIt?: boolean }> = ({ at, pts, d = 14, curveIt }) => {
  const f = useCurrentFrame();
  const q = p(f, at, d, curve.sweep);
  if (q <= 0) return null;
  const A = pts[0], B = pts[pts.length - 1];
  const path = curveIt && pts.length === 3 ? `M${A.x} ${A.y} Q${pts[1].x} ${pts[1].y} ${B.x} ${B.y}` : pts.map((pt, i) => `${i ? "L" : "M"}${pt.x} ${pt.y}`).join(" ");
  const P = pts[pts.length - 2];
  const ang = Math.atan2(B.y - P.y, B.x - P.x), hl = 16, sp = 0.5;
  const hd = `M${B.x - hl * Math.cos(ang - sp)} ${B.y - hl * Math.sin(ang - sp)} L${B.x} ${B.y} L${B.x - hl * Math.cos(ang + sp)} ${B.y - hl * Math.sin(ang + sp)}`;
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
      <path d={path} fill="none" stroke="#fff" strokeWidth={LINE + 4} strokeLinecap="round" pathLength={1} strokeDasharray={`${q} 1`} opacity={0.9} />
      <path d={path} fill="none" stroke={BLUE} strokeWidth={LINE} strokeLinecap="round" pathLength={1} strokeDasharray={`${q} 1`} />
      <g opacity={q > 0.97 ? 1 : 0}>
        <path d={hd} fill="none" stroke="#fff" strokeWidth={LINE + 4} strokeLinecap="round" strokeLinejoin="round" />
        <path data-arrowhead d={hd} fill="none" stroke={BLUE} strokeWidth={LINE} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
};

/** the under-eye reel's magnifier: a white-ringed circle showing a region of a picture at 2x, popped beside it */
export const Loupe: React.FC<{ id: string; at: number; cx: number; cy: number; r: number; win: { w: number; h: number; fx?: number; fy?: number; zoom?: number }; focus: { x: number; y: number }; mag?: number; caption?: string }> = ({ id, at, cx, cy, r, win, focus, mag = 2.2, caption }) => {
  const f = useCurrentFrame();
  const q = p(f, at, 14);
  const c = cover(id, win, win.fx ?? 0.5, win.fy ?? 0.5, win.zoom ?? 1);
  const s = mag;
  return (
    <div style={{ position: "absolute", left: cx - r, top: cy - r, width: 2 * r, height: 2 * r, opacity: q, transform: `scale(${0.94 + 0.06 * q})` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 999, overflow: "hidden", boxShadow: `0 0 0 6px #fff, ${elev}`, background: "#ddd" }}>
        <Img src={src(id)} style={{ position: "absolute", width: c.dw * s, height: c.dh * s, left: r - (focus.x - c.ox) * s, top: r - (focus.y - c.oy) * s }} />
      </div>
      {caption ? <div style={{ position: "absolute", top: 2 * r + 20, left: -40, width: 2 * r + 80, textAlign: "center", ...head(26, INK) }}>{caption}</div> : null}
    </div>
  );
};

/** blue check disc (v4 "During your visit" list) */
export const Check: React.FC<{ on: number }> = ({ on }) => (
  <div style={{ width: 34, height: 34, borderRadius: 99, flexShrink: 0, background: on > 0 ? BLUE : "transparent", boxShadow: on > 0 ? "none" : `inset 0 0 0 2px ${RULE}`, display: "grid", placeItems: "center" }}>
    <svg width={18} height={18} viewBox="0 0 18 18"><path d="M3.5 9.5 L7.5 13 L14.5 5" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${on} 1`} /></svg>
  </div>
);

/** a quiet frame mark top-left (the handle) and the slide count top-right: what the reel's chips carry */
export const Frame: React.FC<{ n: number; of: number; dark?: boolean }> = ({ n, of, dark }) => (
  <>
    <div style={{ position: "absolute", left: M, bottom: 40, ...label(17, dark ? "rgba(255,255,255,.8)" : MUTE) }}>@drarielostad</div>
    <div style={{ position: "absolute", right: M, bottom: 40, ...label(17, dark ? "rgba(255,255,255,.8)" : MUTE) }}>{String(n).padStart(2, "0")} / {String(of).padStart(2, "0")}</div>
  </>
);

/** fonts gate shared by every Grid 3 post */
export const useG3 = () => { useExoFonts(); };
export { D24, curve };
