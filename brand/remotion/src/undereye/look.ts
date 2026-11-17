// Under-eye filler reel (9:16): shared look and motion helpers. Every value is a kit token or a MOTION.md token:
//   type    NHG Display (brand.ts FONT; vertical reels keep the bible NHG system, style DECISIONS 14d rule 7)
//   colour  ink #1d2230 (Ro NAVY), muted #6b7183, brand blue #37a9e8, ice #cfe9f7, highlighter #c4e4f8 (MOTION §1.6); never green
//   glass   components/Ro card(): the calm signature glass (style DECISIONS 11-12)
//   frame   1080x1920, margin 98, top safe 250, caption top 1594 (MOTION §5.3, brand.ts)
//   motion  library/motion.ts tokens; a reveal starts on the word's onset frame + 1 (MOTION §3, DECISIONS 14d rule 9)
import { curve, D24 } from "../library/motion";
import { clamp } from "../brand";

export const W = 1080, H = 1920, M = 98, SAFE_T = 250, CAP_T = 1594;
export const INK = "#1d2230", MUTED = "#6b7183", BLUE = "#37a9e8", ICE = "#cfe9f7", HL = "#c4e4f8", WHITE = "#ffffff";
export const D = D24; // durations at 24 fps; this reel renders at 24 fps, so no conversion

// eased progress of a token from frame s over d frames
export const p = (frame: number, s: number, d: number, c: keyof typeof curve = "sweep") => (d <= 0 ? (frame >= s ? 1 : 0) : curve[c](clamp((frame - s) / d)));
// enter on `arrive` (14 f, 16 px rise) and leave on `exit` (7 f, 7 px fall) as one style
export const life = (frame: number, s: number, out = Infinity, rise = 16): React.CSSProperties => {
  const i = p(frame, s, D.arrive, "arrive"), o = p(frame, out, D.exit, "exit");
  return { opacity: i * (1 - o), transform: `translateY(${(1 - i) * rise + o * 7}px)` };
};
export const vis = (frame: number, s: number, out = Infinity) => frame >= s && frame < out + D.exit;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const breathe = (frame: number, amp = 1.5, period = 72, phase = 0) => amp * Math.sin((2 * Math.PI * frame) / period + phase);

export const caps = (px: number, color = MUTED): React.CSSProperties => ({ font: `500 ${px}px/1.1 "neue-haas-grotesk-display", "Inter Tight", Arial, sans-serif`, letterSpacing: "0.08em", textTransform: "uppercase", color });
export const disp = (px: number, color = INK, w = 600): React.CSSProperties => ({ font: `${w} ${px}px/1.05 "neue-haas-grotesk-display", "Inter Tight", Arial, sans-serif`, letterSpacing: "-0.005em", color });

// a point that may move per frame (face-tracked) or stay put
export type Pt = { x: number; y: number };
export type PtSrc = Pt | ((frame: number) => Pt);
export const at = (q: PtSrc, frame: number): Pt => (typeof q === "function" ? q(frame) : q);
