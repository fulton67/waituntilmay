// The two STANDARD devices (user ruling 2026-11-17, from the rosacea reel; DEVICE_LIBRARY.md "STANDARD"; DECISIONS 15d):
//   SkinWindow = an exact derivative of components/SkinCard.tsx: the Markup glass(30) window, PAD 10, image radius 22, max 640 x 470,
//                in the chest band (brand.ts CHEST_T), a glass Chip pill top-left ("Before" -> "After"), a thin white ellipse ring on
//                the exact spot, the credit line under it (15 px NHG 500, white .78). Here the photo is her registered face, cropped to
//                the eyes; the surgeon's sketch (x at each entry, pen paths, hatch, the traced orbital rim) sits on the photo in white,
//                locked to the same landmarks through the BEFORE -> AFTER swap.
//   ClipCard   = an exact derivative of the ClipCard in components/Ro.tsx: card(26), 440 wide, media 315 high in a radius-18 window
//                with a 10 px margin, then caps (17 px), title (600 38 px) and the depth line. The depth line keeps Ro's three layer
//                lines but marks the layer in ink, with no dot (the glass-cohesion note: no blue highlight; lint: no dot-and-line).
// Motion is the original: Ro enter() (0.45 s quint, 18 px) for cards, SkinCard's 0.36 s open; the ellipse ring draws on in 0.55 s.
import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CHEST_T, FONT, clamp } from "../brand";
import { MUTED, RULE, card, enter } from "../components/Ro";
import { Chip, glass } from "../devices/Markup";
import { SketchMarks, type SketchData } from "./devices_v2";
import { INK, WHITE, p } from "./look";

const quint = (q: number) => 1 - (1 - q) ** 5;

export type Crop = { x: number; y: number; w: number; h: number }; // in the 1080 x 1920 reference face's pixels

// thin white ellipse rings round each hollow (the hatch polygon's bounds), drawn on like Markup's Ring, no tip dot, no leader
const HollowRings: React.FC<{ data: SketchData; s: number; faint?: boolean }> = ({ data, s, faint }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {data.order.map((k, i) => {
        const h = data.sides[k]?.hollow;
        if (!h) return null;
        const xs = h.map((q) => q[0]), ys = h.map((q) => q[1]);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        const rx = (Math.max(...xs) - Math.min(...xs)) / 2 + 12, ry = (Math.max(...ys) - Math.min(...ys)) / 2 + 10;
        const q = faint ? 1 : p(frame, s + 1 + i * 6, 13, "sweep");
        return <ellipse key={k} cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={WHITE} strokeWidth={3} pathLength={1} strokeDasharray={`${q} 1`} opacity={faint ? 0.55 : 0.95} />;
      })}
    </>
  );
};

export const SkinWindow: React.FC<{
  s: number; out: number; crop: Crop; before: string; after?: string; swapS?: number; data?: SketchData; drawS?: number; arrowsS?: number;
  labels?: { before: string; after: string }; credit?: string; showSketch?: boolean;
}> = ({ s, out, crop, before, after, swapS = Infinity, data, drawS = Infinity, arrowsS = Infinity, labels = { before: "Before", after: "After" },
  credit = "Patient of Dr. Ostad. Individual results vary.", showSketch = true }) => {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  if (frame < s || frame > out + 8) return null;
  const t = (frame - s) / fps;
  const PAD = 10, MAXW = 640, MAXH = 470;
  let IW = MAXW - 2 * PAD, IH = (IW * crop.h) / crop.w;
  if (IH > MAXH) { IH = MAXH; IW = (IH * crop.w) / crop.h; }
  const CW = IW + 2 * PAD, CH = IH + 2 * PAD, X = (1080 - CW) / 2, Y = CHEST_T;
  const q = clamp(t / 0.36), o = clamp((frame - out) / 8);
  const sc = (0.9 + 0.1 * quint(q)) * (1 - 0.04 * o); // SkinCard opens on easeOutBack; the calm system has no overshoot (MOTION §1.4)
  const op = clamp(q * 2.5) * (1 - o);
  const k = IW / crop.w;
  const wipe = p(frame, swapS + 1, 24, "sweep"); // the AFTER comes in left to right inside the same window
  const isAfter = wipe > 0.5;
  const drift = 1 + 0.02 * clamp((frame - s) / 150); // the photo never sits still (static-image check)
  const face = (src: string) => <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920 }} />;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: op }}>
      <div style={{ ...glass(30), left: X, top: Y, width: CW, height: CH, transform: `scale(${sc})`, transformOrigin: "50% 40%" }}>
        <div style={{ position: "absolute", left: PAD, top: PAD, width: IW, height: IH, borderRadius: 22, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0",
            transform: `translate(${-crop.x * k}px, ${-crop.y * k}px) scale(${k}) translate(${crop.x + crop.w / 2}px, ${crop.y + crop.h / 2}px) scale(${drift}) translate(${-(crop.x + crop.w / 2)}px, ${-(crop.y + crop.h / 2)}px)` }}>
            {face(before)}
            {after && <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - wipe * 100}% 0 0)` }}>{face(after)}</div>}
            {data && showSketch && (
              <>
                <SketchMarks data={data} s={drawS} faint={isAfter} />
                <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.55))" }}>
                  {/* no hairline rings round an area (REELS_HOW_I_WOULD_BUILD "never"): the sketch marks only */}
                  {data.arrows.map((a, i) => {
                    const kq = p(frame, arrowsS + 1 + i * 3, 7, "sweep");
                    if (kq <= 0) return null;
                    const tip = { x: a.at[0], y: a.at[1] + 6 }, tail = { x: a.at[0], y: a.at[1] + 52 };
                    const y = tail.y + (tip.y - tail.y) * kq;
                    return (
                      <g key={i}>
                        <line x1={tail.x} y1={tail.y} x2={tip.x} y2={y + 10} stroke={WHITE} strokeWidth={3.5} strokeLinecap="round" />
                        {kq > 0.78 && <polygon data-arrowhead points={`${tip.x},${tip.y} ${tip.x - 7},${tip.y + 12} ${tip.x + 7},${tip.y + 12}`} fill={WHITE} />}
                      </g>
                    );
                  })}
                </svg>
              </>
            )}
          </div>
        </div>
      </div>
      {credit && (
        <div style={{ position: "absolute", left: X + 6, top: Y + CH + 10, width: CW - 12, color: "rgba(255,255,255,.78)", font: `500 15px/1.25 ${FONT}`,
          textShadow: "0 1px 3px rgba(0,0,0,.45)" }}>{credit}</div>
      )}
      {t >= 0.3 && <Chip at={{ x: X + PAD + 18, y: Y + PAD + 34 }} text={isAfter ? labels.after : labels.before} s={1} o={clamp((t - 0.3) / 0.15)} />}
    </div>
  );
};

// Ro's depth line, in ink (no blue, no dot): three layer lines, the named layer drawn heavier
const Depth: React.FC<{ layer: number; label: string; q: number }> = ({ layer, label, q }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
    <svg width={56} height={34} viewBox="0 0 56 34">
      {[4, 17, 30].map((y, i) => <line key={i} x1={2} x2={i === layer ? 2 + 52 * q : 54} y1={y} y2={y} stroke={i === layer ? INK : RULE} strokeWidth={i === layer ? 4 : 2} strokeLinecap="round" />)}
    </svg>
    <span style={{ font: `500 24px/1.2 ${FONT}`, color: MUTED }}>{label}</span>
  </div>
);

// a ClipCard with any media (a clip, a photo, a designed example); `mark` renders under the title (used / not used)
export const ClipCardStd: React.FC<{ media: React.ReactNode; caps: string; title: string; depth?: [number, string]; s: number; out: number; left: number; top?: number;
  mark?: React.ReactNode; dim?: boolean }> = ({ media, caps, title, depth, s, out, left, top = CHEST_T, mark, dim }) => {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  if (frame < s || frame > out + 10) return null;
  const t = frame / fps, from = s / fps;
  return (
    <div style={{ ...card(26), left, top, width: 440, ...enter(t, from, out / fps) }}>
      <div style={{ margin: 10, height: 315, borderRadius: 18, overflow: "hidden", background: "#000", display: "flex", alignItems: "center", justifyContent: "center",
        opacity: dim ? 0.55 : 1, filter: dim ? "saturate(.5)" : undefined }}>{media}</div>
      <div style={{ padding: "6px 22px 20px" }}>
        <div style={{ font: `500 17px/1 ${FONT}`, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED }}>{caps}</div>
        <div style={{ font: `600 38px/1.1 ${FONT}`, letterSpacing: "-0.01em", marginTop: 8 }}>{title}</div>
        {depth && <Depth layer={depth[0]} label={depth[1]} q={quint(clamp((t - from - 0.6) / 0.4))} />}
        {mark}
      </div>
    </div>
  );
};
