import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";
import { Arrow, type Pt } from "../devices/Arrow";
import { TypeEntry } from "../devices/TypeEntry";
import { C, SANS, cl, drift, ease, p } from "./look";
import { MoaLabel, src } from "./parts";
import { RegionLightOnModel } from "./RegionLightOnModel";

// ExoMind-only animation 1: field-through-skull (TRANSLATION.md 2.1; beat B17 f1740-1810). After the gold pick k4lEDTVCb0U 53-59 s
// (the applicator descends onto a glass head, then a cyan field shows under the coil), rebuilt in our palette with our own pieces:
//   L0  the room: the same Flora plate, blurred and slower (parallax 0.3)
//   L1  glass head with skull + brain in profile (Flora head_a.png, AI shot), feathered out of its own plate; turns 4 deg in 2.5D
//   L2  field light: on every pulse (12 f) a soft ring leaves the pad and widens into the skull, plus a cyan bloom under the pad
//   L3  the prefrontal region lights (region-light-on-model, 6 f) and breathes on the pulse
//   L4  three orbit arcs (devices/Arrow orbit-arc, 9 f each, 4 f stagger) carry the field from the pad into the skull; on each pulse
//       they step 6 px inward and dip to 0.4 opacity, recovering over 8 f, so they never sit still
//   L5  the BTL applicator (cut from Applicator_0082), descending 40 px onto the scalp on `arrive` 14 f; moves 1.5x the head (nearer)
//   L6  label "Prefrontal cortex" (type-box-slam) and the MOA compliance label
// Frames are props (composition frames). Defaults = the lab's local frames (beat start 1710 -> 0).
export type FieldProps = {
  start?: number; headIn?: number; arcsAt?: number; pulseFrom?: number; regionAt?: number; end?: number; label?: string;
  head?: string; applicator?: string;
};

// geometry (composition px), measured on head_a.png at the plate transform below: scale 0.62, offset (214, 160)
const PLATE = { s: 0.62, x: 214, y: 160, w: 2752, h: 1536 };
export const SKULL = {
  pad: { x: 1252, y: 250 }, // where the coil pad meets the scalp (above the frontal lobe), read on exomind/lab/field-through-skull.png
  region: { x: 1206, y: 336 }, // prefrontal cortex, under the pad
  normal: { x: -0.36, y: -0.93 }, // scalp normal at the pad (pointing out)
};

export const FieldThroughSkull: React.FC<FieldProps> = ({ start = 30, headIn = 30, arcsAt = 40, pulseFrom = 55, regionAt = 66, end = 100,
  label = "Prefrontal cortex ⚠", head = "exomind-skin/flora/head_a.png", applicator = "exomind-skin/btl/applicator_0082_cut.png" }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const life = cl((f - start) / Math.max(1, end - start));
  const turn = 4 * ease.blank(life); // degrees, over the beat
  const hx = -turn * 3.2; // px the head layer travels with the turn
  const cx = hx * 1.5; // the coil is nearer: 1.5x
  const fade = p(f, headIn, 10, ease.arrive);
  const descend = p(f, headIn, 10, ease.arrive);
  const n = f >= pulseFrom ? Math.floor((f - pulseFrom) / 12) : -1; // pulse index
  const ph = f >= pulseFrom ? (f - pulseFrom) % 12 : 99; // frames since the last pulse
  const dip = ph < 4 ? ease.arrive(ph / 4) : ph < 12 ? 1 - ease.arrive((ph - 4) / 8) : 0; // 0..1..0 over a pulse
  const N = SKULL.normal;
  const at = (x: number, y: number) => (fr: number): Pt => {
    const life2 = cl((fr - start) / Math.max(1, end - start));
    const hx2 = -4 * ease.blank(life2) * 3.2;
    return { x: x + hx2, y };
  };
  const pad = { x: SKULL.pad.x + cx, y: SKULL.pad.y };
  // three nested field rings descending from the pad into the skull (Arrow orbit-arc: from = ring centre, to = where the head lands
  // on the tilted ring, bend = the share of the ring the arc sweeps). The wrapper turns them to the scalp normal (-21 deg).
  const rings = [0, 1, 2].map((k) => {
    const depth = 30 + 52 * k, r = 120 + 64 * k;
    const c = { x: SKULL.pad.x - N.x * depth, y: SKULL.pad.y - N.y * depth };
    const a = (200 * Math.PI) / 180; // lands on the front (face) side of each ring
    return { c, to: { x: c.x + r * Math.cos(a), y: c.y + r * 0.42 * Math.sin(a) } };
  });
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      {/* L0 room: the cream canvas (Naim's note 7, DECISIONS 14n: no full-frame blurred copy of the photo behind it any more); the
          masked head plate fades into it */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 70% at 62% 40%, #fbfaf8, #efebe7)" }} />
      {/* L1 head, 2.5D turn */}
      <div style={{ position: "absolute", inset: 0, perspective: 2200 }}>
        <div style={{ position: "absolute", left: PLATE.x + hx, top: PLATE.y, width: PLATE.w * PLATE.s, height: PLATE.h * PLATE.s, transform: `rotateY(${-turn}deg)`, transformOrigin: "62% 50%",
          WebkitMaskImage: "radial-gradient(ellipse 46% 58% at 62% 46%, #000 62%, transparent 100%)", maskImage: "radial-gradient(ellipse 46% 58% at 62% 46%, #000 62%, transparent 100%)" }}>
          <Img src={src(head)} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      {/* L2 field light: a soft cyan cone from the pad into the skull (gold pick 56.5-59 s), swelling on every pulse, clipped to the head */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, mixBlendMode: "multiply" }}>
        <defs>
          <clipPath id="fts-head"><ellipse cx={1390 + hx} cy={470} rx={330} ry={300} /></clipPath>
          <radialGradient id="fts-cone" cx="50%" cy="0%" r="100%"><stop offset="0" stopColor="#7cc8f2" stopOpacity={0.9} /><stop offset="0.55" stopColor="#9fd6f5" stopOpacity={0.35} /><stop offset="1" stopColor="#9fd6f5" stopOpacity={0} /></radialGradient>
        </defs>
        <g clipPath="url(#fts-head)" opacity={f >= arcsAt ? (0.45 + 0.35 * dip) * p(f, arcsAt, 9, ease.arrive) : 0}>
          <path d={`M${pad.x - 70} ${pad.y + 4} L${pad.x + 60} ${pad.y - 16} L${pad.x + 30 - N.x * 230} ${pad.y + 60 - N.y * 230} L${pad.x - 150 - N.x * 230} ${pad.y + 100 - N.y * 230} Z`} fill="url(#fts-cone)" />
        </g>
      </svg>
      <div style={{ position: "absolute", left: pad.x - 140, top: pad.y - 40, width: 260, height: 170, borderRadius: "50%", mixBlendMode: "screen", transform: "rotate(-21deg)",
        background: "radial-gradient(ellipse at 50% 30%, rgba(200,236,255,.9), rgba(200,236,255,0) 65%)", opacity: f >= arcsAt ? (0.35 + 0.5 * dip) * p(f, arcsAt, 9, ease.arrive) : 0 }} />
      {/* L3 the region lights */}
      <RegionLightOnModel at={regionAt} x={SKULL.region.x + hx} y={SKULL.region.y} rx={128} ry={92} rotate={-24} pulse={dip} />
      {/* L4 orbit arcs, stepping inward and dipping on each pulse */}
      {rings.map((g, k) => (
        <div key={k} style={{ position: "absolute", inset: 0, opacity: 1 - 0.6 * dip, transform: `translate(${-N.x * 6 * dip}px, ${-N.y * 6 * dip}px) rotate(-21deg)`, transformOrigin: `${SKULL.pad.x}px ${SKULL.pad.y}px` }}>
          <Arrow variant="orbit-arc" from={at(g.c.x, g.c.y)} to={at(g.to.x, g.to.y)} bend={0.34} start={arcsAt + 4 * k} end={end + 30} color={C.blue} />
        </div>
      ))}
      {/* L5 the applicator, descending onto the scalp */}
      <div style={{ position: "absolute", left: pad.x - 157 + N.x * 40 * (1 - descend), top: pad.y - 226 + N.y * 40 * (1 - descend) + drift(f, 1.5, 48), width: 600,
        transform: "rotate(-18deg)", transformOrigin: "157px 238px", filter: "drop-shadow(0 18px 18px rgba(32,37,50,.28))" }}>
        <Img src={src(applicator)} style={{ width: 600 }} />
        {/* the coil's light strip answers each pulse */}
        <div style={{ position: "absolute", left: 18, top: 128, width: 190, height: 10, borderRadius: 6, background: "#8f7bff", filter: "blur(6px)", opacity: 0.25 + 0.6 * dip, transform: "rotate(10deg)" }} />
      </div>
      {/* L6 label */}
      <div style={{ position: "absolute", right: 1920 - 1050, top: 318, textAlign: "right" }}>
        <TypeEntry entry="type-box-slam" start={regionAt} text={label} style={{ fontFamily: SANS, fontWeight: 500, fontSize: 46, color: C.ink, letterSpacing: "0.005em" }} />
      </div>
      <MoaLabel at={start} />
    </AbsoluteFill>
  );
};
