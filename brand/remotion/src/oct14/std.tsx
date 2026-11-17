// Oct 14 reel: the two STANDARD devices (client 2026-11-17, from the rosacea reel; DEVICE_LIBRARY "STANDARD"; DECISIONS 16d).
//   ClipCard  exact derivative of components/Ro.tsx ClipCard (l.398): card(26) glass from Ro, 440 wide, the clip on top in an
//             18-radius window 315 high (10 px inset), small caps label (Ro Caps), a 38 px title, the depth-scale line; Ro `enter`
//             motion (quint 0.45 s, 18 px rise; out 0.3 s). One change: the depth line marks its layer in ink, not brand blue
//             (client 2026-11-17: no blue; LESSONS L5).
//   CompareClips  two ClipCards side by side (Ro Compare's layout: the second enters later); the one he is not using is struck and
//             dimmed with a glass "Not first, here" chip (Markup Chip).
// Depth labels are clinical: ostad_check pending (beats.json, DECISIONS 16d).
import React from "react";
import { OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Arrow } from "../devices/Arrow";
import { Chip } from "../devices/Markup";
import { card, MUTED, NAVY, RULE } from "../components/Ro";
import { FONT } from "../brand";
import { WHITE, type PtSrc, at } from "./look";

const quint = (q: number) => 1 - (1 - q) ** 5;
const cl = (v: number) => Math.min(1, Math.max(0, v));
/** Ro `enter` on frames (24 fps): quint 0.45 s in with an 18 px rise, 0.3 s out with a 10 px lift */
export const enterF = (frame: number, s: number, out = 1e9) => {
  const i = quint(cl((frame - s) / (0.45 * 24))), o = cl((frame - out) / (0.3 * 24));
  return { opacity: i * (1 - o), transform: `translateY(${(1 - i) * 18 - o * 10}px)` };
};
const Caps: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ font: `500 19px/1 ${FONT}`, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED, ...style }}>{children}</div>
);
/** Ro Depth: three thin lines = the skin's layers (skin, fat, deep: muscle / bone), a dot on the one the product goes to */
const Depth: React.FC<{ layer: number; label: string; q: number }> = ({ layer, label, q }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
    <svg width={56} height={34} viewBox="0 0 56 34">
      {[4, 17, 30].map((y, i) => <line key={i} x1={2} x2={54} y1={y} y2={y} stroke={i === layer ? NAVY : RULE} strokeWidth={i === layer ? 2.5 : 2} strokeLinecap="round" />)}
      <circle cx={28} cy={[4, 17, 30][layer]} r={5.5 * q} fill={NAVY} />
    </svg>
    <span style={{ font: `500 24px/1.2 ${FONT}`, color: MUTED }}>{label}</span>
  </div>
);

export const CW = 440, CLIP_H = 315;
export type ClipSpec = { src: string; from: number; rate?: number; caps: string; title: string; depth: [number, string] };

export const ClipCard: React.FC<{ c: ClipSpec; s: number; out: number; left: number; top: number; w?: number; dim?: number; strike?: number }> = ({ c, s, out, left, top, w = CW, dim = 0, strike = 0 }) => {
  const frame = useCurrentFrame();
  if (frame < s || frame > out + 8) return null;
  return (
    <div style={{ ...card(26), left, top, width: w, ...enterF(frame, s, out) }}>
      <div style={{ margin: 10, height: CLIP_H, borderRadius: 18, overflow: "hidden", background: "#000" }}>
        <Sequence from={s} layout="none">
          <OffthreadVideo src={staticFile(c.src)} trimBefore={Math.round(c.from * 24)} playbackRate={c.rate ?? 1} muted
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: dim ? `saturate(${1 - 0.6 * dim})` : undefined }} />
        </Sequence>
      </div>
      <div style={{ padding: "6px 22px 20px", opacity: 1 - 0.45 * dim }}>
        <Caps style={{ fontSize: 17 }}>{c.caps}</Caps>
        <div style={{ position: "relative", display: "inline-block", font: `600 38px/1.1 ${FONT}`, letterSpacing: "-0.01em", marginTop: 8 }}>
          {c.title}
          {strike > 0 && <div style={{ position: "absolute", left: -4, top: "54%", width: `calc(${strike * 100}% + 8px)`, height: 3, borderRadius: 2, background: NAVY }} />}
        </div>
        <Depth layer={c.depth[0]} label={c.depth[1]} q={quint(cl((frame - s - 0.6 * 24) / (0.4 * 24)))} />
      </div>
    </div>
  );
};

/** an injection pop-up in the ClipCard look, on the side away from the treated point, with a white headed arrow to that point */
export const InjectionCard: React.FC<{ c: ClipSpec; s: number; out: number; anchor: PtSrc; top?: number; arrowOut?: number; variant?: "curved-callout" | "straight-pointer" }> = ({ c, s, out, anchor, top = 1010, arrowOut, variant = "curved-callout" }) => {
  const frame = useCurrentFrame();
  const a = at(anchor, frame);
  const left = a.x > 540 ? 98 : 1080 - 98 - CW;
  const from = { x: a.x > 540 ? left + CW - 40 : left + 40, y: top + 6 };
  return (
    <>
      <ClipCard c={c} s={s} out={out} left={left} top={top} />
      <Arrow variant={variant} from={from} to={anchor} start={s + 8} end={(arrowOut ?? out) + 4} />
    </>
  );
};

/** two ClipCards side by side; at `strikeS` the left one (the usual approach he is not using first) is struck and dimmed */
export const CompareClips: React.FC<{ left: ClipSpec; right: ClipSpec; s: number; rightS: number; strikeS: number; out: number; top: number; chip: string }> = ({ left, right, s, rightS, strikeS, out, top, chip }) => {
  const frame = useCurrentFrame();
  const w = 420, gap = 1080 - 2 * 98 - 2 * w;
  const k = cl((frame - strikeS - 1) / 8);
  return (
    <>
      <ClipCard c={left} s={s} out={out} left={98} top={top} w={w} dim={k} strike={k} />
      <ClipCard c={right} s={rightS} out={out} left={98 + w + gap} top={top} w={w} />
      {frame > strikeS && frame < out + 8 && <Chip at={{ x: 98 + w / 2, y: top + 10 + CLIP_H / 2 }} side="center" text={chip} s={0.72 + 0.28 * quint(cl((frame - strikeS) / 8))} o={cl((frame - strikeS) / 4) * (1 - cl((frame - out) / 7))} />}
    </>
  );
};
