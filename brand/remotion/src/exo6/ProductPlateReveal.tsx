import React from "react";
import { Img, useCurrentFrame } from "remotion";
import { Arrow, type PtSrc } from "../devices/Arrow";
import { TypeEntry } from "../devices/TypeEntry";
import { C, SERIF, cl, drift, ease, p, text } from "./look";
import { Glass, src } from "./parts";

// product-plate-reveal. Ref: ro yaFInenV3Eg f618-674 (a blurred plate, the product sharp by +52 f, a status chip lands last); the
// march2004 `plate` token (plate then picture, 18 + 18 f). Beat B02: a neutral glass plate in the product's final rect (`plateAt`,
// 18 f), the cut-out resolves through it (blur 18 px -> 0 + opacity, 18 f from `imageAt`), the name slams in (type-box-slam), an
// optional straight pointer (devices/Arrow) to the part that matters, and the chip arrives last (`arrive` 14 f). The product drifts
// 1.00 -> 1.02 and 6 px left across its life; a floor reflection and a soft key light sit under it so it reads as an object.
export const ProductPlateReveal: React.FC<{
  file: string; box: [number, number, number, number]; plateAt: number; imageAt: number; name: string; nameAt: number; chip?: React.ReactNode; chipAt?: number;
  pointer?: { from: PtSrc; to: PtSrc; at: number; end: number }; exitAt?: number; end?: number; imgStyle?: React.CSSProperties;
}> = ({ file, box, plateAt, imageAt, name, nameAt, chip, chipAt = Infinity, pointer, exitAt = Infinity, end, imgStyle }) => {
  const f = useCurrentFrame();
  if (f < plateAt) return null;
  const [x, y, w, h] = box;
  const t = f - plateAt;
  const plate = p(f, plateAt, 18, ease.plate);
  const pic = p(f, imageAt, 18, ease.plate);
  const o = p(f, exitAt, 7, ease.exit);
  const life = cl(t / Math.max(1, (end ?? plateAt + 54) - plateAt));
  const s = 1 + 0.02 * ease.blank(life), dx = -6 * ease.blank(life);
  const chipQ = p(f, chipAt, 14, ease.arrive);
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y + o * 7, width: w, height: h, opacity: (1 - o) }}>
        <Glass r={30} t={t} style={{ inset: 0, opacity: plate, transform: `scale(${0.97 + 0.03 * plate})` }}>
          {/* key light from the top-left, a cool floor */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 30% 18%, rgba(255,255,255,.7), rgba(255,255,255,0) 70%)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", background: "linear-gradient(180deg, rgba(214,226,236,0), rgba(214,226,236,.55))" }} />
        </Glass>
        <div style={{ position: "absolute", inset: 24, transform: `translateX(${dx}px) scale(${s})`, transformOrigin: "50% 70%", opacity: pic,
          filter: pic < 0.999 ? `blur(${(1 - pic) * 18}px)` : undefined }}>
          <Img src={src(file)} style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 26px 30px rgba(32,37,50,.25))", ...imgStyle }} />
        </div>
        {/* floor reflection */}
        <div style={{ position: "absolute", left: 24, right: 24, bottom: -h * 0.18 + 24, height: h * 0.18, overflow: "hidden", opacity: 0.18 * pic,
          maskImage: "linear-gradient(180deg, #000, transparent)", WebkitMaskImage: "linear-gradient(180deg, #000, transparent)" }}>
          <Img src={src(file)} style={{ width: "100%", height: h - 48, objectFit: "contain", transform: `scaleY(-1) translateX(${dx}px)`, transformOrigin: "50% 0%" }} />
        </div>
        <div style={{ position: "absolute", left: 34, top: 30 }}>
          <TypeEntry entry="type-box-slam" start={nameAt} text={name} exitAt={exitAt} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 64, color: C.ink }} />
        </div>
        {chip && f >= chipAt && (
          <div style={{ position: "absolute", left: 34, bottom: 34 + drift(f, 2, 90), opacity: chipQ * (1 - o), transform: `translateY(${(1 - chipQ) * 16}px)`,
            padding: "12px 20px", borderRadius: 999, background: C.navy, ...text(26, 500, "#fff"), whiteSpace: "nowrap", boxShadow: "0 10px 24px -10px rgba(32,37,50,.5)" }}>{chip}</div>
        )}
      </div>
      {pointer && <Arrow variant="straight-pointer" from={pointer.from} to={pointer.to} start={pointer.at} end={pointer.end} color={C.blue} />}
    </>
  );
};
