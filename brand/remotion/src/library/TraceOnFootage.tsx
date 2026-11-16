import React from "react";
import { Img, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY, MUTE } from "../components/YT";
import { D24, f, onset, prog } from "./motion";

// L03 mechanism trace / L07 dim-the-rest annotation (research/ostad/style/ANIMATION_LIBRARY.md). Markup on a real image only: the Flora
// glass head, real practice footage or BTL film (DECISIONS 14d rule 6; never on his face). The path draws on `sweep` (14 f at 24 fps from
// the word's onset + 1 f; Evident B03 trace); the target ring settles in 5 f on `arrive` (no overshoot); then a hairline leader draws to
// the label, which types about 1 character per frame. With `dim`, everything outside `box` sits under a navy scrim (0.33-0.5) that eases
// in on `sweep` over 12 f, and a 1 px white box draws round the subject (Evident Shorts G4 T6 / G3 T12).
export const TraceOnFootage: React.FC<{
  src: string; at: number; path?: string; ring?: { x: number; y: number; r?: number }; label?: string; labelAt?: { x: number; y: number };
  box?: { x: number; y: number; w: number; h: number }; dim?: number; color?: string; labelColor?: string; credit?: string;
}> = ({ src, at, path, ring, label, labelAt, box, dim = 0, color = "#37a9e8", labelColor = "#1d2230", credit }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t0 = onset(at, fps);
  const pPath = prog(frame, t0, f(14, fps), "sweep");
  const ringStart = t0 + f(14, fps);
  const pRing = prog(frame, ringStart, f(D24.ring, fps), "arrive");
  const leadStart = ringStart + 1;
  const pLead = prog(frame, leadStart, f(8, fps), "sweep");
  const chars = label ? Math.max(0, Math.min(label.length, Math.round(((frame - leadStart - f(4, fps)) * 24) / fps))) : 0;
  const pDim = prog(frame, t0, f(12, fps), "sweep");
  const pBox = prog(frame, t0 + f(6, fps), f(D24.rowWipe, fps), "sweep");
  const isVideo = src.endsWith(".mp4") || src.endsWith(".webm");
  const media: React.CSSProperties = { position: "absolute", inset: 0, width: 1920, height: 1080, objectFit: "cover" };
  const r = ring?.r ?? 30;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {isVideo ? <OffthreadVideo src={staticFile(src)} muted style={media} /> : <Img src={staticFile(src)} style={media} />}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {box && dim > 0 && (
          <>
            <defs>
              <mask id="dimhole">
                <rect width={1920} height={1080} fill="white" />
                <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={12} fill="black" />
              </mask>
            </defs>
            <rect width={1920} height={1080} fill="rgb(16,24,40)" opacity={dim * pDim} mask="url(#dimhole)" />
            <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={12} fill="none" stroke="#fff" strokeWidth={1.2} pathLength={1} strokeDasharray={`${pBox} 1`} />
          </>
        )}
        {path && <path d={path} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${pPath} 1`} />}
        {ring && pRing > 0 && <circle cx={ring.x} cy={ring.y} r={r + 4 * (1 - pRing)} fill="none" stroke={color} strokeWidth={3} opacity={pRing} />}
        {ring && labelAt && pLead > 0 && (
          <line x1={ring.x - r} y1={ring.y} x2={ring.x - r - (ring.x - r - labelAt.x) * pLead} y2={ring.y + (labelAt.y - ring.y) * pLead} stroke={labelColor} strokeWidth={1.2} />
        )}
      </svg>
      {label && labelAt && chars > 0 && (
        <p style={{ position: "absolute", right: 1920 - labelAt.x + 16, top: labelAt.y - 20, margin: 0, font: `500 30px/1.2 ${DISPLAY}`, letterSpacing: "0.04em", textTransform: "uppercase", color: labelColor, whiteSpace: "nowrap" }}>
          {label.slice(0, chars)}
        </p>
      )}
      {credit && <p style={{ position: "absolute", right: 175, top: 64, margin: 0, font: `400 20px/1 ${DISPLAY}`, color: MUTE }}>{credit}</p>}
    </div>
  );
};
