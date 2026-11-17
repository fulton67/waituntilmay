import React from "react";
import { random, useCurrentFrame } from "remotion";
import { TypeEntry } from "../devices/TypeEntry";
import { C, SERIF, cl, ease, lerp } from "./look";
import { MoaLabel } from "./parts";
import { TopicGlassPanel } from "./TopicGlassPanel";
import { NoiseClears } from "./NoiseClears";

// ExoMind-only animation 3: pulse-train-synapse (TRANSLATION.md 2.3; beat B19 f1850-1986). The ExoMind counterpart of the rosacea
// gut panel, by ADDITION (the gut panel took microbes away; this adds release in rhythm). In a topic-glass-panel:
//   top    a pulse train scrolls right 10 px/f, one spike every 12 f (the same 12 f rhythm as field-through-skull, so it reads as the
//          same coil); a trigger hairline sits over the terminal
//   middle a presynaptic bouton (white glass, navy hairline, vesicles inside) facing a postsynaptic spine across the cleft. From
//          `releaseFrom`, every spike flashes the bouton rim and releases 6-9 vesicles that cross the cleft in 10 f (`arrive`), dock,
//          fade over 6 f; the receptor they reach flashes 1 f and its glow decays
//   bottom noise-clears: jitter until `calmAt`, then 26 f on `sweep` to a calm flowing wave
//   under  "focused, in flow" set dim, each word lit on its onset (type-ghost-to-lit)
// Defaults = the lab's local frames (beat start 1850 -> 0).
export type SynapseProps = {
  start?: number; trainFrom?: number; releaseFrom?: number; lineAt?: number; calmAt?: number; wordTimes?: number[]; exitAt?: number;
  x?: number; y?: number; line?: string;
};

const W = 760, H = 470; // panel
const PERIOD = 12, SPEED = 10; // f, px per f (120 px apart)
const TRIG_X = 250; // trigger / bouton x in panel space

const spike = (x: number, base: number, k = 1) =>
  `M${x - 26} ${base} L${x - 10} ${base} L${x - 6} ${base + 5 * k} L${x} ${base - 34 * k} L${x + 5} ${base + 9 * k} L${x + 12} ${base + 3 * k} L${x + 26} ${base}`;

export const PulseTrainSynapse: React.FC<SynapseProps> = ({ start = 1, trainFrom = 6, releaseFrom = 27, lineAt = 50, calmAt = 89, wordTimes = [88, 88, 110], exitAt = 129,
  x = 1040, y = 250, line = "focused, in flow" }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const tTrain = f - trainFrom;
  // spikes: spike j enters at the left edge at trainFrom + j*12 and moves right SPEED px/f; it crosses TRIG_X at hit(j)
  const enterX = 30, hitDelay = Math.round((TRIG_X - enterX) / SPEED);
  const spikes: number[] = [];
  if (tTrain >= 0) for (let j = 0; j <= Math.floor(tTrain / PERIOD); j++) { const sx = enterX + (tTrain - j * PERIOD) * SPEED; if (sx < W - 40) spikes.push(sx); }
  const lastHit = tTrain >= hitDelay ? trainFrom + hitDelay + Math.floor((tTrain - hitDelay) / PERIOD) * PERIOD : -999;
  const sinceHit = f - lastHit;
  const rim = sinceHit >= 0 && sinceHit < 6 ? 1 - sinceHit / 6 : 0;
  // releases: one per hit at or after releaseFrom
  const hits: number[] = [];
  for (let h = trainFrom + hitDelay; h <= f; h += PERIOD) if (h >= releaseFrom) hits.push(h);
  const BX = TRIG_X + 70, MX = TRIG_X + 150; // bouton edge, membrane x (panel space, synapse svg)
  const recY = [70, 100, 130, 160, 190, 220];
  const recGlow = recY.map(() => 0);
  const ves: React.ReactNode[] = [];
  hits.slice(-3).forEach((h) => {
    const n = 6 + Math.floor(random(`n-${h}`) * 4);
    for (let i = 0; i < n; i++) {
      const y0 = 95 + random(`y0-${h}-${i}`) * 100, ry = 70 + Math.floor(random(`r-${h}-${i}`) * 6) * 30;
      const t = f - h - Math.floor(random(`d-${h}-${i}`) * 3);
      if (t < 0) continue;
      const u = ease.arrive(cl(t / 10));
      const fade = t > 10 ? cl((t - 10) / 6) : 0;
      if (fade >= 1) continue;
      const vx = lerp(BX - 8, MX - 9, u), vy = lerp(y0, ry, u);
      const k = recY.indexOf(ry);
      if (t >= 10 && t < 16 && k >= 0) recGlow[k] = Math.max(recGlow[k], t === 10 ? 1 : 1 - (t - 10) / 6);
      ves.push(<circle key={`${h}-${i}`} cx={vx} cy={vy} r={7} fill="url(#pts-ves)" opacity={1 - fade} />); // lint-ok: synapse vesicles, not a callout
    }
  });
  return (
    <>
      <TopicGlassPanel start={start} chip="Synapse ⚠" chipAt={releaseFrom} x={x} y={y} w={W} h={H} exitAt={exitAt}>
        <svg width={W} height={H - 80} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <defs>
            <radialGradient id="pts-ves" cx="35%" cy="35%"><stop offset="0" stopColor="#ffffff" /><stop offset="0.5" stopColor="#bfe6fb" /><stop offset="1" stopColor="#37a9e8" /></radialGradient>
            <linearGradient id="pts-bouton" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#e3eef6" /></linearGradient>
            <linearGradient id="pts-spine" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#e9f0f5" /></linearGradient>
            <filter id="pts-blur"><feGaussianBlur stdDeviation={5} /></filter>
            <clipPath id="pts-strip"><rect x={20} y={0} width={W - 40} height={70} /></clipPath>
          </defs>
          {/* pulse train strip */}
          <line x1={20} y1={48} x2={W - 20} y2={48} stroke={C.rule} strokeWidth={1.5} />
          <line x1={TRIG_X} y1={8} x2={TRIG_X} y2={66} stroke={C.blue} strokeWidth={1.2} strokeDasharray="3 4" opacity={0.7} />
          <g clipPath="url(#pts-strip)">
            {spikes.map((sx, i) => <path key={i} d={spike(sx, 48)} fill="none" stroke={Math.abs(sx - TRIG_X) < 14 ? C.blue : C.navy} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />)}
          </g>
          <text x={W - 30} y={-48} textAnchor="end" style={{ font: `500 24px ${"neue-haas-grotesk-text, Arial"}`, letterSpacing: "0.12em", fill: C.ink2 }}>PULSE TRAIN</text>
          {/* the synapse */}
          <g transform="translate(0, 74)">
            {/* axon + bouton (presynaptic) */}
            <path d={`M20 120 C 90 118, 140 104, ${BX - 90} 64 C ${BX - 40} 40, ${BX + 2} 66, ${BX} 145 C ${BX + 2} 224, ${BX - 40} 250, ${BX - 90} 226 C 140 186, 90 172, 20 170 Z`}
              fill="url(#pts-bouton)" stroke={C.navy} strokeWidth={1.5} />
            <path d={`M${BX - 2} 70 C ${BX + 6} 110, ${BX + 6} 180, ${BX - 2} 220`} fill="none" stroke={C.blue} strokeWidth={6} opacity={rim} filter="url(#pts-blur)" />
            {/* resting vesicles inside the bouton, with a slow jiggle */}
            {Array.from({ length: 14 }, (_, i) => {
              const a = random(`rv-${i}`) * Math.PI * 2, r = 18 + random(`rr-${i}`) * 52;
              const vx = BX - 70 + Math.cos(a) * r * 0.7 + Math.sin(f / 9 + i) * 1.5, vy = 145 + Math.sin(a) * r + Math.cos(f / 11 + i) * 1.5;
              return <circle key={i} cx={vx} cy={vy} r={7} fill="url(#pts-ves)" opacity={0.85} />; // lint-ok: synapse vesicles, not a callout
            })}
            {/* postsynaptic spine */}
            <path d={`M${MX} 40 C ${MX - 14} 100, ${MX - 14} 190, ${MX} 250 C ${MX + 80} 262, ${MX + 160} 236, ${W - 20} 230 L ${W - 20} 60 C ${MX + 160} 54, ${MX + 80} 28, ${MX} 40 Z`}
              fill="url(#pts-spine)" stroke={C.navy} strokeWidth={1.5} />
            {recY.map((ry, k) => (
              <g key={k}>
                <rect x={MX - 13} y={ry - 9} width={10} height={18} rx={4} fill={recGlow[k] > 0 ? C.blue : "#cfdce6"} />
                <rect x={MX - 24} y={ry - 20} width={32} height={40} rx={14} fill={C.sky} opacity={0.8 * recGlow[k]} filter="url(#pts-blur)" />
              </g>
            ))}
            {ves}
            <text x={BX - 200} y={292} style={{ font: `500 24px ${"neue-haas-grotesk-text, Arial"}`, letterSpacing: "0.1em", fill: C.ink2 }}>NERVE ENDING</text>
            <text x={MX + 40} y={292} style={{ font: `500 24px ${"neue-haas-grotesk-text, Arial"}`, letterSpacing: "0.1em", fill: C.ink2 }}>NEXT NEURON</text>
          </g>
        </svg>
        <div style={{ position: "absolute", left: 30, top: H - 80 - 64 }}>
          <NoiseClears start={start} calmAt={calmAt} w={W - 60} h={56} seed="b19" />
        </div>
      </TopicGlassPanel>
      <div style={{ position: "absolute", left: x + 4, top: y + H + 34 }}>
        <TypeEntry entry="type-ghost-to-lit" start={lineAt} text={line} wordTimes={wordTimes} exitAt={exitAt} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 64, color: C.ink }} />
      </div>
      <MoaLabel at={start} />
    </>
  );
};
