// Oct 14 injection reel (9:16): the shared look and motion helpers. NOT FOR POSTING until patient consent = yes.
// Every value is a kit token or a MOTION.md token (research/ostad/learning/ONBOARDING_oct14.md, rules 1-6):
//   frame   1080x1920, 24 fps, margin 98, top safe 250, caption top 1594 (brand/motion/RULES.md; MOTION §5.3; brand.ts)
//   type    Neue Haas Grotesk Display 600 headline / 500 caps label (tokens.json typography.9x16; DECISIONS 14d rule 7)
//   colour  ink #1d2230 (Ro NAVY), muted #6b7183, brand blue #37a9e8, ice #cfe9f7, highlighter #c4e4f8 (MOTION §1.6); never green
//   motion  library/motion.ts tokens at 24 fps; a reveal starts on its word's onset frame + 1 (MOTION §3)
import { curve, D24 } from "../library/motion";
import { clamp } from "../brand";

export const W = 1080, H = 1920, M = 98, SAFE_T = 250, CAP_T = 1594, FPS = 24;
export const INK = "#1d2230", MUTED = "#6b7183", BLUE = "#37a9e8", ICE = "#cfe9f7", HL = "#c4e4f8", WHITE = "#ffffff";
export const D = D24;
export const FONT = '"neue-haas-grotesk-display", "Inter Tight", Arial, sans-serif';

/** eased progress of a MOTION token from frame `s` over `d` frames */
export const p = (frame: number, s: number, d: number, c: keyof typeof curve = "sweep") => (d <= 0 ? (frame >= s ? 1 : 0) : curve[c](clamp((frame - s) / d)));
/** `arrive` in (14 f, 16 px rise) and `exit` out (7 f, 7 px fall) as one style */
export const life = (frame: number, s: number, out = Infinity, rise = 16): React.CSSProperties => {
  const i = p(frame, s, D.arrive, "arrive"), o = p(frame, out, D.exit, "exit");
  return { opacity: i * (1 - o), transform: `translateY(${(1 - i) * rise + o * 7}px)` };
};
/** on screen from `s` until its exit has run */
export const vis = (frame: number, s: number, out = Infinity) => frame >= s && frame < out + D.exit;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** the hold breathe every held element carries (DEVICE_LIBRARY §A: <= 1.5 px on a 72 f period) */
export const breathe = (frame: number, amp = 1.5, period = 72, phase = 0) => amp * Math.sin((2 * Math.PI * frame) / period + phase);

export const caps = (px: number, color = MUTED): React.CSSProperties => ({ font: `500 ${px}px/1.1 ${FONT}`, letterSpacing: "0.08em", textTransform: "uppercase", color });
export const disp = (px: number, color = INK, w = 600): React.CSSProperties => ({ font: `${w} ${px}px/1.05 ${FONT}`, letterSpacing: "-0.005em", color });
/** legibility on footage: the reel "clean" caption shadow (components/Captions), never a box or stroke */
export const ON_FOOTAGE = "0 2px 10px rgba(0,0,0,.45), 0 0 2px rgba(0,0,0,.3)";

export type Pt = { x: number; y: number };
export type PtSrc = Pt | ((frame: number) => Pt);
export const at = (q: PtSrc, frame: number): Pt => (typeof q === "function" ? q(frame) : q);
export type Box = { x: number; y: number; w: number; h: number };
