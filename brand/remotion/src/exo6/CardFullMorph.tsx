import React from "react";
import { AbsoluteFill, OffthreadVideo, useCurrentFrame } from "remotion";
import { C, cl, ease, lerp, p, text, io } from "./look";
import { Chip, src } from "./parts";

// card-full-morph (B04 f263-413). Ref: Colin f300-330 (a footage card grows and back on one curve). Naim's review of v6 (DECISIONS
// 14m): no blurred pillarbox fill, and he stays keyed in front on the left. So the consult card (Nov 5 2026 consult, a 1080 x 784
// crop of the raw portrait take: both of them, waist up) arrives right (`arrive` 14 f, playing), then grows on `morph` 26 f into a
// large clean rounded window on the cream canvas beside him (x 640-1880, top 36, 900 tall: the clip at 1.15x, never upscaled
// further), radius 24 -> 18 with it. The footage fills the window (cover) and pushes 1.00 -> 1.04 (in-out) while large; chip
// 'In our office' pops inside the window; window -> card on `morph` 26 f; card exits 7 f. `surround` is not faded any more.
export type MorphProps = {
  start?: number; fullAt?: number; chipAt?: number; backAt?: number; exitAt?: number; clip?: string; chip?: string;
  card?: { x: number; y: number; w: number; h: number }; big?: { x: number; y: number; w: number; h: number }; surround?: React.ReactNode;
};

export const CardFullMorph: React.FC<MorphProps> = ({ start = 30, fullAt = 51, chipAt = 78, backAt = 123, exitAt = 143, clip = "exomind-skin/clinic/consult_wide.mp4", chip = "In our office",
  card = { x: 1080, y: 150, w: 620, h: 776 }, big = { x: 640, y: 36, w: 1240, h: 900 }, surround }) => {
  const f = useCurrentFrame();
  const arrive = p(f, start, 10, ease.arrive);
  const m = p(f, fullAt, 26, ease.morph) * (1 - p(f, backAt, 26, ease.morph)); // 0 card .. 1 big window
  const o = p(f, exitAt, 7, ease.exit);
  const box = { x: lerp(card.x, big.x, m), y: lerp(card.y, big.y, m), w: lerp(card.w, big.w, m), h: lerp(card.h, big.h, m) };
  const r = lerp(24, 18, m);
  const bigSpan = cl((f - fullAt) / Math.max(1, backAt + 26 - fullAt));
  const push = 1 + 0.04 * ease.blank(bigSpan);
  return (
    <AbsoluteFill>
      {surround}
      {f >= start && (
        <div style={{ position: "absolute", left: box.x + (1 - io(arrive)) * 24, top: box.y + o * 7, width: box.w, height: box.h, borderRadius: r, overflow: "hidden", opacity: arrive * (1 - o),
          boxShadow: "0 40px 70px -30px rgba(32,37,50,.5), 0 4px 12px rgba(32,37,50,.14), 0 0 0 1px rgba(255,255,255,.7)", background: C.navy }}>
          <OffthreadVideo src={src(clip)} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${push})`, transformOrigin: "50% 45%" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 62%, rgba(14,18,26,.32))" }} />
          <Chip at={chipAt} out={backAt} label={chip} size={28} style={{ left: 32, bottom: 30, ...text(28, 500), background: "rgba(255,255,255,.2)", color: "#fff", backdropFilter: "blur(16px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.5), inset 0 0 0 1px rgba(255,255,255,.3)", textShadow: "0 1px 8px rgba(0,0,0,.35)" }} />
        </div>
      )}
    </AbsoluteFill>
  );
};
