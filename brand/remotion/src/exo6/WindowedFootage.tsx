import React from "react";
import { OffthreadVideo, useCurrentFrame } from "remotion";
import { SERIF, caps, drift, ease, p, io } from "./look";
import { src } from "./parts";

// windowed-footage (B11 f1081-1179). A rounded window (r 24) arrives right (`arrive` 14 f) with the practice footage playing; its
// content pushes 1.00 -> 1.05 and drifts 8 px for the whole hold; the title rises 6 % H in 5 f with its fade, the credit 3 f
// later; the window exits 7 f. A glass bezel (bright rim + floor shadow) keeps it an object in the room, not a pasted video.
export const WindowedFootage: React.FC<{
  start?: number; titleAt?: number; exitAt?: number; clip?: string; title?: string; credit?: string; box?: { x: number; y: number; w: number; h: number };
}> = ({ start = 1, titleAt = 77, exitAt = 91, clip = "exomind-skin/clips/office_team.mp4", title = "Our team", credit = "Our office", box = { x: 1100, y: 120, w: 620, h: 776 } }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const q = p(f, start, 10, ease.arrive), o = p(f, exitAt, 7, ease.exit);
  const u = ease.blank(Math.min(1, (f - start) / Math.max(1, exitAt - start)));
  const s = 1 + 0.05 * u;
  const tq = p(f, titleAt, 5, ease.arrive), cq = p(f, titleAt + 3, 5, ease.arrive);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - o }}>
      <div style={{ position: "absolute", left: box.x + (1 - io(q)) * 24, top: box.y + o * 7, width: box.w, height: box.h, borderRadius: 24, overflow: "hidden", opacity: q,
        boxShadow: "0 34px 60px -26px rgba(32,37,50,.5), 0 4px 12px rgba(32,37,50,.14), 0 0 0 1px rgba(255,255,255,.7)" }}>
        <OffthreadVideo src={src(clip)} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${s}) translate(${drift(f, 8, 150)}px, ${drift(f, 4, 190)}px)` }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(14,18,26,0) 55%, rgba(14,18,26,.55))" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: 24, boxShadow: "inset 0 1px 0 rgba(255,255,255,.55)" }} />
        {f >= titleAt && (
          <div style={{ position: "absolute", left: 40, bottom: 44 }}>
            <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 100, lineHeight: 1, color: "#fff", opacity: tq, transform: `translateY(${(1 - io(tq)) * 16}px)`, textShadow: "0 2px 18px rgba(0,0,0,.3)" }}>{title}</div>
            <div style={{ ...caps(28, "rgba(255,255,255,.9)"), marginTop: 16, opacity: cq }}>{credit}</div>
          </div>
        )}
      </div>
      <div style={{ position: "absolute", left: box.x + 40, top: box.y + box.h + 26, width: box.w - 80, height: 40, borderRadius: "50%", background: "rgba(32,37,50,.18)", filter: "blur(18px)", opacity: q }} />
    </div>
  );
};
