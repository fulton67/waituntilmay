import React from "react";
import { useCurrentFrame } from "remotion";
import { ease, p } from "./look";

// region-light-on-model. Ref: ig_DdrkdrYv-yW f600-660 (one part of a real model lights up; the tint fades on in ~6 f and holds).
// Used in field-through-skull (B17), reusable on any picture: a light that comes from INSIDE the model, built from three layers:
// a multiply tint (colours the white anatomy without washing it), a screen glow (the light itself) and a tight hot core. `pulse`
// (0..1) lets a rhythm breathe it +-0.08. No drawn anatomy: it lights what the picture already shows.
export const RegionLightOnModel: React.FC<{
  at: number; x: number; y: number; rx: number; ry: number; rotate?: number; pulse?: number; color?: string; out?: number;
}> = ({ at, x, y, rx, ry, rotate = 0, pulse = 0, color = "55,169,232", out = Infinity }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const q = p(f, at, 6, ease.arrive) * (1 - p(f, out, 7, ease.exit));
  const k = q * (0.55 + 0.08 * pulse) / 0.55;
  const box: React.CSSProperties = { position: "absolute", left: x - rx * 1.6, top: y - ry * 1.6, width: rx * 3.2, height: ry * 3.2, transform: `rotate(${rotate}deg)`, pointerEvents: "none" };
  return (
    <>
      <div style={{ ...box, mixBlendMode: "multiply", opacity: 0.55 * k, background: `radial-gradient(ellipse 50% 50% at 50% 50%, rgba(${color},1) 0%, rgba(${color},.55) 38%, rgba(${color},0) 70%)` }} />
      <div style={{ ...box, mixBlendMode: "screen", opacity: 0.7 * k, background: "radial-gradient(ellipse 45% 45% at 50% 50%, rgba(190,232,255,.9), rgba(190,232,255,0) 70%)" }} />
      <div style={{ ...box, opacity: 0.5 * k, filter: "blur(4px)", background: "radial-gradient(ellipse 16% 14% at 50% 50%, rgba(255,255,255,.95), rgba(255,255,255,0) 100%)" }} />
    </>
  );
};
