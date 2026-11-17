import React from "react";
import { random, useCurrentFrame } from "remotion";
import { C, cl, ease } from "./look";

// noise-clears. Ref: DDOS B23 inverse (a signal settles; `sweep` 26 f). A trace line that is jittery (random amplitude +-amp,
// re-seeded every 2 f) until `calmAt`, then settles over 26 f on `sweep` into a calm sine (1 Hz at 24 fps by default) whose phase
// keeps advancing (15 deg/f), so the calm line still flows. The settled line takes a soft glow; the noisy one stays grey.
export const NoiseClears: React.FC<{ start: number; calmAt: number; w: number; h: number; amp?: number; settle?: number; seed?: string; cycles?: number }> = ({
  start, calmAt, w, h, amp = 14, settle = 26, seed = "nc", cycles = 2.5 }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const u = ease.sweep(cl((f - calmAt) / settle)); // 0 noisy -> 1 calm
  const bucket = Math.floor(f / 2);
  const N = 72, mid = h / 2;
  const phase = (f * 15 * Math.PI) / 180;
  const pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * w;
    const noise = (random(`${seed}-${bucket}-${i}`) * 2 - 1) * amp * (0.6 + 0.4 * random(`${seed}-a-${bucket}-${i}`));
    const calm = Math.sin((i / N) * cycles * 2 * Math.PI - phase) * amp * 0.7;
    const edge = Math.sin((i / N) * Math.PI); // taper at both ends
    pts.push(`${x.toFixed(1)},${(mid + (noise * (1 - u) + calm * u) * edge).toFixed(1)}`);
  }
  const col = u > 0.5 ? C.blue : "rgba(33,27,21,.45)";
  return (
    <svg width={w} height={h} style={{ position: "absolute", overflow: "visible" }}>
      <defs><filter id={`nc-glow-${seed}`}><feGaussianBlur stdDeviation={3} /></filter></defs>
      {u > 0 && <polyline points={pts.join(" ")} fill="none" stroke={C.sky} strokeWidth={6} opacity={0.6 * u} filter={`url(#nc-glow-${seed})`} />}
      <polyline points={pts.join(" ")} fill="none" stroke={col} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};
