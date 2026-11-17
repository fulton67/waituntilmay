import React from "react";
import { useCurrentFrame } from "remotion";
import { C, caps, cl, ease, p, text, io } from "./look";
import { Glass, Tick } from "./parts";

// checklist-ledger. Ref: DDOS f1686-1745 (Moment C: ruled rows wipe 18 f @30 = 14 f @24 on `sweep`, a tick +1 f after the word).
// Beat B10. A "Tonight" ledger: each row wipes in L->R (14 f, 2 f stagger) with a thumbnail of an object this edit built, then ticks
// +1 f after its wipe. `open` adds a dashed, empty row that slides in from the left in 9 f (type-slide-side), and a light sweep
// crosses it at `sweepAt` (16 f). The ledger drifts 0.8 % in scale; rows leave bottom-up on `exit`.
export type LedgerRow = { label: string; thumb?: React.ReactNode; at: number };

export const ChecklistLedger: React.FC<{
  start: number; title: string; rows: LedgerRow[]; open?: { label: string; at: number; sweepAt?: number }; x?: number; y?: number; exitAt?: number; end?: number; w?: number;
}> = ({ start, title, rows, open, x = 1060, y = 130, exitAt = Infinity, end, w = 700 }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const t = f - start;
  const n = rows.length + (open ? 1 : 0);
  const RH = 118, TOP = 178, H = TOP + n * RH + 30;
  const s = 1 + 0.008 * ease.blank(cl(t / Math.max(1, (end ?? start + 80) - start)));
  const head = p(f, start, 10, ease.arrive);
  const leave = (k: number) => p(f, exitAt + (n - 1 - k), 7, ease.exit); // bottom-up
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: H, transform: `scale(${s})`, transformOrigin: "0% 0%", opacity: head * (1 - leave(0)) }}>
      <Glass r={26} t={t} style={{ inset: 0 }} />
      <div style={{ position: "absolute", left: 44, top: 40, display: "flex", alignItems: "baseline", gap: 16 }}>
        <div style={{ ...caps(26, C.blue) }}>Covered tonight</div>
      </div>
      <div style={{ position: "absolute", left: 44, top: 78, ...text(58, 500) }}>{title}</div>
      {rows.map((r, k) => {
        const wipe = p(f, r.at, 14, ease.sweep);
        const lv = leave(k);
        return (
          <div key={k} style={{ position: "absolute", left: 44, right: 44, top: TOP + k * RH, height: RH - 14, opacity: 1 - lv, transform: `translateY(${lv * 7}px)`,
            clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)` }}>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 20, borderBottom: `1.5px solid ${C.rule}` }}>
              <div style={{ width: 84, height: 84, borderRadius: 18, overflow: "hidden", background: C.ice, flex: "0 0 auto", boxShadow: "0 6px 14px -6px rgba(32,37,50,.25)" }}>{r.thumb}</div>
              <div style={{ ...text(36, 500), flex: 1 }}>{r.label}</div>
              <div style={{ width: 46, height: 46, borderRadius: 23, background: f >= r.at + 15 ? "rgba(55,169,232,.12)" : "transparent", display: "grid", placeItems: "center" }}>
                {f >= r.at + 15 && <Tick at={r.at + 15} size={30} />}
              </div>
            </div>
          </div>
        );
      })}
      {open && f >= open.at && (() => {
        const q = p(f, open.at, 9, ease.arrive);
        const lv = leave(rows.length);
        const sw = open.sweepAt != null ? cl((f - open.sweepAt) / 16) : 0;
        const k = rows.length;
        return (
          <div style={{ position: "absolute", left: 44, right: 44, top: TOP + k * RH, height: RH - 18, opacity: q * (1 - lv), transform: `translateX(${-(1 - io(q)) * 0.028 * 1080}px)`,
            borderRadius: 18, border: `2px dashed ${C.blue}`, display: "flex", alignItems: "center", gap: 20, padding: "0 18px", overflow: "hidden" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, border: `2px dashed rgba(55,169,232,.6)`, display: "grid", placeItems: "center", ...text(30, 500, C.blue) }}>+</div>
            <div style={{ ...text(36, 500, C.blue) }}>{open.label}</div>
            {sw > 0 && sw < 1 && <div style={{ position: "absolute", top: 0, bottom: 0, width: 160, left: `${-20 + ease.sweep(sw) * 120}%`, background: "linear-gradient(90deg, transparent, rgba(255,255,255,.85), transparent)" }} />}
          </div>
        );
      })()}
    </div>
  );
};
