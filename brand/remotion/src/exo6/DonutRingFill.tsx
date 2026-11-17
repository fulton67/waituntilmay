import React from "react";
import { useCurrentFrame } from "remotion";
import { TypeEntry } from "../devices/TypeEntry";
import { C, SERIF, SKIN_DISCLAIMER, caps, cl, ease, p } from "./look";
import { Disclaimer } from "./parts";
import { RoundWindow } from "./RoundWindow";

// donut-ring-fill (B13 f1242-1378). Refs: G3 T15 (a ring fills clockwise segment by segment), glp1 f626-644 (labels fan out on an
// arc). A 3-segment ring (gaps 6 deg) arrives as a hairline track (`arrive` 14 f); its labels fan out (first pair 3 f, third by
// +9 f); the segments fill clockwise 3 x 7 f with 1 f gaps, each a tapered glass stroke with a travelling highlight; each segment
// has its image chip (skin / treatment / mind) at its midpoint. 'Total skin health' lights word by word in the centre, the skin
// disclaimer fades under. Held: the ring turns 2 deg/s and the chips drift; exit: segments retract anticlockwise 7 f.
export type DonutSeg = { label: string; chip: { file: string; iw: number; ih: number; fx: number; fy: number; z: number }; color: string };
export type DonutProps = { start?: number; labelsAt?: number; fillAt?: number; words?: number[]; discAt?: number; exitAt?: number; cx?: number; cy?: number; R?: number; segs?: DonutSeg[]; center?: string };

const SEGS: DonutSeg[] = [
  { label: "Skin care", color: "#9fd6f5", chip: { file: "exomind-skin/btl/web/chip_0249.jpg", iw: 600, ih: 600, fx: 330, fy: 130, z: 0.52 } },
  { label: "Treatments", color: "#5fb8ea", chip: { file: "exomind-skin/clinic/IMG_3712.jpg", iw: 768, ih: 1024, fx: 320, fy: 440, z: 0.42 } },
  { label: "The mind", color: "#202532", chip: { file: "exomind-skin/flora/head_A_glass_brain.png", iw: 2752, ih: 1536, fx: 1180, fy: 600, z: 0.15 } },
];

const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const P = (a: number) => [cx + r * Math.cos(((a - 90) * Math.PI) / 180), cy + r * Math.sin(((a - 90) * Math.PI) / 180)];
  const [x0, y0] = P(a0), [x1, y1] = P(a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

export const DonutRingFill: React.FC<DonutProps> = ({ start = 30, labelsAt = 46, fillAt = 58, words = [93, 102, 108], discAt = 102, exitAt = 129, cx = 1380, cy = 470, R = 250, segs = SEGS, center = "Total skin health" }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const q = p(f, start, 14, ease.arrive);
  const ret = p(f, exitAt, 7, ease.exit);
  const rot = -60 + ((f - start) / 24) * 2; // 2 deg/s; -60 keeps every chip off the bottom (the disclaimer sits there)
  const span = 360 / segs.length, gap = 6;
  const W = 34;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - ret * 0.6 }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="drf-soft"><feGaussianBlur stdDeviation={10} /></filter>
          <linearGradient id="drf-hi" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity={0.75} /><stop offset="0.5" stopColor="#fff" stopOpacity={0} /></linearGradient>
        </defs>
        <g transform={`rotate(${rot} ${cx} ${cy})`}>
          {/* glass track */}
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth={W + 10} opacity={q} />
          <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.rule} strokeWidth={1.5} opacity={q} />
          {segs.map((s, i) => {
            const t0 = fillAt + i * 8;
            const u = ease.sweep(cl((f - t0) / 7)) * (1 - ret);
            if (u <= 0) return null;
            const a0 = i * span + gap / 2, a1 = a0 + (span - gap) * u;
            return (
              <g key={i}>
                <path d={arc(cx, cy, R, a0, a1)} fill="none" stroke={s.color} strokeWidth={W + 14} strokeLinecap="round" opacity={0.25} filter="url(#drf-soft)" />
                <path d={arc(cx, cy, R, a0, a1)} fill="none" stroke={s.color} strokeWidth={W} strokeLinecap="round" />
                <path d={arc(cx, cy, R - W * 0.22, a0, a1)} fill="none" stroke="url(#drf-hi)" strokeWidth={W * 0.3} strokeLinecap="round" />
              </g>
            );
          })}
        </g>
      </svg>
      {segs.map((s, i) => {
        const a = ((i * span + span / 2 + rot - 90) * Math.PI) / 180;
        const d = 140, rr = R + 128;
        const x = cx + rr * Math.cos(a) - d / 2, y = cy + rr * Math.sin(a) - d / 2;
        const la = labelsAt + (i < 2 ? 0 : 6);
        const lq = p(f, la, 3, ease.arrive);
        return (
          <React.Fragment key={i}>
            <RoundWindow at={la} {...s.chip} x={x} y={y} d={d} out={exitAt} phase={i * 1.7} />
            {f >= la && <div style={{ position: "absolute", left: x + d / 2, top: y + d + 18, transform: `translateX(-50%) translateY(${(1 - lq) * 12}px)`, opacity: lq * (1 - ret), ...caps(17, C.ink), whiteSpace: "nowrap" }}>{s.label}</div>}
          </React.Fragment>
        );
      })}
      <div style={{ position: "absolute", left: cx - 200, top: cy - 70, width: 400, textAlign: "center" }}>
        <TypeEntry entry="type-ghost-to-lit" start={start + 4} text={center.replace(" skin", "\nskin")} wordTimes={words} exitAt={exitAt} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 64, lineHeight: 1.02, color: C.ink }} />
      </div>
      <Disclaimer at={discAt} out={exitAt} text={SKIN_DISCLAIMER} style={{ left: cx - 400, top: cy + R + 210, width: 800, textAlign: "center" }} />
    </div>
  );
};
