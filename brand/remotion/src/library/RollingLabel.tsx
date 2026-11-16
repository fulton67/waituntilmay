import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY, INK, MUTE } from "../components/YT";
import { D24, f, onset, prog } from "./motion";

// L05 rolling label (research/ostad/style/ANIMATION_LIBRARY.md): one device, one variable. On each value's onset + 1 f the old value
// leaves to -100 % and the new one rolls in from +100 % inside a one-line mask, both on `swap` (softunion S2: outExpo 650 ms = 16 f at
// 24 fps). Every value is stacked invisibly in the box, which takes the widest, so nothing reflows. No blur, no overshoot.
export type RollValue = { text: string; at: number }; // `at` = onset in seconds

export const RollingLabel: React.FC<{
  label: string; values: RollValue[]; size?: number; labelSize?: number; ink?: string; total?: string; style?: React.CSSProperties;
}> = ({ label, values, size = 88, labelSize = 24, ink = INK, total, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const starts = values.map((v) => onset(v.at, fps));
  const k = Math.max(0, starts.filter((s) => frame >= s).length - 1);
  const p = k === 0 ? 1 : prog(frame, starts[k], f(D24.swap, fps), "swap");
  const lh = Math.round(size * 1.05);
  const value = (text: string, y: number) => (
    <span style={{ position: "absolute", left: 0, top: 0, transform: `translateY(${y * 100}%)`, whiteSpace: "nowrap" }}>{text}</span>
  );
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 8, ...style }}>
      <span style={{ font: `500 ${labelSize}px/1.1 ${DISPLAY}`, letterSpacing: "0.04em", textTransform: "uppercase", color: MUTE }}>{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <div style={{ position: "relative", height: lh, overflow: "hidden", font: `500 ${size}px/${lh}px ${DISPLAY}`, color: ink, fontVariantNumeric: "tabular-nums" }}>
          {/* every value stacked invisibly in one grid cell: the box takes the widest rendered value (character count misleads with
              proportional digits: "1" is narrower than "3") */}
          <span style={{ display: "inline-grid", visibility: "hidden" }}>
            {values.map((v, i) => <span key={i} style={{ gridArea: "1 / 1", whiteSpace: "nowrap" }}>{v.text}</span>)}
          </span>
          {k > 0 && p < 1 && value(values[k - 1].text, -p)}
          {value(values[k].text, 1 - p)}
        </div>
        {total && <span style={{ font: `500 ${Math.round(size * 0.4)}px/1 ${DISPLAY}`, color: MUTE }}>{total}</span>}
      </div>
    </div>
  );
};
