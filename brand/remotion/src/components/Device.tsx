import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ELZA, H, SAFE_T, clamp, cqw, easeOutBack } from "../brand";

// Machine cutout, full size, no panel (DECISIONS 64): right side under the safe top, its name under it with a light halo.
// Pops in with an overshoot (0.15-0.65 s, scale 0.55 -> 1), sways while it holds (rotate +-2.2 deg, drift +-1.4cqw, float, 3.2 s period),
// pops out over the last 300 ms.
export const DEVICE_DUR = 5.2;

export const Device: React.FC<{ img: string; label: string }> = ({ img, label }) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const pin = clamp((t - 0.15) / 0.5);
  const pout = clamp((t - (DEVICE_DUR - 0.3)) / 0.3);
  const scale = (0.55 + 0.45 * easeOutBack(pin)) * (1 - 0.45 * pout ** 2);
  const w = (2 * Math.PI * t) / 3.2;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute", right: cqw(2.5), top: SAFE_T + cqw(1), width: cqw(31), display: "grid", justifyItems: "center", gap: cqw(1.2),
          transformOrigin: "50% 100%", opacity: Math.min(1, pin * 3) * (1 - pout),
          transform: `translate(${Math.sin(w) * cqw(1.4)}px, ${Math.sin(w * 2) * cqw(0.4)}px) rotate(${Math.sin(w + 0.6) * 2.2}deg) scale(${scale})`,
        }}
      >
        <Img src={staticFile(img)} style={{ display: "block", width: "100%", height: 0.34 * H, objectFit: "contain", objectPosition: "100% 100%",
          filter: `drop-shadow(0 ${cqw(2)}px ${cqw(2.4)}px rgba(0,0,0,.28))` }} />
        <p style={{ margin: 0, font: `600 ${cqw(3.48)}px/1.1 ${ELZA}`, color: "#211b15", textAlign: "center",
          textShadow: `0 0 ${cqw(1.2)}px rgba(255,255,255,.9), 0 0 ${cqw(0.4)}px rgba(255,255,255,.9)` }}>{label}</p>
      </div>
    </AbsoluteFill>
  );
};
