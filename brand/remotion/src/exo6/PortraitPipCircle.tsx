import React from "react";
import { useCurrentFrame } from "remotion";
import { C, drift, ease, outBack, p } from "./look";

// portrait-pip-circle. Refs: drjc DYI5TbdvR3U f225 (the presenter in a circle over full-bleed footage; it pops at the cut and holds),
// G2 T18 roundels. A glass-rimmed circle (a bright 2 px rim, a thicker frosted ring, a long soft shadow) that pops 0.95 -> 1 in 5 f
// at `at` (the reference overshoots slightly: 3 %) and floats +-3 px while held. `children` = the keyed presenter, positioned by
// `inner` (left/top/width in px inside the circle) so his face sits centred.
export const PortraitPipCircle: React.FC<{
  at: number; x: number; y: number; d?: number; out?: number; children?: React.ReactNode; inner?: React.CSSProperties; bg?: string;
}> = ({ at, x, y, d = 260, out = Infinity, children, inner, bg = "linear-gradient(160deg, #f6f3ef, #dde6ed)" }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const q = p(f, at, 5, outBack), o = p(f, out, 7, ease.exit);
  const s = (0.95 + 0.05 * q) * (1 - 0.05 * o);
  return (
    <div style={{ position: "absolute", left: x, top: y + drift(f, 3, 96), width: d, height: d, transform: `scale(${s})`, opacity: Math.min(1, q * 1.5) * (1 - o) }}>
      <div style={{ position: "absolute", inset: -10, borderRadius: "50%", background: "rgba(255,255,255,.35)", backdropFilter: "blur(14px)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.9), 0 24px 50px -16px rgba(32,37,50,.45), 0 4px 10px rgba(32,37,50,.15)" }} />
      {/* a true circular mask (clip-path, not border-radius + overflow, which a composited video layer can escape: Naim saw a square
          edge of his shoulders below the ring in v6), then the rim drawn over the mask edge */}
      <div style={{ position: "absolute", inset: 0, clipPath: `circle(${d / 2}px at 50% 50%)`, background: bg }}>
        <div style={{ position: "absolute", ...inner }}>{children}</div>
      </div>
      <div style={{ position: "absolute", inset: -1, borderRadius: "50%", boxShadow: "inset 0 0 0 3px rgba(255,255,255,.96), 0 0 0 1px rgba(32,37,50,.08)", pointerEvents: "none" }} />
      {/* live tag */}
      <div style={{ position: "absolute", left: d * 0.5, bottom: -22, transform: "translateX(-50%)", padding: "8px 18px", borderRadius: 999, background: C.navy, color: "#fff",
        font: "500 26px neue-haas-grotesk-text, Arial", letterSpacing: "0.14em", whiteSpace: "nowrap" }}>DR. OSTAD</div>
    </div>
  );
};
