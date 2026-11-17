import React from "react";
import { useCurrentFrame } from "remotion";
import { C, caps, drift, ease, p } from "./look";
import { Glass } from "./parts";

// topic-glass-panel: the rosacea METHOD (a frosted panel that holds one topic-specific mechanism over the presenter, ROS f795-862),
// rebuilt topic-neutral and with a new look: no x button, no tube. A v6 glass panel with a header chip and a hairline, scaling
// 0.97 -> 1 on `arrive` (14 f), drifting +-4 px on a 3.2 s period for its whole life, leaving on `exit` (7 f, 7 px fall).
// Children render in the panel's own px space (w x h).
export const TopicGlassPanel: React.FC<{
  start: number; chip: string; chipAt?: number; x: number; y: number; w: number; h: number; exitAt?: number; children?: React.ReactNode; footer?: React.ReactNode;
}> = ({ start, chip, chipAt, x, y, w, h, exitAt = Infinity, children, footer }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const t = f - start;
  const q = p(f, start, 10, ease.arrive), o = p(f, exitAt, 7, ease.exit);
  const cq = p(f, chipAt ?? start + 2, 5, ease.arrive);
  return (
    <div style={{ position: "absolute", left: x, top: y + drift(f, 4, 77) + o * 7, width: w, height: h, opacity: q * (1 - o), transform: `scale(${0.97 + 0.03 * q})` }}>
      <Glass r={30} t={t} style={{ inset: 0 }}>
        <div style={{ position: "absolute", left: 30, top: 26, display: "flex", alignItems: "center", gap: 12, opacity: cq, transform: `scale(${0.95 + 0.05 * cq})`, transformOrigin: "0 50%" }}>
          <div style={{ padding: "9px 18px", borderRadius: 999, background: C.navy, ...caps(26, "#fff"), letterSpacing: "0.18em" }}>{chip}</div>
        </div>
        <div style={{ position: "absolute", left: 30, right: 30, top: 86, height: 1.5, background: C.rule }} />
        <div style={{ position: "absolute", left: 0, top: 80, width: w, height: h - 80 }}>{children}</div>
        {footer}
      </Glass>
    </div>
  );
};
