import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";
import { cl, ease, p, io } from "./look";
import { src } from "./parts";
import { PortraitPipCircle } from "./PortraitPipCircle";
import { TimelineMarkers, type Marker } from "./TimelineMarkers";

// ExoMind-only animation 4: session-timeline (TRANSLATION.md 2.4; beat B12 f1180-1241). Naim's review of v6 (DECISIONS 14m): no
// blurred side fill and no full-frame pillarbox. The practice's own session photo (clinic IMG_3714: the coil on a reclining patient,
// staff at the BTL console) sits in a clean rounded window on the cream canvas, right; Ostad drops into a pip circle bottom-left
// (keyed footage, centred per frame from the head track by the caller); a visit timeline (arrive -> session -> walk out) ticks
// between them on "seeing / in / office". Inside the window, in depth, never upscaled (the 768 x 1024 preview shows at 0.83x):
//   L2  the photo (rate 0.6)
//   L1  staff + console, masked out of the same photo by a feathered polygon (rate 1.0), so the nearest plane moves most
// Both push 1.00 -> 1.06 x rate on the in-out curve over the beat. The photo is never held still.
// the pip's backdrop (Naim's note 9): his keyed take ends at the camera frame's left edge, which cuts his left shoulder; on a light
// backdrop that cut read as a square edge inside the circle. A studio-dark backdrop that reaches his scrubs' colour (sampled
// rgb 22-33, 21-32, 25-36) by the shoulder line hides the frame edge, so the circle reads as one portrait.
const PIP_BG = "linear-gradient(180deg, #4a5160 0%, #2c303a 34%, #1b1a20 50%, #19181e 100%)";
export type SessionProps = {
  start?: number; cutAt?: number; lineAt?: number; markers?: Marker[]; segment?: { at: number; u0: number; u1: number; label: string }; end?: number;
  photo?: string; presenter?: React.ReactNode; pipInner?: React.CSSProperties;
};

const IMG = { w: 768, h: 1024 };
// staff + console in image px (IMG_3714 preview), traced on exomind/lab grid
const STAFF = "290,186 372,196 394,262 384,332 432,356 560,366 640,366 650,402 560,414 440,432 428,482 352,522 318,566 330,640 316,760 312,1024 196,1024 182,820 150,700 142,470 168,398 222,300 232,236";
const CONSOLE = "602,222 768,214 768,548 556,548 556,470 602,436";
const maskUri = (() => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${IMG.w} ${IMG.h}'><filter id='b'><feGaussianBlur stdDeviation='6'/></filter><g filter='url(#b)' fill='white'><polygon points='${STAFF}'/><polygon points='${CONSOLE}'/></g></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
})();

export const SessionTimeline: React.FC<SessionProps> = ({ start = 0, cutAt = 1, lineAt = 18, end = 54, photo = "exomind-skin/clinic/IMG_3714.jpg", presenter, pipInner,
  markers = [{ at: 18, u: 0.04, label: "Arrive" }, { at: 27, u: 0.5, label: "Session" }, { at: 34, u: 0.96, label: "Walk out" }],
  segment = { at: 27, u0: 0.04, u1: 0.96, label: "about 20–30 min ⚠" } }) => {
  const f = useCurrentFrame();
  if (f < start || f < cutAt) return null;
  const u = ease.blank(cl((f - cutAt) / Math.max(1, end - cutAt)));
  const push = (rate: number) => 1 + 0.06 * rate * u;
  const win = { x: 1180, y: 40, w: 640, h: 853 };
  const q = p(f, cutAt, 10, ease.arrive), o = p(f, end + 1, 7, ease.exit);
  const layer = (rate: number, extra: React.CSSProperties = {}) => ({
    position: "absolute" as const, left: 0, top: 0, width: win.w, height: win.h, transform: `scale(${push(rate)}) translateX(${-10 * rate * u}px)`, transformOrigin: "50% 55%", ...extra,
  });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: win.x + (1 - io(q)) * 24, top: win.y + o * 7, width: win.w, height: win.h, borderRadius: 24, overflow: "hidden", opacity: q * (1 - o), background: "#d8d2cc",
        boxShadow: "0 40px 70px -30px rgba(32,37,50,.5), 0 4px 12px rgba(32,37,50,.14), 0 0 0 1px rgba(255,255,255,.7)" }}>
        <div style={layer(0.6)}><Img src={src(photo)} style={{ width: "100%", height: "100%" }} /></div>
        <div style={layer(1.0, { WebkitMaskImage: maskUri, maskImage: maskUri, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" })}><Img src={src(photo)} style={{ width: "100%", height: "100%" }} /></div>
      </div>
      <TimelineMarkers lineAt={lineAt} x0={420} x1={1100} y={700} markers={markers} segment={segment} end={end + 8} onDark={false} />
      <PortraitPipCircle at={cutAt} x={90} y={560} d={260} bg={PIP_BG} inner={pipInner ?? { left: 26, top: -168, width: 480 }}>{presenter}</PortraitPipCircle>
    </AbsoluteFill>
  );
};
