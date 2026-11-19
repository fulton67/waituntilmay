// REAL OBJECTS (shared device; memory ostad-real-objects): when he names an instrument, device or product, the REAL object floats in as a
// clean cut-out: background removed (rembg/SAM, locally), a soft contact shadow, lit to match the room, a short label, never AI-generated.
// It floats in, drifts slightly, holds >= 2 s (enforced: MIN_HOLD), and leaves. The caller places it clear of faces (head track / face_clear).
// Optional `tip`: a round close-up loupe of the business end (a pre-cropped PNG), with its own short label, popping in at tip.s.
// A file whose name contains "PLACEHOLDER" is drawn with a dashed frame and the word PLACEHOLDER (a SHOT_REQUESTS.md item, never shipped as real).
// Used by: src/undereye/ReelV5.tsx (cannula vs needle), src/oct14 (Evolysse Form / Smooth). Owner: the under-eye agent; API agreed with Oct 14.
import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";

export const MIN_HOLD = 48; // frames fully in (24 fps: 2 s)
const IN = 14, OUT = 10;
const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const FONTX = '"neue-haas-grotesk-display", "Inter Tight", Arial, sans-serif';
const INK = "#1d2230";

export type RealObjectProps = {
  src: string; // relative to public/, a transparent cut-out PNG
  label: string;
  s: number; // composition frame it starts entering
  out: number; // composition frame it starts leaving (pushed later if the hold would be < MIN_HOLD)
  x: number; y: number; w: number; // the object box, top-left, px; the height follows the PNG (pass aspect = w/h)
  aspect?: number; // PNG width / height (default 4)
  enter?: "up" | "left" | "right" | "scale";
  drift?: number; // px of slow drift while held
  shadow?: boolean; // soft contact shadow under the object
  light?: string; // CSS filter that matches the cut-out to the room light (graphics only, never the footage)
  labelSide?: "below" | "above";
  rotate?: number; // deg
  labelPx?: number; // label font size for the object and tip pills (default 25); padding scales with it
  tip?: { src: string; label: string; s?: number; d?: number; x?: number; y?: number; at?: [number, number] }; // loupe: diameter d, top-left x/y relative to the object box; at = the tip point on the object (fractions) for the leader line
};

export const holdOut = (s: number, out: number) => Math.max(out, s + IN + MIN_HOLD);

export const RealObject: React.FC<RealObjectProps> = ({ src, label, s, out, x, y, w, aspect = 4, enter = "up", drift = 6, shadow = true,
  light = "sepia(.12) saturate(.92) brightness(.98) contrast(1.02)", labelSide = "below", rotate = 0, tip, labelPx = 25 }) => {
  const f = useCurrentFrame();
  const o2 = holdOut(s, out);
  if (f < s || f > o2 + OUT) return null;
  const a = ease((f - s) / IN), z = ease((f - o2) / OUT);
  const op = a * (1 - z);
  const dx0 = enter === "left" ? -140 : enter === "right" ? 140 : 0, dy0 = enter === "up" ? 90 : 0, sc0 = enter === "scale" ? 0.86 : 1;
  const t = (f - s) / 24;
  const dx = dx0 * (1 - a) + drift * Math.sin(t * 0.9), dy = dy0 * (1 - a) - 18 * z + drift * 0.6 * Math.sin(t * 0.7 + 1.3);
  const sc = sc0 + (1 - sc0) * a;
  const h = w / aspect;
  const ph = /PLACEHOLDER/i.test(src);
  const pill = (text: string, o = 1): React.CSSProperties => ({
    display: "inline-block", padding: `${Math.round(9 * labelPx / 25)}px ${Math.round(16 * labelPx / 25)}px ${Math.round(8 * labelPx / 25)}px`, borderRadius: 999, background: "rgba(255,255,255,.9)", color: INK, opacity: o,
    font: `600 ${labelPx}px/1 ${FONTX}`, letterSpacing: "0.01em", boxShadow: "0 6px 20px rgba(8,12,22,.22)", whiteSpace: "nowrap" });
  const lab = <div style={{ position: "absolute", left: 0, width: w, textAlign: "center", ...(labelSide === "below" ? { top: h + 22 } : { top: -(labelPx * 1.7 + 22) }) }}><span style={pill(label)}>{label}</span></div>;
  let loupe: React.ReactNode = null;
  if (tip) {
    const ts = tip.s ?? s + IN, d = tip.d ?? 190, tx = tip.x ?? w - d / 2, ty = tip.y ?? -d - 30;
    const ta = ease((f - ts) / 10);
    if (f >= ts) {
      const [ax, ay] = tip.at ?? [1, 0.5];
      loupe = <>
        <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: ta }}>
          <line x1={ax * w} y1={ay * h} x2={tx + d / 2} y2={ty + d / 2} stroke="rgba(255,255,255,.9)" strokeWidth={2.5} strokeDasharray="2 6" strokeLinecap="round" />
          <circle cx={ax * w} cy={ay * h} r={6} fill="none" stroke="rgba(255,255,255,.95)" strokeWidth={2.5} />
        </svg>
        <div style={{ position: "absolute", left: tx, top: ty, width: d, height: d, borderRadius: "50%", overflow: "hidden", background: "#f4f1ec",
          border: "4px solid rgba(255,255,255,.95)", boxShadow: "0 14px 34px rgba(8,12,22,.32)", transform: `scale(${0.7 + 0.3 * ta})`, opacity: ta }}>
          <Img src={staticFile(tip.src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: light }} />
        </div>
        <div style={{ position: "absolute", left: tx - 60, width: d + 120, top: ty + d + Math.round(10 * labelPx / 25), textAlign: "center", opacity: ta }}><span style={pill(tip.label)}>{tip.label}</span></div>
      </>;
    }
  }
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: op, transform: `translate(${dx}px, ${dy}px) scale(${sc}) rotate(${rotate}deg)`, transformOrigin: "50% 100%" }}>
      {shadow && <div style={{ position: "absolute", left: w * 0.08, width: w * 0.84, top: h * 0.86, height: Math.max(14, h * 0.22), borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(10,8,6,.42) 0%, rgba(10,8,6,.18) 45%, rgba(10,8,6,0) 72%)", filter: "blur(6px)" }} />}
      <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: 0, width: w, height: h, objectFit: "contain", filter: `${light} drop-shadow(0 2px 3px rgba(0,0,0,.25))` }} />
      {ph && <div style={{ position: "absolute", inset: -6, border: "3px dashed rgba(255,80,80,.95)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
        font: `700 22px/1 ${FONTX}`, letterSpacing: "0.12em", color: "rgba(255,80,80,.95)" }}>PLACEHOLDER</div>}
      {lab}
      {loupe}
    </div>
  );
};
