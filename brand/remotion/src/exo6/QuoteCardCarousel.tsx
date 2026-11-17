import React from "react";
import { Easing, useCurrentFrame } from "remotion";
import { C, SERIF, caps, cl, drift, ease, p, text, io } from "./look";
import { Glass, Sweep } from "./parts";
import { IconQuestion } from "./icons";

// quote-card-carousel. Ref: G4 T15 evident_yt liXI5YR96w4 f3958-4288 (cards pushed in from the right, phrase highlights). Beat B09:
// a live Q&A box. Each card rises 10.7 % H in 17 f on the measured colin curve (DZiJljQJEKN f46-64, bezier 0,.18,.42,.91) and keeps
// drifting up 4 px/s; when the next card pushes in from the right, the previous ones step back (scale 0.94, opacity 0.6) into a
// stack. `mark` on a card highlights that phrase +4 f after it lands. A "live" pulse keeps the header moving.
const colin = Easing.bezier(0, 0.18, 0.42, 0.91);

export type QA = { q: string; at: number; mark?: string; who?: string };

export const QuoteCardCarousel: React.FC<{
  start: number; cards: QA[]; title?: string; credit?: string; x?: number; y?: number; exitAt?: number; w?: number;
}> = ({ start, cards, title = "Your questions", credit, x = 1000, y = 150, exitAt = Infinity, w = 760 }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const t = f - start;
  const i = p(f, start, 10, ease.arrive), o = p(f, exitAt, 7, ease.exit);
  const live = 0.5 + 0.5 * Math.sin(t / 5);
  const H = 640;
  return (
    <div style={{ position: "absolute", left: x, top: y + (1 - io(i)) * 16 + o * 7 + drift(f, 3, 140), width: w, height: H, opacity: i * (1 - o) }}>
      <Glass r={28} t={t} style={{ inset: 0 }}>
        <div style={{ position: "absolute", left: 40, top: 34, right: 40, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: C.ice, color: C.blue, display: "grid", placeItems: "center" }}><IconQuestion size={30} color={C.blue} /></div>
          <div style={{ ...text(38, 500), flex: 1 }}>{title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 999, background: "rgba(55,169,232,.1)", ...caps(26, C.blue) }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: C.blue, boxShadow: `0 0 0 ${5 * live}px rgba(55,169,232,${0.25 * (1 - live)})` }} />Live
          </div>
        </div>
        <div style={{ position: "absolute", left: 40, right: 40, top: 112, height: 1.5, background: C.rule }} />
        {credit && <div style={{ position: "absolute", left: 40, bottom: 22, ...text(27, 400, C.ink2) }}>{credit}</div>}
      </Glass>
      {/* the stack, outside the glass clip so cards can rise in from below the box */}
      <div style={{ position: "absolute", left: 40, right: 40, top: 128, height: H - 190 }}>
        {cards.map((c, k) => {
          if (f < c.at) return null;
          const q = colin(cl((f - c.at) / 17));
          const later = cards.filter((d, j) => j > k && f >= d.at).length; // how many cards came after this one
          const step = cards.slice(k + 1).reduce((s, d) => s + p(f, d.at, 12, ease.arrive), 0);
          const fromRight = k > 0 ? (1 - io(q)) * 24 : 0;
          const rise = (1 - io(q)) * 16 - Math.max(0, f - c.at - 17) * (4 / 24);
          const sc = 1 - 0.06 * step, op = cl(q * 1.4) * (1 - 0.4 * Math.min(1, step)) * (later > 2 ? 0 : 1);
          return (
            <div key={k} style={{ position: "absolute", left: 0, right: 0, top: 236 - step * 112, transform: `translate(${fromRight}px, ${rise}px) scale(${sc})`, transformOrigin: "50% 0%",
              opacity: op, zIndex: k, padding: "26px 30px", borderRadius: 22, background: "linear-gradient(170deg, #ffffff, #f8f6f3)",
              boxShadow: "0 1px 0 rgba(255,255,255,.9) inset, 0 2px 4px rgba(33,27,21,.06), 0 22px 40px -18px rgba(32,37,50,.28)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                {/* gap round 1 (graphics_arrows.md): no invented askers. Each card is an anonymous question from the box, with its icon */}
                <div style={{ width: 46, height: 46, borderRadius: 23, background: ["#d9e8f2", "#efe1d6", "#dfe6dc"][k % 3], display: "grid", placeItems: "center" }}><IconQuestion size={26} color={C.ink2} /></div>
                <div style={{ ...text(30, 500, C.ink2) }}>{c.who ?? "Question box"}</div>
                <div style={{ ...text(30, 400, C.mute) }}>· just now</div>
              </div>
              <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 54, lineHeight: 1.06, color: C.ink }}>
                {c.mark && c.q.includes(c.mark) ? <>{c.q.split(c.mark)[0]}<Sweep at={c.at + 4}>{c.mark}</Sweep>{c.q.split(c.mark)[1]}</> : c.q}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
