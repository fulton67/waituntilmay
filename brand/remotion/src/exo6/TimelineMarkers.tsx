import React from "react";
import { useCurrentFrame } from "remotion";
import { Arrow } from "../devices/Arrow";
import { C, caps, cl, ease, p, text } from "./look";

// timeline-markers (+ arrow-marker-tick). Refs: Are.na 16463981 (a timeline with markers and time labels), WZ f940/944 (marker pops
// in 1 f, pairs 4 f apart). A hairline (2 px, soft shadow) draws L->R in 14 f on `sweep` from `lineAt`; each marker is a
// devices/Arrow marker-tick that pops in 1 f at its frame, with its label; a segment label scale-pops (5 f) between two markers;
// once the last marker is in, a soft light sweep (a gradient, never a dot) travels the line once (`glowFrames`), so it moves while
// held. Works on photos (`onDark` = white ink with a shadow) or on the canvas.
export type Marker = { at: number; u: number; label: string };

export const TimelineMarkers: React.FC<{
  lineAt: number; x0: number; x1: number; y: number; markers: Marker[]; segment?: { at: number; u0: number; u1: number; label: string }; end: number; onDark?: boolean; glowFrames?: number;
}> = ({ lineAt, x0, x1, y, markers, segment, end, onDark = true, glowFrames = 19 }) => {
  const f = useCurrentFrame();
  if (f < lineAt) return null;
  const draw = p(f, lineAt, 14, ease.sweep);
  const out = p(f, end - 7, 7, ease.exit);
  const ink = onDark ? "#ffffff" : C.ink;
  const shadow = onDark ? "0 1px 10px rgba(0,0,0,.45)" : "none";
  const lastAt = Math.max(...markers.map((m) => m.at));
  const g = f >= lastAt ? cl((f - lastAt) / glowFrames) : -1;
  const L = x1 - x0;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
      <div style={{ position: "absolute", left: x0, top: y - 1, width: L * draw, height: 2.5, borderRadius: 2, background: ink, boxShadow: onDark ? "0 1px 8px rgba(0,0,0,.35)" : "none" }} />
      {g >= 0 && g < 1 && (
        <div style={{ position: "absolute", left: x0 + ease.sweep(g) * L - 120, top: y - 14, width: 240, height: 28, borderRadius: 14,
          background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(159,214,245,.95), rgba(159,214,245,0) 70%)", mixBlendMode: "screen" }} />
      )}
      {markers.map((m, i) => {
        const mx = x0 + m.u * L;
        const on = f >= m.at;
        return (
          <React.Fragment key={i}>
            <Arrow variant="marker-tick" from={{ x: mx, y: y - 46 }} to={{ x: mx, y: y - 8 }} start={m.at} end={end} color={i === 1 ? C.sky : ink} />
            {on && <div style={{ position: "absolute", left: mx, top: y + 18, transform: "translateX(-50%)", ...caps(17, ink), textShadow: shadow, whiteSpace: "nowrap" }}>{m.label}</div>}
          </React.Fragment>
        );
      })}
      {segment && f >= segment.at && (() => {
        const q = p(f, segment.at, 5, ease.arrive);
        const sx = x0 + ((segment.u0 + segment.u1) / 2) * L;
        return (
          <div style={{ position: "absolute", left: sx, top: y - 104, transform: `translateX(-50%) scale(${0.95 + 0.05 * q})`, opacity: q, padding: "10px 18px", borderRadius: 999,
            background: "rgba(255,255,255,.2)", backdropFilter: "blur(14px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.55), inset 0 0 0 1px rgba(255,255,255,.3)", ...text(22, 500, ink), textShadow: shadow, whiteSpace: "nowrap" }}>
            {segment.label}
          </div>
        );
      })()}
    </div>
  );
};
