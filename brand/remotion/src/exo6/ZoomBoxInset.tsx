import React from "react";
import { Img, useCurrentFrame } from "remotion";
import { Arrow } from "../devices/Arrow";
import { TypeEntry } from "../devices/TypeEntry";
import { C, SERIF, SKIN_DISCLAIMER, cl, drift, ease, p } from "./look";
import { Disclaimer, src } from "./parts";

// zoom-box-inset + arrow-dashed-flow (B20 f1987-2091). Ref: GMu3 f440-470 (a box drawn on a detail, the detail enlarged in an
// inset, a dashed arrow between them). A portrait card arrives right (`arrive` 14 f); the camera pulls back 1.06 -> 1.00 over the
// beat (in-out) so the inset has room. A hairline box draws round her cheek (10 f, perimeter sweep), then the inset scales out of
// the box (`arrive` 14 f) along a dashed-flow arrow (devices/Arrow, 8 f, head lands last) and drifts 4 px. 'Feel better' and
// 'Better skin' accumulate word by word (type-line-accumulate) with the skin disclaimer under them. Everything exits 7 f.
export type ZoomProps = {
  start?: number; boxAt?: number; words?: number[]; discAt?: number; exitAt?: number; file?: string; iw?: number; ih?: number;
  card?: { x: number; y: number; w: number; h: number }; crop?: { fx: number; fy: number; z: number }; detail?: { x: number; y: number; w: number; h: number };
  lines?: string;
};

export const ZoomBoxInset: React.FC<ZoomProps> = ({ start = 1, boxAt = 58, words = [25, 25, 74, 74], discAt = 76, exitAt = 97, file = "exomind-skin/btl/web/model5_0251.jpg", iw = 1302, ih = 1800,
  card = { x: 900, y: 120, w: 520, h: 680 }, crop = { fx: 905, fy: 610, z: 1.2 }, detail = { x: 0.47, y: 0.28, w: 0.2, h: 0.12 }, lines = "Feel better\nBetter skin" }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const u = ease.blank(cl((f - start) / Math.max(1, exitAt - start)));
  const cam = 1.06 - 0.06 * u;
  const q = p(f, start, 14, ease.arrive), o = p(f, exitAt, 7, ease.exit);
  // image layout inside the card: focus point to card centre
  const z = crop.z * (1 + 0.02 * u), w = iw * z, h = ih * z;
  const il = card.w / 2 - crop.fx * z, it = card.h / 2 - crop.fy * z;
  const dB = { x: card.x + card.w * detail.x, y: card.y + card.h * detail.y, w: card.w * detail.w, h: card.h * detail.h }; // the box on the card
  const per = 2 * (dB.w + dB.h), draw = p(f, boxAt, 10, ease.sweep);
  const inset = { x: card.x + card.w + 90, y: card.y + 40, w: 360, h: 260 };
  const iq = p(f, boxAt + 12, 14, ease.arrive);
  const k = inset.w / dB.w; // inset magnification relative to the card
  const dx = drift(f, 4, 120);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${cam})`, transformOrigin: "60% 45%", opacity: 1 - o }}>
      <div style={{ position: "absolute", left: card.x + (1 - q) * 60, top: card.y, width: card.w, height: card.h, borderRadius: 24, overflow: "hidden", opacity: q,
        boxShadow: "0 34px 60px -26px rgba(32,37,50,.5), 0 4px 12px rgba(32,37,50,.14), 0 0 0 1px rgba(255,255,255,.7)" }}>
        <Img src={src(file)} style={{ position: "absolute", left: il, top: it, width: w, height: h, maxWidth: "none" }} />
      </div>
      {f >= boxAt && (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <rect x={dB.x} y={dB.y} width={dB.w} height={dB.h} rx={6} fill="none" stroke="#fff" strokeWidth={2.5} strokeDasharray={`${per * draw} ${per}`} style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,.35))" }} />
        </svg>
      )}
      <Arrow variant="dashed-flow" from={{ x: dB.x + dB.w + 10, y: dB.y + dB.h * 0.3 }} to={{ x: inset.x - 16, y: inset.y + inset.h * 0.55 }} start={boxAt + 10} end={exitAt + 7} color={C.blue} bend={-0.25} />
      {f >= boxAt + 12 && (
        <div style={{ position: "absolute", left: inset.x + dx, top: inset.y, width: inset.w, height: inset.h, borderRadius: 18, overflow: "hidden", opacity: iq,
          transform: `scale(${0.6 + 0.4 * iq})`, transformOrigin: "0% 50%", boxShadow: "0 26px 50px -20px rgba(32,37,50,.5), 0 0 0 2px #fff" }}>
          <Img src={src(file)} style={{ position: "absolute", left: (il - (dB.x - card.x)) * k, top: (it - (dB.y - card.y)) * k, width: w * k, height: h * k, maxWidth: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,.22), rgba(255,255,255,0) 50%)" }} />
        </div>
      )}
      <div style={{ position: "absolute", left: inset.x, top: inset.y + inset.h + 64, width: 520 }}>
        <TypeEntry entry="type-line-accumulate" start={start} text={lines} wordTimes={words} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 64, lineHeight: 1.05, color: C.ink }} />
      </div>
      <Disclaimer at={discAt} text={SKIN_DISCLAIMER} style={{ left: inset.x, top: inset.y + inset.h + 230, width: 440, lineHeight: 1.3 }} />
    </div>
  );
};
