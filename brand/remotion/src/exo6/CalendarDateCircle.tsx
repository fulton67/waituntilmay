import React from "react";
import { useCurrentFrame } from "remotion";
import { C, caps, cl, drift, ease, p, text } from "./look";
import { DrawnCircle, Glass } from "./parts";

// calendar-date-circle. Refs: Are.na 31223791 (date type); the rosacea "circle the exact spot" method applied to time (ROS f235).
// Beat B07. A week of free/booked slots on a glass sheet (a generic week: labelled "Illustration", no real dates). The arc connector
// lands on the free slot (composition's Arrow), then `circleAt` a drawn loop closes round it in 12 f on `sweep` and the slot fills blue.
// The sheet drifts 4 px/s; booked slots shimmer faintly so the grid is never still.
export type Slot = { day: number; row: number };
export const CAL = { w: 600, h: 520, cols: 5, rows: 5, padX: 36, top: 132, cellH: 66, gap: 10 };

export const calendarSlotCenter = (x: number, y: number, s: Slot) => {
  const cw = (CAL.w - 2 * CAL.padX - (CAL.cols - 1) * CAL.gap) / CAL.cols;
  return { x: x + CAL.padX + s.day * (cw + CAL.gap) + cw / 2, y: y + CAL.top + s.row * (CAL.cellH + CAL.gap) - 10 + CAL.cellH / 2 - 14 };
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const TIMES = ["9:00", "10:30", "12:00", "2:00", "3:30"];
const BOOKED = new Set(["0-0", "0-2", "1-1", "1-3", "2-0", "2-4", "3-2", "3-3", "4-1", "4-4", "0-4", "3-0", "1-0"]);

export const CalendarDateCircle: React.FC<{
  start: number; circleAt: number; slot: Slot; x?: number; y?: number; exitAt?: number; month?: string; label?: string;
}> = ({ start, circleAt, slot, x = 1240, y = 200, exitAt = Infinity, month = "Consultations", label = "Illustration" }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const t = f - start;
  const i = p(f, start, 14, ease.arrive), o = p(f, exitAt, 7, ease.exit);
  const fill = p(f, circleAt + 6, 8, ease.arrive);
  const cw = (CAL.w - 2 * CAL.padX - (CAL.cols - 1) * CAL.gap) / CAL.cols;
  const dx = drift(f, 4, 180) - t * 0.0;
  return (
    <div style={{ position: "absolute", left: x + dx, top: y + (1 - i) * 16 + o * 7, width: CAL.w, height: CAL.h, opacity: i * (1 - o) }}>
      <Glass r={26} t={t} style={{ inset: 0 }}>
        <div style={{ position: "absolute", left: CAL.padX, top: 30, right: CAL.padX, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ ...caps(15, C.ink2) }}>{month}</span>
          <span style={{ ...text(15, 400, C.mute) }}>{label}</span>
        </div>
        <div style={{ position: "absolute", left: CAL.padX, top: 62, ...text(30, 500, C.ink) }}>This week</div>
        {DAYS.map((d, k) => (
          <div key={d} style={{ position: "absolute", left: CAL.padX + k * (cw + CAL.gap), top: 104, width: cw, textAlign: "center", ...caps(13, C.mute) }}>{d}</div>
        ))}
        {TIMES.map((tm, r) => DAYS.map((_, k) => {
          const key = `${k}-${r}`, booked = BOOKED.has(key), isSel = k === slot.day && r === slot.row;
          const cx = CAL.padX + k * (cw + CAL.gap), cy = CAL.top + r * (CAL.cellH + CAL.gap) - 10;
          const appear = p(f, start + 2 + (k + r) * 1, 10, ease.arrive);
          const shimmer = booked ? 0.05 * Math.sin((f + k * 9 + r * 13) / 14) : 0;
          return (
            <div key={key} style={{ position: "absolute", left: cx, top: cy, width: cw, height: CAL.cellH - 14, borderRadius: 12, opacity: appear,
              background: isSel ? `rgba(55,169,232,${0.12 + 0.88 * fill})` : booked ? `rgba(33,27,21,${0.07 + shimmer})` : "rgba(255,255,255,.7)",
              boxShadow: booked ? "none" : `inset 0 0 0 1.5px ${isSel ? C.blue : "rgba(33,27,21,.12)"}`,
              display: "grid", placeItems: "center", ...text(16, 500, isSel && fill > 0.5 ? "#fff" : booked ? "rgba(33,27,21,.28)" : C.ink) }}>
              {booked ? "" : tm}
            </div>
          );
        }))}
      </Glass>
      {/* the circle, drawn round the chosen slot, outside the glass so it can overshoot the cell */}
      {(() => {
        const c = calendarSlotCenter(0, 0, slot);
        return <div style={{ position: "absolute", left: c.x - cw / 2 - 16, top: c.y - CAL.cellH / 2 - 6 }}><DrawnCircle at={circleAt} w={cw + 32} h={CAL.cellH + 12} out={exitAt} /></div>;
      })()}
    </div>
  );
};
