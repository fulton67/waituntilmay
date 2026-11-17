import React from "react";
import { AbsoluteFill, OffthreadVideo, useCurrentFrame } from "remotion";
import { C, cl, ease, lerp, p, text } from "./look";
import { Chip, src } from "./parts";

// card-full-morph (B04 f263-413). Ref: Colin f300-330 (a footage card grows to the full frame and back on one curve). The practice
// consult clip arrives in a rounded window right (`arrive` 14 f, playing), then the window becomes the frame on `morph` 26 f (box
// and radius 24 -> 0 together, so it reads as one object) while the surround (keyed Ostad, canvas) fades out 5 f. Chip 'In our
// office' pops. Full frame pushes 1.00 -> 1.04 (in-out); then full -> card on `morph` 26 f, surround back 5 f, card exits 7 f.
// `surround` = whatever sits behind (the keyed presenter); it is faded here so the builder doesn't have to time it twice.
export type MorphProps = {
  start?: number; fullAt?: number; chipAt?: number; backAt?: number; exitAt?: number; clip?: string; chip?: string;
  card?: { x: number; y: number; w: number; h: number }; surround?: React.ReactNode;
};

export const CardFullMorph: React.FC<MorphProps> = ({ start = 30, fullAt = 51, chipAt = 78, backAt = 123, exitAt = 143, clip = "exomind-skin/clinic/consult.mp4", chip = "In our office",
  card = { x: 1080, y: 150, w: 620, h: 776 }, surround }) => {
  const f = useCurrentFrame();
  const arrive = p(f, start, 14, ease.arrive);
  const m = p(f, fullAt, 26, ease.morph) * (1 - p(f, backAt, 26, ease.morph)); // 0 card .. 1 full
  const sur = 1 - cl((f - fullAt) / 5) * (1 - cl((f - backAt) / 5));
  const o = p(f, exitAt, 7, ease.exit);
  const full = { x: 0, y: 0, w: 1920, h: 1080 };
  const box = { x: lerp(card.x, full.x, m), y: lerp(card.y, full.y, m), w: lerp(card.w, full.w, m), h: lerp(card.h, full.h, m) };
  const r = 24 * (1 - m);
  const fullSpan = cl((f - fullAt) / Math.max(1, backAt + 26 - fullAt));
  const push = 1 + 0.04 * ease.blank(fullSpan);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, opacity: sur }}>{surround}</div>
      {f >= start && (
        <div style={{ position: "absolute", left: box.x + (1 - arrive) * 60, top: box.y + o * 7, width: box.w, height: box.h, borderRadius: r, overflow: "hidden", opacity: arrive * (1 - o),
          boxShadow: m < 1 ? `0 30px 60px -24px rgba(32,37,50,${0.45 * (1 - m)}), 0 0 0 1px rgba(255,255,255,${0.6 * (1 - m)})` : "none", background: C.navy }}>
          {/* the clip is 4:5 portrait: a blurred cover of itself fills the box, the sharp clip sits at the box's full height, centred, so the
              morph never upscales the source past 1.2x (card 620x776 = the clip; full frame = 864x1080 between soft blurred sides) */}
          <OffthreadVideo src={src(clip)} muted style={{ position: "absolute", inset: -60, width: box.w + 120, height: box.h + 120, objectFit: "cover", filter: "blur(40px) brightness(.9)", transform: `scale(${push})` }} />
          <div style={{ position: "absolute", left: box.w / 2 - box.h * 0.4 * push, top: box.h / 2 - (box.h / 2) * push, width: box.h * 0.8 * push, height: box.h * push,
            WebkitMaskImage: m > 0.02 ? `linear-gradient(90deg, transparent 0, #000 ${70 * m}px, #000 calc(100% - ${70 * m}px), transparent 100%)` : undefined,
            maskImage: m > 0.02 ? `linear-gradient(90deg, transparent 0, #000 ${70 * m}px, #000 calc(100% - ${70 * m}px), transparent 100%)` : undefined }}>
            <OffthreadVideo src={src(clip)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(14,18,26,.35))" }} />
        </div>
      )}
      <Chip at={chipAt} out={backAt} label={chip} size={26} style={{ left: 96, top: 860, ...text(26, 500), background: "rgba(255,255,255,.2)", color: "#fff", backdropFilter: "blur(16px)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.5), inset 0 0 0 1px rgba(255,255,255,.3)", textShadow: "0 1px 8px rgba(0,0,0,.35)" }} />
    </AbsoluteFill>
  );
};
