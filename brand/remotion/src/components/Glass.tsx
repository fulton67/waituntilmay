import { cqw } from "../brand";

// The liquid-glass material shared by the name card and the title (DECISIONS 66): blurred, slightly warped footage behind,
// a faint white lift, a thin bright rim with a brighter top-left edge. Put inside a positioned box with overflow hidden + isolation.
export const GlassFilter: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
      <feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves={1} seed={17} result="turbulence" />
      <feGaussianBlur in="turbulence" stdDeviation={3} result="softMap" />
      <feDisplacementMap in="SourceGraphic" in2="softMap" scale={200} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </svg>
);

export const GlassLayers: React.FC = () => {
  const rim = `inset 0 0 0 ${cqw(0.19)}px rgba(255,255,255,.38), inset ${cqw(0.35)}px ${cqw(0.35)}px ${cqw(0.3)}px -${cqw(0.1)}px rgba(255,255,255,.35), inset -${cqw(0.2)}px -${cqw(0.2)}px ${cqw(0.3)}px -${cqw(0.1)}px rgba(255,255,255,.18)`;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, zIndex: -3, backdropFilter: `blur(${cqw(1.6)}px) saturate(1.15)`, filter: "url(#glass-distortion)" }} />
      <div style={{ position: "absolute", inset: 0, zIndex: -2, borderRadius: "inherit", boxShadow: rim,
        background: "linear-gradient(160deg, rgba(255,255,255,.16), rgba(255,255,255,.06) 55%, rgba(255,255,255,.1))" }} />
    </>
  );
};
