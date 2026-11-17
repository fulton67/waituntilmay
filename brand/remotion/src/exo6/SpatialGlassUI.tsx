import React from "react";
import { useCurrentFrame } from "remotion";
import { C, caps, drift, ease, glass, lerp, p, text } from "./look";

// spatial-glass-ui. Ref: ro _MAYscxxhDE f746-812 (frosted panels floating in depth round the presenter; they drift with a slow
// parallax and arrive ~10 f apart). Beat B05: the far panel arrives on `arrive` (14 f) at depth 0.6 (smaller, softer, slightly
// defocused); near panels slide in from the right 9 f / 3.4 % H (type-slide-side). Near panels drift 12 px/s one way, far ones
// 5 px/s the other. `ring` pulses a halo 3x on a 12 f period (an incoming call). At `lightAt` every panel's sender row turns blue.
export type SpatialPanel = {
  at: number; depth: number; x: number; y: number; w: number; icon: React.ReactNode; title: string; sub?: string; body?: string; ring?: boolean; from?: "right" | "fade";
};

export const SpatialGlassUI: React.FC<{ panels: SpatialPanel[]; lightAt?: number; exitAt?: number; sender?: string }> = ({ panels, lightAt = Infinity, exitAt = Infinity, sender = "Our team" }) => {
  const f = useCurrentFrame();
  const order = panels.map((pp, i) => ({ pp, i })).sort((a, b) => a.pp.depth - b.pp.depth); // far first
  return (
    <>
      {order.map(({ pp, i }) => {
        if (f < pp.at) return null;
        const near = pp.depth >= 0.9;
        const q = near && pp.from !== "fade" ? p(f, pp.at, 9, ease.arrive) : p(f, pp.at, 14, ease.arrive);
        const out = p(f, exitAt + (near ? 2 : 0), 7, ease.exit); // far exits first
        const speed = near ? 12 : -5; // px per second, opposite directions
        const t = f - pp.at;
        const dx = (speed * t) / 24 + drift(f, 3 * pp.depth, 130, i);
        const slide = near && pp.from !== "fade" ? (1 - q) * 0.034 * 1080 * 2.4 : 0;
        const sc = lerp(0.8, 1, pp.depth);
        const lit = p(f, lightAt, 1, (x) => x);
        const ringT = f - pp.at - 9;
        return (
          <div key={i} style={{ position: "absolute", left: pp.x + dx + slide, top: pp.y + drift(f, 4 * pp.depth, 170, i * 2) + out * 7, width: pp.w,
            transform: `scale(${sc * (near ? 1 : 0.98 + 0.02 * q)})`, transformOrigin: "0 0", opacity: q * (1 - out), filter: near ? undefined : "blur(0.8px)", zIndex: Math.round(pp.depth * 10) }}>
            {pp.ring && ringT > 0 && ringT < 36 && [0, 1].map((r) => {
              const u = ((ringT + r * 6) % 12) / 12;
              return <div key={r} style={{ position: "absolute", left: 30 - 30 * u, top: 30 - 30 * u, width: 64 + 60 * u, height: 64 + 60 * u, borderRadius: "50%", border: `2px solid ${C.blue}`, opacity: 0.6 * (1 - u) }} />;
            })}
            <div style={{ position: "relative", ...glass(22, near ? 1 : 0.85), padding: "28px 32px", display: "flex", gap: 24, alignItems: "flex-start",
              boxShadow: near ? glass(22).boxShadow : "0 10px 30px -14px rgba(32,37,50,.18), inset 0 1px 0 rgba(255,255,255,.9)" }}>
              <div style={{ width: 84, height: 84, borderRadius: 22, flex: "0 0 auto", display: "grid", placeItems: "center", color: "#fff",
                background: pp.ring ? "linear-gradient(160deg, #6fd59a, #2fae6a)" : `linear-gradient(160deg, #6cc6f5, ${C.blue})` }}>{pp.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ ...caps(30, lit ? C.blue : C.ink2) }}>{sender}</div>
                  <div style={{ ...text(30, 400, C.mute) }}>now</div>
                </div>
                <div style={{ ...text(near ? 42 : 38, 500), marginTop: 8 }}>{pp.title}</div>
                {pp.sub && <div style={{ ...text(30, 400, C.ink2), marginTop: 6 }}>{pp.sub}</div>}
                {pp.body && <div style={{ ...text(30, 400, C.ink2), marginTop: 10, lineHeight: 1.3 }}>{pp.body}</div>}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};
