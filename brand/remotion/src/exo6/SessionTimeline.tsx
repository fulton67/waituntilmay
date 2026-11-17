import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";
import { cl, ease } from "./look";
import { src } from "./parts";
import { PortraitPipCircle } from "./PortraitPipCircle";
import { TimelineMarkers, type Marker } from "./TimelineMarkers";

// ExoMind-only animation 4: session-timeline (TRANSLATION.md 2.4; beat B12 f1180-1241). The practice's own session photo
// (clinic IMG_3714: the coil on a reclining patient, staff at the BTL console) takes over the frame, Ostad drops into a pip circle,
// and a visit timeline (arrive -> session -> walk out) ticks along the bottom on "seeing / in / office".
// Full-bleed, in depth, without upscaling the 768 x 1024 preview past 1.06x (the iCloud originals were not reachable; DECISIONS 14j):
//   L3  the room: the same photo as a blurred cover fill (rate 0.3)
//   L2  the photo, sharp, full height, feathered into L3 at its sides (rate 0.6)
//   L1  staff + console, masked out of the same photo by a feathered polygon (rate 1.0), so the nearest plane moves most
// All three push 1.00 -> 1.06 x rate on the in-out curve over the takeover. The photo is never held still.
export type SessionProps = {
  start?: number; cutAt?: number; lineAt?: number; markers?: Marker[]; segment?: { at: number; u0: number; u1: number; label: string }; end?: number;
  photo?: string; presenter?: React.ReactNode;
};

const IMG = { w: 768, h: 1024 };
// staff + console in image px (IMG_3714 preview), traced on exomind/lab grid
const STAFF = "290,186 372,196 394,262 384,332 432,356 560,366 640,366 650,402 560,414 440,432 428,482 352,522 318,566 330,640 316,760 312,1024 196,1024 182,820 150,700 142,470 168,398 222,300 232,236";
const CONSOLE = "602,222 768,214 768,548 556,548 556,470 602,436";
const maskUri = (() => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${IMG.w} ${IMG.h}'><filter id='b'><feGaussianBlur stdDeviation='6'/></filter><g filter='url(#b)' fill='white'><polygon points='${STAFF}'/><polygon points='${CONSOLE}'/></g></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
})();

export const SessionTimeline: React.FC<SessionProps> = ({ start = 0, cutAt = 1, lineAt = 18, end = 54, photo = "exomind-skin/clinic/IMG_3714.jpg", presenter,
  markers = [{ at: 18, u: 0.04, label: "Arrive" }, { at: 27, u: 0.5, label: "Session" }, { at: 34, u: 0.96, label: "Walk out" }],
  segment = { at: 27, u0: 0.04, u1: 0.96, label: "about 20–30 min ⚠" } }) => {
  const f = useCurrentFrame();
  if (f < start || f < cutAt) return null;
  const u = ease.blank(cl((f - cutAt) / Math.max(1, end - cutAt)));
  const push = (rate: number) => 1 + 0.06 * rate * u;
  const S = 1080 / IMG.h; // 1.0547: full height
  const pw = IMG.w * S, px = 1180 - pw / 2;
  const sideFeather = "linear-gradient(90deg, transparent 0, #000 90px, #000 calc(100% - 90px), transparent 100%)";
  const layer = (rate: number, extra: React.CSSProperties = {}) => ({
    position: "absolute" as const, left: px, top: 0, width: pw, height: 1080, transform: `scale(${push(rate)}) translateX(${-14 * rate * u}px)`, transformOrigin: "50% 55%", ...extra,
  });
  return (
    <AbsoluteFill style={{ background: "#d8d2cc", overflow: "hidden" }}>
      {/* L3 */}
      <Img src={src(photo)} style={{ position: "absolute", left: -40, top: -300, width: 2000, height: 2000 * IMG.h / IMG.w, objectFit: "cover", filter: "blur(80px) saturate(1.1) brightness(1.04)",
        transform: `scale(${push(0.3)})`, transformOrigin: "60% 40%" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(242,236,229,.42), rgba(242,236,229,.12) 40%, rgba(242,236,229,0) 60%, rgba(242,236,229,.25))" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 80% at 60% 45%, rgba(0,0,0,0), rgba(20,16,12,.22))" }} />
      {/* L2 */}
      <div style={layer(0.6, { WebkitMaskImage: sideFeather, maskImage: sideFeather })}><Img src={src(photo)} style={{ width: "100%", height: "100%" }} /></div>
      {/* L1 */}
      <div style={layer(1.0, { WebkitMaskImage: maskUri, maskImage: maskUri, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" })}><Img src={src(photo)} style={{ width: "100%", height: "100%" }} /></div>
      {/* a low band so the timeline reads on the photo */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 600, bottom: 0, background: "linear-gradient(180deg, rgba(14,18,26,0), rgba(14,18,26,.4) 45%, rgba(14,18,26,.46))" }} />
      <TimelineMarkers lineAt={lineAt} x0={440} x1={1780} y={790} markers={markers} segment={segment} end={end + 8} />
      <PortraitPipCircle at={cutAt} x={90} y={560} d={260} inner={{ left: 26, top: -168, width: 480 }}>{presenter}</PortraitPipCircle>
    </AbsoluteFill>
  );
};
