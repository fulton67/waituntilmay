import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CAP_TOP, ELZA, H, MARGIN, clamp, cqw, easeIn, easeOut } from "../brand";

// Liquid-glass name card after the client's "Derek Yeung" reference (DECISIONS 66): clear glass sized to its text, blurred and slightly
// warped footage behind it, faint white lift, thin bright rim; name large in Elza Regular, role smaller in Elza Bold, white.
// Motion: rises in (600 ms), a soft light sweeps across the glass once, holds, fades out (300 ms). Bottom 2.4cqw above the caption line.
export const NAME_CARD_DUR = 4.2;

export const NameCard: React.FC<{ name?: string; role?: string }> = ({ name = "Dr. Ariel Ostad", role = "Triple Board-Certified Dermatologist" }) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const pin = easeOut(clamp((t - 0.2) / 0.6));
  const pout = easeIn(clamp((t - (NAME_CARD_DUR - 0.3)) / 0.3));
  const sweep = clamp((t - 0.55) / 0.9);
  const rim = `inset 0 0 0 ${cqw(0.19)}px rgba(255,255,255,.38), inset ${cqw(0.35)}px ${cqw(0.35)}px ${cqw(0.3)}px -${cqw(0.1)}px rgba(255,255,255,.35), inset -${cqw(0.2)}px -${cqw(0.2)}px ${cqw(0.3)}px -${cqw(0.1)}px rgba(255,255,255,.18)`;
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
          <feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves={1} seed={17} result="turbulence" />
          <feGaussianBlur in="turbulence" stdDeviation={3} result="softMap" />
          <feDisplacementMap in="SourceGraphic" in2="softMap" scale={200} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div
        style={{
          position: "absolute", left: MARGIN, bottom: (1 - CAP_TOP) * H + cqw(2.4), opacity: pin * (1 - pout), transform: `translateY(${(1 - pin) * cqw(2.4)}px)`,
          padding: `${cqw(3.4)}px ${cqw(5.2)}px ${cqw(3.6)}px`, borderRadius: cqw(4.4), overflow: "hidden", isolation: "isolate", color: "#fff",
          textShadow: `0 ${cqw(0.15)}px ${cqw(0.6)}px rgba(0,0,0,.25)`, display: "grid", gap: cqw(1.5),
        }}
      >
        <div style={{ position: "absolute", inset: 0, zIndex: -3, backdropFilter: `blur(${cqw(1.6)}px) saturate(1.15)`, filter: "url(#glass-distortion)" }} />
        <div style={{ position: "absolute", inset: 0, zIndex: -2, borderRadius: "inherit", boxShadow: rim,
          background: "linear-gradient(160deg, rgba(255,255,255,.16), rgba(255,255,255,.06) 55%, rgba(255,255,255,.1))" }} />
        <div style={{ position: "absolute", inset: 0, zIndex: -1, opacity: sweep > 0 && sweep < 1 ? 1 : 0,
          background: `linear-gradient(105deg, transparent ${sweep * 140 - 40}%, rgba(255,255,255,.22) ${sweep * 140 - 25}%, transparent ${sweep * 140 - 10}%)` }} />
        <p style={{ margin: 0, font: `400 ${cqw(5.6)}px/1.05 ${ELZA}`, letterSpacing: "-0.01em" }}>{name}</p>
        <p style={{ margin: 0, font: `700 ${cqw(3.6)}px/1.1 ${ELZA}` }}>{role}</p>
      </div>
    </AbsoluteFill>
  );
};
