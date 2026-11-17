import React from "react";
import { Img, useCurrentFrame } from "remotion";
import { C, drift, ease, p } from "./look";
import { src } from "./parts";

// A round masked window onto a picture, framed by focus point (image px) and zoom, so a crop is a number pair, not a new file.
// Glass rim (2 px bright rim + a soft frosted ring + a long shadow). Arrives on `arrive` 14 f (0.9 -> 1, 10 px rise), drifts
// for its whole life (scale 1 -> 1 + push over `life` frames and a few px out of phase via `phase`), exits 7 f. `rim` (0..1) turns
// the rim blue when a callout lands on it. Used by flow-diagram-build (B03) and donut-ring-fill (B13) chips.
export const RoundWindow: React.FC<{
  at: number; file: string; iw: number; ih: number; fx: number; fy: number; z: number; x: number; y: number; d: number;
  out?: number; rim?: number; phase?: number; push?: number; life?: number; label?: React.ReactNode;
}> = ({ at, file, iw, ih, fx, fy, z, x, y, d, out = Infinity, rim = 0, phase = 0, push = 0.015, life = 96, label }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const q = p(f, at, 14, ease.arrive), o = p(f, out, 7, ease.exit);
  const u = ease.blank(Math.min(1, (f - at) / life));
  const zz = z * (1 + push * u);
  const w = iw * zz, h = ih * zz;
  return (
    <div style={{ position: "absolute", left: x + drift(f, 6, 140, phase), top: y + (1 - q) * 10 + drift(f, 5, 170, phase + 1.3) + o * 7, width: d, height: d,
      opacity: q * (1 - o), transform: `scale(${0.9 + 0.1 * q})` }}>
      <div style={{ position: "absolute", inset: -8, borderRadius: "50%", background: "rgba(255,255,255,.42)", backdropFilter: "blur(12px)",
        boxShadow: `inset 0 1px 0 rgba(255,255,255,.95), 0 26px 46px -18px rgba(32,37,50,.42), 0 3px 8px rgba(32,37,50,.12), 0 0 0 ${2 * rim}px rgba(55,169,232,${0.9 * rim})` }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden", background: C.paper }}>
        <Img src={src(file)} style={{ position: "absolute", width: w, height: h, left: d / 2 - fx * zz, top: d / 2 - fy * zz, maxWidth: "none" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 32% 24%, rgba(255,255,255,.28), rgba(255,255,255,0) 46%)" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", boxShadow: `inset 0 0 0 2px rgba(255,255,255,.95), inset 0 0 0 ${3 * rim}px rgba(55,169,232,${rim})` }} />
      </div>
      {label}
    </div>
  );
};
