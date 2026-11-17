import React from "react";
import { AbsoluteFill, OffthreadVideo, useCurrentFrame } from "remotion";
import { Arrow, type Pt } from "../devices/Arrow";
import { cl, ease, lerp, p, text } from "./look";
import { MoaLabel, src } from "./parts";

// ExoMind-only animation 2: rewire-trace (TRANSLATION.md 2.2; beat B18 f1811-1849). Also the `mechanism-on-real-image` device
// (IkrWPG3HGD8 f610-880: a mechanism simulated step by step on real imagery). On the licensed BTL MOA film (59.0-60.6 s, played
// at 1x) one route arrow (devices/Arrow route-trace, 27 f on `sweep`, peak 44 %) traces the axon from the reactivating cell to its
// neighbour, leg by leg. The film keeps pushing in, so every route point is keyframed on the film at 59.0 s and 60.6 s and
// interpolated per frame (the arrow rides the moving neurons instead of floating over them). Layered light: a travelling glow
// rides the arrow's growing end, and the neighbour cell blooms when the head lands. The burned-in subtitle band sits under a
// soft caption band; the MOA label stays on.
export type RewireProps = {
  start?: number; cutAt?: number; traceAt?: number; chipAt?: number; end?: number; film?: string; filmFrom?: number; filmTo?: number;
  route0?: Pt[]; route1?: Pt[]; chip?: string;
};

// route keyframes in composition px (1920x1080 = the film frame), read on the film at 59.0 s and 60.6 s (exomind/lab/rewire_route.jpg)
const R0: Pt[] = [{ x: 1190, y: 640 }, { x: 1460, y: 560 }, { x: 1690, y: 480 }, { x: 1748, y: 300 }];
const R1: Pt[] = [{ x: 1210, y: 560 }, { x: 1460, y: 515 }, { x: 1715, y: 435 }, { x: 1835, y: 215 }];

export const RewireTrace: React.FC<RewireProps> = ({ start = 0, cutAt = 1, traceAt = 1, chipAt = 15, end = 38, film = "exomind-skin/btl/video/Exomind_VIDEO_Mechanism-of-Action_ENNA101.mp4",
  filmFrom = 59.0, filmTo = 60.6, route0 = R0, route1 = R1, chip = "Neural connectivity" }) => {
  const f = useCurrentFrame();
  if (f < start || f < cutAt) return null;
  const span = (filmTo - filmFrom) * 24; // composition frames the film plays (1x)
  const pt = (k: number) => (fr: number): Pt => {
    const u = cl((fr - cutAt) / span);
    return { x: lerp(route0[k].x, route1[k].x, u), y: lerp(route0[k].y, route1[k].y, u) };
  };
  const head = pt(route0.length - 1)(f);
  const land = traceAt + 27;
  const bloom = p(f, land - 2, 8, ease.arrive);
  const chipQ = p(f, chipAt, 5, ease.arrive);
  // the travelling glow: where along the route the growing end is (piecewise by leg length)
  const pts = route0.map((_, k) => pt(k)(f));
  const lens = pts.slice(1).map((q, i) => Math.hypot(q.x - pts[i].x, q.y - pts[i].y));
  const L = lens.reduce((a, b) => a + b, 0);
  let d = ease.sweep(cl((f - traceAt) / 27)) * L, g = pts[0];
  for (let i = 0; i < lens.length; i++) { if (d <= lens[i]) { const u = d / lens[i]; g = { x: lerp(pts[i].x, pts[i + 1].x, u), y: lerp(pts[i].y, pts[i + 1].y, u) }; break; } d -= lens[i]; g = pts[i + 1]; }
  const tracing = f >= traceAt && f <= land + 2;
  return (
    <AbsoluteFill style={{ background: "#0b1220" }}>
      <OffthreadVideo src={src(film)} muted startFrom={Math.round(filmFrom * 24)} style={{ width: 1920, height: 1080 }} />
      {/* soft grade toward our palette: lift the blacks a touch, cool the mids */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(32,37,50,.0), rgba(32,37,50,.18))" }} />
      {/* caption band over the film's burned-in subtitles */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 840, bottom: 0, backdropFilter: "blur(24px)", WebkitMaskImage: "linear-gradient(180deg, transparent 0, #000 60px)", maskImage: "linear-gradient(180deg, transparent 0, #000 60px)", background: "rgba(11,18,32,1)" }} />
      {/* neighbour bloom when the head lands */}
      <div style={{ position: "absolute", left: head.x - 170, top: head.y - 170, width: 340, height: 340, borderRadius: "50%", mixBlendMode: "screen",
        background: "radial-gradient(circle, rgba(170,225,255,.85), rgba(55,169,232,.25) 45%, rgba(55,169,232,0) 70%)", opacity: bloom * (0.85 + 0.15 * Math.sin(f / 3)) }} />
      {/* travelling glow on the growing end */}
      {tracing && <div style={{ position: "absolute", left: g.x - 60, top: g.y - 60, width: 120, height: 120, borderRadius: "50%", mixBlendMode: "screen",
        background: "radial-gradient(circle, rgba(220,244,255,.95), rgba(120,200,250,0) 70%)" }} />}
      <Arrow variant="route-trace" from={pt(0)} via={[pt(1), pt(2)]} to={pt(3)} start={traceAt} end={end} color="#ffffff" weight={5} />
      {f >= chipAt && (
        <div style={{ position: "absolute", left: 1180, top: 236, opacity: chipQ, transform: `scale(${0.95 + 0.05 * chipQ})`, transformOrigin: "0% 50%",
          padding: "16px 26px", borderRadius: 999, background: "rgba(255,255,255,.14)", backdropFilter: "blur(16px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.4), inset 0 0 0 1px rgba(255,255,255,.22)",
          ...text(34, 500, "#fff"), whiteSpace: "nowrap" }}>{chip}</div>
      )}
      <MoaLabel at={cutAt} dark y={812} />
    </AbsoluteFill>
  );
};
export const REWIRE_ROUTE = { R0, R1 };
